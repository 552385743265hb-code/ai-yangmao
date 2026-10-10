import {it,expect,beforeEach,afterEach} from 'vitest';
import {auditFixture,auditTerms} from './fixtures/identity/audit';
import {known} from './fixtures/identity/terms';
import {IdentityService} from '../src/worker/identity/service';
let f:ReturnType<typeof auditFixture>,service:IdentityService;
beforeEach(()=>{f=auditFixture();service=new IdentityService(f.db);});afterEach(()=>f.sqlite.close());
async function rejectWithoutOffer(reason='other',missing=false,indirect=false){
 const text='Campaign claim-root gives students and businesses independent signup grants.';const o=indirect?(await f.call('ingest/observations',{requestId:'original',originalUrl:'https://vendor.example/original',finalUrl:'https://vendor.example/original',text,sourceId:'vendor-source',fetchKind:'indirect',observedAt:'2026-10-10T00:00:00Z'})).body.observationId:await f.observation('original',text),v=auditTerms('claim-root');v.eligibility=known({audience:'new',requirements:['student']});if(missing)v.benefitPools[0].amount={state:'unknown'};
 const a=await f.candidate('old-claim',o,text,v),b=structuredClone(v);b.eligibility=known({audience:'new',requirements:['business']});await f.candidate('other-claim',o,text,b);
 const unresolved=await service.resolveCandidate(a.candidateId,'old-claim');expect(unresolved.entityId).toBeNull();const rejection=await service.decideTask(unresolved.taskId!,{requestId:'reject-root',expectedRevision:0,action:'reject',reasonCode:reason as any,reopenPolicy:missing?{kind:'missing_facts',missingFacts:['benefitPools.vendor:api.amount']}:{kind:'manual',missingFacts:[]},actor:'admin',role:'admin'});
 return {candidateId:a.candidateId,decisionId:rejection.decisionId,facts:v};
}
async function again(id:string,v:ReturnType<typeof auditTerms>,text='活动 claim-root 为新学生账户赠送 10 USD 注册奖励。'){const o=await f.observation(id,text);return f.candidate(id,o,text,v);}
it('R02 rejected_claim_without_offer_reappears_under_new_observation inherits the original decision without a new offer task or reminder',async()=>{
 const root=await rejectWithoutOffer();const before=f.sqlite.prepare('SELECT count(*) n FROM identity_events').get();const c=await again('translated',root.facts);expect(c.candidateId).not.toBe(root.candidateId);
 const result=await f.call('ingest/identity-candidates/'+c.candidateId+'/resolve',{requestId:'translated'});expect(result.status).toBe(200);expect(result.body).toMatchObject({outcome:'duplicate_rejected',decisionId:root.decisionId,canonicalOfferId:null,entityId:null,taskId:null});
 expect(f.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:0});expect(f.sqlite.prepare('SELECT count(*) n FROM review_tasks').get()).toEqual({n:1});expect(f.sqlite.prepare('SELECT count(*) n FROM identity_events').get()).toEqual(before);
});
for(const counter of ['new occurrence','independent grant','unknown qualification'])it('R02 does not suppress '+counter,async()=>{
 const root=await rejectWithoutOffer(),v=structuredClone(root.facts);if(counter==='new occurrence')v.occurrenceAnchor=known('claim-next');if(counter==='independent grant')v.mechanism=known('referral');if(counter==='unknown qualification')v.eligibility={state:'unknown'};
 const c=await again('counter',v,'Campaign claim-root and claim-next describe different bonuses.');const r=await service.resolveCandidate(c.candidateId,'counter');expect(r.outcome).not.toBe('duplicate_rejected');expect(r.decisionId).toBeNull();if(counter==='unknown qualification')expect(r.outcome).toBe('needs_identity_review');
});
it('R02 official evidence supplies only the named missing fact and creates one pending reopen',async()=>{
 const root=await rejectWithoutOffer('insufficient_evidence',true),v=structuredClone(root.facts);v.benefitPools[0].amount=known({value:'10',unit:'currency',currency:'USD'});const c=await again('official-supplement',v);
 const r=await service.resolveCandidate(c.candidateId,'official-supplement');expect(r).toMatchObject({outcome:'evidence_reopen',entityId:null,decisionId:root.decisionId});expect((await service.resolveCandidate(c.candidateId,'official-retry')).taskId).toBe(r.taskId);const other=await again('official-other-source',v,'官方确认 claim-root 为学生注册赠送 10 USD。');expect((await service.resolveCandidate(other.candidateId,'official-other-source')).taskId).toBe(r.taskId);expect(f.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:0});
});
it('R02 one explicit human claim correspondence persists and can ground later cross-source refusal inheritance',async()=>{
 const v=auditTerms('manual-claim');v.issuerProductId={state:'unknown'};const first=await again('unknown-first',v,'Campaign manual-claim grants 10 USD.'),r=await service.resolveCandidate(first.candidateId,'unknown-first');const d=await service.decideTask(r.taskId!,{requestId:'reject-unknown',expectedRevision:0,action:'reject',reasonCode:'other',actor:'admin',role:'admin'});
 const next=await again('unknown-next',v,'Campaign manual-claim grants 10 USD.');const pending=await service.resolveCandidate(next.candidateId,'unknown-next');
 const linked=await f.call('admin/identity/tasks/'+pending.taskId+'/resolve',{requestId:'claim-correspondence',expectedRevision:0,action:'same_claim',candidateId:next.candidateId,decisionId:d.decisionId,facts:auditTerms('manual-claim'),reason:'Official source establishes this is the previously rejected claim.'},true);expect(linked.status).toBe(200);expect(linked.body).toMatchObject({outcome:'duplicate_rejected',decisionId:d.decisionId,entityId:null});
 const third=await again('third-source',auditTerms('manual-claim'),'活动 manual-claim 提供 10 USD 注册赠额。');expect(await service.resolveCandidate(third.candidateId,'third-source')).toMatchObject({outcome:'duplicate_rejected',decisionId:d.decisionId});expect(f.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:0});
});
it('R02 administrators can inspect paginated active offerless refusals before naming a target',async()=>{
 const root=await rejectWithoutOffer();const result=await f.call('admin/identity/claim-decisions?productId=vendor&limit=1',undefined,true);expect(result.status).toBe(200);expect(result.body.decisions[0]).toMatchObject({id:root.decisionId,candidateId:root.candidateId});expect(result.body.decisions[0].quotes[0].quote).toContain('claim-root');
});
it('R02 a conflicting qualification never becomes a rejection through a guessed manual target',async()=>{
 const root=await rejectWithoutOffer(),facts=structuredClone(root.facts);facts.eligibility=known({audience:'new',requirements:['business']});const c=await again('different-human',facts),r=await service.resolveCandidate(c.candidateId,'different-human');
 const invalid=await f.call('admin/identity/tasks/'+r.taskId+'/resolve',{requestId:'invalid-same',expectedRevision:0,action:'same_claim',candidateId:c.candidateId,decisionId:root.decisionId,reason:'This target actually has a different qualification.'},true);expect(invalid.status).toBe(409);expect(f.sqlite.prepare('SELECT decision_id FROM intake_candidates WHERE id=?').get(c.candidateId)).toEqual({decision_id:null});
});

