// 采集管线入口：GitHub Actions 每 6 小时运行一次，也可以手动触发补跑。
// 流程：取信源 → 抓取 → 只保留和羊毛相关的句子 → 与上次比对 → 有变化才调用模型抽取 → 写入网站（默认进待审）。
import { aihot, feed, hn, parseFeed, reddit, type Source } from './collectors';
import { api, fetchPage, fetchText, isFreebie, norm, relevantText, sha256, slug } from './lib';
import { DeferError, extract, llmAvailable, paidAvailable, type Extracted } from './llm';
import { BudgetExhaustedError, modelBudget } from './budget';
import { offerIn, type LeadIn, type OfferIn } from '../src/shared/ingest';

const DAILY_TOKEN_CAP = Number(process.env.DAILY_TOKEN_CAP ?? 0); // 0 = 调试阶段不设每日 token 总上限
const MONTHLY_COST_CAP = Number(process.env.MONTHLY_COST_CAP_CNY ?? 10);
let costLeft = MONTHLY_COST_CAP;
const DRY = process.env.DRY_RUN === '1';
const FORCE = process.env.FORCE === '1'; // 忽略上次的哈希，强制重新抽取（提示词改进后补跑）
const LEAD_LIMIT = Number(process.env.LEAD_LIMIT ?? 25);
const onlyList = (process.env.ONLY_SOURCES ?? '').split(',').map(s => s.trim()).filter(Boolean);
const only = onlyList.length ? onlyList : null; // 留空 = 全部信源
const stats = { leadsTriaged: 0, leadOffers: 0, costCny: 0, deferred: 0, sources: 0, ok: 0, failed: 0, changed: 0, leads: 0, offers: 0, pending: 0, extractSkipped: 0, tokens: 0, coverageDegraded: false, errors: [] as string[] };
let tokensLeft = DAILY_TOKEN_CAP > 0 ? DAILY_TOKEN_CAP : Infinity;

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function report(src: Source, ok: boolean, extra: { hash?: string; text?: string; error?: string; deferred?: boolean } = {}) {
  if (DRY) return { changed: extra.hash ? extra.hash !== src.lastHash : false };
  return api<{ changed?: boolean }>('/snapshots', { sourceId: src.id, url: src.url, ok, ...extra });
}

async function postLeads(leads: LeadIn[]) {
  if (!leads.length) return;
  if (DRY) { stats.leads += leads.length; leads.slice(0, 5).forEach(l => log('  线索', l.title)); return; }
  for (let i = 0; i < leads.length; i += 100) {
    const r = await api<{ created: number }>('/leads', leads.slice(i, i + 100));
    stats.leads += r.created;
  }
}

const clip = (v: string, n: number) => (v && v.length > n ? v.slice(0, n - 1) + '…' : v);

function toOffer(src: Source, e: Extracted & { fixedId?: string }, url: string, text: string): OfferIn {
  return {
    id: e.fixedId ?? `${src.platformId}-${slug(e.key)}`.slice(0, 80), platformId: src.platformId!, sourceId: src.id || undefined,
    title: clip(e.title, 120), type: e.type, modalities: e.modalities as OfferIn['modalities'], claimMethod: e.claimMethod as OfferIn['claimMethod'],
    // 超过长度上限的字段截短保留，不再让整条羊毛因校验失败被丢弃（2026-10-01 批量抓取时 AWS、硅基流动两条因额度描述超长被丢）
    requirements: e.requirements?.length ? e.requirements : ['unknown'], audience: e.audience ?? 'unclear', valueText: clip(e.valueText, 200),
    usdEstimate: e.usdEstimate ?? null, claimStart: e.claimStart ?? null, claimEnd: e.claimEnd ?? null,
    // 模型说有截止日期却给不出具体日期（如“免费 7 天”但没写从哪天起）：按截止未知保留，交给人工审核，而不是整条丢弃
    endKind: e.endKind === 'date' && !e.claimEnd ? 'unknown' : e.endKind,
    creditValidity: e.creditValidity ? clip(e.creditValidity, 100) : null, sourceTz: e.sourceTz || 'UTC', steps: (e.steps ?? []).slice(0, 4).map(x => clip(x, 200)), firstChannel: src.kind,
    evidence: { url, tier: (src.tier === 'lead' ? 'site' : src.tier) as OfferIn['evidence']['tier'], capturedAt: new Date().toISOString(), pageHash: sha256(text), excerpts: e.excerpts },
  };
}

