import {matchesEntityOfferVersion,differentCanonicalEntities} from './canonical';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as tables from '../../db/schema';
import { offerIn,type OfferIn } from '../../shared/ingest';
import { publicationError,validateStoredOffer } from '../publication';
import { canonicalTermsSchema,resolutionResultSchema,decisionScopeSchema,reopenPolicySchema,intakeReceiptSchema,reviewDecisionSchema,type IntakeReceipt,type CanonicalTermsV1,type ResolutionResult,type EvidenceContext,type VersionedEntity } from '../../shared/identity/types';
import { compareCandidate,evidenceGrounded,factSlots,RESOLVER_VERSION,RULES_VERSION } from '../../shared/identity/compare';
import { decisionApplies,evaluateReopen,reviewTaskKey } from '../../shared/identity/decision-policy';
import { hashTerms,sha256,stableJson } from '../../shared/identity/normalize';
import { IdentityStore,IdentityError,readReviewDecision } from './store';
import { MutationBuilder,commitIdentityMutation,readIdentityReceipt,type Binding,type ExpectedRevision } from './commit';
type OfferRow=typeof tables.offers.$inferSelect;
type CandidateRow={id:string;observation_id:string;facts_json:string;facts_hash:string;raw_candidate_json:string;receipt_json:string|null;revision:number;entity_id:string|null;state:string;last_error:string|null};
type EntityRow={routing_generation?:number;id:string;platform_id:string;canonical_offer_id:string|null;business_revision:number;publication_revision:number;current_approved_version_id:string|null};
type TaskRow={id:string;task_key:string;kind:string;entity_id:string|null;version_id:string|null;base_version_id:string|null;state:string;revision:number;material_revision:number;decision_id:string|null;lease_context_json?:string|null};
type ResolutionControl={task:TaskRow;actor:string;action:'same'|'new';reason?:string;facts?:CanonicalTermsV1;entityId?:string};
const decisionInput=z.strictObject({requestId:z.string().min(1).max(200),expectedRevision:z.number().int().nonnegative(),action:z.enum(['approve','reject']),actor:z.string().min(1),role:z.enum(['admin','reviewer']),reasonCode:reviewDecisionSchema.shape.reasonCode.optional(),reason:z.string().max(2000).optional(),scope:decisionScopeSchema.optional(),reopenPolicy:reopenPolicySchema.optional()});
export type TaskDecisionInput=z.infer<typeof decisionInput>;
const columns:Record<string,string>={platformId:'platform_id',title:'title',type:'type',modalities:'modalities',models:'models',tags:'tags',claimMethod:'claim_method',requirements:'requirements',audience:'audience',valueText:'value_text',usdEstimate:'usd_estimate',usdMax:'usd_max',valuation:'valuation',claimStart:'claim_start',claimEnd:'claim_end',endKind:'end_kind',creditValidity:'credit_validity',sourceTz:'source_tz',publishedAt:'published_at',steps:'steps',evidence:'evidence',sourceId:'source_id',firstChannel:'first_channel'};
function offerValues(value:OfferIn):Record<string,Binding> {
 const data:Record<string,Binding>={};for(const [field,column]of Object.entries(columns)) {const v=(value as unknown as Record<string,unknown>)[field];if(v!==undefined)data[column]=v!==null&&typeof v==='object'?JSON.stringify(v):v as Binding;}
 return data;
}
function displayFromRaw(raw:string):OfferIn|null {
 const value=JSON.parse(raw) as {candidate?:unknown};const parsed=offerIn.safeParse(value.candidate);
 if(!parsed.success||parsed.data.evidence.tier==='tested')return null;
 return parsed.data;
}
export class IdentityService {
 private store:IdentityStore;
 constructor(private db:D1Database){this.store=new IdentityStore(db);}
 private async entity(id:string){return this.db.prepare("SELECT * FROM benefit_entities WHERE id=? AND state='active'").bind(id).first<EntityRow>();}
 private async offer(id:string|null):Promise<OfferRow|null>{if(!id)return null;return (await drizzle(this.db,{schema:tables}).select().from(tables.offers).where(eq(tables.offers.id,id)))[0]??null;}
 private async evidence(candidate:CandidateRow):Promise<EvidenceContext> {
  const row=await this.db.prepare('SELECT text,text_truncated,trust_json FROM source_observations WHERE id=?').bind(candidate.observation_id).first<{text:string;text_truncated:number;trust_json:string}>();
  if(!row)throw new IdentityError(409,'candidate observation missing');
  const raw=JSON.parse(candidate.raw_candidate_json) as {quotes?:Array<{id:string;quote:string}>};
  const trust=z.object({sourceVerified:z.boolean(),productId:z.string().nullable()}).parse(JSON.parse(row.trust_json));
  const facts=canonicalTermsSchema.parse(JSON.parse(candidate.facts_json));
  return {observationId:candidate.observation_id,fullText:row.text,truncated:!!row.text_truncated,sourceVerified:trust.sourceVerified&&facts.issuerProductId.state==='known'&&trust.productId===facts.issuerProductId.value,quoteById:Object.fromEntries((raw.quotes??[]).map(q=>[q.id,q.quote]))};
 }
 private async commit<T>(builder:MutationBuilder,expected:ExpectedRevision[],receipt:T):Promise<T>{const result=await commitIdentityMutation(this.db,{...builder.plan(expected,receipt),replayChecked:true});if(result.status==='conflict'||result.value===null)throw new IdentityError(409,'identity revisions changed; retry retrieval');return result.value;}

