import { beforeEach,afterEach,expect,it } from 'vitest';
import { IdentityStore } from '../src/worker/identity/store';
import { IdentityService } from '../src/worker/identity/service';
import { identityDb } from './fixtures/identity/db';
import { terms,known } from './fixtures/identity/terms';
import { displayOffer } from './fixtures/identity/offer';
import type { CanonicalTermsV1 } from '../src/shared/identity/types';
let f:ReturnType<typeof identityDb>,store:IdentityStore,service:IdentityService;
beforeEach(()=>{f=identityDb();store=new IdentityStore(f.db);service=new IdentityService(f.db);});afterEach(()=>f.sqlite.close());
const facts=()=>{const v=terms();v.occurrenceAnchor=known('signup-2026');return v;};
async function intake(requestId:string,text='Campaign signup-2026 grants 10 USD.',v:CanonicalTermsV1=facts(),display:unknown=displayOffer()) {
 const obs=await store.recordObservation({requestId,originalUrl:'https://vendor.example/'+requestId,finalUrl:'https://vendor.example/'+requestId,text,sourceId:'vendor-source',fetchKind:'direct',observedAt:'2026-10-10T10:00:00.000Z'});
 const [receipt]=await store.recordCandidates({requestId:'batch-'+requestId,observationId:obs.observationId,extractionVersion:'canonical-v1',extractionComplete:true,leadIds:[1],candidates:[{inputId:requestId,span:{start:0,end:text.length,quote:text},quotes:[{id:'quote-1',start:0,end:text.length,quote:text}],facts:v,rawCandidate:display}]});
 return receipt.candidateId;
}
it('A24 same strong campaign across two requests creates one entity/version/task and no publication',async()=>{
 const a=await service.resolveCandidate(await intake('one'),'resolve-one');
 const b=await service.resolveCandidate(await intake('two'),'resolve-two');
 expect(a).toMatchObject({outcome:'created_pending',retryable:false,entityId:expect.any(String),taskId:expect.any(String)});
 expect(b).toMatchObject({outcome:'duplicate_pending',entityId:a.entityId,versionId:a.versionId,taskId:a.taskId});
 for(const table of ['benefit_entities','benefit_versions','review_tasks','offers'])expect(f.sqlite.prepare(`SELECT count(*) n FROM ${table}`).get()).toEqual({n:1});
 expect(f.sqlite.prepare('SELECT review_state FROM offers').get()).toEqual({review_state:'pending'});
});
it('A20 request replay does not create another event or decision',async()=>{
 const candidateId=await intake('one');const result=await service.resolveCandidate(candidateId,'resolve');
 expect(await service.resolveCandidate(candidateId,'resolve')).toEqual(result);
 expect(f.sqlite.prepare('SELECT count(*) n FROM identity_events').get()).toEqual({n:1});
});
it('A14/A17 approval is the only publication boundary, including restoring old terms',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'resolve-a');
 await service.decideTask(a.taskId!,{requestId:'approve-a',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const changed=facts();changed.benefitPools[0].amount=known({value:'20',unit:'currency',currency:'USD'});
 const b=await service.resolveCandidate(await intake('b','Campaign signup-2026 replaces 10 USD with 20 USD.',changed,displayOffer('注册赠送 20 美元 API 额度')),'resolve-b');
 expect(b.outcome).toBe('proposed_update');
 expect(f.sqlite.prepare('SELECT value_text FROM offers').get()).toEqual({value_text:'注册赠送 10 美元 API 额度'});
 await service.decideTask(b.taskId!,{requestId:'approve-b',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const restored=await service.resolveCandidate(await intake('restore','Campaign signup-2026 replaces 20 USD with 10 USD.'),'resolve-restore');
 expect(restored.outcome).toBe('proposed_update');expect(restored.versionId).toBe(a.versionId);
 await service.decideTask(restored.taskId!,{requestId:'approve-restore',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 expect(f.sqlite.prepare('SELECT publication_revision FROM benefit_entities').get()).toEqual({publication_revision:3});
 expect(f.sqlite.prepare("SELECT kind FROM identity_events WHERE kind IN ('new','changed') ORDER BY rowid").all()).toEqual([{kind:'new'},{kind:'changed'},{kind:'changed'}]);
});
it('A26 rejected version repeat keeps its refusal and does not create another review task',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'resolve-a');
 await service.decideTask(a.taskId!,{requestId:'reject-a',expectedRevision:0,action:'reject',reasonCode:'paid_bundle',actor:'admin',role:'admin'});
 const b=await service.resolveCandidate(await intake('repeat'),'resolve-repeat');
 expect(b).toMatchObject({outcome:'duplicate_rejected',decisionId:expect.any(String)});
 expect(f.sqlite.prepare('SELECT count(*) n FROM review_tasks').get()).toEqual({n:1});
 expect(f.sqlite.prepare('SELECT count(*) n FROM review_decisions').get()).toEqual({n:1});
});
it('A22 stale task cards preserve proposals and produce no decision or outbox changes',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'resolve-a');
 f.sqlite.prepare('UPDATE review_tasks SET revision=1 WHERE id=?').run(a.taskId);
 await expect(service.decideTask(a.taskId!,{requestId:'stale',expectedRevision:0,action:'reject',actor:'admin',role:'admin'})).rejects.toMatchObject({status:409});
 expect(f.sqlite.prepare('SELECT count(*) n FROM review_decisions').get()).toEqual({n:0});
 expect(f.sqlite.prepare('SELECT review_state FROM offers').get()).toEqual({review_state:'pending'});
});
it('A27 unknown product creates a durable identity task rather than an invented offer',async()=>{
 const v=facts();v.issuerProductId={state:'unknown'};
 const receipt=await service.resolveCandidate(await intake('unknown','Campaign signup-2026 grants 10 USD.',v,{}),'resolve');
 expect(receipt).toMatchObject({outcome:'needs_identity_review',entityId:null,canonicalOfferId:null,taskId:expect.any(String)});
 expect(f.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:0});
});
it('A30 a reviewer cannot enlarge refusal scope or reopen an admin decision',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'resolve-a');
 await expect(service.decideTask(a.taskId!,{requestId:'wide',expectedRevision:0,action:'reject',actor:'reviewer',role:'reviewer',scope:{kind:'scoped_mechanism',productId:'vendor',mechanism:'signup_grant',confirmedBy:'reviewer'}})).rejects.toMatchObject({status:403});
});
it('A08 missing facts do not mint a partial version or permit identity-task approval',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'resolve-a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const partial=facts();partial.benefitPools[0].amount={state:'unknown'};
 const b=await service.resolveCandidate(await intake('partial','Campaign signup-2026 is available.',partial),'partial');
 expect(b.outcome).toBe('needs_identity_review');
 expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_versions').get()).toEqual({n:1});
 await expect(service.decideTask(b.taskId!,{requestId:'unsafe',expectedRevision:0,action:'approve',actor:'admin',role:'admin'})).rejects.toMatchObject({status:400});
});
it('A22 manual proposal edits block stale publication and preserve the edited draft',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'resolve-a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const change=facts();change.benefitPools[0].amount=known({value:'20',unit:'currency',currency:'USD'});
 const b=await service.resolveCandidate(await intake('b','Campaign signup-2026 replaces 10 USD with 20 USD.',change,displayOffer('注册赠送 20 美元 API 额度')),'b');
 f.sqlite.prepare("UPDATE offer_proposals SET candidate=json_set(candidate,'$.valueText','管理员正在核对的额度'),manual_fields='[\"valueText\"]'").run();
 await expect(service.decideTask(b.taskId!,{requestId:'approve-b',expectedRevision:0,action:'approve',actor:'admin',role:'admin'})).rejects.toMatchObject({status:409});
 expect(JSON.parse(String(f.sqlite.prepare('SELECT candidate FROM offer_proposals').get()?.candidate)).valueText).toBe('管理员正在核对的额度');
 expect(f.sqlite.prepare('SELECT publication_revision FROM benefit_entities').get()).toEqual({publication_revision:1});
});
it('A22 rejecting a changed version atomically retains legacy refusal evidence and audit',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const change=facts();change.benefitPools[0].amount=known({value:'20',unit:'currency',currency:'USD'});
 const b=await service.resolveCandidate(await intake('b','Campaign signup-2026 replaces 10 USD with 20 USD.',change,displayOffer('注册赠送 20 美元 API 额度')),'b');
 await service.decideTask(b.taskId!,{requestId:'reject',expectedRevision:0,action:'reject',actor:'admin',role:'admin',reasonCode:'insufficient_evidence'});
 expect(f.sqlite.prepare('SELECT count(*) n FROM rejected_offer_updates').get()).toEqual({n:1});
 expect(f.sqlite.prepare('SELECT count(*) n FROM offer_proposals').get()).toEqual({n:0});
 expect(f.sqlite.prepare('SELECT value_text FROM offers').get()).toEqual({value_text:'注册赠送 10 美元 API 额度'});
});
it('A29 decisions advance the product block and cannot attach a foreign scope',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');
 const before=Number(f.sqlite.prepare("SELECT revision FROM identity_blocks WHERE block_key='vendor:signup_grant'").get()?.revision);
 await expect(service.decideTask(a.taskId!,{requestId:'foreign',expectedRevision:0,action:'reject',actor:'admin',role:'admin',scope:{kind:'exact_version',entityId:'foreign',versionId:'other'}})).rejects.toMatchObject({status:400});
 await service.decideTask(a.taskId!,{requestId:'valid',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 expect(Number(f.sqlite.prepare("SELECT revision FROM identity_blocks WHERE block_key='vendor:signup_grant'").get()?.revision)).toBe(before+1);
});
it('A14 different proposals remain visible as a conflict instead of replacing the first draft',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 for(const amount of ['20','30']){const change=facts();change.benefitPools[0].amount=known({value:amount,unit:'currency',currency:'USD'});const receipt=await service.resolveCandidate(await intake('b'+amount,`Campaign signup-2026 replaces 10 USD with ${amount} USD.`,change,displayOffer('注册赠送 '+amount+' 美元 API 额度')),'b'+amount);if(amount==='30')expect(receipt.outcome).toBe('needs_identity_review');}
 expect(JSON.parse(String(f.sqlite.prepare('SELECT candidate FROM offer_proposals').get()?.candidate)).valueText).toBe('注册赠送 20 美元 API 额度');
 expect(f.sqlite.prepare("SELECT count(*) n FROM review_tasks WHERE kind='merge_conflict'").get()).toEqual({n:1});
});
it('A29 task lease tokens expire and cannot overwrite a later human decision',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');
 const lease=await service.claimTask(a.taskId!,{requestId:'claim',expectedRevision:0});
 expect(lease).toMatchObject({revision:1,leaseToken:expect.any(String)});
 await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:1,action:'approve',actor:'admin',role:'admin'});
 await expect(service.submitTaskSuggestion(a.taskId!,{requestId:'late',expectedRevision:1,leaseToken:lease.leaseToken,result:{relation:'UNRESOLVED',entityId:null,termsRelation:'INSUFFICIENT',matchingVersionId:null,evidenceRefs:[],conflicts:[],reasonCodes:['uncertain'],retrievalComplete:true,resolverVersion:'identity-v1',rulesVersion:'identity-rules-v1'}})).rejects.toMatchObject({status:409});
 expect(f.sqlite.prepare('SELECT review_state FROM offers').get()).toEqual({review_state:'approved'});
});
it('A20/A28 task suggestion replay is idempotent and does not increment material revision',async()=>{
 const v=facts();v.issuerProductId={state:'unknown'};
 const a=await service.resolveCandidate(await intake('a','Campaign signup-2026 grants 10 USD.',v,{}),'a');
 const lease=await service.claimTask(a.taskId!,{requestId:'claim',expectedRevision:0});
 const input={requestId:'result',expectedRevision:lease.revision,leaseToken:lease.leaseToken,result:{relation:'UNRESOLVED' as const,entityId:null,termsRelation:'INSUFFICIENT' as const,matchingVersionId:null,evidenceRefs:[],conflicts:[],reasonCodes:['uncertain'],retrievalComplete:true,resolverVersion:'identity-v1',rulesVersion:'identity-rules-v1'}};
 const one=await service.submitTaskSuggestion(a.taskId!,input);expect(await service.submitTaskSuggestion(a.taskId!,input)).toEqual(one);
 expect(f.sqlite.prepare('SELECT state,material_revision FROM review_tasks').get()).toEqual({state:'manual',material_revision:1});
 expect(f.sqlite.prepare('SELECT count(*) n FROM identity_events').get()).toEqual({n:1});
});
it('A29 manual display edits are version guarded and cannot be overwritten by later ingestion',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');
 const edited=await service.editManagedOffer(a.canonicalOfferId!,{requestId:'manual-edit',expectedTaskRevision:0,taskId:a.taskId!,fields:{valueText:'管理员确认的 15 美元额度'},actor:'admin'});
 expect(edited.revision).toBe(1);
 expect(f.sqlite.prepare('SELECT value_text FROM offers').get()).toEqual({value_text:'管理员确认的 15 美元额度'});
 expect(f.sqlite.prepare('SELECT revision FROM review_tasks WHERE id=?').get(a.taskId)).toEqual({revision:1});
 await service.resolveCandidate(await intake('repeat'),'repeat');
 expect(f.sqlite.prepare('SELECT value_text FROM offers').get()).toEqual({value_text:'管理员确认的 15 美元额度'});
});
it('A14 an edit to a published mapped offer creates a draft and preserves the approved projection',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const row=f.sqlite.prepare('SELECT updated_at FROM offers').get();
 const result=await service.editManagedOffer(a.canonicalOfferId!,{requestId:'edit-published',expectedOfferVersion:String(row?.updated_at),fields:{valueText:'管理员待审新额度'},actor:'admin'});
 expect(result.taskId).toEqual(expect.any(String));
 expect(f.sqlite.prepare('SELECT value_text FROM offers').get()).toEqual({value_text:'注册赠送 10 美元 API 额度'});
 expect(JSON.parse(String(f.sqlite.prepare('SELECT candidate FROM offer_proposals').get()?.candidate)).valueText).toBe('管理员待审新额度');
});
it('A28 a presentation-only edit does not create a new task or material reminder',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const before=f.sqlite.prepare('SELECT updated_at FROM offers').get();
 await service.editManagedOffer(a.canonicalOfferId!,{requestId:'title',expectedOfferVersion:String(before?.updated_at),fields:{title:'管理员更清楚的标题'},actor:'admin'});
 expect(f.sqlite.prepare('SELECT title FROM offers').get()).toEqual({title:'管理员更清楚的标题'});
 expect(f.sqlite.prepare('SELECT count(*) n FROM review_tasks').get()).toEqual({n:1});
 expect(f.sqlite.prepare("SELECT count(*) n FROM identity_events WHERE kind='review'").get()).toEqual({n:1});
});
it('A26 unpublishing a managed offer adds a scoped refusal without deleting historical proposals',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const original=f.sqlite.prepare('SELECT updated_at FROM offers').get();
 f.sqlite.prepare("INSERT INTO offer_proposals(offer_id,candidate,diff,manual_fields) VALUES(?,?,'[]','[\"valueText\"]')").run(a.canonicalOfferId,JSON.stringify(displayOffer('尚待处理的人工草稿')));
 await service.setVisibility(a.canonicalOfferId!,{requestId:'unpublish',expectedOfferVersion:String(original?.updated_at),action:'unpublish',reason:'付费套餐内含，不收录',reasonCode:'paid_bundle',actor:'admin'});
 expect(f.sqlite.prepare('SELECT review_state FROM offers').get()).toEqual({review_state:'rejected'});
 expect(f.sqlite.prepare('SELECT count(*) n FROM offer_proposals').get()).toEqual({n:1});
 const repeat=await service.resolveCandidate(await intake('repeat'),'repeat');expect(repeat.outcome).toBe('duplicate_rejected');
});
it('A19 task results cannot name an existing entity outside the leased candidate set',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');
 f.sqlite.exec("INSERT INTO platforms(id,name,type) VALUES('other','Other','lab'); INSERT INTO benefit_entities(id,platform_id) VALUES('foreign','other')");
 const lease=await service.claimTask(a.taskId!,{requestId:'claim',expectedRevision:0});
 await expect(service.submitTaskSuggestion(a.taskId!,{requestId:'forged',expectedRevision:lease.revision,leaseToken:lease.leaseToken,result:{relation:'SAME',entityId:'foreign',termsRelation:'EQUIVALENT',matchingVersionId:null,evidenceRefs:[],conflicts:[],reasonCodes:[],retrievalComplete:true,resolverVersion:'identity-v1',rulesVersion:'identity-rules-v1'}})).rejects.toMatchObject({status:400});
});
it('A29 a human can resolve an unknown-product task as a new pending activity atomically',async()=>{
 const unknown=facts();unknown.issuerProductId={state:'unknown'};unknown.mechanism={state:'unknown'};
 const a=await service.resolveCandidate(await intake('unknown','Campaign signup-2026 grants 10 USD.',unknown),'unknown');
 const result=await service.resolveIdentityTask(a.taskId!,{requestId:'human-new',expectedRevision:0,action:'new',candidateId:a.candidateId,facts:facts(),actor:'admin'});
 expect(result).toMatchObject({outcome:'created_pending',canonicalOfferId:expect.any(String)});
 expect(f.sqlite.prepare('SELECT state FROM review_tasks WHERE id=?').get(a.taskId)).toEqual({state:'resolved'});
 expect(f.sqlite.prepare('SELECT review_state FROM offers').get()).toEqual({review_state:'pending'});
});
it('A09 manual same confirmation links a weak source without another offer or publication',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const unclear=facts();unclear.occurrenceAnchor={state:'unknown'};
 const b=await service.resolveCandidate(await intake('weak','Signup grants 10 USD.',unclear),'weak');
 expect(b.outcome).toBe('needs_identity_review');
 const result=await service.resolveIdentityTask(b.taskId!,{requestId:'human-same',expectedRevision:0,action:'same',candidateId:b.candidateId,entityId:a.entityId!,actor:'admin'});
 expect(result).toMatchObject({outcome:'duplicate_approved',entityId:a.entityId,canonicalOfferId:a.canonicalOfferId});
 expect(f.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:1});
 expect(f.sqlite.prepare('SELECT publication_revision FROM benefit_entities').get()).toEqual({publication_revision:1});
});
it('A26 an unresolved claim can be rejected without manufacturing an offer or entity',async()=>{
 const unknown=facts();unknown.issuerProductId={state:'unknown'};
 const a=await service.resolveCandidate(await intake('unknown','Campaign signup-2026 grants 10 USD.',unknown,{}),'unknown');
 await service.decideTask(a.taskId!,{requestId:'reject-claim',expectedRevision:0,action:'reject',reasonCode:'other',reason:'原文只有新闻，没有独立权益',actor:'admin',role:'admin'});
 expect(f.sqlite.prepare('SELECT entity_id,candidate_id FROM review_decisions').get()).toEqual({entity_id:null,candidate_id:a.candidateId});
 expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:0});
 expect(f.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:0});
});
it('A26 a lead-only prior refusal is consumed before any entity or offer is created',async()=>{
 const candidateId=await intake('claim');
 f.sqlite.prepare("INSERT INTO review_decisions(id,candidate_id,action,reason_code,scope_json,reopen_policy_json,rules_version,evidence_refs_json,actor,idempotency_key) VALUES('old-refusal',?,'reject','other',?,?,'rules-v1','[]','admin','old-refusal-command')").run(candidateId,JSON.stringify({kind:'claim',candidateId}),JSON.stringify({kind:'manual',missingFacts:[]}));
 const receipt=await service.resolveCandidate(candidateId,'resolve-existing-refusal');
 expect(receipt).toMatchObject({outcome:'duplicate_rejected',decisionId:'old-refusal',entityId:null,canonicalOfferId:null});
 expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:0});
});
it('A26 explicit reopening preserves the refusal and remains pending until a new approval',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');const rejected=await service.decideTask(a.taskId!,{requestId:'reject',expectedRevision:0,action:'reject',reason:'需要更多证据',reasonCode:'insufficient_evidence',actor:'admin',role:'admin'});
 const revision=Number(f.sqlite.prepare('SELECT business_revision FROM benefit_entities').get()?.business_revision);
 const input={requestId:'reopen',expectedRevision:revision,reason:'管理员确认应补证再审',basis:{description:'New official claim instructions were located.'},actor:'admin'};
 const reopened=await service.reopenDecision(rejected.decisionId,input);expect(await service.reopenDecision(rejected.decisionId,input)).toEqual(reopened);
 expect(f.sqlite.prepare('SELECT count(*) n FROM review_decisions').get()).toEqual({n:2});
 expect(f.sqlite.prepare('SELECT review_state FROM offers').get()).toEqual({review_state:'rejected'});
 expect(f.sqlite.prepare('SELECT state FROM review_tasks WHERE id=?').get(reopened.taskId)).toEqual({state:'open'});
});
it('A29 alias revocation is version guarded, audited, and invalidates entity business state',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');const alias=f.sqlite.prepare('SELECT id,revision FROM identity_aliases').get();
 const before=Number(f.sqlite.prepare('SELECT business_revision FROM benefit_entities').get()?.business_revision);
 await service.revokeAlias(String(alias?.id),{requestId:'revoke',expectedRevision:Number(alias?.revision),expectedEntityRevision:before,reason:'管理员发现活动锚点关联错误',actor:'admin'});
 expect(f.sqlite.prepare('SELECT status FROM identity_aliases WHERE id=?').get(alias?.id)).toEqual({status:'revoked'});
 expect(Number(f.sqlite.prepare('SELECT business_revision FROM benefit_entities').get()?.business_revision)).toBe(before+1);
 expect(f.sqlite.prepare("SELECT count(*) n FROM review_decisions WHERE action='revoke'").get()).toEqual({n:1});
});
it('A07 official enrichment updates only pending media evidence and preserves the same task and manual notes',async()=>{
 const media=displayOffer();media.evidence={...media.evidence,tier:'media'};
 const a=await service.resolveCandidate(await intake('media','Campaign signup-2026 grants 10 USD.',facts(),media),'media');
 f.sqlite.prepare("UPDATE offers SET admin_note='人工心得保留' WHERE id=?").run(a.canonicalOfferId);
 const b=await service.resolveCandidate(await intake('official'),'official');
 expect(b).toMatchObject({outcome:'duplicate_pending',taskId:a.taskId,canonicalOfferId:a.canonicalOfferId});
 const row=f.sqlite.prepare('SELECT evidence,admin_note,review_state FROM offers').get();
 expect(JSON.parse(String(row?.evidence)).tier).toBe('site');expect(row).toMatchObject({admin_note:'人工心得保留',review_state:'pending'});
 expect(f.sqlite.prepare('SELECT count(*) n FROM review_tasks').get()).toEqual({n:1});
});
it('A29 revoking an identity alias invalidates later candidate reuse without rewriting old request receipts',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const alias=f.sqlite.prepare("SELECT id,revision FROM identity_aliases WHERE namespace='official_campaign'").get();
 const revision=Number(f.sqlite.prepare('SELECT business_revision FROM benefit_entities').get()?.business_revision);
 await service.revokeAlias(String(alias?.id),{requestId:'revoke',expectedRevision:Number(alias?.revision),expectedEntityRevision:revision,reason:'活动对应关系需要重新确认',actor:'admin'});
 const newRequest=await service.resolveCandidate(a.candidateId,'after-revoke');
 expect(newRequest.outcome).toBe('needs_identity_review');
 expect(await service.resolveCandidate(a.candidateId,'a')).toEqual(a);
});
it('A19 an existing campaign alias cannot validate a fabricated incoming anchor',async()=>{
 await service.resolveCandidate(await intake('a'),'a');
 const text='Campaign unrelated-2026 grants 10 USD.';const display=displayOffer();display.evidence.excerpts.benefit=text;
 const result=await service.resolveCandidate(await intake('unrelated',text,facts(),display),'unrelated');
 expect(result.outcome).toBe('needs_identity_review');
 expect(f.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:1});
});
it('A26 a superseded rejection is re-evaluated without losing identity links',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');const rejected=await service.decideTask(a.taskId!,{requestId:'reject',expectedRevision:0,action:'reject',reasonCode:'other',actor:'admin',role:'admin'});
 const candidateId=await intake('repeat');expect((await service.resolveCandidate(candidateId,'repeat')).outcome).toBe('duplicate_rejected');
 const revision=Number(f.sqlite.prepare('SELECT business_revision FROM benefit_entities').get()?.business_revision);
 const opened=await service.reopenDecision(rejected.decisionId,{requestId:'reopen',expectedRevision:revision,reason:'新证据复审',basis:{description:'Official terms were confirmed.'},actor:'admin'});
 await service.decideTask(opened.taskId,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 expect(await service.resolveCandidate(candidateId,'repeat-after-reopen')).toMatchObject({outcome:'duplicate_approved',entityId:a.entityId,versionId:a.versionId,canonicalOfferId:a.canonicalOfferId});
});
it('A08 a partial candidate waits for identity confirmation without reinserting a pending version',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');const partial=facts();partial.benefitPools[0].amount={state:'unknown'};
 expect(await service.resolveCandidate(await intake('partial','Campaign signup-2026 is available.',partial),'partial')).toMatchObject({outcome:'needs_identity_review',entityId:null,versionId:null});
 expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_versions').get()).toEqual({n:1});
});
for(const action of ['approve','reject'] as const)it('A22 current manually refreshed proposal can '+action,async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const change=facts();change.benefitPools[0].amount=known({value:'20',unit:'currency',currency:'USD'});
 const b=await service.resolveCandidate(await intake('b','Campaign signup-2026 replaces 10 USD with 20 USD.',change,displayOffer('注册赠送 20 美元 API 额度')),'b');
 const edited=await service.editManagedOffer(a.canonicalOfferId!,{requestId:'edit',taskId:b.taskId!,expectedTaskRevision:0,fields:{valueText:'管理员确认赠送 20 美元 API 额度'},identityFacts:change,actor:'admin'});
 await service.decideTask(edited.taskId!,{requestId:'decide-edited',expectedRevision:edited.revision,action,actor:'admin',role:'admin'});
 expect(f.sqlite.prepare('SELECT count(*) n FROM offer_proposals').get()).toEqual({n:0});
 expect(f.sqlite.prepare('SELECT value_text FROM offers').get()).toEqual({value_text:action==='approve'?'管理员确认赠送 20 美元 API 额度':'注册赠送 10 美元 API 额度'});
});
for(const action of ['approve','reject'] as const)it('A22 manual evidence reopen '+action+' completes its owned proposal',async()=>{
 const a=await service.resolveCandidate(await intake('a'),'a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const version=String(f.sqlite.prepare('SELECT updated_at FROM offers').get()?.updated_at);
 const edited=await service.editManagedOffer(a.canonicalOfferId!,{requestId:'edit',expectedOfferVersion:version,fields:{valueText:'管理员确认 10 美元 API 额度'},identityFacts:facts(),actor:'admin'});
 await service.decideTask(edited.taskId!,{requestId:'decide-edited',expectedRevision:edited.revision,action,actor:'admin',role:'admin'});
 expect(f.sqlite.prepare('SELECT count(*) n FROM offer_proposals').get()).toEqual({n:0});
});
it('A26 a mechanism scoped refusal suppresses another occurrence without cross-entity ownership',async()=>{
 const paid=facts();paid.costs=known({upfrontAmount:"10",currency:"USD",subscriptionRequired:true,autoRenewal:null});
 const a=await service.resolveCandidate(await intake('a','Campaign signup-2026 grants 10 USD to subscribers.',paid),'a');
 const rejected=await service.decideTask(a.taskId!,{requestId:'reject',expectedRevision:0,action:'reject',reasonCode:'paid_bundle',scope:{kind:'scoped_mechanism',productId:'vendor',mechanism:'signup_grant',confirmedBy:'admin'},actor:'admin',role:'admin'});
 const other=structuredClone(paid);other.occurrenceAnchor=known('signup-2027');
 const b=await service.resolveCandidate(await intake('b','Independent campaign signup-2027 grants 10 USD to subscribers.',other),'b');
 expect(b).toMatchObject({outcome:'duplicate_rejected',decisionId:rejected.decisionId,taskId:null});
 expect(f.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:1});
});
it('A08/A10 a retained automatic campaign alias cannot consume an under-extracted independent claim as duplicate pending',async()=>{
 const a=await service.resolveCandidate(await intake('original'),'original');const partial=facts();partial.benefitPools[0].amount={state:'unknown'};
 const b=await service.resolveCandidate(await intake('independent','Umbrella campaign signup-2026: a separate student signup bonus grants 20 USD.',partial),'independent');
 expect(b).toMatchObject({outcome:'needs_identity_review',entityId:null,versionId:null});expect(b.taskId).not.toBe(a.taskId);
 expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_versions').get()).toEqual({n:1});expect(f.sqlite.prepare('SELECT count(*) n FROM entity_observations').get()).toEqual({n:1});
});
it('A24 different requests and extractor IDs race on one strong anchor then the loser retries canonical',async()=>{
 const ids=[await intake('model-a'),await intake('model-b')];const results=await Promise.allSettled(ids.map((id,i)=>service.resolveCandidate(id,'race-model-'+i)));
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);const loser=results.findIndex(r=>r.status==='rejected');expect((results[loser] as PromiseRejectedResult).reason).toMatchObject({status:409});
 const retried=await service.resolveCandidate(ids[loser],'race-model-'+loser);expect(retried.outcome).toBe('duplicate_pending');
 for(const table of ['benefit_entities','benefit_versions','review_tasks','offers'])expect(f.sqlite.prepare(`SELECT count(*) n FROM ${table}`).get()).toEqual({n:1});
});
it('A45 a candidate cannot bind an unrelated entity decision even when both references exist',async()=>{
 const firstId=await intake('first'),a=await service.resolveCandidate(firstId,'first');const other=facts();other.occurrenceAnchor=known('other-campaign');
 const b=await service.resolveCandidate(await intake('other','Campaign other-campaign grants 10 USD.',other),'other');const rejection=await service.decideTask(b.taskId!,{requestId:'reject-other',expectedRevision:0,action:'reject',reasonCode:'other',actor:'admin',role:'admin'});
 const {MutationBuilder,commitIdentityMutation}=await import('../src/worker/identity/commit');const builder=new MutationBuilder(f.db,'foreign-decision','foreign-decision');builder.update('intake_candidates',{decision_id:rejection.decisionId},'id=?',[firstId]);builder.assertOwnership('intake_candidates',firstId);
 await expect(commitIdentityMutation(f.db,builder.plan([],{ok:true}))).rejects.toThrow(/CHECK/);
 expect(f.sqlite.prepare('SELECT decision_id,entity_id FROM intake_candidates WHERE id=?').get(firstId)).toEqual({decision_id:null,entity_id:a.entityId});expect(f.sqlite.prepare("SELECT count(*) n FROM identity_commands WHERE request_id='foreign-decision'").get()).toEqual({n:0});
});
it('A26 an explicit missing-fact refusal policy permits one pending evidence reopen after the named fact is supplied',async()=>{
 const incomplete=facts();incomplete.benefitPools[0].amount={state:'unknown'};
 const a=await service.resolveCandidate(await intake('missing-amount','Campaign signup-2026 is available.',incomplete),'missing-amount');
 await service.decideTask(a.taskId!,{requestId:'reject-missing',expectedRevision:0,action:'reject',reasonCode:'insufficient_evidence',reopenPolicy:{kind:'missing_facts',missingFacts:['benefitPools.vendor:api.amount']},actor:'admin',role:'admin'});
 const supplied=await intake('supplied'),b=await service.resolveCandidate(supplied,'supplied');expect(b).toMatchObject({outcome:'evidence_reopen',entityId:a.entityId});
 expect((await service.resolveCandidate(supplied,'supplied-again')).taskId).toBe(b.taskId);
 const widened=facts();widened.eligibility=known({audience:'new',requirements:['student']});const widenedId=await intake('widened','Campaign signup-2026 grants 10 USD to new student accounts.',widened);expect(await service.resolveCandidate(widenedId,'widened')).toMatchObject({outcome:'needs_identity_review',entityId:null});
 expect(f.sqlite.prepare("SELECT count(*) n FROM offers WHERE review_state='approved'").get()).toEqual({n:0});expect(f.sqlite.prepare("SELECT count(*) n FROM review_tasks WHERE kind='evidence_reopen'").get()).toEqual({n:1});
});