/**
 * 官方文本 → 模型抽取 → 写入。返回 false 表示这一轮没处理（不记快照，下次再试）。
 * 付费的 DeepSeek 只在这个信源已经被推迟过至少一次（卡了 12 小时以上）、且本月费用没到上限时才用。
 */
let extractionQueue: Promise<void> = Promise.resolve();
async function extractAndPost(src: Source, url: string, text: string): Promise<boolean> {
  const prior = extractionQueue;
  let release!: () => void;
  extractionQueue = new Promise<void>(resolve => { release = resolve; });
  await prior;
  try { return await extractAndPostUnlocked(src, url, text); }
  finally { release(); }
}

async function extractAndPostUnlocked(src: Source, url: string, text: string): Promise<boolean> {
  if (!llmAvailable()) { stats.extractSkipped++; log('  没有配置模型 key，跳过抽取'); return false; }
  const estimate = Math.ceil(text.length / 2) + 1500;
  if (estimate > tokensLeft) { stats.extractSkipped++; log(`  今日模型预算不足（剩 ${tokensLeft}），留到下次`); return false; }
  const deferCount = Number((src.config as { deferCount?: number } | undefined)?.deferCount ?? 0);
  const allowPaid = paidAvailable() && deferCount >= 1 && costLeft > 0.05;
  let r: Awaited<ReturnType<typeof extract>>;
  try {
    const idx = (await offerIndex()).filter(k => k.platformId === src.platformId);
    r = await extract(src.platform?.name ?? src.platformId ?? '', url, text, log, { allowPaid, corrections: await correctionsFor(src.platformId, src.id), existing: idx.map(k => `${k.id}｜${k.title}｜${k.valueText.slice(0, 40)}`).join('\n') || undefined, budget: modelBudget });
    // 同一个权益沿用已有 id，避免模型换个说法就生成重复条目
    for (const e of r.offers as (Extracted & { sameAs?: string | null; fixedId?: string })[]) { const hit = idx.find(k => k.id === e.sameAs); if (hit) e.fixedId = hit.id; }
  }
  catch (e) {
    if (!(e instanceof DeferError) && !(e instanceof BudgetExhaustedError)) throw e;
    stats.deferred++; log(`  ${e.message}`);
    src.deferThisRun = true; return false;
  }
  tokensLeft -= r.tokens; stats.tokens += r.tokens; costLeft -= r.costCny; stats.costCny += r.costCny;
  if (r.costCny) log(`  动用付费兜底，花费 ¥${r.costCny.toFixed(4)}（本月剩 ¥${costLeft.toFixed(2)}）`);
  log(`  ${r.provider} 抽出 ${r.offers.length} 条，用 ${r.tokens} tokens`);
  if (!r.offers.length) return true;
  // 逐条校验：不合格的只丢这一条，并记下原因
  const offers: OfferIn[] = [];
  const seenInPage = new Map<string, number>();
  let invalidCount = 0;
  for (const e of r.offers) {
    const v = offerIn.safeParse(toOffer(src, e, url, text));
    if (v.success) {
      const candidate = v.data;
      const identity = [candidate.platformId, candidate.type, candidate.claimMethod, norm(candidate.title), norm(candidate.valueText), candidate.claimStart, candidate.claimEnd].join('|');
      const previous = seenInPage.get(identity);
      if (previous == null) { seenInPage.set(identity, offers.length); offers.push(candidate); }
      else offers[previous].modalities = [...new Set([...offers[previous].modalities, ...candidate.modalities])];
    }
    else { invalidCount++; const why = v.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('；'); stats.errors.push(`${src.id}/${e.key}: ${why}`); log(`  丢弃「${e.title}」：${why}`); }
  }
  if (!offers.length) return false; // 原文里有候选但全部校验失败，不能把页面标记为已处理
  if (DRY) { offers.forEach(o => log('  羊毛', o.id, o.title, `类型=${o.type} 对象=${o.audience} 门槛=${o.requirements.join(',')} 额度=${o.valueText}`)); stats.offers += offers.length; return true; }
  const res = await api<{ results: { id: string; error?: string; reviewState?: string; unchanged?: boolean }[] }>('/offers', offers);
  let hasWriteError = false;
  for (const x of res.results) {
    if (x.error) stats.errors.push(`${x.id}: ${x.error}`);
    else if (!x.unchanged) { stats.offers++; if (x.reviewState === 'pending') stats.pending++; }
    if (x.error) hasWriteError = true;
    if (!x.error && idxCache) {
      const accepted = offers.find(o => o.id === x.id);
      if (accepted) {
        const entry = { id: accepted.id, platformId: accepted.platformId, title: accepted.title, valueText: accepted.valueText };
        const index = idxCache.findIndex(item => item.id === x.id);
        if (index < 0) idxCache.push(entry); else idxCache[index] = entry;
      }
    }
  }
  return !hasWriteError && invalidCount === 0;
}

