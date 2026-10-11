import {it,expect} from 'vitest';
import {auditFixture} from './fixtures/identity/audit';
import {displayOffer} from './fixtures/identity/offer';
import {captureLocalSnapshot,buildBackfillPlan,applyBackfillPage} from '../scripts/identity/backfill';
const context={environment:'synthetic' as const,sourceDatabaseId:'review',sourceCodeSha:'a'.repeat(40),approvedBy:'review'};
it('repro: official review of B may return approved A',async()=>{const f=auditFixture();try{
const offer=displayOffer();await f.call('ingest/offers',[offer],false,{IDENTITY_MODE:'off'});f.sqlite.exec("UPDATE offers SET review_state='approved'");
const row=f.sqlite.prepare('SELECT * FROM offers').get()!, keys=Object.keys(row);f.sqlite.prepare(`INSERT INTO offers(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>k==='id'?'other-pending':k==='review_state'?'pending':k==='value_text'?'Other benefit':row[k]));
const plan=await buildBackfillPlan(await captureLocalSnapshot(f.db,context));await applyBackfillPage(f.db,plan,{environment:'synthetic',approvedPlanHash:plan.planHash,actor:'review'});
const jobId='5edc6cc6-70f0-4a4b-925b-37b72243c52f';const version=f.sqlite.prepare("SELECT updated_at FROM offers WHERE id='other-pending'").get()!;f.sqlite.prepare("UPDATE offers SET official_review=? WHERE id='other-pending'").run(JSON.stringify({status:'checking',jobId,inputVersion:version.updated_at+'|',identityRevision:0}));
const result=await f.call('ingest/offers',[{...offer,id:'other-pending',officialReviewJobId:jobId,identityRequestId:'wrong-activity',sourceText:Object.values(offer.evidence.excerpts).join('\n')}]);
expect(JSON.stringify(result.body)).toContain('official review resolved a different activity');expect(JSON.stringify(result.body)).not.toContain('duplicate_approved');
}finally{f.sqlite.close();}});
it('repro: bounded update preview cannot apply with 99 rejected related leads',async()=>{const f=auditFixture();try{
const offer=displayOffer();await f.call('ingest/offers',[offer],false,{IDENTITY_MODE:'off'});
const insert=f.sqlite.prepare("INSERT INTO leads(origin,url,status,offer_id) VALUES('manual',?,'rejected',?)");for(let i=0;i<99;i++)insert.run('https://local.test/lead/'+i,offer.id);
f.sqlite.prepare('INSERT INTO rejected_offer_updates(offer_id,evidence,diff) VALUES(?,?,?)').run(offer.id,JSON.stringify(offer.evidence),'[]');
const env={IDENTITY_HISTORY_ENVIRONMENT:'production',IDENTITY_HISTORY_SOURCE_SHA:'a'.repeat(40),HISTORICAL_MERGE_ENABLED:'true'};
const offerPreview=await f.call('admin/identity/backfill/preview',{table:'offers',id:offer.id},true,env);expect((await f.call('admin/identity/backfill/apply',{plan:offerPreview.body,approvedPlanHash:offerPreview.body.planHash},true,env)).status).toBe(200);
const preview=await f.call('admin/identity/backfill/preview',{table:'rejected_offer_updates',id:'1'},true,env);expect(preview.status).toBe(200);
const result=await f.call('admin/identity/backfill/apply',{plan:preview.body,approvedPlanHash:preview.body.planHash},true,env);expect(result.status).toBe(200);expect(result.body.status).toBe('applied');
}finally{f.sqlite.close();}});
