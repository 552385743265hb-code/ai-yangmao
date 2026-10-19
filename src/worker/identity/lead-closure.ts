import {assertOfficialLeadRejection} from '../official-lead-policy';
import type {LeadResolution} from '../../shared/lead-review';
import type {ReviewReasonCode} from '../../shared/screening/types';
import {sha256,stableJson} from '../../shared/identity/normalize';
import {unknownIdentityTerms} from './adapters';
import {IdentityStore,IdentityError} from './store';
import {MutationBuilder,commitIdentityMutation} from './commit';
import {RULES_VERSION} from '../../shared/identity/compare';
/** Preserve the existing grounded lead closure as observation-only refusal memory.
 * It grants no offer approval and no product-wide rejection authority. */
export async function closeIdentityLead(db:D1Database,lead:{id:number;url:string;status:string;raw:string|null;title:string|null;resolution:LeadResolution|null;offerId:string|null},resolution:LeadResolution,sourceText:string,options:{actor?:string;raw?:string|null;reasonCode?:ReviewReasonCode}={}){
 await assertOfficialLeadRejection(db,{url:lead.url,text:sourceText,reason:resolution.reason,reasonCode:options.reasonCode});
 const row=await db.prepare('SELECT resolution FROM leads WHERE id=?').bind(lead.id).first<{resolution:string|null}>();
 if(!row||stableJson(JSON.parse(row.resolution??'null'))!==stableJson(lead.resolution))throw new IdentityError(409,'lead review changed');
 const command='lead-close:'+lead.id+':'+resolution.jobId,hash=await sha256(stableJson({leadId:lead.id,resolution,sourceText,actor:options.actor??'pipeline:lead-review'}));
 const observedAt=resolution.checkedAt??new Date().toISOString();
 const ob=await new IdentityStore(db).recordObservation({requestId:command,originalUrl:lead.url,finalUrl:lead.url,text:sourceText,fetchKind:'indirect',observedAt});
 const candidateId='lead-refusal-'+await sha256(command),decisionId='lead-refusal-decision-'+await sha256(command),facts=unknownIdentityTerms(),quote=sourceText.slice(0,20000),builder=new MutationBuilder(db,command,hash);
 builder.require("EXISTS(SELECT 1 FROM leads WHERE id=? AND status=? AND resolution IS ? AND url=? AND raw IS ? AND title IS ?)",[lead.id,lead.status,row.resolution,lead.url,lead.raw,lead.title]);
 const receipt={inputId:'lead-'+lead.id,candidateId,canonicalOfferId:null,entityId:null,versionId:null,decisionId,taskId:null,outcome:'duplicate_rejected',retryable:false,reasonCodes:['grounded_lead_closure']};
 builder.insert('intake_candidates',{id:candidateId,observation_id:ob.observationId,source_fetch_id:ob.fetchId??null,extraction_version:'lead-closure-v1',span_key:'lead:'+lead.id,candidate_key:await sha256(command),raw_candidate_json:JSON.stringify({candidate:{legacyLeadId:lead.id},quotes:[{id:'body',start:0,end:quote.length,quote}],span:{start:0,end:quote.length,quote}}),facts_json:JSON.stringify(facts),facts_hash:await sha256(stableJson(facts)),state:'resolved_rejected',receipt_json:JSON.stringify(receipt)});
 builder.insert('review_decisions',{id:decisionId,candidate_id:candidateId,action:'reject',reason_code:options.reasonCode??'other',reason_text:resolution.reason??'',scope_json:JSON.stringify({kind:'observation_only',observationId:ob.observationId}),reopen_policy_json:'{"kind":"manual","missingFacts":[]}',basis_json:JSON.stringify({leadId:lead.id,jobId:resolution.jobId,evidenceUrl:resolution.evidenceUrl,quote:resolution.quote}),rules_version:RULES_VERSION,evidence_refs_json:JSON.stringify([ob.observationId]),actor:options.actor??'pipeline:lead-review',idempotency_key:command});
 builder.update('intake_candidates',{decision_id:decisionId},'id=?',[candidateId]);builder.assertOwnership('intake_candidates',candidateId);builder.insert('lead_candidate_links',{lead_id:lead.id,candidate_id:candidateId});
 builder.update('leads',{status:'rejected',resolution:JSON.stringify({...resolution,identityCandidateIds:[candidateId],identityTaskIds:[]}),offer_id:resolution.offerIds?.[0]??lead.offerId,...(options.raw!==undefined?{raw:options.raw}:{})},'id=?',[lead.id]);
 const result=await commitIdentityMutation(db,builder.plan([],{status:'closed',candidateId,decisionId}));if(result.status==='conflict')throw new IdentityError(409,'lead closure changed; nothing applied');return result.value;
}

/** Reopen observation-only closure memory for lead extraction, not for offer identity comparison. */
export async function reopenLeadClosure(db:D1Database,input:{leadId:number;decisionId:string;expectedRevision:number;requestId:string;actor:string}) {
 const command='lead-reanalyze:'+input.requestId,hash=await sha256(stableJson(input));
 const row=await db.prepare(`SELECT d.candidate_id,d.scope_json,c.raw_candidate_json,c.receipt_json,c.revision,c.extraction_version
 FROM review_decisions d JOIN intake_candidates c ON c.id=d.candidate_id
 WHERE d.id=? AND d.action='reject' AND d.entity_id IS NULL
 AND EXISTS(SELECT 1 FROM lead_candidate_links l WHERE l.lead_id=? AND l.candidate_id=c.id)`).bind(input.decisionId,input.leadId).first<{candidate_id:string;scope_json:string;raw_candidate_json:string;receipt_json:string;revision:number;extraction_version:string}>();
 if(!row||row.extraction_version!=='lead-closure-v1'||JSON.parse(row.scope_json).kind!=='observation_only'||JSON.parse(row.raw_candidate_json).candidate?.legacyLeadId!==input.leadId)throw new IdentityError(409,'lead closure is not an observation-only snapshot');
 const decisionId=crypto.randomUUID(),builder=new MutationBuilder(db,command,hash);
 builder.require('EXISTS(SELECT 1 FROM intake_candidates WHERE id=? AND revision=?)',[row.candidate_id,input.expectedRevision]);
 builder.require('NOT EXISTS(SELECT 1 FROM review_decisions WHERE supersedes_id=?)',[input.decisionId]);
 builder.insert('review_decisions',{id:decisionId,candidate_id:row.candidate_id,action:'reopen',reason_code:'other',reason_text:'管理员抽查确认误关，恢复线索研判与官方补证',basis_json:JSON.stringify({leadId:input.leadId,resumeLeadReview:true}),scope_json:row.scope_json,reopen_policy_json:'{"kind":"manual","missingFacts":[]}',rules_version:RULES_VERSION,evidence_refs_json:'[]',actor:input.actor,idempotency_key:command,supersedes_id:input.decisionId});
 // The old rejection snapshot stays immutable and linked for audit, but is not an active extraction result.
 builder.update('intake_candidates',{decision_id:decisionId,revision:row.revision+1,receipt_json:JSON.stringify({...JSON.parse(row.receipt_json),decisionId,taskId:null,outcome:'evidence_reopen',retryable:false,reasonCodes:['lead_reanalysis_requested']})},'id=?',[row.candidate_id]);
 builder.assertOwnership('intake_candidates',row.candidate_id);
 const result=await commitIdentityMutation(db,builder.plan([],{decisionId}));
 if(result.status==='conflict')throw new IdentityError(409,'lead closure changed; refresh recovery');return result.value;
}