async function officialPage(src: Source) {
  const { text, via, finalUrl } = await fetchPage(src.url);
  const rel = relevantText(text);
  const hash = sha256(rel);
  if (hash === src.lastHash && !FORCE) { await report(src, true); log(`  无变化（${via}）`); return; }
  stats.changed++;
  log(`  有变化（${via}，相关文本 ${rel.length} 字）`);
  const extractionSource = via === 'jina' ? { ...src, tier: 'media', autoPublish: false } : src;
  const done = rel.length ? await extractAndPost(extractionSource, finalUrl, rel) : true;
  if (!done) src.deferThisRun = true;
  if (!DRY) {
    const { offers } = await api<{ offers: { id: string; url: string }[] }>(`/verification-queue?sourceId=${encodeURIComponent(src.id)}&force=1`);
    for (const offer of offers.filter(o => o.url === src.url)) await api('/verify', { offerId: offer.id, url: offer.url, finalUrl, text, pageHash: sha256(rel), processedChange: done });
  }
  await report(src, true, done ? { hash, text: rel } : { deferred: !!src.deferThisRun });
}

/** 官方 RSS：只处理这次新出现、且标题或摘要命中关键词的文章；逐篇抓正文抽取。 */
async function officialFeed(src: Source) {
  // RSS 里的文章链接可能是相对路径（如 Sakana 的 /sail/），用 RSS 地址补全
  const abs = (link: string) => { try { return new URL(link, src.url).href; } catch { return ''; } };
  const items = parseFeed(await fetchText(src.url, { accept: 'application/rss+xml' })).map(i => ({ ...i, link: abs(i.link) })).filter(i => i.link && isFreebie(`${i.title} ${i.summary}`));
  const links = items.map(i => i.link).sort();
  const hash = sha256(links.join('\n'));
  if (hash === src.lastHash) { await report(src, true); log('  无新文章'); return; }
  const prev = new Set((src.lastText ?? '').split('\n').filter(Boolean)); // 只记真正处理完的文章
  for (const it of items.filter(i => !prev.has(i.link)).slice(0, 5)) {
    stats.changed++;
    const { text, via, finalUrl } = await fetchPage(it.link);
    const rel = relevantText(text);
    log(`  新文章：${it.title}（相关文本 ${rel.length} 字）`);
    if (!rel.length || await extractAndPost(via === 'jina' ? { ...src, tier: 'media', autoPublish: false } : src, finalUrl, rel)) prev.add(it.link);
  }
  const completed = links.filter(link => prev.has(link)).join('\n');
  if (completed.split('\n').filter(Boolean).length < links.length) src.deferThisRun = true;
  await report(src, true, { hash: sha256(completed), text: completed, deferred: !!src.deferThisRun });
}

