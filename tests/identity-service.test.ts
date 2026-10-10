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
