import { describe, expect, it } from 'vitest';
import { calculateValuationV2, canonicalNumericText, deriveEcbValuationFx } from '../src/shared/valuation-engine';
import { getValuationFactCatalog } from '../src/shared/valuation-catalog';
import { parseValuation } from '../src/shared/valuation';

const excerpt = 'USD 20 gift. Plus USD 20 per month; USD 120 per year. 7 day trial. Package 100 credits for USD 10, gift 50 credits. Input USD 2 and output USD 4 per million tokens. USD 1000 maximum. 300000 input and 60000 output quota. 1 day, 2 models, 3 models, 4 models, 8 models. 100 images at USD 0.1 each. 600 seconds at USD 0.2 each. Multiplier 30, fraction 1/4. 12 months. 15 credits per day. Zero USD 0. CNY 118 per month. Images and video have independent quota pools. actual: Input USD 2 and output USD 4 per million tokens. priced: Input USD 2 and output USD 4 per million tokens. reference: Input USD 2 and output USD 4 per million tokens. free: Input USD 0 and output USD 0 per million tokens. img: USD 0.1 per image. vid: USD 0.2 per second. actual-video: USD 0.2 per second.';
const source = { id: 'official', url: 'https://example.com/pricing', checkedAt: '2026-10-11', excerpt, priceBasis: 'Official price and entitlement' };
const context = { now: '2026-10-11T12:00:00Z', sourceTexts: { official: excerpt } };
const fact = (value: number) => ({ value, sourceId: 'official', quote: excerpt });
const calculate = (factors: Record<string, unknown>, ctx: unknown = context) => calculateValuationV2({ sources: [source], ...factors }, ctx as any);
const model = (id: string, input: number, output: number) => { const quote = `${id}: Input USD ${id === 'free' ? 0 : 2} and output USD ${id === 'free' ? 0 : 4} per million tokens.`; return { id, inputPerMillion: { ...fact(input), quote }, outputPerMillion: { ...fact(output), quote } }; };
const catalogFact = (value: unknown, priceId: string, purpose: string, kind = 'price') => ({ value, priceId, purpose, kind, currency: 'USD', platformId: 'test', model: priceId, specification: 'test token spec', source: { url: source.url, checkedAt: source.checkedAt, excerpt, priceBasis: 'Trusted matched model price' } });

