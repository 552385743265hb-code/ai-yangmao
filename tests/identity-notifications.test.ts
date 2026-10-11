import {beforeEach,afterEach,it,expect} from 'vitest';
import {identityDb} from './fixtures/identity/db';
import {IdentityStore} from '../src/worker/identity/store';
import {IdentityService} from '../src/worker/identity/service';
import {buildNotice,claimNotice,ackDelivery} from '../src/worker/admin';
import type {Env} from '../src/worker/index';
import {terms,known} from './fixtures/identity/terms';
import {displayOffer} from './fixtures/identity/offer';
let f:ReturnType<typeof identityDb>,service:IdentityService;
const env=()=>({DB:f.db} as Env);
async function intake(id:string,amount='10') {const text=`Campaign signup-2026 ${amount==='10'?'grants 10 USD':'replaces 10 USD with 20 USD'}.`,facts=terms();facts.occurrenceAnchor=known('signup-2026');facts.benefitPools[0].amount=known({value:amount,unit:'currency',currency:'USD'});
 const store=new IdentityStore(f.db);const ob=await store.recordObservation({requestId:id,originalUrl:'https://vendor.example/'+id,finalUrl:'https://vendor.example/'+id,text,sourceId:'vendor-source',fetchKind:'direct',observedAt:new Date().toISOString()});
 const [r]=await store.recordCandidates({requestId:'batch-'+id,observationId:ob.observationId,extractionVersion:'v1',extractionComplete:true,candidates:[{inputId:id,span:{start:0,end:text.length,quote:text},quotes:[{id:'quote-1',start:0,end:text.length,quote:text}],facts,rawCandidate:displayOffer(amount+' USD API 额度')}]});return service.resolveCandidate(r.candidateId,'resolve-'+id);}
