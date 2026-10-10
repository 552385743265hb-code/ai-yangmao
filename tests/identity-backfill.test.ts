import {beforeEach,afterEach,it,expect} from 'vitest';
import {identityDb} from './fixtures/identity/db';
import {captureLocalSnapshot,buildBackfillPlan,applyBackfillPage} from '../scripts/identity/backfill';
import {displayOffer} from './fixtures/identity/offer';
import worker from '../src/worker/index';
let f:ReturnType<typeof identityDb>;
beforeEach(()=>{f=identityDb();});afterEach(()=>f.sqlite.close());
const context={environment:'synthetic' as const,sourceDatabaseId:'isolated-fixture',sourceCodeSha:'a'.repeat(40),approvedBy:'test-fixture'};
async function seed(){await worker.fetch(new Request('https://local.test/api/ingest/offers',{method:'POST',headers:{Authorization:'Bearer synthetic-ingest-token','Content-Type':'application/json'},body:JSON.stringify([displayOffer()])}),{DB:f.db,INGEST_TOKEN:'synthetic-ingest-token'} as any,{} as any);f.sqlite.exec("UPDATE offers SET review_state='approved'; UPDATE leads SET status='rejected',resolution='{\"reason\":\"历史模糊拒绝\"}' WHERE id=1");}
const permission=(p:any)=>({environment:'synthetic' as const,approvedPlanHash:p.planHash,actor:'test-fixture'});
it('A32 historical offers rejected leads and rejected updates backfill independently and replay without rewriting originals',async()=>{
 await seed();f.sqlite.prepare('INSERT INTO rejected_offer_updates(offer_id,evidence,diff) VALUES(?,?,?)').run('vendor-signup',JSON.stringify(displayOffer().evidence),'[]');
 const snapshot=await captureLocalSnapshot(f.db,context),before=JSON.stringify(snapshot.tables);const plan=await buildBackfillPlan(snapshot);
 expect(plan.planHash).toMatch(/^[0-9a-f]{64}$/);expect(plan.manifest.counts.offers).toBe(1);expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:0});
 await applyBackfillPage(f.db,plan,permission(plan));await applyBackfillPage(f.db,plan,permission(plan));
 expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:1});expect(f.sqlite.prepare("SELECT count(*) n FROM review_decisions WHERE action='reject'").get()).toEqual({n:2});
 expect(JSON.stringify((await captureLocalSnapshot(f.db,context)).tables)).toBe(before);expect(f.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
 const facts=JSON.parse(String(f.sqlite.prepare('SELECT facts_json FROM benefit_versions').get()?.facts_json));expect(facts.benefitPools).toEqual([]);expect(facts.mechanism.state).toBe('unknown');
});
it('A33 one hundred row pages resume a frozen snapshot and reject a cursor for another snapshot',async()=>{
 await seed();const row=f.sqlite.prepare('SELECT * FROM offers').get()!,keys=Object.keys(row);for(let i=0;i<104;i++)f.sqlite.prepare(`INSERT INTO offers(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>k==='id'?'fixture-'+String(i).padStart(3,'0'):row[k]));
 const snapshot=await captureLocalSnapshot(f.db,context);const first=await buildBackfillPlan(snapshot);expect(first.items).toHaveLength(100);await applyBackfillPage(f.db,first,permission(first));
 const second=await buildBackfillPlan(snapshot,first.nextCursor);let interrupted=false;f.inject(sql=>{if(!interrupted&&sql.startsWith('INSERT INTO \"intake_candidates\"')){interrupted=true;throw new Error('row 101 interrupted');}});await expect(applyBackfillPage(f.db,second,permission(second))).rejects.toThrow('row 101');f.inject();expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:100});await applyBackfillPage(f.db,second,permission(second));await applyBackfillPage(f.db,second,permission(second));expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:105});
 const other=await captureLocalSnapshot(f.db,{...context,sourceDatabaseId:'other'});await expect(buildBackfillPlan(other,first.nextCursor)).rejects.toThrow(/snapshot/);
});
it('A32 dry-run requires explicit nonproduction input and apply rejects a changed legacy row',async()=>{
 await expect(captureLocalSnapshot(f.db,{...context,environment:'production'} as any)).rejects.toThrow();await seed();const plan=await buildBackfillPlan(await captureLocalSnapshot(f.db,context));f.sqlite.exec("UPDATE offers SET admin_note='新的人工心得'");await expect(applyBackfillPage(f.db,plan,permission(plan))).rejects.toThrow(/changed|conflict/);expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_entities').get()).toEqual({n:0});
});
it('A32 a preserved legacy proposal has a candidate and an actionable versioned review task',async()=>{
 await seed();f.sqlite.prepare('INSERT INTO offer_proposals(offer_id,candidate,diff,manual_fields) VALUES(?,?,?,?)').run('vendor-signup',JSON.stringify({...displayOffer(),valueText:'人工待审 20 美元'}),'[{"field":"valueText","from":"10","to":"20"}]','["valueText"]');
 const plan=await buildBackfillPlan(await captureLocalSnapshot(f.db,context));await applyBackfillPage(f.db,plan,permission(plan));
 expect(f.sqlite.prepare('SELECT count(*) n FROM review_tasks t JOIN task_candidates tc ON tc.task_id=t.id WHERE t.task_key LIKE ?').get('legacy-proposal:%')).toEqual({n:1});
 expect(f.sqlite.prepare('SELECT manual_fields FROM offer_proposals').get()).toEqual({manual_fields:'["valueText"]'});
});
