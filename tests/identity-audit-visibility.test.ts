import {beforeEach,afterEach,it,expect} from 'vitest';
import {auditFixture,auditTerms} from './fixtures/identity/audit';
import {IdentityService} from '../src/worker/identity/service';
import {IdentityMergeService} from '../src/worker/identity/merge';
import {seedMerge,mergePlan} from './fixtures/identity/merge';
import {known} from './fixtures/identity/terms';
let f:ReturnType<typeof auditFixture>;
beforeEach(()=>{f=auditFixture();});afterEach(()=>f.sqlite.close());
async function approved(){const text='Campaign visibility grants 10 USD.';const o=await f.observation('visibility',text),c=await f.candidate('visibility',o,text,auditTerms('visibility')),s=new IdentityService(f.db),r=await s.resolveCandidate(c.candidateId,'visibility');await s.decideTask(r.taskId!,{requestId:'approve-visible',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});return {receipt:r,service:s};}
for(const action of ['unpublish','withdraw'] as const)for(const merged of [false,true])it(`R04 ${action}_with_current_composite_review_version merged=${merged}`,async()=>{
 let id:string;if(merged){const ids=await seedMerge(f);const p=await mergePlan(f,ids);await new IdentityMergeService(f.db,{environment:'synthetic',enabled:true,actor:'admin'}).applyMerge(p,'merge-visible',p.planHash);id='offer-0';}else id=(await approved()).receipt.canonicalOfferId!;
 const get=await f.call('admin/offers/'+id,undefined,true);expect(get.status).toBe(200);expect(get.body.offer.reviewVersion).toMatch(/^entity:/);
 const body={expectedReviewVersion:get.body.offer.reviewVersion,reason:'Officially reviewed withdrawal of this reward.',...(action==='withdraw'?{evidenceUrl:'https://vendor.example/withdrawal',basis:'official'}:{reasonCode:'other'})};const result=await f.call('admin/offers/'+id+'/'+action,body,true);expect(result.status).toBe(200);
 const row=f.sqlite.prepare('SELECT review_state,withdrawn_at FROM offers WHERE id=?').get(id);if(action==='unpublish')expect(row?.review_state).toBe('rejected');else expect(row?.withdrawn_at).toBeTruthy();
 const before=f.sqlite.prepare('SELECT count(*) n FROM review_decisions').get();expect((await f.call('admin/offers/'+id+'/'+action,body,true)).status).toBe(200);expect(f.sqlite.prepare('SELECT count(*) n FROM review_decisions').get()).toEqual(before);
});
it('R04 stale pre-merge alias cards fail while a fresh alias GET provides the canonical visibility version',async()=>{
 const ids=await seedMerge(f);const old=await f.call('admin/offers/offer-1',undefined,true);const p=await mergePlan(f,ids);await new IdentityMergeService(f.db,{environment:'synthetic',enabled:true,actor:'admin'}).applyMerge(p,'merge-alias',p.planHash);
 expect((await f.call('admin/offers/offer-1/unpublish',{expectedReviewVersion:old.body.offer.reviewVersion,reason:'Old alias card should be rejected.'},true)).status).toBe(409);
 const current=await f.call('admin/offers/offer-1',undefined,true);expect(current.body.offer.id).toBe('offer-0');expect((await f.call('admin/offers/offer-1/unpublish',{expectedReviewVersion:current.body.offer.reviewVersion,reason:'Fresh canonical activity reviewed.'},true)).status).toBe(200);expect(f.sqlite.prepare("SELECT review_state FROM offers WHERE id='offer-1'").get()).toEqual({review_state:'approved'});
});
it('R04 a draft review token and the published visibility token are separate in the actual GET contract',async()=>{
 const {receipt:r,service:s}=await approved(),facts=auditTerms('visibility');facts.benefitPools[0].amount=known({value:'20',unit:'currency',currency:'USD'});const text='Campaign visibility replaces 10 USD with 20 USD.';const o=await f.observation('update',text),c=await f.candidate('update',o,text,facts,{valueText:'注册赠送 20 美元 API 额度'});await s.resolveCandidate(c.candidateId,'update');
 const view=await f.call('admin/offers/'+r.canonicalOfferId,undefined,true);expect(view.body.offer.reviewVersion).toMatch(/^identity:/);expect(view.body.offer.visibilityVersion).toMatch(/^entity:/);expect((await f.call('admin/offers/'+r.canonicalOfferId+'/unpublish',{expectedReviewVersion:view.body.offer.visibilityVersion,reason:'Remove the published activity, preserve its draft.'},true)).status).toBe(200);
});
it('R04 withdrawal retains the administrator-supplied evidence link in its decision audit',async()=>{
 const {receipt:r}=await approved(),view=await f.call('admin/offers/'+r.canonicalOfferId,undefined,true);const result=await f.call('admin/offers/'+r.canonicalOfferId+'/withdraw',{expectedReviewVersion:view.body.offer.reviewVersion,reason:'Official announcement confirms closure.',evidenceUrl:'https://vendor.example/closure',basis:'official'},true);expect(result.status).toBe(200);const row=f.sqlite.prepare('SELECT basis_json FROM review_decisions WHERE id=?').get(result.body.decisionId);expect(JSON.parse(String(row?.basis_json))).toMatchObject({evidenceUrl:'https://vendor.example/closure',basis:'official'});
});
