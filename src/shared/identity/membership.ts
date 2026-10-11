import {membershipFacts,membershipSchema,type MembershipRequirement} from '../membership';
import {canonicalTermsSchema,type CanonicalTermsV1,type CanonicalTermsV2} from './types';
import {normalizeTerms,stableJson,withoutEvidence} from './normalize';

/** Explicit reviewed conversion; never mutates the historical V1 snapshot. */
export function withMembershipFacts(terms:CanonicalTermsV1,requirement:MembershipRequirement,evidenceRefs:string[]):CanonicalTermsV2 {
 const requirementValue=membershipSchema.parse(requirement);
 const eligibility=terms.eligibility.state==='known'?{...terms.eligibility,value:{...terms.eligibility.value,requirements:terms.eligibility.value.requirements.filter(r=>!r.startsWith('member:'))}}:terms.eligibility;
 return canonicalTermsSchema.parse({...terms,schemaVersion:'terms-v2',eligibility,membership:requirementValue.status==='needs_review'?{state:'unknown'}:{state:'known',value:membershipFacts(requirementValue),evidenceRefs}}) as CanonicalTermsV2;
}
export function membershipFactConsistent(terms:CanonicalTermsV1,requirement:MembershipRequirement|null|undefined):boolean {
 if(terms.schemaVersion==='terms-v1')return !requirement||requirement.status==='needs_review';
 if(!requirement)return terms.membership.state==='unknown';
 if(requirement.status==='needs_review')return terms.membership.state==='unknown';
 if(terms.membership.state!=='known')return false;
 const expected=withMembershipFacts(terms,requirement,terms.membership.evidenceRefs);
 return stableJson(withoutEvidence(normalizeTerms(expected)))===stableJson(withoutEvidence(normalizeTerms(terms)));
}
