// 羊毛数据规格：每个字段喂给网站哪些栏目、审核时缺了会怎样。
// 服务器审核（能否通过）、审批卡片（上架前检查）、采集抽取（要填哪些字段）共用这一份，保证“一条羊毛审一次，所有栏目都对”。
// 对照表见 docs/data-contract.md。
import { isLimited, liveStatus, type OfferType } from './lifecycle';
import { parseValuation, valuationClosesUsdGap, valuationMatchesAmounts } from './valuation';

/** 受控标签：不新增类型，用标签表达横切的特征。 */
export const TAGS = {
  reset: '额度重置',
  referral: '邀请奖励',
  discount: '首月 / 限时折扣',
  daily: '每日刷新',
} as const;
export type Tag = keyof typeof TAGS;

/** 网站和推送里会用到羊毛字段的地方。 */
export const SECTIONS = {
  today: '今天（羊群、总价值、倒计时）',
  calendar: '日历',
  timeline: '时间线',
  all: '全部羊毛（筛选、排序）',
  library: '常驻额度库',
  apply: '申请制',
  models: '按模型找',
  insights: '洞察（四象限、谁最大方、大方榜、每周新增）',
  graves: '羊毛墓场',
  resetClock: '重置时钟',
  holidays: '节日提醒（往年发过）',
  platform: '平台页（雷达、发放历史）',
  detail: '详情页',
  mine: '我的（条件筛选、本月进度）',
  score: '薅度分',
  push: '飞书日报 / Telegram / RSS',
} as const;
export type Section = keyof typeof SECTIONS;

export type Level = 'block' | 'warn' | 'info';
export interface SpecIssue { field: string; label: string; level: Level; problem: string; sections: Section[] }

export interface SpecInput {
  type: OfferType;
  title: string;
  valueText: string;
  usdEstimate?: number | null;
  usdMax?: number | null;
  valuation?: unknown;
  claimStart?: string | null;
  claimEnd?: string | null;
  endKind: 'date' | 'unknown' | 'standing';
  sourceTz: string;
  requirements: string[];
  audience?: string | null;
  creditValidity?: string | null;
  models?: string[];
  tags?: string[];
  steps?: string[];
  publishedAt?: string | null;
  withdrawnAt?: string | null;
  lastVerifiedAt?: string | null;
  discoveredAt?: string | null;
  evidence: { tier: string; excerpts?: { benefit?: string; eligibility?: string; validity?: string } };
}

const CJK = /[一-鿿]/;
const englishOnly = (s: string) => !!s && !CJK.test(s) && (s.match(/[A-Za-z]{2,}/g) ?? []).length >= 3;
// 额度里点名了具体模型，但 models 是空的：“按模型找”就看不到它
const MODEL_NAME = /\b(GLM|Gemini|Gemma|Claude|Sonnet|Opus|Haiku|GPT|o3|o4|Qwen|DeepSeek|MiniMax|Kimi|Llama|Grok|Mistral|Codestral|MiMo|Nemotron|LongCat|ERNIE|Doubao|Seedance|Seedream|Kling|Veo|Hunyuan|Hy ?Image|FLUX|Flux|Wan|CogView|CogVideo|Big Pickle|Space Bunny|Ling)[\s-]?[\w.]*/;

/**
 * 检查一条羊毛的字段是否齐全。
 * block：不能通过（会让某些栏目算错或显示错）；warn：能通过，但列出的栏目会少数据；info：可选。
 */
