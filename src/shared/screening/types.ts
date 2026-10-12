import { z } from 'zod';

export const REASON_CATEGORIES = ['relay_station', 'account_pool', 'non_ai', 'personal_giveaway', 'paid_bundle', 'ordinary_discount', 'model_news_only', 'expired', 'duplicate', 'wrong_platform', 'unverifiable', 'other'] as const;
export type ReasonCategory = (typeof REASON_CATEGORIES)[number];

const categorySet = new Set<string>(REASON_CATEGORIES);

export function reasonCategoryFromCode(code: string | null): ReasonCategory {
  if (!code) return 'other';
  if (categorySet.has(code)) return code as ReasonCategory;
  if (code === 'not_ai') return 'non_ai';
  if (code === 'vague' || code === 'insufficient_evidence') return 'unverifiable';
  if (code === 'paid_bundle' || code === 'ordinary_discount' || code === 'wrong_platform' || code === 'duplicate' || code === 'expired') return code;
  return 'other';
}

const REVIEW_REASON_CODES = ['duplicate', 'paid_bundle', 'ordinary_discount', 'not_ai', 'insufficient_evidence', 'vague', 'expired', 'wrong_platform', 'other'] as const;
export type ReviewReasonCode = (typeof REVIEW_REASON_CODES)[number];

export function reasonCodeForCategory(c: ReasonCategory): ReviewReasonCode {
  if (c === 'non_ai') return 'not_ai';
  if (c === 'unverifiable') return 'insufficient_evidence';
  if (c === 'duplicate' || c === 'paid_bundle' || c === 'ordinary_discount' || c === 'expired' || c === 'wrong_platform') return c;
  return 'other';
}

export const urgencyTierSchema = z.enum(['P0', 'P1', 'P2', 'P3']);
export const urgencySignalSchema = z.enum(['deadline', 'same_day_one_time', 'quantity_limited', 'reset_event', 'limited_time_unknown_date']);
export const urgencyResultSchema = z.object({
  tier: urgencyTierSchema,
  deadline: z.string().nullable(),
  signals: z.array(urgencySignalSchema),
  quote: z.string().nullable(),
});
export type UrgencyResult = z.infer<typeof urgencyResultSchema>;

export const screeningVerdictSchema = z.object({
  verdict: z.enum(['duplicate_published', 'duplicate_pending', 'duplicate_rejected', 'rejected_by_rule', 'not_a_perk', 'update_to_published', 'new_candidate', 'unsure']),
  matchId: z.string().nullable(),
  ruleId: z.string().nullable(),
  reasonCategory: z.enum(REASON_CATEGORIES).nullable(),
  occurrenceCheck: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  evidenceQuote: z.string(),
  explanation: z.string(),
  urgency: urgencyResultSchema,
});
export type ScreeningVerdict = z.infer<typeof screeningVerdictSchema>;

export const screeningModeSchema = z.enum(['off', 'shadow', 'suggest', 'auto']);
export type ScreeningMode = z.infer<typeof screeningModeSchema>;

export function screeningMode(env: { SCREENING_MODE?: string }): ScreeningMode {
  const parsed = screeningModeSchema.safeParse(env.SCREENING_MODE);
  return parsed.success ? parsed.data : 'off';
}

export const memoryRecordSchema = z.object({
  ref: z.string(),
  kind: z.enum(['offer', 'lead']),
  platformId: z.string().nullable(),
  origin: z.string().nullable(),
  title: z.string(),
  valueText: z.string().nullable(),
  type: z.string().nullable(),
  claimStart: z.string().nullable(),
  claimEnd: z.string().nullable(),
  sourceTz: z.string().nullable(),
  evidenceUrl: z.string().nullable(),
  urlKey: z.string().nullable(),
  benefitExcerpt: z.string().nullable(),
  decision: z.enum(['approved', 'ended', 'pending', 'rejected', 'linked']),
  linkedOfferId: z.string().nullable(),
  reasonCategory: z.enum(REASON_CATEGORIES).nullable(),
  actorKind: z.enum(['owner', 'model', 'unknown']),
  recurring: z.boolean(),
  decidedAt: z.string().nullable(),
});
export type MemoryRecord = z.infer<typeof memoryRecordSchema>;

export const screeningRuleSchema = z.object({
  id: z.string(),
  kind: z.enum(['title_pattern', 'semantic']),
  scopeKind: z.enum(['global', 'platform', 'source', 'origin']),
  scopeValue: z.string().nullable(),
  category: z.enum(REASON_CATEGORIES),
  description: z.string(),
  pattern: z.string().nullable(),
  status: z.enum(['proposed', 'active', 'retired', 'declined']),
});
export type ScreeningRule = z.infer<typeof screeningRuleSchema>;

export const platformProfileSchema = z.object({
  platformId: z.string(),
  channels: z.array(z.object({
    url: z.string(),
    kind: z.enum(['announcement', 'pricing', 'docs', 'changelog', 'rss', 'x', 'wechat', 'other']),
    approvedEvidenceCount: z.number(),
  })),
  patterns: z.array(z.object({ text: z.string(), since: z.string().nullable() })),
  pitfalls: z.array(z.object({ text: z.string(), since: z.string().nullable() })),
  cadence: z.array(z.object({
    sourceId: z.string().nullable(),
    medianDaysBetweenPerks: z.number().nullable(),
    lastChangeAt: z.string().nullable(),
  })),
  fieldEditRates: z.record(z.string(), z.number()),
  quicklyExhausted: z.boolean(),
  revision: z.number(),
});
export type PlatformProfile = z.infer<typeof platformProfileSchema>;

export const calibrationSchema = z.object({
  model: z.string(),
  closeThreshold: z.number(),
  newThreshold: z.number(),
  sampleSize: z.number(),
  closePrecision: z.number(),
  wrongNewRate: z.number(),
  recurringFalseCloses: z.number(),
  status: z.enum(['proposed', 'active', 'retired']),
});
export type Calibration = z.infer<typeof calibrationSchema>;

export const memorySnapshotSchema = z.object({
  generatedAt: z.string(),
  records: z.array(memoryRecordSchema),
  rules: z.array(screeningRuleSchema),
  profiles: z.array(platformProfileSchema),
  calibrations: z.array(calibrationSchema),
});
export type MemorySnapshot = z.infer<typeof memorySnapshotSchema>;
