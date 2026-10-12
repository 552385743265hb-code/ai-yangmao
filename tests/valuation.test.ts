import { describe, expect, it } from 'vitest';
import { offerIn } from '../src/shared/ingest';
import { checkOffer } from '../src/shared/spec';
import { haoScore } from '../src/shared/score';
import { parseValuation, publicSafeValuation, STANDARD_USAGE_V1, valuationClosesUsdGap, valuationSummary, type Valuation } from '../src/shared/valuation';
import { auditFixture } from './fixtures/identity/audit';
import worker from '../src/worker/index';

const checkedAt = '2026-10-09';
const source = { url: 'https://vendor.example/pricing', checkedAt, excerpt: 'Public beta pricing has not been announced.', priceBasis: '发放方价格页' };
export const unpriced: Valuation = {
  version: 'v1', status: 'beta_unpriced', method: 'none', period: 'first30', usdEstimate: null,
  usdMax: null, fullValue: null, formula: null, inputs: {}, sources: [source], assumptions: [], reviewedAt: checkedAt,
};
const offer = {
  id: 'vendor-free', platformId: 'vendor', type: 'free' as const, title: '模型公测免费', valueText: '免费使用模型',
  claimMethod: 'signup' as const, modalities: ['text'], requirements: ['none'], audience: 'all',
  usdEstimate: null, usdMax: null, endKind: 'unknown' as const, sourceTz: 'UTC',
  evidence: { tier: 'site', url: 'https://vendor.example/free', capturedAt: '2026-10-09', excerpts: { benefit: 'Public beta is free.' } },
  lastVerifiedAt: '2026-10-09T12:00:00Z',
};
const usdIssues = (value: typeof offer & { valuation?: unknown }) => checkOffer(value).filter(issue => issue.field === 'usdEstimate');

