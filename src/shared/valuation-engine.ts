import { z } from 'zod';
import { STANDARD_USAGE_V1, valuationSchema, type JsonValue, type Valuation } from './valuation';
import type { ValuationCatalogFact, ValuationFactCatalog } from './valuation-catalog';

const sourceSchema = valuationSchema.shape.sources.element.extend({ id: z.string().min(1).max(200) }).strict();
/** Quotes bind a number to an exact, fetched passage; catalog references are server-owned. */
export const valuationFactSchema = z.union([
  z.object({ value: z.number().finite().nonnegative(), sourceId: z.string().min(1), quote: z.string().min(1).max(2_000) }).strict(),
  z.object({ catalogId: z.string().min(1).max(300) }).strict(),
  z.object({ ruleId: z.enum(['plan_fraction_quarter', 'baichuan_medical_usage_30']) }).strict(),
]);
const fact = valuationFactSchema;
const currency = z.enum(['USD', 'CNY', 'INR']);
const fxSchema = z.object({ currency, usdRate: fact, date: z.iso.date() }).strict();
const modelSchema = z.object({
  id: z.string().min(1).max(200), canonicalId: z.string().min(1).max(200).optional(),
  currency: currency.default('USD'), inputPerMillion: fact.optional(), outputPerMillion: fact.optional(),
  inputPrice: fact.optional(), outputPrice: fact.optional(), tokenPriceUnits: fact.optional(),
  unitPrice: fact.optional(), priceUnits: fact.optional(),
  sourceType: z.enum(['platform', 'provider', 'openrouter']).default('platform'), specification: z.string().max(300).optional(),
}).strict();
const capsSchema = z.object({ inputTokens: fact.optional(), outputTokens: fact.optional(), totalTokens: fact.optional(), quantity: fact.optional(), dailyQuantity: fact.optional(), monthlyQuantity: fact.optional() }).strict();
const scenarioShape = {
  coverageDays: fact.optional(), usageMultiplier: fact.optional(), benchmark: z.literal('substitute_model').optional(),
  referenceModel: z.string().min(1).max(200).optional(), independentPools: z.boolean().default(false),
  components: z.array(z.object({ scenario: z.enum(['text', 'coding', 'image', 'video', 'stt', 'tts']), poolId: z.string().min(1).max(200).optional(), poolBasis: z.object({ sourceId: z.string().min(1), quote: z.string().min(1).max(1_000) }).strict().optional(), models: z.array(modelSchema).min(1).max(100), caps: capsSchema.optional(), fx: fxSchema.optional() }).strict()).min(1).max(20),
};
const scenarioSchema = z.object({ kind: z.literal('scenario'), ...scenarioShape });
const common = { sources: z.array(sourceSchema).min(1).max(100), coverageDays: fact.optional(), currency: currency.default('USD'), fx: fxSchema.optional() };
/** Model amount fields are deliberately stripped; only these source-grounded factors are computed. */
export const valuationFactorsSchema = z.discriminatedUnion('kind', [
  z.object({ ...common, kind: z.literal('direct_usd'), amount: fact, maximum: fact.optional(), fullAmount: fact.optional(), period: z.enum(['one_time', 'monthly', 'first30']).default('one_time') }),
  z.object({ ...common, kind: z.literal('plan'), price: fact, billingPeriod: z.enum(['month', 'year']), months: fact.optional(), numerator: fact.optional(), denominator: fact.optional(), multiplier: fact.optional(), benchmark: z.enum(['entry_plan', 'plan_fraction', 'plan_multiplier']).optional(), referencePlan: z.string().min(1).max(200).optional() }),
  z.object({ ...common, kind: z.literal('credits'), entitlementUnits: fact, cadence: z.enum(['once', 'day', 'month']).default('once'), monthlyCap: fact.optional(), expiresDaily: z.object({ sourceId: z.string().min(1), quote: z.string().min(1).max(2_000) }).strict().optional(), packageUnits: fact, packagePrice: fact, benchmark: z.literal('entry_plan').optional(), referencePlan: z.string().min(1).max(200).optional() }),
  z.object({ ...common, kind: z.literal('scenario'), ...scenarioShape }),
  z.object({ ...common, kind: z.literal('token_grant'), scenario:z.enum(['text','coding']), totalTokens:fact, models:z.array(modelSchema).min(1).max(100) }).strict(),
  z.object({ ...common, kind: z.literal('apply'), maximum: fact.optional(), first30Maximum: fact.optional(), scenario: scenarioSchema.optional() }),
  z.object({ ...common, kind: z.literal('unknown'), reason: z.string().max(1_000).optional(), beta: z.boolean().default(false), resolved: z.boolean().default(false) }),
]);
export type ValuationFactors = z.infer<typeof valuationFactorsSchema>;
export type ValuationFact = z.infer<typeof valuationFactSchema>;
export interface ValuationEngineContext {
  sourceTexts?: Record<string, string>;
  catalog?: ValuationFactCatalog;
  now?: string;
  /** Server-owned policy scope, never copied from extraction fields. */
  platformId?: string;
  allowedRuleIds?: string[];
}
export interface ValuationEngineResult { valuation: Valuation | null; errors: string[] }
const round = (n: number) => Math.round((n + Number.EPSILON) * 1_000_000) / 1_000_000;
/** Matching-only canonicalization; the original fetched text, quotes and hashes never change. */
export function canonicalNumericText(text: string): string {
  const scales: Record<string, number> = { 千: 1_000, 万: 10_000, 百万: 1_000_000, 亿: 100_000_000, k: 1_000, m: 1_000_000, b: 1_000_000_000 };
  return text.replace(/(?<![\w.-])(\d+(?:,\d{3})*(?:\.\d+)?)(\s*)(百万|千|万|亿|[KMB])(?=\s*(?:tokens?|credits?|points?|积分|点数|令牌|张|images?|seconds?|minutes?|characters?|秒|分钟|字符|USD|CNY|INR|美元|人民币|元))/gi, (_match, value: string, _space: string, suffix: string, offset: number, original: string) => {
    const normalized = Number(value.replaceAll(',', '')) * scales[suffix.toLowerCase()];
    const separator = /^[a-z]/i.test(original.slice(offset + _match.length)) ? ' ' : '';
    return Number.isFinite(normalized) ? `${normalized}${separator}` : _match;
  });
}
const numbers = (text: string) => [...canonicalNumericText(text).matchAll(/(?<![\w.])\d+(?:,\d{3})*(?:\.\d+)?(?:e[+-]?\d+)?(?!\w|\.\d)/gi)].map(m => Number(m[0].replaceAll(',', '')));
/** Accept typography changes only: grouping commas and mathematically exact trailing zeros. */
function numericPattern(value: number): string {
  const [integer, decimal] = value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 }).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const whole = integer === grouped ? integer : `(?:${integer}|${grouped})`;
  return `${whole}${decimal ? `\\.${decimal}0*` : '(?:\\.0+)?'}`;
}
const currencyPatterns = { USD: /\bUSD\b|\$|美元/i, CNY: /\bCNY\b|\bRMB\b|[¥￥]|人民币/i, INR: /\bINR\b|₹|卢比/i };
function moneyBound(v: ValuationFact | undefined, curr: 'USD' | 'CNY' | 'INR'): boolean {
  if (!v || !('value' in v)) return true;
  const symbols = { USD: '(?:USD\\s*\\$?|US\\$|美元|\\$)', CNY: '(?:CNY|RMB|[¥￥]|人民币)', INR: '(?:INR|₹|卢比)' };
  if (curr === 'USD' && !/\bUSD\b|US\$|美元/i.test(v.quote)) return false;
  const text = canonicalNumericText(v.quote);
  for (const match of text.matchAll(/(?<![\w.])\d+(?:,\d{3})*(?:\.\d+)?(?:e[+-]?\d+)?(?!\w|\.\d)/gi)) {
    if (Number(match[0].replaceAll(',', '')) !== v.value) continue;
    const before = text.slice(Math.max(0, match.index - 20), match.index);
    const after = text.slice(match.index + match[0].length, match.index + match[0].length + 20);
    if (new RegExp(`${symbols[curr]}\\s*$`, 'i').test(before) || new RegExp(`^\\s*${symbols[curr]}(?:\\s|[.,;]|$)`, 'i').test(after)) return true;
  }
  return false;
}

