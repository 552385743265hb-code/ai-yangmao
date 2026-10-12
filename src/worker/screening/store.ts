export type ItemState = 'awaiting_screen' | 'cleared' | 'awaiting_verify' | 'owner' | 'parked' | 'closed';
export type ItemTier = 'P0' | 'P1' | 'P2' | 'P3';

export type ItemRow = {
  id: string;
  subjectKind: 'lead' | 'task';
  subjectId: string;
  platformId: string | null;
  origin: string | null;
  state: ItemState;
  tier: ItemTier;
  deadline: string | null;
  signals: string[];
  urgencyQuote: string | null;
  tierBy: 'gate0' | 'screener' | 'owner';
  discoveredAt: string;
  dueAt: string;
  verifyUntil: string | null;
  parkExpiresAt: string | null;
  notifiedAt: string | null;
  renotifiedAt: string | null;
  notUrgentAt: string | null;
  suggestion: 'history' | 'possibly_real' | 'new_platform' | 'screening_unavailable' | 'unverified' | null;
  latestDecisionId: string | null;
  revision: number;
  updatedAt: string;
};

export type ItemUpsert = Partial<ItemRow> & Pick<ItemRow, 'subjectKind' | 'subjectId' | 'state' | 'tier' | 'tierBy' | 'discoveredAt' | 'dueAt'>;

export type DecisionInsert = {
  requestId: string;
  itemId: string;
  verdict: string;
  matchRef?: string | null;
  ruleId?: string | null;
  reasonCategory?: string | null;
  occurrenceCheck?: string | null;
  confidence: number;
  evidenceQuote: string;
  explanation: string;
  urgency: unknown;
  model: string;
  calibrated: boolean;
  promptVersion: string;
  contextHash: string;
  downgrade?: unknown;
  mode: 'shadow' | 'suggest' | 'auto';
};

type SqlRow = {
  id: string;
  subject_kind: ItemRow['subjectKind'];
  subject_id: string;
  platform_id: string | null;
  origin: string | null;
  state: ItemState;
  tier: ItemTier;
  deadline: string | null;
  signals_json: string;
  urgency_quote: string | null;
  tier_by: ItemRow['tierBy'];
  discovered_at: string;
  due_at: string;
  verify_until: string | null;
  park_expires_at: string | null;
  notified_at: string | null;
  renotified_at: string | null;
  not_urgent_at: string | null;
  suggestion: ItemRow['suggestion'];
  latest_decision_id: string | null;
  revision: number;
  updated_at: string;
};

export function itemId(kind: 'lead' | 'task', id: string | number): string {
  return `${kind}:${id}`;
}

