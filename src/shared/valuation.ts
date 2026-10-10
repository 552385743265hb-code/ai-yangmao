import { z } from 'zod';

/** V1 compares the benefit available in the first 30 days after claiming. */
export const VALUATION_METHODS = {
  face_value: '官方面额', official_price: '官方价格折算', scenario: '标准用量估算', none: '暂无可靠价格',
} as const;
export const VALUATION_PERIODS = {
  one_time: '一次性', monthly: '每月', first30: '前 30 天', apply_max: '最高可申请',
} as const;
export const VALUATION_STATUSES = {
  priced: '已估值', provisional: '暂定估值', beta_unpriced: '公测免费 · 价值待定',
  unpriceable: '免费权益 · 暂无法折算', needs_judgment: '估值待核实',
} as const;

/** Comparison conventions, not measured averages or a promise of free usage. */
export const STANDARD_USAGE_V1 = {
  text: { label: '文本对话', inputTokens: 1_000_000, outputTokens: 200_000, description: '每 30 天输入 100 万 Token、输出 20 万 Token' },
  coding: { label: '编程助手', inputTokens: 10_000_000, outputTokens: 1_000_000, description: '每 30 天输入 1,000 万 Token、输出 100 万 Token' },
  image: { label: '图像生成', quantity: 100, unit: '张', description: '每 30 天生成 100 张；须匹配尺寸与质量' },
  video: { label: '视频生成', quantity: 600, unit: '秒', description: '每 30 天生成 600 秒素材；须匹配分辨率与模式，未采用素材也计入生成量' },
  stt: { label: '语音转文字', quantity: 1_200, unit: '分钟', description: '每 30 天转写 1,200 分钟音频；须匹配计费档位' },
  tts: { label: '文字转语音', quantity: 10_000, unit: '字符', description: '每 30 天转换 10,000 字符；须匹配计费档位' },
} as const;

const amount = z.number().finite().nonnegative().nullable();
const checkedAt = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);
const webUrl = z.url().refine(value => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
}, '价格来源须为网页链接');
const jsonValue: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.string(), z.number().finite(), z.boolean(), z.null(), z.array(jsonValue), z.record(z.string(), jsonValue),
]));
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const valuationShape = {
  version: z.literal('v1'),
  status: z.enum(['priced', 'provisional', 'beta_unpriced', 'unpriceable', 'needs_judgment']),
  method: z.enum(['face_value', 'official_price', 'scenario', 'none']),
  period: z.enum(['one_time', 'monthly', 'first30', 'apply_max']),
  usdEstimate: amount,
  usdMax: amount,
  fullValue: amount,
  formula: z.string().trim().min(1).max(2_000).nullable(),
  inputs: z.record(z.string(), jsonValue),
  sources: z.array(z.object({
    url: webUrl, checkedAt, excerpt: z.string().trim().min(1).max(5_000),
    priceBasis: z.string().trim().min(1).max(500),
  }).strict()).min(1).max(100),
  assumptions: z.array(z.string().trim().min(1).max(1_000)).max(30),
  baselineModel: z.string().trim().min(1).max(200).optional(),
  coverage: z.object({
    pricedModels: z.number().int().nonnegative(), totalModels: z.number().int().positive(),
    days: z.number().positive().max(30).optional(),
  }).strict().refine(value => value.pricedModels <= value.totalModels, '计价模型数不能超过可用模型数').optional(),
  reviewedAt: checkedAt,
};

export const valuationSchema = z.object(valuationShape).strict().superRefine((v, ctx) => {
  const fail = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  const priced = v.status === 'priced' || v.status === 'provisional';
  if (priced) {
    if (v.method === 'none') fail('method', '有金额的估值须说明定价方法');
    if (v.usdEstimate === null && !(v.period === 'apply_max' && v.usdMax !== null)) fail('usdEstimate', '已估值须有首 30 天金额或真实申请上限');
    if (!v.formula) fail('formula', '已估值须保留计算公式');
  } else {
    if (v.method !== 'none') fail('method', '未定价状态不能使用定价方法');
    if (v.usdEstimate !== null || v.usdMax !== null || v.fullValue !== null) fail('usdEstimate', '未知价值须留空，不能当作零或已定价');
  }
  if (v.usdEstimate !== null && v.usdMax !== null && v.usdMax < v.usdEstimate) fail('usdMax', '真实上限不能小于比较金额');
  if (v.usdEstimate === null && v.usdMax !== null && v.period !== 'apply_max') fail('usdMax', '没有确定金额时只允许保存真实申请上限');
  if (v.status === 'priced' && v.coverage && v.coverage.pricedModels < v.coverage.totalModels) fail('status', '部分模型缺价时须标为暂定');
});
export type Valuation = z.infer<typeof valuationSchema>;

/** Strict validation for saved administrator data; unsupported versions fail closed. */
export function parseValuation(value: unknown): Valuation | null {
  let input = value;
  if (typeof input === 'string') { try { input = JSON.parse(input); } catch { return null; } }
  const result = valuationSchema.safeParse(input);
  return result.success ? result.data : null;
}

