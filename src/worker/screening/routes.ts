import { Hono } from 'hono';
import { z } from 'zod';
import { screeningMode, screeningVerdictSchema } from '../../shared/screening/types';
import { compareQueueOrder, latestUsefulReviewAt, systemDueAt } from '../../shared/screening/urgency';
import { buildMemoryPage } from './memory';
import { ScreeningStore } from './store';
import type { Env } from '../index';

export const screeningIngestRoutes = new Hono<{ Bindings: Env }>();

screeningIngestRoutes.get('/memory', async c => {
  const limit = Math.min(500, Math.max(1, Number(c.req.query('limit') ?? 500) || 500));
  const cursor = c.req.query('cursor') || null;
  const page = await buildMemoryPage(c.env.DB, cursor, limit);
  const first = !cursor;
  const rules = first ? (await c.env.DB.prepare(`SELECT id, kind, scope_kind scopeKind, scope_value scopeValue, category, description, pattern, status FROM screening_rules`).all()).results : [];
  const profiles = first ? (await c.env.DB.prepare(`SELECT profile_json FROM platform_profiles ORDER BY platform_id`).all<{ profile_json: string }>()).results.map(row => JSON.parse(row.profile_json)) : [];
  const calibrations = first ? (await c.env.DB.prepare(`SELECT model, close_threshold closeThreshold, new_threshold newThreshold, sample_size sampleSize, close_precision closePrecision, wrong_new_rate wrongNewRate, recurring_false_closes recurringFalseCloses, status FROM screening_calibrations`).all()).results : [];
  return c.json({ records: page.records, rules, profiles, calibrations, nextCursor: page.nextCursor });
});

const verdictBody = z.object({
  requestId: z.string().min(1),
  itemId: z.string().min(1),
  subject: z.object({
    kind: z.enum(['lead', 'task']), leadId: z.number().optional(), taskId: z.string().optional(), candidateId: z.string().optional(),
    platformId: z.string().nullable().optional(), origin: z.string().nullable().optional(), discoveredAt: z.string(),
  }),
  verdict: screeningVerdictSchema,
  model: z.string(), calibrated: z.boolean(), promptVersion: z.string(), contextHash: z.string(), downgradeReasons: z.array(z.string()).default([]),
});

screeningIngestRoutes.post('/verdicts', async c => {
  const body = verdictBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: 'invalid verdict' }, 400);
  const verdict = body.data.verdict;
  if (verdict.matchId) {
    const [kind, id] = verdict.matchId.split(':');
    const row = kind === 'offer'
      ? await c.env.DB.prepare('SELECT id FROM offers WHERE id=?').bind(id).first()
      : kind === 'lead' ? await c.env.DB.prepare('SELECT id FROM leads WHERE id=?').bind(Number(id)).first() : null;
    if (!row) return c.json({ error: 'unknown match' }, 400);
  }
  if (verdict.ruleId && !await c.env.DB.prepare(`SELECT id FROM screening_rules WHERE id=? AND status='active'`).bind(verdict.ruleId).first()) return c.json({ error: 'inactive rule' }, 400);
  const mode = screeningMode(c.env);
  const store = new ScreeningStore(c.env.DB);
  const existing = await store.getItem(body.data.itemId);
  const ownerTier = existing?.tierBy === 'owner';
  const tier = ownerTier ? existing!.tier : verdict.urgency.tier;
  const discoveredAt = existing?.discoveredAt ?? body.data.subject.discoveredAt;
  await store.upsertItem({
    subjectKind: body.data.subject.kind, subjectId: body.data.subject.kind === 'lead' ? String(body.data.subject.leadId ?? body.data.itemId.slice(5)) : String(body.data.subject.taskId ?? body.data.itemId.slice(5)),
    platformId: body.data.subject.platformId ?? null, origin: body.data.subject.origin ?? null,
    state: existing?.state ?? 'awaiting_screen', tier, deadline: ownerTier ? existing!.deadline : verdict.urgency.deadline,
    signals: verdict.urgency.signals, urgencyQuote: verdict.urgency.quote, tierBy: ownerTier ? 'owner' : 'screener',
    discoveredAt, dueAt: systemDueAt(tier, discoveredAt),
  });
  const decision = await store.recordDecision({
    requestId: body.data.requestId, itemId: body.data.itemId, verdict: verdict.verdict, matchRef: verdict.matchId, ruleId: verdict.ruleId,
    reasonCategory: verdict.reasonCategory, occurrenceCheck: verdict.occurrenceCheck, confidence: verdict.confidence, evidenceQuote: verdict.evidenceQuote,
    explanation: verdict.explanation, urgency: verdict.urgency, model: body.data.model, calibrated: body.data.calibrated, promptVersion: body.data.promptVersion,
    contextHash: body.data.contextHash, downgrade: body.data.downgradeReasons, mode: mode === 'off' ? 'shadow' : mode,
  });
  return c.json({ decisionId: decision.id, mode, applied: false });
});

screeningIngestRoutes.get('/queue', async c => {
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? 50) || 50));
  const ids = (c.req.query('ids') ?? '').split(',').map(id => id.trim()).filter(Boolean);
  const rows = await c.env.DB.prepare(`SELECT id, subject_kind, subject_id, tier, discovered_at, deadline FROM screening_items WHERE state='awaiting_screen'`).all<{ id: string; subject_kind: 'lead' | 'task'; subject_id: string; tier: 'P0' | 'P1' | 'P2' | 'P3'; discovered_at: string; deadline: string | null }>();
  const items = rows.results.filter(row => !ids.length || ids.includes(row.id)).map(row => ({
    itemId: row.id, subject: { kind: row.subject_kind, id: row.subject_id }, tier: row.tier, discoveredAt: row.discovered_at,
    latestUsefulReviewAt: latestUsefulReviewAt(row.deadline, row.tier),
  })).sort(compareQueueOrder).slice(0, limit).map(({ latestUsefulReviewAt: _review, ...item }) => item);
  return c.json({ items });
});

screeningIngestRoutes.post('/items/:id/escalate', async c => {
  const body = z.object({ requestId: z.string().min(1), suggestion: z.enum(['screening_unavailable', 'unverified', 'new_platform']), note: z.string().default('') }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: 'invalid escalation' }, 400);
  const prior = await c.env.DB.prepare('SELECT id FROM screening_decisions WHERE request_id=?').bind(body.data.requestId).first();
  if (prior) return c.json({ ok: true, duplicate: true });
  const store = new ScreeningStore(c.env.DB);
  const item = await store.getItem(c.req.param('id'));
  if (!item) return c.json({ error: 'missing item' }, 404);
  const moved = await store.setItemState(item.id, item.revision, { state: 'owner', suggestion: body.data.suggestion });
  if (!moved) return c.json({ error: 'stale item' }, 409);
  await store.recordDecision({
    requestId: body.data.requestId, itemId: item.id, verdict: 'unsure', confidence: 0, evidenceQuote: item.urgencyQuote ?? '', explanation: body.data.note || body.data.suggestion,
    urgency: { tier: item.tier, deadline: item.deadline, signals: item.signals, quote: item.urgencyQuote }, model: 'escalate', calibrated: false, promptVersion: 'screening-v1', contextHash: 'escalate', mode: 'shadow',
  });
  return c.json({ ok: true, duplicate: false });
});
