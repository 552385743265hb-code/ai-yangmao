import {afterEach,beforeEach,expect,it} from 'vitest';
import {auditFixture} from './fixtures/identity/audit';
import {displayOffer} from './fixtures/identity/offer';
import {prepareMembershipFields,readMembershipCatalog,membershipPublicationError} from '../src/worker/membership';
import type {MembershipRequirement} from '../src/shared/membership';
let f:ReturnType<typeof auditFixture>;
beforeEach(()=>{f=auditFixture();});afterEach(()=>f.sqlite.close());
const r=():MembershipRequirement=>({schemaVersion:'membership-v1',status:'confirmed',catalogRevision:1,evidenceUrls:['https://vendor.example/offer'],anyOf:[{allOf:[{productId:'vendor-sub',scope:'plans',planIds:['vendor-pro'],excludePlanIds:[]}]}]});
const meta={aliases:[],status:'verified',sourceUrl:'https://vendor.example/plans',verifiedAt:'2026-10-11',revision:1};
function catalog(){f.sqlite.prepare('UPDATE membership_catalog SET revision=1,data_json=? WHERE id=1').run(JSON.stringify({products:[{...meta,id:'vendor-sub',name:'Vendor'}],plans:[{...meta,id:'vendor-pro',productId:'vendor-sub',name:'Vendor Pro',billing:'paid'}]}));}
it('catalog writes require authorization, create pending identities and reject concurrent stale writers',async()=>{
 const no=await f.call('admin/memberships',{kind:'product',name:'Vendor',sourceUrl:'https://vendor.example/plans',expectedCatalogRevision:0});expect(no.status).toBe(401);
 const created=await f.call('admin/memberships',{kind:'product',name:'Vendor',sourceUrl:'https://vendor.example/plans',expectedCatalogRevision:0},true);expect(created.status).toBe(201);expect(created.body.entry.status).toBe('pending');
 expect((await f.call('memberships')).body.products).toEqual([created.body.entry]);
 expect((await f.call('admin/memberships',{kind:'product',name:'Other',sourceUrl:'https://other.example',expectedCatalogRevision:0},true)).status).toBe(409);
 const verified=await f.call('admin/memberships/'+created.body.entry.id+'/verify',{kind:'product',expectedCatalogRevision:1,expectedRevision:1,acknowledgeAffectedOffers:true},true);expect(verified.status).toBe(200);
 expect((await f.call('memberships')).body.products).toHaveLength(1);
});
it('normalizes structured edits into compatible member text and rejects foreign or stale IDs',async()=>{
 catalog();const old={requirements:['realname','member:Vendor Pro'],membershipRequirement:r()};
 const fields=await prepareMembershipFields(f.db,old,{membershipRequirement:r()});expect(fields.requirements).toEqual(['realname','member:Vendor Pro']);
 const stale=r();stale.catalogRevision=0;await expect(prepareMembershipFields(f.db,old,{membershipRequirement:stale})).rejects.toMatchObject({status:409});
 const foreign=r();foreign.anyOf[0].allOf[0].planIds=['foreign'];await expect(prepareMembershipFields(f.db,old,{membershipRequirement:foreign})).rejects.toMatchObject({status:400});
});
it('legacy clients cannot erase confirmed structured requirements and unrelated edits preserve them',async()=>{
 catalog();const old={requirements:['member:Vendor Pro'],membershipRequirement:r()};
 await expect(prepareMembershipFields(f.db,old,{requirements:['member:Pro']})).rejects.toMatchObject({status:400});
 expect(await prepareMembershipFields(f.db,old,{title:'标题'})).toEqual({title:'标题'});
 expect(await prepareMembershipFields(f.db,old,{requirements:['member:Vendor Pro','realname']})).toEqual({requirements:['member:Vendor Pro','realname']});
});
it('unconfirmed legacy drafts are saveable but cannot publish',async()=>{
 catalog();const old={requirements:['member:Vendor Pro'],membershipRequirement:null};
 const fields=await prepareMembershipFields(f.db,old,{requirements:['member:Other Pro']});expect((fields.membershipRequirement as MembershipRequirement).status).toBe('needs_review');
 expect(await membershipPublicationError(f.db,{...old,...fields} as any)).toMatch(/会员/);
 expect(await membershipPublicationError(f.db,{requirements:['none'],membershipRequirement:null})).toBeNull();
});
it('member catalogs reject unsafe URLs, duplicate product names and cross product plans',async()=>{
 catalog();expect((await f.call('admin/memberships',{kind:'product',name:'Bad',sourceUrl:'javascript:alert(1)',expectedCatalogRevision:1},true)).status).toBe(400);
 expect((await f.call('admin/memberships',{kind:'product',name:'Vendor',sourceUrl:'https://vendor.example',expectedCatalogRevision:1},true)).status).toBe(409);
 expect((await f.call('admin/memberships',{kind:'plan',name:'Other Pro',productId:'missing',sourceUrl:'https://vendor.example',expectedCatalogRevision:1},true)).status).toBe(400);
});
it('membership edits and publication checks apply to ordinary admin routes',async()=>{
 catalog();await f.call('ingest/offers',[displayOffer()],false,{IDENTITY_MODE:'off'});
 const card=(await f.call('admin/offers/vendor-signup',undefined,true)).body.offer;
 const edit=await f.call('admin/offers/vendor-signup/edit',{expectedReviewVersion:card.reviewVersion,fields:{membershipRequirement:r()},approve:false},true);expect(edit.status).toBe(200);
 const after=(await f.call('admin/offers/vendor-signup',undefined,true)).body.offer;expect(after.membershipRequirement.status).toBe('confirmed');expect(after.requirements).toEqual(['member:Vendor Pro']);expect(after.reviewState).toBe('pending');
});
it('approval refuses a previously confirmed draft after the catalog revision changes',async()=>{
 catalog();await f.call('ingest/offers',[displayOffer()],false,{IDENTITY_MODE:'off'});
 const original=(await f.call('admin/offers/vendor-signup',undefined,true)).body.offer;
 await f.call('admin/offers/vendor-signup/edit',{expectedReviewVersion:original.reviewVersion,fields:{membershipRequirement:r()},approve:false},true);
 const saved=(await f.call('admin/offers/vendor-signup',undefined,true)).body.offer;
 f.sqlite.exec('UPDATE membership_catalog SET revision=2');
 const result=await f.call('admin/offers/vendor-signup/approve',{expectedReviewVersion:saved.reviewVersion},true);expect(result.status).toBe(400);expect(result.body.error).toContain('目录');
 expect(f.sqlite.prepare('SELECT review_state FROM offers').get()?.review_state).toBe('pending');
});
it('a concurrent catalog change between validation and ordinary editing prevents the write',async()=>{
 catalog();await f.call('ingest/offers',[displayOffer()],false,{IDENTITY_MODE:'off'});const original=(await f.call('admin/offers/vendor-signup',undefined,true)).body.offer;
 let injected=false;f.inject(sql=>{if(!injected&&sql.startsWith('update "offers"')){injected=true;f.sqlite.exec('UPDATE membership_catalog SET revision=2');}});
 const result=await f.call('admin/offers/vendor-signup/edit',{expectedReviewVersion:original.reviewVersion,fields:{membershipRequirement:r()},approve:false},true);expect(injected).toBe(true);expect(result.status).toBe(409);expect(f.sqlite.prepare('SELECT membership_requirement FROM offers').get()?.membership_requirement).toBeNull();
});
it('a collector omission cannot auto-publish restored manual membership requirements',async()=>{
 catalog();const o=displayOffer();o.evidence.excerpts.validity='Available during this campaign.';o.sourceId='vendor-source';o.requirements=['member:unresolved'];await f.call('ingest/offers',[o],false,{IDENTITY_MODE:'off'});
 const original=(await f.call('admin/offers/vendor-signup',undefined,true)).body.offer;const draft={...r(),status:'needs_review'};
 await f.call('admin/offers/vendor-signup/edit',{expectedReviewVersion:original.reviewVersion,fields:{membershipRequirement:draft},approve:false},true);
 f.sqlite.exec("UPDATE sources SET auto_publish=1,enabled=1");
 const next={...o,requirements:['none'],sourceText:Object.values(o.evidence.excerpts).join('\n')};
 await f.call('ingest/offers',[next],false,{IDENTITY_MODE:'off'});
 const row=f.sqlite.prepare('SELECT review_state,requirements,membership_requirement FROM offers').get();expect(row?.review_state).toBe('pending');expect(JSON.parse(String(row?.membership_requirement)).status).toBe('needs_review');
});
it('editing membership on a published legacy offer stages a proposal instead of publishing changed eligibility',async()=>{
 catalog();await f.call('ingest/offers',[displayOffer()],false,{IDENTITY_MODE:'off'});f.sqlite.exec("UPDATE offers SET review_state='approved'");
 const original=(await f.call('admin/offers/vendor-signup',undefined,true)).body.offer;
 const edit=await f.call('admin/offers/vendor-signup/edit',{expectedReviewVersion:original.reviewVersion,fields:{membershipRequirement:r()},approve:false},true);
 expect(edit.status).toBe(200);expect(edit.body.pendingUpdate).toBe(true);
 expect(JSON.parse(String(f.sqlite.prepare('SELECT requirements FROM offers').get()?.requirements))).toEqual(['none']);
 const proposal=f.sqlite.prepare('SELECT candidate FROM offer_proposals').get();expect(JSON.parse(String(proposal?.candidate)).membershipRequirement.status).toBe('confirmed');
});
