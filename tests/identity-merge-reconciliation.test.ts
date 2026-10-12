import {beforeEach,afterEach,it,expect} from 'vitest';
import {identityDb} from './fixtures/identity/db';
import {seedMerge,mergeInput} from './fixtures/identity/merge';
import {terms,known} from './fixtures/identity/terms';
import {unknownIdentityTerms} from '../src/worker/identity/adapters';
import {buildMergePlan} from '../src/worker/identity/merge-plan';
import {IdentityMergeService} from '../src/worker/identity/merge';
import {resolveCanonicalOffer,canonicalOfferMap} from '../src/worker/identity/canonical';
import {sha256,stableJson,hashTerms} from '../src/shared/identity/normalize';
let f:ReturnType<typeof identityDb>,service:IdentityMergeService;
beforeEach(()=>{f=identityDb();service=new IdentityMergeService(f.db,{environment:'synthetic',enabled:true,actor:'admin'});});afterEach(()=>f.sqlite.close());
const history=()=>stableJson(['offers','benefit_versions','reviews','offer_revisions','identity_aliases'].map(t=>f.sqlite.prepare(`SELECT * FROM ${t} ORDER BY id`).all()));
async function setup(){
 const ids=await seedMerge(f);f.sqlite.exec("INSERT INTO platforms(id,name,type,status,site) VALUES('parent','Parent','lab','approved','https://parent.example'); UPDATE benefit_entities SET platform_id='parent' WHERE id='entity-1'; UPDATE offers SET platform_id='parent',value_text='older copy',usd_estimate=9 WHERE id='offer-1'");
 const unknown=unknownIdentityTerms();f.sqlite.prepare('UPDATE benefit_versions SET facts_json=?,terms_hash=?').run(JSON.stringify(unknown),await hashTerms(unknown));
 for(const field of ['platformId','valueText','valuation'])f.sqlite.prepare("INSERT INTO offer_revisions(offer_id,diff,author) VALUES('offer-1',?,'admin')").run(JSON.stringify([{field,from:null,to:'old'}]));
 const input=mergeInput(ids),baseline=await buildMergePlan(f.db,input),facts=terms();facts.occurrenceAnchor=known('same-campaign');
 const reconciliation={kind:'legacy_exact_versions_v1',members:baseline.groups[0].expected.map(m=>({entityId:m.entity.id,versionId:m.entity.current_approved_version_id,stateHash:m.stateHash})),productId:'vendor',facts,quotes:[{id:'quote-1',url:'https://vendor.example/campaign',quote:'vendor same-campaign grants 10 USD for signup.'}],reason:'Administrator verified these two exact versions describe the same event.',fieldChoices:{platformId:'offer-0',valueText:'offer-0',valuation:'offer-0',usdEstimate:'offer-0',usdMax:'offer-0'},retainedClaims:[]};
 return {...input,groups:[{...input.groups[0],reconciliation}]};
}
it('explicit exact-version reconciliation merges product routes without rewriting legacy rows and restores them on rollback',async()=>{
 const input=await setup(),before=history(),plan=await buildMergePlan(f.db,input);expect(plan.groups[0].status).toBe('ready');
 const receipt=await service.applyMerge(plan,'reconcile',plan.planHash);expect(receipt.status).toBe('applied');expect(history()).toBe(before);
 expect(await resolveCanonicalOffer(f.db,'offer-1')).toMatchObject({offerId:'offer-0'});expect((await canonicalOfferMap(f.db,['offer-1'])).get('offer-1')?.offerId).toBe('offer-0');
 expect((await service.applyMerge(plan,'reconcile',plan.planHash)).status).toBe('replayed');
 expect((await service.rollbackMerge(receipt.operationId!,0,'undo')).status).toBe('applied');expect(history()).toBe(before);expect(await resolveCanonicalOffer(f.db,'offer-1')).toMatchObject({offerId:'offer-1'});expect(f.sqlite.prepare("SELECT platform_id FROM benefit_entities WHERE id='entity-1'").get()).toEqual({platform_id:'parent'});
});
it('ordinary merge stays strict and omission of one protected field choice cannot be applied',async()=>{
 const input=await setup(),plain={...input,groups:input.groups.map(({reconciliation,...g})=>g)};expect((await buildMergePlan(f.db,plain)).groups[0].status).toBe('conflict');
 delete (input.groups[0].reconciliation.fieldChoices as Record<string,string>).valueText;const plan=await buildMergePlan(f.db,input);expect(plan.groups[0].status).toBe('conflict');expect((await service.applyMerge(plan,'missing-choice',plan.planHash)).status).toBe('conflict');
});
it('reconciliation cannot ignore manual different constraints',async()=>{
 const input=await setup();f.sqlite.exec("INSERT INTO identity_constraints(id,entity_a,entity_b,relation,basis_json,actor) VALUES('different','entity-0','entity-1','different','{}','admin')");
 const refreshed=await buildMergePlan(f.db,mergeInput(['entity-0','entity-1']));input.groups[0].reconciliation.members=refreshed.groups[0].expected.map(m=>({entityId:m.entity.id,versionId:m.entity.current_approved_version_id,stateHash:m.stateHash}));expect((await buildMergePlan(f.db,input)).groups[0].status).toBe('conflict');
});
it('exact plan and transaction guards reject stale field selections without a partial product correction',async()=>{
 const plan=await buildMergePlan(f.db,await setup());let changed=false;f.inject(sql=>{if(!changed&&sql.startsWith('INSERT OR IGNORE INTO identity_commands')){changed=true;f.sqlite.exec("UPDATE offers SET value_text='concurrent administrator edit' WHERE id='offer-1'");}});
 expect((await service.applyMerge(plan,'race',plan.planHash)).status).toBe('conflict');expect(changed).toBe(true);expect(f.sqlite.prepare("SELECT state,platform_id FROM benefit_entities WHERE id='entity-1'").get()).toEqual({state:'active',platform_id:'parent'});expect(f.sqlite.prepare('SELECT count(*) n FROM merge_operations').get()).toEqual({n:0});
});
it('a stale snapshot is rejected at preview',async()=>{
 const input=await setup();f.sqlite.exec("UPDATE offers SET admin_note='changed' WHERE id='offer-1'");expect((await buildMergePlan(f.db,input)).groups[0].status).toBe('conflict');
});
async function claimInput(scopeKind='claim'){
 const input=await setup();const {IdentityStore}=await import('../src/worker/identity/store'),store=new IdentityStore(f.db),text='A rejected trial proposal for this campaign.';
 const ob=await store.recordObservation({requestId:'claim-ob',originalUrl:'https://vendor.example/claim',finalUrl:'https://vendor.example/claim',text,fetchKind:'indirect',observedAt:new Date().toISOString()});
 const [candidate]=await store.recordCandidates({requestId:'claim-c',observationId:ob.observationId,extractionVersion:'test',extractionComplete:true,candidates:[{inputId:'claim',span:{start:0,end:text.length,quote:text},quotes:[{id:'q',start:0,end:text.length,quote:text}],facts:unknownIdentityTerms(),rawCandidate:{type:'trial'}}]});
 f.sqlite.prepare("INSERT INTO rejected_offer_updates(id,offer_id,evidence,diff) VALUES(14,'offer-1','{}',?)").run(JSON.stringify([{field:'type',from:'credit',to:'trial'}]));
 // The fixture offer is credit; the declined proposal is trial.
 const row=f.sqlite.prepare("SELECT type FROM offers WHERE id='offer-0'").get()!;f.sqlite.prepare('UPDATE rejected_offer_updates SET diff=? WHERE id=14').run(JSON.stringify([{field:'type',from:row.type,to:'trial'}]));
 f.sqlite.prepare("INSERT INTO review_decisions(id,entity_id,candidate_id,action,reason_code,scope_json,reopen_policy_json,rules_version,evidence_refs_json,actor,idempotency_key,basis_json) VALUES('claim-reject','entity-1',?,'reject','other',?,'{\"kind\":\"manual\",\"missingFacts\":[]}','identity-rules-v1','[]','admin','claim-reject',?)").run(candidate.candidateId,JSON.stringify(scopeKind==='claim'?{kind:'claim',candidateId:candidate.candidateId}:{kind:'entity_alias',entityId:'entity-1'}),JSON.stringify({legacyTable:'rejected_offer_updates',legacyId:14}));
 const baseline=await buildMergePlan(f.db,mergeInput(['entity-0','entity-1']));input.groups[0].reconciliation.members=baseline.groups[0].expected.map(m=>({entityId:m.entity.id,versionId:m.entity.current_approved_version_id,stateHash:m.stateHash}));
 const decision=f.sqlite.prepare("SELECT * FROM review_decisions WHERE id='claim-reject'").get(),update=f.sqlite.prepare('SELECT * FROM rejected_offer_updates WHERE id=14').get();
 (input.groups[0].reconciliation as any).retainedClaims=[{decisionId:'claim-reject',candidateId:candidate.candidateId,decisionHash:await sha256(stableJson(decision)),rejectedUpdateId:14,rejectedUpdateHash:await sha256(stableJson(update)),distinguishingFields:['type'],reason:'Keep the rejected trial proposal refused; retain the approved original type.'}];return input;
}
it('a specifically different rejected proposal remains refused and immutable across merge and rollback',async()=>{
 const input=await claimInput(),decision=f.sqlite.prepare("SELECT * FROM review_decisions WHERE id='claim-reject'").get(),update=f.sqlite.prepare('SELECT * FROM rejected_offer_updates WHERE id=14').get(),plan=await buildMergePlan(f.db,input);expect(plan.groups[0].status).toBe('ready');
 const merged=await service.applyMerge(plan,'claim-merge',plan.planHash);expect(merged.status).toBe('applied');expect(f.sqlite.prepare("SELECT * FROM review_decisions WHERE id='claim-reject'").get()).toEqual(decision);expect(f.sqlite.prepare("SELECT id FROM review_decisions WHERE supersedes_id='claim-reject'").all()).toEqual([]);expect(f.sqlite.prepare('SELECT * FROM rejected_offer_updates WHERE id=14').get()).toEqual(update);expect((await service.rollbackMerge(merged.operationId!,0,'claim-undo')).status).toBe('applied');
});
it('a broader refusal cannot be treated as a retained claim even with fresh exact hashes',async()=>{
 const input=await claimInput('entity_alias');expect((await buildMergePlan(f.db,input)).groups[0].status).toBe('conflict');
});
it('a rejected value matching the approved version cannot supply a distinguishing field',async()=>{
 const input=await claimInput();const current=f.sqlite.prepare("SELECT type FROM offers WHERE id='offer-0'").get()!;
 f.sqlite.prepare('UPDATE rejected_offer_updates SET diff=? WHERE id=14').run(JSON.stringify([{field:'type',from:'trial',to:current.type}]));
 (input.groups[0].reconciliation.retainedClaims as any)[0].rejectedUpdateHash=await sha256(stableJson(f.sqlite.prepare('SELECT * FROM rejected_offer_updates WHERE id=14').get()));
 expect((await buildMergePlan(f.db,input)).groups[0].status).toBe('conflict');
});
it('a rejection source changed inside the merge transaction rolls the whole operation back',async()=>{
 const plan=await buildMergePlan(f.db,await claimInput());let changed=false;f.inject(sql=>{if(!changed&&sql.startsWith('INSERT OR IGNORE INTO identity_commands')){changed=true;f.sqlite.exec("UPDATE rejected_offer_updates SET diff='[]' WHERE id=14");}});expect((await service.applyMerge(plan,'claim-race',plan.planHash)).status).toBe('conflict');expect(changed).toBe(true);expect(f.sqlite.prepare("SELECT state,platform_id FROM benefit_entities WHERE id='entity-1'").get()).toEqual({state:'active',platform_id:'parent'});
});

