// Cloudflare Worker 入口：/api/* 走这里，其余由静态资源（网站页面）处理。
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import * as s from '../db/schema';
import { leadIn, offerIn, runIn } from '../shared/ingest';
import { activeOnDate, isClaimable, liveStatus, missingEvidence } from '../shared/lifecycle';
import { admin } from './admin';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  INGEST_TOKEN: string;
  ADMIN_TOKEN: string;
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

const withStatus = (o: OfferRow, now: Date) => ({ ...o, status: liveStatus(o, now), missingEvidence: missingEvidence(o.evidence.excerpts) });

app.get('/api/health', c => c.json({ ok: true, time: new Date().toISOString() }));

app.get('/api/meta', async c => {
  const [lastOk] = await db(c.env).select().from(s.runs).where(and(eq(s.runs.kind, 'collect'), eq(s.runs.ok, true))).orderBy(desc(s.runs.finishedAt)).limit(1);
  return c.json({ lastSuccessfulCollect: lastOk?.finishedAt ?? null });
});

/** 覆盖范围页：监控了哪些渠道、健康状况。不含任何密钥或内部地址以外的信息。 */
app.get('/api/coverage', async c => {
  const d = db(c.env);
  const srcs = await d.select({ kind: s.sources.kind, enabled: s.sources.enabled, failStreak: s.sources.failStreak, lastOkAt: s.sources.lastOkAt, platformId: s.sources.platformId, url: s.sources.url, config: s.sources.config }).from(s.sources);
  const [{ n: platforms }] = await d.select({ n: sql<number>`count(*)` }).from(s.platforms).where(eq(s.platforms.status, 'approved'));
  const [lastOk] = await d.select().from(s.runs).where(and(eq(s.runs.kind, 'collect'), eq(s.runs.ok, true))).orderBy(desc(s.runs.finishedAt)).limit(1);
  const byKind: Record<string, { total: number; enabled: number; failing: number }> = {};
  for (const x of srcs) {
    const k = (byKind[x.kind] ??= { total: 0, enabled: 0, failing: 0 });
    k.total++; if (x.enabled) k.enabled++; if (x.enabled && x.failStreak >= 3) k.failing++;
  }
  return c.json({ platforms, sources: srcs.filter(x => x.enabled).length, byKind, lastSuccessfulCollect: lastOk?.finishedAt ?? null, officialPages: srcs.filter(x => x.enabled && x.platformId).map(x => ({ platformId: x.platformId, url: x.url, kind: x.kind, healthy: x.failStreak < 3 })) });
});

const listQuery = z.object({
  view: z.enum(['claimable', 'all']).default('claimable'),
  type: z.string().optional(),
  modality: z.string().optional(),
  platform: z.string().optional(),
  on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tz: z.string().default('Asia/Shanghai'),
});

app.get('/api/offers', async c => {
  const q = listQuery.safeParse(c.req.query());
  if (!q.success) return c.json({ error: '查询参数不正确', issues: q.error.issues }, 400);
  const { view, type, modality, platform, on, tz } = q.data;
  const now = new Date();
  const conds = [eq(s.offers.reviewState, 'approved')];
  if (type) conds.push(eq(s.offers.type, type as OfferRow['type']));
  if (platform) conds.push(eq(s.offers.platformId, platform));
  let rows = (await db(c.env).select().from(s.offers).where(and(...conds))).map(o => withStatus(o, now));
  if (modality) rows = rows.filter(o => o.modalities.includes(modality));
  if (on) rows = rows.filter(o => activeOnDate(o, on, tz));
  else if (view === 'claimable') rows = rows.filter(o => isClaimable(o.status) || o.status === 'upcoming' || o.status === 'open');
  return c.json({ count: rows.length, offers: rows });
});

