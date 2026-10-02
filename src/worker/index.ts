import { isReviewField, reviewChanges } from '../shared/spec';
// Cloudflare Worker 入口：/api/* 走这里，其余由静态资源（网站页面）处理。
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import * as s from '../db/schema';
import { isoDate, leadIn, offerIn, runIn } from '../shared/ingest';
import { findDuplicate } from '../shared/dedupe';
import { activeOnDate, isClaimable, liveStatus, missingEvidence } from '../shared/lifecycle';
import { admin } from './admin';
import { feishuAdmin, runScheduled } from './feishu';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  INGEST_TOKEN: string;
  ADMIN_TOKEN: string;
  CF_ANALYTICS_TOKEN?: string; // Cloudflare 账户分析只读令牌，采集健康页显示今日 D1 读取量
  CF_ACCOUNT_ID?: string;
  REVIEWER_TOKENS?: string; // 审核员密钥，格式 名字:密钥,名字:密钥；只能审核、补录、补信源
  DAILY_TOKEN_CAP?: string;
  MONTHLY_COST_CAP_CNY?: string;
  FEISHU_WEBHOOK?: string; // 飞书群自定义机器人
  FEISHU_SECRET?: string; // 签名校验密钥
  GEMINI_API_KEY?: string; // 飞书日报把英文翻译成中文
  GEMINI_MODEL?: string;
  GH_DISPATCH_TOKEN?: string; // 只对本仓库有 Actions 写权限的令牌，用于准点触发采集
  GH_REPO?: string;
}

const app = new Hono<{ Bindings: Env }>();
const db = (env: Env) => drizzle(env.DB, { schema: s });
type OfferRow = typeof s.offers.$inferSelect;

// 初期不让搜索引擎收录；接口不缓存旧状态太久
app.use('/api/*', async (c, next) => {
  await next();
  c.header('X-Robots-Tag', 'noindex');
  if (c.req.method === 'GET' && !c.res.headers.get('Cache-Control')) c.header('Cache-Control', 'public, max-age=60');
});

// 公开的羊毛和平台列表在 Cloudflare 边缘缓存 5 分钟：访客再多，数据库每 5 分钟每个地址只查一次（D1 免费版每天限读 500 万行）。
// 审核通过后最多 5 分钟出现在网站上。
const EDGE_TTL = 300;
for (const path of ['/api/offers', '/api/platforms']) app.use(path, async (c, next) => {
  if (c.req.method !== 'GET' || typeof caches === 'undefined') return next();
  const key = new Request(c.req.url, { method: 'GET' });
  const hit = await caches.default.match(key);
  if (hit) return new Response(hit.body, hit);
  await next();
  if (c.res.status !== 200) return;
  const res = new Response(c.res.clone().body, c.res);
  res.headers.set('Cache-Control', `public, max-age=60, s-maxage=${EDGE_TTL}`);
  c.executionCtx.waitUntil(caches.default.put(key, res));
});

// 公开接口不输出内部核验记录
const withStatus = (o: OfferRow, now: Date) => { const { reviewMemo: _memo, reviewSuggestion: _suggestion, ...pub } = o; return { ...pub, status: liveStatus(o, now), missingEvidence: missingEvidence(o.evidence.excerpts) }; };

app.get('/api/health', c => c.json({ ok: true, time: new Date().toISOString() }));

app.get('/api/meta', async c => {
  const [lastOk] = await db(c.env).select().from(s.runs).where(and(eq(s.runs.kind, 'collect'), eq(s.runs.ok, true))).orderBy(desc(s.runs.finishedAt)).limit(1);
  return c.json({ lastSuccessfulCollect: lastOk?.finishedAt ?? null, coverageDegraded: !!lastOk?.stats?.coverageDegraded });
});

/** 覆盖范围页：监控了哪些渠道、健康状况。不含任何密钥或内部地址以外的信息。 */
app.get('/api/coverage', async c => {
  const d = db(c.env);
  const srcs = await d.select({ kind: s.sources.kind, enabled: s.sources.enabled, failStreak: s.sources.failStreak, lastOkAt: s.sources.lastOkAt, platformId: s.sources.platformId, url: s.sources.url, config: s.sources.config }).from(s.sources);
  const [{ n: platforms }] = await d.select({ n: sql<number>`count(*)` }).from(s.platforms).where(eq(s.platforms.status, 'approved'));
  const [lastOk] = await d.select().from(s.runs).where(and(eq(s.runs.kind, 'collect'), eq(s.runs.ok, true))).orderBy(desc(s.runs.finishedAt)).limit(1);
  const byKind: Record<string, { total: number; enabled: number; failing: number }> = {};
  const unhealthy = (x: typeof srcs[number]) => x.failStreak >= 3 || !x.lastOkAt || Date.now() - Date.parse(x.lastOkAt) > 12 * 3600_000;
  for (const x of srcs) {
    const k = (byKind[x.kind] ??= { total: 0, enabled: 0, failing: 0 });
    k.total++; if (x.enabled) k.enabled++; if (x.enabled && unhealthy(x)) k.failing++;
  }
  return c.json({ platforms, sources: srcs.filter(x => x.enabled).length, byKind, lastSuccessfulCollect: lastOk?.finishedAt ?? null,
    coverageDegraded: !!lastOk?.stats?.coverageDegraded,
    officialPages: srcs.filter(x => x.enabled && x.platformId).map(x => ({ platformId: x.platformId, url: x.url, kind: x.kind, healthy: !unhealthy(x) })) });
});