it('a known legacy fact cannot be silently replaced by an attestation',async()=>{
 const input=await setup();f.sqlite.exec("UPDATE benefit_versions SET facts_json=json_set(facts_json,'$.occurrenceAnchor',json('{\"state\":\"known\",\"value\":\"different-event\",\"evidenceRefs\":[\"quote-1\"]}')) WHERE id='version-1'");
 const baseline=await buildMergePlan(f.db,mergeInput(['entity-0','entity-1']));input.groups[0].reconciliation.members=baseline.groups[0].expected.map(m=>({entityId:m.entity.id,versionId:m.entity.current_approved_version_id,stateHash:m.stateHash}));expect((await buildMergePlan(f.db,input)).groups[0].status).toBe('conflict');
});
it('a later review or rejection-source edit prevents reconciliation rollback',async()=>{
 const plan=await buildMergePlan(f.db,await claimInput()),merged=await service.applyMerge(plan,'later-source',plan.planHash);f.sqlite.exec("UPDATE rejected_offer_updates SET diff='[]' WHERE id=14");expect((await service.rollbackMerge(merged.operationId!,0,'later-source-undo')).status).toBe('conflict');
});
it('HTTP preview/apply/rollback accepts the typed proof only as admin and old IDs resolve publicly',async()=>{
 const input=await claimInput(),{default:worker}=await import('../src/worker/index');const env={DB:f.db,ADMIN_TOKEN:'fixture-admin-token',REVIEWER_TOKENS:'reader:fixture-reviewer-token',IDENTITY_HISTORY_ENVIRONMENT:'synthetic',HISTORICAL_MERGE_ENABLED:'true'} as any;
 const post=(path:string,body:unknown,token='fixture-admin-token')=>worker.fetch(new Request('https://local.test/api/admin/identity/merges/'+path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)}),env,{} as any);
 expect((await post('preview',input,'fixture-reviewer-token')).status).toBe(403);
 const preview=await post('preview',input);expect(preview.status).toBe(200);const plan=await preview.json() as any;expect(plan.groups[0].status).toBe('ready');
 const apply=await post('apply',{plan,requestId:'http-reconcile',approvedPlanHash:plan.planHash});expect(apply.status).toBe(200);const receipt=await apply.json() as any;expect(receipt.status).toBe('applied');
 const all=await worker.fetch(new Request('https://local.test/api/offers?view=all'),env,{} as any);expect((await all.json() as any).offers).toHaveLength(1);
 const rollback=await post('rollback',{operationId:receipt.operationId,expectedRevision:0,requestId:'http-undo'});expect(rollback.status).toBe(200);expect((await rollback.json() as any).status).toBe('applied');
});
it('a platform changed after reconciliation is not silently restored into an older product context',async()=>{
 const plan=await buildMergePlan(f.db,await setup()),merged=await service.applyMerge(plan,'platform-apply',plan.planHash);f.sqlite.exec("UPDATE platforms SET name='Changed parent' WHERE id='parent'");expect((await service.rollbackMerge(merged.operationId!,0,'platform-undo')).status).toBe('conflict');
});
it('twenty exact retained claims stay inside D1 binding and per-request statement limits through rollback',async()=>{
 const input=await claimInput(),template=f.sqlite.prepare("SELECT * FROM review_decisions WHERE id='claim-reject'").get()!,update=f.sqlite.prepare('SELECT * FROM rejected_offer_updates WHERE id=14').get()!,claims=input.groups[0].reconciliation.retainedClaims as any[];
 for(let i=1;i<20;i++){
  const id=14+i,decision={...template,id:'claim-reject-'+i,idempotency_key:'claim-reject-'+i,basis_json:JSON.stringify({legacyTable:'rejected_offer_updates',legacyId:id})},row={...update,id};
  for(const [table,record] of [['review_decisions',decision],['rejected_offer_updates',row]] as const){const keys=Object.keys(record);f.sqlite.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...Object.values(record));}
  claims.push({...claims[0],decisionId:decision.id,decisionHash:await sha256(stableJson(decision)),rejectedUpdateId:id,rejectedUpdateHash:await sha256(stableJson(row))});
 }
 const baseline=await buildMergePlan(f.db,mergeInput(['entity-0','entity-1']));input.groups[0].reconciliation.members=baseline.groups[0].expected.map(m=>({entityId:m.entity.id,versionId:m.entity.current_approved_version_id,stateHash:m.stateHash}));
 const {withIdentityQueryBudget}=await import('../src/worker/identity/budget'),bounded=()=>new IdentityMergeService(withIdentityQueryBudget(f.db),{environment:'synthetic',enabled:true,actor:'admin'});
 const plan=await buildMergePlan(withIdentityQueryBudget(f.db),input);expect(plan.groups[0].status).toBe('ready');const merged=await bounded().applyMerge(plan,'twenty-claims',plan.planHash);expect(merged.status).toBe('applied');expect((await bounded().rollbackMerge(merged.operationId!,0,'twenty-undo')).status).toBe('applied');expect(f.sqlite.prepare("SELECT count(*) n FROM review_decisions WHERE action='reject'").get()).toEqual({n:20});
});
