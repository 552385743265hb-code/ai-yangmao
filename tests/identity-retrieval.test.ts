import { afterEach,beforeEach,expect,it } from 'vitest';
import { IdentityStore } from '../src/worker/identity/store';
import { identityDb } from './fixtures/identity/db';
import { terms } from './fixtures/identity/terms';
let f:ReturnType<typeof identityDb>,store:IdentityStore;
beforeEach(()=>{f=identityDb();store=new IdentityStore(f.db);});afterEach(()=>f.sqlite.close());
function seed(id:string,state='rejected') {
 f.sqlite.prepare('INSERT INTO benefit_entities(id,platform_id) VALUES(?,?)').run(id,'vendor');
 f.sqlite.prepare('INSERT INTO benefit_versions(id,entity_id,terms_schema,terms_hash,facts_json,display_candidate_json,state) VALUES(?,?,\'terms-v1\',?,?,\'{}\',?)').run('v-'+id,id,'hash-'+id,JSON.stringify(terms()),state);
}
it('A18 all states are visible in bounded keyset pages and overflow is never complete',async()=>{
 for(let i=0;i<43;i++)seed(`e${String(i).padStart(3,'0')}`,['approved','pending','rejected','superseded'][i%4]);
 const a=await store.retrieveCandidates('vendor',terms());
 expect(a.entities).toHaveLength(40);expect(a.complete).toBe(false);expect(a.nextCursor).toEqual(expect.any(String));
 const b=await store.retrieveCandidates('vendor',terms(),a.nextCursor!);
 expect(b.entities.map(e=>e.id)).toEqual(['e040','e041','e042']);expect(b.complete).toBe(true);
 expect(new Set([...a.entities,...b.entities].map(e=>e.id)).size).toBe(43);
});
it('A18 exact aliases beyond top40 are returned from the main table and wrong product aliases are excluded',async()=>{
 for(let i=0;i<41;i++)seed(`e${String(i).padStart(3,'0')}`);
 f.sqlite.prepare("INSERT INTO identity_aliases(id,namespace,alias_key,scope_key,entity_id,basis_json) VALUES('a','official_campaign','signup-2026','vendor:signup_grant','e040','{}')").run();
 const facts=terms();facts.occurrenceAnchor={state:'known',value:'signup-2026',evidenceRefs:['quote-1']};
 const page=await store.retrieveCandidates('vendor',facts);
 expect(page.entities.some(e=>e.id==='e040')).toBe(true);expect(page.entities.length).toBeLessThanOrEqual(40);expect(page.complete).toBe(false);
 expect(await store.lookupAlias('legacy_offer_id','missing','wrong-product')).toBeNull();
});
it('A18 lookup faults propagate as retryable errors, never an empty successful history',async()=>{
 f.inject(sql=>{if(sql.includes('FROM benefit_entities'))throw new Error('database unavailable');});
 await expect(store.retrieveCandidates('vendor',terms())).rejects.toMatchObject({status:503});
});
it('A18 product filtering and cursors cannot expose another product history',async()=>{
 seed('e1');
 expect((await store.retrieveCandidates('other',terms())).entities).toEqual([]);
 await expect(store.retrieveCandidates('vendor',terms(),'invalid-cursor')).rejects.toMatchObject({status:400});
});
it('A26 scoped lead-only rejection is retrieved even without an offer/entity',async()=>{
 const observation=await store.recordObservation({requestId:'ob',originalUrl:'https://vendor.example',finalUrl:'https://vendor.example',text:'Signup grants 10 USD.',fetchKind:'direct',observedAt:'2026-10-10T10:00:00.000Z'});
 const [receipt]=await store.recordCandidates({requestId:'cand',observationId:observation.observationId,extractionVersion:'v1',extractionComplete:true,leadIds:[1],candidates:[{inputId:'i',span:{start:0,end:21,quote:'Signup grants 10 USD.'},quotes:[{id:'quote-1',start:0,end:21,quote:'Signup grants 10 USD.'}],rawCandidate:{},facts:terms()}]});
 f.sqlite.prepare("INSERT INTO review_decisions(id,candidate_id,action,reason_code,scope_json,reopen_policy_json,rules_version,evidence_refs_json,actor,idempotency_key) VALUES('d',?,'reject','paid_bundle',?,?, 'rules-v1','[\"quote-1\"]','admin','decision-d')").run(receipt.candidateId,JSON.stringify({kind:'scoped_mechanism',productId:'vendor',mechanism:'signup_grant',confirmedBy:'admin'}),JSON.stringify({kind:'manual',missingFacts:[]}));
 const result=await store.retrieveCandidates('vendor',terms());
 expect(result.decisions.map(d=>d.id)).toEqual(['d']);expect(result.entities).toEqual([]);
});
it('A18 FTS uses bounded product-scoped Chinese recall while missing index entries stay in the structured page',async()=>{
 seed('e1');seed('e2');
 await store.indexEntity('e1','vendor','每日登录奖励 API 模型');
 const matches=await store.searchIdentity('vendor','登录奖励');
 expect(matches.ids).toContain('e1');
 expect((await store.searchIdentity('other','登录奖励')).ids).toEqual([]);
 expect((await store.retrieveCandidates('vendor',terms())).entities.map(e=>e.id)).toContain('e2');
 await expect(store.searchIdentity('vendor','x'.repeat(2001))).rejects.toMatchObject({status:400});
});