const listQuery = z.object({
  view: z.enum(['claimable', 'all']).default('claimable'),
  type: z.string().optional(),
  modality: z.string().optional(),
  platform: z.string().optional(),
  on: isoDate.optional(),
  tz: z.string().max(80).refine(tz => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; } }, '无效的时区').default('Asia/Shanghai'),
});

app.get('/api/offers', async c => {
  const q = listQuery.safeParse(c.req.query());
  if (!q.success) return c.json({ error: '查询参数不正确', issues: q.error.issues }, 400);
  const { view, type, modality, platform, on, tz } = q.data;
  const now = new Date();
  const d = db(c.env);
  const approvedPlatforms = new Set((await d.select({ id: s.platforms.id }).from(s.platforms).where(eq(s.platforms.status, 'approved'))).map(p => p.id));
  const conds = [eq(s.offers.reviewState, 'approved')];
  if (type) conds.push(eq(s.offers.type, type as OfferRow['type']));
  if (platform) conds.push(eq(s.offers.platformId, platform));
  let rows = (await d.select().from(s.offers).where(and(...conds))).filter(o => approvedPlatforms.has(o.platformId)).map(o => withStatus(o, now));
  if (modality) rows = rows.filter(o => o.modalities.includes(modality));
  if (on) rows = rows.filter(o => o.status !== 'stale' && activeOnDate(o, on, tz));
  else if (view === 'claimable') rows = rows.filter(o => isClaimable(o.status));
  return c.json({ count: rows.length, offers: rows });
});

app.get('/api/offers/:id', async c => {
  const d = db(c.env);
  const [o] = await d.select().from(s.offers).where(and(eq(s.offers.id, c.req.param('id')), eq(s.offers.reviewState, 'approved')));
  if (!o) return c.json({ error: '没有这条羊毛' }, 404);
  const [platform] = await d.select().from(s.platforms).where(eq(s.platforms.id, o.platformId));
  if (platform?.status !== 'approved') return c.json({ error: '没有这条羊毛' }, 404);
  const revisions = await d.select().from(s.offerRevisions).where(eq(s.offerRevisions.offerId, o.id)).orderBy(desc(s.offerRevisions.at));
  return c.json({ offer: withStatus(o, new Date()), platform, revisions });
});

app.get('/api/platforms', async c => {
  const rows = await db(c.env).select().from(s.platforms).where(eq(s.platforms.status, 'approved')).orderBy(s.platforms.type, s.platforms.name);
  return c.json({ count: rows.length, platforms: rows });
});

app.get('/api/platforms/:id', async c => {
  const d = db(c.env);
  const [p] = await d.select().from(s.platforms).where(and(eq(s.platforms.id, c.req.param('id')), eq(s.platforms.status, 'approved')));
  if (!p) return c.json({ error: '没有这个平台' }, 404);
  const now = new Date();
  const rows = (await d.select().from(s.offers).where(and(eq(s.offers.platformId, p.id), eq(s.offers.reviewState, 'approved')))).map(o => withStatus(o, now));
  return c.json({ platform: p, offers: rows });
});

const xml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
app.get('/rss.xml', async c => {
  const now = new Date();
  const approvedPlatforms = new Set((await db(c.env).select({ id: s.platforms.id }).from(s.platforms).where(eq(s.platforms.status, 'approved'))).map(p => p.id));
  const offers = (await db(c.env).select().from(s.offers).where(eq(s.offers.reviewState, 'approved')).orderBy(desc(s.offers.discoveredAt)).limit(100))
    .filter(offer => approvedPlatforms.has(offer.platformId) && isClaimable(liveStatus(offer, now)));
  const items = offers.map(offer => `<item><title>${xml(offer.title)}</title><link>https://ai-yangmao.com/#offer-${xml(offer.id)}</link><guid isPermaLink="false">${xml(offer.id)}</guid><pubDate>${new Date(offer.discoveredAt).toUTCString()}</pubDate><description>${xml(`${offer.valueText}；领取证据：${offer.evidence.url}`)}</description></item>`).join('');
  return c.body(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>AI 羊毛牧场 · 当前可领</title><link>https://ai-yangmao.com/</link><description>经过审核且仍可领取的 AI 额度与权益</description>${items}</channel></rss>`, 200, { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'noindex' });
});

/* ---------- 写入接口（采集管线专用，Bearer 密钥） ---------- */
const ingest = new Hono<{ Bindings: Env }>();
ingest.use('*', async (c, next) => {
  const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!c.env.INGEST_TOKEN || c.env.INGEST_TOKEN.length < 16 || token !== c.env.INGEST_TOKEN) return c.json({ error: '密钥不正确' }, 401);
  c.header('Cache-Control', 'no-store');
  await next();
});

