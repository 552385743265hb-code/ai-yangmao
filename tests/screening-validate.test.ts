import { describe, expect, it } from 'vitest';
import { validateVerdict, type VerdictContext } from '../src/shared/screening/validate';
import type { ScreeningVerdict } from '../src/shared/screening/types';
import { rec } from './fixtures/screening';

const none = { tier: 'P3' as const, deadline: null, signals: [], quote: null };
const v = (over: Partial<ScreeningVerdict>): ScreeningVerdict => ({
  verdict: 'new_candidate', matchId: null, ruleId: null, reasonCategory: null, occurrenceCheck: null, confidence: 0.5,
  evidenceQuote: 'hello', explanation: 'x', urgency: none, ...over,
});
const ctx = (over: Partial<VerdictContext> = {}): VerdictContext => ({
  subjectText: 'hello world', supplied: new Map(), crossPlatformRefs: new Set(), subjectPlatformIds: ['openai'],
  activeRuleIds: new Set(), subjectDates: {}, deterministicUrgency: none, ...over,
});

describe('verdict validation', () => {
  it('downgrades a schema failure', () => {
    expect(validateVerdict({ verdict: 'approve' }, ctx()).downgradeReasons).toEqual(['schema_invalid']);
  });
  it('downgrades an unknown match', () => {
    expect(validateVerdict(v({ verdict: 'duplicate_published', matchId: 'offer:missing' }), ctx()).downgradeReasons).toContain('unknown_match');
  });
  it('downgrades a cross-platform match that was not supplied as one', () => {
    const record = rec('offer:other', { platformId: 'other', decision: 'approved' });
    expect(validateVerdict(v({ verdict: 'duplicate_published', matchId: record.ref }), ctx({ supplied: new Map([[record.ref, record]]) })).downgradeReasons).toContain('platform_mismatch');
  });
  it('downgrades a quote that is not verbatim', () => {
    expect(validateVerdict(v({ evidenceQuote: 'not in the post' }), ctx()).downgradeReasons).toContain('quote_not_verbatim');
  });
  it('downgrades a new round of a recurring perk (Review Focus)', () => {
    const r = validateVerdict(v({ verdict: 'duplicate_published', matchId: 'offer:codex-reset-9', occurrenceCheck: '同一轮' }),
      ctx({ supplied: new Map([['offer:codex-reset-9', rec('offer:codex-reset-9', { recurring: true, claimStart: '2026-09-01', claimEnd: '2026-09-30', platformId: 'openai' })]]), subjectDates: { claimStart: '2026-10-12' } }));
    expect(r).toMatchObject({ verdict: { verdict: 'unsure' }, downgradeReasons: ['outside_matched_round'] });
  });
  it('refuses model-made rejections as precedents', () => {
    const r = validateVerdict(v({ verdict: 'duplicate_rejected', matchId: 'lead:5453' }), ctx({ supplied: new Map([['lead:5453', rec('lead:5453', { actorKind: 'model', decision: 'rejected' })]]) }));
    expect(r.downgradeReasons).toEqual(['non_authoritative_precedent']);
  });
  it('downgrades an inactive rule', () => {
    expect(validateVerdict(v({ verdict: 'rejected_by_rule', ruleId: 'old' }), ctx()).downgradeReasons).toContain('inactive_rule');
  });
  it('requires an occurrence check for a recurring match', () => {
    const record = rec('offer:r', { recurring: true, platformId: 'openai', claimStart: '2026-10-01', claimEnd: '2026-10-31' });
    expect(validateVerdict(v({ verdict: 'duplicate_published', matchId: record.ref }), ctx({ supplied: new Map([[record.ref, record]]) })).downgradeReasons).toContain('occurrence_check_missing');
  });
  it('falls back to deterministic urgency without a quote', () => {
    const r = validateVerdict(v({ verdict: 'new_candidate', urgency: { tier: 'P0', deadline: null, signals: ['same_day_one_time'], quote: '不存在的句子' } }), ctx({ deterministicUrgency: { tier: 'P3', deadline: null, signals: [], quote: null } }));
    expect(r.verdict).toMatchObject({ verdict: 'new_candidate', urgency: { tier: 'P3' } });
  });
});