function mapItem(row: SqlRow): ItemRow {
  return {
    id: row.id,
    subjectKind: row.subject_kind,
    subjectId: row.subject_id,
    platformId: row.platform_id,
    origin: row.origin,
    state: row.state,
    tier: row.tier,
    deadline: row.deadline,
    signals: JSON.parse(row.signals_json) as string[],
    urgencyQuote: row.urgency_quote,
    tierBy: row.tier_by,
    discoveredAt: row.discovered_at,
    dueAt: row.due_at,
    verifyUntil: row.verify_until,
    parkExpiresAt: row.park_expires_at,
    notifiedAt: row.notified_at,
    renotifiedAt: row.renotified_at,
    notUrgentAt: row.not_urgent_at,
    suggestion: row.suggestion,
    latestDecisionId: row.latest_decision_id,
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}

export class ScreeningStore {
  constructor(private readonly db: D1Database) {}

  async upsertItem(input: ItemUpsert): Promise<ItemRow> {
    const id = input.id ?? itemId(input.subjectKind, input.subjectId);
    const existing = await this.getItem(id);
    const now = new Date().toISOString();
    const row: ItemRow = {
      id,
      subjectKind: input.subjectKind,
      subjectId: String(input.subjectId),
      platformId: input.platformId ?? existing?.platformId ?? null,
      origin: input.origin ?? existing?.origin ?? null,
      state: input.state,
      tier: input.tier,
      deadline: input.deadline ?? existing?.deadline ?? null,
      signals: input.signals ?? existing?.signals ?? [],
      urgencyQuote: input.urgencyQuote ?? existing?.urgencyQuote ?? null,
      tierBy: input.tierBy,
      discoveredAt: input.discoveredAt,
      dueAt: input.dueAt,
      verifyUntil: input.verifyUntil ?? existing?.verifyUntil ?? null,
      parkExpiresAt: input.parkExpiresAt ?? existing?.parkExpiresAt ?? null,
      notifiedAt: input.notifiedAt ?? existing?.notifiedAt ?? null,
      renotifiedAt: input.renotifiedAt ?? existing?.renotifiedAt ?? null,
      notUrgentAt: input.notUrgentAt ?? existing?.notUrgentAt ?? null,
      suggestion: input.suggestion ?? existing?.suggestion ?? null,
      latestDecisionId: input.latestDecisionId ?? existing?.latestDecisionId ?? null,
      revision: existing?.revision ?? 0,
      updatedAt: now,
    };
    await this.db.prepare(`INSERT INTO screening_items(
      id, subject_kind, subject_id, platform_id, origin, state, tier, deadline, signals_json, urgency_quote, tier_by,
      discovered_at, due_at, verify_until, park_expires_at, notified_at, renotified_at, not_urgent_at, suggestion,
      latest_decision_id, revision, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(subject_kind, subject_id) DO UPDATE SET
      platform_id=excluded.platform_id, origin=excluded.origin, state=excluded.state, tier=excluded.tier,
      deadline=excluded.deadline, signals_json=excluded.signals_json, urgency_quote=excluded.urgency_quote,
      tier_by=excluded.tier_by, discovered_at=excluded.discovered_at, due_at=excluded.due_at,
      verify_until=excluded.verify_until, park_expires_at=excluded.park_expires_at, notified_at=excluded.notified_at,
      renotified_at=excluded.renotified_at, not_urgent_at=excluded.not_urgent_at, suggestion=excluded.suggestion,
      latest_decision_id=excluded.latest_decision_id, updated_at=excluded.updated_at`).bind(
      row.id, row.subjectKind, row.subjectId, row.platformId, row.origin, row.state, row.tier, row.deadline,
      JSON.stringify(row.signals), row.urgencyQuote, row.tierBy, row.discoveredAt, row.dueAt, row.verifyUntil,
      row.parkExpiresAt, row.notifiedAt, row.renotifiedAt, row.notUrgentAt, row.suggestion, row.latestDecisionId,
      row.revision, row.updatedAt,
    ).run();
    return (await this.getItem(id))!;
  }

  async getItem(id: string): Promise<ItemRow | null> {
    const row = await this.db.prepare('SELECT * FROM screening_items WHERE id=?').bind(id).first<SqlRow>();
    return row ? mapItem(row) : null;
  }

  async setItemState(id: string, expectedRevision: number, patch: Partial<ItemRow> & { state: ItemState }): Promise<boolean> {
    const current = await this.getItem(id);
    if (!current || current.revision !== expectedRevision) return false;
    const next: ItemRow = { ...current, ...patch, id, revision: current.revision + 1, updatedAt: new Date().toISOString() };
    const result = await this.db.prepare(`UPDATE screening_items SET
      platform_id=?, origin=?, state=?, tier=?, deadline=?, signals_json=?, urgency_quote=?, tier_by=?,
      discovered_at=?, due_at=?, verify_until=?, park_expires_at=?, notified_at=?, renotified_at=?, not_urgent_at=?,
      suggestion=?, latest_decision_id=?, revision=?, updated_at=?
      WHERE id=? AND revision=?`).bind(
      next.platformId, next.origin, next.state, next.tier, next.deadline, JSON.stringify(next.signals), next.urgencyQuote,
      next.tierBy, next.discoveredAt, next.dueAt, next.verifyUntil, next.parkExpiresAt, next.notifiedAt, next.renotifiedAt,
      next.notUrgentAt, next.suggestion, next.latestDecisionId, next.revision, next.updatedAt, id, expectedRevision,
    ).run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async recordDecision(input: DecisionInsert): Promise<{ id: string; duplicate: boolean }> {
    const existing = await this.db.prepare('SELECT id FROM screening_decisions WHERE request_id=?').bind(input.requestId).first<{ id: string }>();
    if (existing) return { id: existing.id, duplicate: true };
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`INSERT INTO screening_decisions(
      id, item_id, verdict, match_ref, rule_id, reason_category, occurrence_check, confidence, evidence_quote, explanation,
      urgency_json, model, calibrated, prompt_version, context_hash, downgrade_json, mode, request_id, created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      id, input.itemId, input.verdict, input.matchRef ?? null, input.ruleId ?? null, input.reasonCategory ?? null,
      input.occurrenceCheck ?? null, input.confidence, input.evidenceQuote, input.explanation, JSON.stringify(input.urgency),
      input.model, input.calibrated ? 1 : 0, input.promptVersion, input.contextHash, JSON.stringify(input.downgrade ?? []),
      input.mode, input.requestId, now,
    ).run();
    await this.db.prepare('UPDATE screening_items SET latest_decision_id=? WHERE id=?').bind(id, input.itemId).run();
    return { id, duplicate: false };
  }

  async markApplied(decisionId: string, action: string): Promise<void> {
    await this.db.prepare('UPDATE screening_decisions SET applied_action=?, applied_at=? WHERE id=? AND applied_at IS NULL')
      .bind(action, new Date().toISOString(), decisionId).run();
  }
}