ingest.post('/leads', async c => {
  const body = z.array(leadIn).max(100).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: '数据格式不正确', issues: body.error.issues }, 400);
  if (!body.data.length) return c.json({ created: 0 });
  // D1 单条语句最多 100 个绑定参数，线索每行 4 列，按 20 行一批插入
  let created = 0;
  for (let i = 0; i < body.data.length; i += 20) {
    const res = await db(c.env).insert(s.leads).values(body.data.slice(i, i + 20)).onConflictDoNothing().returning({ id: s.leads.id });
    created += res.length;
  }
  return c.json({ created, skipped: body.data.length - created });
});

/**
 * 新羊毛或已有羊毛的新版本。默认进待审；满足以下全部条件才自动上架：
 * 平台已准入、信源已放开自动上架、不是员工账号来源、四项证据齐全。
 * 已上架的羊毛内容变化时写修订记录，并重新进待审（除非满足自动上架条件）。
 */
ingest.post('/offers', async c => {
  const body = z.array(offerIn).max(50).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: '数据格式不正确', issues: body.error.issues }, 400);
  const d = db(c.env);
  const pids = [...new Set(body.data.map(o => o.platformId))];
  const plats = pids.length ? await d.select().from(s.platforms).where(inArray(s.platforms.id, pids)) : [];
  const sids = [...new Set(body.data.map(o => o.sourceId).filter((x): x is string => !!x))];
  const srcs = sids.length ? await d.select().from(s.sources).where(inArray(s.sources.id, sids)) : [];
  const results = [];
  // 硬性去重的比对范围：这些平台下的全部条目（含已拒绝，避免拒掉的换个 ID 又回来）
  const peers = pids.length ? (await d.select({ id: s.offers.id, platformId: s.offers.platformId, title: s.offers.title, valueText: s.offers.valueText, evidence: s.offers.evidence, reviewState: s.offers.reviewState })
    .from(s.offers).where(inArray(s.offers.platformId, pids))).map(x => ({ ...x, evidenceUrl: x.evidence.url })) : [];
  for (const o of body.data) {
    const plat = plats.find(p => p.id === o.platformId);
    if (!peers.some(x => x.id === o.id)) {
      const dup = findDuplicate({ platformId: o.platformId, title: o.title, valueText: o.valueText, evidenceUrl: o.evidence.url }, peers);
      if (dup?.reviewState === 'rejected') { results.push({ id: o.id, skipped: `与已拒绝的 ${dup.id} 重复` }); continue; }
      if (dup) o.id = dup.id; // 并入已有条目，走正常的更新和人工字段保护
    }
    // 同一批里后面的条目也要和前面的比
    if (!peers.some(x => x.id === o.id)) peers.push({ id: o.id, platformId: o.platformId, title: o.title, valueText: o.valueText, evidence: o.evidence as never, reviewState: 'pending', evidenceUrl: o.evidence.url });
    if (!plat) { results.push({ id: o.id, error: `平台 ${o.platformId} 不在白名单里，先建平台` }); continue; }
    if (o.evidence.tier === 'tested') { results.push({ id: o.id, error: '“管理员实测”只能在后台人工设置' }); continue; }
    const src = srcs.find(x => x.id === o.sourceId);
    const missing = missingEvidence(o.evidence.excerpts);
    const sameOfficialHost = src && (() => { try { return new URL(src.url).hostname.toLowerCase() === new URL(o.evidence.url).hostname.toLowerCase(); } catch { return false; } })();
    const auto = plat.status === 'approved' && !!src?.enabled && sameOfficialHost && src.platformId === o.platformId && src.autoPublish
      && ['site', 'docs', 'official'].includes(src.tier) && src.tier === o.evidence.tier
      && missing.length === 0 && !/未写明|不明确/.test(o.valueText) && !o.requirements.some(requirement => requirement === 'unknown' || /未写明/.test(requirement));
    const [prev] = await d.select().from(s.offers).where(eq(s.offers.id, o.id));
    const [existingProposal] = prev ? await d.select().from(s.offerProposals).where(eq(s.offerProposals.offerId, o.id)) : [];
    const nowIso = new Date().toISOString();
    const { leadId, ...od } = o;
    const row = {
      ...od, usdEstimate: o.usdEstimate ?? null, claimStart: o.claimStart ?? null, claimEnd: o.claimEnd ?? null,
      creditValidity: o.creditValidity ?? null, publishedAt: o.publishedAt ?? null, sourceId: o.sourceId ?? null,
      lastVerifiedAt: nowIso, verifyResult: '官方页面可以打开，已抽取字段', updatedAt: nowIso,
    };
    // 人工改过的字段是已经核准的事实，后续模型提案不得静默覆盖。
    if (prev) {
      const adminRevisions = await d.select({ diff: s.offerRevisions.diff }).from(s.offerRevisions)
        .where(and(eq(s.offerRevisions.offerId, prev.id), eq(s.offerRevisions.author, 'admin')));
      const protectedFields = new Set([
        ...adminRevisions.flatMap(revision => revision.diff.map(change => change.field)),
        ...(existingProposal?.manualFields ?? []),
      ]);
      const excerptChanged = (['benefit', 'eligibility', 'validity'] as const).some(key => {
        const before = prev.evidence.excerpts[key]?.replace(/\s+/g, ' ').trim();
        const after = o.evidence.excerpts[key]?.replace(/\s+/g, ' ').trim();
        return !!before && !!after && before !== after;
      });
      for (const field of protectedFields) {
        // 有新的条款原文支撑时，人工修正过的必要字段也可提出变化，仍不得直接覆盖。
        if (prev.reviewState === 'approved' && isReviewField(field) && excerptChanged && !existingProposal?.manualFields.includes(field)) continue;
        if (field in row) (row as Record<string, unknown>)[field] = existingProposal?.manualFields.includes(field)
          ? existingProposal.candidate[field] : (prev as Record<string, unknown>)[field];
      }
    }
    if (!prev) {
      await d.insert(s.offers).values({ ...row, reviewState: auto ? 'approved' : 'pending' });
      if (leadId) await d.update(s.leads).set({ status: 'linked', offerId: o.id }).where(eq(s.leads.id, leadId));
      results.push({ id: o.id, created: true, reviewState: auto ? 'approved' : 'pending', missingEvidence: missing });
      continue;
    }
    if (prev.reviewState === 'approved') {
      // 未抽到的可空字段不是官方取消：保留已审核的值，不制造“丢字段”提案。
      for (const field of ['usdEstimate', 'usdMax', 'claimStart', 'claimEnd', 'publishedAt'] as const) {
        if (row[field] == null && prev[field] != null) (row as Record<string, unknown>)[field] = prev[field];
      }
      if (!o.claimEnd && o.endKind === 'unknown' && o.type === prev.type && prev.endKind === 'date') row.endKind = prev.endKind;
      if (row.audience === 'unclear') row.audience = prev.audience;
      if (row.requirements.includes('unknown')) row.requirements = prev.requirements;
      row.steps = prev.steps;
      row.creditValidity = prev.creditValidity;
      row.sourceId = prev.sourceId;
      // 新提案也不能因模型漏摘录丢掉已审核证据。
      if (row.evidence.url === prev.evidence.url) {
        const excerpts = { ...prev.evidence.excerpts };
        for (const key of ['benefit', 'eligibility', 'claim', 'validity'] as const) {
          const quote = row.evidence.excerpts[key];
          if (quote?.trim()) excerpts[key] = quote;
        }
        row.evidence = { ...row.evidence, excerpts };
      }
    }
    const diff = reviewChanges(prev, row);
    if (!diff.length) {
      if (existingProposal) await d.delete(s.offerProposals).where(eq(s.offerProposals.offerId, o.id));
      // 只刷新自动核验元数据，保留已审核文案、摘录及可选字段，模型漏摘录不能清空它们。
      const sameEvidencePage = prev.evidence.url === o.evidence.url && prev.evidence.tier !== 'tested';
      if (prev.reviewState === 'approved' && sameEvidencePage) {
        await d.update(s.offers).set({ lastVerifiedAt: nowIso, verifyResult: '必要业务字段没有变化',
          evidence: { ...prev.evidence, capturedAt: nowIso, pageHash: o.evidence.pageHash ?? prev.evidence.pageHash }, updatedAt: nowIso }).where(eq(s.offers.id, o.id));
      }
      results.push({ id: o.id, unchanged: true });
      continue;
    }
    if (prev.reviewState === 'rejected') {
      results.push({ id: o.id, unchanged: true, reviewState: 'rejected' });
      continue;
    }
    if (prev.reviewState === 'approved') {
      // 公开的已审核版本在提案通过前仍保持不变。
      await d.insert(s.offerProposals).values({ offerId: o.id, candidate: row, diff, manualFields: existingProposal?.manualFields ?? [] })
        .onConflictDoUpdate({ target: s.offerProposals.offerId, set: { candidate: row, diff, manualFields: existingProposal?.manualFields ?? [], updatedAt: nowIso } });
      results.push({ id: o.id, changed: diff.map(x => x.field), reviewState: 'pending_update', missingEvidence: missing });
      continue;
    }
    const reviewState = auto ? 'approved' : 'pending';
    await d.update(s.offers).set({ ...row, reviewState }).where(eq(s.offers.id, o.id));
    if (existingProposal) await d.delete(s.offerProposals).where(eq(s.offerProposals.offerId, o.id));
    results.push({ id: o.id, changed: diff.map(x => x.field), reviewState, missingEvidence: missing });
  }
  return c.json({ results });
});

