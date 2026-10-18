import assert from 'node:assert/strict';
import {getPlatformProxy} from 'wrangler';
import worker from '../../src/worker/index.ts';
import {displayOffer} from '../../tests/fixtures/identity/offer.ts';
import {captureLocalSnapshot,buildBackfillPlan,applyBackfillPage} from './backfill.ts';
import {sha256} from '../../src/shared/identity/normalize.ts';
import {measureD1} from './metrics.ts';
const path=process.env.REVIEW_WORKFLOW_PERSIST;
if(!path?.startsWith('.superpowers/sdd/admin-review-workflow/d1-'))throw new Error('isolated synthetic persistence required');
const proxy=await getPlatformProxy({configPath:'tests/fixtures/identity/wrangler.jsonc',persist:{path:path+'/v3'}});
try{
 const db=proxy.env.DB,measurements=[];
 const env={DB:db,ADMIN_TOKEN:'synthetic-review-admin',INGEST_TOKEN:'synthetic-review-ingest',IDENTITY_MODE:'off',IDENTITY_CANARY_PLATFORMS:'*'};
 const call=async(path,body,admin=false,expected=200)=>{const m=measureD1(db);const r=await worker.fetch(new Request('https://local.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+(admin?env.ADMIN_TOKEN:env.INGEST_TOKEN),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),{...env,DB:m.db},{});const data=await r.json();measurements.push({path,status:r.status,...m.snapshot()});assert.equal(r.status,expected,JSON.stringify(data));return data;};
 await db.prepare("INSERT INTO platforms(id,name,type,status,site) VALUES('vendor','合成演示平台','lab','approved','https://vendor.example')").run();
 await db.prepare("INSERT INTO leads(origin,url,title,status) VALUES('manual','https://community.example/story','尚未形成活动的合成线索','reviewing')").run();
 const initial=displayOffer();initial.evidence.excerpts={benefit:'compose_video：限时免费'};await call('ingest/offers',[initial]);
 const row=await db.prepare('SELECT * FROM offers').first(),keys=Object.keys(row);
 for(const [id,title,good,paused] of [['ready-card','已补证：注册赠额',true,false],['waiting-card','等待补证：体验额度',false,false],['paused-card','暂停发布：历史体验',true,true]]){const copy={...row,id,title,value_text:title,evidence:JSON.stringify(good?displayOffer().evidence:initial.evidence),review_state:paused?'approved':'pending',withdrawn_at:paused?'2026-10-11T00:00:00Z':null};await db.prepare(`INSERT INTO offers(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).bind(...keys.map(k=>copy[k])).run();}
 const snapshot=await captureLocalSnapshot(db,{environment:'synthetic',sourceDatabaseId:'review-flow-local',sourceCodeSha:'a'.repeat(40),approvedBy:'synthetic'}),plan=await buildBackfillPlan(snapshot);await applyBackfillPage(db,plan,{environment:'synthetic',approvedPlanHash:plan.planHash,actor:'synthetic'});env.IDENTITY_MODE='enforce';
 const queue=await call('admin/queue',undefined,true);assert.deepEqual(queue.counts,{activities:3,leadReview:1,newLeads:0});assert.equal(queue.pending.length,3);assert.equal(queue.pending.some(item=>item.id==='paused-card'),false);
 const claimed=await call('ingest/official-reviews/vendor-signup/claim',{});assert.equal(claimed.stageEvidence,true);
 const candidate=displayOffer(),text=Object.values(candidate.evidence.excerpts).join('\n');candidate.sourceText=text;candidate.sourceFetch={originalUrl:candidate.evidence.url,finalUrl:candidate.evidence.url,fetchedUrl:candidate.evidence.url,method:'direct',sourceVerified:true,truncated:false,contentHash:await sha256(text)};
 const body={jobId:claimed.jobId,candidate};await call('ingest/official-reviews/vendor-signup/draft',body);await call('ingest/official-reviews/vendor-signup/draft',body);await call('ingest/official-reviews/vendor-signup/draft',{...body,candidate:{...candidate,title:'mutated retry'}},false,409);
 await call('ingest/official-reviews/vendor-signup/result',{jobId:claimed.jobId,status:'matched',reason:'已补官方原文，等待人工判断',queries:[],candidates:[candidate.evidence.url],chosenUrl:candidate.evidence.url,changedFields:['evidence']});
 const after=await call('admin/queue',undefined,true),card=after.pending.find(x=>x.id==='vendor-signup');assert.equal(card.preparation.stage,'ready');assert.equal(card.reviewState,'pending');assert.equal(card.suggestion.verdict,'approve');assert.equal((await db.prepare("SELECT count(*) n FROM offers WHERE review_state='approved'").first()).n,1);assert.equal((await db.prepare('SELECT count(*) n FROM identity_events').first()).n,0);assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 const template=await db.prepare('SELECT facts_json,terms_hash FROM benefit_versions LIMIT 1').first();
 for(let i=0;i<100;i++){const id='scale-'+i,e='scale-entity-'+i,v='scale-version-'+i,copy={...row,id};await db.prepare(`INSERT INTO offers(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).bind(...keys.map(k=>copy[k])).run();await db.prepare("INSERT INTO benefit_entities(id,platform_id,canonical_offer_id) VALUES(?,'vendor',?)").bind(e,id).run();await db.prepare("INSERT INTO benefit_versions(id,entity_id,terms_schema,terms_hash,facts_json,display_candidate_json,state) VALUES(?,?,'terms-v1',?,?,?,'pending')").bind(v,e,template.terms_hash,template.facts_json,JSON.stringify({...displayOffer(),id})).run();await db.prepare("INSERT INTO review_tasks(id,task_key,kind,entity_id,version_id) VALUES(?,?,'initial',?,?)").bind('scale-task-'+i,'initial:'+e,e,v).run();}
 const large=await call('admin/queue',undefined,true);assert.equal(large.counts.activities,103);assert.equal(large.pending.length,103);
 assert.ok(measurements.every(m=>m.statements<=50));console.log(JSON.stringify({status:'passed',measurements,automaticPublications:0,externalCalls:0}));
}finally{await proxy.dispose();}
