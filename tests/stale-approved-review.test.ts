import {it,expect} from 'vitest';
import {auditFixture} from './fixtures/identity/audit';
import {displayOffer} from './fixtures/identity/offer';
import {captureLocalSnapshot,buildBackfillPlan,applyBackfillPage} from '../scripts/identity/backfill';

it('a previously approved offer with an old quote mismatch keeps its approval without a verification task',async()=>{
 const f=auditFixture();try{
  const offer=displayOffer();
  expect((await f.call('ingest/offers',[offer],false,{IDENTITY_MODE:'off'})).status).toBe(200);
  expect((await f.call('admin/offers/'+offer.id+'/approve',{},true)).status).toBe(200);
  f.sqlite.prepare("UPDATE offers SET verify_result='evidence_missing' WHERE id=?").run(offer.id);
  const queue=(await f.call('admin/queue',undefined,true)).body;
  expect(queue.pending.some((item:any)=>item.id===offer.id)).toBe(false);
  expect(queue.needsVerification).toEqual([]);
  expect((await f.call('offers/'+offer.id)).body.offer).toMatchObject({reviewState:'approved',status:'active'});
 }finally{f.sqlite.close();}
});
it('a managed approved offer can stage an optional corrected quote while keeping its approved baseline',async()=>{
 const f=auditFixture();try{
  const offer=displayOffer();await f.call('ingest/offers',[offer],false,{IDENTITY_MODE:'off'});
  expect((await f.call('admin/offers/'+offer.id+'/approve',{},true)).status).toBe(200);
  const plan=await buildBackfillPlan(await captureLocalSnapshot(f.db,{environment:'synthetic',sourceDatabaseId:'stale-review',sourceCodeSha:'a'.repeat(40),approvedBy:'test'}));
  await applyBackfillPage(f.db,plan,{environment:'synthetic',approvedPlanHash:plan.planHash,actor:'test'});
  f.sqlite.prepare("UPDATE offers SET verify_result='evidence_missing' WHERE id=?").run(offer.id);
  const before=(await f.call('admin/offers/'+offer.id,undefined,true)).body.offer;
  expect(before.reviewVersion).toMatch(/^entity:/);
  const corrected={...offer.evidence,excerpts:{...offer.evidence.excerpts,benefit:'Current official page confirms the same 10 USD signup grant.'}};
  const staged=await f.call('admin/offers/'+offer.id+'/edit',{fields:{evidence:corrected},approve:false,expectedReviewVersion:before.reviewVersion,reason:'官方页面改写原句，保留已批准的权益条件'},true);
  expect(staged.status,JSON.stringify(staged.body)).toBe(200);expect(staged.body.pendingUpdate).toBe(true);
  const after=(await f.call('admin/queue',undefined,true)).body;
  expect(after.pending.some((item:any)=>item.id===offer.id&&item.pendingUpdate)).toBe(true);
  expect(after.needsVerification.some((item:any)=>item.id===offer.id)).toBe(false);
  const publicOffer=(await f.call('offers/'+offer.id)).body.offer;
  expect(publicOffer.reviewState).toBe('approved');expect(publicOffer.evidence.excerpts.benefit).toBe(offer.evidence.excerpts.benefit);
 }finally{f.sqlite.close();}
});
