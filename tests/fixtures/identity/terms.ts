import type { CanonicalTermsV1, Fact } from '../../../src/shared/identity/types';
export const unknown = { state: 'unknown' } as const;
export const known = <T>(value: T, evidenceRefs = ['quote-1']): Fact<T> => ({ state: 'known', value, evidenceRefs });
export function terms(): CanonicalTermsV1 {
  return { schemaVersion: 'terms-v1', issuerProductId: known('vendor'), mechanism: known('signup_grant'),
    benefitPools: [{ poolKey: 'vendor:api', amount: known({ value: '10', unit: 'currency', currency: 'USD' }),
      cadence: known({ kind: 'once' }), models: known(['model-v1']), modalities: known(['text']), creditValidity: unknown }],
    eligibility: unknown, geography: unknown, claimChannels: unknown, costs: unknown, claimWindow: unknown, occurrenceAnchor: unknown };
}
