// 写入接口的数据校验。采集管线（GitHub Actions）和网站共用这一份。
import { z } from 'zod';
import { OFFER_TYPES } from './lifecycle';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD');
const REQ = /^(none|phone|card|net|realname|biz|student|invite|targeted|pay:.+|member:.+)$/;

export const leadIn = z.object({
  origin: z.enum(['aihot', 'email', 'sweep', 'manual', 'telegram', 'hn', 'reddit', 'discord', 'media']),
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
  claimMethod: z.enum(['auto', 'signup', 'app', 'form', 'topup', 'member', 'code']),
  requirements: z.array(z.string().regex(REQ)).min(1),
  audience: z.enum(['new', 'old', 'all', 'unclear']).default('unclear'),
  valueText: z.string().min(1).max(200),
  usdEstimate: z.number().nonnegative().nullable().optional(),
  claimStart: isoDate.nullable().optional(),
  claimEnd: isoDate.nullable().optional(),
  endKind: z.enum(['date', 'unknown', 'standing']),
  creditValidity: z.string().max(100).nullable().optional(),
  sourceTz: z.string().refine(tz => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; } }, '无效的时区'),
  publishedAt: z.string().nullable().optional(),
  firstChannel: z.string().max(40).optional(),
  steps: z.array(z.string().max(200)).max(10).default([]),
  evidence: z.object({
    url: z.url(),
    tier: z.enum(['site', 'docs', 'official', 'staff']),
    capturedAt: z.string(),
    excerpts: z.object({ benefit: z.string().optional(), eligibility: z.string().optional(), claim: z.string().optional(), validity: z.string().optional() }),
  }),
}).refine(o => o.endKind !== 'date' || !!o.claimEnd, { message: 'endKind=date 时必须有 claimEnd', path: ['claimEnd'] })
  .refine(o => (o.type === 'standing' || o.type === 'apply') === (o.endKind === 'standing'), { message: '常驻额度和申请制的 endKind 必须为 standing，其他类型不能是 standing', path: ['endKind'] });

export const runIn = z.object({
  kind: z.enum(['collect', 'verify', 'sweep', 'digest', 'health']),
  startedAt: z.string(),
  finishedAt: z.string(),
  ok: z.boolean(),
  stats: z.record(z.string(), z.unknown()).default({}),
  tokens: z.number().int().nonnegative().default(0),
  costCny: z.number().nonnegative().default(0),
});

export type LeadIn = z.infer<typeof leadIn>;
export type OfferIn = z.infer<typeof offerIn>;
