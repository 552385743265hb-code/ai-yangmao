import { createHash } from 'node:crypto';
import { findDuplicate, sameEvidenceBenefit, similarity } from '../../src/shared/dedupe';
import type { MemoryRecord, MemorySnapshot, PlatformProfile, ScreeningRule } from '../../src/shared/screening/types';
import type { UrgencyResult } from '../../src/shared/screening/types';

export type ScreeningSubject = {
  itemId: string;
  kind: 'lead' | 'candidate';
  leadId?: number;
  taskId?: string;
  candidateId?: string;
  origin: string | null;
  url: string;
  title: string;
  text: string;
  truncated: boolean;
  platformIds: string[];
  extracted?: Record<string, unknown>;
  discoveredAt: string;
  deterministicUrgency: UrgencyResult;
};

export type ScreeningContext = {
  records: MemoryRecord[];
  capped: boolean;
  crossPlatform: MemoryRecord[];
  precedents: MemoryRecord[];
  rules: ScreeningRule[];
  profile: PlatformProfile | null;
  policy: string;
  hints: { ref: string; similarity: number; sameEvidence: boolean }[];
};

export const SCREENING_POLICY = '只收官方发放的 AI 免费权益。不收中转站、号池、付费套餐自带权益和无法核实的转述。重复、过期和非 AI 内容应标出并引用给定记录。';

function score(subject: ScreeningSubject, record: MemoryRecord): number {
  return similarity(`${subject.title}\n${subject.text}`, `${record.title}\n${record.valueText ?? ''}\n${record.benefitExcerpt ?? ''}`);
}

export function buildScreeningContext(subject: ScreeningSubject, memory: MemorySnapshot, _platforms: { id: string; name: string }[]): ScreeningContext {
  const same = memory.records.filter(record => record.platformId != null && subject.platformIds.includes(record.platformId));
  const ranked = [...same].sort((a, b) => score(subject, b) - score(subject, a) || String(b.decidedAt ?? '').localeCompare(String(a.decidedAt ?? '')));
  const records = ranked.slice(0, 60);
  const crossPlatform = subject.platformIds.length ? [] : [...memory.records].sort((a, b) => score(subject, b) - score(subject, a)).slice(0, 20);
  const precedents = memory.records.filter(record => record.decision === 'rejected').sort((a, b) => score(subject, b) - score(subject, a)).slice(0, 15);
  const incoming = { platformId: subject.platformIds[0] ?? '', title: subject.title, valueText: '', evidenceUrl: subject.url, evidence: { url: subject.url, tier: 'media' as const, capturedAt: subject.discoveredAt, excerpts: {} } };
  const hints = records.map(record => {
    const candidate = { id: record.ref, platformId: record.platformId ?? '', title: record.title, valueText: record.valueText ?? '', evidenceUrl: record.evidenceUrl ?? '', reviewState: record.decision === 'approved' ? 'approved' : record.decision === 'pending' ? 'pending' : 'rejected' };
    return { ref: record.ref, similarity: score(subject, record), sameEvidence: sameEvidenceBenefit(incoming, candidate) || !!findDuplicate(incoming, [candidate]) };
  });
  return {
    records, capped: ranked.length > 60, crossPlatform, precedents,
    rules: memory.rules.filter(rule => rule.status === 'active'),
    profile: memory.profiles.find(profile => subject.platformIds.includes(profile.platformId)) ?? null,
    policy: SCREENING_POLICY,
    hints,
  };
}

export function contextHash(context: ScreeningContext, subject: ScreeningSubject, version: string): string {
  return createHash('sha256').update(JSON.stringify({ context, subject, version })).digest('hex');
}