/** 管线取待抓的信源，附带上次的内容哈希，用于判断有没有变化。 */
ingest.get('/sources', async c => {
  const d = db(c.env);
  const rows = await d.select().from(s.sources).where(eq(s.sources.enabled, true));
  const last = await c.env.DB.prepare(
    'SELECT source_id, hash, text FROM snapshots WHERE id IN (SELECT MAX(id) FROM snapshots GROUP BY source_id)',
  ).all<{ source_id: string; hash: string; text: string | null }>();
  const snap = Object.fromEntries(last.results.map(r => [r.source_id, r]));
  const plats = await d.select({ id: s.platforms.id, name: s.platforms.name, status: s.platforms.status }).from(s.platforms);
  return c.json({ sources: rows.map(r => ({ ...r, lastHash: snap[r.id]?.hash ?? null, lastText: r.kind === 'rss' ? snap[r.id]?.text ?? null : null, platform: plats.find(p => p.id === r.platformId) ?? null })) });
});

/** 到期需要重新核验的权益。证据 URL 是逐条权益自己的 URL，RSS 和补录条目也能复核。 */
ingest.get('/verification-queue', async c => {
  const now = Date.now();
  const sourceId = c.req.query('sourceId');
  const forced = c.req.query('force') === '1';
  const rows = await db(c.env).select().from(s.offers).where(sourceId
    ? and(eq(s.offers.reviewState, 'approved'), eq(s.offers.sourceId, sourceId))
    : eq(s.offers.reviewState, 'approved'));
  const proposals = rows.length ? await db(c.env).select().from(s.offerProposals).where(inArray(s.offerProposals.offerId, rows.map(o => o.id))) : [];
  return c.json({ offers: rows.filter(o => {
    if (o.withdrawnAt || (o.endKind === 'date' && liveStatus(o, new Date(now)) === 'ended')) return false;
    if (o.evidence.tier === 'tested') return false; // 管理员实测的条目没有可抓取的官方原文，不做自动复核
    if (forced) return true;
    const age = o.lastVerifiedAt ? now - Date.parse(o.lastVerifiedAt) : Infinity;
    return age >= (o.type === 'standing' || o.type === 'apply' ? 7 : 1) * 86400_000;
  }).map(o => ({ id: o.id, url: o.evidence.url, tier: o.evidence.tier, pageHash: o.evidence.pageHash ?? null,
    proposalHash: (proposals.find(p => p.offerId === o.id)?.candidate.evidence as typeof o.evidence | undefined)?.pageHash ?? null,
    sourceId: o.sourceId, platformId: o.platformId, excerpts: o.evidence.excerpts })) });
});

