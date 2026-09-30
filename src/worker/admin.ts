// 管理接口（Bearer ADMIN_TOKEN）：审核、编辑、补录、日报、健康检查。
// 调用方：Hermes Agent 的"AI 羊毛牧场"技能（scripts/ym.ts），以后还有网页后台。
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import * as s from '../db/schema';
import { claimEndAt, isClaimable, liveStatus, missingEvidence } from '../shared/lifecycle';
import { offerIn } from '../shared/ingest';
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
    code: shortCode(o.id), id: o.id, platformId: o.platformId, platform: platformName, title: o.title, type: TYPE_L[o.type] ?? o.type,
    value: o.valueText, usd: o.usdEstimate, end: endText(o), status: liveStatus(o, now), reviewState: o.reviewState,
    requirements: o.requirements, audience: o.audience, claimMethod: o.claimMethod, creditValidity: o.creditValidity,
    sourceTz: o.sourceTz, claimStart: o.claimStart, claimEnd: o.claimEnd, endKind: o.endKind,
    evidenceUrl: o.evidence.url, evidenceTier: o.evidence.tier, excerpts: o.evidence.excerpts, missingEvidence: missingEvidence(o.evidence.excerpts),
    steps: o.steps, modalities: o.modalities, usdEstimate: o.usdEstimate,
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
  const matches = all.filter(o => shortCode(o.id) === ref.toLowerCase());
  if (matches.length > 1) throw new AmbiguousShortCode(matches.map(o => o.id));
  return matches[0] ?? null;
}

class AmbiguousShortCode extends Error {
  constructor(readonly ids: string[]) { super('短码不唯一，请改用完整活动 ID'); }
}
admin.onError((error, c) => {
  if (error instanceof AmbiguousShortCode) return c.json({ error: error.message, ids: error.ids }, 409);
  throw error;
});

const validateStoredOffer = (offer: OfferRow) => offerIn.safeParse({
  ...offer, firstChannel: offer.firstChannel ?? undefined, sourceId: offer.sourceId ?? undefined,
});

/** 管理员通过时的门槛：平台已准入、证据是该平台的官方出处。不能靠 reviewState 绕过准入。 */
async function publicationError(env: Env, offer: OfferRow): Promise<string | null> {
  const valid = validateStoredOffer(offer);
  if (!valid.success) return '活动字段或日期不符合共享校验规则';
  if (offer.verifyResult === 'evidence_missing') return '当前官方页面未能再次确认原条款，先核验再通过';
  const [platform] = await db(env).select().from(s.platforms).where(eq(s.platforms.id, offer.platformId));
  if (!platform || platform.status !== 'approved') return '平台尚未准入';
  if (offer.evidence.tier === 'media') return '媒体或社区转述不能作为上架证据，请先补齐官方出处';
  if (offer.requirements.includes('unknown')) return '领取门槛尚未明确，先核对官方原文';
  // 不检查原文摘录：摘录门槛是防模型编造的（自动上架仍要求三项齐全，见 missingEvidence）。
  // 管理员人工核对过官方页面，内容可能来自图片、视频等模型读不到的地方，以管理员为准（2026-09-30 管理员决定）。
  let url: URL;
  try { url = new URL(offer.evidence.url); } catch { return '官方证据链接无效'; }
  if (!['https:', 'http:'].includes(url.protocol)) return '官方证据必须是网页链接';
  // 管理员亲自领到过：链接可以是官网下载页或社区帖子，不要求属于平台官方出处
  if (offer.evidence.tier === 'tested') return null;
  const host = url.hostname.toLowerCase();
  const handles = offer.evidence.tier === 'staff' ? platform.staffHandles : platform.xHandles;
  if (offer.evidence.tier === 'staff' || (offer.evidence.tier === 'official' && ['x.com', 'twitter.com'].includes(host))) {
    const handle = '@' + url.pathname.split('/')[1]?.toLowerCase();
    if (!['x.com', 'twitter.com'].includes(host) || !handles.some(x => x.toLowerCase() === handle)) return '官方或员工账号不在平台白名单中';
    return null;
  }
  if (offer.evidence.tier === 'official' && host === 'mp.weixin.qq.com' && platform.wechat) return null;
  const [source] = offer.sourceId ? await db(env).select().from(s.sources).where(eq(s.sources.id, offer.sourceId)) : [];
  if (source && source.platformId === platform.id && source.tier === offer.evidence.tier) {
    try { if (new URL(source.url).hostname.toLowerCase() === host) return null; } catch { /* 无效的信源地址不能证明归属 */ }
  }
  if (platform.site) {
    const officialHost = new URL(platform.site).hostname.toLowerCase();
    if (host === officialHost || host.endsWith('.' + officialHost)) return null;
  }
  return '证据链接不属于该平台的官网或已登记官方信源';
}