 async reopenDecision(decisionId:string,raw:{requestId:string;expectedRevision:number;reason:string;basis:{description:string};actor:string}):Promise<{taskId:string;decisionId:string}> {
  const input=z.strictObject({requestId:z.string().min(1).max(200),expectedRevision:z.number().int().nonnegative(),reason:z.string().min(2).max(2000),basis:z.strictObject({description:z.string().min(8).max(4000)}),actor:z.string().min(1)}).parse(raw);
  const command='reopen:'+input.requestId,hash=await sha256(stableJson({decisionId,...input}));
  const prior=await readIdentityReceipt<{taskId:string;decisionId:string}>(this.db,command,hash);if(prior){if(prior.status==='conflict')throw new IdentityError(409,'request payload conflict');return prior.value!;}
  const row=await this.db.prepare('SELECT * FROM review_decisions WHERE id=?').bind(decisionId).first<Record<string,unknown>>();if(!row)throw new IdentityError(404,'decision missing');
  const decision=readReviewDecision(row);if(decision.action!=='reject')throw new IdentityError(400,'only a refusal can be reopened');
  const entity=decision.entityId?await this.entity(decision.entityId):null;
  if(decision.entityId&&!entity)throw new IdentityError(409,'decision belongs to a merged or missing entity; review its canonical activity');
  const basisHash=await sha256(stableJson(input.basis)),taskKey=reviewTaskKey({kind:'evidence_reopen',entityId:decision.entityId??'claim-'+decision.candidateId,refusalDecisionId:decisionId,basisHash});
  const existing=await this.db.prepare('SELECT id,decision_id FROM review_tasks WHERE task_key=? ORDER BY created_at DESC LIMIT 1').bind(taskKey).first<{id:string;decision_id:string|null}>();
  if(existing)return this.commit(new MutationBuilder(this.db,command,hash),[],{taskId:existing.id,decisionId:existing.decision_id??decisionId});
  const candidates=decision.candidateId?await this.db.prepare('SELECT * FROM intake_candidates WHERE id=?').bind(decision.candidateId).all<CandidateRow>():await this.db.prepare('SELECT DISTINCT c.* FROM review_tasks t JOIN task_candidates tc ON tc.task_id=t.id JOIN intake_candidates c ON c.id=tc.candidate_id WHERE t.decision_id=? ORDER BY c.id LIMIT 11').bind(decisionId).all<CandidateRow>();
  if(!candidates.results.length||candidates.results.length>10)throw new IdentityError(409,'reopen requires a bounded original candidate set');
  const currentRevision=entity?.business_revision??candidates.results[0].revision;
  if(currentRevision!==input.expectedRevision)throw new IdentityError(409,'reopen subject changed');
  const builder=new MutationBuilder(this.db,command,hash),expected:ExpectedRevision[]=entity?[{kind:'entity',id:entity.id,revision:entity.business_revision}]:[];
  builder.require('NOT EXISTS(SELECT 1 FROM review_decisions WHERE supersedes_id=?)',[decisionId]);
  const reopenedId=crypto.randomUUID(),taskId=crypto.randomUUID();
  builder.insert('review_decisions',{id:reopenedId,entity_id:decision.entityId,candidate_id:decision.candidateId,version_id:decision.versionId,action:'reopen',reason_code:decision.reasonCode,reason_text:input.reason,basis_json:JSON.stringify(input.basis),scope_json:JSON.stringify(decision.scope),reopen_policy_json:JSON.stringify({kind:'manual',missingFacts:[]}),rules_version:RULES_VERSION,evidence_refs_json:JSON.stringify(decision.evidenceRefs),actor:input.actor,base_version_id:entity?.current_approved_version_id??null,target_version_id:decision.versionId,idempotency_key:command,supersedes_id:decisionId});
  builder.insert('review_tasks',{id:taskId,task_key:taskKey,kind:entity?'evidence_reopen':'identity',entity_id:decision.entityId,version_id:decision.versionId,base_version_id:entity?.current_approved_version_id??null});
  for(const candidate of candidates.results){builder.require('EXISTS(SELECT 1 FROM intake_candidates WHERE id=? AND revision=?)',[candidate.id,candidate.revision]);builder.insert('task_candidates',{task_id:taskId,candidate_id:candidate.id});const receipt=intakeReceiptSchema.parse(JSON.parse(candidate.receipt_json!));Object.assign(receipt,{taskId,decisionId:reopenedId,outcome:'evidence_reopen',retryable:false,reasonCodes:['explicit_admin_reopen']});builder.update('intake_candidates',{state:'pending_identity',task_id:taskId,decision_id:reopenedId,revision:candidate.revision+1,receipt_json:JSON.stringify(receipt)},'id=?',[candidate.id]);builder.assertOwnership('intake_candidates',candidate.id);}
  if(entity)builder.update('benefit_entities',{business_revision:entity.business_revision+1},'id=?',[entity.id]);
  builder.insert('identity_events',{id:crypto.randomUUID(),event_key:`review:${taskId}:1:telegram`,entity_id:decision.entityId,version_id:decision.versionId,task_id:taskId,kind:'review',payload_json:JSON.stringify({taskId,materialRevision:1,channel:'telegram'})});
  return this.commit(builder,expected,{taskId,decisionId:reopenedId});
 }
 async revokeAlias(aliasId:string,raw:{requestId:string;expectedRevision:number;expectedEntityRevision:number;reason:string;actor:string}):Promise<{aliasId:string;decisionId:string}> {
  const input=z.strictObject({requestId:z.string().min(1).max(200),expectedRevision:z.number().int().nonnegative(),expectedEntityRevision:z.number().int().nonnegative(),reason:z.string().min(2).max(2000),actor:z.string().min(1)}).parse(raw);
  const command='alias-revoke:'+input.requestId,hash=await sha256(stableJson({aliasId,...input}));const prior=await readIdentityReceipt<{aliasId:string;decisionId:string}>(this.db,command,hash);if(prior){if(prior.status==='conflict')throw new IdentityError(409,'request payload conflict');return prior.value!;}
  const alias=await this.db.prepare('SELECT * FROM identity_aliases WHERE id=?').bind(aliasId).first<{entity_id:string;revision:number;status:string;scope_key:string;namespace:'legacy_offer_id'|'official_campaign'|'manual';alias_key:string}>();
  if(!alias||alias.status!=='active'||alias.revision!==input.expectedRevision)throw new IdentityError(409,'alias changed');
  const canonical=await this.store.lookupAlias(alias.namespace,alias.alias_key,alias.scope_key);const entity=canonical?await this.entity(canonical):null;if(!entity)throw new IdentityError(409,'alias entity missing');
  const builder=new MutationBuilder(this.db,command,hash),decisionId=crypto.randomUUID();
  builder.require("EXISTS(SELECT 1 FROM identity_aliases WHERE id=? AND revision=? AND status='active')",[aliasId,input.expectedRevision]);
  builder.update('identity_aliases',{status:'revoked',revision:input.expectedRevision+1},'id=?',[aliasId]);
  builder.update('benefit_entities',{business_revision:entity.business_revision+1},'id=?',[entity.id]);
  builder.insert('review_decisions',{id:decisionId,entity_id:entity.id,action:'revoke',reason_code:'other',reason_text:input.reason,basis_json:JSON.stringify({aliasId}),scope_json:JSON.stringify({kind:'entity_alias',entityId:entity.id}),reopen_policy_json:JSON.stringify({kind:'manual',missingFacts:[]}),rules_version:RULES_VERSION,evidence_refs_json:'[]',actor:input.actor,idempotency_key:command});
  const block=await this.db.prepare('SELECT revision FROM identity_blocks WHERE block_key=?').bind(alias.scope_key).first<{revision:number}>();
  const expected:ExpectedRevision[]=[{kind:'entity',id:entity.id,revision:input.expectedEntityRevision}];if(block){expected.push({kind:'block',id:alias.scope_key,revision:block.revision});builder.update('identity_blocks',{revision:block.revision+1},'block_key=?',[alias.scope_key]);}
  return this.commit(builder,expected,{aliasId,decisionId});
 }

 async setVisibility(offerId:string,raw:{requestId:string;expectedOfferVersion:string;action:'unpublish'|'withdraw';reason:string;reasonCode?:string;actor:string}):Promise<{decisionId:string}> {
  const input=z.strictObject({requestId:z.string().min(1).max(200),expectedOfferVersion:z.string().min(1),action:z.enum(['unpublish','withdraw']),reason:z.string().min(2).max(2000),reasonCode:reviewDecisionSchema.shape.reasonCode.optional(),actor:z.string().min(1)}).parse(raw);
  const command='visibility:'+input.requestId,hash=await sha256(stableJson({offerId,...input}));
  const prior=await readIdentityReceipt<{decisionId:string}>(this.db,command,hash);if(prior){if(prior.status==='conflict')throw new IdentityError(409,'request payload conflict');return prior.value!;}
  const entity=await this.db.prepare("SELECT * FROM benefit_entities WHERE canonical_offer_id=? AND state='active'").bind(offerId).first<EntityRow>(),offer=await this.offer(offerId);
  if(!entity||!offer||!matchesEntityOfferVersion(entity,offer.updatedAt,input.expectedOfferVersion)||!entity.current_approved_version_id)throw new IdentityError(409,'visibility version changed');
  const version=await this.db.prepare('SELECT facts_json FROM benefit_versions WHERE id=? AND entity_id=?').bind(entity.current_approved_version_id,entity.id).first<{facts_json:string}>();
  if(!version)throw new IdentityError(409,'approved baseline missing');
  const facts=canonicalTermsSchema.parse(JSON.parse(version.facts_json)),builder=new MutationBuilder(this.db,command,hash),expected:ExpectedRevision[]=[{kind:'entity',id:entity.id,revision:entity.business_revision}];
  builder.require('EXISTS(SELECT 1 FROM offers WHERE id=? AND updated_at=?)',[offerId,input.expectedOfferVersion]);
  const decisionId=crypto.randomUUID(),now=new Date().toISOString();
  builder.insert('review_decisions',{id:decisionId,entity_id:entity.id,version_id:entity.current_approved_version_id,action:input.action==='unpublish'?'reject':'edit',reason_code:input.reasonCode??(input.action==='withdraw'?'expired':'other'),reason_text:input.reason,scope_json:JSON.stringify({kind:'exact_version',entityId:entity.id,versionId:entity.current_approved_version_id}),reopen_policy_json:JSON.stringify({kind:'manual',missingFacts:[]}),rules_version:RULES_VERSION,evidence_refs_json:'[]',actor:input.actor,target_version_id:entity.current_approved_version_id,idempotency_key:command});
  builder.update('offers',input.action==='unpublish'?{review_state:'rejected',updated_at:now}:{withdrawn_at:now,withdrawn_reason:input.reason,updated_at:now},'id=?',[offerId]);
  builder.update('benefit_entities',{business_revision:entity.business_revision+1},'id=?',[entity.id]);
  if(facts.mechanism.state==='known'){const block=entity.platform_id+':'+facts.mechanism.value,revision=(await this.db.prepare('SELECT revision FROM identity_blocks WHERE block_key=?').bind(block).first<{revision:number}>())?.revision??0;expected.push({kind:'block',id:block,revision});builder.insert('identity_blocks',{block_key:block,revision},'nothing');builder.update('identity_blocks',{revision:revision+1},'block_key=?',[block]);}
  builder.insert('reviews',{offer_id:offerId,action:input.action==='unpublish'?'reject':'edit',reviewer:input.actor,reason:input.reason,reason_code:input.reasonCode??'other',decision_id:decisionId});
  builder.insert('offer_revisions',{offer_id:offerId,diff:JSON.stringify([{field:input.action==='unpublish'?'reviewState':'withdrawnAt',from:input.action==='unpublish'?offer.reviewState:offer.withdrawnAt,to:input.action==='unpublish'?'rejected':now}]),author:'admin'});
  return this.commit(builder,expected,{decisionId});
 }