describe('V1 valuation state and validation', () => {
  it('closes a checked unpriced conclusion, keeps pending judgment open, and preserves other blockers', () => {
    for (const status of ['beta_unpriced', 'unpriceable'] as const) {
      const valuation = { ...unpriced, status };
      expect(usdIssues({ ...offer, valuation })).toEqual([]);
      expect(valuationClosesUsdGap(valuation, offer)).toBe(true);
      expect(checkOffer({ ...offer, valuation, requirements: ['unknown'] }).some(issue => issue.field === 'requirements' && issue.level === 'block')).toBe(true);
    }
    expect(usdIssues({ ...offer, valuation: { ...unpriced, status: 'needs_judgment' } })).toHaveLength(1);
    expect(usdIssues(offer)).toHaveLength(1);
  });
  it('fails closed for unknown versions, unknown status, internal top-level keys, stale amounts and zero pretending to be unpriced', () => {
    for (const valuation of [{ ...unpriced, version: 'v3' }, { ...unpriced, status: 'unknown' }, { ...unpriced, reason: 'internal' }, { ...unpriced, usdEstimate: 0 }]) {
      expect(parseValuation(valuation)).toBeNull();
      expect(valuationClosesUsdGap(valuation, offer)).toBe(false);
      expect(checkOffer({ ...offer, valuation }).some(issue => issue.field === 'valuation' && issue.level === 'block')).toBe(true);
    }
    expect(offerIn.safeParse({ ...offer, valuation: unpriced }).success).toBe(true);
    expect(offerIn.safeParse({ ...offer, valuation: unpriced, usdEstimate: 1 }).success).toBe(false);
    expect(offerIn.safeParse({ ...offer, valuation: unpriced, usdMax: 1 }).success).toBe(false);
  });
  it('accepts a genuine application ceiling without manufacturing a minimum', () => {
    const valuation: Valuation = { ...unpriced, status: 'priced', method: 'face_value', period: 'apply_max', usdMax: 100_000, formula: '最高可申请 $100,000；不保证获得额度' };
    expect(offerIn.safeParse({ ...offer, type: 'apply', endKind: 'standing', usdMax: 100_000, valuation }).success).toBe(true);
    expect(valuationClosesUsdGap(valuation, { usdEstimate: null, usdMax: 100_000 })).toBe(true);
    expect(offerIn.safeParse({ ...offer, type: 'apply', endKind: 'standing', usdMax: 100_000 }).success).toBe(false);
    expect(offerIn.safeParse({ ...offer, usdMax: 100_000, valuation }).success).toBe(false);
  });
  it('retains legacy optional metadata and refuses incomplete priced coverage marked final', () => {
    const legacy = offerIn.parse({ ...offer, usdEstimate: 10 });
    expect(legacy).not.toHaveProperty('valuation');
    const priced = { ...unpriced, status: 'priced', method: 'scenario', usdEstimate: 4, formula: '1 × 2 + 0.2 × 10 = 4', coverage: { pricedModels: 2, totalModels: 3 } };
    expect(parseValuation(priced)).toBeNull();
    expect(parseValuation({ ...priced, status: 'provisional' })?.usdEstimate).toBe(4);
    expect(parseValuation({ ...priced, status: 'provisional', coverage: { pricedModels: 4, totalModels: 3 } })).toBeNull();
    expect(parseValuation({ ...unpriced, reviewedAt: '2026-02-30' })).toBeNull();
  });
  it('uses known score dimensions for unknown and legacy values, and prices only verified regular benefits', () => {
    const scored = { ...offer, lastVerifiedAt: '2026-10-09T12:00:00Z' };
    const now = new Date('2026-10-09T12:00:00Z');
    expect(haoScore(scored, now)).toBe(88);
    expect(haoScore({ ...scored, usdEstimate: 1_000 }, now)).toBe(88);
    const zero = { ...unpriced, status: 'priced' as const, method: 'face_value' as const, usdEstimate: 0, fullValue: 0, formula: '官方面额 $0' };
    expect(haoScore({ ...scored, usdEstimate: 0, valuation: zero }, now)).toBe(67);
    expect(haoScore({ ...scored, usdEstimate: 1_000, valuation: { ...zero, usdEstimate: 1_000 } }, now)).toBe(91);
    const grant = { ...zero, period: 'apply_max' as const, usdEstimate: 1_000, usdMax: 100_000 };
    expect(haoScore({ ...scored, type: 'apply', endKind: 'standing', usdEstimate: 1_000, usdMax: 100_000, valuation: grant }, now)).toBe(96);
  });
});