admin.get('/queue', async c => {
  const d = db(c.env), names = await platformNames(c.env), now = new Date();
  const pending = await d.select().from(s.offers).where(eq(s.offers.reviewState, 'pending')).orderBy(desc(s.offers.discoveredAt));
  const proposals = await d.select().from(s.offerProposals).orderBy(desc(s.offerProposals.updatedAt));
  const originals = proposals.length ? await d.select().from(s.offers).where(inArray(s.offers.id, proposals.map(p => p.offerId))) : [];
  const codeCounts = new Map<string, number>();
  for (const { id } of await d.select({ id: s.offers.id }).from(s.offers)) codeCounts.set(shortCode(id), (codeCounts.get(shortCode(id)) ?? 0) + 1);
  const queueView = (o: OfferRow) => ({ ...view(o, names[o.platformId] ?? o.platformId, now), code: codeCounts.get(shortCode(o.id))! > 1 ? o.id : shortCode(o.id) });
  const [{ n: newLeads }] = await d.select({ n: sql<number>`count(*)` }).from(s.leads).where(eq(s.leads.status, 'new'));
  const pendingPlatforms = await d.select().from(s.platforms).where(eq(s.platforms.status, 'pending'));
  const suggest = (await d.select().from(s.sources).where(and(gte(s.sources.cleanStreak, 5), eq(s.sources.autoPublish, false))))
    .filter(source => source.enabled && ['site', 'docs', 'official'].includes(source.tier));
  const needsVerification = (await d.select().from(s.offers).where(eq(s.offers.reviewState, 'approved')))
    .filter(o => liveStatus(o, now) === 'stale');
  return c.json({
    pending: [
      ...pending.map(queueView),
      ...proposals.flatMap(p => {
        const original = originals.find(o => o.id === p.offerId);
        return original ? [{ ...queueView({ ...original, ...p.candidate } as OfferRow), pendingUpdate: true, changedFields: p.diff.map(x => x.field) }] : [];
      }),
    ],
    newLeads, needsVerification: needsVerification.map(queueView), pendingPlatforms: pendingPlatforms.map(p => ({ id: p.id, name: p.name, type: p.type, site: p.site })),
    suggestAutoPublish: suggest.map(x => ({ id: x.id, platformId: x.platformId, url: x.url, cleanStreak: x.cleanStreak })),
  });
});