 async editManagedOffer(offerId:string,raw:{requestId:string;taskId?:string;expectedTaskRevision?:number;expectedOfferVersion?:string;fields:Record<string,unknown>;identityFacts?:CanonicalTermsV1;actor:string}):Promise<{taskId:string|null;revision:number;pendingUpdate:boolean}> {
  const input=z.strictObject({requestId:z.string().min(1).max(200),taskId:z.string().optional(),expectedTaskRevision:z.number().int().nonnegative().optional(),expectedOfferVersion:z.string().optional(),fields:z.record(z.string(),z.unknown()),identityFacts:canonicalTermsSchema.optional(),actor:z.string().min(1)}).parse(raw);
  if(Object.keys(input.fields).some(key=>!(key in columns)||key==='platformId'))throw new IdentityError(400,'identity edit requires controlled fields; product corrections need explicit identity resolution');
  const command='edit:'+input.requestId,hash=await sha256(stableJson({offerId,...input}));
  const prior=await readIdentityReceipt<{taskId:string|null;revision:number;pendingUpdate:boolean}>(this.db,command,hash);if(prior){if(prior.status==='conflict')throw new IdentityError(409,'request payload conflict');return prior.value!;}
  const entity=await this.db.prepare("SELECT * FROM benefit_entities WHERE canonical_offer_id=? AND state='active'").bind(offerId).first<EntityRow>(),original=await this.offer(offerId);
  if(!entity||!original)throw new IdentityError(404,'managed offer missing');
  const active=await this.db.prepare("SELECT * FROM review_tasks WHERE entity_id=? AND kind IN ('initial','terms_change','evidence_reopen') AND state IN ('open','checking','manual') ORDER BY created_at DESC LIMIT 2").bind(entity.id).all<TaskRow>();
  if(active.results.length>1)throw new IdentityError(409,'multiple review drafts need explicit conflict resolution');
  const task=active.results[0]??null;
  if(task?(task.id!==input.taskId||task.revision!==input.expectedTaskRevision):!matchesEntityOfferVersion(entity,original.updatedAt,input.expectedOfferVersion))throw new IdentityError(409,'edit version changed');
  const oldVersion=await this.db.prepare('SELECT * FROM benefit_versions WHERE id=? AND entity_id=?').bind(task?.version_id??entity.current_approved_version_id,entity.id).first<{id:string;facts_json:string;display_candidate_json:string;revision:number}>();
  if(!oldVersion)throw new IdentityError(409,'editable fact baseline missing');
  const proposal=await this.db.prepare('SELECT candidate,manual_fields,updated_at FROM offer_proposals WHERE offer_id=?').bind(offerId).first<{candidate:string;manual_fields:string;updated_at:string}>();
  const base=proposal?{...original,...JSON.parse(proposal.candidate)}:task&&!entity.current_approved_version_id?{...original,...JSON.parse(oldVersion.display_candidate_json)}:original;
  const parsed=validateStoredOffer({...base,...input.fields,id:offerId,platformId:entity.platform_id});
  if(!parsed.success)throw new IdentityError(400,'edited offer is invalid');
  let facts=canonicalTermsSchema.parse(input.identityFacts??JSON.parse(oldVersion.facts_json));
  const materialFields=Object.keys(input.fields).filter(key=>!['title','steps','publishedAt','sourceTz','usdEstimate','usdMax','valuation'].includes(key));
  if(!materialFields.length&&!input.identityFacts){
   const builder=new MutationBuilder(this.db,command,hash),expected:ExpectedRevision[]=[{kind:'entity',id:entity.id,revision:entity.business_revision}];
   builder.require('EXISTS(SELECT 1 FROM offers WHERE id=? AND updated_at=?)',[offerId,original.updatedAt]);
   if(task){expected.push({kind:'task',id:task.id,revision:task.revision});builder.update('review_tasks',{revision:task.revision+1,lease_token:null,lease_until:null,state:'manual'},'id=?',[task.id]);}
   if(proposal){builder.require('EXISTS(SELECT 1 FROM offer_proposals WHERE offer_id=? AND updated_at=?)',[offerId,proposal.updated_at]);builder.update('offer_proposals',{candidate:JSON.stringify(parsed.data),updated_at:new Date().toISOString()},'offer_id=?',[offerId]);}
   else builder.update('offers',{...offerValues(parsed.data),updated_at:new Date().toISOString()},'id=?',[offerId]);
   builder.update('benefit_versions',{display_candidate_json:JSON.stringify(parsed.data)},'id=?',[oldVersion.id]);
   builder.update('benefit_entities',{business_revision:entity.business_revision+1},'id=?',[entity.id]);
   builder.insert('offer_revisions',{offer_id:offerId,diff:JSON.stringify(Object.entries(input.fields).map(([field,to])=>({field,from:(base as Record<string,unknown>)[field]??null,to}))),author:'admin'});
   return this.commit(builder,expected,{taskId:task?.id??null,revision:task?task.revision+1:entity.business_revision+1,pendingUpdate:!!proposal});
  }
  // Display edits do not manufacture structured facts. Preserve the rest of the
  // baseline and mark affected slots unknown until an administrator supplies them.
  if(!input.identityFacts&&materialFields.length){const unknown={state:'unknown'} as const;
   if(materialFields.some(k=>['valueText','models','modalities','creditValidity','type','tags'].includes(k)))facts.benefitPools=facts.benefitPools.map(pool=>({...pool,amount:unknown,cadence:unknown,models:unknown,modalities:unknown,creditValidity:unknown}));
   if(materialFields.some(k=>['requirements','audience'].includes(k)))facts.eligibility=unknown;
   if(materialFields.some(k=>['claimStart','claimEnd','endKind'].includes(k)))facts.claimWindow=unknown;
   if(materialFields.includes('claimMethod'))facts.claimChannels=unknown;
  }
  if(facts.issuerProductId.state==='known'&&facts.issuerProductId.value!==entity.platform_id)throw new IdentityError(400,'facts belong to another product');
  const factsHash=await hashTerms(facts),existing=await this.db.prepare("SELECT id FROM benefit_versions WHERE entity_id=? AND terms_hash=? AND terms_schema='terms-v1'").bind(entity.id,factsHash).first<{id:string}>();
  const versionId=existing?.id??crypto.randomUUID(),taskId=task?.id??crypto.randomUUID(),revision=(task?.revision??-1)+1,materialRevision=(task?.material_revision??0)+(materialFields.length||!task?1:0);
  const builder=new MutationBuilder(this.db,command,hash),expected:ExpectedRevision[]=[{kind:'entity',id:entity.id,revision:entity.business_revision}];
  if(task)expected.push({kind:'task',id:task.id,revision:task.revision});
  builder.require('EXISTS(SELECT 1 FROM offers WHERE id=? AND updated_at=?)',[offerId,original.updatedAt]);
  if(proposal)builder.require('EXISTS(SELECT 1 FROM offer_proposals WHERE offer_id=? AND updated_at=? AND candidate=?)',[offerId,proposal.updated_at,proposal.candidate]);
  if(!existing)builder.insert('benefit_versions',{id:versionId,entity_id:entity.id,terms_schema:'terms-v1',terms_hash:factsHash,facts_json:JSON.stringify(facts),display_candidate_json:JSON.stringify(parsed.data),state:'pending',base_version_id:entity.current_approved_version_id});
  else builder.update('benefit_versions',{display_candidate_json:JSON.stringify(parsed.data)},'id=?',[versionId]);
  if(task)builder.update('review_tasks',{version_id:versionId,revision,material_revision:materialRevision,state:'manual',lease_token:null,lease_until:null},'id=?',[taskId]);
  else builder.insert('review_tasks',{id:taskId,task_key:'manual-edit:'+entity.id+':'+versionId,kind:entity.current_approved_version_id?'evidence_reopen':'initial',entity_id:entity.id,version_id:versionId,base_version_id:entity.current_approved_version_id,state:'manual'});
  const diff=Object.entries(input.fields).map(([field,to])=>({field,from:(base as Record<string,unknown>)[field]??null,to}));
  if(entity.current_approved_version_id){
   const fields=[...new Set([...(proposal?JSON.parse(proposal.manual_fields) as string[]:[]),...Object.keys(input.fields)])];
   if(proposal)builder.update('offer_proposals',{candidate:JSON.stringify(parsed.data),diff:JSON.stringify(diff),manual_fields:JSON.stringify(fields),updated_at:new Date().toISOString()},'offer_id=?',[offerId]);
   else builder.insert('offer_proposals',{offer_id:offerId,candidate:JSON.stringify(parsed.data),diff:JSON.stringify(diff),manual_fields:JSON.stringify(fields)});
  } else builder.update('offers',{...offerValues(parsed.data),updated_at:new Date().toISOString()},'id=?',[offerId]);
  builder.update('benefit_entities',{business_revision:entity.business_revision+1},'id=?',[entity.id]);
  builder.insert('offer_revisions',{offer_id:offerId,diff:JSON.stringify(diff),evidence_before:JSON.stringify(original.evidence),evidence_after:JSON.stringify(parsed.data.evidence),author:'admin'});
  builder.insert('reviews',{offer_id:offerId,action:'edit',edited_fields:JSON.stringify(Object.keys(input.fields)),reviewer:input.actor,reason_code:'wrong_field'});
  if(!task||materialFields.length)builder.insert('identity_events',{id:crypto.randomUUID(),event_key:`review:${taskId}:${materialRevision}:telegram`,entity_id:entity.id,version_id:versionId,task_id:taskId,kind:'review',payload_json:JSON.stringify({taskId,materialRevision,channel:'telegram'})});
  builder.assertOwnership('review_tasks',taskId);
  return this.commit(builder,expected,{taskId,revision,pendingUpdate:!!entity.current_approved_version_id});
 }