/** 只有同一证据页仍含保存的关键原文，才刷新该权益的核验时间。 */
ingest.post('/verify', async c => {
  const body = z.object({ offerId: z.string(), url: z.url(), finalUrl: z.url().optional(), text: z.string().max(250000),
    pageHash: z.string().regex(/^[a-f0-9]{64}$/).optional(), processedChange: z.boolean().optional() }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: '核验数据不正确', issues: body.error.issues }, 400);
  const d = db(c.env);
  const [o] = await d.select().from(s.offers).where(eq(s.offers.id, body.data.offerId));
  if (!o || o.reviewState !== 'approved' || o.evidence.url !== body.data.url) return c.json({ error: '证据或活动不匹配' }, 404);
  if (body.data.finalUrl && new URL(body.data.finalUrl).hostname.toLowerCase() !== new URL(o.evidence.url).hostname.toLowerCase()) {
    await d.update(s.offers).set({ verifyResult: 'evidence_missing', updatedAt: new Date().toISOString() }).where(eq(s.offers.id, o.id));
    return c.json({ verified: false, redirectedOutsideOfficialHost: true });
  }
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
  const current = normalize(body.data.text);
  const quotes = Object.values(o.evidence.excerpts).filter((value): value is string => typeof value === 'string' && !!value.trim());
  const unprocessedChange = !!body.data.pageHash && body.data.pageHash !== o.evidence.pageHash && !body.data.processedChange;
  const quotesMatch = quotes.length > 0 && quotes.every(quote => current.includes(normalize(quote)));
  const [proposal] = await d.select().from(s.offerProposals).where(eq(s.offerProposals.offerId, o.id));
  const unchangedTerms = !!body.data.pageHash && body.data.processedChange === true
    && o.evidence.pageHash === body.data.pageHash && !proposal;
  const verified = !unprocessedChange && (quotesMatch || unchangedTerms);
  const evidence = verified && body.data.processedChange && body.data.pageHash && !proposal
    ? { ...o.evidence, pageHash: body.data.pageHash } : o.evidence;
  const nowIso = new Date().toISOString();
  await d.update(s.offers).set(verified
    ? { lastVerifiedAt: nowIso, verifyResult: unchangedTerms ? '必要业务字段没有变化' : '官方证据原文仍在当前页面', evidence, updatedAt: nowIso }
    : { verifyResult: 'evidence_missing', evidence, updatedAt: nowIso })
    .where(eq(s.offers.id, o.id));
  return c.json({ verified, matchedExcerpts: verified ? quotes.length : 0 });
});

