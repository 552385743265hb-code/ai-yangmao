import { REASON_CATEGORIES, reasonCategoryFromCode, reasonCodeForCategory, type ReasonCategory, type ReviewReasonCode } from '../../shared/screening/types';

const categories = new Set<string>(REASON_CATEGORIES);
const reviewCodes = new Set<string>(['duplicate', 'paid_bundle', 'ordinary_discount', 'not_ai', 'insufficient_evidence', 'vague', 'expired', 'wrong_platform', 'other']);

export function ownerRejectInput(body: { reasonCategory?: unknown; reasonCode?: unknown }): { category: ReasonCategory; code: ReviewReasonCode } | null {
  if (typeof body.reasonCategory === 'string' && categories.has(body.reasonCategory)) {
    const category = body.reasonCategory as ReasonCategory;
    return { category, code: reasonCodeForCategory(category) };
  }
  if (typeof body.reasonCode === 'string' && body.reasonCode) {
    const category = reasonCategoryFromCode(body.reasonCode);
    const code = (reviewCodes.has(body.reasonCode) ? body.reasonCode : reasonCodeForCategory(category)) as ReviewReasonCode;
    return { category, code };
  }
  return null;
}

export async function recordOwnerLabel(db: D1Database, l: { subjectKind: 'lead' | 'offer' | 'candidate'; subjectId: string; category: ReasonCategory; actor: string; justification?: string }): Promise<void> {
  await db.prepare(`INSERT INTO decision_labels(subject_kind, subject_id, category, actor_kind, label_source, justification, labeled_at)
    VALUES (?, ?, ?, 'owner', 'owner', ?, ?)
    ON CONFLICT(subject_kind, subject_id) DO UPDATE SET
      category=excluded.category, actor_kind='owner', label_source='owner', justification=excluded.justification, labeled_at=excluded.labeled_at`)
    .bind(l.subjectKind, l.subjectId, l.category, l.justification ?? null, new Date().toISOString()).run();
}
