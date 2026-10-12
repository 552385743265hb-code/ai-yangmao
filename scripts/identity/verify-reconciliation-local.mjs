/** Synthetic workerd/D1 proof. Never accepts a production database or remote flag. */
import assert from 'node:assert/strict';
import {getPlatformProxy} from 'wrangler';
import {drizzle} from 'drizzle-orm/d1';
import {offers} from '../../src/db/schema.ts';
import {displayOffer} from '../../tests/fixtures/identity/offer.ts';
import {terms,known} from '../../tests/fixtures/identity/terms.ts';
import {unknownIdentityTerms} from '../../src/worker/identity/adapters.ts';
import {hashTerms,sha256,stableJson} from '../../src/shared/identity/normalize.ts';
import {buildMergePlan} from '../../src/worker/identity/merge-plan.ts';
import {IdentityMergeService} from '../../src/worker/identity/merge.ts';
import {IdentityStore} from '../../src/worker/identity/store.ts';
import {resolveCanonicalOffer} from '../../src/worker/identity/canonical.ts';
import {withIdentityQueryBudget} from '../../src/worker/identity/budget.ts';
const path=process.env.IDENTITY_LOCAL_PERSIST;
if(!path?.startsWith('.wrangler/merge-reconciliation-')||process.argv.includes('--remote'))throw new Error('explicit synthetic local persistence required');
const proxy=await getPlatformProxy({configPath:'tests/fixtures/identity/wrangler.jsonc',persist:{path:path+'/v3'}});
try{
 const db=proxy.env.DB,options={environment:'synthetic',enabled:true,actor:'synthetic-admin'},service=()=>new IdentityMergeService(withIdentityQueryBudget(db),options);
 for(const p of ['vendor','parent'])await db.prepare("INSERT INTO platforms(id,name,type,status,site) VALUES(?,?,'lab','approved','https://vendor.example')").bind(p,p).run();
 const unknown=unknownIdentityTerms();
 for(let i=0;i<2;i++){
  const product=i?'parent':'vendor',display={...displayOffer(),id:'offer-'+i,platformId:product};await drizzle(db).insert(offers).values({...display,reviewState:'approved'});
  await db.prepare("INSERT INTO benefit_entities(id,platform_id,canonical_offer_id,publication_revision) VALUES(?,?,?,1)").bind('entity-'+i,product,'offer-'+i).run();
  await db.prepare("INSERT INTO benefit_versions(id,entity_id,terms_schema,terms_hash,facts_json,display_candidate_json,state) VALUES(?,?,'terms-v1',?, ?,?,'approved')").bind('version-'+i,'entity-'+i,await hashTerms(unknown),JSON.stringify(unknown),JSON.stringify(display)).run();
  await db.prepare('UPDATE benefit_entities SET current_approved_version_id=? WHERE id=?').bind('version-'+i,'entity-'+i).run();
 }
 const store=new IdentityStore(db),text='The proposed trial classification was rejected.';
 const observation=await store.recordObservation({requestId:'rejected-ob',originalUrl:'https://vendor.example/claim',finalUrl:'https://vendor.example/claim',text,fetchKind:'indirect',observedAt:new Date().toISOString()});
 const [candidate]=await store.recordCandidates({requestId:'rejected-c',observationId:observation.observationId,extractionVersion:'synthetic',extractionComplete:true,candidates:[{inputId:'claim',span:{start:0,end:text.length,quote:text},quotes:[{id:'q',start:0,end:text.length,quote:text}],facts:unknown,rawCandidate:{type:'trial'}}]});
 await db.prepare("INSERT INTO rejected_offer_updates(id,offer_id,evidence,diff) VALUES(14,'offer-1','{}',?)").bind(JSON.stringify([{field:'type',from:displayOffer().type,to:'trial'}])).run();
 await db.prepare("INSERT INTO review_decisions(id,entity_id,candidate_id,action,reason_code,scope_json,reopen_policy_json,rules_version,evidence_refs_json,actor,idempotency_key,basis_json) VALUES('refusal','entity-1',?,'reject','other',?,'{\"kind\":\"manual\",\"missingFacts\":[]}','identity-rules-v1','[]','admin','refusal',?)").bind(candidate.candidateId,JSON.stringify({kind:'claim',candidateId:candidate.candidateId}),JSON.stringify({legacyTable:'rejected_offer_updates',legacyId:14})).run();
 const input={environment:'synthetic',snapshotHash:'a'.repeat(64),sourceCodeSha:process.env.IDENTITY_SOURCE_SHA,groups:[{entityIds:['entity-0','entity-1'],canonicalEntityId:'entity-0',canonicalReason:'Retain the reviewed synthetic product record',evidence:{relation:'same',author:'synthetic-admin',quote:'vendor same-campaign grants 10 USD on signup.',sourceUrls:['https://vendor.example/campaign']}}]};
 const baseline=await buildMergePlan(withIdentityQueryBudget(db),input),facts=terms();facts.occurrenceAnchor=known('same-campaign');
 const refusal=await db.prepare("SELECT * FROM review_decisions WHERE id='refusal'").first(),rejected=await db.prepare('SELECT * FROM rejected_offer_updates WHERE id=14').first();
 input.groups[0].reconciliation={kind:'legacy_exact_versions_v1',members:baseline.groups[0].expected.map(m=>({entityId:m.entity.id,versionId:m.entity.current_approved_version_id,stateHash:m.stateHash})),productId:'vendor',facts,quotes:[{id:'quote-1',url:'https://vendor.example/campaign',quote:input.groups[0].evidence.quote}],reason:'Explicit synthetic exact-version legacy identity attestation',fieldChoices:{platformId:'offer-0'},retainedClaims:[{decisionId:'refusal',candidateId:candidate.candidateId,decisionHash:await sha256(stableJson(refusal)),rejectedUpdateId:14,rejectedUpdateHash:await sha256(stableJson(rejected)),distinguishingFields:['type'],reason:'Preserve the original type; the trial proposal remains refused.'}]};
 // Exercise the schema maximum, including D1's single-statement binding limit.
 for(let i=1;i<20;i++){
  const id=14+i,decision={...refusal,id:'refusal-'+i,idempotency_key:'refusal-'+i,basis_json:JSON.stringify({legacyTable:'rejected_offer_updates',legacyId:id})},row={...rejected,id};
  for(const [table,record] of [['review_decisions',decision],['rejected_offer_updates',row]]){const keys=Object.keys(record);await db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...Object.values(record)).run();}
  input.groups[0].reconciliation.retainedClaims.push({...input.groups[0].reconciliation.retainedClaims[0],decisionId:decision.id,decisionHash:await sha256(stableJson(decision)),rejectedUpdateId:id,rejectedUpdateHash:await sha256(stableJson(row))});
 }
 const fresh=await buildMergePlan(db,{...input,groups:input.groups.map(({reconciliation,...group})=>group)});
 input.groups[0].reconciliation.members=fresh.groups[0].expected.map(m=>({entityId:m.entity.id,versionId:m.entity.current_approved_version_id,stateHash:m.stateHash}));
 const plan=await buildMergePlan(withIdentityQueryBudget(db),input);assert.equal(plan.groups[0].status,'ready');
 const immutable=async()=>stableJson(await Promise.all(['offers','benefit_versions','rejected_offer_updates'].map(async table=>(await db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()).results))),before=await immutable();
 const merged=await service().applyMerge(plan,'local-reconcile',plan.planHash);assert.equal(merged.status,'applied');assert.equal((await resolveCanonicalOffer(db,'offer-1')).offerId,'offer-0');assert.equal(await immutable(),before);assert.deepEqual(await db.prepare("SELECT * FROM review_decisions WHERE id='refusal'").first(),refusal);
 assert.equal((await service().applyMerge(plan,'local-reconcile',plan.planHash)).status,'replayed');
 assert.equal((await service().rollbackMerge(merged.operationId,0,'local-undo')).status,'applied');assert.equal((await resolveCanonicalOffer(db,'offer-1')).offerId,'offer-1');assert.equal(await immutable(),before);
 assert.equal((await service().applyMerge(plan,'stale-request',plan.planHash)).status,'conflict');assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 console.log(JSON.stringify({environment:'synthetic-local-workerd-d1',reconciliation:'passed',retainedClaims:20,retainedClaim:'unchanged',history:'unchanged',crossProductRouting:'passed',rollbackProductRestoration:'passed',idempotency:'passed',stalePlan:'rejected',foreignKeys:'passed',requestStatementBudget:50,productionOperations:0}));
}finally{await proxy.dispose();}