/** 一次抓取的结果：成功时记录内容哈希（变化才存快照），失败时累计连续失败次数。 */
ingest.post('/snapshots', async c => {
  const body = z.object({
    sourceId: z.string(), url: z.string(), ok: z.boolean(), deferred: z.boolean().optional(),
    hash: z.string().optional(), text: z.string().max(60000).optional(), error: z.string().max(500).optional(),
  }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: '数据格式不正确', issues: body.error.issues }, 400);
  const b = body.data, d = db(c.env), nowIso = new Date().toISOString();
  const [src] = await d.select().from(s.sources).where(eq(s.sources.id, b.sourceId));
  if (!src) return c.json({ error: '没有这个信源' }, 404);
  if (!b.ok) {
    await d.update(s.sources).set({ failStreak: src.failStreak + 1, lastError: b.error ?? '抓取失败' }).where(eq(s.sources.id, b.sourceId));
    return c.json({ failStreak: src.failStreak + 1 });
  }
  // deferCount：内容有变化但这一轮没能抽取（免费模型都不可用）的连续次数，用来决定是否动用付费兜底
  const cfg = { ...(src.config ?? {}) } as Record<string, unknown>;
  cfg.deferCount = b.deferred ? Number(cfg.deferCount ?? 0) + 1 : b.hash ? 0 : Number(cfg.deferCount ?? 0);
  await d.update(s.sources).set({ failStreak: 0, lastError: null, lastOkAt: nowIso, config: cfg }).where(eq(s.sources.id, b.sourceId));
  if (!b.hash) return c.json({ changed: false, deferCount: cfg.deferCount });
  const [prev] = await d.select({ hash: s.snapshots.hash }).from(s.snapshots).where(eq(s.snapshots.sourceId, b.sourceId)).orderBy(desc(s.snapshots.id)).limit(1);
  if (prev?.hash === b.hash) return c.json({ changed: false });
  await d.insert(s.snapshots).values({ sourceId: b.sourceId, url: b.url, hash: b.hash, text: b.text ?? null });
  return c.json({ changed: true });
});

/** 线索研判：取待处理的线索、回写处理结果。 */
ingest.get('/leads', async c => {
  const limit = Math.min(50, Number(c.req.query('limit') ?? 20));
  // 社区和媒体线索优先（信号密度高），同类里由新到旧
  const rows = await db(c.env).select().from(s.leads).where(eq(s.leads.status, 'new'))
    .orderBy(sql`CASE WHEN ${s.leads.origin} IN ('telegram','manual') THEN 0 WHEN ${s.leads.origin} IN ('linuxdo','ithome','v2ex','hn','reddit') THEN 1 ELSE 2 END`, desc(s.leads.id)).limit(limit);
  return c.json({ leads: rows });
});
ingest.post('/leads/:id/status', async c => {
  const b = z.object({ status: z.enum(['linked', 'rejected', 'reviewing']), offerId: z.string().optional(), note: z.string().max(500).optional() }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: '数据格式不正确' }, 400);
  const [lead] = await db(c.env).select().from(s.leads).where(eq(s.leads.id, Number(c.req.param('id'))));
  if (!lead) return c.json({ error: '没有这条线索' }, 404);
  const raw = b.data.note ? `${lead.raw ?? ''}\n[研判] ${b.data.note}`.slice(-20000) : lead.raw;
  await db(c.env).update(s.leads).set({ status: b.data.status, offerId: b.data.offerId ?? lead.offerId, raw }).where(eq(s.leads.id, lead.id));
  return c.json({ ok: true });
});

