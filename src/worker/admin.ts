// 管理接口（Bearer ADMIN_TOKEN）：审核、编辑、补录、日报、健康检查。
// 调用方：Hermes Agent 的"AI 羊毛牧场"技能（scripts/ym.ts），以后还有网页后台。
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import * as s from '../db/schema';
import { claimEndAt, isClaimable, liveStatus, missingEvidence } from '../shared/lifecycle';
import type { Env } from './index';

type OfferRow = typeof s.offers.$inferSelect;
const db = (env: Env) => drizzle(env.DB, { schema: s });

/** 4 位短码，方便在手机上回复（例如"通过 a3f9"）。 */
export function shortCode(id: string): string {
  let h = 2166136261;
  for (const ch of id) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36).padStart(4, '0').slice(-4);
}

const TYPE_L: Record<string, string> = { new: '注册新人礼', free: '限时免费开放', perk: '会员福利', topup: '充值赠送', gift: '会员免费送', standing: '常驻免费额度', apply: '申请制' };
const md = (d: string) => `${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日`;
const endText = (o: OfferRow) => (o.endKind === 'date' && o.claimEnd ? `${md(o.claimEnd)}截止` : o.endKind === 'unknown' ? '截止未知' : '常驻');

function view(o: OfferRow, platformName: string, now = new Date()) {
  return {
    code: shortCode(o.id), id: o.id, platform: platformName, title: o.title, type: TYPE_L[o.type] ?? o.type,
    value: o.valueText, usd: o.usdEstimate, end: endText(o), status: liveStatus(o, now), reviewState: o.reviewState,
    requirements: o.requirements, audience: o.audience, claimMethod: o.claimMethod, creditValidity: o.creditValidity,
    sourceTz: o.sourceTz, claimStart: o.claimStart, claimEnd: o.claimEnd, endKind: o.endKind,
    evidenceUrl: o.evidence.url, evidenceTier: o.evidence.tier, excerpts: o.evidence.excerpts, missingEvidence: missingEvidence(o.evidence.excerpts),
    link: `https://ai-yangmao.com/#offer-${o.id}`,
  };
}

export const admin = new Hono<{ Bindings: Env }>();

admin.use('*', async (c, next) => {
  const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!c.env.ADMIN_TOKEN || c.env.ADMIN_TOKEN.length < 16 || token !== c.env.ADMIN_TOKEN) return c.json({ error: '管理员密钥不正确' }, 401);
  c.header('Cache-Control', 'no-store');
  await next();
});

async function platformNames(env: Env) {
  const rows = await db(env).select({ id: s.platforms.id, name: s.platforms.name }).from(s.platforms);
  return Object.fromEntries(rows.map(r => [r.id, r.name]));
}

/** 按短码或完整 id 找羊毛。 */
async function findOffer(env: Env, ref: string): Promise<OfferRow | null> {
  const d = db(env);
  const [byId] = await d.select().from(s.offers).where(eq(s.offers.id, ref));
  if (byId) return byId;
  const all = await d.select().from(s.offers);
  return all.find(o => shortCode(o.id) === ref.toLowerCase()) ?? null;
}

admin.get('/queue', async c => {
  const d = db(c.env), names = await platformNames(c.env), now = new Date();
  const pending = await d.select().from(s.offers).where(eq(s.offers.reviewState, 'pending')).orderBy(desc(s.offers.discoveredAt));
  const [{ n: newLeads }] = await d.select({ n: sql<number>`count(*)` }).from(s.leads).where(eq(s.leads.status, 'new'));
  const pendingPlatforms = await d.select().from(s.platforms).where(eq(s.platforms.status, 'pending'));
  const suggest = await d.select().from(s.sources).where(and(gte(s.sources.cleanStreak, 5), eq(s.sources.autoPublish, false)));
  return c.json({
    pending: pending.map(o => view(o, names[o.platformId] ?? o.platformId, now)),
    newLeads, pendingPlatforms: pendingPlatforms.map(p => ({ id: p.id, name: p.name, type: p.type, site: p.site })),
    suggestAutoPublish: suggest.map(x => ({ id: x.id, platformId: x.platformId, url: x.url, cleanStreak: x.cleanStreak })),
  });
});

