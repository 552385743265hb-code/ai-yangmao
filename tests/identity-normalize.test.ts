import { describe, expect, it } from 'vitest';
import { canonicalTermsSchema } from '../src/shared/identity/types';
import { normalizeTerms, hashTerms, normalizeDocumentUrl } from '../src/shared/identity/normalize';
import { terms, known, unknown } from './fixtures/identity/terms';

describe('canonical terms', () => {
  it('A01 decimal and NFKC normalize without touching evidence references or the input', async () => {
    const a = terms();
    a.benefitPools[0].amount = known({ value: ' ００１０.００ ', unit: ' currency ', currency: ' usd ' }, ['原文  Ａ']);
    expect(normalizeTerms(a).benefitPools[0].amount).toEqual(known({ value: '10', unit: 'currency', currency: 'USD' }, ['原文  Ａ']));
    expect(a.benefitPools[0].amount).toEqual(known({ value: ' ００１０.００ ', unit: ' currency ', currency: ' usd ' }, ['原文  Ａ']));
    expect(await hashTerms(a)).toBe(await hashTerms(terms()));
  });
  it('A01 hashes ignore provenance and set order but retain model versions', async () => {
    const a = terms(), b = terms();
    a.benefitPools[0].models = known(['model-v2', 'model-v1', 'model-v1']);
    b.benefitPools[0].models = known(['model-v1', 'model-v2'], ['another-source']);
    expect(await hashTerms(a)).toBe(await hashTerms(b));
    b.benefitPools[0].models = known(['model-v1']);
    expect(await hashTerms(a)).not.toBe(await hashTerms(b));
  });
  it('A02 calendar and rolling cadences and independent currencies/pools never collapse', async () => {
    const variants = [terms(), terms(), terms(), terms(), terms()];
    variants[0].benefitPools[0].cadence = known({ kind: 'calendar', unit: 'month', count: 1, timezone: 'UTC' });
    variants[1].benefitPools[0].cadence = known({ kind: 'rolling', seconds: 2592000 });
    variants[2].benefitPools[0].amount = known({ value: '10', unit: 'credits', currency: null });
    variants[3].benefitPools[0].amount = known({ value: '10', unit: 'tokens', currency: null });
    variants[4].benefitPools[0].amount = known({ value: '10', unit: 'currency', currency: null });
    expect(new Set(await Promise.all(variants.map(hashTerms))).size).toBe(5);
    expect(normalizeTerms(variants[4]).benefitPools[0].amount).toEqual(known({ value: '10', unit: 'currency', currency: null }));
  });
  it('A08 unknown is neither zero nor not applicable; omitted eligibility is not everyone', async () => {
    const a = terms(), b = terms(), c = terms();
    a.benefitPools[0].amount = unknown;
    b.benefitPools[0].amount = known({ value: '0', unit: 'currency', currency: 'USD' });
    c.benefitPools[0].amount = { state: 'not_applicable', evidenceRefs: ['quote-1'] };
    expect(new Set(await Promise.all([a,b,c].map(hashTerms))).size).toBe(3);
    expect(normalizeTerms(a).eligibility).toEqual(unknown);
  });
  it('rejects ungrounded facts, invented scope, invalid decimals and duplicate pools', () => {
    const a = terms(); a.issuerProductId = known('vendor', []);
    expect(canonicalTermsSchema.safeParse(a).success).toBe(false);
    const b = terms(); b.benefitPools[0].amount = known({ value: 'Infinity', unit: 'currency', currency: 'USD' });
    expect(() => normalizeTerms(b)).toThrow();
    const c = terms(); c.benefitPools.push(structuredClone(c.benefitPools[0]));
    expect(() => normalizeTerms(c)).toThrow();
    expect(canonicalTermsSchema.safeParse({ ...terms(), approve: true }).success).toBe(false);
  });
  it('A01 exact decimal normalization does not round large values', () => {
    const a = terms(); a.benefitPools[0].amount = known({ value: '99999999999999999999.12000', unit: 'currency', currency: 'USD' });
    expect(normalizeTerms(a).benefitPools[0].amount).toEqual(known({ value: '99999999999999999999.12', unit: 'currency', currency: 'USD' }));
  });
  it('A03 URL identity strips tracking only and preserves content parameters/fragments', () => {
    expect(normalizeDocumentUrl('https://twitter.com/vendor/status/1?utm_source=x&lang=zh&plan=pro#reward')).toBe('url-v1:https://x.com/vendor/status/1?lang=zh&plan=pro#reward');
    expect(normalizeDocumentUrl('https://vendor.example/?code=a')).not.toBe(normalizeDocumentUrl('https://vendor.example/?code=b'));
    expect(() => normalizeDocumentUrl('file:///etc/passwd')).toThrow();
  });
});