async function runSource(src: Source) {
  stats.sources++;
  log(`[${src.id}] ${src.kind} ${src.url}`);
  try {
    if (src.kind === 'aihot') { await postLeads(await aihot(src)); await report(src, true); }
    else if (src.kind === 'hn') { await postLeads(await hn(src)); await report(src, true); }
    else if (src.kind === 'reddit') { await postLeads(await reddit(src)); await report(src, true); }
    else if (src.kind === 'feed') { await postLeads(await feed(src)); await report(src, true); }
    else if (src.kind === 'rss' && src.platformId) await officialFeed(src);
    else if ((src.kind === 'web_list' || src.kind === 'json') && src.platformId) await officialPage(src);
    else { log('  暂不支持这种信源，跳过'); return; }
    stats.ok++;
  } catch (e) {
    stats.failed++;
    const msg = e instanceof Error ? e.message : String(e);
    stats.errors.push(`${src.id}: ${msg}`);
    log(`  失败：${msg}`);
    await report(src, false, { error: msg.slice(0, 500) }).catch(() => undefined);
  }
}

async function verifyExistingOffers(sources: Source[]) {
  const { offers } = await api<{ offers: { id: string; url: string; tier: string; pageHash: string | null; proposalHash: string | null; sourceId: string | null; platformId: string }[] }>('/verification-queue');
  for (const offer of offers) {
    try {
      const { text, via, finalUrl } = await fetchPage(offer.url);
      const relevant = relevantText(text), currentHash = sha256(relevant);
      let processedChange = offer.pageHash === currentHash || offer.proposalHash === currentHash;
      if (!processedChange && relevant) {
        const source = sources.find(s => s.id === offer.sourceId) ?? {
          id: '', kind: 'manual', url: offer.url, tier: offer.tier, platformId: offer.platformId, lastHash: null,
          platform: { id: offer.platformId, name: offer.platformId, status: 'approved' }, autoPublish: false,
        } as Source;
        processedChange = await extractAndPost(via === 'jina' ? { ...source, tier: 'media', autoPublish: false } : source, finalUrl, relevant);
      }
      const result = DRY ? { verified: false } : await api<{ verified: boolean }>('/verify', { offerId: offer.id, url: offer.url, finalUrl, text, pageHash: currentHash, processedChange });
      if (!result.verified && !DRY) stats.errors.push(`${offer.id}: 当前官方证据无法再次确认`);
    } catch (e) {
      stats.errors.push(`${offer.id}: 复核失败：${(e as Error).message}`);
    }
  }
}

let idxCache: { id: string; platformId: string; title: string; valueText: string }[] | null = null;
async function offerIndex() {
  if (!idxCache) { try { idxCache = (await api<{ offers: { id: string; platformId: string; title: string; valueText: string }[] }>('/offers-index')).offers; } catch { idxCache = []; } }
  return idxCache;
}

/* ---------- 第一层反馈：抽取时附上管理员最近的纠正 ---------- */
const corrCache = new Map<string, string[]>();
async function correctionsFor(platform: string | null, source: string | null): Promise<string[]> {
  const key = `${platform ?? ''}|${source ?? ''}`;
  if (!corrCache.has(key)) {
    try { corrCache.set(key, (await api<{ corrections: string[] }>(`/corrections?limit=10&platform=${encodeURIComponent(platform ?? '')}&source=${encodeURIComponent(source ?? '')}`)).corrections); }
    catch { corrCache.set(key, []); }
  }
  return corrCache.get(key)!;
}