const publicInputFields = new Set([
  'scenario', 'usageVersion', 'unit', 'quantity', 'inputTokens', 'outputTokens', 'inputPrice', 'outputPrice',
  'unitPrice', 'currency', 'coverageDays', 'packagePrice', 'packageUnits', 'officialMonthlyPrice',
  'recipientCount', 'sharedPool', 'model', 'modelVersion', 'sourceType', 'priceUnit', 'priceApplicableAt',
  'specification', 'dimensions', 'resolution', 'quality', 'mode', 'duration', 'availableQuantity',
  'dailyQuantity', 'monthlyQuantity', 'eligibleModels', 'pricedModels', 'totalModels', 'limits',
  'input', 'output', 'total', 'perDay', 'perMonth', 'requests', 'tokens', 'credits', 'seconds', 'minutes',
  'characters', 'images', 'days', 'seats', 'months', 'years', 'amount', 'rate', 'units', 'price',
  'components', 'fx', 'quantities', 'rates', 'cnyValue', 'entitlementUnits', 'numerator', 'denominator',
  'fxDate', 'fxSource', 'fromCurrency', 'toCurrency', 'inputPerMillion', 'outputPerMillion',
  'alternatives', 'formula', 'first30Max', 'fullApplyMax',
]);
function publicInputs(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(publicInputs);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => publicInputFields.has(key)).map(([key, input]) => [key, publicInputs(input)]));
  return value;
}

/** Explicit projection prevents legacy/internal keys at any metadata level leaking. */
export function publicSafeValuation(value: unknown): Valuation | null {
  let raw = value;
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { return null; } }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const known = Object.fromEntries(Object.keys(valuationShape).filter(key => key in input).map(key => [key, input[key]]));
  if (Array.isArray(known.sources)) known.sources = known.sources.map(source => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return source;
    const s = source as Record<string, unknown>;
    return { url: s.url, checkedAt: s.checkedAt, excerpt: s.excerpt, priceBasis: s.priceBasis };
  });
  if (known.coverage && typeof known.coverage === 'object') {
    const c = known.coverage as Record<string, unknown>;
    known.coverage = { pricedModels: c.pricedModels, totalModels: c.totalModels, ...(c.days === undefined ? {} : { days: c.days }) };
  }
  const parsed = parseValuation(known);
  return parsed ? { ...parsed, inputs: publicInputs(parsed.inputs) as Record<string, JsonValue> } : null;
}

export function valuationMatchesAmounts(value: Valuation, offer: { usdEstimate?: number | null; usdMax?: number | null }): boolean {
  return value.usdEstimate === (offer.usdEstimate ?? null) && value.usdMax === (offer.usdMax ?? null);
}

/** A checked conclusion closes only the USD gap; eligibility/evidence checks remain active. */
export function valuationClosesUsdGap(value: unknown, offer: { usdEstimate?: number | null; usdMax?: number | null }): boolean {
  const parsed = parseValuation(value);
  return !!parsed && valuationMatchesAmounts(parsed, offer)
    && (parsed.status === 'beta_unpriced' || parsed.status === 'unpriceable'
      || (parsed.period === 'apply_max' && parsed.usdMax !== null));
}

/** Cards and notifications use the same semantics; a whole membership value is not the first-month value. */
export function valuationSummary(offer: { type?: string; valuation?: unknown; usdEstimate?: number | null; usdMax?: number | null }): string {
  const value = parseValuation(offer.valuation);
  const usd = (amount: number) => `$${amount.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
  if (!value || !valuationMatchesAmounts(value, offer)) {
    if (offer.valuation != null) return VALUATION_STATUSES.needs_judgment;
    if (offer.usdEstimate == null) return '';
    return `旧参考值 ${usd(offer.usdEstimate)}${offer.usdMax != null && offer.usdMax > offer.usdEstimate ? `–${usd(offer.usdMax)}` : ''} · 待统一 V1 口径`;
  }
  if (value.method === 'none') return VALUATION_STATUSES[value.status];
  const parts: string[] = [VALUATION_METHODS[value.method]];
  if (value.period === 'apply_max') {
    if (value.usdEstimate !== null) parts.push(`确定金额 ${usd(value.usdEstimate)}`);
    if (value.usdMax !== null) parts.push(`最高可申请 ${usd(value.usdMax)}${value.usdEstimate === null ? '（审批决定，无保底）' : ''}`);
  } else if (value.usdEstimate !== null) {
    parts.push(`${VALUATION_PERIODS[value.period]}${value.method === 'scenario' ? '约 ' : ' '}${usd(value.usdEstimate)}`);
    if (value.usdMax !== null && value.usdMax > value.usdEstimate) parts.push(`权益上限 ${usd(value.usdMax)}`);
  }
  if (value.status === 'provisional') parts.push('暂定');
  return parts.join(' · ');
}
