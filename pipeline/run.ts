// 采集管线入口：GitHub Actions 每 6 小时运行一次，也可以手动触发补跑。
// 流程：取信源 → 抓取 → 只保留和羊毛相关的句子 → 与上次比对 → 有变化才调用模型抽取 → 写入网站（默认进待审）。
import { aihot, hn, parseFeed, reddit, type Source } from './collectors';
import { api, fetchPage, fetchText, isFreebie, relevantText, sha256, slug } from './lib';
import { DeferError, extract, llmAvailable, paidAvailable, type Extracted } from './llm';
import { offerIn, type LeadIn, type OfferIn } from '../src/shared/ingest';

const DAILY_TOKEN_CAP = Number(process.env.DAILY_TOKEN_CAP ?? 200000);
const MONTHLY_COST_CAP = Number(process.env.MONTHLY_COST_CAP_CNY ?? 10);
let costLeft = MONTHLY_COST_CAP;
const DRY = process.env.DRY_RUN === '1';
const onlyList = (process.env.ONLY_SOURCES ?? '').split(',').map(s => s.trim()).filter(Boolean);
const only = onlyList.length ? onlyList : null; // 留空 = 全部信源
const stats = { costCny: 0, deferred: 0, sources: 0, ok: 0, failed: 0, changed: 0, leads: 0, offers: 0, pending: 0, extractSkipped: 0, tokens: 0, errors: [] as string[] };
let tokensLeft = DAILY_TOKEN_CAP;

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

function toOffer(src: Source, e: Extracted, url: string): OfferIn {
  return {
    id: `${src.platformId}-${slug(e.key)}`.slice(0, 80), platformId: src.platformId!, sourceId: src.id,
    title: e.title, type: e.type, modalities: e.modalities as OfferIn['modalities'], claimMethod: e.claimMethod as OfferIn['claimMethod'],
    requirements: e.requirements?.length ? e.requirements : ['none'], audience: e.audience ?? 'unclear', valueText: e.valueText,
    usdEstimate: e.usdEstimate ?? null, claimStart: e.claimStart ?? null, claimEnd: e.claimEnd ?? null, endKind: e.endKind,
    creditValidity: e.creditValidity ?? null, sourceTz: e.sourceTz || 'UTC', steps: (e.steps ?? []).slice(0, 4), firstChannel: src.kind,
    evidence: { url, tier: (src.tier === 'lead' ? 'site' : src.tier) as OfferIn['evidence']['tier'], capturedAt: new Date().toISOString(), excerpts: e.excerpts },
  };
}

/**
 * 官方文本 → 模型抽取 → 写入。返回 false 表示这一轮没处理（不记快照，下次再试）。
 * 付费的 DeepSeek 只在这个信源已经被推迟过至少一次（卡了 12 小时以上）、且本月费用没到上限时才用。
 */
async function extractAndPost(src: Source, url: string, text: string): Promise<boolean> {
  if (!llmAvailable()) { stats.extractSkipped++; log('  没有配置模型 key，跳过抽取'); return false; }
  const estimate = Math.ceil(text.length / 2) + 1500;
  if (estimate > tokensLeft) { stats.extractSkipped++; log(`  今日模型预算不足（剩 ${tokensLeft}），留到下次`); return false; }
  const deferCount = Number((src.config as { deferCount?: number } | undefined)?.deferCount ?? 0);
  const allowPaid = paidAvailable() && deferCount >= 1 && costLeft > 0.05;
  let r;
  try { r = await extract(src.platform?.name ?? src.platformId ?? '', url, text, log, { allowPaid }); }
  catch (e) {
    if (!(e instanceof DeferError)) throw e;
    stats.deferred++; log(`  ${e.message}`);
    src.deferThisRun = true; return false;
  }
  tokensLeft -= r.tokens; stats.tokens += r.tokens; costLeft -= r.costCny; stats.costCny += r.costCny;
  if (r.costCny) log(`  动用付费兜底，花费 ¥${r.costCny.toFixed(4)}（本月剩 ¥${costLeft.toFixed(2)}）`);
  log(`  ${r.provider} 抽出 ${r.offers.length} 条，用 ${r.tokens} tokens`);
  if (!r.offers.length) return true;
  // 逐条校验：不合格的只丢这一条，并记下原因
  const offers: OfferIn[] = [];
  for (const e of r.offers) {
    const v = offerIn.safeParse(toOffer(src, e, url));
    if (v.success) offers.push(v.data);
    else { const why = v.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('；'); stats.errors.push(`${src.id}/${e.key}: ${why}`); log(`  丢弃「${e.title}」：${why}`); }
  }
  if (!offers.length) return true;
  if (DRY) { offers.forEach(o => log('  羊毛', o.id, o.title, JSON.stringify(o.evidence.excerpts))); stats.offers += offers.length; return true; }
  const res = await api<{ results: { id: string; error?: string; reviewState?: string; unchanged?: boolean }[] }>('/offers', offers);
  for (const x of res.results) {
    if (x.error) stats.errors.push(`${x.id}: ${x.error}`);
    else if (!x.unchanged) { stats.offers++; if (x.reviewState === 'pending') stats.pending++; }
  }
  return true;
}

