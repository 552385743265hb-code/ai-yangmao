// 写入接口的数据校验。采集管线（GitHub Actions）和网站共用这一份。
import { z } from 'zod';
import { OFFER_TYPES } from './lifecycle';

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').refine(value => {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}, '日期不存在');
const REQ = /^(none|unknown|phone|card|net|realname|biz|student|invite|targeted|pay:.+|member:.+)$/;

export const leadIn = z.object({
  origin: z.enum(['aihot', 'email', 'sweep', 'manual', 'telegram', 'hn', 'reddit', 'discord', 'media', 'linuxdo', 'ithome', 'v2ex']),
  url: z.url(),
  title: z.string().max(300).optional(),
  raw: z.string().max(20000).optional(),
});

export const offerIn = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,80}$/, 'id 只能用小写字母、数字和短横线'),
  platformId: z.string().min(1),
  sourceId: z.string().optional(),
  title: z.string().min(2).max(120),
  type: z.enum(OFFER_TYPES),
  modalities: z.array(z.enum(['text', 'code', 'image', 'video', 'audio'])).min(1),
  tags: z.array(z.enum(['reset', 'referral', 'discount', 'daily'])).max(8).default([]),
  // 免费可用的具体模型名（官方写法），没有就空数组
  models: z.array(z.string().trim().min(1).max(80)).max(80).default([]),
  claimMethod: z.enum(['auto', 'signup', 'app', 'form', 'topup', 'member', 'code']),
  requirements: z.array(z.string().regex(REQ)).min(1),
  audience: z.enum(['new', 'old', 'all', 'unclear']).default('unclear'),
  valueText: z.string().min(1).max(200),
  usdEstimate: z.number().nonnegative().nullable().optional(),
  usdMax: z.number().nonnegative().nullable().optional(),
  claimStart: isoDate.nullable().optional(),
  claimEnd: isoDate.nullable().optional(),
  endKind: z.enum(['date', 'unknown', 'standing']),
  creditValidity: z.string().max(100).nullable().optional(),
  sourceTz: z.string().refine(tz => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; } }, '无效的时区'),
  publishedAt: z.string().nullable().optional(),
  firstChannel: z.string().max(40).optional(),
  leadId: z.number().int().optional(),
  steps: z.array(z.string().max(200)).max(10).default([]),
  evidence: z.object({
    url: z.url(),
    // media：媒体或社区转述，永远需要人工核对官方原文
    // tested：管理员亲自领到过（官方只在客户端里提示、网上没有公告时用），只能在后台人工设置，采集管线不能写入
    tier: z.enum(['site', 'docs', 'official', 'staff', 'media', 'tested']),
    capturedAt: z.string(),
    pageHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    excerpts: z.object({ benefit: z.string().optional(), eligibility: z.string().optional(), claim: z.string().optional(), validity: z.string().optional() }),
  }),
}).refine(o => o.endKind !== 'date' || !!o.claimEnd, { message: 'endKind=date 时必须有 claimEnd', path: ['claimEnd'] })
  .refine(o => o.usdMax == null || (o.usdEstimate != null && o.usdMax >= o.usdEstimate), { message: '价值上限必须不小于保守估值', path: ['usdMax'] })
  .refine(o => !o.claimStart || !o.claimEnd || o.claimStart <= o.claimEnd, { message: '领取开始日期不能晚于截止日期', path: ['claimEnd'] })
  .refine(o => (o.type === 'standing' || o.type === 'apply') === (o.endKind === 'standing'), { message: '常驻额度和申请制的 endKind 必须为 standing，其他类型不能是 standing', path: ['endKind'] });

export const runIn = z.object({
  kind: z.enum(['collect', 'verify', 'sweep', 'digest', 'health', 'model']),
  startedAt: z.string(),
  finishedAt: z.string(),
  ok: z.boolean(),
  stats: z.record(z.string(), z.unknown()).default({}),
  tokens: z.number().int().nonnegative().default(0),
  costCny: z.number().nonnegative().default(0),
});

export type LeadIn = z.infer<typeof leadIn>;
export type OfferIn = z.infer<typeof offerIn>;
