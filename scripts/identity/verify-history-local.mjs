import assert from 'node:assert/strict';
import {getPlatformProxy} from 'wrangler';
import worker from '../../src/worker/index.ts';
import {displayOffer} from '../../tests/fixtures/identity/offer.ts';
import {captureLocalSnapshot,buildBackfillPlan,applyBackfillPage} from './backfill.ts';
import {buildMergePlan} from '../../src/worker/identity/merge-plan.ts';
const persistence=process.env.IDENTITY_LOCAL_PERSIST;
if(!persistence?.startsWith('.superpowers/sdd/IMPLEMENTATION/history-d1-'))throw new Error('explicit fresh synthetic local persistence required');
const proxy=await getPlatformProxy({configPath:'tests/fixtures/identity/wrangler.jsonc',persist:{path:persistence+'/v3'}});
try{
 const db=proxy.env.DB;await db.prepare("INSERT INTO platforms(id,name,type,status,site) VALUES('vendor','Synthetic','lab','approved','https://vendor.example')").run();
 const request=new Request('https://synthetic.invalid/api/ingest/offers',{method:'POST',headers:{Authorization:'Bearer synthetic-history-token','Content-Type':'application/json'},body:JSON.stringify([displayOffer()])});
 assert.equal((await worker.fetch(request,{DB:db,INGEST_TOKEN:'synthetic-history-token'},{})).status,200);await db.prepare("UPDATE offers SET review_state='approved'").run();
 await db.prepare("INSERT INTO leads(id,origin,url,status,resolution) VALUES(1,'manual','https://synthetic.invalid/refused','rejected','{\"reason\":\"Historical refusal\"}')").run();
 const snapshot=await captureLocalSnapshot(db,{environment:'synthetic',sourceDatabaseId:'fresh-local-d1',sourceCodeSha:process.env.IDENTITY_SOURCE_SHA,approvedBy:'synthetic-runtime-test'}),before=JSON.stringify(snapshot.tables);
 const plan=await buildBackfillPlan(snapshot),permission={environment:'synthetic',actor:'synthetic-runtime-test',approvedPlanHash:plan.planHash};
 await applyBackfillPage(db,plan,permission);const replay=await applyBackfillPage(db,plan,permission);assert.ok(replay.receipts.every(r=>r.status==='replayed'));
 assert.equal(JSON.stringify((await captureLocalSnapshot(db,snapshot.context)).tables),before);assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 const entity=(await db.prepare('SELECT id FROM benefit_entities').first()).id;
 const preview=await buildMergePlan(db,{environment:'synthetic',snapshotHash:snapshot.snapshotHash,sourceCodeSha:snapshot.context.sourceCodeSha,groups:[{entityIds:[entity,'missing'],canonicalEntityId:entity,canonicalReason:'Synthetic missing-member conflict probe',evidence:{relation:'same',author:'test',quote:'Synthetic relationship, not approved to merge.',sourceUrls:['https://synthetic.invalid/evidence']}}]});assert.ok(preview.groups[0].conflicts.length);assert.equal((await db.prepare('SELECT count(*) n FROM merge_operations').first()).n,0);
 console.log(JSON.stringify({environment:'fresh-local-workerd-d1',independentBackfill:'passed',replay:'passed',originalRowsUnchanged:'passed',foreignKeys:'passed',previewOnly:'passed',planHash:plan.planHash,conflictPlanHash:preview.planHash,productionOperations:0,externalMessages:0,modelCalls:0}));
}finally{await proxy.dispose();}