admin.get('/offers/:ref', async c => {
  const o = await findOffer(c.env, c.req.param('ref'));
  if (!o) return c.json({ error: '找不到这条羊毛' }, 404);
  const names = await platformNames(c.env);
  const revisions = await db(c.env).select().from(s.offerRevisions).where(eq(s.offerRevisions.offerId, o.id)).orderBy(desc(s.offerRevisions.at));
  return c.json({ offer: view(o, names[o.platformId] ?? o.platformId), revisions });
});

/** 审核：通过 / 拒绝。原样通过会给信源的"连续原样通过"加一；拒绝清零。 */
admin.post('/offers/:ref/:action{approve|reject}', async c => {
  const o = await findOffer(c.env, c.req.param('ref'));
  if (!o) return c.json({ error: '找不到这条羊毛' }, 404);
  const action = c.req.param('action') as 'approve' | 'reject';
  const body = await c.req.json().catch(() => ({})) as { reason?: string; reviewer?: string };
  const d = db(c.env);
  await d.update(s.offers).set({ reviewState: action === 'approve' ? 'approved' : 'rejected', updatedAt: new Date().toISOString() }).where(eq(s.offers.id, o.id));
  await d.insert(s.reviews).values({ offerId: o.id, action, reviewer: body.reviewer ?? 'hermes', editedFields: body.reason ? [`理由：${body.reason}`] : [] });
  let streak: number | null = null;
  if (o.sourceId) {
    const [src] = await d.select().from(s.sources).where(eq(s.sources.id, o.sourceId));
    if (src) {
      streak = action === 'approve' ? src.cleanStreak + 1 : 0;
      await d.update(s.sources).set({ cleanStreak: streak }).where(eq(s.sources.id, src.id));
    }
  }
  const end = claimEndAt(o);
  const urgent = action === 'approve' && !!end && end.getTime() - Date.now() <= 48 * 3600_000 && end.getTime() > Date.now();
  return c.json({ ok: true, code: shortCode(o.id), title: o.title, reviewState: action === 'approve' ? 'approved' : 'rejected', sourceCleanStreak: streak, urgent });
});

/** 修改字段后通过（算作"修改"，信源的连续原样通过清零）。 */
const editable = z.object({
  title: z.string().min(2).max(120), type: z.enum(['new', 'free', 'perk', 'topup', 'gift', 'standing', 'apply']),
  valueText: z.string().max(200), usdEstimate: z.number().nonnegative().nullable(), claimStart: z.string().nullable(), claimEnd: z.string().nullable(),
  endKind: z.enum(['date', 'unknown', 'standing']), creditValidity: z.string().nullable(), audience: z.enum(['new', 'old', 'all', 'unclear']),
  requirements: z.array(z.string()).min(1), modalities: z.array(z.string()).min(1), platformId: z.string(), sourceTz: z.string(),
  claimMethod: z.enum(['auto', 'signup', 'app', 'form', 'topup', 'member', 'code']),
}).partial();
admin.post('/offers/:ref/edit', async c => {
  const o = await findOffer(c.env, c.req.param('ref'));
  if (!o) return c.json({ error: '找不到这条羊毛' }, 404);
  const body = await c.req.json().catch(() => null) as { fields?: unknown; approve?: boolean } | null;
  const parsed = editable.safeParse(body?.fields);
  if (!parsed.success) return c.json({ error: '字段不正确', issues: parsed.error.issues }, 400);
  const f = parsed.data, d = db(c.env);
  const diff = Object.entries(f).map(([k, v]) => ({ field: k, from: (o as Record<string, unknown>)[k], to: v }));
  if (!diff.length) return c.json({ error: '没有要改的字段' }, 400);
  await d.update(s.offers).set({ ...f, ...(body?.approve ? { reviewState: 'approved' as const } : {}), updatedAt: new Date().toISOString() }).where(eq(s.offers.id, o.id));
  await d.insert(s.offerRevisions).values({ offerId: o.id, diff });
  await d.insert(s.reviews).values({ offerId: o.id, action: 'edit', editedFields: Object.keys(f), reviewer: 'hermes' });
  if (o.sourceId) await d.update(s.sources).set({ cleanStreak: 0 }).where(eq(s.sources.id, o.sourceId));
  return c.json({ ok: true, code: shortCode(o.id), changed: Object.keys(f), approved: !!body?.approve });
});

