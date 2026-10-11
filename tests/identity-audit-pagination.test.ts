import {beforeEach,afterEach,it,expect} from 'vitest';
import {auditFixture,auditTerms} from './fixtures/identity/audit';
import {IdentityService} from '../src/worker/identity/service';
import {displayOffer} from './fixtures/identity/offer';
import {known} from './fixtures/identity/terms';
import {hashTerms} from '../src/shared/identity/normalize';
import {drizzle} from 'drizzle-orm/d1';
import {offers} from '../src/db/schema';
let f:ReturnType<typeof auditFixture>;
beforeEach(()=>{f=auditFixture();});afterEach(()=>f.sqlite.close());
async function scale(count:number,alias:boolean){
 for(let i=0;i<count;i++){const id='entity-'+String(i).padStart(3,'0'),v=auditTerms(i===count-1?'chosen':'other-'+i);f.sqlite.prepare("INSERT INTO benefit_entities(id,platform_id) VALUES(?,'vendor')").run(id);f.sqlite.prepare("INSERT INTO benefit_versions(id,entity_id,terms_schema,terms_hash,facts_json,display_candidate_json,state) VALUES(?,?,'terms-v1',?,? ,?,'approved')").run('v-'+id,id,await hashTerms(v),JSON.stringify(v),JSON.stringify(displayOffer()));f.sqlite.prepare('UPDATE benefit_entities SET current_approved_version_id=? WHERE id=?').run('v-'+id,id);}
 const id='entity-'+String(count-1).padStart(3,'0');await drizzle(f.db).insert(offers).values({...displayOffer(),reviewState:'approved'});f.sqlite.prepare("UPDATE benefit_entities SET canonical_offer_id='vendor-signup' WHERE id=?").run(id);
 if(alias)f.sqlite.prepare("INSERT INTO identity_aliases(id,namespace,alias_key,scope_key,entity_id,basis_json) VALUES('exact','official_campaign','chosen','vendor:signup_grant',?,'{}')").run(id);return id;
}
async function intake(id:string,facts=auditTerms('chosen')){const text='Campaign '+(facts.occurrenceAnchor.state==='known'?facts.occurrenceAnchor.value:'unknown')+' grants 10 USD without a paid subscription.';const o=await f.observation(id,text);return f.candidate(id,o,text,facts);}
for(const count of [39,40,41,81])for(const alias of [false,true])it(`R03 ${count} entities exactAlias=${alias} can reach the chosen identity through the real manual endpoint`,async()=>{
 const target=await scale(count,alias),c=await intake('next');const r=await new IdentityService(f.db).resolveCandidate(c.candidateId,'initial');
 if(count<=40){expect(r.outcome).toBe('duplicate_approved');return;}
 expect(r.outcome).toBe('needs_identity_review');const out=await f.call('admin/identity/tasks/'+r.taskId+'/resolve',{requestId:'choose-target',expectedRevision:0,action:'same',entityId:target,candidateId:c.candidateId,reason:'Reviewed the exact target and its evidence.'},true);expect(out.status).toBe(200);expect(out.body).toMatchObject({outcome:'duplicate_approved',entityId:target});expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:count});
});
it('R03 explicit new activity after 81 unrelated entities completes without skipping applicable refusal scopes',async()=>{
 await scale(81,false);const c=await intake('new-candidate',auditTerms('independent-round'));const r=await new IdentityService(f.db).resolveCandidate(c.candidateId,'initial');expect(r.outcome).toBe('needs_identity_review');const out=await f.call('admin/identity/tasks/'+r.taskId+'/resolve',{requestId:'choose-new',expectedRevision:0,action:'new',candidateId:c.candidateId,reason:'Verified independently claimable new round.'},true);expect(out.status).toBe(200);expect(out.body.outcome).toBe('created_pending');expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:82});
});
it('R03 forty-one historical non-refusals do not block one existing entity',async()=>{
 const target=await scale(1,true);for(let i=0;i<41;i++)f.sqlite.prepare("INSERT INTO review_decisions(id,entity_id,action,reason_code,scope_json,reopen_policy_json,rules_version,evidence_refs_json,actor,idempotency_key) VALUES(?,?,'approve','other',?,'{\"kind\":\"manual\",\"missingFacts\":[]}','test','[]','admin',?)").run('past-'+i,target,JSON.stringify({kind:'entity_alias',entityId:target}),'past-'+i);
 const c=await intake('history');expect((await new IdentityService(f.db).resolveCandidate(c.candidateId,'history')).outcome).toBe('duplicate_approved');
});
it('R03 manual refusal pagination is durable across budget-sized requests and rejects changed payloads',async()=>{
 const target=await scale(81,false);for(let i=0;i<41;i++)f.sqlite.prepare("INSERT INTO review_decisions(id,entity_id,action,reason_code,scope_json,reopen_policy_json,rules_version,evidence_refs_json,actor,idempotency_key) VALUES(?,?,'reject','paid_bundle',?,'{\"kind\":\"manual\",\"missingFacts\":[]}','test','[]','admin',?)").run('paid-'+String(i).padStart(3,'0'),target,JSON.stringify({kind:'scoped_mechanism',productId:'vendor',mechanism:'signup_grant',confirmedBy:'admin'}),'paid-'+i);
 const facts=auditTerms('independent-free');facts.costs=known({upfrontAmount:'0',currency:'USD',subscriptionRequired:false,autoRenewal:false});const c=await intake('free',facts),r=await new IdentityService(f.db).resolveCandidate(c.candidateId,'free');
 const payload={requestId:'paged-new',expectedRevision:0,action:'new',candidateId:c.candidateId,reason:'Independent zero-cost grant is not a paid bundle.'};let statements=0;f.inject(()=>statements++);
 const first=await f.call('admin/identity/tasks/'+r.taskId+'/resolve',payload,true);expect(first.status).toBe(200);expect(first.body).toMatchObject({outcome:'deferred',retryable:true});expect(statements).toBeLessThanOrEqual(50);expect(f.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:1});
 const changed=await f.call('admin/identity/tasks/'+r.taskId+'/resolve',{...payload,reason:'Different payload reusing the same pending command.'},true);expect(changed.status).toBe(409);
 statements=0;const second=await f.call('admin/identity/tasks/'+r.taskId+'/resolve',payload,true);expect(second.status).toBe(200);expect(second.body.outcome).toBe('created_pending');expect(statements).toBeLessThanOrEqual(50);f.inject();
 expect((await f.call('admin/identity/tasks/'+r.taskId+'/resolve',payload,true)).body).toEqual(second.body);
});
it('R03 a newly inserted refusal behind the saved cursor invalidates the final scope proof',async()=>{
 const target=await scale(81,false);for(let i=0;i<41;i++)f.sqlite.prepare("INSERT INTO review_decisions(id,entity_id,action,reason_code,scope_json,reopen_policy_json,rules_version,evidence_refs_json,actor,idempotency_key) VALUES(?,?,'reject','paid_bundle',?,'{\"kind\":\"manual\",\"missingFacts\":[]}','test','[]','admin',?)").run('paid-'+String(i).padStart(3,'0'),target,JSON.stringify({kind:'scoped_mechanism',productId:'vendor',mechanism:'signup_grant',confirmedBy:'admin'}),'paid-'+i);
 const facts=auditTerms('later-free');facts.costs=known({upfrontAmount:'0',currency:'USD',subscriptionRequired:false,autoRenewal:false});const c=await intake('new-during-scan',facts),r=await new IdentityService(f.db).resolveCandidate(c.candidateId,'begin');const payload={requestId:'interrupted',expectedRevision:0,action:'new',candidateId:c.candidateId,reason:'A separate independently claimable free reward.'};
 expect((await f.call('admin/identity/tasks/'+r.taskId+'/resolve',payload,true)).body.outcome).toBe('deferred');
 f.sqlite.prepare("INSERT INTO review_decisions(id,entity_id,action,reason_code,scope_json,reopen_policy_json,rules_version,evidence_refs_json,actor,idempotency_key) VALUES('000-new-block',?,'reject','other',?,'{\"kind\":\"manual\",\"missingFacts\":[]}','test','[]','admin','new-block')").run(target,JSON.stringify({kind:'scoped_mechanism',productId:'vendor',mechanism:'signup_grant',confirmedBy:'admin'}));
 const result=await f.call('admin/identity/tasks/'+r.taskId+'/resolve',payload,true);expect(result.status).toBe(409);expect(f.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:1});expect(f.sqlite.prepare('SELECT state FROM review_tasks WHERE id=?').get(r.taskId)).toEqual({state:'open'});
});