/**
 * 最近的人工纠正（修改字段、拒绝理由），给模型当"过去的纠正"参考。
 * 优先同一信源，其次同一平台，再其次全局最近；最多 limit 条，每条一行中文。
 */
ingest.get('/corrections', async c => {
  const platform = c.req.query('platform') ?? '', source = c.req.query('source') ?? '', limit = Math.min(100, Number(c.req.query('limit') ?? 10));
  const since = new Date(Date.now() - Number(c.req.query('days') ?? 3650) * 86400_000).toISOString();
  // 只取最近的记录（按主键倒序，读行数有上限）。旧写法对每条修订做相关子查询，单次读几万行，采集时每个信源调一次，曾经用光 D1 每日免费读额度。
  const recentRevs = await c.env.DB.prepare(`SELECT v.offer_id oid, v.diff d, v.at at, v.author author FROM offer_revisions v ORDER BY v.id DESC LIMIT 400`).all<{ oid: string; d: string; at: string; author: string }>();
  const recentRevs2 = recentRevs.results.filter(v => v.author === 'admin' && v.at >= since).slice(0, 200);
  const recentReviews = await c.env.DB.prepare(`SELECT offer_id oid, action, reason, reason_code code, reviewer, at FROM reviews ORDER BY id DESC LIMIT 600`).all<{ oid: string; action: string; reason: string | null; code: string | null; reviewer: string | null; at: string }>();
  const ids = [...new Set([...recentRevs2.map(v => v.oid), ...recentReviews.results.map(r => r.oid)])];
  const offerRows = ids.length ? (await c.env.DB.prepare(`SELECT id, platform_id p, source_id src, title t, value_text v FROM offers WHERE id IN (SELECT value FROM json_each(?1))`).bind(JSON.stringify(ids)).all<{ id: string; p: string; src: string | null; t: string; v: string }>()).results : [];
  const offerById = new Map(offerRows.map(o => [o.id, o]));
  const editReason = (oid: string, at: string) => recentReviews.results.filter(r => r.oid === oid && r.action === 'edit')
    .sort((a, b) => Math.abs(Date.parse(a.at) - Date.parse(at)) - Math.abs(Date.parse(b.at) - Date.parse(at)))[0]?.reason ?? null;
  const edits = { results: recentRevs2.filter(v => offerById.has(v.oid)).map(v => { const o = offerById.get(v.oid)!; return { p: o.p, src: o.src, t: o.t, d: v.d, reason: editReason(v.oid, v.at), at: v.at }; }) };
  const rejects = { results: recentReviews.results.filter(r => r.action === 'reject' && (r.reviewer ?? '') !== 'system' && (r.reason || r.code) && r.at >= since && offerById.has(r.oid))
    .slice(0, 200).map(r => { const o = offerById.get(r.oid)!; return { p: o.p, src: o.src, t: o.t, v: o.v, reason: r.reason, code: r.code, at: r.at }; }) };
  const CODE: Record<string, string> = { paid_bundle: '付费套餐自带的额度', not_ai: '不是 AI 使用额度', wrong_platform: '平台归错', duplicate: '重复', expired: '已过期', vague: '额度不明确', wrong_type: '分类错', wrong_field: '字段错', other: '其他' };
  const items = [
    ...edits.results.map(e => ({ p: e.p, src: e.src, at: e.at, line: `「${e.t}」人工修改：${(JSON.parse(e.d) as { field: string; from: unknown; to: unknown }[]).filter(x => JSON.stringify(x.from) !== JSON.stringify(x.to)).map(x => `${x.field} ${JSON.stringify(x.from)} → ${JSON.stringify(x.to)}`).join('；')}${e.reason ? `（理由：${e.reason}）` : ''}` })),
    ...rejects.results.map(r => ({ p: r.p, src: r.src, at: r.at, line: `「${r.t}」（${r.v.slice(0, 40)}）被拒绝：${[r.code ? CODE[r.code] ?? r.code : '', r.reason ?? ''].filter(Boolean).join('，')}` })),
  ];
  const rank = (x: { p: string; src: string | null }) => (source && x.src === source ? 0 : platform && x.p === platform ? 1 : 2);
  items.sort((a, b) => rank(a) - rank(b) || (a.at < b.at ? 1 : -1));
  return c.json({ corrections: items.slice(0, limit).map(x => x.line), total: items.length });
});

/** 所有尚未拒绝的条目索引；常驻福利不能在第 61 天从判重范围消失。 */
ingest.get('/offers-index', async c => {
  const rows = await db(c.env).select({ id: s.offers.id, platformId: s.offers.platformId, title: s.offers.title, valueText: s.offers.valueText })
    .from(s.offers).where(inArray(s.offers.reviewState, ['pending', 'approved']));
  return c.json({ offers: rows });
});