admin.get('/leads', async c => {
  const rows = await db(c.env).select().from(s.leads).where(eq(s.leads.status, 'new')).orderBy(desc(s.leads.id)).limit(Number(c.req.query('limit') ?? 20));
  return c.json({ leads: rows.map(l => ({ id: l.id, origin: l.origin, title: l.title, url: l.url, createdAt: l.createdAt })) });
});

admin.post('/leads/:id/:action{dismiss|reviewing}', async c => {
  await db(c.env).update(s.leads).set({ status: c.req.param('action') === 'dismiss' ? 'rejected' : 'reviewing' }).where(eq(s.leads.id, Number(c.req.param('id'))));
  return c.json({ ok: true });
});

/** 补录：记为线索，下一轮采集会抓取这个链接并抽取（进待审）。 */
admin.post('/manual', async c => {
  const body = z.object({ url: z.url(), note: z.string().max(500).optional(), platformId: z.string().optional() }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: '链接不正确', issues: body.error.issues }, 400);
  const raw = JSON.stringify({ note: body.data.note ?? null, platformId: body.data.platformId ?? null });
  const res = await db(c.env).insert(s.leads).values({ origin: 'telegram', url: body.data.url, title: body.data.note ?? '补录链接', raw })
    .onConflictDoUpdate({ target: s.leads.url, set: { status: 'new', origin: 'telegram', raw } }).returning({ id: s.leads.id });
  return c.json({ ok: true, leadId: res[0]?.id });
});

admin.post('/platforms/:id/:action{approve|reject}', async c => {
  await db(c.env).update(s.platforms).set({ status: c.req.param('action') === 'approve' ? 'approved' : 'rejected', updatedAt: new Date().toISOString() }).where(eq(s.platforms.id, c.req.param('id')));
  return c.json({ ok: true });
});

admin.post('/sources/:id/auto-publish', async c => {
  const { on } = await c.req.json().catch(() => ({ on: true })) as { on: boolean };
  await db(c.env).update(s.sources).set({ autoPublish: !!on }).where(eq(s.sources.id, c.req.param('id')));
  return c.json({ ok: true, autoPublish: !!on });
});

/**
 * 日报 / 加急要推送的内容。每条按（羊毛, 阶段, 渠道）只推一次；commit=1 时写入通知台账。
 * kind=digest：新增、条款变化、3 天内结束、已结束；kind=urgent：48 小时内截止的新上架。
 */