 private async taskContext(taskId:string):Promise<{candidate:CanonicalTermsV1;entities:VersionedEntity[];evidence:EvidenceContext;retrievalComplete:boolean}> {
  const row=await this.db.prepare('SELECT c.* FROM task_candidates tc JOIN intake_candidates c ON c.id=tc.candidate_id WHERE tc.task_id=? ORDER BY c.id LIMIT 1').bind(taskId).first<CandidateRow>();
  if(!row)throw new IdentityError(409,'task has no model-reviewable candidate; manual review required');
  const candidate=canonicalTermsSchema.parse(JSON.parse(row.facts_json)),evidence=await this.evidence(row);
  const page=candidate.issuerProductId.state==='known'?await this.store.retrieveCandidates(candidate.issuerProductId.value,candidate):{entities:[],decisions:[],complete:false,nextCursor:null};
  return {candidate,evidence,entities:page.entities.slice(0,8),retrievalComplete:page.complete&&page.entities.length<=8};
 }
 async claimTask(taskId:string,raw:{requestId:string;expectedRevision:number}):Promise<{leaseToken:string;revision:number;leaseUntil:string;context:Awaited<ReturnType<IdentityService['taskContext']>>}> {
  const input=z.strictObject({requestId:z.string().min(1).max(200),expectedRevision:z.number().int().nonnegative()}).parse(raw);
  const hash=await sha256(stableJson({taskId,...input})),command='task-claim:'+input.requestId;
  const prior=await readIdentityReceipt<{leaseToken:string;revision:number;leaseUntil:string;context:Awaited<ReturnType<IdentityService['taskContext']>>}>(this.db,command,hash);if(prior){if(prior.status==='conflict')throw new IdentityError(409,'request payload conflict');return prior.value!;}
  const context=await this.taskContext(taskId);
  const now=new Date().toISOString(),leaseToken=crypto.randomUUID(),leaseUntil=new Date(Date.now()+20*60_000).toISOString();
  const builder=new MutationBuilder(this.db,command,hash);
  builder.require("EXISTS(SELECT 1 FROM review_tasks WHERE id=? AND state IN ('open','manual','checking') AND (lease_until IS NULL OR lease_until<?))",[taskId,now]);
  builder.update('review_tasks',{state:'checking',revision:input.expectedRevision+1,lease_token:leaseToken,lease_until:leaseUntil,lease_context_json:JSON.stringify(context)},'id=?',[taskId]);
  builder.assert('EXISTS(SELECT 1 FROM review_tasks WHERE id=? AND lease_token=?)',[taskId,leaseToken]);
  return this.commit(builder,[{kind:'task',id:taskId,revision:input.expectedRevision},...context.entities.map(e=>({kind:'entity' as const,id:e.id,revision:e.revision}))],{leaseToken,revision:input.expectedRevision+1,leaseUntil,context});
 }
 async submitTaskSuggestion(taskId:string,raw:{requestId:string;expectedRevision:number;leaseToken:string;result:ResolutionResult}):Promise<{taskId:string;revision:number;state:string}> {
  const input=z.strictObject({requestId:z.string().min(1).max(200),expectedRevision:z.number().int().nonnegative(),leaseToken:z.string().uuid(),result:resolutionResultSchema}).parse(raw);
  const hash=await sha256(stableJson({taskId,...input})),command='task-result:'+input.requestId;
  const prior=await readIdentityReceipt<{taskId:string;revision:number;state:string}>(this.db,command,hash);if(prior){if(prior.status==='conflict')throw new IdentityError(409,'request payload conflict');return prior.value!;}
  const task=await this.db.prepare('SELECT * FROM review_tasks WHERE id=?').bind(taskId).first<TaskRow>();
  if(!task||task.revision!==input.expectedRevision)throw new IdentityError(409,'task changed');
  const context=task.lease_context_json?JSON.parse(task.lease_context_json) as Awaited<ReturnType<IdentityService['taskContext']>>:null;
  if(!context)throw new IdentityError(409,'lease context missing');
  if(input.result.entityId&&!context.entities.some(e=>e.id===input.result.entityId))throw new IdentityError(400,'entity outside leased candidate set');
  if(input.result.matchingVersionId&&(!input.result.entityId||!await this.db.prepare('SELECT 1 FROM benefit_versions WHERE id=? AND entity_id=?').bind(input.result.matchingVersionId,input.result.entityId).first()))throw new IdentityError(400,'version outside entity');
  if((input.result.relation!=='UNRESOLVED'&&!input.result.evidenceRefs.length)||input.result.evidenceRefs.some(ref=>!Object.hasOwn(context.evidence.quoteById,ref)||!context.evidence.fullText.includes(context.evidence.quoteById[ref])))throw new IdentityError(400,'invalid suggestion citation');
  const builder=new MutationBuilder(this.db,command,hash);
  builder.require("EXISTS(SELECT 1 FROM review_tasks WHERE id=? AND state='checking' AND lease_token=? AND lease_until>=?)",[taskId,input.leaseToken,new Date().toISOString()]);
  builder.update('review_tasks',{state:'manual',revision:input.expectedRevision+1,lease_token:null,lease_until:null,suggestion_json:JSON.stringify(input.result)},'id=?',[taskId]);
  builder.assert("EXISTS(SELECT 1 FROM review_tasks WHERE id=? AND state='manual' AND revision=?)",[taskId,input.expectedRevision+1]);
  return this.commit(builder,[{kind:'task',id:taskId,revision:input.expectedRevision},...context.entities.map(e=>({kind:'entity' as const,id:e.id,revision:e.revision}))],{taskId,revision:input.expectedRevision+1,state:'manual'});
 }

 async resolveIdentityTask(taskId:string,raw:{requestId:string;expectedRevision:number;action:'same'|'new';candidateId:string;entityId?:string;facts?:CanonicalTermsV1;reason?:string;actor:string}):Promise<IntakeReceipt> {
  const input=z.strictObject({requestId:z.string().min(1).max(200),expectedRevision:z.number().int().nonnegative(),action:z.enum(['same','new']),candidateId:z.string(),entityId:z.string().optional(),facts:canonicalTermsSchema.optional(),reason:z.string().min(2).max(2000).optional(),actor:z.string().min(1)}).parse(raw);
  const payload=await sha256(stableJson({candidateId:input.candidateId,suggestion:null,control:{taskId,revision:input.expectedRevision,actor:input.actor,action:input.action,facts:input.facts??null,entityId:input.entityId??null,reason:input.reason??null}}));
  const prior=await readIdentityReceipt<IntakeReceipt>(this.db,'resolve:human:'+input.requestId,payload);if(prior){if(prior.status==='conflict')throw new IdentityError(409,'request payload conflict');return intakeReceiptSchema.parse(prior.value);}
  const task=await this.db.prepare('SELECT * FROM review_tasks WHERE id=?').bind(taskId).first<TaskRow>();
  if(!task||!['identity','merge_conflict','evidence_reopen'].includes(task.kind)||task.revision!==input.expectedRevision||!['open','manual','checking'].includes(task.state))throw new IdentityError(409,'identity task changed');
  if(!await this.db.prepare('SELECT 1 FROM task_candidates tc JOIN intake_candidates c ON c.id=tc.candidate_id WHERE tc.task_id=? AND tc.candidate_id=? AND c.task_id=tc.task_id').bind(taskId,input.candidateId).first())throw new IdentityError(400,'candidate does not belong to task');
  if(input.action==='same'&&!input.entityId)throw new IdentityError(400,'same requires a target entity');
  return this.resolveCandidate(input.candidateId,'human:'+input.requestId,undefined,{task,actor:input.actor,action:input.action,facts:input.facts,entityId:input.entityId,reason:input.reason});
 }

 private async rejectClaimTask(task:TaskRow,input:TaskDecisionInput,command:string,hash:string):Promise<{decisionId:string;publicationRevision:number}> {
  if(input.scope&&input.scope.kind!=='claim'&&input.scope.kind!=='observation_only')throw new IdentityError(403,'unresolved claims require a narrow refusal scope');
  const rows=await this.db.prepare('SELECT c.* FROM task_candidates tc JOIN intake_candidates c ON c.id=tc.candidate_id WHERE tc.task_id=? AND c.task_id=tc.task_id ORDER BY c.id LIMIT 11').bind(task.id).all<CandidateRow>();
  if(!rows.results.length||rows.results.length>10)throw new IdentityError(409,'claim group requires an explicit bounded selection');
  const builder=new MutationBuilder(this.db,command,hash);let firstDecision='';
  for(const candidate of rows.results){
   if(input.scope?.kind==='claim'&&input.scope.candidateId!==candidate.id)throw new IdentityError(400,'foreign claim scope');
   if(input.scope?.kind==='observation_only'&&input.scope.observationId!==candidate.observation_id)throw new IdentityError(400,'foreign observation scope');
   const decisionId=crypto.randomUUID();firstDecision ||= decisionId;
   builder.require('EXISTS(SELECT 1 FROM intake_candidates WHERE id=? AND revision=?)',[candidate.id,candidate.revision]);
   builder.insert('review_decisions',{id:decisionId,candidate_id:candidate.id,action:'reject',reason_code:input.reasonCode??'other',reason_text:input.reason??'',scope_json:JSON.stringify(input.scope??{kind:'claim',candidateId:candidate.id}),reopen_policy_json:JSON.stringify(input.reopenPolicy??{kind:'manual',missingFacts:[]}),rules_version:RULES_VERSION,evidence_refs_json:JSON.stringify([candidate.observation_id]),actor:input.actor,idempotency_key:command+':'+candidate.id});
   const receipt=intakeReceiptSchema.parse(JSON.parse(candidate.receipt_json!));receipt.outcome='duplicate_rejected';receipt.decisionId=decisionId;receipt.taskId=null;receipt.reasonCodes=['existing_refusal'];receipt.retryable=false;
   builder.update('intake_candidates',{state:'resolved_rejected',decision_id:decisionId,task_id:null,revision:candidate.revision+1,receipt_json:JSON.stringify(receipt)},'id=?',[candidate.id]);builder.assertOwnership('intake_candidates',candidate.id);
  }
  builder.update('review_tasks',{state:'resolved',revision:task.revision+1,decision_id:firstDecision,lease_token:null,lease_until:null},'id=?',[task.id]);
  return this.commit(builder,[{kind:'task',id:task.id,revision:task.revision}],{decisionId:firstDecision,publicationRevision:0});
 }

