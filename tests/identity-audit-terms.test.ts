import {beforeEach,afterEach,it,expect} from 'vitest';
import {auditFixture,auditTerms} from './fixtures/identity/audit';
import {known,unknown} from './fixtures/identity/terms';
import {IdentityService} from '../src/worker/identity/service';
let f:ReturnType<typeof auditFixture>,service:IdentityService;
beforeEach(()=>{f=auditFixture();service=new IdentityService(f.db);});afterEach(()=>f.sqlite.close());
async function scenario(kind:'amount'|'cadence'|'omission'|'added'|'pool'){
 const before=auditTerms('terms-audit');before.geography=known(['US']);before.eligibility=known({audience:'new',requirements:['student']});
 const t='Campaign terms-audit grants students 10 USD once in the US.';const o=await f.observation('base',t),c=await f.candidate('base',o,t,before),a=await service.resolveCandidate(c.candidateId,'base');await service.decideTask(a.taskId!,{requestId:'approve-base',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
 const after=structuredClone(before);let text='Campaign terms-audit grants 10 USD once.';after.geography=unknown;
 if(kind==='amount'){after.benefitPools[0].amount=known({value:'20',unit:'currency',currency:'USD'});text='Campaign terms-audit replaces 10 USD with 20 USD.';}
 if(kind==='cadence'){after.benefitPools[0].cadence=known({kind:'calendar',count:1,unit:'month',timezone:null});after.eligibility=unknown;text='Campaign terms-audit replaces once with monthly rewards.';}
 if(kind==='added')after.costs=known({upfrontAmount:'0',currency:'USD',subscriptionRequired:false,autoRenewal:false});
 if(kind==='pool')after.benefitPools[0].poolKey='vendor:independent';
 const ob=await f.observation('new',text),cb=await f.candidate('new',ob,text,after,{valueText:kind==='amount'?'注册赠送 20 美元 API 额度':'新的待审条款'}),b=await service.resolveCandidate(cb.candidateId,'new');expect(b.outcome).toBe('needs_identity_review');
 const result=await f.call('admin/identity/tasks/'+b.taskId+'/resolve',{requestId:'manual-same',expectedRevision:0,action:'same',candidateId:cb.candidateId,entityId:a.entityId,reason:'Only identity is confirmed; changes require separate review.'},true);return {a,b,result,before,after};
}
for(const kind of ['amount','cadence','added'] as const)it(`R06 manual_same_identity_preserves_known_change_when_other_facts_missing ${kind}`,async()=>{
 const {a,result,after,before}=await scenario(kind);expect(result.status).toBe(200);expect(result.body).toMatchObject({outcome:'proposed_update',entityId:a.entityId});expect(result.body.versionId).not.toBe(a.versionId);
 expect(f.sqlite.prepare('SELECT value_text,review_state FROM offers').get()).toEqual({value_text:'注册赠送 10 美元 API 额度',review_state:'approved'});expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:1});
 const task=f.sqlite.prepare('SELECT * FROM review_tasks WHERE id=?').get(result.body.taskId)!;expect(task.kind).toBe('terms_change');
 expect((await f.call('admin/identity/tasks/'+task.id+'/resolve',{requestId:'premature-approve',expectedRevision:task.revision,action:'approve'},true)).status).toBe(409);
 after.geography=before.geography;after.eligibility=before.eligibility;const edited=await service.editManagedOffer(a.canonicalOfferId!,{requestId:'complete-reviewed-facts',taskId:String(task.id),expectedTaskRevision:Number(task.revision),fields:{},identityFacts:after,actor:'admin'});
 expect((await f.call('admin/identity/tasks/'+task.id+'/resolve',{requestId:'review-complete',expectedRevision:edited.revision,action:'approve'},true)).status).toBe(200);
});
it('R06 a pure omission attaches evidence without changing the approved version',async()=>{const {a,result}=await scenario('omission');expect(result.status).toBe(200);expect(result.body).toMatchObject({outcome:'duplicate_approved',versionId:a.versionId});expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_versions').get()).toEqual({n:1});});
it('R06 identity same cannot waive independent pool ambiguity',async()=>{const {a,result,b}=await scenario('pool');expect(result.status).toBe(400);expect(f.sqlite.prepare('SELECT current_approved_version_id FROM benefit_entities WHERE id=?').get(a.entityId)).toEqual({current_approved_version_id:a.versionId});expect(f.sqlite.prepare('SELECT state FROM review_tasks WHERE id=?').get(b.taskId)).toEqual({state:'open'});});
it('R06 an administrator can reject a changed-facts candidate with no usable display draft',async()=>{
 const facts=auditTerms('incomplete-display'),text='Campaign incomplete-display grants 10 USD.',o=await f.observation('display-base',text),a=await f.candidate('display-base',o,text,facts),base=await service.resolveCandidate(a.candidateId,'display-base');await service.decideTask(base.taskId!,{requestId:'display-base-approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});facts.benefitPools[0].amount=known({value:'20',unit:'currency',currency:'USD'});const change='Campaign incomplete-display replaces 10 USD with 20 USD.',ob=await f.observation('empty-display',change),receipt=await f.call('ingest/candidates',{requestId:'empty-display',observationId:ob,extractionVersion:'audit-v1',extractionComplete:true,candidates:[{inputId:'empty',span:{start:0,end:change.length,quote:change},quotes:[{id:'quote-1',start:0,end:change.length,quote:change}],facts,rawCandidate:{}}]});expect(receipt.status).toBe(200);const pending=await service.resolveCandidate(receipt.body.receipts[0].candidateId,'empty-display');expect(pending.outcome).toBe('proposed_update');expect((await f.call('admin/identity/tasks/'+pending.taskId+'/resolve',{requestId:'reject-empty',expectedRevision:0,action:'reject',reason:'Cannot validate the extracted display draft.',reasonCode:'other'},true)).status).toBe(200);expect(f.sqlite.prepare('SELECT value_text,review_state FROM offers').get()).toEqual({value_text:'注册赠送 10 美元 API 额度',review_state:'approved'});
});
