// Synthetic-only, real local workerd D1. No external collection/model/sender calls.
import assert from 'node:assert/strict';
import {getPlatformProxy} from 'wrangler';
import worker from '../../src/worker/index.ts';
import {terms,known} from '../../tests/fixtures/identity/terms.ts';
import {displayOffer} from '../../tests/fixtures/identity/offer.ts';
import {measureD1} from './metrics.ts';
import {hashTerms} from '../../src/shared/identity/normalize.ts';
import {fetchPage} from '../../pipeline/lib.ts';
import {toOffer} from '../../pipeline/offer-draft.ts';
const path=process.env.IDENTITY_AUDIT_PERSIST;
if(!path?.startsWith('.superpowers/sdd/acceptance-audit-4371ea0/d1-'))throw new Error('explicit fresh synthetic persistence required');
const proxy=await getPlatformProxy({configPath:'tests/fixtures/identity/wrangler.jsonc',persist:{path:path+'/v3'}});
try{
 const db=proxy.env.DB,measurements=[];
 await db.prepare("INSERT INTO platforms(id,name,type,status,site) VALUES('vendor','Synthetic audit','lab','approved','https://vendor.example')").run();
 await db.prepare("INSERT INTO sources(id,platform_id,kind,url,tier) VALUES('vendor-source','vendor','web_list','https://vendor.example/rewards','site')").run();
 const call=async(path,body,admin=false,expectedStatus=200)=>{const m=measureD1(db),start=performance.now();const response=await worker.fetch(new Request('https://local.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+(admin?'audit-admin-token':'audit-ingest-token'),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),{DB:m.db,ADMIN_TOKEN:'audit-admin-token',INGEST_TOKEN:'audit-ingest-token',IDENTITY_MODE:'enforce',IDENTITY_CANARY_PLATFORMS:'vendor'},{});const value=await response.json();measurements.push({path,status:response.status,wallTimeMs:performance.now()-start,...m.snapshot()});assert.equal(response.status,expectedStatus,JSON.stringify(value));return value;};
 const body='Campaign shared grants students and businesses separate 10 USD signup rewards.';
 const observed=await call('ingest/observations',{requestId:'audit-page',originalUrl:'https://vendor.example/rewards',finalUrl:'https://vendor.example/rewards',text:body,sourceId:'vendor-source',fetchKind:'direct',observedAt:'2026-10-10T10:00:00Z'});
 const a=terms();a.occurrenceAnchor=known('shared');a.eligibility=known({audience:'new',requirements:['student']});const b=structuredClone(a);b.eligibility=known({audience:'new',requirements:['business']});
 const intake=async(id,facts)=> (await call('ingest/candidates',{requestId:id,observationId:observed.observationId,extractionVersion:'audit-v1',extractionComplete:true,candidates:[{inputId:id,span:{start:0,end:body.length,quote:body},quotes:[{id:'quote-1',start:0,end:body.length,quote:body}],facts,rawCandidate:displayOffer()}]})).receipts[0];
 const first=await intake('student',a),created=await call('ingest/identity-candidates/'+first.candidateId+'/resolve',{requestId:'student-resolve'});
 await call('admin/identity/tasks/'+created.taskId+'/resolve',{requestId:'student-approve',expectedRevision:0,action:'approve'},true);
 const second=await intake('business',b);assert.notEqual(second.candidateId,first.candidateId);const pending=await call('ingest/identity-candidates/'+second.candidateId+'/resolve',{requestId:'business-resolve'});assert.equal(pending.outcome,'needs_identity_review');assert.equal(pending.entityId,null);
 const manual=await call('admin/identity/tasks/'+pending.taskId+'/resolve',{requestId:'business-manual',expectedRevision:0,action:'new',candidateId:second.candidateId,facts:b,reason:'Synthetic independently claimable benefit.'},true);assert.equal(manual.outcome,'created_pending');assert.notEqual(manual.entityId,created.entityId);
 assert.equal((await db.prepare('SELECT count(*) n FROM intake_candidates').first()).n,2);assert.equal((await db.prepare("SELECT count(*) n FROM offers WHERE review_state='approved'").first()).n,1);assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);

 const claimText='Campaign rejected-root grants students and businesses separate 10 USD rewards.';
 const claimObservation=await call('ingest/observations',{requestId:'claim-original',originalUrl:'https://vendor.example/claim',finalUrl:'https://vendor.example/claim',text:claimText,sourceId:'vendor-source',fetchKind:'direct',observedAt:'2026-10-10T10:00:00Z'});
 const claimFacts=structuredClone(a);claimFacts.occurrenceAnchor=known('rejected-root');const peerFacts=structuredClone(claimFacts);peerFacts.eligibility=known({audience:'new',requirements:['business']});
 const claimIntake=async(id,observationId,text,facts)=>(await call('ingest/candidates',{requestId:id,observationId,extractionVersion:'audit-v1',extractionComplete:true,candidates:[{inputId:id,span:{start:0,end:text.length,quote:text},quotes:[{id:'quote-1',start:0,end:text.length,quote:text}],facts,rawCandidate:displayOffer()}]})).receipts[0];
 const root=await claimIntake('root-claim',claimObservation.observationId,claimText,claimFacts);await claimIntake('peer-claim',claimObservation.observationId,claimText,peerFacts);const rootTask=await call('ingest/identity-candidates/'+root.candidateId+'/resolve',{requestId:'root-claim-resolve'});assert.equal(rootTask.entityId,null);
 const originalDecision=await call('admin/identity/tasks/'+rootTask.taskId+'/resolve',{requestId:'root-claim-reject',expectedRevision:0,action:'reject',reasonCode:'other'},true);
 const beforeClaims=(await db.prepare('SELECT (SELECT count(*) FROM offers) offers,(SELECT count(*) FROM review_tasks) tasks,(SELECT count(*) FROM identity_events) events').first());
 const translated='活动 rejected-root 为新学生账户赠送 10 USD。';const translatedObservation=await call('ingest/observations',{requestId:'claim-translation',originalUrl:'https://vendor.example/claim-cn',finalUrl:'https://vendor.example/claim-cn',text:translated,sourceId:'vendor-source',fetchKind:'direct',observedAt:'2026-10-10T10:00:00Z'});const translatedCandidate=await claimIntake('translated-claim',translatedObservation.observationId,translated,claimFacts);
 const inherited=await call('ingest/identity-candidates/'+translatedCandidate.candidateId+'/resolve',{requestId:'translated-claim-resolve'});assert.equal(inherited.outcome,'duplicate_rejected');assert.equal(inherited.decisionId,originalDecision.decisionId);assert.equal(inherited.taskId,null);assert.notEqual(translatedCandidate.candidateId,root.candidateId);
 assert.deepEqual(await db.prepare('SELECT (SELECT count(*) FROM offers) offers,(SELECT count(*) FROM review_tasks) tasks,(SELECT count(*) FROM identity_events) events').first(),beforeClaims);assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);

 for(let i=0;i<79;i++){const id='scale-'+String(i).padStart(3,'0'),facts=terms();facts.occurrenceAnchor=known('other-'+i);await db.prepare("INSERT INTO benefit_entities(id,platform_id) VALUES(?,'vendor')").bind(id).run();await db.prepare("INSERT INTO benefit_versions(id,entity_id,terms_schema,terms_hash,facts_json,display_candidate_json,state) VALUES(?,?,'terms-v1',?,? ,?,'approved')").bind('v-'+id,id,await hashTerms(facts),JSON.stringify(facts),JSON.stringify(displayOffer())).run();await db.prepare('UPDATE benefit_entities SET current_approved_version_id=? WHERE id=?').bind('v-'+id,id).run();}
 assert.equal((await db.prepare('SELECT count(*) n FROM benefit_entities').first()).n,81);
 const freshCandidate=async(id,facts,text)=>{const ob=await call('ingest/observations',{requestId:id,originalUrl:'https://vendor.example/'+id,finalUrl:'https://vendor.example/'+id,text,sourceId:'vendor-source',fetchKind:'direct',observedAt:'2026-10-10T10:00:00Z'});return claimIntake(id+'-candidate',ob.observationId,text,facts);};
 const targetCandidate=await freshCandidate('large-target',a,'Campaign shared grants students 10 USD.');const largeTask=await call('ingest/identity-candidates/'+targetCandidate.candidateId+'/resolve',{requestId:'large-target'});assert.equal(largeTask.outcome,'needs_identity_review');
 const selected=await call('admin/identity/tasks/'+largeTask.taskId+'/resolve',{requestId:'large-explicit-target',expectedRevision:0,action:'same',candidateId:targetCandidate.candidateId,entityId:created.entityId,reason:'Synthetic administrator checked the precise canonical target.'},true);assert.equal(selected.outcome,'duplicate_approved');assert.equal(selected.entityId,created.entityId);
 const paidScope=JSON.stringify({kind:'scoped_mechanism',productId:'vendor',mechanism:'signup_grant',confirmedBy:'synthetic-admin'});
 for(let i=0;i<41;i++)await db.prepare("INSERT INTO review_decisions(id,entity_id,action,reason_code,scope_json,reopen_policy_json,rules_version,evidence_refs_json,actor,idempotency_key) VALUES(?,?,'reject','paid_bundle',?,?,'test','[]','synthetic-admin',?)").bind('paid-'+String(i).padStart(3,'0'),created.entityId,paidScope,JSON.stringify({kind:'manual',missingFacts:[]}),'paid-'+i).run();
 const free=terms();free.occurrenceAnchor=known('free-independent');free.costs=known({upfrontAmount:'0',currency:'USD',subscriptionRequired:false,autoRenewal:false});const freeCandidate=await freshCandidate('large-free',free,'Campaign free-independent grants 10 USD without a subscription.');const freeTask=await call('ingest/identity-candidates/'+freeCandidate.candidateId+'/resolve',{requestId:'large-free'});
 const pageRequest={requestId:'large-free-manual',expectedRevision:0,action:'new',candidateId:freeCandidate.candidateId,reason:'Synthetic independent grant with no subscription requirement.'};const firstPage=await call('admin/identity/tasks/'+freeTask.taskId+'/resolve',pageRequest,true);assert.equal(firstPage.outcome,'deferred');assert.equal(firstPage.retryable,true);const completed=await call('admin/identity/tasks/'+freeTask.taskId+'/resolve',pageRequest,true);assert.equal(completed.outcome,'created_pending');assert.deepEqual(await call('admin/identity/tasks/'+freeTask.taskId+'/resolve',pageRequest,true),completed);
 assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);

 const savedFetch=globalThis.fetch;
 try{
  const sourceQuote='Campaign transport grants 10 USD for signup.';
  globalThis.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);if(url.hostname==='vendor.example')return new Response(url.pathname.endsWith('audit-jina')?'tiny':'<html><body><p>'+sourceQuote+'</p><p>'+'Documentation. '.repeat(100)+'</p></body></html>');if(url.hostname==='r.jina.ai')return new Response('URL Source: https://unrelated.example\nWarning: Target URL returned error 403\nMarkdown Content:\n'+sourceQuote);if(['127.0.0.1','localhost','[::1]'].includes(url.hostname))return savedFetch(input,init);throw new Error('unexpected external network in synthetic audit');};
  for(const mode of ['direct','jina']){const url='https://vendor.example/audit-'+mode,page=await fetchPage(url,{tries:1}),draft=toOffer({id:'vendor-source',platformId:'vendor',kind:'web_list',tier:mode==='jina'?'media':'site'},{...displayOffer(),key:'transport-'+mode,excerpts:{benefit:sourceQuote}},page.finalUrl,page.text,page);
   const posted=await call('ingest/offers',[{...draft,identityRequestId:'runtime-transport-'+mode}]);assert.equal(posted.results[0].error,undefined);const row=await db.prepare('SELECT o.id,o.trust_json,o.fetch_provenance_json FROM source_observations o JOIN source_documents d ON d.id=o.document_id WHERE d.original_url=? ORDER BY o.observed_at DESC LIMIT 1').bind(url).first();assert.equal(JSON.parse(row.trust_json).sourceVerified,mode==='direct');assert.equal(JSON.parse(row.fetch_provenance_json).method,mode==='jina'?'jina':page.via);assert.equal(JSON.parse(row.fetch_provenance_json).originalUrl,url);
   const fetch=await db.prepare('SELECT id,provenance_json FROM source_observation_fetches WHERE observation_id=? LIMIT 1').bind(row.id).first();await assert.rejects(()=>db.prepare("UPDATE source_observation_fetches SET provenance_json='{}' WHERE id=?").bind(fetch.id).run(),/immutable/);assert.equal((await db.prepare('SELECT provenance_json FROM source_observation_fetches WHERE id=?').bind(fetch.id).first()).provenance_json,fetch.provenance_json);
  }
 }finally{globalThis.fetch=savedFetch;}
 assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);

 const publishedView=await call('admin/offers/'+created.canonicalOfferId,undefined,true);assert.match(publishedView.offer.reviewVersion,/^entity:/);const withdrawalBody={expectedReviewVersion:publishedView.offer.visibilityVersion,reason:'Synthetic official withdrawal notice.',evidenceUrl:'https://vendor.example/withdrawal',basis:'official'};
 const withdrawn=await call('admin/offers/'+created.canonicalOfferId+'/withdraw',withdrawalBody,true);assert.deepEqual(await call('admin/offers/'+created.canonicalOfferId+'/withdraw',withdrawalBody,true),withdrawn);assert.equal(JSON.parse((await db.prepare('SELECT basis_json FROM review_decisions WHERE id=?').bind(withdrawn.decisionId).first()).basis_json).evidenceUrl,withdrawalBody.evidenceUrl);
 const afterWithdraw=await call('admin/offers/'+created.canonicalOfferId,undefined,true);const unpublishBody={expectedReviewVersion:afterWithdraw.offer.visibilityVersion,reason:'Synthetic policy review removes this publication.',reasonCode:'other'};const unpublished=await call('admin/offers/'+created.canonicalOfferId+'/unpublish',unpublishBody,true);assert.deepEqual(await call('admin/offers/'+created.canonicalOfferId+'/unpublish',unpublishBody,true),unpublished);assert.equal((await db.prepare('SELECT review_state FROM offers WHERE id=?').bind(created.canonicalOfferId).first()).review_state,'rejected');

 const restoredView=await call('admin/offers/'+created.canonicalOfferId,undefined,true);
 const restored=await call('admin/offers/'+created.canonicalOfferId+'/reopen-visibility',{expectedReviewVersion:restoredView.offer.visibilityVersion,reason:'Synthetic explicit fresh publication review.'},true);
 assert.notEqual(restored.taskId,created.taskId);
 await call('admin/identity/tasks/'+created.taskId+'/resolve',{requestId:'stale-original-approval',expectedRevision:0,action:'approve'},true,409);
 assert.equal((await db.prepare('SELECT review_state FROM offers WHERE id=?').bind(created.canonicalOfferId).first()).review_state,'rejected');
 await call('admin/identity/tasks/'+restored.taskId+'/resolve',{requestId:'approve-restoration',expectedRevision:0,action:'approve'},true);
 assert.deepEqual(await db.prepare('SELECT review_state,withdrawn_at FROM offers WHERE id=?').bind(created.canonicalOfferId).first(),{review_state:'approved',withdrawn_at:null});
 assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);

 const partial=structuredClone(a);partial.eligibility={state:'unknown'};partial.benefitPools[0].amount=known({value:'20',unit:'currency',currency:'USD'});
 const partialCandidate=await freshCandidate('partial-change',partial,'Campaign shared replaces 10 USD with 20 USD.');
 const partialTask=await call('ingest/identity-candidates/'+partialCandidate.candidateId+'/resolve',{requestId:'partial-resolve'});
 const sameBody={requestId:'partial-confirm',expectedRevision:0,action:'same',candidateId:partialCandidate.candidateId,entityId:created.entityId,reason:'Identity confirmed, real terms change remains pending.'};
 let partialResult;for(let i=0;i<3;i++){partialResult=await call('admin/identity/tasks/'+partialTask.taskId+'/resolve',sameBody,true);if(!partialResult.retryable)break;}
 assert.equal(partialResult.outcome,'proposed_update');assert.notEqual(partialResult.versionId,created.versionId);
 const pendingRevision=(await db.prepare('SELECT revision FROM review_tasks WHERE id=?').bind(partialResult.taskId).first()).revision;
 await call('admin/identity/tasks/'+partialResult.taskId+'/resolve',{requestId:'incomplete-approval',expectedRevision:pendingRevision,action:'approve'},true,409);
 partial.eligibility=a.eligibility;
 const completedEdit=await call('admin/offers/'+created.canonicalOfferId+'/edit',{requestId:'complete-partial',identityTaskId:partialResult.taskId,expectedIdentityRevision:pendingRevision,fields:{},identityFacts:partial},true);
 await call('admin/identity/tasks/'+partialResult.taskId+'/resolve',{requestId:'completed-approval',expectedRevision:completedEdit.revision,action:'approve'},true);
 assert.ok(measurements.every(m=>m.statements<=50));console.log(JSON.stringify({environment:'fresh-local-workerd-d1',R01:'passed',R02:'passed',R03:'passed',R07:'passed',R04:'passed',R05:'passed',R06:'passed',productionOperations:0,modelCalls:0,messages:0,measurements}));
}finally{await proxy.dispose();}
