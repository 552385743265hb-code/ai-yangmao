import {expect,it} from 'vitest';
import {terms,known} from './fixtures/identity/terms';
import {hashTerms,sha256,stableJson,withoutEvidence,normalizeTerms} from '../src/shared/identity/normalize';
import {compareCandidate} from '../src/shared/identity/compare';
import {canonicalTermsSchema,type CanonicalTermsV1} from '../src/shared/identity/types';
const item=(productId:string)=>({productId,scope:'plans' as const,planIds:[productId+'-pro'],excludePlanIds:[]});
const membership=(anyOf=[{allOf:[item('claude')]}])=>({schemaVersion:'membership-v1' as const,status:'confirmed' as const,anyOf});
const v2=():CanonicalTermsV1=>({...terms(),schemaVersion:'terms-v2',membership:known(membership()),eligibility:known({audience:'all',requirements:[]}),occurrenceAnchor:known('signup-2026')});
const context={observationId:'obs',fullText:'Campaign signup-2026 grants 10 USD.',truncated:false,sourceVerified:true,quoteById:{'quote-1':'Campaign signup-2026 grants 10 USD.'}};
const compare=(a:CanonicalTermsV1,b:CanonicalTermsV1)=>compareCandidate(a,{id:'entity',platformId:'vendor',revision:1,publicationRevision:1,approvedVersionId:'version',terms:b},context);
it('preserves the historical v1 hash algorithm and accepts both schemas',async()=>{
 const legacy=terms();expect(canonicalTermsSchema.parse(legacy).schemaVersion).toBe('terms-v1');
 expect(await hashTerms(legacy)).toBe(await sha256('terms-v1\n'+stableJson(withoutEvidence(normalizeTerms(legacy)))));
 expect(canonicalTermsSchema.parse(v2()).schemaVersion).toBe('terms-v2');
});
it('canonicalizes AND and OR order while real membership changes alter hash',async()=>{
 const a=v2(),b=v2();if(a.schemaVersion!=='terms-v2'||b.schemaVersion!=='terms-v2')throw Error();
 a.membership=known(membership([{allOf:[item('claude'),item('cursor')]},{allOf:[item('grok')]}]));
 b.membership=known(membership([{allOf:[item('grok')]},{allOf:[item('cursor'),item('claude')]}]),['different-evidence']);
 expect(await hashTerms(a)).toBe(await hashTerms(b));
 b.membership=known(membership([{allOf:[item('claude')]},{allOf:[item('cursor')]}]));
 expect(await hashTerms(a)).not.toBe(await hashTerms(b));
});
it('does not equate an unconvertible v1 member string with v2 by identity or hash',()=>{
 const old={...terms(),eligibility:known({audience:'all' as const,requirements:['member:Pro']}),occurrenceAnchor:known('signup-2026')};
 expect(compare(v2(),old).termsRelation).toBe('INSUFFICIENT');
});
it('compares explicit no-members v2 with known member-free v1 semantically',()=>{
 const old={...terms(),eligibility:known({audience:'all' as const,requirements:[]}),occurrenceAnchor:known('signup-2026')};
 const next=v2();if(next.schemaVersion!=='terms-v2')throw Error();next.membership=known({schemaVersion:'membership-v1',status:'not_required',anyOf:[]});
 expect(compare(next,old).termsRelation).toBe('EQUIVALENT');
});
it('unknown membership never proves equivalence',()=>{
 const a=v2(),b=v2();if(a.schemaVersion!=='terms-v2'||b.schemaVersion!=='terms-v2')throw Error();a.membership={state:'unknown'};b.membership={state:'unknown'};
 expect(compare(a,b).termsRelation).toBe('INSUFFICIENT');
});

