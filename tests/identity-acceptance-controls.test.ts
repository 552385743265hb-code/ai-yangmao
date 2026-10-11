import {it,expect,afterEach,beforeEach} from 'vitest';
import {identityDb} from './fixtures/identity/db';
import {seedMerge,mergeInput} from './fixtures/identity/merge';
import {buildMergePlan} from '../src/worker/identity/merge-plan';
import {IdentityMergeService} from '../src/worker/identity/merge';
import worker from '../src/worker/index';
let f:ReturnType<typeof identityDb>;
beforeEach(()=>{f=identityDb();});afterEach(()=>f.sqlite.close());
it('A35 completed groups keep individual receipts when a later group changes after preview',async()=>{
 const ids=await seedMerge(f,4),input=mergeInput(ids.slice(0,2));input.groups.push(mergeInput(ids.slice(2)).groups[0]);const plan=await buildMergePlan(f.db,input),service=new IdentityMergeService(f.db,{environment:'synthetic',enabled:true,actor:'fixture-admin'});
 const first=await service.applyMerge(plan,'grouped',plan.planHash,plan.groups[0].id);expect(first.status).toBe('applied');
 f.sqlite.exec("UPDATE offers SET admin_note='new manual decision' WHERE id='offer-3'");const second=await service.applyMerge(plan,'grouped',plan.planHash,plan.groups[1].id);expect(second.status).toBe('conflict');
 expect((await service.applyMerge(plan,'grouped',plan.planHash,plan.groups[0].id)).status).toBe('replayed');expect(f.sqlite.prepare('SELECT count(*) n FROM merge_operations').get()).toEqual({n:1});expect(f.sqlite.prepare("SELECT state FROM benefit_entities WHERE id='entity-3'").get()).toEqual({state:'active'});
});
for(const corruption of ['cycle','missing canonical','cross product'])it('A36 preview/apply fail closed for '+corruption,async()=>{
 const ids=await seedMerge(f),input=mergeInput(ids);
 if(corruption==='cycle')f.sqlite.exec("UPDATE benefit_entities SET state='merged',merged_into=CASE id WHEN 'entity-0' THEN 'entity-1' ELSE 'entity-0' END");
 if(corruption==='missing canonical')input.groups[0].canonicalEntityId='missing';
 if(corruption==='cross product')f.sqlite.exec("INSERT INTO platforms(id,name,type,status,site) VALUES('other','Other','lab','approved','https://other.invalid'); UPDATE benefit_entities SET platform_id='other' WHERE id='entity-1'");
 const plan=await buildMergePlan(f.db,input);expect(plan.groups[0].status).toBe('conflict');const service=new IdentityMergeService(f.db,{environment:'synthetic',enabled:true,actor:'fixture-admin'});expect((await service.applyMerge(plan,'bad',plan.planHash)).status).toBe('conflict');expect(f.sqlite.prepare('SELECT count(*) n FROM merge_operations').get()).toEqual({n:0});
});
it('A45 public and ingest credentials cannot read administrator raw evidence/task cards',async()=>{
 for(const token of ['', 'fixture-ingest-token']){const response=await worker.fetch(new Request('https://local.test/api/admin/identity/tasks',{headers:token?{Authorization:'Bearer '+token}:{}}),{DB:f.db,ADMIN_TOKEN:'fixture-admin-token',INGEST_TOKEN:'fixture-ingest-token'} as any,{} as any);expect([401,403]).toContain(response.status);expect(await response.text()).not.toContain('raw_candidate_json');}
});
