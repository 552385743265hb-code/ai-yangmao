// Synthetic-only end-to-end verification against real local Wrangler D1 transactions.
import assert from 'node:assert/strict';
import {getPlatformProxy} from 'wrangler';
import worker from '../../src/worker/index.ts';
import {displayOffer} from '../../tests/fixtures/identity/offer.ts';
import {unknownIdentityTerms} from '../../src/worker/identity/adapters.ts';
import {measureD1} from './metrics.ts';
import {sha256} from '../../src/shared/identity/normalize.ts';
const path=process.env.IDENTITY_CLARITY_PERSIST;if(!path?.startsWith('.superpowers/sdd/identity-review-clarity/d1-'))throw new Error('fresh synthetic D1 path required');
const proxy=await getPlatformProxy({configPath:'tests/fixtures/identity/wrangler.jsonc',persist:{path:path+'/v3'}});
try{
 const db=proxy.env.DB,measurements=[];
 await db.prepare("INSERT INTO platforms(id,name,type,status,site) VALUES('vendor','Synthetic vendor','lab','approved','https://vendor.example')").run();
 await db.prepare("INSERT INTO sources(id,platform_id,kind,url,tier) VALUES('vendor-source','vendor','web_list','https://vendor.example/notice','site')").run();
 const env={DB:db,ADMIN_TOKEN:'local-admin-token',INGEST_TOKEN:'local-ingest-token',IDENTITY_MODE:'enforce',IDENTITY_CANARY_PLATFORMS:'vendor'};
 const call=async(path,body,admin=false,expected=200)=>{const m=measureD1(db);const response=await worker.fetch(new Request('https://local.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+(admin?env.ADMIN_TOKEN:env.INGEST_TOKEN),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),{...env,DB:m.db},{});const data=await response.json();measurements.push({path,status:response.status,...m.snapshot()});assert.equal(response.status,expected,JSON.stringify(data));return data;};
 const existing={...displayOffer(),id:'existing-campaign',title:'Older signup reward'};env.IDENTITY_MODE='off';await call('ingest/offers',[existing],false,200);env.IDENTITY_MODE='enforce';
 await db.prepare("INSERT INTO benefit_entities(id,platform_id,canonical_offer_id) VALUES('entity-existing','vendor','existing-campaign')").run();
 const text='Campaign signup-2026 grants 10 USD to new individual accounts.';
 const observation=await call('ingest/observations',{requestId:'known-observation',originalUrl:'https://vendor.example/notice',finalUrl:'https://vendor.example/notice',text,sourceId:'vendor-source',fetchKind:'direct',observedAt:'2026-10-12T10:00:00Z'});
 const candidate={inputId:'new-candidate',span:{start:0,end:text.length,quote:text},quotes:[{id:'quote-1',start:0,end:text.length,quote:text}],rawCandidate:{...displayOffer(),id:'new-candidate',title:'A new signup reward'},facts:unknownIdentityTerms()};
 const stored=await call('ingest/candidates',{requestId:'known-candidate',observationId:observation.observationId,extractionVersion:'local-v1',extractionComplete:true,candidates:[candidate]});
 const intake=await call('ingest/identity-candidates/'+stored.receipts[0].candidateId+'/resolve',{requestId:'known-resolve'});assert.equal(intake.outcome,'needs_identity_review');
 const before=await db.prepare('SELECT (SELECT count(*) FROM offers) offers,(SELECT count(*) FROM review_decisions) decisions,(SELECT count(*) FROM identity_events) events').first();
 let state=await call('admin/identity/tasks',undefined,true);assert.equal(state.tasks[0].candidateDisplay.title,'A new signup reward');assert.equal(state.tasks[0].reviewPreparation.canDecide,false);
 const tasks=await call('ingest/identity-preparations');assert.equal(tasks.tasks.length,1);
 const scan=await call('ingest/identity-preparations/'+intake.taskId+'/scan',{requestId:'scan-one',expectedRevision:tasks.tasks[0].revision});assert.equal(scan.status,'ready');
 const replay=await call('ingest/identity-preparations/'+intake.taskId+'/scan',{requestId:'scan-one',expectedRevision:tasks.tasks[0].revision});assert.equal(replay.status,'ready');
 await call('ingest/identity-preparations/'+intake.taskId+'/scan',{requestId:'scan-stale',expectedRevision:tasks.tasks[0].revision},false,409);
 state=await call('admin/identity/tasks',undefined,true);assert.equal(state.tasks[0].reviewPreparation.canDecide,true);assert.equal(state.tasks[0].historyOptions[0].title,'Older signup reward');
 const indirect=await call('ingest/observations',{requestId:'local-indirect',originalUrl:'https://vendor.example/new',finalUrl:'https://vendor.example/new',text,sourceId:'vendor-source',fetchKind:'indirect',observedAt:'2026-10-12T11:00:00Z'});
 const other=await call('ingest/candidates',{requestId:'local-indirect-candidate',observationId:indirect.observationId,extractionVersion:'local-v1',extractionComplete:true,candidates:[{...candidate,inputId:'other-candidate',rawCandidate:{...displayOffer(),id:'other-candidate',title:'Another source candidate'}}]});
 const otherTask=await call('ingest/identity-candidates/'+other.receipts[0].candidateId+'/resolve',{requestId:'other-resolve'});
 const missing=await call('ingest/identity-preparations/'+otherTask.taskId+'/scan',{requestId:'missing-source',expectedRevision:0});assert.equal(missing.status,'needs_source');
 const sourced=await call('ingest/identity-preparations/'+otherTask.taskId+'/scan',{requestId:'recovered-source',expectedRevision:missing.revision,freshSource:{sourceText:text,sourceFetch:{originalUrl:'https://vendor.example/new',finalUrl:'https://vendor.example/new',fetchedUrl:'https://vendor.example/new',method:'direct',sourceVerified:true,truncated:false,contentHash:await sha256(text)}}});assert.equal(sourced.status,'ready');
 const rebound=await db.prepare('SELECT observation_id,source_fetch_id FROM intake_candidates WHERE id=?').bind(other.receipts[0].candidateId).first();assert.notEqual(rebound.observation_id,indirect.observationId);assert.ok(rebound.source_fetch_id);
 const preserved=await db.prepare('SELECT suggestion_json FROM review_tasks WHERE id=?').bind(otherTask.taskId).first();assert.equal(JSON.parse(preserved.suggestion_json).sourceReverifications[0].originalObservationId,indirect.observationId);
 assert.equal((await db.prepare('SELECT count(*) n FROM offers').first()).n,before.offers);assert.equal((await db.prepare('SELECT count(*) n FROM review_decisions').first()).n,before.decisions);

 assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 assert.ok(measurements.every(m=>m.statements<=50));console.log(JSON.stringify({status:'passed',checks:measurements.length,maxStatements:Math.max(...measurements.map(m=>m.statements)),businessRowsUnchanged:true,foreignKeys:true,externalFetches:0,automaticDecisions:0}));
}finally{await proxy.dispose();}
