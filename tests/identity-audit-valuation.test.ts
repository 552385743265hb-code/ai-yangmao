import {beforeEach,afterEach,it,expect} from 'vitest';
import {auditFixture,auditTerms} from './fixtures/identity/audit';
import {known} from './fixtures/identity/terms';
import {displayOffer} from './fixtures/identity/offer';
import {IdentityService} from '../src/worker/identity/service';
import type {Valuation} from '../src/shared/valuation';
let f:ReturnType<typeof auditFixture>,service:IdentityService;
beforeEach(()=>{f=auditFixture();service=new IdentityService(f.db);});afterEach(()=>f.sqlite.close());
const value=(amount:number|null,max=false):Valuation=>({version:'v1',status:amount===null?'unpriceable':'priced',method:amount===null?'none':'face_value',period:max?'apply_max':'one_time',usdEstimate:max?null:amount,usdMax:max?amount:null,fullValue:amount,formula:amount===null?null:'Official face value '+amount,inputs:{},sources:[{url:'https://vendor.example/pricing',checkedAt:'2026-10-10',excerpt:'Official benefit amount.',priceBasis:'发放方明确金额'}],assumptions:[],reviewedAt:'2026-10-10'});
async function setup(max=false,initial=false){
 const facts=auditTerms('valuation');const text='Campaign valuation grants 10 USD.';const o=await f.observation('original',text),c=await f.candidate('original',o,text,facts,max?{type:'apply',endKind:'standing',usdEstimate:null,usdMax:10,valuation:value(10,true)}:{usdEstimate:10,valuation:value(10)}),a=await service.resolveCandidate(c.candidateId,'original');if(initial)return {a,b:a};
 const manual=max?{usdEstimate:null,usdMax:10,valuation:value(10,true)}:{usdEstimate:10,usdMax:null,valuation:value(10)};
 const baseline=await f.call('admin/offers/'+a.canonicalOfferId+'/edit',{requestId:'seed-human-baseline',identityTaskId:a.taskId,expectedIdentityRevision:0,fields:manual},true);expect(baseline.status).toBe(200);
 await service.decideTask(a.taskId!,{requestId:'approve-original',expectedRevision:baseline.body.revision,action:'approve',actor:'admin',role:'admin'});
 facts.benefitPools[0].amount=known({value:'20',unit:'currency',currency:'USD'});const changed='Campaign valuation replaces 10 USD with 20 USD.';const n=await f.observation('change',changed),d=await f.candidate('change',n,changed,facts,{valueText:'注册赠送 20 美元 API 额度',...(max?{type:'apply',endKind:'standing',usdEstimate:null,usdMax:999,valuation:value(999,true)}:{usdEstimate:999,valuation:value(999)})}),b=await service.resolveCandidate(d.candidateId,'change');return {a,b};
}
for(const mode of ['amount','unknown','application'] as const)it(`R08 approved_proposal_keeps_manual_valuation ${mode}`,async()=>{
 const max=mode==='application',amount=mode==='unknown'?null:20,{a,b}=await setup(max),valuation=value(amount,max),fields={usdEstimate:valuation.usdEstimate,usdMax:valuation.usdMax,valuation};
 const edit=await f.call('admin/offers/'+a.canonicalOfferId+'/edit',{requestId:'manual-price',identityTaskId:b.taskId,expectedIdentityRevision:0,fields},true);expect(edit.status).toBe(200);
 expect(f.sqlite.prepare('SELECT usd_estimate,usd_max FROM offers').get()).toEqual({usd_estimate:max?null:10,usd_max:max?10:null});
 const proposal=f.sqlite.prepare('SELECT manual_fields FROM offer_proposals').get()!;expect(JSON.parse(String(proposal.manual_fields))).toEqual(expect.arrayContaining(['usdEstimate','usdMax','valuation']));
 const approve=await f.call('admin/identity/tasks/'+b.taskId+'/resolve',{requestId:'approve-price',expectedRevision:edit.body.revision,action:'approve'},true);expect(approve.status,JSON.stringify(approve.body)).toBe(200);
 const read=await f.call('admin/offers/'+a.canonicalOfferId,undefined,true);expect(read.body.offer).toMatchObject(fields);expect(f.sqlite.prepare("SELECT count(*) n FROM offer_revisions WHERE author='admin'").get()).toEqual({n:2});
});
it('R08 model valuation without human edit remains protected at approval',async()=>{const {a,b}=await setup();await service.decideTask(b.taskId!,{requestId:'approve-model-price',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});const read=await f.call('admin/offers/'+a.canonicalOfferId,undefined,true);expect(read.body.offer).toMatchObject({usdEstimate:10,valuation:value(10)});});
it('R08 initial pending offer keeps validated manual valuation',async()=>{const {a,b}=await setup(false,true);const fields={usdEstimate:20,usdMax:null,valuation:value(20)};const edit=await f.call('admin/offers/'+a.canonicalOfferId+'/edit',{requestId:'initial-price',identityTaskId:b.taskId,expectedIdentityRevision:0,fields},true);expect(edit.status).toBe(200);await service.decideTask(b.taskId!,{requestId:'approve-initial-price',expectedRevision:edit.body.revision,action:'approve',actor:'admin',role:'admin'});expect((await f.call('admin/offers/'+a.canonicalOfferId,undefined,true)).body.offer).toMatchObject(fields);});
it('R08 inconsistent manual valuation is rejected without changing the proposal',async()=>{const {a,b}=await setup();const before=f.sqlite.prepare('SELECT * FROM offer_proposals').get();const edit=await f.call('admin/offers/'+a.canonicalOfferId+'/edit',{requestId:'invalid-price',identityTaskId:b.taskId,expectedIdentityRevision:0,fields:{usdEstimate:20,valuation:value(999)}},true);expect(edit.status).toBe(400);expect(f.sqlite.prepare('SELECT * FROM offer_proposals').get()).toEqual(before);});
it('R08 initial approval rejects a scalar valuation without evidence metadata and keeps the draft pending',async()=>{
 const {a}=await setup(false,true);
 const edit=await f.call('admin/offers/'+a.canonicalOfferId+'/edit',{requestId:'bare-price',identityTaskId:a.taskId,expectedIdentityRevision:0,fields:{usdEstimate:20,usdMax:null,valuation:null}},true);
 expect(edit.status).toBe(200);
 const approve=await f.call('admin/identity/tasks/'+a.taskId+'/resolve',{requestId:'approve-bare-price',expectedRevision:edit.body.revision,action:'approve'},true);
 expect(approve.status).toBe(400);expect(approve.body.error).toContain('估值依据');
 expect(f.sqlite.prepare('SELECT review_state FROM offers').get()).toEqual({review_state:'pending'});
});
it('R08 direct live identity edit cannot remove valuation evidence while retaining dollars',async()=>{
 const {a}=await setup(false,true);
 const seeded=await f.call('admin/offers/'+a.canonicalOfferId+'/edit',{requestId:'live-price',identityTaskId:a.taskId,expectedIdentityRevision:0,fields:{usdEstimate:10,usdMax:null,valuation:value(10)}},true);
 expect(seeded.status).toBe(200);
 await service.decideTask(a.taskId!,{requestId:'approve-live',expectedRevision:seeded.body.revision,action:'approve',actor:'admin',role:'admin'});
 const before=f.sqlite.prepare('SELECT * FROM offers').get();
 const card=(await f.call('admin/offers/'+a.canonicalOfferId,undefined,true)).body.offer;
 const edit=await f.call('admin/offers/'+a.canonicalOfferId+'/edit',{requestId:'strip-live-price',expectedReviewVersion:card.reviewVersion,fields:{valuation:null,usdEstimate:999}},true);
 expect(edit.status).toBe(400);expect(f.sqlite.prepare('SELECT * FROM offers').get()).toEqual(before);
});

