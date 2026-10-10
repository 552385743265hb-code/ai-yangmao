import {canonicalOfferMap} from './canonical';
import type { LeadResolution } from '../../shared/lead-review';
import { sha256,stableJson } from '../../shared/identity/normalize';
import { MutationBuilder,commitIdentityMutation } from './commit';
import { IdentityError } from './store';
export async function aggregateIdentityLead(db:D1Database,leadId:number,forceReview=false):Promise<{status:string;offerIds:string[];taskIds:string[];deferredIds:string[]}|null> {
 const rows=await db.prepare(`SELECT c.id,c.state,c.revision,c.receipt_json,e.canonical_offer_id,t.id AS task_id,t.kind,t.state AS task_state
  FROM lead_candidate_links l JOIN intake_candidates c ON c.id=l.candidate_id LEFT JOIN benefit_entities e ON e.id=c.entity_id LEFT JOIN review_tasks t ON t.id=coalesce((SELECT canonical_task_id FROM merge_task_sources WHERE source_task_id=c.task_id AND status='active'),c.task_id) WHERE l.lead_id=? ORDER BY c.id LIMIT 101`).bind(leadId).all<{id:string;state:string;revision:number;receipt_json:string|null;canonical_offer_id:string|null;task_id:string|null;kind:string|null;task_state:string|null}>();
 const extractions=await db.prepare('SELECT e.request_id,e.state,e.extraction_complete FROM identity_extraction_leads l JOIN intake_extractions e ON e.request_id=l.request_id WHERE l.lead_id=? ORDER BY e.request_id LIMIT 101').bind(leadId).all<{request_id:string;state:string;extraction_complete:number}>();
 if(!rows.results.length&&!extractions.results.length)return null;
 const lead=await db.prepare('SELECT status,resolution,offer_id FROM leads WHERE id=?').bind(leadId).first<{status:string;resolution:string|null;offer_id:string|null}>();
 if(!lead)throw new IdentityError(404,'lead not found');
 const all=rows.results;
 const originOfferIds=[...new Set(all.flatMap(r=>r.canonical_offer_id?[r.canonical_offer_id]:[]))];
 const routing=await canonicalOfferMap(db,originOfferIds),offerIds=[...new Set(originOfferIds.map(id=>routing.get(id)?.offerId??id))];
 const taskIds=[...new Set(all.flatMap(r=>r.task_id&&['open','checking','manual'].includes(r.task_state??'')?[r.task_id]:[]))];
 const deferredIds=all.filter(r=>['received','resolving','deferred'].includes(r.state)).map(r=>r.id);
 const incomplete=all.length>100||extractions.results.length>100||!all.length||extractions.results.some(e=>!e.extraction_complete||e.state==='deferred')||!!deferredIds.length;
 const identityPending=all.some(r=>r.task_id&&['identity','evidence_reopen','merge_conflict'].includes(r.kind??'')&&['open','checking','manual'].includes(r.task_state??''));
 const status=forceReview||incomplete||identityPending?'reviewing':offerIds.length?'linked':all.every(r=>r.state==='resolved_rejected')?'rejected':'reviewing';
 const retryNeeded=deferredIds.length>0||extractions.results.some(e=>!e.extraction_complete||e.state==='deferred');
 const old:LeadResolution|null=lead.resolution?JSON.parse(lead.resolution):null;
 const basis={leadId,status,routing:[...routing.entries()],rows:all.map(r=>[r.id,r.revision,r.state,r.task_state]),extractions:extractions.results};
 const hash=await sha256(stableJson(basis)),request='lead-identity:'+leadId+':'+hash;
 const resolution:LeadResolution={status:status==='linked'?'linked':status==='rejected'?'closed':retryNeeded?'retry':'manual',jobId:old?.jobId??'identity-'+hash.slice(0,24),attempts:old?.attempts??0,inconclusive:old?.inconclusive??0,checkedAt:old?.checkedAt??new Date().toISOString(),nextAttemptAt:retryNeeded?new Date(Date.now()+20*60_000).toISOString():null,reason:status==='linked'?'全部候选已有实际活动记录':status==='rejected'?'全部候选关联既存拒绝决定':'候选由身份任务或持久重试接手',queries:old?.queries??[],candidates:old?.candidates??[],offerIds,originOfferIds,identityTaskIds:taskIds,identityCandidateIds:all.map(r=>r.id)};
 const builder=new MutationBuilder(db,request,hash);
 builder.require("EXISTS(SELECT 1 FROM leads WHERE id=? AND status=? AND coalesce(resolution,'')=coalesce(?,''))",[leadId,lead.status,lead.resolution]);
 builder.update('leads',{status,offer_id:offerIds[0]??null,resolution:JSON.stringify(resolution)},'id=?',[leadId]);
 const result=await commitIdentityMutation(db,builder.plan([],{status,offerIds,taskIds,deferredIds}));
 if(result.status==='conflict')throw new IdentityError(409,'lead changed');return result.value;
}
