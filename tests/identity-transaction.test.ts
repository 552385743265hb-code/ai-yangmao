import { afterEach,beforeEach,expect,it } from 'vitest';
import { commitIdentityMutation,MutationBuilder } from '../src/worker/identity/commit';
import { identityDb } from './fixtures/identity/db';
let f:ReturnType<typeof identityDb>;
beforeEach(()=>{f=identityDb();f.sqlite.exec("INSERT INTO benefit_entities(id,platform_id) VALUES('e1','vendor'); INSERT INTO identity_blocks(block_key,revision) VALUES('vendor:signup_grant',0)");});afterEach(()=>f.sqlite.close());
function plan(requestId='request',hash='payload',revision=0) {
 const builder=new MutationBuilder(f.db,requestId,hash);
 builder.insert('review_tasks',{id:'task-'+requestId,task_key:'initial:e1',kind:'initial',entity_id:'e1'});
 builder.update('benefit_entities',{business_revision:revision+1},'id=? AND business_revision=?',['e1',revision]);
 builder.assert("EXISTS(SELECT 1 FROM review_tasks WHERE id=? AND entity_id='e1')",['task-'+requestId]);
 return builder.plan([{kind:'entity',id:'e1',revision}],{taskId:'task-'+requestId});
}
it('A20 same request/payload replays exactly one task and business revision',async()=>{
 const a=await commitIdentityMutation(f.db,plan());
 expect(a).toEqual({status:'applied',value:{taskId:'task-request'}});
 expect(await commitIdentityMutation(f.db,plan())).toEqual({status:'replayed',value:{taskId:'task-request'}});
 expect(f.sqlite.prepare("SELECT business_revision FROM benefit_entities WHERE id='e1'").get()).toEqual({business_revision:1});
 expect(f.sqlite.prepare('SELECT count(*) n FROM review_tasks').get()).toEqual({n:1});
});
it('A21 same request with a different payload conflicts without changing original result',async()=>{
 await commitIdentityMutation(f.db,plan());
 expect(await commitIdentityMutation(f.db,plan('request','different'))).toEqual({status:'conflict',value:null});
 expect(f.sqlite.prepare('SELECT payload_hash FROM identity_commands').get()).toEqual({payload_hash:'payload'});
});
it('A22 zero-row entity or task guard makes every dependent write a no-op',async()=>{
 f.sqlite.exec("UPDATE benefit_entities SET business_revision=2 WHERE id='e1'");
 expect(await commitIdentityMutation(f.db,plan())).toEqual({status:'conflict',value:null});
 expect(f.sqlite.prepare('SELECT count(*) n FROM review_tasks').get()).toEqual({n:0});
 expect(f.sqlite.prepare('SELECT count(*) n FROM identity_commands').get()).toEqual({n:0});
});
it.each([2,3,4])('A23 SQL failure at statement %i rolls back command and business writes',async failAt=>{
 let count=0;
 f.inject(sql=>{if(/^(INSERT|UPDATE)/.test(sql)&&++count===failAt)throw new Error('injected SQL failure');});
 await expect(commitIdentityMutation(f.db,plan())).rejects.toThrow();
 f.inject();
 expect(f.sqlite.prepare('SELECT count(*) n FROM identity_commands').get()).toEqual({n:0});
 expect(f.sqlite.prepare('SELECT count(*) n FROM review_tasks').get()).toEqual({n:0});
 expect(f.sqlite.prepare("SELECT business_revision FROM benefit_entities WHERE id='e1'").get()).toEqual({business_revision:0});
 expect((await commitIdentityMutation(f.db,plan())).status).toBe('applied');
});
it('A23 final assertion failure is a CHECK violation inside the batch, never partial success',async()=>{
 const b=new MutationBuilder(f.db,'bad','hash');b.insert('review_tasks',{id:'bad-task',task_key:'initial:e1',kind:'initial',entity_id:'e1'});b.assert('0');
 await expect(commitIdentityMutation(f.db,b.plan([],{ok:true}))).rejects.toThrow(/CHECK/);
 expect(f.sqlite.prepare('SELECT count(*) n FROM review_tasks').get()).toEqual({n:0});
 expect(f.sqlite.prepare('SELECT count(*) n FROM identity_commands').get()).toEqual({n:0});
});
it('A25 two new-identity conclusions cannot both commit from the same block revision',async()=>{
 const create=(requestId:string)=>{const b=new MutationBuilder(f.db,requestId,requestId);b.update('identity_blocks',{revision:1},'block_key=?',['vendor:signup_grant']);return b.plan([{kind:'block',id:'vendor:signup_grant',revision:0}],{id:requestId});};
 expect((await commitIdentityMutation(f.db,create('first'))).status).toBe('applied');
 expect((await commitIdentityMutation(f.db,create('second'))).status).toBe('conflict');
});
it('A45 a version from another entity fails the batch ownership invariant',async()=>{
 f.sqlite.exec("INSERT INTO benefit_entities(id,platform_id) VALUES('e2','vendor'); INSERT INTO benefit_versions(id,entity_id,terms_schema,terms_hash,facts_json,display_candidate_json) VALUES('v2','e2','terms-v1','hash','{}','{}')");
 const b=new MutationBuilder(f.db,'cross','hash');b.insert('review_tasks',{id:'t',task_key:'initial:e1',kind:'initial',entity_id:'e1',version_id:'v2'});
 await expect(commitIdentityMutation(f.db,b.plan([{kind:'entity',id:'e1',revision:0}],{taskId:'t'}))).rejects.toThrow(/CHECK/);
 expect(f.sqlite.prepare('SELECT count(*) n FROM review_tasks').get()).toEqual({n:0});
});
it('A24 concurrent identical requests return one applied receipt and one replay',async()=>{
 const result=await Promise.all([commitIdentityMutation(f.db,plan()),commitIdentityMutation(f.db,plan())]);
 expect(result.map(r=>r.status).sort()).toEqual(['applied','replayed']);
 expect(f.sqlite.prepare('SELECT count(*) n FROM review_tasks').get()).toEqual({n:1});
});
