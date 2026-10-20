import { expect, it } from 'vitest';
import { normalizeFactors, snapFactorQuotes } from '../pipeline/valuation-repair';

it('snaps a factor quote to the verbatim page span when only whitespace differs, and leaves off-page text alone', () => {
  const page = 'Good news:\n the free access continues.  By popular request,\nDeepSeek V4.1 Flash will remain free.';
  const out = snapFactorQuotes({ sources: [{ excerpt: 'the free access continues. By popular request, DeepSeek V4.1 Flash' }], amount: { quote: 'not on the page' } }, page) as any;
  expect(out.sources[0].excerpt).toBe('the free access continues.  By popular request,\nDeepSeek V4.1 Flash');
  expect(page.includes(out.sources[0].excerpt)).toBe(true);
  expect(out.amount.quote).toBe('not on the page');
});

it('lifts a single component-level coverageDays to the recipe, where the V2 schema expects it', () => {
  const out = normalizeFactors({ kind: 'scenario', components: [{ scenario: 'text', models: [], coverageDays: { value: 19, sourceId: 'benefit', quote: 'until October 31' } }], sources: [] }, 'free until October 31') as any;
  expect(out.coverageDays).toMatchObject({ value: 19 });
  expect(out.components[0]).not.toHaveProperty('coverageDays');
});
