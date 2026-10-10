import assert from 'node:assert/strict';
import {getPlatformProxy} from 'wrangler';
import {drizzle} from 'drizzle-orm/d1';
import {offers} from '../../src/db/schema.ts';
import {displayOffer} from '../../tests/fixtures/identity/offer.ts';
import {terms,known} from '../../tests/fixtures/identity/terms.ts';
import {hashTerms} from '../../src/shared/identity/normalize.ts';
import {buildMergePlan} from '../../src/worker/identity/merge-plan.ts';
import {IdentityMergeService} from '../../src/worker/identity/merge.ts';
import {resolveCanonicalOffer} from '../../src/worker/identity/canonical.ts';
import {buildNotice} from '../../src/worker/admin.ts';
import {withIdentityQueryBudget} from '../../src/worker/identity/budget.ts';
const path=process.env.IDENTITY_LOCAL_PERSIST;if(!path?.startsWith('.superpowers/sdd/IMPLEMENTATION/merge-d1-'))throw new Error('explicit fresh synthetic local persistence required');
const proxy=await getPlatformProxy({configPath:'tests/fixtures/identity/wrangler.jsonc',persist:{path:path+'/v3'}});
try{
 const db=proxy.env.DB;await db.prepare("INSERT INTO platforms(id,name,type,status,site) VALUES('vendor','Synthetic','lab','approved','https://vendor.example')").run();
 const ids=[];for(let i=0;i<10;i++){
  const eid='e-'+i,vid='v-'+i,oid='o-'+i;ids.push(eid);const facts=terms();facts.occurrenceAnchor=known('same-campaign');
  await drizzle(db).insert(offers).values({...displayOffer(),id:oid,reviewState:'approved',lastVerifiedAt:new Date().toISOString()});
  await db.prepare("INSERT INTO benefit_entities(id,platform_id,canonical_offer_id,publication_revision) VALUES(?,'vendor',?,?)").bind(eid,oid,i+1).run();
  await db.prepare("INSERT INTO benefit_versions(id,entity_id,terms_schema,terms_hash,facts_json,display_candidate_json,state) VALUES(?,?,'terms-v1',?,? ,?,'approved')").bind(vid,eid,await hashTerms(facts),JSON.stringify(facts),JSON.stringify({...displayOffer(),id:oid})).run();await db.prepare('UPDATE benefit_entities SET current_approved_version_id=? WHERE id=?').bind(vid,eid).run();
 }
 await db.prepare("INSERT INTO identity_events(id,event_key,entity_id,version_id,kind,payload_json) VALUES('root-new','offer:e-0:1:new:telegram','e-0','v-0','new',?)").bind(JSON.stringify({entityId:'e-0',versionId:'v-0',publicationRevision:1,decisionId:'original-fixture',channel:'telegram'})).run();
 const payload=JSON.stringify({items:{new:[{id:'o-9'}]},marks:[{offerId:'o-9',stage:'new'}]});await db.prepare("INSERT INTO deliveries(id,fingerprint,channel,kind,status,payload) VALUES('unknown','unknown','telegram','digest','unknown',?)").bind(payload).run();
 const before=JSON.stringify((await db.prepare('SELECT * FROM offers ORDER BY id').all()).results);
 const plan=await buildMergePlan(db,{environment:'synthetic',snapshotHash:'a'.repeat(64),sourceCodeSha:process.env.IDENTITY_SOURCE_SHA,groups:[{entityIds:ids,canonicalEntityId:'e-0',canonicalReason:'Synthetic ten-member canonical routing proof',evidence:{relation:'same',author:'fixture-admin',quote:'Ten synthetic copies describe the same campaign.',sourceUrls:['https://synthetic.invalid/evidence']}}]});assert.equal(plan.groups[0].status,'ready');
 const options={environment:'synthetic',enabled:true,actor:'synthetic-runtime-admin'};
 const merged=await new IdentityMergeService(withIdentityQueryBudget(db),options).applyMerge(plan,'runtime-apply',plan.planHash);assert.equal(merged.status,'applied');assert.equal((await new IdentityMergeService(db,options).applyMerge(plan,'runtime-apply',plan.planHash)).status,'replayed');
 assert.equal((await resolveCanonicalOffer(db,'o-9')).offerId,'o-0');assert.equal(JSON.stringify((await db.prepare('SELECT * FROM offers ORDER BY id').all()).results),before);assert.equal((await db.prepare('SELECT payload FROM deliveries WHERE id=?').bind('unknown').first()).payload,payload);
 assert.equal((await buildNotice({DB:db},'digest','telegram')).marks.length,0);
 const rolled=await new IdentityMergeService(withIdentityQueryBudget(db),options).rollbackMerge(merged.operationId,0,'runtime-rollback');assert.equal(rolled.status,'applied');assert.equal((await resolveCanonicalOffer(db,'o-9')).offerId,'o-9');assert.equal((await new IdentityMergeService(db,options).rollbackMerge(merged.operationId,0,'runtime-rollback')).status,'replayed');assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 console.log(JSON.stringify({environment:'fresh-local-workerd-d1',members:10,mergeReplay:'passed',routing:'passed',originalOffersAndPayload:'unchanged',unknownDelivery:'blocked',rollbackReplay:'passed',foreignKeys:'passed',requestQueryBudget:50,planHash:plan.planHash,productionOperations:0,externalMessages:0,modelCalls:0}));
}finally{await proxy.dispose();}
