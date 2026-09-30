// Cloudflare Worker 入口：/api/* 走这里，其余由静态资源（网站页面）处理。
import { and, desc, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import * as s from '../db/schema';
import { leadIn, offerIn, runIn } from '../shared/ingest';
import { activeOnDate, isClaimable, liveStatus, missingEvidence } from '../shared/lifecycle';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  INGEST_TOKEN: string;
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
  const res = await db(c.env).insert(s.leads).values(body.data).onConflictDoNothing().returning({ id: s.leads.id });
  return c.json({ created: res.length, skipped: body.data.length - res.length });
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
    const auto = plat.status === 'approved' && !!src?.autoPublish && o.evidence.tier !== 'staff' && missing.length === 0;
    const [prev] = await d.select().from(s.offers).where(eq(s.offers.id, o.id));
    const nowIso = new Date().toISOString();
    const row = {
      ...o, usdEstimate: o.usdEstimate ?? null, claimStart: o.claimStart ?? null, claimEnd: o.claimEnd ?? null,
      creditValidity: o.creditValidity ?? null, publishedAt: o.publishedAt ?? null, sourceId: o.sourceId ?? null,
      lastVerifiedAt: nowIso, verifyResult: '官方页面可以打开，已抽取字段', updatedAt: nowIso,
    };
    if (!prev) {
      await d.insert(s.offers).values({ ...row, reviewState: auto ? 'approved' : 'pending' });
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

ingest.post('/runs', async c => {
  const body = runIn.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: '数据格式不正确', issues: body.error.issues }, 400);
  const [r] = await db(c.env).insert(s.runs).values(body.data).returning({ id: s.runs.id });
  return c.json({ id: r.id });
});

app.route('/api/ingest', ingest);
app.all('/api/*', c => c.json({ error: '没有这个接口' }, 404));

export default {
  fetch: (req, env, ctx) => app.fetch(req, env, ctx),
} satisfies ExportedHandler<Env>;
