import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as tables from '../../db/schema';
import { offerIn,type OfferIn } from '../../shared/ingest';
import { publicationError } from '../publication';
import { canonicalTermsSchema,resolutionResultSchema,decisionScopeSchema,reopenPolicySchema,intakeReceiptSchema,reviewDecisionSchema,type IntakeReceipt,type CanonicalTermsV1,type ResolutionResult,type EvidenceContext } from '../../shared/identity/types';
import { compareCandidate,RESOLVER_VERSION,RULES_VERSION } from '../../shared/identity/compare';
import { decisionApplies,evaluateReopen,reviewTaskKey } from '../../shared/identity/decision-policy';
import { hashTerms,sha256,stableJson } from '../../shared/identity/normalize';
import { IdentityStore,IdentityError } from './store';
import { MutationBuilder,commitIdentityMutation,readIdentityReceipt,type Binding,type ExpectedRevision } from './commit';
type OfferRow=typeof tables.offers.$inferSelect;
type CandidateRow={id:string;observation_id:string;facts_json:string;facts_hash:string;raw_candidate_json:string;receipt_json:string|null;revision:number;entity_id:string|null;state:string;last_error:string|null};
type EntityRow={id:string;platform_id:string;canonical_offer_id:string|null;business_revision:number;publication_revision:number;current_approved_version_id:string|null};
type TaskRow={id:string;task_key:string;kind:string;entity_id:string|null;version_id:string|null;base_version_id:string|null;state:string;revision:number;material_revision:number;decision_id:string|null};
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
 private async entity(id:string){return this.db.prepare('SELECT * FROM benefit_entities WHERE id=?').bind(id).first<EntityRow>();}
 private async offer(id:string|null):Promise<OfferRow|null>{if(!id)return null;return (await drizzle(this.db,{schema:tables}).select().from(tables.offers).where(eq(tables.offers.id,id)))[0]??null;}
 private async evidence(candidate:CandidateRow):Promise<EvidenceContext> {
  const row=await this.db.prepare('SELECT text,text_truncated,trust_json FROM source_observations WHERE id=?').bind(candidate.observation_id).first<{text:string;text_truncated:number;trust_json:string}>();
  if(!row)throw new IdentityError(409,'candidate observation missing');
  const raw=JSON.parse(candidate.raw_candidate_json) as {quotes?:Array<{id:string;quote:string}>};
  const trust=z.object({sourceVerified:z.boolean(),productId:z.string().nullable()}).parse(JSON.parse(row.trust_json));
  const facts=canonicalTermsSchema.parse(JSON.parse(candidate.facts_json));
  return {observationId:candidate.observation_id,fullText:row.text,truncated:!!row.text_truncated,sourceVerified:trust.sourceVerified&&facts.issuerProductId.state==='known'&&trust.productId===facts.issuerProductId.value,quoteById:Object.fromEntries((raw.quotes??[]).map(q=>[q.id,q.quote]))};
 }
 private async commit<T>(builder:MutationBuilder,expected:ExpectedRevision[],receipt:T):Promise<T>{const result=await commitIdentityMutation(this.db,builder.plan(expected,receipt));if(result.status==='conflict'||result.value===null)throw new IdentityError(409,'identity revisions changed; retry retrieval');return result.value;}

 async claimTask(taskId:string,raw:{requestId:string;expectedRevision:number}):Promise<{leaseToken:string;revision:number;leaseUntil:string}> {
  const input=z.strictObject({requestId:z.string().min(1).max(200),expectedRevision:z.number().int().nonnegative()}).parse(raw);
  const hash=await sha256(stableJson({taskId,...input})),command='task-claim:'+input.requestId;
  const prior=await readIdentityReceipt<{leaseToken:string;revision:number;leaseUntil:string}>(this.db,command,hash);if(prior){if(prior.status==='conflict')throw new IdentityError(409,'request payload conflict');return prior.value!;}
  const now=new Date().toISOString(),leaseToken=crypto.randomUUID(),leaseUntil=new Date(Date.now()+20*60_000).toISOString();
  const builder=new MutationBuilder(this.db,command,hash);
  builder.require("EXISTS(SELECT 1 FROM review_tasks WHERE id=? AND state IN ('open','manual','checking') AND (lease_until IS NULL OR lease_until<?))",[taskId,now]);
  builder.update('review_tasks',{state:'checking',revision:input.expectedRevision+1,lease_token:leaseToken,lease_until:leaseUntil},'id=?',[taskId]);
  builder.assert('EXISTS(SELECT 1 FROM review_tasks WHERE id=? AND lease_token=?)',[taskId,leaseToken]);
  return this.commit(builder,[{kind:'task',id:taskId,revision:input.expectedRevision}],{leaseToken,revision:input.expectedRevision+1,leaseUntil});
 }
 async submitTaskSuggestion(taskId:string,raw:{requestId:string;expectedRevision:number;leaseToken:string;result:ResolutionResult}):Promise<{taskId:string;revision:number;state:string}> {
  const input=z.strictObject({requestId:z.string().min(1).max(200),expectedRevision:z.number().int().nonnegative(),leaseToken:z.string().uuid(),result:resolutionResultSchema}).parse(raw);
  const hash=await sha256(stableJson({taskId,...input})),command='task-result:'+input.requestId;
  const prior=await readIdentityReceipt<{taskId:string;revision:number;state:string}>(this.db,command,hash);if(prior){if(prior.status==='conflict')throw new IdentityError(409,'request payload conflict');return prior.value!;}
  const task=await this.db.prepare('SELECT * FROM review_tasks WHERE id=?').bind(taskId).first<TaskRow>();
  if(!task||task.revision!==input.expectedRevision)throw new IdentityError(409,'task changed');
  // Ingest workers may add a suggestion, never approve, invent an alias or merge.
  if(input.result.entityId&&!await this.entity(input.result.entityId))throw new IdentityError(400,'unknown suggested entity');
  const builder=new MutationBuilder(this.db,command,hash);
  builder.require("EXISTS(SELECT 1 FROM review_tasks WHERE id=? AND state='checking' AND lease_token=? AND lease_until>=?)",[taskId,input.leaseToken,new Date().toISOString()]);
  builder.update('review_tasks',{state:'manual',revision:input.expectedRevision+1,lease_token:null,lease_until:null,suggestion_json:JSON.stringify(input.result)},'id=?',[taskId]);
  builder.assert("EXISTS(SELECT 1 FROM review_tasks WHERE id=? AND state='manual' AND revision=?)",[taskId,input.expectedRevision+1]);
  return this.commit(builder,[{kind:'task',id:taskId,revision:input.expectedRevision}],{taskId,revision:input.expectedRevision+1,state:'manual'});
 }

 async applyResolution(candidateId:string,suggestion:ResolutionResult,requestId:string):Promise<IntakeReceipt>{resolutionResultSchema.parse(suggestion);return this.resolveCandidate(candidateId,requestId,suggestion);}
 async resolveCandidate(candidateId:string,requestId:string,suggestion?:ResolutionResult):Promise<IntakeReceipt> {
  const payloadHash=await sha256(stableJson({candidateId,suggestion:suggestion??null})),command='resolve:'+requestId;
  const previous=await readIdentityReceipt<IntakeReceipt>(this.db,command,payloadHash);
  if(previous){if(previous.status==='conflict')throw new IdentityError(409,'request payload conflict');return intakeReceiptSchema.parse(previous.value);}
  const candidate=await this.db.prepare('SELECT * FROM intake_candidates WHERE id=?').bind(candidateId).first<CandidateRow>();
  if(!candidate)throw new IdentityError(404,'candidate not found');
  const stored=candidate.receipt_json?intakeReceiptSchema.parse(JSON.parse(candidate.receipt_json)):null;
  if(!stored)throw new IdentityError(409,'candidate lacks intake receipt');
  if(!['received','deferred','resolving'].includes(candidate.state))return this.commit(new MutationBuilder(this.db,command,payloadHash),[],stored);
  const facts=canonicalTermsSchema.parse(JSON.parse(candidate.facts_json)),evidence=await this.evidence(candidate);
  const builder=new MutationBuilder(this.db,command,payloadHash),expected:ExpectedRevision[]=[];
  builder.require('EXISTS(SELECT 1 FROM intake_candidates WHERE id=? AND revision=?)',[candidate.id,candidate.revision]);
  const receipt:IntakeReceipt={...stored,reasonCodes:[],retryable:false};
  let entity:EntityRow|null=null,taskKind='identity',taskKey=reviewTaskKey({kind:'identity',clusterId:candidate.id}),versionId:string|null=null,baseVersionId:string|null=null,material=false;
  const productId=facts.issuerProductId.state==='known'?facts.issuerProductId.value:null;
  const mechanism=facts.mechanism.state==='known'?facts.mechanism.value:null;
  let comparison:ResolutionResult|null=null;
  let decisions:ReturnType<typeof reviewDecisionSchema.parse>[]=[];
  let blockKey:string|null=null,blockRevision=0;
  if(productId&&mechanism&&!evidence.truncated&&!candidate.last_error?.includes('invalid_evidence')&&!candidate.last_error?.includes('ambiguous_subitems')) {
   blockKey=productId+':'+mechanism;
   blockRevision=(await this.db.prepare('SELECT revision FROM identity_blocks WHERE block_key=?').bind(blockKey).first<{revision:number}>())?.revision??0;
   expected.push({kind:'block',id:blockKey,revision:blockRevision});
   const page=await this.store.retrieveCandidates(productId,facts);
   decisions=page.decisions;
   const alias=facts.occurrenceAnchor.state==='known'?await this.store.lookupAlias('official_campaign',facts.occurrenceAnchor.value,blockKey):null;
   if(alias)evidence.confirmedEntityId=alias;
   if(candidate.entity_id){const veto=await this.db.prepare("SELECT entity_a,entity_b FROM identity_constraints WHERE relation='different' AND (entity_a=? OR entity_b=?) LIMIT 40").bind(candidate.entity_id,candidate.entity_id).all<{entity_a:string;entity_b:string}>();evidence.differentEntityIds=veto.results.map(r=>r.entity_a===candidate.entity_id?r.entity_b:r.entity_a);}
   const compared=page.entities.map(e=>({entity:e,result:compareCandidate(facts,e,evidence)}));
   const matches=compared.filter(r=>r.result.relation==='SAME');
   if(page.complete&&matches.length===1){comparison=matches[0].result;entity=await this.entity(matches[0].entity.id);}
   else if(page.complete&&!matches.length&&compared.every(r=>r.result.relation==='DISTINCT')) {
    const platform=await this.db.prepare('SELECT id FROM platforms WHERE id=?').bind(productId).first();
    if(platform){entity={id:crypto.randomUUID(),platform_id:productId,canonical_offer_id:null,business_revision:0,publication_revision:0,current_approved_version_id:null};builder.insert('benefit_entities',{id:entity.id,platform_id:productId});material=true;}
   }
   if(!page.complete)receipt.reasonCodes.push('retrieval_incomplete');
  }
  if(entity) {
   if(!material)expected.push({kind:'entity',id:entity.id,revision:entity.business_revision});
   receipt.entityId=entity.id;receipt.canonicalOfferId=entity.canonical_offer_id;
   const hash=await hashTerms(facts);
   const version=await this.db.prepare('SELECT id,state FROM benefit_versions WHERE entity_id=? AND terms_schema=? AND terms_hash=?').bind(entity.id,'terms-v1',hash).first<{id:string;state:string}>();
   versionId=version?.id??crypto.randomUUID();baseVersionId=entity.current_approved_version_id;
   receipt.versionId=versionId;
   const display=displayFromRaw(candidate.raw_candidate_json);

   const superseded=new Set(decisions.flatMap(d=>d.supersedesId?[d.supersedesId]:[]));
   const refusals=decisions.filter(d=>!superseded.has(d.id)&&decisionApplies(d,facts,{entityId:entity!.id,versionId,candidateId:candidate.id,observationId:candidate.observation_id}));
   if(refusals.length===1){
    receipt.outcome='duplicate_rejected';receipt.decisionId=refusals[0].id;receipt.taskId=null;receipt.reasonCodes=['existing_refusal'];
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
   if(facts.occurrenceAnchor.state==='known'&&evidence.sourceVerified&&!evidence.truncated&&facts.occurrenceAnchor.evidenceRefs.some(ref=>evidence.quoteById[ref]?.includes(facts.occurrenceAnchor.state==='known'?facts.occurrenceAnchor.value:''))) {
    builder.insert('identity_aliases',{id:crypto.randomUUID(),namespace:'official_campaign',alias_key:facts.occurrenceAnchor.value,scope_key:blockKey!,entity_id:entity.id,basis_json:JSON.stringify({observationId:candidate.observation_id,evidenceRefs:facts.occurrenceAnchor.evidenceRefs,rule:RESOLVER_VERSION})},'nothing');
    builder.assert("EXISTS(SELECT 1 FROM identity_aliases WHERE namespace='official_campaign' AND alias_key=? AND scope_key=? AND entity_id=? AND status='active')",[facts.occurrenceAnchor.value,blockKey!,entity.id]);
   }
   builder.insert('entity_observations',{entity_id:entity.id,candidate_id:candidate.id,relation:comparison?.termsRelation==='CHANGED'?'changed':comparison?.termsRelation==='EQUIVALENT'?'same':'evidence_only',resolver_version:RESOLVER_VERSION,reason_json:JSON.stringify(receipt.reasonCodes)},'nothing');
  } else {receipt.outcome='needs_identity_review';receipt.entityId=null;receipt.versionId=null;receipt.reasonCodes.push('identity_unproven');}
  if(!['duplicate_approved','duplicate_rejected'].includes(receipt.outcome)) {
   const active=await this.db.prepare("SELECT * FROM review_tasks WHERE task_key=? AND state IN ('open','checking','manual')").bind(taskKey).first<TaskRow>();
   const taskId=active?.id??crypto.randomUUID();receipt.taskId=taskId;
   if(!active){builder.insert('review_tasks',{id:taskId,task_key:taskKey,kind:taskKind,entity_id:entity?.id??null,version_id:versionId,base_version_id:baseVersionId});builder.insert('identity_events',{id:crypto.randomUUID(),event_key:`review:${taskId}:1:telegram`,entity_id:entity?.id??null,version_id:versionId,task_id:taskId,kind:'review',payload_json:JSON.stringify({taskId,materialRevision:1,channel:'telegram'})});material=true;}
   else expected.push({kind:'task',id:active.id,revision:active.revision});
   builder.insert('task_candidates',{task_id:taskId,candidate_id:candidate.id},'nothing');
  }
  if(receipt.outcome==='proposed_update'&&receipt.canonicalOfferId) {
   const original=await this.offer(receipt.canonicalOfferId),incoming=displayFromRaw(candidate.raw_candidate_json);
   const existing=await this.db.prepare('SELECT offer_id FROM offer_proposals WHERE offer_id=?').bind(receipt.canonicalOfferId).first();
   if(original&&incoming&&!existing){const merged={...incoming,id:original.id,platformId:original.platformId,usdEstimate:original.usdEstimate,usdMax:original.usdMax,valuation:original.valuation};const diff=Object.entries(merged).filter(([key,value])=>key in columns&&stableJson(value)!==stableJson((original as unknown as Record<string,unknown>)[key])).map(([field,to])=>({field,from:(original as unknown as Record<string,unknown>)[field]??null,to}));builder.insert('offer_proposals',{offer_id:original.id,candidate:JSON.stringify(merged),diff:JSON.stringify(diff),manual_fields:'[]'});}
  }
  if(entity&&material)builder.update('benefit_entities',{business_revision:entity.business_revision+1},'id=?',[entity.id]);
  if(blockKey&&material){builder.insert('identity_blocks',{block_key:blockKey,revision:blockRevision},'nothing');builder.update('identity_blocks',{revision:blockRevision+1},'block_key=?',[blockKey]);}
  builder.update('intake_candidates',{state:receipt.outcome==='duplicate_rejected'?'resolved_rejected':receipt.outcome==='duplicate_approved'||receipt.outcome==='duplicate_pending'?'resolved_same':receipt.outcome==='created_pending'?'pending_initial':receipt.outcome==='proposed_update'?'pending_change':'pending_identity',entity_id:receipt.entityId,version_id:receipt.versionId,task_id:receipt.taskId,decision_id:receipt.decisionId,revision:candidate.revision+1,receipt_json:JSON.stringify(receipt),last_error:null,next_attempt_at:null,lease_token:null,lease_until:null},'id=? AND revision=?',[candidate.id,candidate.revision]);
  builder.assert('EXISTS(SELECT 1 FROM intake_candidates WHERE id=? AND revision=?)',[candidate.id,candidate.revision+1]);builder.assertOwnership('intake_candidates',candidate.id);
  return this.commit(builder,expected,receipt);
 }

 async decideTask(taskId:string,raw:TaskDecisionInput):Promise<{decisionId:string;publicationRevision:number}> {
  const input=decisionInput.parse(raw),hash=await sha256(stableJson({taskId,...input})),command='decide:'+input.requestId;
  const previous=await readIdentityReceipt<{decisionId:string;publicationRevision:number}>(this.db,command,hash);if(previous){if(previous.status==='conflict')throw new IdentityError(409,'request payload conflict');return previous.value!;}
  if(input.role!=='admin'&&input.scope?.kind==='scoped_mechanism')throw new IdentityError(403,'scope expansion requires administrator');
  const task=await this.db.prepare('SELECT * FROM review_tasks WHERE id=?').bind(taskId).first<TaskRow>();
  if(!task||task.revision!==input.expectedRevision||!['open','checking','manual'].includes(task.state))throw new IdentityError(409,'task revision changed');
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
  if(task.kind==='terms_change'&&proposal&&JSON.parse(proposal.manual_fields).length)throw new IdentityError(409,'manual proposal edits require a refreshed identity version');
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
  builder.insert('review_decisions',{id:decisionId,entity_id:entity.id,version_id:task.version_id,action:input.action,reason_code:input.reasonCode??'other',scope_json:JSON.stringify(input.scope??{kind:'exact_version',entityId:entity.id,versionId:task.version_id}),reopen_policy_json:JSON.stringify(input.reopenPolicy??{kind:'manual',missingFacts:[]}),rules_version:RULES_VERSION,evidence_refs_json:'[]',actor:input.actor,base_version_id:task.base_version_id,target_version_id:task.version_id,idempotency_key:command,supersedes_id:priorRefusal.results[0]?.id??null});
  builder.update('benefit_versions',{state:input.action==='approve'?'approved':'rejected'},'id=? AND entity_id=?',[task.version_id,entity.id]);
  builder.update('benefit_entities',{business_revision:entity.business_revision+1,publication_revision:publicationRevision,...(input.action==='approve'?{current_approved_version_id:task.version_id}:{})},'id=?',[entity.id]);builder.assertOwnership('benefit_entities',entity.id);
  builder.update('review_tasks',{state:'resolved',decision_id:decisionId,revision:task.revision+1,lease_token:null,lease_until:null},'id=?',[task.id]);
  if(original){
   if(accepted)builder.update('offers',{...offerValues(accepted),review_state:'approved',updated_at:new Date().toISOString(),last_verified_at:new Date().toISOString(),verify_result:'审核员确认官方证据'},'id=?',[original.id]);
   else if(!entity.current_approved_version_id)builder.update('offers',{review_state:'rejected',updated_at:new Date().toISOString()},'id=?',[original.id]);
   builder.insert('reviews',{offer_id:original.id,action:input.action,reviewer:input.actor,reason:input.reason??null,reason_code:input.reasonCode??'other',decision_id:decisionId});
   if(task.kind==='terms_change'){
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
