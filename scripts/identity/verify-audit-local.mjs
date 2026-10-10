// Synthetic-only, real local workerd D1. No external collection/model/sender calls.
import assert from 'node:assert/strict';
import {getPlatformProxy} from 'wrangler';
import worker from '../../src/worker/index.ts';
import {terms,known} from '../../tests/fixtures/identity/terms.ts';
import {displayOffer} from '../../tests/fixtures/identity/offer.ts';
import {measureD1} from './metrics.ts';
const path=process.env.IDENTITY_AUDIT_PERSIST;
if(!path?.startsWith('.superpowers/sdd/acceptance-audit-4371ea0/d1-'))throw new Error('explicit fresh synthetic persistence required');
const proxy=await getPlatformProxy({configPath:'tests/fixtures/identity/wrangler.jsonc',persist:{path:path+'/v3'}});
try{
 const db=proxy.env.DB,measurements=[];
 await db.prepare("INSERT INTO platforms(id,name,type,status,site) VALUES('vendor','Synthetic audit','lab','approved','https://vendor.example')").run();
 await db.prepare("INSERT INTO sources(id,platform_id,kind,url,tier) VALUES('vendor-source','vendor','web_list','https://vendor.example/rewards','site')").run();
 const call=async(path,body,admin=false)=>{const m=measureD1(db),start=performance.now();const response=await worker.fetch(new Request('https://local.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+(admin?'audit-admin-token':'audit-ingest-token'),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),{DB:m.db,ADMIN_TOKEN:'audit-admin-token',INGEST_TOKEN:'audit-ingest-token',IDENTITY_MODE:'enforce',IDENTITY_CANARY_PLATFORMS:'vendor'},{});const value=await response.json();measurements.push({path,status:response.status,wallTimeMs:performance.now()-start,...m.snapshot()});assert.equal(response.status,200,JSON.stringify(value));return value;};
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
 assert.ok(measurements.every(m=>m.statements<=50));console.log(JSON.stringify({environment:'fresh-local-workerd-d1',R01:'passed',R02:'passed',productionOperations:0,modelCalls:0,messages:0,measurements}));
}finally{await proxy.dispose();}
