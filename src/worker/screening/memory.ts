import { liveStatus, type OfferType } from '../../shared/lifecycle';
import { actorKind } from '../../shared/screening/attribution';
import { reasonCategoryFromCode, type MemoryRecord, type ReasonCategory } from '../../shared/screening/types';

const recurring = /每月|每日|每周|monthly|daily|weekly|重置/i;

type OfferSql = {
  id: string; platform_id: string; title: string; value_text: string; type: string; claim_start: string | null; claim_end: string | null;
  end_kind: 'date' | 'unknown' | 'standing'; source_tz: string; review_state: 'pending' | 'approved' | 'rejected'; withdrawn_at: string | null;
  last_verified_at: string | null; tags: string; evidence: string; reviewer: string | null; reason_code: string | null; decided_at: string | null;
  label_category: string | null; label_actor: 'owner' | 'model' | 'unknown' | null;
};
type LeadSql = {
  id: number; origin: string; title: string | null; raw: string | null; status: 'linked' | 'rejected'; url_key: string | null; resolution: string | null;
  offer_id: string | null; created_at: string; label_category: string | null; label_actor: 'owner' | 'model' | 'unknown' | null;
};

function offerRecord(row: OfferSql): MemoryRecord {
  const evidence = JSON.parse(row.evidence) as { url?: string; excerpts?: { benefit?: string }; tier?: 'site' | 'docs' | 'official' | 'staff' | 'media' | 'tested' };
  const tags = JSON.parse(row.tags || '[]') as string[];
  const status = liveStatus({
    reviewState: row.review_state, type: row.type as OfferType, endKind: row.end_kind, claimStart: row.claim_start, claimEnd: row.claim_end,
    sourceTz: row.source_tz, withdrawnAt: row.withdrawn_at, lastVerifiedAt: row.last_verified_at, evidence,
  });
  const decision = status === 'ended' ? 'ended' : row.review_state;
  return {
    ref: `offer:${row.id}`, kind: 'offer', platformId: row.platform_id, origin: null, title: row.title, valueText: row.value_text, type: row.type,
    claimStart: row.claim_start, claimEnd: row.claim_end, sourceTz: row.source_tz, evidenceUrl: evidence.url ?? null, urlKey: null,
    benefitExcerpt: evidence.excerpts?.benefit ?? null, decision, linkedOfferId: null,
    reasonCategory: (row.label_category as ReasonCategory | null) ?? (row.reason_code ? reasonCategoryFromCode(row.reason_code) : null),
    actorKind: actorKind({ reviewer: row.reviewer, labelActorKind: row.label_actor }),
    recurring: tags.includes('reset') || recurring.test(`${row.title}\n${row.value_text}`),
    decidedAt: row.decided_at,
  };
}

function leadRecord(row: LeadSql): MemoryRecord {
  const resolution = row.resolution ? JSON.parse(row.resolution) as { reason?: string | null; checkedAt?: string | null } : null;
  return {
    ref: `lead:${row.id}`, kind: 'lead', platformId: null, origin: row.origin, title: row.title ?? '', valueText: null, type: null,
    claimStart: null, claimEnd: null, sourceTz: null, evidenceUrl: null, urlKey: row.url_key, benefitExcerpt: null,
    decision: row.status, linkedOfferId: row.offer_id, reasonCategory: (row.label_category as ReasonCategory | null) ?? null,
    actorKind: actorKind({ leadRaw: row.raw, leadResolution: resolution, labelActorKind: row.label_actor }),
    recurring: recurring.test(row.title ?? ''), decidedAt: resolution?.checkedAt ?? row.created_at,
  };
}

export async function buildMemoryPage(db: D1Database, cursor: string | null, limit: number): Promise<{ records: MemoryRecord[]; nextCursor: string | null }> {
  const phase = cursor?.startsWith('lead:') ? 'lead' : 'offer';
  const offerCursor = phase === 'offer' ? (cursor?.slice('offer:'.length) ?? '') : '\uffff';
  const leadCursor = phase === 'lead' ? Number(cursor!.slice('lead:'.length)) : 0;
  const records: MemoryRecord[] = [];
  if (phase === 'offer') {
    const offers = await db.prepare(`SELECT o.id, o.platform_id, o.title, o.value_text, o.type, o.claim_start, o.claim_end, o.end_kind, o.source_tz, o.review_state, o.withdrawn_at, o.last_verified_at, o.tags, o.evidence,
      (SELECT reviewer FROM reviews r WHERE r.offer_id=o.id ORDER BY r.id DESC LIMIT 1) reviewer,
      (SELECT reason_code FROM reviews r WHERE r.offer_id=o.id AND r.action='reject' ORDER BY r.id DESC LIMIT 1) reason_code,
      (SELECT at FROM reviews r WHERE r.offer_id=o.id ORDER BY r.id DESC LIMIT 1) decided_at,
      l.category label_category, l.actor_kind label_actor
      FROM offers o LEFT JOIN decision_labels l ON l.subject_kind='offer' AND l.subject_id=o.id
      WHERE o.id > ? ORDER BY o.id LIMIT ?`).bind(offerCursor, limit + 1).all<OfferSql>();
    const page = offers.results.slice(0, limit);
    records.push(...page.map(offerRecord));
    if (offers.results.length > limit) return { records, nextCursor: `offer:${page.at(-1)!.id}` };
  }
  const room = limit - records.length;
  const leads = await db.prepare(`SELECT l.id, l.origin, l.title, l.raw, l.status, l.url_key, l.resolution, l.offer_id, l.created_at, d.category label_category, d.actor_kind label_actor
    FROM leads l LEFT JOIN decision_labels d ON d.subject_kind='lead' AND d.subject_id=CAST(l.id AS TEXT)
    WHERE l.status IN ('linked','rejected') AND l.id > ? ORDER BY l.id LIMIT ?`).bind(leadCursor, room + 1).all<LeadSql>();
  const page = leads.results.slice(0, room);
  records.push(...page.map(leadRecord));
  return { records, nextCursor: leads.results.length > room ? `lead:${page.at(-1)!.id}` : null };
}
