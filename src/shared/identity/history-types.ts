import {z} from 'zod';
import {canonicalTermsSchema} from './types';
export const historyEnvironment=z.enum(['synthetic','redacted_local']);
export const historyContextSchema=z.strictObject({environment:historyEnvironment,sourceDatabaseId:z.string().min(1).max(200),sourceCodeSha:z.string().regex(/^[0-9a-f]{40}$/),approvedBy:z.string().min(1).max(200)});
export type HistoryContext=z.infer<typeof historyContextSchema>;
export const legacyTables=['offers','leads','rejected_offer_updates','offer_proposals','reviews','offer_revisions','notifications','deliveries'] as const;
export type LegacyTable=typeof legacyTables[number];
export type LegacyRow=Record<string,string|number|null>;
const rows=z.array(z.record(z.string(),z.union([z.string(),z.number(),z.null()]))).max(50000);
export const snapshotSchema=z.strictObject({schemaVersion:z.literal('identity-snapshot-v1'),context:historyContextSchema,snapshotHash:z.string().regex(/^[0-9a-f]{64}$/),tables:z.strictObject({offers:rows,leads:rows,rejected_offer_updates:rows,offer_proposals:rows,reviews:rows,offer_revisions:rows,notifications:rows,deliveries:rows}),confirmedFacts:z.record(z.string(),z.strictObject({facts:canonicalTermsSchema,reviewedBy:z.string().min(1),evidence:z.string().min(8)})).default({})});
export type IdentitySnapshot=z.infer<typeof snapshotSchema>;
export const mergePreviewInputSchema=z.strictObject({environment:historyEnvironment,snapshotHash:z.string().regex(/^[0-9a-f]{64}$/),sourceCodeSha:z.string().regex(/^[0-9a-f]{40}$/),groups:z.array(z.strictObject({entityIds:z.array(z.string().min(1)).min(2).max(100),canonicalEntityId:z.string().min(1),canonicalReason:z.string().min(8),evidence:z.strictObject({relation:z.enum(['same','distinct','unresolved']),author:z.string().min(1),quote:z.string().min(8).max(20000),sourceUrls:z.array(z.url()).min(1).max(20)})})).min(1).max(100)});
export type MergePreviewInput=z.infer<typeof mergePreviewInputSchema>;
export interface MergeConflict {code:string;ids:string[];detail:string}
export interface EntityManifest {entity:LegacyRow;offer:LegacyRow|null;versions:LegacyRow[];tasks:LegacyRow[];aliases:LegacyRow[];decisions:LegacyRow[];observations:LegacyRow[];proposals:LegacyRow[];reviews:LegacyRow[];revisions:LegacyRow[];notifications:LegacyRow[];deliveries:LegacyRow[];leads:LegacyRow[];constraints:LegacyRow[];stateHash:string}
export interface MergeGroupPlan {id:string;entityIds:string[];canonicalEntityId:string;canonicalOfferId:string|null;canonicalReason:string;evidence:MergePreviewInput['groups'][number]['evidence'];status:'ready'|'conflict'|'oversized';conflicts:MergeConflict[];expected:EntityManifest[];beforeManifest:Record<string,unknown>;afterManifest:Record<string,unknown>;notificationImpact:{sent:string[];pending:string[];unknown:string[]};publicChange:{before:string[];after:string[]};estimatedWrites:number;executionOrder:string[];rollbackImpact:string[]}
export interface MergePlan {schemaVersion:'identity-merge-plan-v1';environment:HistoryContext['environment'];snapshotHash:string;sourceCodeSha:string;resolverVersion:string;rulesVersion:string;scanCursor:null;highWaterMarks:Record<string,string|null>;counts:Record<string,number>;groups:MergeGroupPlan[];conflicts:MergeConflict[];estimatedWrites:number;planHash:string}
