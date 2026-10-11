import {z} from 'zod';
import {canonicalTermsSchema,reviewDecisionSchema,type CanonicalTermsV1,type RetrievalPage,type VersionedEntity} from '../../shared/identity/types';
import {hashTerms,sha256,stableJson} from '../../shared/identity/normalize';
import {IdentityError,readReviewDecision} from './store';
import {MutationBuilder,commitIdentityMutation,type Predicate,type ExpectedRevision} from './commit';
const stateSchema=z.strictObject({payloadHash:z.string(),candidateRevision:z.number(),blockRevision:z.number(),targetRevision:z.number().nullable(),page:z.number().int(),cursor:z.string(),decisions:z.array(reviewDecisionSchema)});
interface ManualHistoryInput {command:string;payloadHash:string;candidateId:string;candidateRevision:number;observationId:string;taskId:string;taskRevision:number;productId:string;facts:CanonicalTermsV1;entityId:string|null;blockKey:string;blockRevision:number}
/** Explicit human selection limits entity comparison, but never skips applicable refusals. */
export async function retrieveManualHistory(db:D1Database,input:ManualHistoryInput):Promise<{page:RetrievalPage;guard:Predicate;continued:boolean}> {
 let target:VersionedEntity|null=null;
 if(input.entityId){const row=await db.prepare("SELECT e.id,e.platform_id,e.business_revision,e.publication_revision,e.current_approved_version_id,v.facts_json FROM benefit_entities e LEFT JOIN benefit_versions v ON v.id=coalesce(e.current_approved_version_id,(SELECT id FROM benefit_versions WHERE entity_id=e.id ORDER BY created_at DESC,id DESC LIMIT 1)) WHERE e.id=? AND e.platform_id=? AND e.state='active'").bind(input.entityId,input.productId).first<{id:string;platform_id:string;business_revision:number;publication_revision:number;current_approved_version_id:string|null;facts_json:string|null}>();if(!row)throw new IdentityError(409,'selected active identity not found in this product');target={id:row.id,platformId:row.platform_id,revision:row.business_revision,publicationRevision:row.publication_revision,approvedVersionId:row.current_approved_version_id,terms:row.facts_json?canonicalTermsSchema.parse(JSON.parse(row.facts_json)):null};}
 const prefix='manual-history:'+await sha256(input.command)+':';
 const prior=await db.prepare("SELECT result_json FROM identity_commands WHERE request_id>=? AND request_id<? AND state='applied' ORDER BY request_id DESC LIMIT 1").bind(prefix,prefix+'~').first<{result_json:string}>();
 const state=prior?stateSchema.parse(JSON.parse(prior.result_json)):null;
 if(state&&(state.payloadHash!==input.payloadHash||state.candidateRevision!==input.candidateRevision||state.blockRevision!==input.blockRevision||state.targetRevision!==(target?.revision??null)))throw new IdentityError(409,'manual history baseline or payload changed; refresh the task and start a new request');
 const matchingVersion=target?await db.prepare('SELECT id FROM benefit_versions WHERE entity_id=? AND terms_schema=? AND terms_hash=?').bind(target.id,input.facts.schemaVersion,await hashTerms(input.facts)).first<{id:string}>():null;
 const scope=JSON.stringify({entityId:target?.id??null,candidateId:input.candidateId,observationId:input.observationId,productId:input.productId,mechanism:input.facts.mechanism.state==='known'?input.facts.mechanism.value:null,anchor:input.facts.occurrenceAnchor.state==='known'?input.facts.occurrenceAnchor.value:null,matchingVersion:matchingVersion?.id??null,approvedVersion:target?.approvedVersionId??null});
 const where=`d.action='reject' AND NOT EXISTS(SELECT 1 FROM review_decisions n WHERE n.supersedes_id=d.id) AND (
 (d.entity_id=json_extract(?1,'$.entityId') AND (json_extract(d.scope_json,'$.kind')='entity_alias' OR json_extract(d.scope_json,'$.kind')='exact_version' OR json_extract(d.reopen_policy_json,'$.kind') IN ('missing_facts','new_occurrence')))
 OR d.candidate_id=json_extract(?1,'$.candidateId')
 OR (json_extract(d.scope_json,'$.productId')=json_extract(?1,'$.productId') AND ((json_extract(d.scope_json,'$.kind')='scoped_mechanism' AND json_extract(d.scope_json,'$.mechanism')=json_extract(?1,'$.mechanism')) OR (json_extract(d.scope_json,'$.kind')='occurrence' AND json_extract(d.scope_json,'$.anchor')=json_extract(?1,'$.anchor'))))
 OR (json_extract(d.scope_json,'$.observationId')=json_extract(?1,'$.observationId') AND (d.candidate_id IS NULL OR d.candidate_id=json_extract(?1,'$.candidateId'))))`;
 const rows=await db.prepare(`SELECT d.* FROM review_decisions d WHERE ${where} AND d.id>?2 ORDER BY d.id LIMIT 41`).bind(scope,state?.cursor??'').all<Record<string,unknown>>();
 const decisions=[...(state?.decisions??[]),...rows.results.slice(0,40).map(readReviewDecision)];
 const ids=JSON.stringify(decisions.map(d=>d.id));
 const guardSql=`NOT EXISTS(SELECT 1 FROM review_decisions d WHERE ${where} AND d.id NOT IN (SELECT value FROM json_each(?2))) AND NOT EXISTS(SELECT 1 FROM review_decisions n WHERE n.supersedes_id IN (SELECT value FROM json_each(?2)))`;
 // Guard placeholders are relative to a larger command; expand numbered read-query bindings.
 const guardArgs:string[]=[];const guard:Predicate={sql:guardSql.replace(/\?([12])/g,(_match,index)=>{guardArgs.push(index==='1'?scope:ids);return '?';}),args:guardArgs};
 const continued=rows.results.length>40;
 if(continued){
  const next={payloadHash:input.payloadHash,candidateRevision:input.candidateRevision,blockRevision:input.blockRevision,targetRevision:target?.revision??null,page:(state?.page??0)+1,cursor:String(rows.results[39].id),decisions};
  if(stableJson(next).length>750000)throw new IdentityError(409,'too many active refusal records; inspect and reconcile their scopes before this operation');
  const builder=new MutationBuilder(db,prefix+String(next.page).padStart(6,'0'),await sha256(stableJson(next))),expected:ExpectedRevision[]=[{kind:'task',id:input.taskId,revision:input.taskRevision},{kind:'block',id:input.blockKey,revision:input.blockRevision},...(target?[{kind:'entity' as const,id:target.id,revision:target.revision}]:[])];
  builder.require('EXISTS(SELECT 1 FROM intake_candidates WHERE id=? AND revision=?)',[input.candidateId,input.candidateRevision]);builder.require('NOT EXISTS(SELECT 1 FROM review_decisions WHERE supersedes_id IN (SELECT value FROM json_each(?)))',[ids]);
  const checkpoint=await commitIdentityMutation(db,builder.plan(expected,next));if(checkpoint.status==='conflict')throw new IdentityError(409,'manual history changed while saving progress');
 }
 return {page:{entities:target?[target]:[],decisions,complete:!continued,nextCursor:continued?String(rows.results[39].id):null},guard,continued};
}
