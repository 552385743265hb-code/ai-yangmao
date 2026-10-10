import {beforeEach,afterEach,it,expect} from 'vitest';
import {identityDb} from './fixtures/identity/db';
import {seedMerge,mergePlan} from './fixtures/identity/merge';
import {IdentityMergeService} from '../src/worker/identity/merge';
import {resolveCanonicalOffer} from '../src/worker/identity/canonical';
let f:ReturnType<typeof identityDb>,service:IdentityMergeService;
beforeEach(()=>{f=identityDb();service=new IdentityMergeService(f.db,{environment:'synthetic',enabled:true,actor:'fixture-admin'});});afterEach(()=>f.sqlite.close());
it('A41 rollback restores active routes with monotonic revisions and an appended audit; replay is stable',async()=>{
 const plan=await mergePlan(f,await seedMerge(f));const merged=await service.applyMerge(plan,'apply',plan.planHash);const rollback=await service.rollbackMerge(merged.operationId!,0,'rollback');expect(rollback.status).toBe('applied');expect((await service.rollbackMerge(merged.operationId!,0,'rollback')).status).toBe('replayed');expect(await resolveCanonicalOffer(f.db,'offer-1')).toMatchObject({offerId:'offer-1',generation:2});expect(f.sqlite.prepare("SELECT count(*) n FROM review_decisions WHERE action IN ('merge','rollback')").get()).toEqual({n:2});expect(f.sqlite.prepare('SELECT count(*) n FROM merge_operations').get()).toEqual({n:1});
});
for(const change of ['review','delivery','manual edit'])it('A42 a later '+change+' makes rollback conflict without overwriting it',async()=>{
 const plan=await mergePlan(f,await seedMerge(f)),merged=await service.applyMerge(plan,'apply',plan.planHash);
 if(change==='review')f.sqlite.exec("INSERT INTO reviews(offer_id,action,reviewer,reason) VALUES('offer-0','edit','admin','合并后的人工决定')");
 if(change==='manual edit')f.sqlite.exec("UPDATE offers SET admin_note='合并后人工心得' WHERE id='offer-0'");
 if(change==='delivery')f.sqlite.prepare("INSERT INTO deliveries(id,fingerprint,channel,kind,status,payload) VALUES('new-send','new-send','telegram','digest','sent',?)").run(JSON.stringify({marks:[{offerId:'offer-0',stage:'new'}],items:{new:[{id:'offer-0'}]}}));
 const result=await service.rollbackMerge(merged.operationId!,0,'rollback');expect(result.status).toBe('conflict');expect(result.conflicts[0].code).toBe('rollback_conflict');expect(f.sqlite.prepare("SELECT state FROM benefit_entities WHERE id='entity-1'").get()).toEqual({state:'merged'});
});
it('A42 newly associated evidence after merge blocks rollback even without a business revision bump',async()=>{
 const plan=await mergePlan(f,await seedMerge(f)),merged=await service.applyMerge(plan,'apply',plan.planHash);const {IdentityStore}=await import('../src/worker/identity/store'),store=new IdentityStore(f.db);const {terms}=await import('./fixtures/identity/terms');
 const ob=await store.recordObservation({requestId:'new-evidence',originalUrl:'https://vendor.example/new',finalUrl:'https://vendor.example/new',text:'Additional evidence',fetchKind:'indirect',observedAt:new Date().toISOString()});const [candidate]=await store.recordCandidates({requestId:'new-evidence-c',observationId:ob.observationId,extractionVersion:'test',extractionComplete:true,candidates:[{inputId:'new',span:{start:0,end:19,quote:'Additional evidence'},quotes:[{id:'quote-1',start:0,end:19,quote:'Additional evidence'}],facts:terms(),rawCandidate:{}}]});f.sqlite.prepare("INSERT INTO entity_observations(entity_id,candidate_id,relation,resolver_version,reason_json) VALUES('entity-0',?,'evidence_only','test','[]')").run(candidate.candidateId);expect((await service.rollbackMerge(merged.operationId!,0,'rollback')).status).toBe('conflict');
});
it('A42 version-route changes after merge are not overwritten by rollback',async()=>{
 const plan=await mergePlan(f,await seedMerge(f)),merged=await service.applyMerge(plan,'apply',plan.planHash);f.sqlite.exec("UPDATE identity_version_routes SET status='rolled_back' WHERE source_entity_id='entity-1'");expect((await service.rollbackMerge(merged.operationId!,0,'rollback')).status).toBe('conflict');
});