it('R08 legacy admin approval cannot publish dollars without valuation metadata',async()=>{
 const offer=displayOffer();
 expect((await f.call('ingest/offers',[offer],false,{IDENTITY_MODE:'off'})).status).toBe(200);
 f.sqlite.prepare('UPDATE offers SET usd_estimate=20,usd_max=NULL,valuation=NULL WHERE id=?').run(offer.id);
 const approve=await f.call('admin/offers/'+offer.id+'/approve',{},true);
 expect(approve.status).toBe(400);expect(approve.body.error).toContain('估值依据');
 expect(f.sqlite.prepare('SELECT review_state FROM offers').get()).toEqual({review_state:'pending'});
});
it('R08 legacy direct live edit cannot strip valuation metadata without approval',async()=>{
 const offer=displayOffer();
 expect((await f.call('ingest/offers',[offer],false,{IDENTITY_MODE:'off'})).status).toBe(200);
 f.sqlite.prepare("UPDATE offers SET review_state='approved',usd_estimate=10,usd_max=NULL,valuation=? WHERE id=?").run(JSON.stringify(value(10)),offer.id);
 const before=f.sqlite.prepare('SELECT * FROM offers').get();
 const edit=await f.call('admin/offers/'+offer.id+'/edit',{approve:false,fields:{usdEstimate:999,valuation:null}},true);
 expect(edit.status).toBe(400);expect(edit.body.error).toContain('估值依据');
 expect(f.sqlite.prepare('SELECT * FROM offers').get()).toEqual(before);
});
