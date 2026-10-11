// Run with `npx tsx scripts/identity/verify-local.mjs`; no remote D1 API is used.
import assert from 'node:assert/strict';
import { getPlatformProxy } from 'wrangler';
import { MutationBuilder,commitIdentityMutation } from '../../src/worker/identity/commit.ts';
import { IdentityService } from '../../src/worker/identity/service.ts';
import { terms } from '../../tests/fixtures/identity/terms.ts';
import { displayOffer } from '../../tests/fixtures/identity/offer.ts';
import {claimNotice,ackDelivery} from '../../src/worker/admin.ts';
import {resolveCanonicalOffer} from '../../src/worker/identity/canonical.ts';
import { IdentityStore } from '../../src/worker/identity/store.ts';
const proxy=await getPlatformProxy({configPath:'tests/fixtures/identity/wrangler.jsonc',persist:{path:'.superpowers/sdd/IMPLEMENTATION/d1/v3'}});
try {
 const db=proxy.env.DB, id=crypto.randomUUID();
 const store=new IdentityStore(db);
 const body={requestId:`runtime-${id}`,originalUrl:`https://synthetic.example/${id}`,finalUrl:`https://synthetic.example/${id}`,text:'Synthetic signup credit.',fetchKind:'indirect',observedAt:'2026-10-10T10:00:00.000Z',truncated:false};
 const first=await store.recordObservation(body);
 assert.deepEqual(await store.recordObservation(body),first);
 assert.equal((await db.prepare('SELECT count(*) n FROM source_observations WHERE id=?').bind(first.observationId).first()).n,1);
 const returning=await db.batch([db.prepare('INSERT INTO identity_blocks(block_key,revision) VALUES(?,0) RETURNING revision').bind(id)]);
 assert.equal(returning[0].results[0].revision,0);
 await assert.rejects(()=>db.batch([
  db.prepare('UPDATE identity_blocks SET revision=1 WHERE block_key=?').bind(id),
  db.prepare("INSERT INTO identity_commands(request_id,payload_hash,state,expected_json) VALUES(?,'test','invalid','[]')").bind(id),
 ]));
 assert.equal((await db.prepare('SELECT revision FROM identity_blocks WHERE block_key=?').bind(id).first()).revision,0);
 assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 await db.prepare("INSERT INTO platforms(id,name,type) VALUES('identity-local-vendor','Synthetic','lab') ON CONFLICT DO NOTHING").run();
 const entityId='runtime-entity-'+id;
 await db.prepare('INSERT INTO benefit_entities(id,platform_id) VALUES(?,?)').bind(entityId,'identity-local-vendor').run();
 const makePlan=()=>{const b=new MutationBuilder(db,'runtime-command-'+id,'hash');b.insert('review_tasks',{id:'runtime-task-'+id,task_key:'initial:'+entityId,kind:'initial',entity_id:entityId});b.update('benefit_entities',{business_revision:1},'id=?',[entityId]);return b.plan([{kind:'entity',id:entityId,revision:0}],{entityId});};
 const concurrent=await Promise.all([commitIdentityMutation(db,makePlan()),commitIdentityMutation(db,makePlan())]);
 assert.deepEqual(concurrent.map(r=>r.status).sort(),['applied','replayed']);
 const stale=new MutationBuilder(db,'stale-'+id,'hash');stale.insert('review_tasks',{id:'stale-task-'+id,task_key:'stale:'+entityId,kind:'identity',entity_id:entityId});
 assert.equal((await commitIdentityMutation(db,stale.plan([{kind:'entity',id:entityId,revision:0}],{}))).status,'conflict');
 assert.equal(await db.prepare('SELECT id FROM review_tasks WHERE id=?').bind('stale-task-'+id).first(),null);
 const failed=new MutationBuilder(db,'failed-'+id,'hash');failed.insert('review_tasks',{id:'failed-task-'+id,task_key:'failed:'+entityId,kind:'identity',entity_id:entityId});failed.assert('0');
 await assert.rejects(()=>commitIdentityMutation(db,failed.plan([],{})));
 assert.equal(await db.prepare('SELECT id FROM review_tasks WHERE id=?').bind('failed-task-'+id).first(),null);
 const product='runtime-product-'+id,source='runtime-source-'+id,url='https://'+id+'.synthetic.example/rewards',anchor='campaign-'+id;
 await db.prepare("INSERT INTO platforms(id,name,type,status,site) VALUES(?,'Synthetic','lab','approved',?)").bind(product,new URL(url).origin).run();
 await db.prepare("INSERT INTO sources(id,platform_id,kind,url,tier) VALUES(?,?,'web_list',?,'site')").bind(source,product,url).run();
 const facts=terms();facts.issuerProductId={state:'known',value:product,evidenceRefs:['quote-1']};facts.benefitPools[0].poolKey=product+':api';facts.occurrenceAnchor={state:'known',value:anchor,evidenceRefs:['quote-1']};
 const quote='Campaign '+anchor+' grants 10 USD.';
 const observed=await store.recordObservation({requestId:'service-ob-'+id,originalUrl:url,finalUrl:url,text:quote,sourceId:source,fetchKind:'direct',observedAt:'2026-10-10T10:00:00.000Z'});
 const display={...displayOffer(),platformId:product,evidence:{...displayOffer().evidence,url}};
 const [candidate]=await store.recordCandidates({requestId:'service-batch-'+id,observationId:observed.observationId,extractionVersion:'test-v1',extractionComplete:true,leadIds:[],candidates:[{inputId:'candidate',facts,span:{start:0,end:quote.length,quote},quotes:[{id:'quote-1',start:0,end:quote.length,quote}],rawCandidate:display}]});
 const service=new IdentityService(db);
 const resolved=await service.resolveCandidate(candidate.candidateId,'service-resolve-'+id);
 assert.equal(resolved.outcome,'created_pending');
 const decision=await service.decideTask(resolved.taskId,{requestId:'service-approve-'+id,expectedRevision:0,action:'approve',actor:'local-test-admin',role:'admin'});
 assert.equal(decision.publicationRevision,1);
 assert.equal((await db.prepare('SELECT review_state FROM offers WHERE id=?').bind(resolved.canonicalOfferId).first()).review_state,'approved');
 assert.equal((await db.prepare("SELECT count(*) n FROM identity_events WHERE entity_id=? AND kind='new'").bind(resolved.entityId).first()).n,1);
 const route=await resolveCanonicalOffer(db,resolved.canonicalOfferId);assert.equal(route.entityId,resolved.entityId);
 const notice=await claimNotice({DB:db},'digest','telegram');assert.ok(notice.deliveryId);assert.ok(notice.marks.some(m=>m.entityId===resolved.entityId));
 assert.equal((await ackDelivery({DB:db},notice.deliveryId,'sent')).ok,true);
 assert.equal((await db.prepare("SELECT status FROM identity_events WHERE entity_id=? AND kind='new'").bind(resolved.entityId).first()).status,'delivered');
 console.log(JSON.stringify({canonicalRead:'passed',notificationClaimAck:'passed',environment:'local-workerd-d1',observationReplay:'passed',concurrentReceipt:'passed',initialApprovalOutbox:'passed',zeroGuard:'passed',finalAssertionRollback:'passed',returning:'passed',batchCheckRollback:'passed',foreignKeys:'passed',externalMessages:0,modelCalls:0}));
} finally { await proxy.dispose(); }
