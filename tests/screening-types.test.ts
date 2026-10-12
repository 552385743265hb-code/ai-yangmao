import { describe, expect, it } from 'vitest';
import { reasonCategoryFromCode, reasonCodeForCategory, screeningMode, screeningVerdictSchema } from '../src/shared/screening/types';

describe('screening contracts', () => {
  it('maps legacy reason codes and fits the review_decisions CHECK', () => {
    expect(reasonCategoryFromCode('not_ai')).toBe('non_ai');
    expect(reasonCategoryFromCode('vague')).toBe('unverifiable');
    expect(reasonCategoryFromCode('wrong_type')).toBe('other');
    expect(reasonCodeForCategory('relay_station')).toBe('other');
    expect(reasonCodeForCategory('unverifiable')).toBe('insufficient_evidence');
    expect(reasonCodeForCategory('non_ai')).toBe('not_ai');
  });
  it('rejects verdicts outside the contract', () => {
    expect(screeningVerdictSchema.safeParse({ verdict: 'approve' }).success).toBe(false);
    expect(screeningMode({})).toBe('off');
  });
});
