import { beforeEach,afterEach,expect,it } from 'vitest';
import { legacyReceipt } from '../src/shared/identity/legacy';
import worker from '../src/worker/index';
import { identityDb } from './fixtures/identity/db';
import { displayOffer } from './fixtures/identity/offer';
import { terms,known } from './fixtures/identity/terms';
let f:ReturnType<typeof identityDb>;
beforeEach(()=>{f=identityDb();});afterEach(()=>f.sqlite.close());
async function call(path:string,body?:unknown,admin=false,envPatch:Record<string,string>={}) {
 const response=await worker.fetch(new Request('https://local.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+(admin?'admin-test-token-123':'ingest-test-token-123'),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),{DB:f.db,INGEST_TOKEN:'ingest-test-token-123',ADMIN_TOKEN:'admin-test-token-123',...envPatch} as Parameters<typeof worker.fetch>[1],{} as ExecutionContext);
 const parsed=await response.json() as any;
 if(path==='ingest/offers'&&parsed.results)for(let i=0;i<parsed.results.length;i++){
  const pending=parsed.results[i].pendingResolution;if(!pending)continue;
  const resolution=await call('ingest/identity-candidates/'+pending.candidateId+'/resolve',pending,false,envPatch);
  if(resolution.status===200)parsed.results[i]=legacyReceipt((body as any[])[i].id,resolution.body);
 }
 if(path==='ingest/offers')for(const id of parsed.leadReconcilePending??[])await call('ingest/identity-leads/'+id+'/reconcile',{},false,envPatch);
 return {status:response.status,body:parsed};
}
it('A07 manual source supplementation preserves linked/rejected resolution without implicit reopening',async()=>{
 for(const state of ['linked','rejected']){
  f.sqlite.prepare('UPDATE leads SET status=?,resolution=? WHERE id=1').run(state,JSON.stringify({status:'closed',jobId:'old',reason:'human decision'}));
  const result=await call('admin/manual',{url:'https://community.example/story',note:'another source note'},true);
  expect(result.status).toBe(200);
  expect(f.sqlite.prepare('SELECT status,resolution FROM leads WHERE id=1').get()).toEqual({status:state,resolution:JSON.stringify({status:'closed',jobId:'old',reason:'human decision'})});
 }
});
it('A44 an explicitly selected but unreconciled product cannot silently fall through to legacy intake',async()=>{
 await call('ingest/offers',[displayOffer()]);
 const result=await call('ingest/offers',[{...displayOffer(),id:'vendor-another'}],false,{IDENTITY_MODE:'enforce',IDENTITY_CANARY_PLATFORMS:'vendor'});
 expect(result.body.results[0]).toMatchObject({error:expect.stringContaining('backfill')});
 expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:0});
});
it('A05 shadow and off modes preserve legacy behavior and never auto-create identity business state',async()=>{
 for(const mode of ['shadow','off']){
  const result=await call('ingest/offers',[displayOffer()],false,{IDENTITY_MODE:mode});expect(result.status).toBe(200);
 }
 expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:0});
});
it('A20 enforce legacy adapter returns typed per-candidate receipts and never auto-approves',async()=>{
 const facts=terms();facts.occurrenceAnchor=known('signup-2026',['benefit']);
 const quote='Campaign signup-2026 grants 10 USD.';
 function remap(value:any):any{if(Array.isArray(value))return value.map(remap);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='evidenceRefs'?['benefit']:remap(v)]));return value;}
 const offer={...displayOffer(),sourceId:'vendor-source',sourceText:quote,identityFacts:remap(facts),identityRequestId:'legacy-request'};
 const a=await call('ingest/offers',[offer],false,{IDENTITY_MODE:'enforce',IDENTITY_CANARY_PLATFORMS:'vendor'});
 expect(a.body.results[0]).toMatchObject({identityReceipt:{outcome:'created_pending',taskId:expect.any(String)}});
 const b=await call('ingest/offers',[offer],false,{IDENTITY_MODE:'enforce',IDENTITY_CANARY_PLATFORMS:'vendor'});
 expect(b.body.results[0]).toEqual(a.body.results[0]);
 expect(f.sqlite.prepare('SELECT review_state FROM offers').get()).toEqual({review_state:'pending'});
});
it('A26 ingest index includes rejected history with review state and bounded paging',async()=>{
 await call('ingest/offers',[displayOffer()]);
 f.sqlite.exec("UPDATE offers SET review_state='rejected'");
 const result=await call('ingest/offers-index');
 expect(result.body.offers[0]).toMatchObject({id:'vendor-signup',reviewState:'rejected'});
 expect(result.body).toMatchObject({complete:true,nextCursor:null});
});
it('A29 legacy approval routes must not bypass a mapped identity task revision',async()=>{
 const facts=terms();facts.occurrenceAnchor=known('signup-2026',['benefit']);
 function refs(v:any):any{if(Array.isArray(v))return v.map(refs);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='evidenceRefs'?['benefit']:refs(x)]));return v;}
 const result=await call('ingest/offers',[{...displayOffer(),sourceId:'vendor-source',sourceText:'Campaign signup-2026 grants 10 USD.',identityFacts:refs(facts),identityRequestId:'new'}],false,{IDENTITY_MODE:'enforce',IDENTITY_CANARY_PLATFORMS:'vendor'});
 const receipt=result.body.results[0].identityReceipt;
 f.sqlite.prepare('UPDATE review_tasks SET revision=1 WHERE id=?').run(receipt.taskId);
 const before=f.sqlite.prepare('SELECT updated_at FROM offers WHERE id=?').get(receipt.canonicalOfferId);
 const approve=await call('admin/offers/'+receipt.canonicalOfferId+'/approve',{expectedReviewVersion:before?.updated_at,identityTaskId:receipt.taskId,expectedIdentityRevision:0,requestId:'stale'},true);
 expect(approve.status).toBe(409);
 expect(f.sqlite.prepare('SELECT review_state FROM offers').get()).toEqual({review_state:'pending'});
});
it('A06 lead aggregation keeps a durable identity task visible and never invents an offer ID',async()=>{
 f.sqlite.prepare("UPDATE leads SET status='new',title='Vendor 注册积分',raw='Vendor signup reward' WHERE id=1").run();
 const offer={...displayOffer(),sourceId:'vendor-source',sourceText:'Campaign signup-2026 grants 10 USD.',leadId:1,identityRequestId:'unknown-facts'};
 const response=await call('ingest/offers',[offer],false,{IDENTITY_MODE:'enforce',IDENTITY_CANARY_PLATFORMS:'vendor'});
 expect(response.body.results[0]).toMatchObject({identityReceipt:{outcome:'needs_identity_review',canonicalOfferId:null}});
 const row=f.sqlite.prepare('SELECT status,offer_id,resolution FROM leads WHERE id=1').get();
 expect(row).toMatchObject({status:'reviewing',offer_id:null});
 expect(JSON.parse(String(row?.resolution)).identityTaskIds).toHaveLength(1);
 expect(JSON.parse(String(row?.resolution)).identityCandidateIds).toHaveLength(1);
});
it('A29 an official-review job cannot write after identity revision changes even if offer timestamps match',async()=>{
 const data=terms();data.occurrenceAnchor=known('signup-2026',['benefit']);
 const remap=(v:any):any=>Array.isArray(v)?v.map(remap):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='evidenceRefs'?['benefit']:remap(x)])):v;
 const env={IDENTITY_MODE:'enforce',IDENTITY_CANARY_PLATFORMS:'vendor'};
 const original={...displayOffer(),sourceId:'vendor-source',sourceText:'Campaign signup-2026 grants 10 USD.',identityFacts:remap(data),identityRequestId:'create'};
 const created=await call('ingest/offers',[original],false,env);const r=created.body.results[0].identityReceipt;
 const row=f.sqlite.prepare('SELECT updated_at FROM offers WHERE id=?').get(r.canonicalOfferId);
 const jobId='12345678-1234-4234-8234-123456789012';
 const rev=Number(f.sqlite.prepare('SELECT business_revision FROM benefit_entities').get()?.business_revision);
 f.sqlite.prepare('UPDATE offers SET official_review=? WHERE id=?').run(JSON.stringify({status:'checking',jobId,inputVersion:row?.updated_at+'|',identityRevision:rev,attempts:1,checkedAt:'2026-10-10T10:00:00.000Z'}),r.canonicalOfferId);
 f.sqlite.prepare('UPDATE benefit_entities SET business_revision=business_revision+1').run();
 const result=await call('ingest/offers',[{...original,id:r.canonicalOfferId,identityRequestId:'stale-job',officialReviewJobId:jobId}],false,env);
 expect(result.body.results[0]).toMatchObject({error:expect.stringContaining('official review')});
});
it('A44 unreconciled rejected leads block canary even when every offer is mapped',async()=>{
 f.sqlite.prepare("UPDATE leads SET status='rejected',resolution=? WHERE id=1").run(JSON.stringify({status:'closed',platformId:'vendor',reason:'paid bundle'}));
 const response=await call('ingest/offers',[{...displayOffer(),identityRequestId:'rejected-lead-gate'}],false,{IDENTITY_MODE:'enforce',IDENTITY_CANARY_PLATFORMS:'vendor'});
 expect(response.body.results[0]).toMatchObject({error:expect.stringContaining('backfill')});
 expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:0});
});
it('A29 legacy show supplies the current identity version for the existing CLI',async()=>{
 const {IdentityService}=await import('../src/worker/identity/service');const {IdentityStore}=await import('../src/worker/identity/store');const text='Campaign signup-2026 grants 10 USD.';const facts=terms();facts.occurrenceAnchor=known('signup-2026');const store=new IdentityStore(f.db);
 const ob=await store.recordObservation({requestId:'show',originalUrl:'https://vendor.example/show',finalUrl:'https://vendor.example/show',text,fetchKind:'direct',sourceId:'vendor-source',observedAt:new Date().toISOString()});
 const [c]=await store.recordCandidates({requestId:'show-c',observationId:ob.observationId,extractionVersion:'v1',extractionComplete:true,candidates:[{inputId:'show',span:{start:0,end:text.length,quote:text},quotes:[{id:'quote-1',start:0,end:text.length,quote:text}],facts,rawCandidate:displayOffer()}]});
 const r=await new IdentityService(f.db).resolveCandidate(c.candidateId,'show-resolve');const shown=await call('admin/offers/'+r.canonicalOfferId,undefined,true);
 expect(shown.body.offer.reviewVersion).toBe(`identity:${r.taskId}:0`);
 const queue=await call('admin/queue',undefined,true);expect(queue.body.pending).toHaveLength(1);expect(queue.body.pending[0].reviewVersion).toBe(`identity:${r.taskId}:0`);expect(queue.body.counts.activities).toBe(1);
});