 async applyResolution(candidateId:string,suggestion:ResolutionResult,requestId:string):Promise<IntakeReceipt>{resolutionResultSchema.parse(suggestion);return this.resolveCandidate(candidateId,requestId,suggestion);}
 async resolveCandidate(candidateId:string,requestId:string,suggestion?:ResolutionResult,control?:ResolutionControl):Promise<IntakeReceipt> {
  const payloadHash=await sha256(stableJson({candidateId,suggestion:suggestion??null,control:control?{taskId:control.task.id,revision:control.task.revision,actor:control.actor,action:control.action,facts:control.facts??null,entityId:control.entityId??null,reason:control.reason??null}:null})),command='resolve:'+requestId;
  const previous=await readIdentityReceipt<IntakeReceipt>(this.db,command,payloadHash);
  if(previous){if(previous.status==='conflict')throw new IdentityError(409,'request payload conflict');return intakeReceiptSchema.parse(previous.value);}
  const candidate=await this.db.prepare('SELECT * FROM intake_candidates WHERE id=?').bind(candidateId).first<CandidateRow>();
  if(!candidate)throw new IdentityError(404,'candidate not found');
  const stored=candidate.receipt_json?intakeReceiptSchema.parse(JSON.parse(candidate.receipt_json)):null;
  if(!stored)throw new IdentityError(409,'candidate lacks intake receipt');
  const facts=canonicalTermsSchema.parse(control?.facts??JSON.parse(candidate.facts_json)),evidence=await this.evidence({...candidate,facts_json:JSON.stringify(control?.facts??JSON.parse(candidate.facts_json))});
  const builder=new MutationBuilder(this.db,command,payloadHash),expected:ExpectedRevision[]=[];
  if(control){expected.push({kind:'task',id:control.task.id,revision:control.task.revision});builder.require("EXISTS(SELECT 1 FROM review_tasks WHERE id=? AND state IN ('open','checking','manual'))",[control.task.id]);}
  builder.require('EXISTS(SELECT 1 FROM intake_candidates WHERE id=? AND revision=?)',[candidate.id,candidate.revision]);
  const leadRaw=JSON.parse(candidate.raw_candidate_json).candidate?._identityLegacyLead;
  const legacyLead=!control&&leadRaw?z.strictObject({leadId:z.number().int().positive(),resolution:z.string()}).parse(leadRaw):null;
  if(legacyLead)builder.require("EXISTS(SELECT 1 FROM leads WHERE id=? AND status='reviewing' AND resolution=? AND json_extract(resolution,'$.status')='checking')",[legacyLead.leadId,legacyLead.resolution]);
  const legacyRaw=JSON.parse(candidate.raw_candidate_json).candidate?._identityLegacyJob;
  const legacyJob=!control&&legacyRaw?z.strictObject({offerId:z.string(),entityId:z.string(),entityRevision:z.number().int().nonnegative(),originalJob:z.string()}).parse(legacyRaw):null;
  if(legacyJob){expected.push({kind:'entity',id:legacyJob.entityId,revision:legacyJob.entityRevision});builder.require("EXISTS(SELECT 1 FROM offers WHERE id=? AND official_review=? AND json_extract(official_review,'$.status')='checking')",[legacyJob.offerId,legacyJob.originalJob]);}
  const receipt:IntakeReceipt={...stored,outcome:'deferred',entityId:null,versionId:null,decisionId:null,taskId:null,canonicalOfferId:null,reasonCodes:[],retryable:false};
  let entity:EntityRow|null=null,taskKind='identity',taskKey=reviewTaskKey({kind:'identity',clusterId:candidate.id}),versionId:string|null=null,baseVersionId:string|null=null,material=false;
  const productId=facts.issuerProductId.state==='known'?facts.issuerProductId.value:null;
  const mechanism=facts.mechanism.state==='known'?facts.mechanism.value:null;
  let comparison:ResolutionResult|null=null;
  let decisions:ReturnType<typeof reviewDecisionSchema.parse>[]=[];
  const directRows=await this.db.prepare("SELECT d.* FROM review_decisions d WHERE candidate_id=? AND action='reject' AND NOT EXISTS(SELECT 1 FROM review_decisions newer WHERE newer.supersedes_id=d.id) LIMIT 41").bind(candidate.id).all<Record<string,unknown>>();
  const direct=directRows.results.map(readReviewDecision).filter(d=>decisionApplies(d,facts,{entityId:null,versionId:null,candidateId:candidate.id,observationId:candidate.observation_id}));
  if(direct.length===1&&!control){receipt.outcome='duplicate_rejected';receipt.decisionId=direct[0].id;receipt.reasonCodes=['existing_refusal'];builder.require('NOT EXISTS(SELECT 1 FROM review_decisions WHERE supersedes_id=?)',[direct[0].id]);}
  let blockKey:string|null=null,blockRevision=0;
  if(receipt.outcome!=='duplicate_rejected'&&productId&&mechanism&&!evidence.truncated&&!candidate.last_error?.includes('invalid_evidence')&&!candidate.last_error?.includes('ambiguous_subitems')) {
   blockKey=productId+':'+mechanism;
   blockRevision=(await this.db.prepare('SELECT revision FROM identity_blocks WHERE block_key=?').bind(blockKey).first<{revision:number}>())?.revision??0;
   expected.push({kind:'block',id:blockKey,revision:blockRevision});
   const page=await this.store.retrieveCandidates(productId,facts);
   decisions=page.decisions;
   const revoked=await this.db.prepare("SELECT a.id,coalesce(owner.merged_into,owner.id) entity_id FROM identity_aliases a JOIN benefit_entities owner ON owner.id=a.entity_id WHERE a.status='revoked' AND ((a.namespace='official_campaign' AND a.alias_key=? AND a.scope_key=?) OR (a.namespace='manual' AND a.alias_key=?)) AND NOT EXISTS(SELECT 1 FROM identity_aliases active WHERE active.namespace=a.namespace AND active.alias_key=a.alias_key AND active.scope_key=a.scope_key AND active.status='active') ORDER BY a.id LIMIT 40").bind(facts.occurrenceAnchor.state==='known'?facts.occurrenceAnchor.value:'',blockKey,'candidate:'+candidate.id).all<{id:string;entity_id:string}>();
   evidence.revokedEntityIds=revoked.results.map(a=>a.entity_id);
   if(revoked.results.length)taskKey='identity:revoked:'+revoked.results[0].id;
   const manualAlias=candidate.entity_id?await this.store.lookupAlias('manual','candidate:'+candidate.id,productId):null;
   if(control?.action==='same')evidence.confirmedEntityId=control.entityId;
   else if(manualAlias)evidence.confirmedEntityId=manualAlias;
   if(candidate.entity_id)evidence.differentEntityIds=await differentCanonicalEntities(this.db,candidate.entity_id);
   const compared=await Promise.all(page.entities.map(async e=>{
    let result=compareCandidate(facts,e,evidence);
    // A prior human refusal can authorize exactly its named missing facts to be
    // reconsidered. It does not authorize other scope enrichment or publication.
    if(result.reasonCodes.includes('new_identity_facts')&&e.terms){
     const baseline=factSlots(e.terms),introduced=[...factSlots(facts)].filter(([key,value])=>value.state!=='unknown'&&(!baseline.has(key)||baseline.get(key)!.state==='unknown')).map(([key])=>key);
     const superseded=new Set(decisions.flatMap(d=>d.supersedesId?[d.supersedesId]:[]));
     const eligible=decisions.filter(d=>d.entityId===e.id&&!superseded.has(d.id)&&d.reopenPolicy.kind==='missing_facts'&&introduced.length>0&&introduced.every(key=>d.reopenPolicy.missingFacts.includes(key)));
     if(eligible.length===1&&(await evaluateReopen(eligible[0],facts,evidence)).allowed)result=compareCandidate(facts,e,{...evidence,confirmedEntityId:e.id});
    }
    return {entity:e,result};
   }));
   const matches=control?.action==='new'?[]:compared.filter(r=>r.result.relation==='SAME'&&(!control?.entityId||r.entity.id===control.entityId));
   if(control?.action==='same'&&matches.length===1&&matches[0].result.reasonCodes.includes('partial_facts'))matches[0].result={...matches[0].result,termsRelation:'EQUIVALENT',matchingVersionId:matches[0].entity.approvedVersionId};
   if(page.complete&&matches.length===1){comparison=matches[0].result;entity=await this.entity(matches[0].entity.id);}
   else if(page.complete&&!matches.length&&(control?.action==='new'||compared.every(r=>r.result.relation==='DISTINCT'))) {
    const platform=await this.db.prepare('SELECT id FROM platforms WHERE id=?').bind(productId).first();
    if(platform){entity={id:crypto.randomUUID(),platform_id:productId,canonical_offer_id:null,business_revision:0,publication_revision:0,current_approved_version_id:null};builder.insert('benefit_entities',{id:entity.id,platform_id:productId});material=true;}
   }
   if(!page.complete)receipt.reasonCodes.push('retrieval_incomplete');
  }
  if(entity) {
   if(!material)expected.push({kind:'entity',id:entity.id,revision:entity.business_revision});
   if(control)material=true;
   receipt.entityId=entity.id;receipt.canonicalOfferId=entity.canonical_offer_id;
   const hash=await hashTerms(facts);
   let version=control?.action==='same'&&comparison?.termsRelation==='EQUIVALENT'&&entity.current_approved_version_id?await this.db.prepare('SELECT id,state FROM benefit_versions WHERE id=? AND entity_id=?').bind(entity.current_approved_version_id,entity.id).first<{id:string;state:string}>():await this.db.prepare('SELECT id,state FROM benefit_versions WHERE entity_id=? AND terms_schema=? AND terms_hash=?').bind(entity.id,'terms-v1',hash).first<{id:string;state:string}>();
   versionId=version?.id??crypto.randomUUID();baseVersionId=entity.current_approved_version_id;
   receipt.versionId=versionId;
   const display=displayFromRaw(candidate.raw_candidate_json);

   const superseded=new Set(decisions.flatMap(d=>d.supersedesId?[d.supersedesId]:[]));
   const refusals=decisions.filter(d=>!superseded.has(d.id)&&decisionApplies(d,facts,{entityId:entity!.id,versionId,candidateId:candidate.id,observationId:candidate.observation_id}));
   const sameVersionReopen=refusals.length===1?await evaluateReopen(refusals[0],facts,evidence):null;
   if(refusals.length===1&&sameVersionReopen?.allowed){taskKind='evidence_reopen';taskKey=reviewTaskKey({kind:'evidence_reopen',entityId:entity.id,refusalDecisionId:refusals[0].id,basisHash:sameVersionReopen.basisHash!});receipt.outcome='evidence_reopen';receipt.reasonCodes=sameVersionReopen.reasonCodes;}
   else if(refusals.length===1){
    receipt.outcome='duplicate_rejected';receipt.decisionId=refusals[0].id;receipt.taskId=null;receipt.reasonCodes=['existing_refusal'];builder.require('NOT EXISTS(SELECT 1 FROM review_decisions WHERE supersedes_id=?)',[refusals[0].id]);
    if(refusals[0].entityId!==entity.id&&refusals[0].candidateId!==candidate.id)builder.insert('identity_refusal_applications',{candidate_id:candidate.id,decision_id:refusals[0].id,facts_hash:candidate.facts_hash,rules_version:RULES_VERSION},'nothing');
   } else if(refusals.length>1){taskKind='merge_conflict';taskKey='decision-conflict:'+entity.id;receipt.outcome='needs_identity_review';receipt.reasonCodes=['conflicting_decisions'];}
   else {
    const reopens=await Promise.all(decisions.filter(d=>d.action==='reject'&&!superseded.has(d.id)&&d.entityId===entity!.id).map(async d=>({decision:d,evaluation:await evaluateReopen(d,facts,evidence)})));
    const reopen=reopens.find(r=>r.evaluation.allowed);
    if(reopen){taskKind='evidence_reopen';taskKey=reviewTaskKey({kind:'evidence_reopen',entityId:entity.id,refusalDecisionId:reopen.decision.id,basisHash:reopen.evaluation.basisHash!});receipt.outcome='evidence_reopen';receipt.reasonCodes=reopen.evaluation.reasonCodes;}
    else if(comparison?.termsRelation==='EQUIVALENT') {
      receipt.outcome=entity.current_approved_version_id?'duplicate_approved':'duplicate_pending';
      taskKind='initial';taskKey=reviewTaskKey({kind:'initial',entityId:entity.id});
    } else if(comparison?.termsRelation==='CHANGED'&&baseVersionId){taskKind='terms_change';taskKey=reviewTaskKey({kind:'terms_change',entityId:entity.id,baseVersionId,versionId});receipt.outcome='proposed_update';}
    else if(!comparison){taskKind='initial';taskKey=reviewTaskKey({kind:'initial',entityId:entity.id});receipt.outcome='created_pending';}
    else {taskKey='evidence-baseline:'+entity.id+':'+hash;receipt.outcome='needs_identity_review';receipt.reasonCodes=comparison.reasonCodes;}
   }
   if(receipt.outcome==='needs_identity_review'&&!entity.current_approved_version_id&&comparison?.relation==='SAME'&&comparison.reasonCodes.includes('partial_facts')){
    const pending=await this.db.prepare("SELECT id,version_id FROM review_tasks WHERE entity_id=? AND kind='initial' AND state IN ('open','checking','manual')").bind(entity.id).first<{id:string;version_id:string|null}>();
    if(pending){receipt.outcome='duplicate_pending';taskKind='initial';taskKey=reviewTaskKey({kind:'initial',entityId:entity.id});versionId=pending.version_id;receipt.versionId=versionId;version=versionId?await this.db.prepare('SELECT id,state FROM benefit_versions WHERE id=? AND entity_id=?').bind(versionId,entity.id).first<{id:string;state:string}>():null;}
   }
   if(receipt.outcome==='needs_identity_review'){versionId=null;receipt.versionId=null;}
   if(!version&&versionId){builder.insert('benefit_versions',{id:versionId,entity_id:entity.id,terms_schema:'terms-v1',terms_hash:hash,facts_json:JSON.stringify(facts),display_candidate_json:JSON.stringify(display??{}),state:'pending',base_version_id:baseVersionId});material=true;}
   if(receipt.outcome==='proposed_update'&&entity.canonical_offer_id){
    const proposal=await this.db.prepare('SELECT offer_id FROM offer_proposals WHERE offer_id=?').bind(entity.canonical_offer_id).first();
    const sameTask=await this.db.prepare("SELECT id FROM review_tasks WHERE task_key=? AND state IN ('open','checking','manual')").bind(taskKey).first();
    if(proposal&&!sameTask){taskKind='merge_conflict';taskKey='proposal-conflict:'+entity.id+':'+hash;receipt.outcome='needs_identity_review';receipt.reasonCodes=['competing_proposal'];}
   }
   if(!entity.canonical_offer_id&&display&&display.platformId===productId&&receipt.outcome==='created_pending') {
    const offerId='identity-'+entity.id;
    builder.insert('offers',{id:offerId,...offerValues({...display,id:offerId}),review_state:'pending'});
    builder.update('benefit_entities',{canonical_offer_id:offerId},'id=?',[entity.id]);
    receipt.canonicalOfferId=offerId;entity.canonical_offer_id=offerId;
   }
   // Alias evidence is independently grounded; arbitrary model campaign IDs are never registered.
   if(!(control?.action==='new'&&control.entityId)&&facts.occurrenceAnchor.state==='known'&&evidence.sourceVerified&&!evidence.truncated&&facts.occurrenceAnchor.evidenceRefs.some(ref=>evidence.quoteById[ref]?.includes(facts.occurrenceAnchor.state==='known'?facts.occurrenceAnchor.value:''))) {
    builder.insert('identity_aliases',{id:crypto.randomUUID(),namespace:'official_campaign',alias_key:facts.occurrenceAnchor.value,scope_key:blockKey!,entity_id:entity.id,basis_json:JSON.stringify({observationId:candidate.observation_id,evidenceRefs:facts.occurrenceAnchor.evidenceRefs,rule:RESOLVER_VERSION})},'nothing');
    builder.assert("EXISTS(SELECT 1 FROM identity_aliases a JOIN benefit_entities owner ON owner.id=a.entity_id LEFT JOIN benefit_entities root ON root.id=owner.merged_into WHERE a.namespace='official_campaign' AND a.alias_key=? AND a.scope_key=? AND a.status='active' AND ((owner.state='active' AND owner.id=?) OR (owner.state='merged' AND root.state='active' AND root.id=? AND root.platform_id=owner.platform_id)))",[facts.occurrenceAnchor.value,blockKey!,entity.id,entity.id]);
   }
   builder.insert('entity_observations',{entity_id:entity.id,candidate_id:candidate.id,relation:comparison?.termsRelation==='CHANGED'?'changed':comparison?.termsRelation==='EQUIVALENT'?'same':'evidence_only',resolver_version:RESOLVER_VERSION,reason_json:JSON.stringify(receipt.reasonCodes)},'nothing');
  } else if(receipt.outcome!=='duplicate_rejected'){receipt.outcome='needs_identity_review';receipt.entityId=null;receipt.versionId=null;receipt.reasonCodes.push('identity_unproven');}
  if(!['duplicate_approved','duplicate_rejected'].includes(receipt.outcome)) {
   const active=await this.db.prepare("SELECT * FROM review_tasks WHERE task_key=? AND state IN ('open','checking','manual')").bind(taskKey).first<TaskRow>();
   const taskId=active?.id??crypto.randomUUID();receipt.taskId=taskId;
   if(!active){builder.insert('review_tasks',{id:taskId,task_key:taskKey,kind:taskKind,entity_id:entity?.id??null,version_id:versionId,base_version_id:baseVersionId});builder.insert('identity_events',{id:crypto.randomUUID(),event_key:`review:${taskId}:1:telegram`,entity_id:entity?.id??null,version_id:versionId,task_id:taskId,kind:'review',payload_json:JSON.stringify({taskId,materialRevision:1,channel:'telegram'})});material=true;}
   else expected.push({kind:'task',id:active.id,revision:active.revision});
   builder.insert('task_candidates',{task_id:taskId,candidate_id:candidate.id},'nothing');
  }
  if(receipt.outcome==='duplicate_pending'&&entity&&receipt.canonicalOfferId&&receipt.taskId&&evidence.sourceVerified){
   const pending=await this.offer(receipt.canonicalOfferId),incoming=displayFromRaw(candidate.raw_candidate_json);
   const protectedEvidence=await this.db.prepare("SELECT 1 FROM offer_revisions r,json_each(r.diff) j WHERE r.offer_id=? AND r.author='admin' AND json_extract(j.value,'$.field')='evidence' LIMIT 1").bind(receipt.canonicalOfferId).first();
   if(pending?.reviewState==='pending'&&pending.evidence.tier==='media'&&incoming&&incoming.evidence.tier!=='media'&&!protectedEvidence){
    const task=await this.db.prepare('SELECT revision,material_revision FROM review_tasks WHERE id=?').bind(receipt.taskId).first<{revision:number;material_revision:number}>();
    if(task){const display=validateStoredOffer({...pending,evidence:incoming.evidence});if(!display.success)throw new IdentityError(400,'enriched evidence invalid');
     builder.require('EXISTS(SELECT 1 FROM offers WHERE id=? AND updated_at=?)',[pending.id,pending.updatedAt]);
     builder.update('offers',{evidence:JSON.stringify(incoming.evidence),updated_at:new Date().toISOString()},'id=?',[pending.id]);
     builder.update('benefit_versions',{display_candidate_json:JSON.stringify(display.data)},'id=? AND entity_id=?',[receipt.versionId,entity.id]);
     builder.update('review_tasks',{revision:task.revision+1,material_revision:task.material_revision+1,state:'open',lease_token:null,lease_until:null},'id=?',[receipt.taskId]);
     builder.insert('identity_events',{id:crypto.randomUUID(),event_key:`review:${receipt.taskId}:${task.material_revision+1}:telegram`,entity_id:entity.id,version_id:receipt.versionId,task_id:receipt.taskId,kind:'review',payload_json:JSON.stringify({taskId:receipt.taskId,materialRevision:task.material_revision+1,channel:'telegram'})});material=true;
    }
   }
  }
  if(receipt.outcome==='proposed_update'&&receipt.canonicalOfferId) {
   const original=await this.offer(receipt.canonicalOfferId),incoming=displayFromRaw(candidate.raw_candidate_json);
   const existing=await this.db.prepare('SELECT offer_id FROM offer_proposals WHERE offer_id=?').bind(receipt.canonicalOfferId).first();
   if(original&&incoming&&!existing){const merged={...incoming,id:original.id,platformId:original.platformId,usdEstimate:original.usdEstimate,usdMax:original.usdMax,valuation:original.valuation};const diff=Object.entries(merged).filter(([key,value])=>key in columns&&stableJson(value)!==stableJson((original as unknown as Record<string,unknown>)[key])).map(([field,to])=>({field,from:(original as unknown as Record<string,unknown>)[field]??null,to}));builder.insert('offer_proposals',{offer_id:original.id,candidate:JSON.stringify(merged),diff:JSON.stringify(diff),manual_fields:'[]'});}
  }
  if(entity&&material)builder.update('benefit_entities',{business_revision:entity.business_revision+1},'id=?',[entity.id]);
  if(blockKey&&material){builder.insert('identity_blocks',{block_key:blockKey,revision:blockRevision},'nothing');builder.update('identity_blocks',{revision:blockRevision+1},'block_key=?',[blockKey]);}
  receipt.entityRevision=entity?entity.business_revision+(material?1:0):null;
  if(legacyJob){if(entity&&entity.id!==legacyJob.entityId)throw new IdentityError(409,'official review resolved a different activity');if(entity&&receipt.entityRevision!==null)builder.acknowledgeOfficialJob(legacyJob.offerId,legacyJob.originalJob,receipt.entityRevision!);}
  if(control){
   if(!entity||receipt.taskId===control.task.id)throw new IdentityError(400,'identity remains unproven; provide scoped canonical facts or choose a verified entity');
   const decisionId=crypto.randomUUID();
   builder.insert('review_decisions',{id:decisionId,entity_id:entity.id,candidate_id:candidate.id,version_id:receipt.versionId,action:control.action==='same'?'same':'distinct',reason_code:control.action==='same'?'duplicate':'other',reason_text:control.reason??'',scope_json:JSON.stringify({kind:'claim',candidateId:candidate.id}),reopen_policy_json:JSON.stringify({kind:'manual',missingFacts:[]}),rules_version:RULES_VERSION,evidence_refs_json:JSON.stringify([candidate.observation_id]),actor:control.actor,idempotency_key:command+':manual'});
   if(control.action==='new'&&control.entityId&&control.entityId!==entity.id){const other=await this.entity(control.entityId);if(!other)throw new IdentityError(400,'distinct target missing');expected.push({kind:'entity',id:other.id,revision:other.business_revision});const pair=[entity.id,other.id].sort();builder.insert('identity_constraints',{id:crypto.randomUUID(),entity_a:pair[0],entity_b:pair[1],relation:'different',basis_json:JSON.stringify({taskId:control.task.id,candidateId:candidate.id}),actor:control.actor});builder.update('benefit_entities',{business_revision:other.business_revision+1},'id=?',[other.id]);}
   builder.insert('identity_aliases',{id:crypto.randomUUID(),namespace:'manual',alias_key:'candidate:'+candidate.id,scope_key:entity.platform_id,entity_id:entity.id,basis_json:JSON.stringify({decisionId,actor:control.actor})},'nothing');
   const remaining=await this.db.prepare('SELECT 1 FROM task_candidates tc JOIN intake_candidates c ON c.id=tc.candidate_id WHERE tc.task_id=? AND c.task_id=? AND c.id<>? LIMIT 1').bind(control.task.id,control.task.id,candidate.id).first();
   builder.update('review_tasks',{state:remaining?'manual':'resolved',revision:control.task.revision+1,decision_id:remaining?null:decisionId,lease_token:null,lease_until:null},'id=?',[control.task.id]);
  }
  builder.update('intake_candidates',{state:receipt.outcome==='duplicate_rejected'?'resolved_rejected':receipt.outcome==='duplicate_approved'||receipt.outcome==='duplicate_pending'?'resolved_same':receipt.outcome==='created_pending'?'pending_initial':receipt.outcome==='proposed_update'?'pending_change':'pending_identity',entity_id:receipt.entityId,version_id:receipt.versionId,task_id:receipt.taskId,decision_id:receipt.decisionId,revision:candidate.revision+1,receipt_json:JSON.stringify(receipt),last_error:null,next_attempt_at:null,lease_token:null,lease_until:null,...(control?.facts?{facts_json:JSON.stringify(facts),facts_hash:await hashTerms(facts)}:{})},'id=? AND revision=?',[candidate.id,candidate.revision]);
  builder.assert('EXISTS(SELECT 1 FROM intake_candidates WHERE id=? AND revision=?)',[candidate.id,candidate.revision+1]);builder.assertOwnership('intake_candidates',candidate.id);
  return this.commit(builder,expected,receipt);
 }