it('R02 a reopened original decision is not inherited by a new source',async()=>{
 const root=await rejectWithoutOffer();const revision=Number(f.sqlite.prepare('SELECT revision FROM intake_candidates WHERE id=?').get(root.candidateId)?.revision);
 await service.reopenDecision(root.decisionId,{requestId:'explicit-reopen',expectedRevision:revision,reason:'Review this claim again with corrected evidence.',basis:{description:'Explicit administrator restoration of review.'},actor:'admin'});
 const c=await again('after-reopen',root.facts);expect((await service.resolveCandidate(c.candidateId,'after-reopen')).outcome).not.toBe('duplicate_rejected');
});
it('R02 a reviewer cannot forge claim correspondence and an administrator cannot bind another task candidate',async()=>{
 const root=await rejectWithoutOffer(),v=structuredClone(root.facts);v.eligibility={state:'unknown'};const c=await again('uncertain',v),r=await service.resolveCandidate(c.candidateId,'uncertain');
 const payload={requestId:'unauthorized-correspondence',expectedRevision:0,action:'same_claim',candidateId:c.candidateId,decisionId:root.decisionId,reason:'Claim requires deliberate human identity confirmation.'};
 const denied=await f.call('admin/identity/tasks/'+r.taskId+'/resolve',payload,false,{REVIEWER_TOKENS:'reviewer:audit-ingest-token'});expect(denied.status).toBe(403);
 const foreign=await f.call('admin/identity/tasks/'+r.taskId+'/resolve',{...payload,candidateId:root.candidateId},true);expect(foreign.status).toBe(409);expect(f.sqlite.prepare('SELECT decision_id FROM intake_candidates WHERE id=?').get(c.candidateId)).toEqual({decision_id:null});
});

it('R02 missing-fact policy can reopen a reviewed indirect claim using newly verified official evidence without upgrading the old source',async()=>{
 const root=await rejectWithoutOffer('insufficient_evidence',true,true),facts=structuredClone(root.facts);facts.benefitPools[0].amount=known({value:'10',unit:'currency',currency:'USD'});
 const c=await again('official-after-indirect',facts);expect(await service.resolveCandidate(c.candidateId,'official-after-indirect')).toMatchObject({outcome:'evidence_reopen',decisionId:root.decisionId,entityId:null});
 const old=f.sqlite.prepare('SELECT o.trust_json FROM source_observations o JOIN intake_candidates c ON c.observation_id=o.id WHERE c.id=?').get(root.candidateId);expect(JSON.parse(String(old?.trust_json)).sourceVerified).toBe(false);expect(f.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:0});
});