export function checkOffer(o: SpecInput, now = new Date()): SpecIssue[] {
  const out: SpecIssue[] = [];
  const add = (field: string, label: string, level: Level, problem: string, sections: Section[]) => out.push({ field, label, level, problem, sections });
  const limited = isLimited(o.type);
  const st = liveStatus({ type: o.type, claimStart: o.claimStart ?? null, claimEnd: o.claimEnd ?? null, endKind: o.endKind, sourceTz: o.sourceTz, lastVerifiedAt: o.lastVerifiedAt ?? now.toISOString(), withdrawnAt: o.withdrawnAt ?? null }, now);
  const tags = o.tags ?? [];

  if (!o.title?.trim()) add('title', '标题', 'block', '没有标题', ['all', 'detail', 'push']);
  else if (englishOnly(o.title)) add('title', '标题', 'warn', '标题是整句英文，要写中文（产品名、模型名可保留英文）', ['all', 'detail', 'push']);
  if (!o.valueText?.trim()) add('valueText', '额度', 'block', '没有额度描述', ['all', 'detail', 'push']);
  else if (englishOnly(o.valueText)) add('valueText', '额度', 'warn', '额度是整句英文，要写中文', ['detail', 'push']);

  if (o.requirements.includes('unknown')) add('requirements', '门槛', 'block', '门槛写的是“待确认”，要按官方原文写清', ['mine', 'all', 'score', 'insights', 'push']);

  const valuation = parseValuation(o.valuation);
  if (o.valuation != null && (!valuation || !valuationMatchesAmounts(valuation, o))) add('valuation', '估值依据', 'block', '估值元数据无效或与美元字段不一致，请核对金额、状态与规则版本', ['all', 'insights', 'detail', 'score']);
  if (o.usdEstimate == null && !valuationClosesUsdGap(o.valuation, o)) add('usdEstimate', '折合美元', 'warn', '美元参考价值待核实，不计入金额排名和合计，评分仅使用已知维度',
    o.type === 'apply' ? ['apply', 'score'] : o.type === 'standing' ? ['today', 'library', 'insights', 'score', 'mine'] : ['today', 'calendar', 'insights', 'score', 'mine']);

  if (limited) {
    if (!o.claimStart) {
      if (st === 'ended') add('claimStart', '领取开始', 'block', '已结束的活动必须有开始日期，否则墓场的存活天数、日历和时间线都没法定位', ['graves', 'calendar', 'timeline', 'insights', 'platform']);
      else add('claimStart', '领取开始', 'warn', '没有开始日期，日历和时间线从系统发现那天算起', ['calendar', 'timeline', 'platform']);
    }
    if (o.endKind !== 'date' || !o.claimEnd) {
      if (o.withdrawnAt) { /* 官方撤回的以撤回时间为结束 */ }
      else add('claimEnd', '领取截止', 'warn', '截止未知：没有倒计时、即将结束和加急推送，日历上不画结束点', ['today', 'calendar', 'timeline', 'push']);
    }
  }

  // 只对“模型本身免费”的类型提醒；折扣、订阅、邀请等条目提到模型名不代表模型免费
  const freeKind = ['free', 'standing', 'new', 'trial', 'gift'].includes(o.type) && !tags.includes('discount') && !tags.includes('referral');
  if (freeKind && !(o.models?.length) && MODEL_NAME.test(`${o.title} ${o.valueText}`)) add('models', '免费模型', 'warn', '额度里提到了具体模型，但没有填免费模型，“按模型找”里看不到', ['models']);
  if (tags.includes('reset') && !o.publishedAt) add('publishedAt', '发布时间', 'warn', '额度重置要填官方发布时间（精确到时刻），重置时钟才能统计', ['resetClock']);
  if (o.audience === 'unclear') add('audience', '适用对象', 'warn', '没写清谁能领，详情页和推送会写“官方未写明适用对象”', ['detail', 'push']);
  if (o.evidence.tier === 'media') add('evidence', '证据级别', 'block', '证据是媒体或社区转述，不能上架：核实发放方官方页面后改成官方级别，或亲测后用“管理员实测”', ['detail', 'score', 'push']);
  if (o.evidence.tier !== 'tested' && !o.evidence.excerpts?.benefit?.trim()) add('evidence', '官方原文', 'warn', '没有权益原文摘录，详情页和推送少了“官方原文”', ['detail', 'push']);
  if (!o.creditValidity && o.type !== 'standing' && o.type !== 'apply') add('creditValidity', '额度有效期', 'info', '领取后多久失效没写，显示“官方未写明”', ['detail', 'push']);
  if (!(o.steps?.length)) add('steps', '领取步骤', 'info', '没写领取步骤，按领取方式显示通用步骤', ['detail', 'push']);
  return out;
}

export const blocking = (issues: SpecIssue[]) => issues.filter(i => i.level === 'block');

/** 已通过条目只有这些业务字段变化才需要复核；见 data-contract.md 第二节。 */
export const REVIEW_FIELDS = [
  'platformId', 'title', 'type', 'valueText', 'requirements', 'usdEstimate', 'usdMax', 'valuation',
  'claimStart', 'claimEnd', 'endKind', 'sourceTz', 'models', 'tags', 'publishedAt',
  'modalities', 'claimMethod', 'audience',
] as const;
export const isReviewField = (field: string) => (REVIEW_FIELDS as readonly string[]).includes(field);

const normalizeReviewValue = (value: unknown): unknown => {
  if (typeof value === 'string') return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (Array.isArray(value)) return [...new Set(value.map(normalizeReviewValue))].sort();
  return value ?? null;
};
export function reviewChanges(before: object, after: object) {
  const previous = before as Record<string, unknown>, next = after as Record<string, unknown>;
  return REVIEW_FIELDS.filter(field => JSON.stringify(normalizeReviewValue(previous[field])) !== JSON.stringify(normalizeReviewValue(next[field])))
    .map(field => ({ field, from: previous[field] ?? null, to: next[field] ?? null }));
}
