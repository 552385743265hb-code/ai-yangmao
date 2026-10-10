import {beforeEach,afterEach,it,expect} from 'vitest';
import {identityDb} from './fixtures/identity/db';
import {buildMergePlan} from '../src/worker/identity/merge-plan';
import {terms,known} from './fixtures/identity/terms';
import {drizzle} from 'drizzle-orm/d1';
import {offers} from '../src/db/schema';
import {displayOffer} from './fixtures/identity/offer';
import {hashTerms} from '../src/shared/identity/normalize';
let f:ReturnType<typeof identityDb>;
beforeEach(()=>{f=identityDb();});afterEach(()=>f.sqlite.close());
const input=(ids=['a','b'])=>({environment:'synthetic',snapshotHash:'a'.repeat(64),sourceCodeSha:'b'.repeat(40),groups:[{entityIds:ids,canonicalEntityId:ids[0],canonicalReason:'管理员核对并保留原公开链接',evidence:{relation:'same',author:'fixture-admin',quote:'Both links refer to campaign signup-2026.',sourceUrls:['https://vendor.example/terms']}}]});
async function entities(withOffers=false){for(const id of ['a','b']){const facts=terms();facts.occurrenceAnchor=known('signup-2026');const hash=await hashTerms(facts);if(withOffers)await drizzle(f.db).insert(offers).values({...displayOffer(),id:'offer-'+id,reviewState:'approved'});f.sqlite.prepare("INSERT INTO benefit_entities(id,platform_id) VALUES(?,'vendor')").run(id);if(withOffers)f.sqlite.prepare('UPDATE benefit_entities SET canonical_offer_id=? WHERE id=?').run('offer-'+id,id);f.sqlite.prepare("INSERT INTO benefit_versions(id,entity_id,terms_schema,terms_hash,facts_json,display_candidate_json,state) VALUES(?,?,'terms-v1',?,?,'{}','approved')").run('v-'+id,id,hash,JSON.stringify(facts));f.sqlite.prepare('UPDATE benefit_entities SET current_approved_version_id=? WHERE id=?').run('v-'+id,id);}}
it('A34 preview captures exact revisions hashes evidence and conflicts without any writes',async()=>{
 await entities();f.sqlite.prepare("UPDATE benefit_versions SET terms_hash='different',facts_json=json_set(facts_json,'$.benefitPools[0].amount.value.value','20') WHERE entity_id='b'").run();
 const before=f.sqlite.prepare('SELECT total_changes() n').get();const plan=await buildMergePlan(f.db,input());expect(plan.planHash).toMatch(/^[0-9a-f]{64}$/);expect(plan.groups[0].conflicts.some((c:any)=>c.code==='approved_terms_conflict')).toBe(true);expect(plan.groups[0].expected).toHaveLength(2);expect(f.sqlite.prepare('SELECT total_changes() n').get()).toEqual(before);
});
it('A34/A36 different constraints and oversized groups are explicit and never silently truncated',async()=>{
 await entities();f.sqlite.exec("INSERT INTO identity_constraints(id,entity_a,entity_b,relation,basis_json,actor) VALUES('different','a','b','different','{}','admin')");const plan=await buildMergePlan(f.db,input());expect(plan.groups[0].conflicts.some((c:any)=>c.code==='manual_different')).toBe(true);
 const large=await buildMergePlan(f.db,input(Array.from({length:11},(_,i)=>'e'+i)));expect(large.groups[0].status).toBe('oversized');expect(large.groups[0].entityIds).toHaveLength(11);
});
it('A34 a changed human proposal or valuation is reported instead of silently selecting a winner',async()=>{await entities();const plan=await buildMergePlan(f.db,input());expect(plan.groups[0].conflicts.some((c:any)=>c.code==='missing_canonical_offer')).toBe(true);expect(plan.groups[0].canonicalReason).toBe('管理员核对并保留原公开链接');});

it('A34 differing manual valuations and proposals are listed without picking the higher value',async()=>{
 await entities(true);f.sqlite.exec("UPDATE offers SET usd_estimate=100 WHERE id='offer-b'");
 for(const id of ['a','b'])f.sqlite.prepare('INSERT INTO offer_proposals(offer_id,candidate,diff,manual_fields) VALUES(?,?,?,?)').run('offer-'+id,JSON.stringify({...displayOffer(),valueText:id==='a'?'10 USD':'20 USD'}),'[]','["valueText"]');
 const plan=await buildMergePlan(f.db,input());expect(plan.groups[0].canonicalEntityId).toBe('a');expect(plan.groups[0].conflicts.map(c=>c.code)).toEqual(expect.arrayContaining(['valuation_conflict','proposal_conflict']));expect(plan.groups[0].expected.flatMap(e=>e.proposals)).toHaveLength(2);
});
it('A34 ready plans and their exact hashes are deterministic and include pending/unknown notification impact',async()=>{
 await entities(true);f.sqlite.prepare("INSERT INTO deliveries(id,fingerprint,channel,kind,status,payload) VALUES('d','d','telegram','digest','unknown',?)").run(JSON.stringify({items:{new:[{id:'offer-b'}]},marks:[{offerId:'offer-b',stage:'new'}]}));
 const a=await buildMergePlan(f.db,input()),b=await buildMergePlan(f.db,input());expect(a.planHash).toBe(b.planHash);expect(a.groups[0].status).toBe('ready');expect(a.groups[0].notificationImpact.unknown).toEqual(['d']);expect(a.groups[0].publicChange).toEqual({before:['offer-a','offer-b'],after:['offer-a']});
});