/** Call only for the fetched official ECB XML; URL/content binding belongs to intake. */
export function deriveEcbValuationFx(xml: string, checkedAt: string, now = checkedAt): { date: string; catalog: ValuationFactCatalog } | null {
  if (!xml || xml.length > 5_000 || !Number.isFinite(Date.parse(checkedAt)) || !Number.isFinite(Date.parse(now)) || Date.parse(checkedAt) > Date.parse(now)) return null;
  const dates = [...xml.matchAll(/<Cube\b[^>]*\btime=['"](\d{4}-\d{2}-\d{2})['"][^>]*>/g)];
  if (dates.length !== 1) return null;
  const date = dates[0][1];
  if (!z.iso.date().safeParse(date).success) return null;
  const age = Date.parse(now) - Date.parse(`${date}T00:00:00Z`);
  if (age < 0 || age > 7 * 86_400_000) return null;
  const rates = new Map<string, number>();
  for (const match of xml.matchAll(/<Cube\b[^>]*\bcurrency=['"]([A-Z]{3})['"][^>]*\brate=['"]([0-9]+(?:\.[0-9]+)?)['"][^>]*\/\s*>/g)) {
    const rate = Number(match[2]);
    if (rates.has(match[1]) || !Number.isFinite(rate) || rate <= 0) return null;
    rates.set(match[1], rate);
  }
  const usd = rates.get('USD');
  if (!usd || !rates.get('CNY') || !rates.get('INR')) return null;
  const catalog: ValuationFactCatalog = {};
  for (const curr of ['CNY', 'INR'] as const) catalog[`ecb-${date}.${curr}`] = {
    kind: 'fx', currency: curr, priceId: `ecb-${date}`, platformId: 'ecb', specification: `USD/${curr}`,
    value: usd / rates.get(curr)!, source: { url: 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', checkedAt, excerpt: xml, priceBasis: `ECB ${date}: USD/EUR divided by ${curr}/EUR` },
  };
  return { date, catalog };
}

/** Pure and deterministic: never trusts model-computed usdEstimate/usdMax/fullValue. */
export function calculateValuationV2(raw: unknown, context: ValuationEngineContext = {}): ValuationEngineResult {
  const parsed = valuationFactorsSchema.safeParse(raw);
  if (!parsed.success) return { valuation: null, errors: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  const f = parsed.data;
  const now = context.now ?? new Date().toISOString();
  const sources: Valuation['sources'] = [];
  const bindings: Record<string, JsonValue>[] = [];
  const assumptions: string[] = [];
  const sourceById = new Map(f.sources.map(s => [s.id, s]));
  const addSource = (s: Valuation['sources'][number]) => {
    if (Date.parse(s.checkedAt) > Date.parse(now)) throw new Error('Source check date cannot be in the future');
    if (!sources.some(v => v.url === s.url && v.excerpt === s.excerpt && v.checkedAt === s.checkedAt)) sources.push(s);
  };
  try {
    if (!Number.isFinite(Date.parse(now))) throw new Error('Invalid calculation time');
    if (sourceById.size !== f.sources.length) throw new Error('Duplicate source IDs');
    for (const source of f.sources) {
      const { id, ...s } = source;
      if (!context.sourceTexts?.[id]?.includes(s.excerpt)) throw new Error(`Source ${id}: excerpt is not bound to fetched source text`);
      addSource(s);
    }
    const resolve = (v: ValuationFact | undefined, label: string, fallback?: number): number => {
      if (!v) {
        if (fallback !== undefined) return fallback;
        throw new Error(`Missing factor ${label}`);
      }
      let value: number;
      if ('ruleId' in v) {
        if (v.ruleId === 'plan_fraction_quarter') {
          if (label !== 'denominator') throw new Error('Quarter-plan policy can only define a plan denominator');
          value = 4;
          assumptions.push('V2 受控价格参照约定：每张额外重置以选定月费的 1/4 计算；不是官方 Token 数量。');
        } else {
          if (label !== 'usageMultiplier' || context.platformId !== 'baichuan' || !context.allowedRuleIds?.includes(v.ruleId)) throw new Error('Medical workload rule requires a server-authorized Baichuan medical grant');
          value = 30;
          assumptions.push('V2 授权 Baichuan 医疗机构工作量参照为通用文本用量的 30 倍，不代表保证申请额度。');
        }
        bindings.push({ factor: label, ruleId: v.ruleId, value });
      } else if ('catalogId' in v) {
        if (!['fx.usdRate', 'price', 'packagePrice', 'packageUnits'].includes(label) && !/\.(?:inputPrice|outputPrice|tokenPriceUnits|unitPrice|priceUnits)$/.test(label)) throw new Error(`Catalog purchase fact cannot define actual entitlement factor ${label}`);
        const entry = context.catalog?.[v.catalogId];
        if (!entry || !Number.isFinite(entry.value) || entry.value < 0) throw new Error(`Unknown trusted catalog fact ${v.catalogId}`);
        if (!entry.currency || !entry.priceId || !entry.platformId || !entry.specification || !entry.kind) throw new Error(`Catalog fact ${v.catalogId} lacks required price metadata`);
        addSource(entry.source); value = entry.value;
        bindings.push({ factor: label, catalogId: v.catalogId, value });
      } else {
        const s = sourceById.get(v.sourceId);
        if (!s || !s.excerpt.includes(v.quote) || !context.sourceTexts?.[v.sourceId]?.includes(v.quote) || !numbers(v.quote).includes(v.value)) throw new Error(`Source ${v.sourceId}: ${label} numeric value is not bound to its exact quote`);
        value = v.value;
        bindings.push({ factor: label, sourceId: v.sourceId, quote: v.quote, value });
      }
      return value;
    };
    const catalogRole = (v: ValuationFact | undefined, curr: 'USD' | 'CNY' | 'INR', kind: ValuationCatalogFact['kind'], purpose?: string, identity?: string, billingPeriod?: string) => {
      if (!v || !('catalogId' in v)) return undefined;
      const entry = context.catalog?.[v.catalogId];
      if (!entry || entry.currency !== curr || entry.kind !== kind || (purpose && (!('purpose' in entry) || entry.purpose !== purpose))) throw new Error(`Catalog ${v.catalogId}: currency or price purpose mismatch`);
      if (identity && ![entry.model, entry.plan, entry.priceId].some(id => id?.toLowerCase() === identity.toLowerCase())) throw new Error(`Catalog ${v.catalogId}: model or plan identity mismatch`);
      if (billingPeriod && entry.billingPeriod !== billingPeriod) throw new Error(`Catalog ${v.catalogId}: billing period mismatch`);
      return entry;
    };
    const price = (v: ValuationFact | undefined, label: string, curr: 'USD' | 'CNY' | 'INR', units?: RegExp): number => {
      const value = resolve(v, label);
      catalogRole(v, curr, 'price', 'amount');
      if (value <= 0) throw new Error(`Non-positive purchase price for ${label}`);
      if (v && 'value' in v && (!moneyBound(v, curr) || (units && !units.test(v.quote)))) throw new Error(`Source ${v.sourceId}: ${label} lacks adjacent currency or billing-unit price context`);
      return value;
    };
    const entitlement = (v: ValuationFact, label: string, curr: 'USD' | 'CNY' | 'INR', role: RegExp) => {
      const value = resolve(v, label);
      if (!('value' in v) || !v.quote.split(/[;\n]|\.(?!\d)/).some(row => role.test(row) && moneyBound({ ...v, quote: row }, curr))) throw new Error(`Source ${label}: actual entitlement requires adjacent denomination and benefit context in the same benefit row`);
      return value;
    };
    const fx = (curr: 'USD' | 'CNY' | 'INR', supplied = f.fx): number => {
      if (curr === 'USD') return 1;
      if (!supplied || supplied.currency !== curr) throw new Error(`Missing matched FX for ${curr}`);
      if (supplied.date > now.slice(0, 10)) throw new Error('Future FX date');
      if (Date.parse(now) - Date.parse(`${supplied.date}T00:00:00Z`) > 7 * 86_400_000) throw new Error('Stale FX quote date');
      if (!('catalogId' in supplied.usdRate)) throw new Error('FX must come from the verified official currency catalog, not an inline activity quote');
      const rate = resolve(supplied.usdRate, 'fx.usdRate');
      const metadata = catalogRole(supplied.usdRate, curr, 'fx');
      if (metadata?.platformId !== 'ecb' || new URL(metadata.source.url).hostname !== 'www.ecb.europa.eu') throw new Error('FX catalog must identify the verified ECB authority');
      if (rate <= 0) throw new Error('FX rate must be positive');
      const src = metadata?.source;
      if (src?.checkedAt.slice(0, 10) !== supplied.date && !src?.excerpt.includes(supplied.date)) throw new Error('FX date does not match price source date');
      return rate;
    };
    const coverageDays = Math.min(30, resolve(f.coverageDays, 'coverageDays', 30));
    if (coverageDays <= 0) throw new Error('Coverage days must be positive');
    const inputs: Record<string, JsonValue> = { calculationEngine: 'v2-auto', usageVersion: 'v2', coverageDays, sourceBindings: bindings };
    if (f.fx) { inputs.fxDate = f.fx.date; inputs.currency = f.currency; }
    const base: Valuation = { version: 'v2', status: 'needs_judgment', method: 'none', period: 'first30', usdEstimate: null, usdMax: null, fullValue: null, formula: null, inputs, sources, assumptions, reviewedAt: now };
    const finish = (v: Valuation): ValuationEngineResult => {
      const result = valuationSchema.safeParse(v);
      return result.success ? { valuation: result.data, errors: [] } : { valuation: null, errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
    };
    const unavailable = (reason: string, beta = false) => {
      // A reference type describes a priced benchmark only, never a failed pricing attempt.
      delete inputs.benchmarkType;
      return finish({ ...base, status: beta ? 'beta_unpriced' : 'needs_judgment', assumptions: [reason, ...assumptions] });
    };
    if (f.kind === 'unknown') return finish({ ...base, status: f.beta ? 'beta_unpriced' : f.resolved ? 'unpriceable' : 'needs_judgment', assumptions: f.reason ? [f.reason] : [] });
    if (f.kind === 'direct_usd') {
      if (f.currency !== 'USD') throw new Error('direct_usd requires USD denomination');
      const amount = entitlement(f.amount, 'amount', 'USD', /gift|credit|grant|entitlement|赠|额度|权益/i);
      if (f.period === 'monthly' && !('value' in f.amount && f.amount.quote.split(/[;\n]|\.(?!\d)/).some(row => /monthly|per\s*month|each\s*month|every\s*month|每月|月赠/i.test(row) && moneyBound({ ...f.amount as Extract<ValuationFact, {value:number}>, quote: row }, 'USD')))) throw new Error('Monthly USD entitlement requires an explicitly monthly gifted denomination');
      inputs.amount = amount;
      return finish({ ...base, status: 'priced', method: 'face_value', period: f.period, usdEstimate: round(amount), usdMax: f.maximum ? round(entitlement(f.maximum, 'maximum', 'USD', /max|up to|上限|最高/i)) : null, fullValue: round(f.fullAmount ? entitlement(f.fullAmount, 'fullAmount', 'USD', /gift|credit|grant|entitlement|赠|额度|权益/i) : amount), formula: `USD ${amount} fixed entitlement (no short-window scaling)` });
    }
    if (f.kind === 'plan' || f.kind === 'credits') {
      const rate = fx(f.currency);
      const benchmark = f.benchmark;
      if (benchmark) { inputs.benchmarkType = benchmark; inputs.referencePlan = f.referencePlan ?? 'normal entry plan'; assumptions.push('套餐价格参照，不代表已证明跨套餐积分等值或赠送整个套餐。'); }
      if (f.referencePlan) {
        const p = f.kind === 'plan' ? f.price : f.packagePrice;
        if ('value' in p && !p.quote.split(/[;\n]|\.(?!\d)/).some(row => row.toLowerCase().includes(f.referencePlan!.toLowerCase()) && moneyBound({ ...p, quote: row }, f.currency))) throw new Error('Source price quote does not identify the reference plan in its priced row');
      }
      if (f.kind === 'credits') {
        const rawQuantity = resolve(f.entitlementUnits, 'entitlementUnits');
        const cadencePattern = f.cadence === 'day' ? /daily|per\s*day|each\s*day|every\s*day|每日|每天|日赠/i : /monthly|per\s*month|each\s*month|every\s*month|每月|月赠/i;
        if (f.cadence !== 'once' && (!('value' in f.entitlementUnits) || !cadencePattern.test(f.entitlementUnits.quote))) throw new Error('Recurring credit cadence must be explicit in the actual entitlement quote');
        // Daily credits that lapse at the end of each day (or within 24 hours) cannot be stockpiled: value one day's grant,
        // not the 30-day total. The expiry must be quoted from a cited source (2026-10-19 owner rule).
        const sameDay = f.cadence === 'day' && !!f.expiresDaily;
        if (sameDay && (!f.sources.some(s => s.excerpt.includes(f.expiresDaily!.quote)) || !/当日有效|当天有效|当日失效|当天失效|次日清零|当日清零|每日清零|每天清零|不可累计|不累计|24\s*小时内有效|expires?\s+(?:at\s+)?(?:the\s+)?end\s+of\s+(?:the|each)\s+day|valid\s+(?:only\s+)?(?:for\s+)?(?:that|the\s+same)\s+day|valid\s+for\s+24\s*hours|do(?:es)?\s+not\s+(?:roll\s+over|carry\s+over|accumulate)/i.test(f.expiresDaily!.quote))) throw new Error('Same-day credit expiry must be quoted from a cited source');
        let quantity = rawQuantity * (f.cadence === 'day' && !sameDay ? coverageDays : 1);
        const monthlyCap = f.monthlyCap ? resolve(f.monthlyCap, 'monthlyCap') : null;
        if (f.monthlyCap) {
          const cap = f.monthlyCap;
          if (!('value' in cap) || !/monthly|per\s*month|each\s*month|every\s*month|每月|月度/i.test(cap.quote) || !/cap|maximum|limit|上限|最多|封顶/i.test(cap.quote) || !/credit|point|积分|点数/i.test(cap.quote)) throw new Error('Monthly credit cap requires explicit monthly limit and credit units');
          quantity = Math.min(quantity, monthlyCap!);
        }
        const units = resolve(f.packageUnits, 'packageUnits');
        const packageMetadata = catalogRole(f.packagePrice, f.currency, 'price', 'amount', f.referencePlan);
        const unitMetadata = catalogRole(f.packageUnits, f.currency, 'units', 'packageUnits', f.referencePlan);
        if (packageMetadata && unitMetadata && packageMetadata.priceId !== unitMetadata.priceId) throw new Error('Catalog package price and units belong to different plans');
        for (const [label, p, role] of [['entitlementUnits', f.entitlementUnits, '(?:gift|free|receive|赠|获得|获赠|领取|送)'], ['packageUnits', f.packageUnits, '(?:package|includes|buy|purchase|套餐|包含|购买)']] as const) {
          if ('value' in p) {
            const n = numericPattern(p.value);
            if (!new RegExp(`${role}[^\\d]{0,30}${n}(?![\\d.])[^\\d]{0,10}?(?:credits?|points?|积分|点数)|${n}(?![\\d.])[^\\d]{0,10}?(?:credits?|points?|积分|点数)[^\\d]{0,30}${role}`, 'i').test(canonicalNumericText(p.quote))) throw new Error(`Source ${p.sourceId}: ${label} is not tied to the correct credit ledger role`);
          }
        }
        if (units <= 0) throw new Error('Package units must be positive');
        const paid = price(f.packagePrice, 'packagePrice', f.currency, /credit|point|积分|点数|额度/i);
        const amount = quantity / units * paid * rate;
        Object.assign(inputs, { entitlementUnits: quantity, packageUnits: units, packagePrice: paid, currency: f.currency, rate, ...(f.cadence === 'day' ? { dailyQuantity: rawQuantity, monthlyQuantity: quantity } : f.cadence === 'month' ? { monthlyQuantity: quantity } : {}) });
        return finish({ ...base, status: benchmark ? 'provisional' : 'priced', method: 'official_price', period: f.cadence === 'once' ? 'one_time' : 'monthly', usdEstimate: round(amount), fullValue: benchmark || f.cadence !== 'once' ? null : round(amount), formula: `${sameDay ? `${rawQuantity} (same-day expiry, not accumulated)` : f.cadence === 'day' ? `min(${rawQuantity} × ${coverageDays} days, ${monthlyCap ?? 'no monthly cap'}) = ${quantity}; ` : ''}${quantity} / ${units} × ${paid} ${f.currency} × ${rate} USD/${f.currency}` });
      }
      const paid = price(f.price, 'price', f.currency, f.billingPeriod === 'year' ? /year|annual|年/i : /month|月/i);
      catalogRole(f.price, f.currency, 'price', 'amount', f.referencePlan, f.billingPeriod);
      const monthly = paid / (f.billingPeriod === 'year' ? 12 : 1);
      const numerator = resolve(f.numerator, 'numerator', 1);
      const denominator = resolve(f.denominator, 'denominator', 1);
      if (f.denominator && !('ruleId' in f.denominator)) throw new Error('A plan fraction requires a controlled policy denominator');
      if (f.numerator) throw new Error('A plan fraction numerator is the controlled value 1');
      if (f.denominator && 'ruleId' in f.denominator) inputs.ruleIds = [f.denominator.ruleId];
      const multiplier = resolve(f.multiplier, 'multiplier', 1);
      const months = resolve(f.months, 'months', f.billingPeriod === 'year' ? 12 : 1);
      if (denominator <= 0 || months <= 0 || multiplier <= 0) throw new Error('Plan denominator, months and multiplier must be positive');
      const fractional = f.numerator !== undefined || f.denominator !== undefined;
      if ((fractional || f.multiplier) && !benchmark) throw new Error('Fraction/multiplier requires a typed plan benchmark');
      const factor = numerator / denominator * multiplier;
      const windowFactor = fractional || f.multiplier ? 1 : coverageDays / 30;
      const estimate = monthly * factor * windowFactor * rate;
      const full = monthly * factor * months * rate * (!f.months && f.billingPeriod === 'month' ? windowFactor : 1);
      Object.assign(inputs, { officialMonthlyPrice: monthly, numerator, denominator, usageMultiplier: multiplier, months, currency: f.currency, rate });
      return finish({ ...base, status: benchmark ? 'provisional' : 'priced', method: 'official_price', usdEstimate: round(estimate), fullValue: benchmark ? null : round(full), formula: `${paid} / ${f.billingPeriod === 'year' ? 12 : 1} × (${numerator}/${denominator}) × ${multiplier} × ${windowFactor} × ${rate}; full = monthly × ${months}` });
    }
    let grantTokens:number|undefined;
    if(f.kind==='token_grant'){
      grantTokens=resolve(f.totalTokens,'totalTokens');
      if(!('value' in f.totalTokens)||grantTokens<=0)throw new Error('Fixed token grant requires a positive literal entitlement');
      const quote=canonicalNumericText(f.totalTokens.quote);
      const tokenAmount=new RegExp(`${numericPattern(grantTokens)}\\s*(?:tokens?|令牌)(?![a-z])`,'i');
      if(!tokenAmount.test(quote)||!/gift|grant|receiv|free|quota|赠|领取|获|额度/i.test(quote)||/daily|monthly|weekly|per\s+(?:day|month|week)|every\s+(?:day|month|week)|each\s+(?:day|month|week)|每(?:日|天|月|周)|无限|unlimited/i.test(quote))throw new Error('Fixed token grant needs a non-recurring token-denominated benefit quote');
      const entitlementText=f.totalTokens.quote.toLowerCase();
      if(f.models.some(model=>!entitlementText.includes((model.canonicalId??model.id).toLowerCase())))throw new Error('Fixed token grant must identify its actual eligible model');
      Object.assign(inputs,{totalTokens:grantTokens,pricingBasis:'fixed-token-grant',scenario:f.scenario});
      assumptions.push(`一次性 Token 总额完整折算；输入与输出按${f.scenario==='text'?' 5:1':' 10:1'}标准比例分配，不代表实际使用分布，不按月度用量或有效天数截断。`);
    }
    const scenario:z.infer<typeof scenarioSchema>|undefined = f.kind === 'scenario' ? f : f.kind==='token_grant'?{kind:'scenario',independentPools:false,components:[{scenario:f.scenario,models:f.models,fx:f.fx}]}:f.scenario;
    const first30Release = (maximum: number) => {
      if (f.kind !== 'apply' || !f.first30Maximum) return null;
      const release = entitlement(f.first30Maximum, 'first30Maximum', f.currency, /first\s*30\s*days|first\s*month|首\s*(?:30\s*天|月)|第一个月/i) * fx(f.currency);
      if (release > maximum) throw new Error('First-30-day application release cannot exceed the real full maximum');
      return round(release);
    };
    if (f.kind === 'apply' && !scenario) {
      if (!f.maximum) return unavailable('申请制缺少有依据的真实上限；不生成保证金额。');
      const maximum = entitlement(f.maximum, 'maximum', f.currency, /max|up to|上限|最高/i) * fx(f.currency);
      const first30 = first30Release(maximum);
      inputs.first30Max = first30 === null ? null : round(first30); inputs.fullApplyMax = round(maximum);
      return finish({ ...base, period: 'apply_max', status: 'priced', method: 'face_value', usdMax: round(maximum), fullValue: round(maximum), formula: `Maximum application ${maximum} USD; no guaranteed amount` });
    }
    if (!scenario) return unavailable('Missing scenario');
    const days = Math.min(30, resolve(scenario.coverageDays, 'scenario.coverageDays', coverageDays));
    if (scenario.usageMultiplier && !('ruleId' in scenario.usageMultiplier)) throw new Error('Usage multiplier must be a server-authorized policy rule');
    const multiplier = resolve(scenario.usageMultiplier, 'usageMultiplier', 1);
    if (scenario.usageMultiplier && 'ruleId' in scenario.usageMultiplier) inputs.ruleIds = [scenario.usageMultiplier.ruleId];
    if (days <= 0 || multiplier <= 0) throw new Error('Scenario window and usage multiplier must be positive');
    if (scenario.benchmark) {
      inputs.benchmarkType = scenario.benchmark; inputs.referenceModel = scenario.referenceModel ?? 'lowest matching paid model';
      assumptions.push('替代模型成本参照；不代表实际免费模型、积分兑换关系或保证领取额度。');
    }
    inputs.usageMultiplier = multiplier;
    const components: Record<string, JsonValue>[] = [];
    let total = 0, pricedCount = 0, totalCount = 0, incomplete = false;
    const pools = new Set<string>();
    const modalities = new Set<string>();
    const formulas: string[] = [];
    const modalityNames: Record<string, RegExp> = { text: /text|文本/i, coding: /coding|编程/i, image: /image|图像|图片/i, video: /video|视频/i, stt: /transcri|stt|转写/i, tts: /tts|speech|语音/i };
    const independentlyGrounded = scenario.independentPools && scenario.components.every(c => {
      const b = c.poolBasis;
      return !!c.poolId && !!b && !!sourceById.get(b.sourceId)?.excerpt.includes(b.quote) && !!context.sourceTexts?.[b.sourceId]?.includes(b.quote) && /independent|separate|独立|互不共享/i.test(b.quote) && modalityNames[c.scenario].test(b.quote);
    });
    for (const [index, component] of scenario.components.entries()) {
      const pool = independentlyGrounded ? component.poolId! : 'shared-default';
      // Explicit independent pools allow modalities to add, but never multiply the same scenario workload.
      if (pools.has(pool) || modalities.has(component.scenario)) {
        assumptions.push(`共享池或重复用途 ${component.scenario} 不重复累计。`); continue;
      }
      pools.add(pool); modalities.add(component.scenario);
      const usage = STANDARD_USAGE_V1[component.scenario];
      const caps = component.caps;
      const cap = (key: keyof z.infer<typeof capsSchema>, fallback = Infinity) => caps?.[key] ? resolve(caps[key], `components.${index}.caps.${key}`) : fallback;
      let input = 0, output = 0, quantity = 0;
      if ('inputTokens' in usage) {
        input = grantTokens===undefined?Math.min(usage.inputTokens * days / 30 * multiplier, cap('inputTokens')):grantTokens*usage.inputTokens/(usage.inputTokens+usage.outputTokens);
        output = grantTokens===undefined?Math.min(usage.outputTokens * days / 30 * multiplier, cap('outputTokens')):grantTokens-input;
        const ratio = Math.min(1, cap('totalTokens') / (input + output));
        input *= ratio; output *= ratio;
      } else quantity = Math.min(usage.quantity * days / 30 * multiplier, cap('quantity'), cap('dailyQuantity') * days, cap('monthlyQuantity'));
      const unique = new Map<string, z.infer<typeof modelSchema>>();
      const rank = { platform: 0, provider: 1, openrouter: 2 };
      for (const m of component.models) {
        const key = `${m.canonicalId ?? m.id}|${m.specification ?? ''}`;
        const old = unique.get(key);
        if (!old || rank[m.sourceType] < rank[old.sourceType]) unique.set(key, m);
      }
      const costs: { id: string; cost: number; formula: string; rates: Record<string, JsonValue> }[] = [];
      totalCount += unique.size;
      for (const m of unique.values()) {
        const token = 'inputTokens' in usage;
        if (token ? (!m.inputPerMillion || !m.outputPerMillion) && (!m.inputPrice || !m.outputPrice || !m.tokenPriceUnits) : !m.unitPrice) { incomplete = true; continue; }
        const rate = fx(m.currency, component.fx);
        let cost: number;
        let costFormula: string;
        let rates: Record<string, JsonValue>;
        if (token) {
          if ((m.inputPerMillion || m.outputPerMillion) && (m.inputPrice || m.outputPrice || m.tokenPriceUnits)) throw new Error('Token price cannot mix per-million and original-unit forms');
          const inputPrice = resolve(m.inputPerMillion ?? m.inputPrice, `${m.id}.inputPrice`);
          const outputPrice = resolve(m.outputPerMillion ?? m.outputPrice, `${m.id}.outputPrice`);
          const priceUnits = resolve(m.tokenPriceUnits, `${m.id}.tokenPriceUnits`, 1_000_000);
          const modelIdentity = m.canonicalId ?? m.id;
          const inMeta = catalogRole(m.inputPerMillion ?? m.inputPrice, m.currency, 'price', 'inputPrice', modelIdentity);
          const outMeta = catalogRole(m.outputPerMillion ?? m.outputPrice, m.currency, 'price', 'outputPrice', modelIdentity);
          let unitMeta = catalogRole(m.tokenPriceUnits, m.currency, 'units', 'tokenPriceUnits', modelIdentity);
          if (m.inputPerMillion && inMeta && !unitMeta) {
            const unitsEntry = Object.entries(context.catalog ?? {}).find(([, p]) => p.priceId === inMeta.priceId && p.kind === 'units' && p.purpose === 'tokenPriceUnits');
            if (unitsEntry?.[1].value !== 1_000_000) throw new Error('Catalog price is not billed per million tokens');
            unitMeta = catalogRole({ catalogId: unitsEntry[0] }, m.currency, 'units', 'tokenPriceUnits', modelIdentity);
            resolve({ catalogId: unitsEntry[0] }, `${m.id}.tokenPriceUnits`);
          }
          const grouped = [inMeta, outMeta, unitMeta].filter((p): p is ValuationCatalogFact => !!p);
          if (new Set(grouped.map(p => p.priceId)).size > 1) throw new Error('Catalog token prices and divisor belong to different price entries');
          if ((inMeta || outMeta) && (!inMeta || !outMeta || !unitMeta)) throw new Error('Catalog token pricing requires complete price and divisor identity bindings');
          if (m.specification && grouped.some(p => p.specification !== m.specification)) throw new Error('Catalog model specification mismatch');
          if (scenario.referenceModel && grouped.some(p => ![p.model, p.priceId].some(id => id?.toLowerCase() === scenario.referenceModel?.toLowerCase()))) throw new Error('Catalog reference model does not match its selected price');
          if (priceUnits <= 0) throw new Error('Token billing divisor must be positive');
          if (m.tokenPriceUnits && 'value' in m.tokenPriceUnits) {
            const n = numericPattern(priceUnits);
            if (!new RegExp(`(?:per|/|每)\\s*${n}\\s*(?:token|Token|令牌)`, 'i').test(canonicalNumericText(m.tokenPriceUnits.quote))) throw new Error('Source token divisor is not tied to the token billing unit');
          }
          if (inputPrice + outputPrice <= 0) { incomplete = true; continue; }
          // A free side is allowed when the other token direction has a real positive purchase price.
          for (const p of [m.inputPerMillion ?? m.inputPrice, m.outputPerMillion ?? m.outputPrice]) if (p && 'value' in p && (!currencyPatterns[m.currency].test(p.quote) || !/token|输入|输出/i.test(p.quote))) throw new Error(`Source ${p.sourceId}: token price lacks billing context`);
          for (const [direction, p] of [['input', m.inputPerMillion ?? m.inputPrice], ['output', m.outputPerMillion ?? m.outputPrice]] as const) {
            if (p && 'value' in p) {
              const rows = p.quote.split(/[;\n]|\.(?!\d)/);
              if (!rows.some(row => row.toLowerCase().includes(modelIdentity.toLowerCase()) && numbers(row).includes(p.value) && moneyBound({ ...p, quote: row }, m.currency))) throw new Error(`Source ${p.sourceId}: price belongs to a different model row`);
              const n = numericPattern(p.value);
              const role = direction === 'input' ? '(?:input|输入)' : '(?:output|输出)';
              if (!moneyBound(p, m.currency) || !new RegExp(`${role}[^\\d]{0,40}${n}(?![\\d.])|${n}(?![\\d.])[^\\d]{0,40}${role}`, 'i').test(canonicalNumericText(p.quote))) throw new Error(`Source ${p.sourceId}: ${direction} token rate is not tied to its billing direction`);
              if (m.inputPerMillion && !/per\s*(?:million|1[,.]?000[,.]?000|1m)|每\s*(?:百万|1[,.]?000[,.]?000)/i.test(canonicalNumericText(p.quote))) throw new Error('Per-million token price requires an explicit million-token billing unit');
            }
          }
          cost = (input * inputPrice + output * outputPrice) / priceUnits * rate;
          costFormula = `(${input} × ${inputPrice} input + ${output} × ${outputPrice} output) / ${priceUnits} × ${rate} = ${cost} USD`;
          rates = { inputPrice, outputPrice, priceUnit: priceUnits, currency: m.currency, rate };
        } else {
          const unitPatterns: Record<string, RegExp> = { image: /images?|张|图像|图片/i, video: /seconds?|秒/i, stt: /minutes?|分钟/i, tts: /characters?|字符/i };
          const unitPrice = price(m.unitPrice, `${m.id}.unitPrice`, m.currency, unitPatterns[component.scenario]);
          const unitPriceMetadata = catalogRole(m.unitPrice, m.currency, 'price', 'amount', m.canonicalId ?? m.id);
          if (unitPriceMetadata && (unitPriceMetadata.billingPeriod || !unitPriceMetadata.unit || !unitPatterns[component.scenario].test(unitPriceMetadata.unit))) throw new Error('Catalog unit-model price does not match the scenario billing unit');
          const priceUnits = resolve(m.priceUnits, `${m.id}.priceUnits`, 1);
          if (priceUnits <= 0) throw new Error('Price units must be positive');
          if (m.unitPrice && 'value' in m.unitPrice) {
            const p = m.unitPrice;
            const rows = p.quote.split(/[;\n]|\.(?!\d)/).filter(row => row.toLowerCase().includes((m.canonicalId ?? m.id).toLowerCase()) && moneyBound({ ...p, quote: row }, m.currency));
            if (!rows.length || !rows.some(row => {
              if (!unitPatterns[component.scenario].test(row)) return false;
              const divisor = canonicalNumericText(row).match(/(?:per|\/|每)\s*(\d+(?:,\d{3})*)?\s*(images?|seconds?|minutes?|characters?|张|秒|分钟|字符)/i);
              const literalDivisor = divisor?.[1] ? Number(divisor[1].replaceAll(',', '')) : 1;
              return literalDivisor === priceUnits && (!!divisor || /each|每张|每秒|每分钟|每字符/i.test(row));
            })) throw new Error('Unit price must identify the actual model, modality and purchase divisor in the same priced row');
            if (m.priceUnits && 'value' in m.priceUnits && m.priceUnits.sourceId !== p.sourceId) throw new Error('Unit price and divisor must belong to the same source');
          }
          cost = quantity / priceUnits * unitPrice * rate;
          costFormula = `${quantity} / ${priceUnits} × ${unitPrice} ${m.currency} × ${rate} = ${cost} USD`;
          rates = { unitPrice, priceUnit: priceUnits, currency: m.currency, rate };
        }
        costs.push({ id: m.canonicalId ?? m.id, cost, formula: costFormula, rates });
      }
      pricedCount += costs.length;
      if (!costs.length) { incomplete = true; continue; }
      costs.sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));
      const selected = scenario.benchmark ? costs[0] : costs[Math.floor((costs.length - 1) / 2)];
      total += selected.cost;
      const formula = `${selected.id}: ${selected.formula}`;
      formulas.push(formula);
      components.push({ scenario: component.scenario, sharedPool: pool, inputTokens: input, outputTokens: output, quantity, model: selected.id, amount: selected.cost, rates: selected.rates, alternatives: costs.map(c => ({ model: c.id, amount: c.cost, formula: c.formula })), ...(component.fx ? { fxDate: component.fx.date } : {}) });
    }
    if (!components.length) return unavailable('无可靠正价及匹配规格；缺价不按零计算。');
    Object.assign(inputs, { components, coverageDays: days, pricedModels: pricedCount, totalModels: totalCount, calculationBasis: scenario.benchmark ? 'lowest-positive-matched-reference' : 'lower-median-matched-model-cost' });
    if (f.kind === 'apply' && f.maximum) {
      const maximum = entitlement(f.maximum, 'maximum', f.currency, /max|up to|上限|最高/i) * fx(f.currency);
      inputs.usageCostReference = round(total);
      inputs.usageCostBenchmarkType = scenario.benchmark ?? null;
      inputs.first30Max = first30Release(maximum);
      inputs.fullApplyMax = round(maximum);
      delete inputs.benchmarkType;
      return finish({ ...base, status: 'priced', method: 'face_value', period: 'apply_max', usdEstimate: null, usdMax: round(maximum), fullValue: round(maximum), formula: `Maximum application ${maximum} USD; independent usage cost reference ${round(total)} USD (${formulas.join(' + ')})`.slice(0, 2_000) });
    }
    if (f.kind === 'apply') { inputs.first30Max = null; inputs.fullApplyMax = null; }
    return finish({ ...base, status: scenario.benchmark || incomplete ? 'provisional' : 'priced', method: 'scenario', period: f.kind === 'apply' ? 'apply_max' : f.kind==='token_grant'?'one_time':'first30', usdEstimate: round(total), usdMax: null, fullValue: f.kind==='token_grant'?round(total):null, formula: formulas.join(' + ').slice(0, 2_000), coverage: { pricedModels: pricedCount, totalModels: totalCount, days } });
  } catch (error) {
    return { valuation: null, errors: [error instanceof Error ? error.message : String(error)] };
  }
}