import {identityDb} from './fixtures/identity/db';
import {IdentityStore} from '../src/worker/identity/store';
import {IdentityService} from '../src/worker/identity/service';
import {displayOffer} from './fixtures/identity/offer';
import {withMembershipFacts} from '../src/shared/identity/membership';
const noMembers={schemaVersion:'membership-v1' as const,status:'not_required' as const,catalogRevision:0,anyOf:[],evidenceUrls:[]};
async function setupIdentity(){
 const f=identityDb(),store=new IdentityStore(f.db),service=new IdentityService(f.db);
 const old={...terms(),eligibility:known({audience:'all' as const,requirements:[]}),occurrenceAnchor:known('signup-2026')};
 const intake=async(id:string,facts:CanonicalTermsV1,display:unknown=displayOffer())=>{
  const text=context.fullText,observation=await store.recordObservation({requestId:id,originalUrl:'https://vendor.example/'+id,finalUrl:'https://vendor.example/'+id,text,sourceId:'vendor-source',fetchKind:'direct',observedAt:'2026-10-10T10:00:00.000Z'});
  const [receipt]=await store.recordCandidates({requestId:'batch-'+id,observationId:observation.observationId,extractionVersion:'test',extractionComplete:true,candidates:[{inputId:id,span:{start:0,end:text.length,quote:text},quotes:[{id:'quote-1',start:0,end:text.length,quote:text}],facts,rawCandidate:display}]});
  return service.resolveCandidate(receipt.candidateId,'resolve-'+id);
 };
 return {...f,service,intake,old};
}
it('reuses an equivalent approved v1 baseline when v2 no-members evidence arrives',async()=>{
 const f=await setupIdentity();try {
  const initial=await f.intake('v1',f.old);await f.service.decideTask(initial.taskId!,{requestId:'approve',expectedRevision:0,action:'approve',actor:'admin',role:'admin'});
  const before=f.sqlite.prepare('SELECT facts_json,terms_hash FROM benefit_versions WHERE id=?').get(initial.versionId);
  const receipt=await f.intake('v2',withMembershipFacts(f.old,noMembers,['quote-1']),{...displayOffer(),membershipRequirement:noMembers});
  expect(receipt.outcome).toBe('duplicate_approved');expect(receipt.versionId).toBe(initial.versionId);
  expect(f.sqlite.prepare('SELECT facts_json,terms_hash FROM benefit_versions WHERE id=?').get(initial.versionId)).toEqual(before);
 }finally{f.sqlite.close();}
});
it('equivalent no-members conversion cannot evade a historical exact-version refusal',async()=>{
 const f=await setupIdentity();try {
  const initial=await f.intake('v1-reject',f.old);await f.service.decideTask(initial.taskId!,{requestId:'reject',expectedRevision:0,action:'reject',actor:'admin',role:'admin',reasonCode:'other'});
  const receipt=await f.intake('v2-reject',withMembershipFacts(f.old,noMembers,['quote-1']),{...displayOffer(),membershipRequirement:noMembers});
  expect(receipt.outcome).toBe('duplicate_rejected');expect(receipt.versionId).toBe(initial.versionId);
 }finally{f.sqlite.close();}
});
it('a structured membership edit preserves historical v1 facts and saves a v2 draft',async()=>{
 const f=await setupIdentity();try {
  const initial=await f.intake('edit-v1',f.old);const before=f.sqlite.prepare('SELECT facts_json,terms_hash FROM benefit_versions WHERE id=?').get(initial.versionId);
  await f.service.editManagedOffer(initial.canonicalOfferId!,{requestId:'select-membership',taskId:initial.taskId!,expectedTaskRevision:0,fields:{membershipRequirement:noMembers},actor:'admin'});
  expect(f.sqlite.prepare('SELECT facts_json,terms_hash FROM benefit_versions WHERE id=?').get(initial.versionId)).toEqual(before);
  const draft=f.sqlite.prepare('SELECT v.terms_schema,v.facts_json FROM review_tasks t JOIN benefit_versions v ON v.id=t.version_id WHERE t.id=?').get(initial.taskId);
  expect(draft?.terms_schema).toBe('terms-v2');expect(JSON.parse(String(draft?.facts_json)).membership.value.status).toBe('not_required');
 }finally{f.sqlite.close();}
});
it('keeps immutable exact-version refusal after an explicit V1 to V2 mapping',async()=>{
 const f=await setupIdentity();try {
  const initial=await f.intake('mapped-v1',f.old);await f.service.decideTask(initial.taskId!,{requestId:'reject-map',expectedRevision:0,action:'reject',actor:'admin',role:'admin',reasonCode:'other'});
  const next=withMembershipFacts(f.old,noMembers,['quote-1']);
  f.sqlite.prepare("INSERT INTO benefit_versions(id,entity_id,terms_schema,terms_hash,facts_json,display_candidate_json,state,created_at) VALUES(?,?,'terms-v2',?,?,?,'rejected','2099-01-01')").run('mapped-v2',initial.entityId,await hashTerms(next),JSON.stringify(next),JSON.stringify({...displayOffer(),membershipRequirement:noMembers}));
  f.sqlite.prepare('INSERT INTO membership_version_migrations(old_version_id,new_version_id,offer_id) VALUES(?,?,?)').run(initial.versionId,'mapped-v2',initial.canonicalOfferId);
  const receipt=await f.intake('mapped-repeat',next,{...displayOffer(),membershipRequirement:noMembers});
  expect(receipt.outcome).toBe('duplicate_rejected');expect(receipt.versionId).toBe('mapped-v2');
 }finally{f.sqlite.close();}
});
it('metadata-only membership edits do not create another fact version',async()=>{
 const f=await setupIdentity();try {
  const initial=await f.intake('cosmetic',withMembershipFacts(f.old,noMembers,['quote-1']),{...displayOffer(),membershipRequirement:noMembers});
  const before=f.sqlite.prepare('SELECT terms_hash,facts_json FROM benefit_versions').get();
  const result=await f.service.editManagedOffer(initial.canonicalOfferId!,{requestId:'cosmetic-membership',taskId:initial.taskId!,expectedTaskRevision:0,fields:{membershipRequirement:{...noMembers,evidenceUrls:['https://vendor.example/other-source']}},actor:'admin'});
  expect(result.revision).toBe(1);expect(f.sqlite.prepare('SELECT terms_hash,facts_json FROM benefit_versions').all()).toEqual([before]);
  expect(f.sqlite.prepare('SELECT count(*) n FROM identity_events').get()).toEqual({n:1});
 }finally{f.sqlite.close();}
});
it('native intake rejects selected membership and V2 fact disagreement',async()=>{
 const f=await setupIdentity();try {
  await expect(f.intake('conflict',withMembershipFacts(f.old,noMembers,['quote-1']),displayOffer())).rejects.toMatchObject({status:400});
 }finally{f.sqlite.close();}
});
it('grandfathered unresolved membership remains visible through an unrelated title edit without a new event',async()=>{
 const f=await setupIdentity();try {
  const unresolved={...noMembers,status:'needs_review' as const,legacyText:['Pro']};
  const initial=await f.intake('grandfathered',f.old,{...displayOffer(),requirements:['member:Pro'],membershipRequirement:unresolved});
  // Existing pre-migration publication is preserved; this is not a new approval.
  f.sqlite.prepare("UPDATE offers SET review_state='approved' WHERE id=?").run(initial.canonicalOfferId);
  f.sqlite.prepare("UPDATE benefit_versions SET state='approved' WHERE id=?").run(initial.versionId);
  f.sqlite.prepare('UPDATE benefit_entities SET current_approved_version_id=? WHERE id=?').run(initial.versionId,initial.entityId);
  f.sqlite.prepare("UPDATE review_tasks SET state='resolved' WHERE id=?").run(initial.taskId);
  const before=f.sqlite.prepare('SELECT updated_at FROM offers').get();
  await f.service.editManagedOffer(initial.canonicalOfferId!,{requestId:'grandfather-title',expectedOfferVersion:String(before?.updated_at),fields:{title:'更清楚的标题'},actor:'admin'});
  expect(f.sqlite.prepare('SELECT review_state,title,membership_requirement FROM offers').get()).toEqual({review_state:'approved',title:'更清楚的标题',membership_requirement:JSON.stringify(unresolved)});
  expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_versions').get()).toEqual({n:1});
  expect(f.sqlite.prepare('SELECT count(*) n FROM identity_events').get()).toEqual({n:1});
 }finally{f.sqlite.close();}
});
it('approves a date-only correction to a published legacy member offer without confirming its member mapping',async()=>{
 const f=await setupIdentity();try {
  const unresolved={...noMembers,status:'needs_review' as const,legacyText:['Pro']};
  const initial=await f.intake('grandfathered-date',f.old,{...displayOffer(),claimStart:'2026-10-10',requirements:['member:Pro'],membershipRequirement:unresolved});
  f.sqlite.prepare("UPDATE offers SET review_state='approved' WHERE id=?").run(initial.canonicalOfferId);
  f.sqlite.prepare("UPDATE benefit_versions SET state='approved' WHERE id=?").run(initial.versionId);
  f.sqlite.prepare('UPDATE benefit_entities SET current_approved_version_id=? WHERE id=?').run(initial.versionId,initial.entityId);
  f.sqlite.prepare("UPDATE review_tasks SET state='resolved' WHERE id=?").run(initial.taskId);
  const before=f.sqlite.prepare('SELECT updated_at FROM offers').get();
  const edit=await f.service.editManagedOffer(initial.canonicalOfferId!,{requestId:'correct-grandfathered-date',expectedOfferVersion:String(before?.updated_at),fields:{claimEnd:'2026-10-10',endKind:'date'},actor:'admin'});
  expect(edit.taskId).toBeTruthy();
  f.sqlite.prepare('UPDATE membership_catalog SET revision=revision+1 WHERE id=1').run();
  await f.service.decideTask(edit.taskId!,{requestId:'approve-grandfathered-date',expectedRevision:edit.revision,action:'approve',actor:'admin',role:'admin'});
  expect(f.sqlite.prepare('SELECT review_state,claim_start,claim_end,end_kind,membership_requirement FROM offers WHERE id=?').get(initial.canonicalOfferId)).toEqual({
   review_state:'approved',claim_start:'2026-10-10',claim_end:'2026-10-10',end_kind:'date',membership_requirement:JSON.stringify(unresolved),
  });
 }finally{f.sqlite.close();}
});
it('still blocks approval when a published legacy offer changes its member condition',async()=>{
 const f=await setupIdentity();try {
  const unresolved={...noMembers,status:'needs_review' as const,legacyText:['Pro']};
  const initial=await f.intake('grandfathered-member-change',f.old,{...displayOffer(),requirements:['member:Pro'],membershipRequirement:unresolved});
  f.sqlite.prepare("UPDATE offers SET review_state='approved' WHERE id=?").run(initial.canonicalOfferId);
  f.sqlite.prepare("UPDATE benefit_versions SET state='approved' WHERE id=?").run(initial.versionId);
  f.sqlite.prepare('UPDATE benefit_entities SET current_approved_version_id=? WHERE id=?').run(initial.versionId,initial.entityId);
  f.sqlite.prepare("UPDATE review_tasks SET state='resolved' WHERE id=?").run(initial.taskId);
  const before=f.sqlite.prepare('SELECT updated_at FROM offers').get();
  await f.service.editManagedOffer(initial.canonicalOfferId!,{requestId:'change-grandfathered-member',expectedOfferVersion:String(before?.updated_at),fields:{requirements:['member:Plus']},actor:'admin'});
  const task=f.sqlite.prepare("SELECT id,revision FROM review_tasks WHERE state IN ('open','manual') LIMIT 1").get();
  expect(task).toBeTruthy();
  await expect(f.service.decideTask(String(task?.id),{requestId:'approve-member-change',expectedRevision:Number(task?.revision),action:'approve',actor:'admin',role:'admin'})).rejects.toMatchObject({status:400});
  expect(f.sqlite.prepare('SELECT review_state,requirements FROM offers WHERE id=?').get(initial.canonicalOfferId)).toEqual({review_state:'approved',requirements:JSON.stringify(['member:Pro'])});
 }finally{f.sqlite.close();}
});
it('V2 hashes ignore generated legacy membership labels',async()=>{
 const a=v2(),b=v2();b.eligibility=known({audience:'all',requirements:['member:改名后的标准套餐']});
 expect(await hashTerms(a)).toBe(await hashTerms(b));
});
it('approval aborts atomically if membership catalog changes after publication validation',async()=>{
 const f=await setupIdentity();try {
  const initial=await f.intake('approve-catalog-race',withMembershipFacts(f.old,noMembers,['quote-1']),{...displayOffer(),membershipRequirement:noMembers});
  let changed=false;
  f.inject(sql=>{
   // decideTask reads this block revision only after publicationError returns.
   if(!changed&&sql.startsWith('SELECT revision FROM identity_blocks WHERE block_key=')){
    changed=true;f.sqlite.prepare('UPDATE membership_catalog SET revision=revision+1 WHERE id=1').run();
   }
  });
  await expect(f.service.decideTask(initial.taskId!,{requestId:'approve-catalog-race',expectedRevision:0,action:'approve',actor:'admin',role:'admin'})).rejects.toMatchObject({status:409});
  expect(changed).toBe(true);
  expect(f.sqlite.prepare('SELECT review_state FROM offers WHERE id=?').get(initial.canonicalOfferId)).toEqual({review_state:'pending'});
  expect(f.sqlite.prepare('SELECT publication_revision,current_approved_version_id FROM benefit_entities WHERE id=?').get(initial.entityId)).toEqual({publication_revision:0,current_approved_version_id:null});
  expect(f.sqlite.prepare("SELECT count(*) n FROM review_decisions WHERE action='approve'").get()).toEqual({n:0});
  expect(f.sqlite.prepare("SELECT count(*) n FROM identity_events WHERE kind='new'").get()).toEqual({n:0});
 }finally{f.sqlite.close();}
});
