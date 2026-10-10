import {beforeEach,afterEach,it,expect} from 'vitest';
import {identityDb} from './fixtures/identity/db';
import {seedMerge,mergePlan} from './fixtures/identity/merge';
import {IdentityMergeService} from '../src/worker/identity/merge';
import {resolveCanonicalOffer} from '../src/worker/identity/canonical';
import {buildNotice,claimNotice} from '../src/worker/admin';
import worker from '../src/worker/index';
let f:ReturnType<typeof identityDb>,service:IdentityMergeService;
beforeEach(()=>{f=identityDb();service=new IdentityMergeService(f.db,{environment:'synthetic',enabled:true,actor:'fixture-admin'});});afterEach(()=>f.sqlite.close());
const legacy=()=>JSON.stringify(['offers','reviews','offer_revisions','rejected_offer_updates','deliveries','notifications'].map(t=>f.sqlite.prepare(`SELECT * FROM ${t} ORDER BY id`).all()));
it('A35/A37 an exact approved plan changes only logical routing and replays its immutable operation',async()=>{
 const ids=await seedMerge(f,10),plan=await mergePlan(f,ids);expect(plan.groups[0].status).toBe('ready');const before=legacy();
 const first=await service.applyMerge(plan,'apply-one',plan.planHash);expect(first.status).toBe('applied');expect((await service.applyMerge(plan,'apply-one',plan.planHash)).status).toBe('replayed');expect(legacy()).toBe(before);expect(f.sqlite.prepare("SELECT count(*) n FROM benefit_entities WHERE state='active'").get()).toEqual({n:1});expect(f.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
 expect(await resolveCanonicalOffer(f.db,'offer-9')).toMatchObject({offerId:'offer-0',entityId:'entity-0',generation:1});
 const response=await worker.fetch(new Request('https://local.test/api/offers?view=all'),{DB:f.db,IDENTITY_MODE:'off'} as any,{} as any);expect((await response.json() as any).offers).toHaveLength(1);
});
it('A35 an offer changed after preview rejects the whole group with no manifest or routing changes',async()=>{
 const ids=await seedMerge(f),plan=await mergePlan(f,ids);f.sqlite.exec("UPDATE offers SET admin_note='新的人工心得' WHERE id='offer-1'");expect((await service.applyMerge(plan,'stale',plan.planHash)).status).toBe('conflict');expect(f.sqlite.prepare('SELECT count(*) n FROM merge_operations').get()).toEqual({n:0});expect(f.sqlite.prepare("SELECT count(*) n FROM benefit_entities WHERE state='merged'").get()).toEqual({n:0});
});
it('A23/A35 a write between preflight and transaction is caught by in-batch legacy state guards',async()=>{
 const ids=await seedMerge(f),plan=await mergePlan(f,ids);let changed=false;f.inject(sql=>{if(!changed&&sql.startsWith('INSERT OR IGNORE INTO identity_commands')){changed=true;f.sqlite.exec("UPDATE offers SET admin_note='并发人工编辑' WHERE id='offer-1'");}});expect((await service.applyMerge(plan,'race',plan.planHash)).status).toBe('conflict');f.inject();expect(changed).toBe(true);expect(f.sqlite.prepare('SELECT count(*) n FROM merge_operations').get()).toEqual({n:0});
});
it('A36 a plan with hard identity conflicts or the wrong approval hash cannot apply',async()=>{
 const ids=await seedMerge(f);f.sqlite.exec("INSERT INTO identity_constraints(id,entity_a,entity_b,relation,basis_json,actor) VALUES('different','entity-0','entity-1','different','{}','admin')");const plan=await mergePlan(f,ids);expect((await service.applyMerge(plan,'different',plan.planHash)).status).toBe('conflict');await expect(service.applyMerge(plan,'wrong','0'.repeat(64))).rejects.toMatchObject({status:403});
});
it('A38/A40 a sent alias announcement is inherited by facts despite different publication counters without a fabricated sent row',async()=>{
 const ids=await seedMerge(f);const payload=JSON.stringify({items:{new:[{id:'offer-1'}]},marks:[{offerId:'offer-1',stage:'new',entityId:'entity-1',versionId:'version-1',publicationRevision:2}]});f.sqlite.prepare("INSERT INTO deliveries(id,fingerprint,channel,kind,status,payload) VALUES('sent-alias','sent-alias','telegram','digest','sent',?)").run(payload);f.sqlite.exec("INSERT INTO notifications(offer_id,stage,channel,status) VALUES('offer-1','new','telegram','sent')");const plan=await mergePlan(f,ids);expect((await service.applyMerge(plan,'sent-merge',plan.planHash)).status).toBe('applied');expect((await buildNotice({DB:f.db} as any,'digest','telegram')).marks.filter(m=>m.stage==='new')).toHaveLength(0);expect(f.sqlite.prepare('SELECT payload FROM deliveries').get()).toEqual({payload});expect(f.sqlite.prepare("SELECT count(*) n FROM notifications WHERE offer_id='offer-0'").get()).toEqual({n:0});
});
for(const status of ['pending','unknown'])it('A39 an alias '+status+' delivery remains a blocker after merge',async()=>{
 const ids=await seedMerge(f);f.sqlite.prepare("INSERT INTO deliveries(id,fingerprint,channel,kind,status,payload) VALUES('blocked','blocked','telegram','digest',?,?)").run(status,JSON.stringify({items:{new:[{id:'offer-1'}]},marks:[{offerId:'offer-1',stage:'new'}]}));const plan=await mergePlan(f,ids);expect((await service.applyMerge(plan,'blocked-merge',plan.planHash)).status).toBe('applied');expect((await claimNotice({DB:f.db} as any,'digest','telegram')).deliveryId).toBeUndefined();expect(f.sqlite.prepare('SELECT status FROM deliveries WHERE id=?').get('blocked')).toEqual({status});
});
it('A30 history mutation routes deny reviewer and disabled administrator execution',async()=>{
 const env={DB:f.db,ADMIN_TOKEN:'fixture-admin-token',REVIEWER_TOKENS:'reader:fixture-reviewer-token'} as any;
 for(const token of ['fixture-reviewer-token','fixture-admin-token']){const r=await worker.fetch(new Request('https://local.test/api/admin/identity/merges/apply',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'}),env,{} as any);expect(r.status).toBe(403);}
});
it('A37 subsequent identity retrieval resolves old aliases to one active entity',async()=>{
 const ids=await seedMerge(f);f.sqlite.exec("INSERT INTO identity_aliases(id,namespace,alias_key,scope_key,entity_id,basis_json) VALUES('anchor','official_campaign','same-campaign','vendor:signup_grant','entity-1','{}')");const plan=await mergePlan(f,ids);await service.applyMerge(plan,'alias',plan.planHash);
 const {IdentityStore}=await import('../src/worker/identity/store'),store=new IdentityStore(f.db);expect(await store.lookupAlias('official_campaign','same-campaign','vendor:signup_grant')).toBe('entity-0');
 const {terms,known}=await import('./fixtures/identity/terms');const facts=terms();facts.occurrenceAnchor=known('same-campaign');expect((await store.retrieveCandidates('vendor',facts)).entities.map(e=>e.id)).toEqual(['entity-0']);
});
it('A37 equal proposal tasks become one canonical card retaining both original drafts and sources',async()=>{
 const ids=await seedMerge(f);const {terms,known}=await import('./fixtures/identity/terms');const {hashTerms}=await import('../src/shared/identity/normalize');const {displayOffer}=await import('./fixtures/identity/offer');const facts=terms();facts.occurrenceAnchor=known('same-campaign');facts.benefitPools[0].amount=known({value:'20',unit:'currency',currency:'USD'});
 for(let i=0;i<2;i++){const v='pending-'+i;f.sqlite.prepare("INSERT INTO benefit_versions(id,entity_id,terms_schema,terms_hash,facts_json,display_candidate_json,state,base_version_id) VALUES(?,?,'terms-v1',?,? ,?,'pending',?)").run(v,ids[i],await hashTerms(facts),JSON.stringify(facts),JSON.stringify({...displayOffer('20 USD'),id:'offer-'+i}),'version-'+i);f.sqlite.prepare("INSERT INTO review_tasks(id,task_key,kind,entity_id,version_id,base_version_id) VALUES(?,?,'terms_change',?,?,?)").run('task-'+i,'terms:'+i,ids[i],v,'version-'+i);f.sqlite.prepare("INSERT INTO offer_proposals(offer_id,candidate,diff,manual_fields) VALUES(?,?,'[]','[]')").run('offer-'+i,JSON.stringify(displayOffer('20 USD')));}
 const plan=await mergePlan(f,ids);expect(plan.groups[0].status).toBe('ready');expect((await service.applyMerge(plan,'tasks',plan.planHash)).status).toBe('applied');expect(f.sqlite.prepare("SELECT count(*) n FROM review_tasks WHERE state IN ('open','manual','checking')").get()).toEqual({n:1});expect(f.sqlite.prepare('SELECT count(*) n FROM offer_proposals').get()).toEqual({n:2});
 const queue=await worker.fetch(new Request('https://local.test/api/admin/queue',{headers:{Authorization:'Bearer fixture-admin-token'}}),{DB:f.db,ADMIN_TOKEN:'fixture-admin-token'} as any,{} as any);expect((await queue.json() as any).pending).toHaveLength(0);
 const {IdentityService}=await import('../src/worker/identity/service');await expect(new IdentityService(f.db).decideTask('task-1',{requestId:'old-card',expectedRevision:0,action:'approve',role:'admin',actor:'admin'})).rejects.toMatchObject({status:409});
});
it('A39 claim detects a newly pending alias delivery even if it appears after preview',async()=>{
 const ids=await seedMerge(f),plan=await mergePlan(f,ids);await service.applyMerge(plan,'merge',plan.planHash);let injected=false;f.inject(sql=>{if(!injected&&sql.includes('INSERT INTO deliveries')){injected=true;f.sqlite.prepare("INSERT INTO deliveries(id,fingerprint,channel,kind,status,payload) VALUES('racing-alias','racing-alias','telegram','digest','pending',?)").run(JSON.stringify({marks:[{offerId:'offer-1',stage:'new'}],items:{}}));}});expect((await claimNotice({DB:f.db} as any,'digest','telegram')).deliveryId).toBeUndefined();expect(injected).toBe(true);
});
it('A37 lead reads normalize old offer references and retain their original IDs',async()=>{
 const ids=await seedMerge(f);f.sqlite.prepare("UPDATE leads SET status='linked',offer_id='offer-1',resolution=? WHERE id=1").run(JSON.stringify({status:'linked',jobId:'old',attempts:0,inconclusive:0,checkedAt:'2026-01-01',nextAttemptAt:null,reason:'old association',queries:[],candidates:[],offerIds:['offer-1']}));const plan=await mergePlan(f,ids);await service.applyMerge(plan,'leads',plan.planHash);
 const response=await worker.fetch(new Request('https://local.test/api/admin/leads?status=linked',{headers:{Authorization:'Bearer fixture-admin-token'}}),{DB:f.db,ADMIN_TOKEN:'fixture-admin-token'} as any,{} as any);const lead=(await response.json() as any).leads[0];expect(lead.offerId).toBe('offer-0');expect(lead.originOfferId).toBe('offer-1');expect(lead.resolution.offerIds).toEqual(['offer-0']);expect(lead.resolution.originOfferIds).toEqual(['offer-1']);expect(f.sqlite.prepare('SELECT offer_id FROM leads WHERE id=1').get()).toEqual({offer_id:'offer-1'});
});