/* ---------- 线索研判：把线索变成待审羊毛 ---------- */
interface Plat { id: string; name: string; site: string | null; xHandles: string[]; staffHandles: string[] }
interface Lead { id: number; origin: string; url: string; title: string | null; raw: string | null }
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
/** 证据级别：平台官网域名 → site；白名单里的官方 X 账号 → official；员工账号 → staff；其余（媒体、社区、公众号转载）→ media。 */
function tierOf(url: string, p: Plat | undefined): OfferIn['evidence']['tier'] {
  if (!p) return 'media';
  const h = host(url);
  if (p.site && h && (h === host(p.site) || h.endsWith('.' + host(p.site)))) return 'site';
  if (h === 'x.com' || h === 'twitter.com') {
    const handle = '@' + (new URL(url).pathname.split('/')[1] ?? '').toLowerCase();
    if (p.xHandles.some(x => x.toLowerCase() === handle)) return 'official';
    if (p.staffHandles.some(x => x.toLowerCase() === handle)) return 'staff';
  }
  return 'media';
}
async function triageLeads(plats: Plat[]) {
  if (!llmAvailable()) return;
  const { leads } = await api<{ leads: Lead[] }>(`/leads?limit=${LEAD_LIMIT}`);
  if (!leads.length) return;
  const list = plats.map(p => `${p.id}=${p.name}`).join('；');
  const { offers: known } = await api<{ offers: { id: string; platformId: string; title: string; valueText: string }[] }>('/offers-index');
  const knownIds = new Set(known.map(k => k.id));
  let existing = known.map(k => `${k.id}｜${k.title}｜${k.valueText.slice(0, 40)}`).join('\n');
  const pmap = new Map(plats.map(p => [p.id, p]));
  log(`研判线索 ${leads.length} 条`);
  for (const l of leads) {
    if (tokensLeft < 8000) { log('  今日模型预算不足，剩余线索留到下次'); break; }
    stats.leadsTriaged++;
    let text = `${l.title ?? ''}\n${l.raw ?? ''}`;
    let fetched = false;
    let effectiveUrl = l.url, indirect = false;
    try { const pg = await fetchPage(l.url); text = `${l.title ?? ''}\n${pg.text}`.slice(0, 14000); effectiveUrl = pg.finalUrl; indirect = pg.via === 'jina'; fetched = true; }
    catch { if (l.origin === 'manual' || l.origin === 'telegram') { log(`  #${l.id} 原文暂时不可访问，下轮继续抓取`); continue; } }
    let r;
    try { r = await extract('（见平台白名单）', l.url, text, log, { platformList: list, existing, corrections: await correctionsFor(null, null), budget: modelBudget }); }
    catch (e) {
      log(`  #${l.id} 抽取失败：${(e as Error).message.slice(0, 80)}`);
      if (!(e instanceof DeferError) && !(e instanceof BudgetExhaustedError) && !DRY) await api(`/leads/${l.id}/status`, { status: 'reviewing', note: `抽取失败，需人工确认后重试：${(e as Error).message.slice(0, 160)}` });
      continue;
    }
    tokensLeft -= r.tokens; stats.tokens += r.tokens; stats.costCny += r.costCny;
    const valid: OfferIn[] = [];
    const unknown: string[] = [];
    const findPlat = (x: string | undefined) => {
      if (!x) return undefined;
      const k = x.trim().toLowerCase();
      return pmap.get(k) ?? plats.find(p => p.name.toLowerCase() === k); // 只认完全一致，宁可判白名单外也不归错平台
    };
    for (const e of r.offers) {
      const p = findPlat(e.platformId);
      if (!p) { unknown.push(e.title); continue; }
      const tier = indirect ? 'media' : tierOf(effectiveUrl, p);
      const o = toOffer({ id: `lead-${l.origin}`, kind: l.origin, platformId: p.id, tier } as unknown as Source, e, effectiveUrl, text);
      o.evidence.tier = tier; o.leadId = l.id; o.sourceId = undefined; o.firstChannel = l.origin;
      // 同一个活动：沿用已有条目的 id（写入接口会按修订处理，不会新开一条）
      if (e.sameAs && knownIds.has(e.sameAs)) {
        const prev = known.find(k => k.id === e.sameAs)!;
        if (prev.platformId === p.id) { o.id = prev.id; log(`  #${l.id} 与已有条目 ${prev.id} 是同一活动，合并`); }
      }
      if (e.officialUrl && tier === 'media') o.steps = [...(o.steps ?? []), `官方出处：${e.officialUrl}`].slice(0, 6);
      const v = offerIn.safeParse(o);
      if (v.success) valid.push(v.data); else log(`  #${l.id} 丢弃「${e.title}」：${v.error.issues.map(i => i.path.join('.') + ' ' + i.message).join('；').slice(0, 120)}`);
    }
    if (DRY) { log(`  #${l.id} ${l.title?.slice(0, 40)} → ${valid.map(v => `${v.platformId}:${v.title}`).join('、') || '无'}${unknown.length ? `；白名单外：${unknown.join('、')}` : ''}`); continue; }
    if (valid.length) {
      const res = await api<{ results: { id: string; error?: string; unchanged?: boolean }[] }>('/offers', valid);
      stats.leadOffers += res.results.filter(x => !x.error && !x.unchanged).length;
      for (const saved of res.results.filter(x => !x.error)) {
        const record = valid.find(v => v.id === saved.id);
        if (!record) continue;
        const entry = { id: record.id, platformId: record.platformId, title: record.title, valueText: record.valueText };
        const index = known.findIndex(k => k.id === saved.id);
        if (index < 0) known.push(entry); else known[index] = entry;
        knownIds.add(saved.id);
        if (idxCache) {
          const cached = idxCache.findIndex(k => k.id === saved.id);
          if (cached < 0) idxCache.push(entry); else idxCache[cached] = entry;
        }
      }
      existing = known.map(k => `${k.id}｜${k.title}｜${k.valueText.slice(0, 40)}`).join('\n');
      log(`  #${l.id} → ${valid.map(v => v.title).join('、')}`);
      await api(`/leads/${l.id}/status`, { status: 'linked', offerId: valid[0].id });
    } else {
      await api(`/leads/${l.id}/status`, { status: unknown.length || !fetched ? 'reviewing' : 'rejected', note: unknown.length ? `白名单外的平台：${unknown.join('、')}` : !fetched ? '原文抓取失败，仅有转述，等待人工核验' : '模型判断不是 AI 羊毛' });
    }
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  if (!DRY) {
    const b = await api<{ tokensToday: number; costMonthCny: number }>('/budget');
    tokensLeft = DAILY_TOKEN_CAP > 0 ? Math.max(0, DAILY_TOKEN_CAP - b.tokensToday) : Infinity;
    costLeft = Math.max(0, MONTHLY_COST_CAP - b.costMonthCny);
  }
  const { sources } = await api<{ sources: Source[] }>('/sources');
  // config.relay 表示由别的机器负责（例如 Reddit 由常开 Mac 中继），云端跳过
  const list = sources.filter(s => (!only || only.includes(s.id)) && !(s.config as { relay?: string } | undefined)?.relay);
  log(`共 ${list.length} 个信源；今日 token ${Number.isFinite(tokensLeft) ? `剩 ${tokensLeft}` : '不设总上限'}，本月付费兜底剩 ¥${costLeft.toFixed(2)}${DRY ? '；演练模式，不写入权益' : ''}`);
  const queue = [...list];
  await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await runSource(queue.shift()!); }));
  await verifyExistingOffers(sources);
  try {
    const { platforms } = await fetch(`${(process.env.API_BASE ?? 'https://ai-yangmao.com').replace(/\/$/, '')}/api/platforms`).then(r => r.json()) as { platforms: Plat[] };
    await triageLeads(platforms);
  } catch (e) { stats.errors.push(`线索研判：${(e as Error).message}`); log('线索研判出错', (e as Error).message); }
  const ok = !only && stats.sources > 0 && stats.failed === 0 && stats.ok === stats.sources;
  stats.coverageDegraded = stats.deferred > 0 || stats.extractSkipped > 0 || list.some(source => source.deferThisRun);
  log('完成', JSON.stringify(stats));
  // 模型调用逐次在 runs(kind=model) 预留并结算；汇总行不能再次计费。
  if (!DRY) await api('/runs', { kind: 'collect', startedAt, finishedAt: new Date().toISOString(), ok, stats, tokens: 0, costCny: 0 });
  if (!ok && !only) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exit(1); });