describe('public valuation projection', () => {
  it('filters internal keys at the top, source, coverage and recursively within calculation inputs', () => {
    const candidate = { ...unpriced, reason: 'private reason', issues: ['private issue'], sources: [{ ...source, reviewMemo: 'private source memo' }],
      coverage: { pricedModels: 0, totalModels: 2, oldUsd: 123 }, inputs: { scenario: 'text', reviewMemo: 'private', limits: { inputTokens: 1_000_000, reason: 'private cap' }, eligibleModels: [{ model: 'Alpha', oldValue: 88 }] } };
    expect(publicSafeValuation(JSON.stringify(candidate))).toEqual({ ...unpriced, coverage: { pricedModels: 0, totalModels: 2 },
      inputs: { scenario: 'text', limits: { inputTokens: 1_000_000 }, eligibleModels: [{ model: 'Alpha' }] } });
    expect(JSON.stringify(publicSafeValuation(candidate))).not.toContain('private');
  });
  it('refuses unsupported versions and inconsistent public calculation states', () => {
    expect(publicSafeValuation({ ...unpriced, version: 'v3' })).toBeNull();
    expect(publicSafeValuation({ ...unpriced, usdEstimate: 0 })).toBeNull();
    expect(publicSafeValuation('not json')).toBeNull();
  });
  it('publishes the confirmed V1 usage units without assuming generation specifications', () => {
    expect(STANDARD_USAGE_V1.text.inputTokens).toBe(1_000_000);
    expect(STANDARD_USAGE_V1.text.outputTokens).toBe(200_000);
    expect(STANDARD_USAGE_V1.coding.inputTokens).toBe(10_000_000);
    expect(STANDARD_USAGE_V1.video.quantity).toBe(600);
    expect(STANDARD_USAGE_V1.stt.quantity).toBe(1_200);
    expect(STANDARD_USAGE_V1.image.description).toContain('须匹配尺寸与质量');
  });
  it('keeps public calculation components and foreign exchange while filtering review reasons', () => {
    expect(publicSafeValuation({ ...unpriced, inputs: { components: [{ cnyValue: 100, entitlementUnits: 20, reason: 'internal' }],
      fx: { numerator: 1, denominator: 7.1, fxDate: '2026-10-09', issues: ['private'] }, quantities: [10, 20], rates: [0.1, 0.2] } })?.inputs)
      .toEqual({ components: [{ cnyValue: 100, entitlementUnits: 20 }], fx: { numerator: 1, denominator: 7.1, fxDate: '2026-10-09' }, quantities: [10, 20], rates: [0.1, 0.2] });
  });
  it('keeps calculated model alternatives while stripping nested internal fields', () => {
    const candidate = { ...unpriced, inputs: { alternatives: [
      { model: 'Alpha', amount: 4, formula: '1 × 2 + 0.2 × 10 = 4', reason: 'private review', issues: ['private issue'] },
      { model: 'Beta', amount: 8, formula: '1 × 4 + 0.2 × 20 = 8', reviewMemo: 'private memo', oldUsd: 100 },
    ] } };
    expect(publicSafeValuation(candidate)?.inputs.alternatives).toEqual([
      { model: 'Alpha', amount: 4, formula: '1 × 2 + 0.2 × 10 = 4' },
      { model: 'Beta', amount: 8, formula: '1 × 4 + 0.2 × 20 = 8' },
    ]);
    expect(JSON.stringify(publicSafeValuation(candidate))).not.toMatch(/private|oldUsd|reviewMemo|issues|reason/);
  });
  it('keeps complete application ceilings separate from known or unknown first30 release amounts', () => {
    const grant = { ...unpriced, status: 'priced', method: 'face_value', period: 'apply_max', usdMax: 350_000,
      formula: '完整资助最高 $350,000；首30天释放安排未公布',
      inputs: { fullApplyMax: 350_000, first30Max: null, reason: 'private decision', issues: ['private issue'] } };
    expect(publicSafeValuation(grant)?.inputs).toEqual({ fullApplyMax: 350_000, first30Max: null });
    expect(publicSafeValuation({ ...grant, inputs: { fullApplyMax: 350_000, first30Max: 2_000 } })?.inputs)
      .toEqual({ fullApplyMax: 350_000, first30Max: 2_000 });
    expect(publicSafeValuation(grant)?.usdMax).toBe(350_000);
    expect(publicSafeValuation(grant)?.usdEstimate).toBeNull();
  });
});

