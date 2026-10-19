import { describe, expect, it } from 'vitest';
import { membershipSchema, membershipFactsSchema, validateMembership, normalizeMembership, membershipFacts, formatMembership, matchMembership, migrateMemberSelections, migrateLegacyMembership, type MembershipCatalog, type MembershipRequirement, type OwnedSubscription } from '../src/shared/membership';
const meta = { aliases: [], status: 'verified' as const, sourceUrl: 'https://example.com/plans', verifiedAt: '2026-10-11', revision: 1 };
const catalog: MembershipCatalog = { revision: 1, products: [{ ...meta,id:'a',name:'Alpha' },{ ...meta,id:'b',name:'Beta' }], plans: [{ ...meta,id:'ap',productId:'a',name:'Alpha Pro',billing:'paid' },{ ...meta,id:'af',productId:'a',name:'Alpha Free',billing:'free' },{ ...meta,id:'au',productId:'a',name:'Alpha Mystery',billing:'unknown' },{ ...meta,id:'bp',productId:'b',name:'Beta Pro',billing:'paid' }] };
const req = (): MembershipRequirement => ({ schemaVersion:'membership-v1',status:'confirmed',catalogRevision:1,evidenceUrls:['https://example.com/offer'],anyOf:[{allOf:[{productId:'a',scope:'plans',planIds:['ap'],excludePlanIds:[]}]}] });
describe('membership qualification', () => {
 it('qualifies bare and misleading plan names without duplicating full product names', () => {
  const c=structuredClone(catalog); c.plans[0].name='Pro'; expect(formatMembership(req(),c)).toBe('Alpha Pro');
  c.plans[0].name='Alphabet Pro'; expect(formatMembership(req(),c)).toBe('Alpha Alphabet Pro');
  c.plans[0].name='Alpha Pro'; expect(formatMembership(req(),c)).toBe('Alpha Pro');
  c.plans[0].name='Pro (Alpha)'; expect(formatMembership(req(),c)).toBe('Pro (Alpha)');
 });
 it('enforces semantic status in identity facts without requiring evidence metadata', () => {
  expect(membershipFactsSchema.safeParse({schemaVersion:'membership-v1',status:'confirmed',anyOf:[]}).success).toBe(false);
  expect(membershipFactsSchema.safeParse({...membershipFacts(req()),status:'not_required'}).success).toBe(false);
  expect(membershipFactsSchema.safeParse(membershipFacts(req())).success).toBe(true);
 });
 it('rejects cross-product IDs, empty groups, all exclusions and stale confirmed revisions', () => {
  const r=req(); r.anyOf[0].allOf[0].excludePlanIds=['bp']; expect(validateMembership(r,catalog).length).toBeGreaterThan(0);
  r.anyOf[0].allOf[0].excludePlanIds=['ap']; expect(validateMembership(r,catalog).length).toBeGreaterThan(0);
  r.anyOf=[{allOf:[]}]; expect(membershipSchema.safeParse(r).success).toBe(false);
  const stale=req(); stale.catalogRevision=0; expect(validateMembership(stale,catalog).length).toBeGreaterThan(0);
 });
 it('rejects impossible dates and contradictory ranges', () => {
  const r=req(); r.anyOf[0].allOf[0].limits={startedBefore:'2026-02-30'}; expect(membershipSchema.safeParse(r).success).toBe(false);
  r.anyOf[0].allOf[0].limits={startedAfter:'2026-10-10',startedBefore:'2026-10-09'}; expect(membershipSchema.safeParse(r).success).toBe(false);
 });
 it('matches OR branches with exclusions local to a clause', () => {
  const r=req(); r.anyOf[0].allOf[0]={productId:'a',scope:'any_paid',planIds:[],excludePlanIds:['ap']}; r.anyOf.push({allOf:[{productId:'b',scope:'plans',planIds:['bp'],excludePlanIds:[]}]});
  expect(matchMembership(r,[{planId:'ap'},{planId:'bp'}],catalog)).toBe('yes');
 });
 it('matches AND and missing qualifiers conservatively', () => {
  const r=req(); r.anyOf[0].allOf.push({productId:'b',scope:'plans',planIds:['bp'],excludePlanIds:[]}); expect(matchMembership(r,[{planId:'ap'}],catalog)).toBe('no');
  r.anyOf[0].allOf.pop(); r.anyOf[0].allOf[0].limits={billingCycles:['annual'],trial:'exclude'};
  expect(matchMembership(r,[{planId:'ap'}],catalog)).toBe('unknown');
  expect(matchMembership(r,[{planId:'ap',billingCycle:'annual',trial:false}],catalog)).toBe('yes');
  expect(matchMembership(r,[{planId:'ap',billingCycle:'monthly'}],catalog)).toBe('no');
 });
 it('returns unknown for invalid finite subscription qualifiers from persisted client data', () => {
  const r=req(); r.anyOf[0].allOf[0].limits={billingCycles:['annual'],trial:'exclude',legacy:true};
  const stale=JSON.parse('{"planId":"ap","billingCycle":"weekly","trial":"false","legacy":"true"}') as OwnedSubscription;
  expect(matchMembership(r,[stale],catalog)).toBe('unknown');
 });
 it('never infers paid status or maps an unknown plan to a known product', () => {
  const r=req(); r.anyOf[0].allOf[0].scope='any_paid'; r.anyOf[0].allOf[0].planIds=[];
  expect(matchMembership(r,[{planId:'au'}],catalog)).toBe('unknown'); expect(matchMembership(r,[{planId:'af'}],catalog)).toBe('no'); expect(matchMembership(r,[{planId:'missing'}],catalog)).toBe('unknown');
 });
 it('canonicalizes sets and groups without mutating source or keeping evidence in facts', () => {
  const r=req(); r.anyOf[0].allOf[0].planIds=['ap','ap']; r.anyOf.push(structuredClone(r.anyOf[0])); const before=structuredClone(r);
  expect(normalizeMembership(r).anyOf).toHaveLength(1); expect(normalizeMembership(r).anyOf[0].allOf[0].planIds).toEqual(['ap']); expect(r).toEqual(before);
  const other=req(); other.evidenceUrls=['https://other.example']; other.catalogRevision=9; expect(membershipFacts(r)).toEqual(membershipFacts(other));
 });
 it('keeps unresolved legacy text and never expands bare or compound Pro', () => {
  expect(migrateMemberSelections(['Pro','Alpha Pro','Alpha Pro or Beta Pro'],catalog)).toEqual({subscriptions:[{planId:'ap'}],unresolved:['Pro','Alpha Pro or Beta Pro']});
  expect(migrateLegacyMembership(['member:Pro'],catalog)).toMatchObject({status:'needs_review',legacyText:['Pro']});
  expect(migrateLegacyMembership(['invite'],catalog).status).toBe('not_required');
  expect(migrateLegacyMembership(['member:Alpha Pro'],catalog)).toMatchObject({status:'needs_review',anyOf:[{allOf:[{planIds:['ap']}]}]});
 });
 it('uses retired plans for historical matching but rejects new confirmed references', () => {
  const c=structuredClone(catalog); c.plans[0].status='retired'; expect(matchMembership(req(),[{planId:'ap'}],c)).toBe('yes'); expect(validateMembership(req(),c).length).toBeGreaterThan(0);
 });
 it('renders product and restrictions, handles unconfirmed data and URL safety', () => {
  const r=req(); r.anyOf[0].allOf[0].limits={regions:['US'],startedBefore:'2026-10-11',legacy:true}; expect(formatMembership(r,catalog)).toContain('Alpha Pro'); expect(formatMembership(r,catalog)).toContain('US');
  r.status='needs_review'; expect(matchMembership(r,[{planId:'ap'}],catalog)).toBe('unknown');
  r.evidenceUrls=['javascript:alert(1)']; expect(membershipSchema.safeParse(r).success).toBe(false);
 });
});
it('recognizes exact qualified historical aliases after an official plan rename, without treating bare Pro as a product',()=>{
 const c=structuredClone(catalog);c.plans[0].name='Alpha Professional';c.plans[0].aliases=['Pro'];
 expect(migrateMemberSelections(['Alpha Pro','Pro'],c)).toEqual({subscriptions:[{planId:'ap'}],unresolved:['Pro']});
});
it('preserves an approved aggregate eligibility rule when a legacy Teams entry is split into concrete seats',()=>{
 const c=structuredClone(catalog) as MembershipCatalog & {planReplacements:Record<string,string[]>};
 c.plans.push({...c.plans[0],id:'as',name:'Alpha Teams Standard'},{...c.plans[0],id:'ax',name:'Alpha Teams Premium'});c.plans[0].status='retired';c.planReplacements={ap:['as','ax']};
 const r=req();
 expect(matchMembership(r,[{planId:'as'}],c)).toBe('yes');expect(matchMembership(r,[{planId:'ax'}],c)).toBe('yes');
 expect(formatMembership(r,c)).toBe('Alpha Teams Standard / Alpha Teams Premium');
 const onlyStandard=req();onlyStandard.anyOf[0].allOf[0].planIds=['as'];
 expect(matchMembership(onlyStandard,[{planId:'ap'}],c)).toBe('unknown');
 expect(matchMembership(r,[{planId:'ap'}],c)).toBe('yes');
 const excluded=req();excluded.anyOf[0].allOf[0]={productId:'a',scope:'any_paid',planIds:[],excludePlanIds:['ap']};
 expect(matchMembership(excluded,[{planId:'as'}],c)).toBe('no');
});
it('treats cyclic or broken catalog redirects as unknown rather than accepting the legacy selection',()=>{
 const c=structuredClone(catalog) as MembershipCatalog & {planReplacements:Record<string,string[]>};c.planReplacements={ap:['ap']};
 expect(matchMembership(req(),[{planId:'ap'}],c)).toBe('unknown');
 c.planReplacements={ap:['missing']};expect(matchMembership(req(),[{planId:'ap'}],c)).toBe('unknown');
});