 async decideTask(taskId:string,raw:TaskDecisionInput):Promise<{decisionId:string;publicationRevision:number}> {
  const input=decisionInput.parse(raw),hash=await sha256(stableJson({taskId,...input})),command='decide:'+input.requestId;
  const previous=await readIdentityReceipt<{decisionId:string;publicationRevision:number}>(this.db,command,hash);if(previous){if(previous.status==='conflict')throw new IdentityError(409,'request payload conflict');return previous.value!;}
  if(input.role!=='admin'&&input.scope?.kind==='scoped_mechanism')throw new IdentityError(403,'scope expansion requires administrator');
  const task=await this.db.prepare('SELECT * FROM review_tasks WHERE id=?').bind(taskId).first<TaskRow>();
  if(!task||task.revision!==input.expectedRevision||!['open','checking','manual'].includes(task.state))throw new IdentityError(409,'task revision changed');
  if(input.action==='reject'&&!task.entity_id)return this.rejectClaimTask(task,input,command,hash);
  if(!['initial','terms_change','evidence_reopen'].includes(task.kind))throw new IdentityError(400,'identity conflict requires explicit identity resolution');
  if(!task.entity_id||!task.version_id)throw new IdentityError(400,'identity must be resolved before a publication decision');
  const entity=await this.entity(task.entity_id);if(!entity)throw new IdentityError(409,'task entity missing');
  const version=await this.db.prepare('SELECT display_candidate_json,facts_json FROM benefit_versions WHERE id=? AND entity_id=?').bind(task.version_id,entity.id).first<{display_candidate_json:string;facts_json:string}>();
  if(!version)throw new IdentityError(409,'version belongs to another entity');
  if(task.base_version_id!==entity.current_approved_version_id)throw new IdentityError(409,'approved baseline changed');
  const versionFacts=canonicalTermsSchema.parse(JSON.parse(version.facts_json));
  if(input.scope){const scope=input.scope;
   if(scope.kind==='exact_version'&&(scope.entityId!==entity.id||scope.versionId!==task.version_id))throw new IdentityError(400,'foreign rejection scope');
   if(scope.kind==='entity_alias'&&scope.entityId!==entity.id)throw new IdentityError(400,'foreign rejection scope');
   if(scope.kind==='scoped_mechanism'&&(scope.productId!==entity.platform_id||versionFacts.mechanism.state!=='known'||scope.mechanism!==versionFacts.mechanism.value))throw new IdentityError(400,'foreign mechanism scope');
   if(scope.kind==='occurrence'&&(scope.productId!==entity.platform_id||versionFacts.occurrenceAnchor.state!=='known'||scope.anchor!==versionFacts.occurrenceAnchor.value))throw new IdentityError(400,'foreign occurrence scope');
   if(scope.kind==='claim'&&!await this.db.prepare('SELECT 1 FROM task_candidates WHERE task_id=? AND candidate_id=?').bind(task.id,scope.candidateId).first())throw new IdentityError(400,'foreign candidate scope');
   if(scope.kind==='observation_only'&&!await this.db.prepare('SELECT 1 FROM task_candidates tc JOIN intake_candidates c ON c.id=tc.candidate_id WHERE tc.task_id=? AND c.observation_id=?').bind(task.id,scope.observationId).first())throw new IdentityError(400,'foreign observation scope');
  }
  const proposal=entity.canonical_offer_id?await this.db.prepare('SELECT candidate,diff,manual_fields,updated_at FROM offer_proposals WHERE offer_id=?').bind(entity.canonical_offer_id).first<{candidate:string;diff:string;manual_fields:string;updated_at:string}>():null;
  if(proposal&&JSON.parse(proposal.manual_fields).length&&stableJson(offerIn.parse(JSON.parse(proposal.candidate)))!==stableJson(offerIn.parse(JSON.parse(version.display_candidate_json))))throw new IdentityError(409,'manual proposal edits require a refreshed identity version');
  const original=await this.offer(entity.canonical_offer_id);
  let accepted:OfferIn|null=null;
  if(input.action==='approve') {
   if(!original)throw new IdentityError(400,'reviewable offer fields required');
   const rawDisplay=JSON.parse(version.display_candidate_json);
   accepted=offerIn.parse({...rawDisplay,id:original.id,platformId:original.platformId,usdEstimate:original.usdEstimate,usdMax:original.usdMax,valuation:original.valuation,sourceId:original.sourceId??undefined,firstChannel:original.firstChannel??undefined});
   const error=await publicationError({DB:this.db},{...original,...accepted});if(error)throw new IdentityError(400,error);
  }
  const builder=new MutationBuilder(this.db,command,hash),expected:ExpectedRevision[]=[{kind:'task',id:task.id,revision:input.expectedRevision},{kind:'entity',id:entity.id,revision:entity.business_revision}];
  if(proposal&&entity.canonical_offer_id)builder.require('EXISTS(SELECT 1 FROM offer_proposals WHERE offer_id=? AND updated_at=? AND candidate=?)',[entity.canonical_offer_id,proposal.updated_at,proposal.candidate]);
  if(versionFacts.mechanism.state==='known'){
   const block=entity.platform_id+':'+versionFacts.mechanism.value;
   const revision=(await this.db.prepare('SELECT revision FROM identity_blocks WHERE block_key=?').bind(block).first<{revision:number}>())?.revision??0;
   expected.push({kind:'block',id:block,revision});builder.insert('identity_blocks',{block_key:block,revision},'nothing');builder.update('identity_blocks',{revision:revision+1},'block_key=?',[block]);
  }
  const decisionId=crypto.randomUUID(),publicationRevision=entity.publication_revision+(input.action==='approve'?1:0);
  if(original)builder.require('EXISTS(SELECT 1 FROM offers WHERE id=? AND updated_at=?)',[original.id,original.updatedAt]);
  const priorRefusal=await this.db.prepare("SELECT d.id FROM review_decisions d WHERE entity_id=? AND version_id=? AND action='reject' AND NOT EXISTS(SELECT 1 FROM review_decisions later WHERE later.supersedes_id=d.id) ORDER BY created_at DESC LIMIT 2").bind(entity.id,task.version_id).all<{id:string}>();
  if(priorRefusal.results.length>1)throw new IdentityError(409,'conflicting active refusals need explicit resolution');
  const policy=input.reopenPolicy??{kind:'manual' as const,missingFacts:[]};
  const basisRows=await this.db.prepare("SELECT DISTINCT c.* FROM task_candidates tc JOIN intake_candidates c ON c.id=tc.candidate_id WHERE tc.task_id=?1 OR tc.task_id IN (SELECT source_task_id FROM merge_task_sources WHERE canonical_task_id=?1 AND status='active') ORDER BY c.id LIMIT 10").bind(task.id).all<CandidateRow>();
  const reviewedBasisHashes=[...(policy.reviewedBasisHashes??[])];
  if(input.action==='reject'&&policy.kind==='missing_facts')for(const basisCandidate of basisRows.results){
   const provisional=reviewDecisionSchema.parse({id:decisionId,entityId:entity.id,candidateId:basisCandidate.id,versionId:task.version_id,action:'reject',reasonCode:input.reasonCode??'other',scope:input.scope??{kind:'exact_version',entityId:entity.id,versionId:task.version_id},reopenPolicy:policy,rulesVersion:RULES_VERSION,evidenceRefs:[],actor:input.actor,baseVersionId:task.base_version_id,targetVersionId:task.version_id,idempotencyKey:command,supersedesId:null,createdAt:new Date().toISOString()});
   const reviewed=await evaluateReopen(provisional,versionFacts,await this.evidence(basisCandidate));if(reviewed.basisHash)reviewedBasisHashes.push(reviewed.basisHash);
  }
  const storedPolicy={...policy,reviewedBasisHashes:[...new Set(reviewedBasisHashes)]};
  builder.insert('review_decisions',{id:decisionId,entity_id:entity.id,version_id:task.version_id,action:input.action,reason_code:input.reasonCode??'other',reason_text:input.reason??'',scope_json:JSON.stringify(input.scope??{kind:'exact_version',entityId:entity.id,versionId:task.version_id}),reopen_policy_json:JSON.stringify(storedPolicy),basis_json:JSON.stringify({candidateIds:basisRows.results.map(c=>c.id),observationIds:basisRows.results.map(c=>c.observation_id)}),rules_version:RULES_VERSION,evidence_refs_json:'[]',actor:input.actor,base_version_id:task.base_version_id,target_version_id:task.version_id,idempotency_key:command,supersedes_id:priorRefusal.results[0]?.id??null});
  builder.update('benefit_versions',{state:input.action==='approve'?'approved':'rejected'},'id=? AND entity_id=?',[task.version_id,entity.id]);
  builder.update('benefit_entities',{business_revision:entity.business_revision+1,publication_revision:publicationRevision,...(input.action==='approve'?{current_approved_version_id:task.version_id}:{})},'id=?',[entity.id]);builder.assertOwnership('benefit_entities',entity.id);
  builder.update('review_tasks',{state:'resolved',decision_id:decisionId,revision:task.revision+1,lease_token:null,lease_until:null},'id=?',[task.id]);
  if(original){
   if(accepted)builder.update('offers',{...offerValues(accepted),review_state:'approved',updated_at:new Date().toISOString(),last_verified_at:new Date().toISOString(),verify_result:'审核员确认官方证据'},'id=?',[original.id]);
   else if(!entity.current_approved_version_id)builder.update('offers',{review_state:'rejected',updated_at:new Date().toISOString()},'id=?',[original.id]);
   builder.insert('reviews',{offer_id:original.id,action:input.action,reviewer:input.actor,reason:input.reason??null,reason_code:input.reasonCode??'other',decision_id:decisionId});
   if(task.kind==='terms_change'||(task.kind==='evidence_reopen'&&proposal)){
    if(proposal&&task.kind==='evidence_reopen'&&stableJson(offerIn.parse(JSON.parse(proposal.candidate)))!==stableJson(offerIn.parse(JSON.parse(version.display_candidate_json))))throw new IdentityError(409,'proposal belongs to another review version');
    if(input.action==='reject'&&proposal)builder.insert('rejected_offer_updates',{offer_id:original.id,evidence:JSON.stringify(JSON.parse(proposal.candidate).evidence??original.evidence),diff:proposal.diff,decision_key:command});
    if(input.action==='approve'&&accepted)builder.insert('offer_revisions',{offer_id:original.id,diff:proposal?.diff??'[]',evidence_before:JSON.stringify(original.evidence),evidence_after:JSON.stringify(accepted.evidence),author:'pipeline'});
    builder.remove('offer_proposals','offer_id=?',[original.id]);
   }
  }
  if(input.action==='approve')builder.insert('identity_events',{id:crypto.randomUUID(),event_key:`offer:${entity.id}:${publicationRevision}:${entity.publication_revision?'changed':'new'}:telegram`,entity_id:entity.id,version_id:task.version_id,kind:entity.publication_revision?'changed':'new',payload_json:JSON.stringify({entityId:entity.id,versionId:task.version_id,publicationRevision,decisionId,channel:'telegram'})});
  builder.assert('EXISTS(SELECT 1 FROM review_tasks WHERE id=? AND state=\'resolved\' AND decision_id=?)',[task.id,decisionId]);
  return this.commit(builder,expected,{decisionId,publicationRevision});
 }
}
