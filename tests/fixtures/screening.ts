import type { MemoryRecord, MemorySnapshot } from '../../src/shared/screening/types';

export function rec(ref: string, over: Partial<MemoryRecord> = {}): MemoryRecord {
  return {
    ref,
    kind: ref.startsWith('lead:') ? 'lead' : 'offer',
    platformId: null,
    origin: null,
    title: '',
    valueText: null,
    type: null,
    claimStart: null,
    claimEnd: null,
    sourceTz: null,
    evidenceUrl: null,
    urlKey: null,
    benefitExcerpt: null,
    decision: 'approved',
    linkedOfferId: null,
    reasonCategory: null,
    actorKind: 'unknown',
    recurring: false,
    decidedAt: null,
    ...over,
  };
}

export function snapshot(records: MemoryRecord[], extra: Partial<MemorySnapshot> = {}): MemorySnapshot {
  return { generatedAt: '2026-10-12T00:00:00.000Z', records, rules: [], profiles: [], calibrations: [], ...extra };
}