describe('V2 source-grounded program calculations', () => {
  it('canonicalizes explicit quantity magnitudes without changing model names', () => {
    expect(canonicalNumericText('SWE-2 M3 10万积分 2000万 Token 1M Token 2K credits 3B tokens 1亿积分 2百万积分')).toBe('SWE-2 M3 100000积分 20000000 Token 1000000 Token 2000 credits 3000000000 tokens 100000000积分 2000000积分');
    expect(canonicalNumericText('1MToken 2Kcredits')).toBe('1000000 Token 2000 credits');
  });
  it('prices canonical Chinese credit magnitudes and does not accept the unscaled numeral', () => {
    const quote = '免费获赠10万积分。购买包包含10万积分，售价USD 20。';
    const ctx = { ...context, sourceTexts: { official: quote } };
    const factors = { kind: 'credits', sources: [{ ...source, excerpt: quote }], entitlementUnits: { value: 100000, sourceId: 'official', quote: '免费获赠10万积分。' }, packageUnits: { value: 100000, sourceId: 'official', quote: '购买包包含10万积分，售价USD 20。' }, packagePrice: { value: 20, sourceId: 'official', quote: '购买包包含10万积分，售价USD 20。' } };
    expect(calculateValuationV2(factors, ctx).valuation?.usdEstimate).toBe(20);
    expect(calculateValuationV2({ ...factors, entitlementUnits: { ...factors.entitlementUnits, value: 10 } }, ctx).valuation).toBeNull();
    expect(calculateValuationV2({ ...factors, entitlementUnits: { ...factors.entitlementUnits, quote: factors.packageUnits.quote } }, ctx).valuation).toBeNull();
  });
  it('binds canonical token quotas and a 1M original billing divisor', () => {
    const quote = 'actual: input USD 2 and output USD 4 per 1M Token. Free quota 2000万 Token.';
    const ctx = { ...context, sourceTexts: { official: quote } };
    const factors = { kind: 'scenario', sources: [{ ...source, excerpt: quote }], components: [{ scenario: 'text', caps: { totalTokens: { value: 20000000, sourceId: 'official', quote: 'Free quota 2000万 Token.' } }, models: [{ id: 'actual', inputPrice: { value: 2, sourceId: 'official', quote: 'actual: input USD 2 and output USD 4 per 1M Token.' }, outputPrice: { value: 4, sourceId: 'official', quote: 'actual: input USD 2 and output USD 4 per 1M Token.' }, tokenPriceUnits: { value: 1000000, sourceId: 'official', quote: 'actual: input USD 2 and output USD 4 per 1M Token.' } }] }] };
    expect(calculateValuationV2(factors, ctx).valuation?.usdEstimate).toBe(2.8);
  });
  it('calculates daily raw credits over the comparison window and caps the monthly entitlement', () => {
    const quote = 'Receive 5 credits daily. Monthly cap 30 credits.';
    const ctx = { ...context, sourceTexts: { official: quote }, catalog: getValuationFactCatalog(context.now) };
    const factors = { kind: 'credits', cadence: 'day', sources: [{ ...source, excerpt: quote }], entitlementUnits: { value: 5, sourceId: 'official', quote: 'Receive 5 credits daily.' }, monthlyCap: { value: 30, sourceId: 'official', quote: 'Monthly cap 30 credits.' }, packageUnits: { catalogId: 'lovable-pro-build.packageUnits' }, packagePrice: { catalogId: 'lovable-pro-build.amount' }, benchmark: 'entry_plan' };
    expect(calculateValuationV2(factors, ctx).valuation).toMatchObject({ usdEstimate: 7.5, period: 'monthly', fullValue: null, inputs: { entitlementUnits: 30, dailyQuantity: 5, monthlyQuantity: 30 } });
  });
  it('retains a standing monthly gift without scaling it as continuous daily usage', () => {
    const quote = 'Receive 10000 credits each month.';
    const ctx = { ...context, sourceTexts: { official: quote }, catalog: getValuationFactCatalog(context.now) };
    const factors = { kind: 'credits', cadence: 'month', sources: [{ ...source, excerpt: quote }], entitlementUnits: { value: 10000, sourceId: 'official', quote }, packageUnits: { catalogId: 'elevenlabs-starter.packageUnits' }, packagePrice: { catalogId: 'elevenlabs-starter.amount' } };
    expect(calculateValuationV2(factors, ctx).valuation).toMatchObject({ usdEstimate: 2, period: 'monthly', inputs: { entitlementUnits: 10000 } });
  });
  it('accepts comma-formatted monthly entitlement and correctly calculates Starter reference cost', () => {
    for (const quote of ['Free users receive 10,000 credits every month.', '每月获赠 10,000 credits。']) {
      const ctx = { ...context, sourceTexts: { official: quote }, catalog: getValuationFactCatalog(context.now) };
      const factors = { kind: 'credits', cadence: 'month', sources: [{ ...source, excerpt: quote }], entitlementUnits: { value: 10000, sourceId: 'official', quote }, packageUnits: { catalogId: 'elevenlabs-starter.packageUnits' }, packagePrice: { catalogId: 'elevenlabs-starter.amount' }, benchmark: 'entry_plan' };
      expect(calculateValuationV2(factors, ctx).valuation).toMatchObject({ usdEstimate: 2, period: 'monthly' });
    }
  });
  it('accepts exact trailing decimal zeros while preserving credit ledger roles', () => {
    const quote = 'Gift 20.00 credits. Package includes 100.00 credits for USD 10.00.';
    const ctx = { ...context, sourceTexts: { official: quote } };
    const factors = { kind: 'credits', sources: [{ ...source, excerpt: quote }], entitlementUnits: { value: 20, sourceId: 'official', quote }, packageUnits: { value: 100, sourceId: 'official', quote }, packagePrice: { value: 10, sourceId: 'official', quote } };
    expect(calculateValuationV2(factors, ctx).valuation?.usdEstimate).toBe(2);
    expect(calculateValuationV2({ ...factors, entitlementUnits: { value: 100, sourceId: 'official', quote } }, ctx).valuation).toBeNull();
  });
  it('requires source evidence for recurring cadence and a monthly USD face value', () => {
    expect(calculate({ kind: 'credits', cadence: 'day', entitlementUnits: { ...fact(50), quote: 'gift 50 credits' }, packageUnits: fact(100), packagePrice: fact(10) }).valuation).toBeNull();
    expect(calculate({ kind: 'direct_usd', period: 'monthly', amount: { ...fact(20), quote: 'USD 20 gift.' } }).valuation).toBeNull();
  });
  it('never treats a catalog CNY plan price as USD when extraction omits currency', () => {
    const catalog = getValuationFactCatalog(context.now);
    expect(calculate({ kind: 'plan', price: { catalogId: 'glm-coding-lite.amount' }, billingPeriod: 'month' }, { ...context, catalog }).valuation).toBeNull();
  });
  it('rejects catalog token currency, purpose, model and grouped-price mismatches', () => {
    const factors = { kind: 'scenario', components: [{ scenario: 'text', models: [{ id: 'actual', inputPrice: { catalogId: 'in' }, outputPrice: { catalogId: 'out' }, tokenPriceUnits: { catalogId: 'units' } }] }] };
    const catalog = { in: catalogFact(2, 'actual', 'inputPrice'), out: catalogFact(4, 'actual', 'outputPrice'), units: catalogFact(1000, 'actual', 'tokenPriceUnits', 'units') };
    for (const bad of [{ ...catalog.in, currency: 'CNY' }, { ...catalog.in, kind: 'units', purpose: 'tokenPriceUnits' }, { ...catalog.in, model: 'Model B', priceId: 'different' }, { ...catalog.in, purpose: 'outputPrice' }, { value: 2, source: source }]) {
      expect(calculate(factors, { ...context, catalog: { ...catalog, in: bad } }).valuation).toBeNull();
    }
    expect(calculate({ kind: 'plan', price: { catalogId: 'units' }, billingPeriod: 'month' }, { ...context, catalog }).valuation).toBeNull();
  });
  it('does not turn purchased package units into gifted quota or trial duration', () => {
    const catalog = getValuationFactCatalog(context.now);
    for (const factors of [
      { kind: 'credits', entitlementUnits: { catalogId: 'elevenlabs-starter.packageUnits' }, packageUnits: { catalogId: 'elevenlabs-starter.packageUnits' }, packagePrice: { catalogId: 'elevenlabs-starter.amount' } },
      { kind: 'plan', price: fact(20), billingPeriod: 'month', coverageDays: { catalogId: 'elevenlabs-starter.packageUnits' } },
      { kind: 'plan', price: fact(20), billingPeriod: 'month', months: { catalogId: 'elevenlabs-starter.packageUnits' } },
    ]) expect(calculate(factors, { ...context, catalog }).valuation).toBeNull();
  });
  it('does not bind Model B prices to a free Model A on the same source page', () => {
    const quote = 'Model A is free. Model B: input USD 100 and output USD 200 per million tokens.';
    const ctx = { ...context, sourceTexts: { official: quote } };
    const factors = { kind: 'scenario', sources: [{ ...source, excerpt: quote }], components: [{ scenario: 'text', models: [{ id: 'Model A', inputPerMillion: { value: 100, sourceId: 'official', quote }, outputPerMillion: { value: 200, sourceId: 'official', quote } }] }] };
    expect(calculateValuationV2(factors, ctx).valuation).toBeNull();
  });
  it('rejects stale inline FX and old catalog FX quote dates', () => {
    const quote = 'Exchange rate 0.14 USD per CNY on 2020-01-01.';
    const ctx = { ...context, sourceTexts: { ...context.sourceTexts, oldfx: quote } };
    const factors = { kind: 'plan', sources: [source, { ...source, id: 'oldfx', checkedAt: '2020-01-01', excerpt: quote }], currency: 'CNY', price: fact(118), billingPeriod: 'month', fx: { currency: 'CNY', date: '2020-01-01', usdRate: { value: 0.14, sourceId: 'oldfx', quote } } };
    expect(calculateValuationV2(factors, ctx).valuation).toBeNull();
  });
  it('requires the unit-model billing modality and explicit bundle divisor', () => {
    for (const quote of ['ModelA USD 0.1 per 1000 images.', 'ModelA USD 0.1 per second.']) {
      const ctx = { ...context, sourceTexts: { official: quote } };
      const factors = { kind: 'scenario', sources: [{ ...source, excerpt: quote }], components: [{ scenario: 'image', models: [{ id: 'ModelA', unitPrice: { value: 0.1, sourceId: 'official', quote } }] }] };
      expect(calculateValuationV2(factors, ctx).valuation).toBeNull();
    }
  });
  it('does not bind a Pro price to a free Plus plan on the same page', () => {
    const quote = 'Free ChatGPT Plus membership. ChatGPT Pro USD 100 per month.';
    const ctx = { ...context, sourceTexts: { official: quote } };
    const factors = { kind: 'plan', sources: [{ ...source, excerpt: quote }], price: { value: 100, sourceId: 'official', quote }, billingPeriod: 'month', referencePlan: 'ChatGPT Plus' };
    expect(calculateValuationV2(factors, ctx).valuation).toBeNull();
  });
  it('requires explicit 30-day release evidence and bounds it by the application maximum', () => {
    const quote = 'Campaign 2026 grants up to USD 1000. First 30 days release maximum USD 1200.';
    const ctx = { ...context, sourceTexts: { official: quote } };
    const base = { kind: 'apply', sources: [{ ...source, excerpt: quote }], maximum: { value: 1000, sourceId: 'official', quote } };
    for (const value of [2026, 1200]) expect(calculateValuationV2({ ...base, first30Maximum: { value, sourceId: 'official', quote } }, ctx).valuation).toBeNull();
  });
  it('derives current FX from official raw ECB currency rows without accepting model ratios', () => {
    const xml = '<gesmes:Envelope><Cube><Cube time="2026-10-09"><Cube currency="USD" rate="1.1"/><Cube currency="CNY" rate="7.4"/><Cube currency="INR" rate="105"/></Cube></Cube></gesmes:Envelope>';
    const result = deriveEcbValuationFx(xml, context.now);
    expect(result?.catalog['ecb-2026-10-09.CNY'].value).toBeCloseTo(1.1 / 7.4, 12);
    expect(result?.catalog['ecb-2026-10-09.INR'].source.checkedAt).toBe(context.now);
    expect(deriveEcbValuationFx(xml, '2026-10-20T12:00:00Z')).toBeNull();
    expect(deriveEcbValuationFx(xml.replace('rate="7.4"', 'rate="0"'), context.now)).toBeNull();
  });
  it('retains a fixed USD gift during a seven-day window', () => {
    const result = calculate({ kind: 'direct_usd', amount: fact(20), coverageDays: fact(7) });
    expect(result.valuation).toMatchObject({ version: 'v2', usdEstimate: 20, method: 'face_value', inputs: { calculationEngine: 'v2-auto' }, reviewedAt: context.now });
    expect(parseValuation(result.valuation)).not.toBeNull();
  });
  it('ignores model-calculated amount fields and calculates annual price with full value', () => {
    const result = calculate({ kind: 'plan', price: fact(120), billingPeriod: 'year', usdEstimate: 9999 });
    expect(result.valuation).toMatchObject({ usdEstimate: 10, fullValue: 120 });
  });
  it('keeps authorized plan fractions distinct from seven-day scaling', () => {
    const result = calculate({ kind: 'plan', price: fact(20), billingPeriod: 'month', denominator: { ruleId: 'plan_fraction_quarter' }, benchmark: 'plan_fraction', coverageDays: fact(7), referencePlan: 'Plus' });
    expect(result.valuation).toMatchObject({ usdEstimate: 5, status: 'provisional', inputs: { benchmarkType: 'plan_fraction' } });
  });
  it('uses a controlled quarter-plan policy without fabricating an official quote', () => {
    const result = calculate({ kind: 'plan', price: fact(20), billingPeriod: 'month', denominator: { ruleId: 'plan_fraction_quarter' }, benchmark: 'plan_fraction', referencePlan: 'Plus' });
    expect(result.valuation).toMatchObject({ usdEstimate: 5, status: 'provisional', inputs: { ruleIds: ['plan_fraction_quarter'] } });
    expect(result.valuation?.sources).toHaveLength(1);
    expect(calculate({ kind: 'plan', price: { ruleId: 'plan_fraction_quarter' }, billingPeriod: 'month' }).valuation).toBeNull();
  });
  it('computes actual credit entitlement and never assumes a whole paid plan was gifted', () => {
    expect(calculate({ kind: 'credits', entitlementUnits: fact(50), packageUnits: fact(100), packagePrice: fact(10) }).valuation).toMatchObject({ usdEstimate: 5, fullValue: 5 });
  });
  it('refuses a package quantity or year misbound as gifted credits', () => {
    expect(calculate({ kind: 'credits', entitlementUnits: fact(100), packageUnits: fact(100), packagePrice: fact(10) }).valuation).toBeNull();
    expect(calculate({ kind: 'credits', entitlementUnits: fact(50), packageUnits: fact(120), packagePrice: fact(10) }).valuation).toBeNull();
  });
  it('does not let model-generated numbers impersonate a source-backed price', () => {
    const result = calculate({ kind: 'direct_usd', amount: fact(9999) });
    expect(result.valuation).toBeNull();
    expect(result.errors.join(' ')).toMatch(/source|来源/i);
  });
  it('rejects an excerpt that is absent from the fetched page', () => {
    expect(calculate({ kind: 'direct_usd', amount: fact(20) }, { ...context, sourceTexts: { official: 'unrelated page' } }).valuation).toBeNull();
  });
  it('rejects unbound literal sources and hallucinated catalog facts', () => {
    expect(calculate({ kind: 'direct_usd', amount: fact(20) }, { now: context.now }).valuation).toBeNull();
    expect(calculate({ kind: 'direct_usd', amount: { catalogId: 'invented' } }).valuation).toBeNull();
  });
  it('uses trusted catalog FX with its genuine quote date', () => {
    const ctx = { ...context, catalog: { 'ecb.CNY': { value: 0.14942927245572862, kind: 'fx', currency: 'CNY', priceId: 'ecb-2026-10-09', platformId: 'ecb', specification: 'USD/CNY', source: { url: 'https://www.ecb.europa.eu/rates', checkedAt: '2026-10-09', excerpt: 'CNY USD rate snapshot', priceBasis: 'ECB FX snapshot' } } } };
    const result = calculate({ kind: 'plan', price: fact(118), currency: 'CNY', billingPeriod: 'month', fx: { currency: 'CNY', usdRate: { catalogId: 'ecb.CNY' }, date: '2026-10-09' } }, ctx);
    expect(result.valuation?.usdEstimate).toBe(17.632654);
    expect(result.valuation?.inputs.fxDate).toBe('2026-10-09');
    expect(result.valuation?.sources).toHaveLength(2);
  });
  it('scales standard text workload to a short window and applies real token caps', () => {
    const result = calculate({ kind: 'scenario', coverageDays: fact(7), components: [{ scenario: 'text', models: [model('actual', 2, 4)], caps: { inputTokens: fact(300000), outputTokens: fact(60000) } }] });
    expect(result.valuation?.usdEstimate).toBe(0.653333);
  });
  it('scales a one-day video trial rather than claiming full monthly usage', () => {
    expect(calculate({ kind: 'scenario', coverageDays: fact(1), components: [{ scenario: 'video', models: [{ id: 'actual-video', unitPrice: fact(0.2) }] }] }).valuation?.usdEstimate).toBe(4);
  });
  it('uses lower-middle same-purpose model cost and excludes duplicate aliases', () => {
    const catalog = Object.fromEntries([['a', 1], ['b', 2], ['c', 3], ['d', 4]].flatMap(([id, value]) => [[`${id}.in`, catalogFact(value, String(id), 'inputPrice')], [`${id}.out`, catalogFact(value, String(id), 'outputPrice')], [`${id}.units`, catalogFact(1000000, String(id), 'tokenPriceUnits', 'units')]]));
    const models = ['a', 'b', 'c', 'd', 'alias'].map(id => { const canonicalId = id === 'alias' ? 'd' : id; return { id, canonicalId, inputPrice: { catalogId: `${canonicalId}.in` }, outputPrice: { catalogId: `${canonicalId}.out` }, tokenPriceUnits: { catalogId: `${canonicalId}.units` } }; });
    const result = calculate({ kind: 'scenario', components: [{ scenario: 'text', models }] }, { ...context, catalog });
    expect(result.valuation?.usdEstimate).toBe(2.4);
    expect(result.valuation?.coverage).toMatchObject({ pricedModels: 4, totalModels: 4 });
  });
  it('reports missing model price as partial coverage, never a zero-priced model', () => {
    const result = calculate({ kind: 'scenario', components: [{ scenario: 'text', models: [model('priced', 2, 4), { id: 'unknown' }] }] });
    expect(result.valuation).toMatchObject({ usdEstimate: 2.8, status: 'provisional', coverage: { pricedModels: 1, totalModels: 2 } });
  });
  it('preserves the original per-thousand token billing divisor', () => {
    const ctx = { ...context, catalog: { in: catalogFact(2, 'actual', 'inputPrice'), out: catalogFact(4, 'actual', 'outputPrice'), units: catalogFact(1000, 'actual', 'tokenPriceUnits', 'units') } };
    expect(calculate({ kind: 'scenario', components: [{ scenario: 'text', models: [{ id: 'actual', inputPrice: { catalogId: 'in' }, outputPrice: { catalogId: 'out' }, tokenPriceUnits: { catalogId: 'units' } }] }] }, ctx).valuation?.usdEstimate).toBe(2800);
  });
  it('does not add image and video costs against the same pool', () => {
    const result = calculate({ kind: 'scenario', components: [{ scenario: 'image', poolId: 'shared', models: [{ id: 'img', unitPrice: fact(0.1) }] }, { scenario: 'video', poolId: 'shared', models: [{ id: 'vid', unitPrice: fact(0.2) }] }] });
    expect(result.valuation?.usdEstimate).toBe(10);
  });
  it('sums independent modality pools and caps a daily quota', () => {
    const poolBasis = { sourceId: 'official', quote: 'Images and video have independent quota pools.' };
    const result = calculate({ kind: 'scenario', independentPools: true, components: [{ scenario: 'image', poolId: 'images', poolBasis, models: [{ id: 'img', unitPrice: fact(0.1) }] }, { scenario: 'video', poolId: 'video', poolBasis, models: [{ id: 'vid', unitPrice: fact(0.2) }], caps: { dailyQuantity: fact(15) } }] });
    expect(result.valuation?.usdEstimate).toBe(100);
  });
  it('keeps substitute-model application costs separate from real maximum', () => {
    const result = calculate({ kind: 'apply', scenario: { kind: 'scenario', benchmark: 'substitute_model', referenceModel: 'reference', components: [{ scenario: 'text', models: [model('reference', 2, 4)] }] } });
    expect(result.valuation).toMatchObject({ period: 'apply_max', usdEstimate: 2.8, usdMax: null, fullValue: null, status: 'provisional', inputs: { first30Max: null, fullApplyMax: null, benchmarkType: 'substitute_model' } });
    expect(parseValuation(result.valuation)).not.toBeNull();
  });
  it('stores real application maximum without fabricating a guaranteed amount', () => {
    expect(calculate({ kind: 'apply', maximum: fact(1000) }).valuation).toMatchObject({ usdEstimate: null, usdMax: 1000, fullValue: 1000, period: 'apply_max' });
  });
  it('does not discard a real application maximum when a cost benchmark is also supplied', () => {
    const result = calculate({ kind: 'apply', maximum: fact(1000), scenario: { kind: 'scenario', benchmark: 'substitute_model', components: [{ scenario: 'text', models: [model('reference', 2, 4)] }] } });
    expect(result.valuation).toMatchObject({ usdEstimate: null, usdMax: 1000, fullValue: 1000, inputs: { usageCostReference: 2.8 } });
    expect(parseValuation(result.valuation)).not.toBeNull();
  });
  it('does not label a plan price benchmark as a complete guaranteed benefit', () => {
    expect(calculate({ kind: 'plan', price: fact(20), billingPeriod: 'month', benchmark: 'entry_plan' }).valuation).toMatchObject({ fullValue: null, usdMax: null });
    expect(calculate({ kind: 'credits', entitlementUnits: fact(50), packageUnits: fact(100), packagePrice: fact(10), benchmark: 'entry_plan' }).valuation).toMatchObject({ fullValue: null });
  });
  it('does not turn arbitrary pool names into evidence of independent quotas', () => {
    const result = calculate({ kind: 'scenario', independentPools: true, components: [{ scenario: 'image', poolId: 'images', models: [{ id: 'img', unitPrice: fact(0.1) }] }, { scenario: 'video', poolId: 'videos', models: [{ id: 'vid', unitPrice: fact(0.2) }] }] });
    expect(result.valuation?.usdEstimate).toBe(10);
  });
  it('rejects a 30-day source number used as an arbitrary medical usage multiplier', () => {
    expect(calculate({ kind: 'scenario', usageMultiplier: fact(30), components: [{ scenario: 'text', models: [model('actual', 2, 4)] }] }).valuation).toBeNull();
  });
  it('scopes the medical workload rule to server-authorized Baichuan grants', () => {
    const factors = { kind: 'scenario', usageMultiplier: { ruleId: 'baichuan_medical_usage_30' }, components: [{ scenario: 'text', models: [model('actual', 2, 4)] }] };
    expect(calculate(factors).valuation).toBeNull();
    expect(calculate(factors, { ...context, platformId: 'baichuan', allowedRuleIds: ['baichuan_medical_usage_30'] }).valuation?.usdEstimate).toBe(84);
    expect(calculate(factors, { ...context, platformId: 'openai', allowedRuleIds: ['baichuan_medical_usage_30'] }).valuation).toBeNull();
  });
  it('rejects a plan price masquerading as a USD gift and arbitrary source fractions', () => {
    const quote = 'Plus USD 20 per month';
    expect(calculate({ kind: 'direct_usd', amount: { value: 20, sourceId: 'official', quote } }).valuation).toBeNull();
    expect(calculate({ kind: 'plan', price: fact(20), billingPeriod: 'month', denominator: fact(4), benchmark: 'plan_fraction' }).valuation).toBeNull();
  });
  it('rejects a year or token count masquerading as an adjacent USD amount', () => {
    const quote = 'Campaign 2026 grants 10 USD.';
    const ctx = { ...context, sourceTexts: { official: quote } };
    expect(calculateValuationV2({ kind: 'direct_usd', amount: { value: 2026, sourceId: 'official', quote }, sources: [{ ...source, excerpt: quote }] }, ctx).valuation).toBeNull();
    expect(calculate({ kind: 'plan', price: fact(100), billingPeriod: 'month' }).valuation).toBeNull();
  });
  it('does not swap token input and output prices when both numbers appear on a page', () => {
    expect(calculate({ kind: 'scenario', components: [{ scenario: 'text', models: [model('actual', 4, 2)] }] }).valuation).toBeNull();
  });
  it('rejects per-million prices misbound to unrelated token divisors', () => {
    expect(calculate({ kind: 'scenario', components: [{ scenario: 'text', models: [{ id: 'actual', inputPrice: fact(2), outputPrice: fact(4), tokenPriceUnits: fact(1000) }] }] }).valuation).toBeNull();
  });
  it('preserves unknown beta values as null and refuses zero-price proxies', () => {
    expect(calculate({ kind: 'unknown', beta: true }).valuation).toMatchObject({ status: 'beta_unpriced', usdEstimate: null, usdMax: null, fullValue: null });
    expect(calculate({ kind: 'scenario', benchmark: 'substitute_model', referenceModel: 'free', components: [{ scenario: 'text', models: [model('free', 0, 0)] }] }).valuation?.usdEstimate).toBeNull();
  });
});