app.get('/api/offers/:id', async c => {
  const d = db(c.env);
  const [o] = await d.select().from(s.offers).where(and(eq(s.offers.id, c.req.param('id')), eq(s.offers.reviewState, 'approved')));
  if (!o) return c.json({ error: '没有这条羊毛' }, 404);
  const [platform] = await d.select().from(s.platforms).where(eq(s.platforms.id, o.platformId));
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
  for (const o of body.data) {
    const plat = plats.find(p => p.id === o.platformId);
    if (!plat) { results.push({ id: o.id, error: `平台 ${o.platformId} 不在白名单里，先建平台` }); continue; }
    const src = srcs.find(x => x.id === o.sourceId);
    const missing = missingEvidence(o.evidence.excerpts);
    const auto = plat.status === 'approved' && !!src?.autoPublish && !['staff', 'media'].includes(o.evidence.tier) && missing.length === 0 && !/未写明|不明确/.test(o.valueText);
    const [prev] = await d.select().from(s.offers).where(eq(s.offers.id, o.id));
    const nowIso = new Date().toISOString();
    const { leadId, ...od } = o;
    const row = {
      ...od, usdEstimate: o.usdEstimate ?? null, claimStart: o.claimStart ?? null, claimEnd: o.claimEnd ?? null,
      creditValidity: o.creditValidity ?? null, publishedAt: o.publishedAt ?? null, sourceId: o.sourceId ?? null,
      lastVerifiedAt: nowIso, verifyResult: '官方页面可以打开，已抽取字段', updatedAt: nowIso,
    };
    if (!prev) {
      await d.insert(s.offers).values({ ...row, reviewState: auto ? 'approved' : 'pending' });
      if (leadId) await d.update(s.leads).set({ status: 'linked', offerId: o.id }).where(eq(s.leads.id, leadId));
      results.push({ id: o.id, created: true, reviewState: auto ? 'approved' : 'pending', missingEvidence: missing });
      continue;
    }
    const tracked = ['title', 'type', 'modalities', 'claimMethod', 'requirements', 'audience', 'valueText', 'usdEstimate', 'claimStart', 'claimEnd', 'endKind', 'creditValidity', 'sourceTz'] as const;
    const diff = tracked.filter(k => JSON.stringify(prev[k] ?? null) !== JSON.stringify(row[k] ?? null)).map(k => ({ field: k, from: prev[k], to: row[k] }));
    if (!diff.length) {
      await d.update(s.offers).set({ lastVerifiedAt: nowIso, verifyResult: '官方页面可以打开，条款没有变化', updatedAt: nowIso }).where(eq(s.offers.id, o.id));
      results.push({ id: o.id, unchanged: true });
      continue;
    }
    const reviewState = prev.reviewState === 'rejected' ? 'rejected' : auto ? 'approved' : 'pending';
    await d.update(s.offers).set({ ...row, reviewState }).where(eq(s.offers.id, o.id));
    await d.insert(s.offerRevisions).values({ offerId: o.id, diff });
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
  const edits = await c.env.DB.prepare(`SELECT o.platform_id p, o.source_id src, o.title t, v.diff d, (SELECT reason FROM reviews r WHERE r.offer_id = o.id AND r.action = 'edit' ORDER BY abs(julianday(r.at) - julianday(v.at)) LIMIT 1) reason, v.at at
    FROM offer_revisions v JOIN offers o ON o.id = v.offer_id WHERE v.author = 'admin' AND v.at >= ?1 ORDER BY v.id DESC LIMIT 200`).bind(since).all<{ p: string; src: string | null; t: string; d: string; reason: string | null; at: string }>();
  const rejects = await c.env.DB.prepare(`SELECT o.platform_id p, o.source_id src, o.title t, o.value_text v, r.reason reason, r.reason_code code, r.at at
    FROM reviews r JOIN offers o ON o.id = r.offer_id WHERE r.action = 'reject' AND COALESCE(r.reviewer,'') <> 'system' AND (r.reason IS NOT NULL OR r.reason_code IS NOT NULL) AND r.at >= ?1 ORDER BY r.id DESC LIMIT 200`).bind(since).all<{ p: string; src: string | null; t: string; v: string; reason: string | null; code: string | null; at: string }>();
  const CODE: Record<string, string> = { paid_bundle: '付费套餐自带的额度', not_ai: '不是 AI 使用额度', wrong_platform: '平台归错', duplicate: '重复', expired: '已过期', vague: '额度不明确', wrong_type: '分类错', wrong_field: '字段错', other: '其他' };
  const items = [
    ...edits.results.map(e => ({ p: e.p, src: e.src, at: e.at, line: `「${e.t}」人工修改：${(JSON.parse(e.d) as { field: string; from: unknown; to: unknown }[]).filter(x => JSON.stringify(x.from) !== JSON.stringify(x.to)).map(x => `${x.field} ${JSON.stringify(x.from)} → ${JSON.stringify(x.to)}`).join('；')}${e.reason ? `（理由：${e.reason}）` : ''}` })),
    ...rejects.results.map(r => ({ p: r.p, src: r.src, at: r.at, line: `「${r.t}」（${r.v.slice(0, 40)}）被拒绝：${[r.code ? CODE[r.code] ?? r.code : '', r.reason ?? ''].filter(Boolean).join('，')}` })),
  ];
  const rank = (x: { p: string; src: string | null }) => (source && x.src === source ? 0 : platform && x.p === platform ? 1 : 2);
  items.sort((a, b) => rank(a) - rank(b) || (a.at < b.at ? 1 : -1));
  return c.json({ corrections: items.slice(0, limit).map(x => x.line), total: items.length });
});

/** 近 60 天没被拒绝的条目索引，研判时用来判断"是不是同一个活动"。 */
ingest.get('/offers-index', async c => {
  const since = new Date(Date.now() - 60 * 86400_000).toISOString();
  const rows = await db(c.env).select({ id: s.offers.id, platformId: s.offers.platformId, title: s.offers.title, valueText: s.offers.valueText })
    .from(s.offers).where(and(inArray(s.offers.reviewState, ['pending', 'approved']), gte(s.offers.discoveredAt, since)));
  return c.json({ offers: rows });
});

/** 模型预算：今日 token、本月费用。 */
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
app.route('/api/admin', admin);
app.all('/api/*', c => c.json({ error: '没有这个接口' }, 404));

export default {
  fetch: (req, env, ctx) => app.fetch(req, env, ctx),
} satisfies ExportedHandler<Env>;