beforeEach(()=>{f=identityDb();service=new IdentityService(f.db);});afterEach(()=>f.sqlite.close());
it('A28 one task has one stable reminder after another source and a metadata revision',async()=>{
 const a=await intake('a');const one=await claimNotice(env(),'digest','telegram');expect(one.reviewAlerts.map(a=>a.key)).toContain(`review:${a.taskId}:1:telegram`);await ackDelivery(env(),one.deliveryId!,'sent');
 await intake('b');f.sqlite.prepare('UPDATE review_tasks SET revision=revision+1 WHERE id=?').run(a.taskId);
 expect((await buildNotice(env(),'digest','telegram')).reviewAlerts).toHaveLength(0);
});
it('A17/A20 publication marks use approved publicationRevision and ack consumes only their event',async()=>{
 const a=await intake('a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const first=await claimNotice(env(),'digest','telegram');expect(first.marks.find(m=>m.stage==='new')).toMatchObject({entityId:a.entityId,publicationRevision:1,eventKey:`offer:${a.entityId}:1:new:telegram`});
 await ackDelivery(env(),first.deliveryId!,'sent');expect(f.sqlite.prepare("SELECT status FROM identity_events WHERE kind='new'").get()).toEqual({status:'delivered'});
 const b=await intake('b','20');await service.decideTask(b.taskId!,{requestId:'approve-b',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const second=await claimNotice(env(),'digest','telegram');expect(second.marks.find(m=>m.stage==='changed')).toMatchObject({entityId:a.entityId,publicationRevision:2});
 await ackDelivery(env(),second.deliveryId!,'unknown');expect((await buildNotice(env(),'digest','telegram')).marks).toHaveLength(0);
 expect(f.sqlite.prepare('SELECT status FROM deliveries WHERE id=?').get(second.deliveryId)).toEqual({status:'unknown'});
});
it('A29 claim rechecks the task material revision after preview without reserving stale delivery',async()=>{
 await intake('a');let changed=false;f.inject(sql=>{if(!changed&&sql.includes('INSERT INTO deliveries')){changed=true;f.sqlite.exec('UPDATE review_tasks SET material_revision=material_revision+1');}});
 const result=await claimNotice(env(),'digest','telegram');expect(result.deliveryId).toBeUndefined();expect(f.sqlite.prepare('SELECT count(*) n FROM deliveries').get()).toEqual({n:0});
});
it('A23 notification ack failure rolls back both marks and event consumption',async()=>{
 const a=await intake('a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});const n=await claimNotice(env(),'digest','telegram');
 f.inject(sql=>{if(sql.includes('UPDATE deliveries SET status'))throw new Error('ack storage failure');});await expect(ackDelivery(env(),n.deliveryId!,'sent')).rejects.toThrow('ack storage failure');f.inject();
 expect(f.sqlite.prepare('SELECT count(*) n FROM notifications').get()).toEqual({n:0});expect(f.sqlite.prepare("SELECT status FROM identity_events WHERE kind='new'").get()).toEqual({status:'pending'});expect(f.sqlite.prepare('SELECT status FROM deliveries').get()).toEqual({status:'pending'});
});
it('A17 an urgent initial announcement suppresses the same publication new event',async()=>{
 const a=await intake('a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 f.sqlite.prepare("INSERT INTO notifications(offer_id,stage,channel,status,sent_at) VALUES(?,'urgent','telegram','sent',?)").run(a.canonicalOfferId,new Date().toISOString());
 expect((await buildNotice(env(),'digest','telegram')).marks.filter(m=>m.stage==='new')).toHaveLength(0);
});
it('A28/A39 an unknown reminder does not reappear or starve another task',async()=>{
 f.sqlite.exec("UPDATE leads SET status='linked'");const a=await intake('a');const n=await claimNotice(env(),'digest','telegram');expect(n.reviewAlerts).toHaveLength(1);await ackDelivery(env(),n.deliveryId!,'unknown');
 f.sqlite.exec("INSERT INTO review_tasks(id,task_key,kind) VALUES('b','identity:b','identity'); INSERT INTO identity_events(id,event_key,task_id,kind,payload_json) VALUES('eb','review:b:1:telegram','b','review','{\"taskId\":\"b\",\"materialRevision\":1,\"channel\":\"telegram\"}')");
 const next=await claimNotice(env(),'digest','telegram');expect(next.reviewAlerts.map(r=>r.key)).toEqual(['review:b:1:telegram']);expect(next.deliveryId).toBeDefined();expect(next.reviewAlerts.some(r=>r.taskId===a.taskId)).toBe(false);
});
it('A27/A31 forty expired publication events cannot starve a later claimable offer',async()=>{
 const a=await intake('a');await service.decideTask(a.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const original=f.sqlite.prepare('SELECT * FROM offers').get()!;const keys=Object.keys(original);
 for(let i=0;i<40;i++){const offer='old-'+i,e='e-'+i,v='v-'+i;f.sqlite.prepare(`INSERT INTO offers(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>k==='id'?offer:k==='end_kind'?'date':k==='claim_end'?'2020-01-01':original[k]));f.sqlite.prepare("INSERT INTO benefit_entities(id,platform_id,canonical_offer_id,publication_revision) VALUES(?,'vendor',?,1)").run(e,offer);f.sqlite.prepare("INSERT INTO benefit_versions(id,entity_id,terms_schema,terms_hash,facts_json,display_candidate_json,state) VALUES(?,?,'terms-v1',?,'{}','{}','approved')").run(v,e,v);f.sqlite.prepare('UPDATE benefit_entities SET current_approved_version_id=? WHERE id=?').run(v,e);f.sqlite.prepare("INSERT INTO identity_events(id,event_key,entity_id,version_id,kind,payload_json,created_at) VALUES(?,?,?,?,'new',?,'2020-01-01')").run('ev-'+i,'old:'+i,e,v,JSON.stringify({entityId:e,versionId:v,publicationRevision:1,decisionId:'d',channel:'telegram'}));}
 expect((await buildNotice(env(),'digest','telegram')).marks.some(m=>m.offerId===a.canonicalOfferId&&m.stage==='new')).toBe(true);
});
