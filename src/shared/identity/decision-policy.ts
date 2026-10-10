import { reviewDecisionSchema,canonicalTermsSchema,evidenceContextSchema,type ReviewDecision,type CanonicalTermsV1,type EvidenceContext,type ReopenEvaluation } from './types';
import { evidenceGrounded,factSlots } from './compare';
import { sha256,stableJson,withoutEvidence,normalizeTerms } from './normalize';
interface DecisionSubject {entityId:string|null;candidateId:string;versionId:string|null;observationId:string}
export function decisionApplies(raw:ReviewDecision,terms:CanonicalTermsV1,subject:DecisionSubject):boolean {
 const d=reviewDecisionSchema.parse(raw);canonicalTermsSchema.parse(terms);
 if(d.action!=='reject')return false;
 const scope=d.scope;
 switch(scope.kind) {
  case 'observation_only':return scope.observationId===subject.observationId&&(!d.candidateId||d.candidateId===subject.candidateId);
  case 'claim':return scope.candidateId===subject.candidateId;
  case 'exact_version':return scope.entityId===subject.entityId&&scope.versionId===subject.versionId;
  case 'entity_alias':return scope.entityId===subject.entityId;
  case 'occurrence':return terms.issuerProductId.state==='known'&&terms.issuerProductId.value===scope.productId&&terms.occurrenceAnchor.state==='known'&&terms.occurrenceAnchor.value===scope.anchor;
  case 'scoped_mechanism':{
   const productMatches=terms.issuerProductId.state==='known'&&terms.issuerProductId.value===scope.productId&&terms.mechanism.state==='known'&&terms.mechanism.value===scope.mechanism;
   if(!productMatches)return false;
   if(d.reasonCode==='paid_bundle')return terms.costs.state==='known'&&terms.costs.value.subscriptionRequired;
   // A mechanism label alone does not establish a discount or absence of AI.
   if(d.reasonCode==='ordinary_discount')return false;
   if(d.reasonCode==='not_ai')return terms.benefitPools.length>0&&terms.benefitPools.every(p=>p.models.state==='not_applicable'&&p.modalities.state==='not_applicable');
   return true;
  }
 }
}
export async function evaluateReopen(raw:ReviewDecision,incoming:CanonicalTermsV1,rawEvidence:EvidenceContext):Promise<ReopenEvaluation> {
 const d=reviewDecisionSchema.parse(raw),terms=normalizeTerms(incoming),evidence=evidenceContextSchema.parse(rawEvidence);
 const denied=(reason:string):ReopenEvaluation=>({allowed:false,reasonCodes:[reason],basisHash:null});
 if(d.action!=='reject')return denied('not_a_refusal');
 if(!evidence.sourceVerified||evidence.truncated)return denied('trusted_complete_evidence_required');
 if(d.reopenPolicy.kind==='missing_facts'&&['insufficient_evidence','vague'].includes(d.reasonCode)) {
  const slots=factSlots(terms),missing=[...new Set(d.reopenPolicy.missingFacts)].sort();
  if(!missing.length)return denied('missing_slots_unspecified');
  const basis=[];
  for(const key of missing) {
    const fact=slots.get(key);
    if(!fact||fact.state!=='known'||!evidenceGrounded(fact.evidenceRefs,evidence))return denied('missing_fact_not_proven');
    basis.push({field:key,fact:withoutEvidence(fact),quotes:[...new Set(fact.evidenceRefs.map(ref=>evidence.quoteById[ref].replace(/\s+/gu,' ').trim()))].sort()});
  }
  const basisHash=await sha256(stableJson(basis));
  if(d.reopenPolicy.reviewedBasisHashes?.includes(basisHash))return denied('basis_already_reviewed');
  return {allowed:true,reasonCodes:['missing_facts_supplied'],basisHash};
 }
 if(d.reopenPolicy.kind==='new_occurrence'&&d.reasonCode==='expired'&&d.scope.kind==='occurrence') {
  const anchor=terms.occurrenceAnchor,product=terms.issuerProductId;
  if(product.state!=='known'||product.value!==d.scope.productId||anchor.state!=='known'||anchor.value===d.scope.anchor||!evidenceGrounded(anchor.evidenceRefs,evidence)||!anchor.evidenceRefs.some(ref=>evidence.quoteById[ref].includes(anchor.value)))return denied('new_occurrence_not_proven');
  return {allowed:true,reasonCodes:['independent_occurrence'],basisHash:await sha256(stableJson({product:product.value,anchor:anchor.value,quotes:anchor.evidenceRefs.map(ref=>evidence.quoteById[ref])}))};
 }
 return denied('explicit_admin_reopen_required');
}
export type ReviewTaskKeyInput =
 | {kind:'initial';entityId:string}
 | {kind:'terms_change';entityId:string;baseVersionId:string;versionId:string}
 | {kind:'evidence_reopen';entityId:string;refusalDecisionId:string;basisHash:string}
 | {kind:'identity';clusterId:string}
 | {kind:'merge_conflict';planHash:string};
export function reviewTaskKey(input:ReviewTaskKeyInput):string {
 switch(input.kind) {
  case 'initial':return `initial:${input.entityId}`;
  case 'terms_change':return `terms:${input.entityId}:${input.baseVersionId}:${input.versionId}`;
  case 'evidence_reopen':return `evidence:${input.entityId}:${input.refusalDecisionId}:${input.basisHash}`;
  case 'identity':return `identity:${input.clusterId}`;
  case 'merge_conflict':return `merge:${input.planHash}`;
 }
}
