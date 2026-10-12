import {membershipFactsSchema} from '../membership';
import {sourceFetchSchema} from './fetch-evidence';
import { z } from 'zod';

export const idSchema = z.string().min(1).max(200);
const text = z.string().min(1).max(2000).refine(v => v.normalize('NFKC').trim().length > 0);
const decimal = z.string().min(1).max(120).refine(v => /^\d+(?:\.\d+)?$/.test(v.normalize('NFKC').trim()), 'exact decimal required');
const currency = z.string().max(20).refine(v => /^[A-Z]{3}$/.test(v.normalize('NFKC').trim().toUpperCase()), 'explicit currency required');
const refs = z.array(idSchema).min(1).max(100);
export const revisionSchema = z.number().int().nonnegative();
export const factSchema = <T extends z.ZodType>(value: T) => z.discriminatedUnion('state', [
  z.strictObject({ state: z.literal('known'), value, evidenceRefs: refs }),
  z.strictObject({ state: z.literal('unknown') }),
  z.strictObject({ state: z.literal('not_applicable'), evidenceRefs: refs }),
]);
export type Fact<T> = { state: 'known'; value: T; evidenceRefs: string[] } | { state: 'unknown' } | { state: 'not_applicable'; evidenceRefs: string[] };
export const mechanismSchema = z.enum(['signup_grant','recurring_quota','referral','identity_grant','trial','temporary_free_access','extra_reset','application_grant','other']);
export const cadenceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('once') }),
  z.strictObject({ kind: z.literal('calendar'), unit: z.enum(['day','week','month']), count: z.number().int().positive(), timezone: text.nullable() }),
  z.strictObject({ kind: z.literal('rolling'), seconds: z.number().int().positive() }),
  z.strictObject({ kind: z.literal('per_action'), action: z.enum(['signup','login','referral','verification','other']) }),
]);
export type Cadence = z.infer<typeof cadenceSchema>;
export const canonicalTermsV1Schema = z.strictObject({
  schemaVersion: z.literal('terms-v1'), issuerProductId: factSchema(idSchema), mechanism: factSchema(mechanismSchema),
  benefitPools: z.array(z.strictObject({ poolKey: idSchema,
    amount: factSchema(z.strictObject({ value: decimal, unit: text, currency: currency.nullable() })),
    cadence: factSchema(cadenceSchema), models: factSchema(z.array(text).max(100)), modalities: factSchema(z.array(text).max(30)),
    creditValidity: factSchema(z.strictObject({ kind: z.enum(['duration','absolute','no_expiry']), value: text.nullable() })),
  })).max(40).refine(pools => new Set(pools.map(p => p.poolKey.normalize('NFKC').trim())).size === pools.length, 'duplicate pools'),
  eligibility: factSchema(z.strictObject({ audience: z.enum(['new','old','all']), requirements: z.array(text).max(100) })),
  geography: factSchema(z.array(text).max(100)), claimChannels: factSchema(z.array(text).max(100)),
  costs: factSchema(z.strictObject({ upfrontAmount: decimal, currency, subscriptionRequired: z.boolean(), autoRenewal: z.boolean().nullable() })),
  claimWindow: factSchema(z.strictObject({ startsAt: text.nullable(), endsAt: text.nullable(), timezone: text.nullable() })),
  occurrenceAnchor: factSchema(text),
});
export const canonicalTermsV2Schema = canonicalTermsV1Schema.extend({schemaVersion:z.literal('terms-v2'),membership:factSchema(membershipFactsSchema)});
export const canonicalTermsSchema = z.discriminatedUnion('schemaVersion',[canonicalTermsV1Schema,canonicalTermsV2Schema]);
export type CanonicalTerms = z.infer<typeof canonicalTermsSchema>;
// Compatibility name retained for existing callers; historical V1 schema stays immutable.
export type CanonicalTermsV1 = CanonicalTerms;
export type CanonicalTermsV2 = z.infer<typeof canonicalTermsV2Schema>;
export const evidenceContextSchema = z.strictObject({ observationId: idSchema, fullText: z.string().max(250000), truncated: z.boolean(), sourceVerified: z.boolean(), quoteById: z.record(idSchema, z.string().min(1).max(20000)), differentEntityIds: z.array(idSchema).max(40).optional(), confirmedEntityId: idSchema.optional(), revokedEntityIds:z.array(idSchema).max(40).optional() });
export type EvidenceContext = z.infer<typeof evidenceContextSchema>;
export const versionedEntitySchema = z.strictObject({ id: idSchema, platformId: idSchema, revision: revisionSchema, publicationRevision: revisionSchema, approvedVersionId: idSchema.nullable(), terms: canonicalTermsSchema.nullable() });
export type VersionedEntity = z.infer<typeof versionedEntitySchema>;
export const resolutionResultSchema = z.strictObject({ relation: z.enum(['SAME','DISTINCT','UNRESOLVED']), entityId: idSchema.nullable(), termsRelation: z.enum(['EQUIVALENT','CHANGED','INSUFFICIENT']), matchingVersionId: idSchema.nullable(), evidenceRefs: z.array(idSchema).max(100), conflicts: z.array(z.strictObject({ field: text, before: z.json(), after: z.json(), evidenceRefs: z.array(idSchema).max(100) })).max(100), reasonCodes: z.array(text).max(100), retrievalComplete: z.boolean(), resolverVersion: text, rulesVersion: text });
export type ResolutionResult = z.infer<typeof resolutionResultSchema>;
export type IdentityRelation = ResolutionResult['relation'];
export type TermsRelation = ResolutionResult['termsRelation'];
export const intakeReceiptSchema = z.strictObject({ inputId: idSchema, candidateId: idSchema, entityRevision:revisionSchema.nullable().optional(), canonicalOfferId: idSchema.nullable(), entityId: idSchema.nullable(), versionId: idSchema.nullable(), decisionId: idSchema.nullable(), taskId: idSchema.nullable(), outcome: z.enum(['duplicate_approved','duplicate_pending','duplicate_rejected','created_pending','proposed_update','needs_identity_review','evidence_reopen','deferred']), retryable: z.boolean(), reasonCodes: z.array(text).max(100) });
export type IntakeReceipt = z.infer<typeof intakeReceiptSchema>;
export interface RetrievalPage { entities: VersionedEntity[]; nextCursor: string | null; complete: boolean; decisions: ReviewDecision[] }
export interface MutationResult<T> { status: 'applied' | 'replayed' | 'conflict'; value: T | null }
export const decisionScopeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('observation_only'), observationId: idSchema }),
  z.strictObject({ kind: z.literal('claim'), candidateId: idSchema }),
  z.strictObject({ kind: z.literal('exact_version'), entityId: idSchema, versionId: idSchema }),
  z.strictObject({ kind: z.literal('entity_alias'), entityId: idSchema }),
  z.strictObject({ kind: z.literal('occurrence'), productId: idSchema, anchor: text }),
  z.strictObject({ kind: z.literal('scoped_mechanism'), productId: idSchema, mechanism: mechanismSchema, confirmedBy: idSchema }),
]);
export const reopenPolicySchema = z.strictObject({ kind: z.enum(['manual','missing_facts','new_occurrence','policy_change','correct_product']), missingFacts: z.array(text).max(100), reviewedBasisHashes:z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(100).optional() });
export const reviewDecisionSchema = z.strictObject({ id: idSchema, entityId: idSchema.nullable(), candidateId: idSchema.nullable(), versionId: idSchema.nullable(), action: z.enum(['approve','reject','same','distinct','reopen','revoke','merge','rollback','edit']), reasonText:z.string().max(4000).optional(), basis:z.json().optional(), reasonCode: z.enum(['duplicate','paid_bundle','ordinary_discount','not_ai','insufficient_evidence','vague','expired','wrong_platform','other']), scope: decisionScopeSchema, reopenPolicy: reopenPolicySchema, rulesVersion: text, evidenceRefs: z.array(idSchema).max(100), actor: idSchema, baseVersionId: idSchema.nullable(), targetVersionId: idSchema.nullable(), idempotencyKey: z.string().min(1).max(600), supersedesId: idSchema.nullable(), createdAt: z.iso.datetime() }).refine(v => v.entityId !== null || v.candidateId !== null, 'decision needs a subject');
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
export const reopenEvaluationSchema = z.strictObject({ allowed: z.boolean(), reasonCodes: z.array(text), basisHash: z.string().regex(/^[a-f0-9]{64}$/).nullable() });
export type ReopenEvaluation = z.infer<typeof reopenEvaluationSchema>;