/** 模型预算：今日 token、本月费用。 */
ingest.post('/model-budget/reserve', async c => {
  const body = z.object({ provider: z.string().max(40), tokens: z.number().int().positive().max(400000), costCny: z.number().nonnegative().max(1000) })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: '预算预留参数不正确' }, 400);
  const tokenCap = Number(c.env.DAILY_TOKEN_CAP ?? 0), costCap = Number(c.env.MONTHLY_COST_CAP_CNY ?? 10);
  if (!Number.isFinite(tokenCap) || !Number.isFinite(costCap) || tokenCap < 0 || costCap < 0) return c.json({ error: '服务端预算配置不正确' }, 503);
  const nowIso = new Date().toISOString(), today = nowIso.slice(0, 10), month = nowIso.slice(0, 7);
  // 一条 INSERT ... WHERE 同时判定与占用余额，多个并发采集任务也不能越过上限。
  const reserved = await c.env.DB.prepare(`INSERT INTO runs (kind,started_at,finished_at,ok,stats,tokens,cost_cny)
    SELECT 'model', ?1, ?1, 0, ?2, ?3, ?4
    WHERE (?6 = 0 OR (SELECT COALESCE(SUM(tokens),0) FROM runs WHERE substr(started_at,1,10)=?5) + ?3 <= ?6)
      AND (SELECT COALESCE(SUM(cost_cny),0) FROM runs WHERE substr(started_at,1,7)=?7) + ?4 <= ?8
    RETURNING id`).bind(nowIso, JSON.stringify({ state: 'reserved', provider: body.data.provider }), body.data.tokens,
    body.data.costCny, today, tokenCap, month, costCap).first<{ id: number }>();
  return reserved ? c.json({ id: reserved.id }) : c.json({ error: '模型预算不足，本次调用已推迟' }, 429);
});

ingest.post('/model-budget/:id/settle', async c => {
  const body = z.object({ provider: z.string().max(40), tokens: z.number().int().nonnegative().max(400000), costCny: z.number().nonnegative().max(1000) })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: '模型用量不正确' }, 400);
  const id = Number(c.req.param('id'));
  if (!Number.isSafeInteger(id) || id <= 0) return c.json({ error: '预留记录无效' }, 400);
  const [record] = await db(c.env).select().from(s.runs).where(and(eq(s.runs.id, id), eq(s.runs.kind, 'model')));
  if (!record) return c.json({ error: '没有这次模型调用' }, 404);
  if ((record.stats as { state?: string }).state === 'settled') return c.json({ ok: true, alreadySettled: true });
  if (body.data.tokens > record.tokens || body.data.costCny > record.costCny + 0.000001) return c.json({ error: '实际用量超出预留，请保留预留并人工核对' }, 409);
  await db(c.env).update(s.runs).set({ tokens: body.data.tokens, costCny: body.data.costCny,
    stats: { state: 'settled', provider: body.data.provider }, ok: true, finishedAt: new Date().toISOString() }).where(eq(s.runs.id, id));
  return c.json({ ok: true });
});

ingest.get('/budget', async c => {
  const today = new Date().toISOString().slice(0, 10), month = today.slice(0, 7);
  const r = await c.env.DB.prepare(
    "SELECT COALESCE(SUM(CASE WHEN substr(started_at,1,10)=?1 THEN tokens END),0) AS tokens_today, COALESCE(SUM(CASE WHEN substr(started_at,1,7)=?2 THEN cost_cny END),0) AS cost_month FROM runs",
  ).bind(today, month).first<{ tokens_today: number; cost_month: number }>();
  return c.json({ tokensToday: r?.tokens_today ?? 0, costMonthCny: r?.cost_month ?? 0 });
});

ingest.post('/runs', async c => {
  const body = runIn.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: '数据格式不正确', issues: body.error.issues }, 400);
  const [r] = await db(c.env).insert(s.runs).values(body.data).returning({ id: s.runs.id });
  return c.json({ id: r.id });
});

app.route('/api/ingest', ingest);
app.route('/api/admin', feishuAdmin); // 先于 admin 注册：/api/admin/feishu/*、/api/admin/collect/*
app.route('/api/admin', admin);
app.all('/api/*', c => c.json({ error: '没有这个接口' }, 404));

export default {
  fetch: (req, env, ctx) => app.fetch(req, env, ctx),
  // 定时任务：飞书日报（东京 09:00）、每小时加急检查、每 6 小时触发采集
  scheduled: (controller, env, ctx) => { ctx.waitUntil(runScheduled(controller.cron, env)); },
} satisfies ExportedHandler<Env>;