async function officialPage(src: Source) {
  const { text, via } = await fetchPage(src.url);
  const rel = relevantText(text);
  const hash = sha256(rel);
  if (hash === src.lastHash) { await report(src, true); log(`  无变化（${via}）`); return; }
  stats.changed++;
  log(`  有变化（${via}，相关文本 ${rel.length} 字）`);
  const done = rel.length ? await extractAndPost(src, src.url, rel) : true;
  await report(src, true, done ? { hash, text: rel } : { deferred: !!src.deferThisRun });
}

/** 官方 RSS：只处理这次新出现、且标题或摘要命中关键词的文章；逐篇抓正文抽取。 */
async function officialFeed(src: Source) {
  const items = parseFeed(await fetchText(src.url, { accept: 'application/rss+xml' })).filter(i => i.link && isFreebie(`${i.title} ${i.summary}`));
  const links = items.map(i => i.link).sort();
  const hash = sha256(links.join('\n'));
  if (hash === src.lastHash) { await report(src, true); log('  无新文章'); return; }
  const prev = new Set((src.lastText ?? '').split('\n').filter(Boolean)); // 上次看过的文章链接
  let allDone = true;
  for (const it of items.filter(i => !prev.has(i.link)).slice(0, 5)) {
    stats.changed++;
    const { text } = await fetchPage(it.link);
    const rel = relevantText(text);
    log(`  新文章：${it.title}（相关文本 ${rel.length} 字）`);
    if (rel.length && !(await extractAndPost(src, it.link, rel))) allDone = false;
  }
  await report(src, true, allDone ? { hash, text: links.join('\n') } : { deferred: !!src.deferThisRun });
}

async function runSource(src: Source) {
  stats.sources++;
  log(`[${src.id}] ${src.kind} ${src.url}`);
  try {
    if (src.kind === 'aihot') { await postLeads(await aihot(src)); await report(src, true); }
    else if (src.kind === 'hn') { await postLeads(await hn(src)); await report(src, true); }
    else if (src.kind === 'reddit') { await postLeads(await reddit(src)); await report(src, true); }
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

async function main() {
  const startedAt = new Date().toISOString();
  if (!DRY) {
    const b = await api<{ tokensToday: number; costMonthCny: number }>('/budget');
    tokensLeft = Math.max(0, DAILY_TOKEN_CAP - b.tokensToday);
    costLeft = Math.max(0, MONTHLY_COST_CAP - b.costMonthCny);
  }
  const { sources } = await api<{ sources: Source[] }>('/sources');
  // config.relay 表示由别的机器负责（例如 Reddit 由常开 Mac 中继），云端跳过
  const list = sources.filter(s => (!only || only.includes(s.id)) && !(s.config as { relay?: string } | undefined)?.relay);
  log(`共 ${list.length} 个信源；今日模型预算剩 ${tokensLeft} tokens，本月付费兜底剩 ¥${costLeft.toFixed(2)}${DRY ? '；演练模式，不写入' : ''}`);
  const queue = [...list];
  await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await runSource(queue.shift()!); }));
  const ok = stats.ok > 0 && stats.failed <= stats.ok;
  log('完成', JSON.stringify(stats));
  if (!DRY) await api('/runs', { kind: 'collect', startedAt, finishedAt: new Date().toISOString(), ok, stats, tokens: stats.tokens, costCny: stats.costCny });
  if (!ok) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exit(1); });