admin.get('/notify', async c => {
  const channel = (c.req.query('channel') ?? 'telegram') as 'telegram' | 'feishu';
  const kind = c.req.query('kind') === 'urgent' ? 'urgent' : 'digest';
  const commit = c.req.query('commit') === '1';
  const d = db(c.env), names = await platformNames(c.env), now = new Date();
  const approved = await d.select().from(s.offers).where(eq(s.offers.reviewState, 'approved'));
  const sent = await d.select().from(s.notifications).where(eq(s.notifications.channel, channel));
  const has = (id: string, stage: string) => sent.find(n => n.offerId === id && n.stage === stage);
  const out: Record<string, ReturnType<typeof view>[]> = { new: [], changed: [], ending: [], ended: [], urgent: [] };
  const marks: { offerId: string; stage: 'new' | 'changed' | 'ending' | 'ended' | 'urgent'; messageId?: string }[] = [];
  const revs = approved.length ? await d.select().from(s.offerRevisions).where(inArray(s.offerRevisions.offerId, approved.map(o => o.id))) : [];
  for (const o of approved) {
    const st = liveStatus(o, now), v = view(o, names[o.platformId] ?? o.platformId, now), end = claimEndAt(o);
    if (kind === 'urgent') {
      if (end && end > now && end.getTime() - now.getTime() <= 48 * 3600_000 && !has(o.id, 'urgent') && !has(o.id, 'new')) { out.urgent.push(v); marks.push({ offerId: o.id, stage: 'urgent' }, { offerId: o.id, stage: 'new' }); }
      continue;
    }
    if (!has(o.id, 'new') && !has(o.id, 'urgent') && st !== 'ended') { out.new.push(v); marks.push({ offerId: o.id, stage: 'new' }); continue; }
    const lastRev = revs.filter(r => r.offerId === o.id).sort((a, b) => b.id - a.id)[0];
    const ch = has(o.id, 'changed');
    if (lastRev && (!ch || Number(ch.messageId ?? 0) < lastRev.id)) { out.changed.push({ ...v, value: lastRev.diff.map(x => `${x.field}: ${String(x.from)} → ${String(x.to)}`).join('；') }); marks.push({ offerId: o.id, stage: 'changed', messageId: String(lastRev.id) }); }
    if (st === 'ending' && !has(o.id, 'ending')) { out.ending.push(v); marks.push({ offerId: o.id, stage: 'ending' }); }
    if (st === 'ended' && !has(o.id, 'ended') && (!end || now.getTime() - end.getTime() < 7 * 86400_000)) { out.ended.push(v); marks.push({ offerId: o.id, stage: 'ended' }); }
  }
  const pendingCount = (await d.select({ n: sql<number>`count(*)` }).from(s.offers).where(eq(s.offers.reviewState, 'pending')))[0].n;
  if (commit && marks.length) {
    const nowIso = now.toISOString();
    for (const m of marks) {
      await d.insert(s.notifications).values({ offerId: m.offerId, stage: m.stage, channel, status: 'sent', sentAt: nowIso, messageId: m.messageId ?? null })
        .onConflictDoUpdate({ target: [s.notifications.offerId, s.notifications.stage, s.notifications.channel], set: { status: 'sent', sentAt: nowIso, messageId: m.messageId ?? null } });
    }
  }
  return c.json({ kind, channel, items: out, pendingCount, empty: Object.values(out).every(a => !a.length) });
});

/** 健康检查：最近一次成功采集距今多久、连续失败的信源、预算。 */
admin.get('/health', async c => {
  const d = db(c.env);
  const [lastOk] = await d.select().from(s.runs).where(and(eq(s.runs.kind, 'collect'), eq(s.runs.ok, true))).orderBy(desc(s.runs.finishedAt)).limit(1);
  const failing = await d.select({ id: s.sources.id, failStreak: s.sources.failStreak, lastError: s.sources.lastError, lastOkAt: s.sources.lastOkAt }).from(s.sources).where(and(eq(s.sources.enabled, true), gte(s.sources.failStreak, 3)));
  const hours = lastOk?.finishedAt ? (Date.now() - Date.parse(lastOk.finishedAt)) / 3600_000 : null;
  const today = new Date().toISOString().slice(0, 10);
  const b = await c.env.DB.prepare("SELECT COALESCE(SUM(CASE WHEN substr(started_at,1,10)=?1 THEN tokens END),0) AS t, COALESCE(SUM(CASE WHEN substr(started_at,1,7)=?2 THEN cost_cny END),0) AS c FROM runs").bind(today, today.slice(0, 7)).first<{ t: number; c: number }>();
  const srcs = await d.select({ id: s.sources.id, kind: s.sources.kind, url: s.sources.url, failStreak: s.sources.failStreak, lastOkAt: s.sources.lastOkAt, lastError: s.sources.lastError, autoPublish: s.sources.autoPublish, cleanStreak: s.sources.cleanStreak, enabled: s.sources.enabled }).from(s.sources);
  return c.json({ tokensToday: b?.t ?? 0, costMonthCny: b?.c ?? 0, sources: srcs, lastSuccessfulCollect: lastOk?.finishedAt ?? null, hoursSince: hours, collectStale: hours === null || hours > 8, failingSources: failing });
});

export const offerIsClaimable = (o: OfferRow) => isClaimable(liveStatus(o));
