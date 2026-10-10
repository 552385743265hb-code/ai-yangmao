import {it,expect,beforeEach,afterEach} from 'vitest';
import {auditFixture,auditTerms} from './fixtures/identity/audit';
import {known} from './fixtures/identity/terms';
import {IdentityService} from '../src/worker/identity/service';
let f:ReturnType<typeof auditFixture>;
beforeEach(()=>{f=auditFixture();});afterEach(()=>f.sqlite.close());
const text='Campaign shared includes student signup grants and separate business signup grants of 10 USD in independent API pools.';
for(const change of ['qualification','pool','correction'] as const)for(const state of ['pending','approved','rejected'] as const)it(`R01 same_span_same_mechanism_independent_subclaims_across_requests ${change} after ${state}`,async()=>{
 const observation=await f.observation('page',text),a=auditTerms('shared');a.eligibility=known({audience:'new',requirements:['student']});const first=await f.candidate('first',observation,text,a),service=new IdentityService(f.db);const resolved=await service.resolveCandidate(first.candidateId,'first-resolve');
 if(state!=='pending')await service.decideTask(resolved.taskId!,{requestId:'first-decision',expectedRevision:0,action:state==='approved'?'approve':'reject',reasonCode:'other',actor:'admin',role:'admin'});
 const b=structuredClone(a);if(change==='qualification')b.eligibility=known({audience:'new',requirements:['business']});if(change==='pool')b.benefitPools[0].poolKey='vendor:separate';if(change==='correction')b.benefitPools[0].amount=known({value:'20',unit:'currency',currency:'USD'});
 const second=await f.candidate('second',observation,text,b);expect(second.candidateId).not.toBe(first.candidateId);expect(second.outcome).toBe('deferred');expect(second.decisionId).toBeNull();
 expect(JSON.parse(String(f.sqlite.prepare('SELECT facts_json FROM intake_candidates WHERE id=?').get(first.candidateId)?.facts_json))).toEqual(a);
 expect(JSON.parse(String(f.sqlite.prepare('SELECT facts_json FROM intake_candidates WHERE id=?').get(second.candidateId)?.facts_json))).toEqual(b);
 const next=await service.resolveCandidate(second.candidateId,'second-resolve');expect(next).toMatchObject({outcome:'needs_identity_review',entityId:null});expect(next.taskId).not.toBe(resolved.taskId);
 expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:1});
});
it('R01 same normalized claim with a new title keeps one candidate and its original evidence',async()=>{
 const o=await f.observation('same',text),facts=auditTerms('shared');const a=await f.candidate('a',o,text,facts);const b=await f.candidate('b',o,text,facts,{title:'Translated title'});expect(b.candidateId).toBe(a.candidateId);expect(f.sqlite.prepare('SELECT count(*) n FROM intake_candidates').get()).toEqual({n:1});
});
it('R01 concurrent single-candidate requests retain both distinct assertions',async()=>{
 const o=await f.observation('race',text),a=auditTerms('shared'),b=structuredClone(a);a.eligibility=known({audience:'new',requirements:['student']});b.eligibility=known({audience:'new',requirements:['business']});
 const receipts=await Promise.all([f.candidate('race-a',o,text,a),f.candidate('race-b',o,text,b)]);expect(new Set(receipts.map(r=>r.candidateId)).size).toBe(2);
 const resolved=await new IdentityService(f.db).resolveCandidate(receipts[0].candidateId,'race-resolution');expect(resolved.outcome).toBe('needs_identity_review');expect(resolved.entityId).toBeNull();
});
it('R01 a human can resolve the second assertion as an independent pending benefit without overwriting the first',async()=>{
 const o=await f.observation('manual',text),a=auditTerms('shared');a.eligibility=known({audience:'new',requirements:['student']});const first=await f.candidate('student',o,text,a);const service=new IdentityService(f.db);const old=await service.resolveCandidate(first.candidateId,'student');
 const b=structuredClone(a);b.eligibility=known({audience:'new',requirements:['business']});const second=await f.candidate('business',o,text,b);const pending=await service.resolveCandidate(second.candidateId,'business');
 const decided=await f.call('admin/identity/tasks/'+pending.taskId+'/resolve',{requestId:'human-separate',expectedRevision:0,action:'new',candidateId:second.candidateId,facts:b,reason:'Two independently claimable audience benefits.'},true);
 expect(decided.status).toBe(200);expect(decided.body.outcome).toBe('created_pending');expect(decided.body.entityId).not.toBe(old.entityId);expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:2});
});
it('R01 upgrading a 0029 candidate preserves its ID and original receipt',async()=>{
 const {DatabaseSync}=await import('node:sqlite');const {readFileSync,readdirSync}=await import('node:fs');const {hashTerms,sha256,stableJson}=await import('../src/shared/identity/normalize');
 const db=new DatabaseSync(':memory:');try{
 const names=readdirSync(new URL('../migrations/',import.meta.url)).filter(n=>/^\d+_.+\.sql$/.test(n)).sort();for(const name of names.filter(n=>n.slice(0,4)<='0029'))db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 db.exec("INSERT INTO source_documents(id,original_url,url_key) VALUES('doc','https://vendor.example','doc'); INSERT INTO source_observations(id,document_id,content_hash,text,text_truncated,fetch_kind,final_url,observed_at,last_seen_at,trust_json) VALUES('obs','doc','hash','Legacy',0,'indirect','https://vendor.example','2026-10-10T00:00:00Z','2026-10-10T00:00:00Z','{}')");
 const family=await sha256(stableJson(['obs','old','0:6','signup_grant'])),facts=auditTerms();const receipt=JSON.stringify({candidateId:'legacy-candidate',reasonCodes:['retained']});
 db.prepare("INSERT INTO intake_candidates(id,observation_id,extraction_version,span_key,candidate_key,facts_json,facts_hash,raw_candidate_json,receipt_json) VALUES('legacy-candidate','obs','old','0:6',?,?,?,'{}',?)").run(family,JSON.stringify(facts),await hashTerms(facts),receipt);
 db.exec(readFileSync(new URL('../migrations/0030_identity_candidate_families.sql',import.meta.url),'utf8'));
 expect(db.prepare('SELECT id,claim_family_key,receipt_json FROM intake_candidates').get()).toEqual({id:'legacy-candidate',claim_family_key:family,receipt_json:receipt});expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
 }finally{db.close();}
});

it('R01 repeating an extraction after human fact correction retains its current receipt and original assertion identity',async()=>{
 const o=await f.observation('corrected',text),v=auditTerms('shared');v.issuerProductId={state:'unknown'};
 const c=await f.candidate('unknown-product',o,text,v),service=new IdentityService(f.db),pending=await service.resolveCandidate(c.candidateId,'unknown-product');
 const decided=await service.resolveIdentityTask(pending.taskId!,{requestId:'correct-product',expectedRevision:0,action:'new',candidateId:c.candidateId,facts:auditTerms('shared'),reason:'Verified actual issuer product.',actor:'admin'});
 const replay=await f.candidate('same-extraction-again',o,text,v,{title:'Translated'});expect(replay.candidateId).toBe(c.candidateId);expect(replay.entityId).toBe(decided.entityId);expect(f.sqlite.prepare('SELECT count(*) n FROM intake_candidates').get()).toEqual({n:1});
});