const webUrlSchema = z.url().max(4000).refine(v => { const u = new URL(v); return ['http:','https:'].includes(u.protocol) && !u.username && !u.password; }, 'HTTP URL without credentials required');
export const observationInputSchema = z.strictObject({ requestId: idSchema, originalUrl: webUrlSchema, finalUrl: webUrlSchema, text: z.string().max(1000000), fetchKind: z.enum(['direct','indirect','unavailable']), sourceId: idSchema.optional(), issuerProductId:idSchema.optional(), observedAt: z.iso.datetime(), truncated: z.boolean().default(false),fetchEvidence:sourceFetchSchema.optional() });
export type ObservationInput = z.input<typeof observationInputSchema>;
export const observationReceiptSchema = z.strictObject({ observationId: idSchema, documentId: idSchema, contentHash: z.string().regex(/^[a-f0-9]{64}$/), truncated: z.boolean(),fetchId:idSchema.optional() });
export type ObservationReceipt = z.infer<typeof observationReceiptSchema>;
export const quoteSchema = z.strictObject({ start: z.number().int().nonnegative(), end: z.number().int().positive(), quote: z.string().min(1).max(20000) }).refine(q => q.end > q.start, 'nonempty span required');
export const candidateInputSchema = z.strictObject({ inputId: idSchema, mechanismHint: mechanismSchema.optional(), span: quoteSchema, quotes: z.array(quoteSchema.safeExtend({id:idSchema})).min(1).max(100), rawCandidate: z.json().refine(v => JSON.stringify(v).length <= 400000, 'candidate too large'), facts: canonicalTermsSchema });
export const candidateBatchInputSchema = z.strictObject({ requestId: idSchema, observationId: idSchema, sourceFetchId:idSchema.optional(), extractionVersion: idSchema, extractionComplete: z.boolean(), nonBenefitEvidence: quoteSchema.optional(), leadIds: z.array(z.number().int().positive()).max(10).default([]), candidates: z.array(candidateInputSchema).max(10) }).refine(v => new Set(v.candidates.map(c => c.inputId)).size === v.candidates.length, 'inputId must be unique within a batch').refine(v => JSON.stringify(v).length <= 1000000, 'candidate batch too large');
export type CandidateBatchInput = z.input<typeof candidateBatchInputSchema>;
export type CandidateInput = z.infer<typeof candidateInputSchema>;

export type {MergePlan,MergePreviewInput,MergeReceipt,RollbackReceipt} from './history-types';