/** 人工核对官方撤回公告后，结束无固定截止时间的权益。 */
admin.post('/offers/:ref/withdraw', async c => {
  const o = await findOffer(c.env, c.req.param('ref'));
  if (!o) return c.json({ error: '找不到这条羊毛' }, 404);
  const body = z.object({ reason: z.string().min(4).max(500), evidenceUrl: z.url().refine(url => /^https?:\/\//.test(url)) })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: '需要官方撤回链接和具体理由', issues: body.error.issues }, 400);
  const nowIso = new Date().toISOString();
  const previousEvidence = o.evidence;
  const evidence = { ...previousEvidence, url: body.data.evidenceUrl, capturedAt: nowIso };
  await db(c.env).update(s.offers).set({ withdrawnAt: nowIso, withdrawnReason: body.data.reason, evidence, updatedAt: nowIso }).where(eq(s.offers.id, o.id));
  await db(c.env).insert(s.offerRevisions).values({ offerId: o.id, author: 'admin',
    diff: [{ field: 'withdrawnAt', from: o.withdrawnAt, to: nowIso }, { field: 'withdrawnReason', from: o.withdrawnReason, to: body.data.reason }],
    evidenceBefore: previousEvidence, evidenceAfter: evidence });
  await db(c.env).delete(s.offerProposals).where(eq(s.offerProposals.offerId, o.id));
  return c.json({ ok: true, code: shortCode(o.id), status: 'ended' });
});

admin.get('/offers/:ref', async c => {
  const o = await findOffer(c.env, c.req.param('ref'));
  if (!o) return c.json({ error: '找不到这条羊毛' }, 404);
  const names = await platformNames(c.env);
  const [proposal] = await db(c.env).select().from(s.offerProposals).where(eq(s.offerProposals.offerId, o.id));
  const revisions = await db(c.env).select().from(s.offerRevisions).where(eq(s.offerRevisions.offerId, o.id)).orderBy(desc(s.offerRevisions.at));
  return c.json({ offer: view(proposal ? { ...o, ...proposal.candidate } as OfferRow : o, names[o.platformId] ?? o.platformId), pendingUpdate: !!proposal, revisions });
});

/** 审核：通过 / 拒绝。原样通过会给信源的"连续原样通过"加一；拒绝清零。 */
admin.post('/offers/:ref/:action{approve|reject}', async c => {
  const o = await findOffer(c.env, c.req.param('ref'));
  if (!o) return c.json({ error: '找不到这条羊毛' }, 404);
  const action = c.req.param('action') as 'approve' | 'reject';
  const body = await c.req.json().catch(() => ({})) as { reason?: string; reasonCode?: string; reviewer?: string };
  const d = db(c.env);
  const [proposal] = await d.select().from(s.offerProposals).where(eq(s.offerProposals.offerId, o.id));
  if (o.reviewState !== 'pending' && !proposal) return c.json({ error: '这条活动目前没有待审核内容' }, 409);
  if (action === 'approve') {
    const candidate = proposal ? { ...o, ...proposal.candidate } as OfferRow : o;
    const issue = await publicationError(c.env, candidate);
    if (issue) return c.json({ error: issue }, 400);
  }
  const nowIso = new Date().toISOString();
  if (proposal && o.reviewState === 'approved') {
    if (action === 'approve') {
      const candidate = { ...o, ...proposal.candidate } as OfferRow;
      const parsed = validateStoredOffer(candidate);
      if (!parsed.success) return c.json({ error: '提案字段不正确', issues: parsed.error.issues }, 400);
      await d.update(s.offers).set({ ...parsed.data, lastVerifiedAt: candidate.lastVerifiedAt, verifyResult: candidate.verifyResult, updatedAt: nowIso }).where(eq(s.offers.id, o.id));
      await d.insert(s.offerRevisions).values({ offerId: o.id, diff: proposal.diff, evidenceBefore: o.evidence, evidenceAfter: candidate.evidence });
    }
    await d.delete(s.offerProposals).where(eq(s.offerProposals.offerId, o.id));
  } else {
    await d.update(s.offers).set({ reviewState: action === 'approve' ? 'approved' : 'rejected', updatedAt: nowIso }).where(and(eq(s.offers.id, o.id), eq(s.offers.reviewState, 'pending')));
  }
  await d.insert(s.reviews).values({ offerId: o.id, action, reviewer: body.reviewer ?? 'admin', reason: body.reason ?? null, reasonCode: body.reasonCode ?? null });
  let streak: number | null = null;
  if (o.sourceId) {
    const [src] = await d.select().from(s.sources).where(eq(s.sources.id, o.sourceId));
    if (src) {
      streak = action === 'approve' ? src.cleanStreak + 1 : 0;
      await d.update(s.sources).set({ cleanStreak: streak }).where(eq(s.sources.id, src.id));
    }
  }
  const end = claimEndAt(proposal ? { ...o, ...proposal.candidate } as OfferRow : o);
  const urgent = action === 'approve' && !!end && end.getTime() - Date.now() <= 48 * 3600_000 && end.getTime() > Date.now();
  return c.json({ ok: true, code: shortCode(o.id), title: o.title, reviewState: action === 'approve' ? 'approved' : 'rejected', sourceCleanStreak: streak, urgent });
});

/** 补丁只允许编辑业务字段；补丁合并后仍由 offerIn 校验完整活动。 */
const EDITABLE_FIELDS = new Set(['title', 'type', 'valueText', 'usdEstimate', 'claimStart', 'claimEnd', 'endKind', 'creditValidity',
  'audience', 'requirements', 'modalities', 'platformId', 'sourceTz', 'claimMethod', 'steps', 'evidence', 'publishedAt', 'sourceId']);
admin.post('/offers/:ref/edit', async c => {
  const o = await findOffer(c.env, c.req.param('ref'));
  if (!o) return c.json({ error: '找不到这条羊毛' }, 404);
  const body = await c.req.json().catch(() => null) as { fields?: Record<string, unknown>; approve?: boolean; reason?: string; reasonCode?: string } | null;
  const patch = z.record(z.string(), z.unknown()).safeParse(body?.fields);
  if (!patch.success || Object.keys(patch.data).some(key => !EDITABLE_FIELDS.has(key))) return c.json({ error: '包含不可编辑的字段' }, 400);
  const d = db(c.env), nowIso = new Date().toISOString();
  const [proposal] = await d.select().from(s.offerProposals).where(eq(s.offerProposals.offerId, o.id));
  const base = proposal ? { ...o, ...proposal.candidate } as OfferRow : o;
  const candidate = { ...base, ...patch.data } as OfferRow;
  const valid = validateStoredOffer(candidate);
  if (!valid.success) return c.json({ error: '活动字段不正确', issues: valid.error.issues }, 400);
  const diff = Object.keys(patch.data)
    .filter(key => JSON.stringify((base as Record<string, unknown>)[key] ?? null) !== JSON.stringify((candidate as Record<string, unknown>)[key] ?? null))
    .map(field => ({ field, from: (base as Record<string, unknown>)[field], to: (candidate as Record<string, unknown>)[field] }));
  if (!diff.length && !body?.approve) return c.json({ error: '没有要改的字段' }, 400);
  if (!diff.length && body?.approve && o.reviewState !== 'pending' && !proposal) return c.json({ error: '这条活动没有待审核内容' }, 409);
  if (body?.approve) {
    const issue = await publicationError(c.env, candidate);
    if (issue) return c.json({ error: issue }, 400);
  }

  if (proposal) {
    const manualFields = [...new Set([...proposal.manualFields, ...diff.map(x => x.field)])];
    const proposedDiff = Object.keys(proposal.candidate)
      .filter(field => JSON.stringify((o as Record<string, unknown>)[field] ?? null) !== JSON.stringify((candidate as Record<string, unknown>)[field] ?? null))
      .map(field => ({ field, from: (o as Record<string, unknown>)[field], to: (candidate as Record<string, unknown>)[field] }));
    if (body?.approve) {
      await d.update(s.offers).set({ ...valid.data, lastVerifiedAt: candidate.lastVerifiedAt, verifyResult: candidate.verifyResult, updatedAt: nowIso }).where(eq(s.offers.id, o.id));
      const pipelineDiff = proposedDiff.filter(x => !manualFields.includes(x.field));
      const manualDiff = proposedDiff.filter(x => manualFields.includes(x.field));
      if (pipelineDiff.length) await d.insert(s.offerRevisions).values({ offerId: o.id, diff: pipelineDiff, evidenceBefore: o.evidence, evidenceAfter: candidate.evidence });
      if (manualDiff.length) await d.insert(s.offerRevisions).values({ offerId: o.id, diff: manualDiff, author: 'admin', evidenceBefore: o.evidence, evidenceAfter: candidate.evidence });
      await d.delete(s.offerProposals).where(eq(s.offerProposals.offerId, o.id));
    } else {
      await d.update(s.offerProposals).set({ candidate, diff: proposedDiff, manualFields, updatedAt: nowIso }).where(eq(s.offerProposals.offerId, o.id));
    }
  } else {
    await d.update(s.offers).set({ ...valid.data, ...(body?.approve ? { reviewState: 'approved' as const } : {}), updatedAt: nowIso }).where(eq(s.offers.id, o.id));
    if (diff.length) await d.insert(s.offerRevisions).values({ offerId: o.id, diff, author: 'admin', evidenceBefore: o.evidence, evidenceAfter: candidate.evidence });
  }
  await d.insert(s.reviews).values({ offerId: o.id, action: 'edit', editedFields: diff.map(x => x.field), reviewer: 'admin', reason: body?.reason ?? null, reasonCode: body?.reasonCode ?? 'wrong_field' });
  if (o.sourceId && diff.length) await d.update(s.sources).set({ cleanStreak: 0 }).where(eq(s.sources.id, o.sourceId));
  return c.json({ ok: true, code: shortCode(o.id), changed: diff.map(x => x.field), approved: !!body?.approve });
});

admin.get('/leads', async c => {
  const limit = Math.max(1, Math.min(100, Number(c.req.query('limit') ?? 20) || 20));
  const rows = await db(c.env).select().from(s.leads).where(inArray(s.leads.status, ['new', 'reviewing'])).orderBy(desc(s.leads.id)).limit(limit);
  return c.json({ leads: rows.map(l => ({ id: l.id, origin: l.origin, title: l.title, url: l.url, status: l.status,
    note: l.status === 'reviewing' ? l.raw?.split('[研判]').at(-1)?.slice(0, 500) : null, createdAt: l.createdAt })) });
});

admin.post('/leads/:id/:action{dismiss|reviewing|retry}', async c => {
  const target = c.req.param('action') === 'dismiss' ? 'rejected' : c.req.param('action') === 'retry' ? 'new' : 'reviewing';
  await db(c.env).update(s.leads).set({ status: target }).where(eq(s.leads.id, Number(c.req.param('id'))));
  return c.json({ ok: true });
});

admin.post('/platforms', async c => {
  const body = z.object({ id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,60}$/), name: z.string().min(2).max(100),
    type: z.enum(['lab', 'cloud', 'infra', 'tool', 'new']), site: z.url().refine(url => /^https?:\/\//.test(url)) }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: '平台资料不正确', issues: body.error.issues }, 400);
  const [created] = await db(c.env).insert(s.platforms).values({ ...body.data, status: 'pending' }).onConflictDoNothing().returning({ id: s.platforms.id });
  if (!created) return c.json({ error: '该平台 ID 已存在' }, 409);
  return c.json({ id: created.id, status: 'pending' }, 201);
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
  const [source] = await db(c.env).select().from(s.sources).where(eq(s.sources.id, c.req.param('id')));
  if (!source) return c.json({ error: '没有这个信源' }, 404);
  if (on) {
    const [platform] = source.platformId ? await db(c.env).select().from(s.platforms).where(eq(s.platforms.id, source.platformId)) : [];
    if (!source.enabled || source.cleanStreak < 5 || !['site', 'docs', 'official'].includes(source.tier) || platform?.status !== 'approved')
      return c.json({ error: '信源尚未满足五条原样通过、平台准入和官方等级门槛' }, 400);
  }
  await db(c.env).update(s.sources).set({ autoPublish: !!on }).where(eq(s.sources.id, c.req.param('id')));
  return c.json({ ok: true, autoPublish: !!on });
});

type NoticeKind = 'digest' | 'urgent';
type NoticeChannel = 'telegram' | 'feishu';
type NoticeStage = 'new' | 'changed' | 'ending' | 'ended' | 'urgent';
type NoticeMark = { offerId: string; stage: NoticeStage; messageId?: string };
const FIELD_NAME: Record<string, string> = { title: '标题', type: '类型', modalities: '模态', claimMethod: '领取方式', requirements: '门槛', audience: '适用对象', valueText: '额度', usdEstimate: '价值估算', claimStart: '领取开始', claimEnd: '领取截止', endKind: '截止方式', creditValidity: '额度有效期', sourceTz: '官方时区', steps: '领取步骤', evidence: '官方证据' };
const showValue = (value: unknown) => value == null ? '未写明' : Array.isArray(value) ? value.join('、') : typeof value === 'object' ? '已更新' : String(value);

export async function buildNotice(env: Env, kind: NoticeKind, channel: NoticeChannel) {
  const d = db(env), names = await platformNames(env), now = new Date();
  const approvedPlatforms = new Set((await d.select({ id: s.platforms.id }).from(s.platforms).where(eq(s.platforms.status, 'approved'))).map(p => p.id));
  const approved = (await d.select().from(s.offers).where(eq(s.offers.reviewState, 'approved'))).filter(o => approvedPlatforms.has(o.platformId));
  const sent = await d.select().from(s.notifications).where(eq(s.notifications.channel, channel));
  const has = (id: string, stage: string) => sent.find(n => n.offerId === id && n.stage === stage);
  const out: Record<string, ReturnType<typeof view>[]> = { new: [], changed: [], ending: [], ended: [], urgent: [] };
  let marks: NoticeMark[] = [];
  const revs = approved.length ? await d.select().from(s.offerRevisions).where(and(inArray(s.offerRevisions.offerId, approved.map(o => o.id)), eq(s.offerRevisions.author, 'pipeline'))) : [];
  for (const o of approved) {
    const st = liveStatus(o, now), v = view(o, names[o.platformId] ?? o.platformId, now), end = claimEndAt(o);
    if (kind === 'urgent') {
      if (st === 'ending' && end && end > now && end.getTime() - now.getTime() <= 48 * 3600_000 && !has(o.id, 'urgent') && !has(o.id, 'new')) { out.urgent.push(v); marks.push({ offerId: o.id, stage: 'urgent' }); }
      continue;
    }
    if (!has(o.id, 'new') && !has(o.id, 'urgent') && isClaimable(st)) {
      out.new.push(v); marks.push({ offerId: o.id, stage: 'new' });
      // 新上架时已经临期的，这次就算"临期"也通知过了，避免同一天再以"3 天内结束"重复推送
      if (st === 'ending' && !has(o.id, 'ending')) marks.push({ offerId: o.id, stage: 'ending' });
      continue;
    }
    const lastRev = revs.filter(r => r.offerId === o.id).sort((a, b) => b.id - a.id)[0];
    const ch = has(o.id, 'changed');
    const firstAnnouncedAt = has(o.id, 'new')?.sentAt ?? has(o.id, 'urgent')?.sentAt;
    if (lastRev && firstAnnouncedAt && Date.parse(lastRev.at) > Date.parse(firstAnnouncedAt) && (!ch || Number(ch.messageId ?? 0) < lastRev.id)) {
      out.changed.push({ ...v, value: lastRev.diff.map(x => `${FIELD_NAME[x.field] ?? x.field}：${showValue(x.from)} → ${showValue(x.to)}`).join('；') });
      marks.push({ offerId: o.id, stage: 'changed', messageId: String(lastRev.id) });
    }
    if (st === 'ending' && !has(o.id, 'ending') && !has(o.id, 'urgent')) { out.ending.push(v); marks.push({ offerId: o.id, stage: 'ending' }); }
    if (st === 'ended' && !has(o.id, 'ended') && (!end || now.getTime() - end.getTime() < 7 * 86400_000)) { out.ended.push(v); marks.push({ offerId: o.id, stage: 'ended' }); }
  }
  const inFlight = (await d.select({ payload: s.deliveries.payload, channel: s.deliveries.channel, status: s.deliveries.status }).from(s.deliveries)
    .where(inArray(s.deliveries.status, ['pending', 'unknown']))).filter(delivery => delivery.channel === channel);
  const key = (mark: NoticeMark) => `${mark.offerId}\u0000${mark.stage}\u0000${mark.messageId ?? ''}`;
  const blocked = new Set(inFlight.flatMap(delivery => ((delivery.payload as { marks?: NoticeMark[] }).marks ?? []).map(key)));
  marks = marks.filter(mark => !blocked.has(key(mark))).sort((a, b) => key(a).localeCompare(key(b)));
  for (const stage of Object.keys(out) as NoticeStage[]) out[stage] = out[stage].filter(item => marks.some(mark => mark.offerId === item.id && mark.stage === stage));
  const pendingOffers = (await d.select({ n: sql<number>`count(*)` }).from(s.offers).where(eq(s.offers.reviewState, 'pending')))[0].n;
  const pendingProposals = (await d.select({ n: sql<number>`count(*)` }).from(s.offerProposals))[0].n;
  let pendingCount = pendingOffers + pendingProposals;
  let needsVerificationCount = approved.filter(o => liveStatus(o, now) === 'stale').length;
  let suggestAutoPublish = kind === 'digest' && channel === 'telegram'
    ? (await d.select().from(s.sources).where(and(gte(s.sources.cleanStreak, 5), eq(s.sources.autoPublish, false))))
      .filter(source => source.enabled && ['site', 'docs', 'official'].includes(source.tier) && !!source.platformId && approvedPlatforms.has(source.platformId)).map(x => x.id) : [];
  if (kind === 'digest' && channel === 'telegram') {
    const tokyoDay = (date: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    const sentToday = (await d.select({ payload: s.deliveries.payload, createdAt: s.deliveries.createdAt }).from(s.deliveries)
      .where(and(eq(s.deliveries.kind, 'digest'), eq(s.deliveries.channel, 'telegram'), eq(s.deliveries.status, 'sent')))
      .orderBy(desc(s.deliveries.createdAt)).limit(40)).filter(delivery => tokyoDay(new Date(delivery.createdAt)) === tokyoDay(now));
    const summaries = sentToday.map(delivery => delivery.payload as { pendingCount?: number; needsVerificationCount?: number; suggestAutoPublish?: string[] });
    if (pendingCount <= Math.max(0, ...summaries.map(summary => summary.pendingCount ?? 0))) pendingCount = 0;
    if (needsVerificationCount <= Math.max(0, ...summaries.map(summary => summary.needsVerificationCount ?? 0))) needsVerificationCount = 0;
    const alreadySuggested = new Set(summaries.flatMap(summary => summary.suggestAutoPublish ?? []));
    suggestAutoPublish = suggestAutoPublish.filter(id => !alreadySuggested.has(id));
  }
  const [lastCollect] = kind === 'digest' && channel === 'telegram'
    ? await d.select({ stats: s.runs.stats }).from(s.runs).where(eq(s.runs.kind, 'collect')).orderBy(desc(s.runs.startedAt)).limit(1) : [];
  const coverageDegraded = !!lastCollect?.stats?.coverageDegraded;
  const empty = !marks.length && (kind === 'urgent' || channel !== 'telegram' || (!pendingCount && !suggestAutoPublish.length && !needsVerificationCount && !coverageDegraded));
  return { kind, channel, items: out, marks, pendingCount, suggestAutoPublish, needsVerificationCount, coverageDegraded, empty, blockedCount: blocked.size };
}

/** 预览是纯读取，不能仅凭获取消息就把内容记为已发送。 */
admin.get('/notify', async c => {
  const channel = c.req.query('channel') === 'feishu' ? 'feishu' : 'telegram';
  const kind = c.req.query('kind') === 'urgent' ? 'urgent' : 'digest';
  return c.json(await buildNotice(c.env, kind, channel));
});

/** 原子占位避免并发重复；失败或结果不明时不会自动重发。Telegram（经 Hermes）与飞书（Worker 定时任务）共用。 */
export type ClaimedNotice = Awaited<ReturnType<typeof buildNotice>> & { deliveryId?: string; alreadyClaimed?: boolean };
export async function claimNotice(env: Env, kind: NoticeKind, channel: NoticeChannel): Promise<ClaimedNotice> {
  const notice = await buildNotice(env, kind, channel);
  if (notice.empty) return { ...notice, alreadyClaimed: notice.blockedCount > 0 };
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const content = notice.marks.length
    ? JSON.stringify({ kind: notice.kind, channel: notice.channel, marks: notice.marks })
    : JSON.stringify({ kind: notice.kind, channel: notice.channel, day, pendingCount: notice.pendingCount, suggestAutoPublish: notice.suggestAutoPublish, needsVerificationCount: notice.needsVerificationCount, coverageDegraded: notice.coverageDegraded });
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  const fingerprint = [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
  const id = crypto.randomUUID();
  const created = await db(env).insert(s.deliveries).values({ id, fingerprint, channel: notice.channel, kind: notice.kind, payload: notice })
    .onConflictDoNothing().returning({ id: s.deliveries.id });
  return created.length ? { ...notice, deliveryId: id } : { ...notice, empty: true, alreadyClaimed: true };
}
admin.post('/notify/claim', async c => {
  const parsed = z.object({ kind: z.enum(['digest', 'urgent']), channel: z.enum(['telegram', 'feishu']) }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: '发送参数不正确' }, 400);
  return c.json(await claimNotice(c.env, parsed.data.kind, parsed.data.channel));
});

async function recordDeliveredMarks(env: Env, delivery: typeof s.deliveries.$inferSelect) {
  const notice = delivery.payload as unknown as Awaited<ReturnType<typeof buildNotice>>;
  const d = db(env), nowIso = new Date().toISOString();
  for (const mark of notice.marks) {
    await d.insert(s.notifications).values({ offerId: mark.offerId, stage: mark.stage, channel: delivery.channel, status: 'sent', sentAt: nowIso, messageId: mark.messageId ?? null })
      .onConflictDoUpdate({ target: [s.notifications.offerId, s.notifications.stage, s.notifications.channel], set: { status: 'sent', sentAt: nowIso, messageId: mark.messageId ?? null } });
  }
}

/** 回报一次发送的结果：sent 才写入通知台账；unknown 留待人工核对，不自动重发。 */
export async function ackDelivery(env: Env, id: string, status: 'sent' | 'unknown', error?: string): Promise<{ ok: boolean; code?: number; error?: string; alreadyAcknowledged?: boolean; status?: string }> {
  const d = db(env);
  const [delivery] = await d.select().from(s.deliveries).where(eq(s.deliveries.id, id));
  if (!delivery) return { ok: false, code: 404, error: '没有这次发送' };
  if (delivery.status === 'sent') return { ok: true, alreadyAcknowledged: true };
  if (delivery.status === 'unknown' && status !== 'unknown') return { ok: false, code: 409, error: '结果不明的消息需要先人工核对' };
  if (status === 'sent') await recordDeliveredMarks(env, delivery);
  await d.update(s.deliveries).set({ status, error: error ?? null, updatedAt: new Date().toISOString() }).where(eq(s.deliveries.id, id));
  return { ok: true, status };
}
admin.post('/notify/:id/ack', async c => {
  const body = z.object({ status: z.enum(['sent', 'unknown']), error: z.string().max(500).optional() }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: '发送结果不正确' }, 400);
  const r = await ackDelivery(c.env, c.req.param('id'), body.data.status, body.data.error);
  return r.ok ? c.json(r) : c.json({ error: r.error }, (r.code ?? 400) as 404 | 409);
});

/** 结果不明的通知必须由管理员核对收件端后才能结案或释放重发。 */
admin.post('/notify/:id/resolve', async c => {
  const body = z.object({ outcome: z.enum(['delivered', 'not_delivered']), reason: z.string().min(4).max(500) })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: '需要人工核对结论及理由' }, 400);
  const d = db(c.env);
  const [delivery] = await d.select().from(s.deliveries).where(eq(s.deliveries.id, c.req.param('id')));
  if (!delivery || !['unknown', 'pending'].includes(delivery.status)) return c.json({ error: '没有需要核对的发送记录' }, 404);
  if (delivery.status === 'pending' && Date.now() - Date.parse(delivery.createdAt) < 10 * 60_000) return c.json({ error: '发送仍可能进行中，十分钟后再人工核对' }, 409);
  if (body.data.outcome === 'delivered') {
    await recordDeliveredMarks(c.env, delivery);
    await d.update(s.deliveries).set({ status: 'sent', error: `人工确认已送达：${body.data.reason}`, updatedAt: new Date().toISOString() }).where(eq(s.deliveries.id, delivery.id));
  } else {
    await d.update(s.deliveries).set({ status: 'released', fingerprint: `${delivery.fingerprint}:released:${delivery.id}`, error: `人工确认未送达：${body.data.reason}`, updatedAt: new Date().toISOString() }).where(eq(s.deliveries.id, delivery.id));
  }
  return c.json({ ok: true, outcome: body.data.outcome });
});

/** 抽取准确率：每个字段被人工修改的比例、拒绝理由分布、各信源原样通过率。 */
admin.get('/quality', async c => {
  const since = new Date(Date.now() - Number(c.req.query('days') ?? 30) * 86400_000).toISOString();
  const rv = await c.env.DB.prepare(`SELECT r.action, r.edited_fields, r.reason_code, o.source_id, o.first_channel FROM reviews r JOIN offers o ON o.id = r.offer_id WHERE r.at >= ?1 AND COALESCE(r.reviewer,'') <> 'system'`).bind(since).all<{ action: string; edited_fields: string; reason_code: string | null; source_id: string | null; first_channel: string | null }>();
  const rows = rv.results;
  const reviewed = rows.length;
  const fields: Record<string, number> = {}, reasons: Record<string, number> = {}, bySource: Record<string, { total: number; clean: number }> = {};
  for (const r of rows) {
    if (r.action === 'edit') for (const f of JSON.parse(r.edited_fields || '[]') as string[]) fields[f] = (fields[f] ?? 0) + 1;
    if (r.reason_code) reasons[r.reason_code] = (reasons[r.reason_code] ?? 0) + 1;
    const k = r.source_id ?? `线索:${r.first_channel ?? '?'}`;
    const b = (bySource[k] ??= { total: 0, clean: 0 }); b.total++; if (r.action === 'approve') b.clean++;
  }
  return c.json({ reviewed, approvedClean: rows.filter(r => r.action === 'approve').length, edits: rows.filter(r => r.action === 'edit').length, rejects: rows.filter(r => r.action === 'reject').length, fields, reasons, bySource });
});

/** 健康检查：最近一次成功采集距今多久、连续失败的信源、预算。 */
admin.get('/health', async c => {
  const d = db(c.env);
  const [lastOk] = await d.select().from(s.runs).where(and(eq(s.runs.kind, 'collect'), eq(s.runs.ok, true))).orderBy(desc(s.runs.finishedAt)).limit(1);
  const allSources = await d.select({ id: s.sources.id, failStreak: s.sources.failStreak, lastError: s.sources.lastError, lastOkAt: s.sources.lastOkAt,
    kind: s.sources.kind, url: s.sources.url, autoPublish: s.sources.autoPublish, cleanStreak: s.sources.cleanStreak, enabled: s.sources.enabled }).from(s.sources);
  const failing = allSources.filter(source => source.enabled && (source.failStreak >= 3 || !source.lastOkAt || Date.now() - Date.parse(source.lastOkAt) > 12 * 3600_000));
  const hours = lastOk?.finishedAt ? (Date.now() - Date.parse(lastOk.finishedAt)) / 3600_000 : null;
  const today = new Date().toISOString().slice(0, 10);
  const b = await c.env.DB.prepare("SELECT COALESCE(SUM(CASE WHEN substr(started_at,1,10)=?1 THEN tokens END),0) AS t, COALESCE(SUM(CASE WHEN substr(started_at,1,7)=?2 THEN cost_cny END),0) AS c FROM runs").bind(today, today.slice(0, 7)).first<{ t: number; c: number }>();
  const uncertainDeliveries = await d.select({ id: s.deliveries.id, kind: s.deliveries.kind, channel: s.deliveries.channel, status: s.deliveries.status, createdAt: s.deliveries.createdAt, error: s.deliveries.error })
    .from(s.deliveries).where(inArray(s.deliveries.status, ['unknown', 'pending']));
  const needsVerification = (await d.select().from(s.offers).where(eq(s.offers.reviewState, 'approved')))
    .filter(offer => liveStatus(offer) === 'stale').map(offer => ({ id: offer.id, title: offer.title, evidenceUrl: offer.evidence.url }));
  return c.json({ tokensToday: b?.t ?? 0, tokenCap: Number(c.env.DAILY_TOKEN_CAP ?? 0), costMonthCny: b?.c ?? 0, coverageDegraded: !!lastOk?.stats?.coverageDegraded, sources: allSources, lastSuccessfulCollect: lastOk?.finishedAt ?? null,
    hoursSince: hours, collectStale: hours === null || hours > 8, failingSources: failing, uncertainDeliveries, needsVerification });
});

export const offerIsClaimable = (o: OfferRow) => isClaimable(liveStatus(o));