describe('V2 valuation compatibility', () => {
  it('requires provisional references, retains exact package reference values and rejects invented proxy ceilings', () => {
    const reference = { ...unpriced, version: 'v2', status: 'provisional', method: 'official_price', usdEstimate: 20, fullValue: 240,
      formula: '全年套餐 $240 ÷ 12 个月 = $20', inputs: { benchmarkType: 'accepted_reference', referencePlan: 'Annual' } };
    expect(parseValuation(reference)).toEqual(reference);
    expect(parseValuation({ ...reference, status: 'priced' })).toBeNull();
    expect(parseValuation({ ...reference, method: 'face_value' })).toBeNull();
    expect(parseValuation({ ...reference, inputs: { benchmarkType: '' } })).toBeNull();
    const proxy = { ...reference, method: 'scenario', period: 'apply_max', fullValue: null, usdEstimate: 30,
      formula: '30 × 每月固定用量 × 参考模型价格 = $30', inputs: { benchmarkType: 'substitute_model', referenceModel: 'Reference Model',
        usageMultiplier: 30, first30Max: null, fullApplyMax: null } };
    expect(offerIn.safeParse({ ...offer, type: 'apply', endKind: 'standing', usdEstimate: 30, valuation: proxy }).success).toBe(true);
    for (const invalid of [{ ...proxy, usdMax: 100 }, { ...proxy, fullValue: 360 },
      { ...proxy, inputs: { ...proxy.inputs, first30Max: 30 } }, { ...proxy, inputs: { ...proxy.inputs, fullApplyMax: 360 } }]) {
      expect(parseValuation(invalid)).toBeNull();
    }
    const wording = valuationSummary({ type: 'apply', usdEstimate: 30, usdMax: null, valuation: proxy });
    expect(wording).toContain('月度使用方案参考约 $30');
    expect(wording).toContain('不代表申请额度或保证获批');
    expect(wording).not.toMatch(/确定金额|最高可申请/);
  });

  it('accepts reviewed V1 and V2 records without changing their amounts, nulls or application ceilings', () => {
    for (const version of ['v1', 'v2'] as const) {
      const empty = { ...unpriced, version };
      expect(parseValuation(JSON.stringify(empty))).toEqual(empty);
      expect(valuationClosesUsdGap(empty, offer)).toBe(true);
      expect(offerIn.safeParse({ ...offer, valuation: empty }).success).toBe(true);
      const zero = { ...empty, status: 'priced', method: 'face_value', usdEstimate: 0, formula: '官方面额 $0' };
      expect(parseValuation(zero)?.usdEstimate).toBe(0);
      expect(parseValuation({ ...empty, usdEstimate: 0 })).toBeNull();
      const cap = { ...empty, status: 'priced', method: 'face_value', period: 'apply_max', usdMax: 100_000, formula: '最高可申请 $100,000，审批决定' };
      expect(offerIn.safeParse({ ...offer, type: 'apply', endKind: 'standing', usdMax: 100_000, valuation: cap }).success).toBe(true);
      expect(valuationSummary({ type: 'apply', usdMax: 100_000, valuation: cap })).toBe('官方面额 · 最高可申请 $100,000（审批决定，无保底）');
    }
  });

  it('publishes explicit reference inputs while stripping private metadata recursively', () => {
    const value = { ...unpriced, version: 'v2', status: 'provisional', method: 'official_price', usdEstimate: 15,
      formula: '100 积分 × ($15 ÷ 100 积分) = $15',
      inputs: { benchmarkType: 'entry_plan', referencePlan: 'Starter', referenceModel: 'Model A', ruleIds: ['V2-PLAN-ENTRY'],
        usageMultiplier: 1, pricingBasis: { packagePrice: 15, packageUnits: 100, reviewMemo: 'private rationale' },
        calculationBasis: { quantity: 100, unit: '积分', issues: ['private issue'] }, selectedBy: 'private admin',
        limits: { days: 30, reason: 'private choice' } }, reviewMemo: 'private decision', sources: [{ ...source, reason: 'private source' }] };
    expect(publicSafeValuation(JSON.stringify(value))).toMatchObject({ version: 'v2', status: 'provisional', usdEstimate: 15, usdMax: null,
      inputs: { benchmarkType: 'entry_plan', referencePlan: 'Starter', referenceModel: 'Model A', ruleIds: ['V2-PLAN-ENTRY'],
        usageMultiplier: 1, pricingBasis: { packagePrice: 15, packageUnits: 100 }, calculationBasis: { quantity: 100, unit: '积分' }, limits: { days: 30 } } });
    expect(JSON.stringify(publicSafeValuation(value))).not.toMatch(/private|selectedBy|reviewMemo|issues|reason/);
  });

  it('retains dated FX and per-card inputs needed to reproduce V2 values', () => {
    const value = { ...unpriced, version: 'v2', inputs: { cards: 8, benefitDays: 7, plan: 'Pro',
      fx: { usdPerCny: 0.14942927245572862, date: '2026-10-09', source: 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', reviewMemo: 'private' } } };
    expect(publicSafeValuation(value)?.inputs).toEqual({ cards: 8, benefitDays: 7, plan: 'Pro',
      fx: { usdPerCny: 0.14942927245572862, date: '2026-10-09', source: 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml' } });
  });

  it('protects administrator V2 metadata from extractor updates and filters it on every public offer route', async () => {
    const f = auditFixture();
    try {
      const call = (path: string, body?: unknown, admin = false) => f.call(path, body, admin, { IDENTITY_MODE: 'off' });
      const value = { ...unpriced, version: 'v2', status: 'provisional', method: 'official_price', usdEstimate: 15,
        formula: '100 积分 × ($15 ÷ 100 积分) = $15', inputs: { benchmarkType: 'entry_plan', referencePlan: 'Starter',
          pricingBasis: { packagePrice: 15, packageUnits: 100 }, calculationBasis: { quantity: 100, unit: '积分' } } };
      expect((await call('ingest/offers', [{ ...offer, usdEstimate: 999, valuation: { ...value, usdEstimate: 999 } }])).status).toBe(200);
      expect(JSON.parse(String(f.sqlite.prepare('SELECT valuation FROM offers WHERE id=?').get(offer.id)?.valuation))).toMatchObject({version:'v2',status:'needs_judgment',usdEstimate:null,inputs:{calculationEngine:'v2-auto'}});
      expect((await call(`admin/offers/${offer.id}/edit`, { fields: { usdEstimate: 15, usdMax: null, valuation: value } }, true)).status).toBe(200);
      const stored = f.sqlite.prepare('SELECT valuation,usd_estimate,review_state FROM offers WHERE id=?').get(offer.id);
      expect(stored).toMatchObject({ usd_estimate: 15, review_state: 'pending' });
      expect(JSON.parse(String(stored?.valuation))).toEqual(value);
      expect((await call('ingest/offers', [{ ...offer, usdEstimate: 999, valuation: { ...value, usdEstimate: 999 } }])).status).toBe(200);
      expect(f.sqlite.prepare('SELECT valuation,usd_estimate,review_state FROM offers WHERE id=?').get(offer.id)).toEqual(stored);
      expect((await call(`admin/offers/${offer.id}/edit`, { fields: { usdEstimate: 16, valuation: value } }, true)).status).toBe(400);
      const raw = { ...value, reviewMemo: 'private conclusion', inputs: { ...value.inputs, reason: 'private choice',
        pricingBasis: { ...value.inputs.pricingBasis, reviewMemo: 'private price rationale' } } };
      f.sqlite.prepare("UPDATE offers SET review_state='approved',valuation=?,review_memo=? WHERE id=?").run(JSON.stringify(raw), 'private audit', offer.id);
      for (const path of ['offers?view=all&valuation=v2&schema=valuation-v2', `offers/${offer.id}`, 'platforms/vendor']) {
        const result = await call(path);
        expect(result.status).toBe(200);
        const pub = result.body.offer ?? result.body.offers[0];
        expect(pub.valuation).toEqual(value);
        expect(JSON.stringify(result.body)).not.toMatch(/private|reviewMemo|reason/);
      }
      f.sqlite.prepare('UPDATE offers SET usd_estimate=16 WHERE id=?').run(offer.id);
      expect((await call(`offers/${offer.id}`)).body.offer.valuation).toBeNull();
    } finally { f.sqlite.close(); }
  });

  it('uses a new edge response schema without losing canonical generation invalidation', async () => {
    const f = auditFixture(), cache = new Map<string, Response>(), pending: Promise<unknown>[] = [];
    const previous = (globalThis as any).caches;
    try {
      await f.call('ingest/offers', [offer], false, { IDENTITY_MODE: 'off' });
      const value = { ...unpriced, version: 'v2' };
      f.sqlite.prepare("UPDATE offers SET review_state='approved',valuation=? WHERE id=?").run(JSON.stringify(value), offer.id);
      const oldKey = new URL('https://local.test/api/offers?view=all');
      oldKey.searchParams.set('__response_schema', 'membership-v1');
      oldKey.searchParams.set('__canonical_generation', String(f.sqlite.prepare('SELECT generation FROM identity_public_state WHERE id=1').get()?.generation));
      cache.set(oldKey.href, Response.json({ offers: [{ id: 'stale-cache-entry' }], count: 1 }));
      (globalThis as any).caches = { default: {
        async match(key: Request) { return cache.get(key.url)?.clone(); },
        async put(key: Request, response: Response) { cache.set(key.url, response.clone()); },
      } };
      const get = () => worker.fetch(new Request('https://local.test/api/offers?view=all'), { DB: f.db, IDENTITY_MODE: 'off' } as any,
        { waitUntil: (promise: Promise<unknown>) => pending.push(promise) } as any);
      expect((await (await get()).json() as any).offers[0]).toMatchObject({ id: offer.id, valuation: value });
      await Promise.all(pending);
      const key = [...cache.keys()].find(url => new URL(url).searchParams.get('__response_schema') === 'valuation-v2');
      expect(key).toBeDefined();
      expect(new URL(key!).searchParams.get('__canonical_generation')).toBe(new URL(oldKey).searchParams.get('__canonical_generation'));
      expect((await (await get()).json() as any).offers[0].valuation.version).toBe('v2');
    } finally {
      if (previous === undefined) delete (globalThis as any).caches;
      else (globalThis as any).caches = previous;
      f.sqlite.close();
    }
  });
});

describe('shared card and notification value wording', () => {
  const official: Valuation = { ...unpriced, status: 'priced', method: 'official_price', period: 'first30',
    usdEstimate: 20, fullValue: 240, formula: '首30天 = 1 × $20；全年 = 12 × $20' };
  it('shows the first-month reference and its method without presenting the whole membership amount as that month', () => {
    const wording = valuationSummary({ usdEstimate: 20, valuation: official });
    expect(wording).toBe('官方价格折算 · 月度参考价值 $20');
    expect(wording).not.toContain('240');
    expect(valuationSummary({ usdEstimate: 0.9333, valuation: { ...official, status: 'provisional', method: 'scenario', usdEstimate: 0.9333 } }))
      .toBe('标准用量估算 · 月度参考价值约 $0.9333 · 暂定');
  });
  it('explains an application ceiling without manufacturing a lower bound and preserves null conclusions', () => {
    expect(valuationSummary({ type: 'apply', usdEstimate: null, usdMax: 100_000,
      valuation: { ...official, method: 'face_value', period: 'apply_max', usdEstimate: null, usdMax: 100_000 } }))
      .toBe('官方面额 · 最高可申请 $100,000（审批决定，无保底）');
    expect(valuationSummary({ valuation: unpriced })).toBe('公测免费 · 价值待定');
    expect(valuationSummary({ valuation: { ...unpriced, status: 'unpriceable' } })).toBe('免费权益 · 暂无法折算');
    expect(valuationSummary({ valuation: { ...unpriced, status: 'needs_judgment' } })).toBe('估值待核实');
    expect(valuationSummary({ usdEstimate: 20, valuation: official, usdMax: 100 })).toBe('估值待核实');
    expect(valuationSummary({ usdEstimate: 20 })).toContain('旧参考值 $20');
    expect(valuationSummary({ usdEstimate: null })).toBe('');
  });
});
