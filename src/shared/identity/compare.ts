import { canonicalTermsSchema, evidenceContextSchema, versionedEntitySchema, type CanonicalTermsV1, type EvidenceContext, type VersionedEntity, type ResolutionResult, type Fact } from './types';
import { normalizeTerms, stableJson, withoutEvidence } from './normalize';
export const RESOLVER_VERSION = 'identity-v1';
export const RULES_VERSION = 'identity-rules-v1';
const equal = (a: unknown,b: unknown) => stableJson(withoutEvidence(a))===stableJson(withoutEvidence(b));
const knownValue = <T>(fact: Fact<T>) => fact.state==='known'?fact.value:undefined;
export function evidenceGrounded(refs: string[], evidence: EvidenceContext): boolean {
  return refs.length>0 && refs.every(ref=>!!evidence.quoteById[ref] && evidence.fullText.includes(evidence.quoteById[ref]));
}
export function factSlots(terms: CanonicalTermsV1): Map<string,Fact<unknown>> {
  const slots = new Map<string,Fact<unknown>>();
  for(const [key,value] of Object.entries(terms)) if(key!=='schemaVersion'&&key!=='benefitPools')slots.set(key,value as Fact<unknown>);
  for(const pool of terms.benefitPools) for(const [key,value] of Object.entries(pool)) if(key!=='poolKey')slots.set(`benefitPools.${pool.poolKey}.${key}`,value as Fact<unknown>);
  return slots;
}
export function compareCandidate(raw:CanonicalTermsV1,rawEntity:VersionedEntity,rawEvidence:EvidenceContext):ResolutionResult {
  const candidate=normalizeTerms(canonicalTermsSchema.parse(raw)),entity=versionedEntitySchema.parse(rawEntity),evidence=evidenceContextSchema.parse(rawEvidence);
  const result: ResolutionResult={relation:'UNRESOLVED',entityId:null,termsRelation:'INSUFFICIENT',matchingVersionId:null,evidenceRefs:[],conflicts:[],reasonCodes:[],retrievalComplete:true,resolverVersion:RESOLVER_VERSION,rulesVersion:RULES_VERSION};
  const unresolved=(reason:string)=>({...result,reasonCodes:[reason]});
  const distinct=(reason:string)=>({...result,relation:'DISTINCT' as const,reasonCodes:[reason]});
  // These gates must run before any alias, special-case or similarity comparison.
  if(evidence.differentEntityIds?.includes(entity.id))return distinct('manual_different');
  const product=knownValue(candidate.issuerProductId);
  if(product && product!==entity.platformId)return distinct('product_conflict');
  if(!entity.terms)return unresolved('missing_fact_baseline');
  const before=normalizeTerms(entity.terms);
  if(knownValue(candidate.mechanism)&&knownValue(before.mechanism)&&!equal(candidate.mechanism,before.mechanism))return unresolved('mechanism_conflict');
  const anchor=knownValue(candidate.occurrenceAnchor),oldAnchor=knownValue(before.occurrenceAnchor);
  const incomingSlots=factSlots(candidate),oldSlots=factSlots(before);
  const validSource=evidence.sourceVerified&&!evidence.truncated;
  const anchorRefs=candidate.occurrenceAnchor.state==='known'?candidate.occurrenceAnchor.evidenceRefs:[];
  const anchorGrounded=!!anchor&&validSource&&evidenceGrounded(anchorRefs,evidence)&&anchorRefs.some(ref=>evidence.quoteById[ref].includes(anchor));
  if(anchorGrounded&&oldAnchor&&anchor!==oldAnchor)return distinct('occurrence_conflict');
  const confirmed = evidence.confirmedEntityId===entity.id;
  const same = confirmed || (anchorGrounded&&!!oldAnchor&&anchor===oldAnchor);
  if(!same)return unresolved('identity_unproven');
  // Known fact states alone are insufficient if the incoming model's citations are fake.
  const incomingRefs=[...new Set([...incomingSlots.values()].flatMap(f=>f.state==='unknown'?[]:f.evidenceRefs))];
  if(!evidenceGrounded(incomingRefs,evidence))return unresolved('invalid_evidence_reference');
  let incomplete=false,added=false;
  for(const [field,old] of oldSlots) {
    const value=incomingSlots.get(field);
    if(!value || value.state==='unknown'){if(old.state!=='unknown')incomplete=true;continue;}
    if(old.state==='unknown'){added=true;continue;}
    if(!equal(old,value))result.conflicts.push({field,before:withoutEvidence(old) as never,after:withoutEvidence(value) as never,evidenceRefs:value.evidenceRefs});
  }
  for(const [field,value] of incomingSlots)if(!oldSlots.has(field)&&value.state!=='unknown')added=true;
  const poolKeys=before.benefitPools.map(p=>p.poolKey),newPoolKeys=candidate.benefitPools.map(p=>p.poolKey);
  const poolScopeChanged=poolKeys.some(key=>!newPoolKeys.includes(key))||newPoolKeys.some(key=>!poolKeys.includes(key));
  if(poolScopeChanged)return unresolved('pool_scope_unproven');
  const replacement=validSource&&result.conflicts.length>0&&result.conflicts.every(conflict=>evidenceGrounded(conflict.evidenceRefs,evidence)
    && conflict.evidenceRefs.some(ref=>/\breplac(?:e|es|ed|ing)\b|\bnow\b.{0,80}\binstead\b|改为|调整为|取代/iu.test(evidence.quoteById[ref])));
  if(result.conflicts.length&&!replacement)return unresolved('replacement_unproven');
  if(incomplete||added)return {...result,relation:'SAME',entityId:entity.id,reasonCodes:[incomplete?'partial_facts':'new_fact_evidence'],evidenceRefs:incomingRefs};
  return {...result,relation:'SAME',entityId:entity.id,termsRelation:replacement?'CHANGED':'EQUIVALENT',matchingVersionId:replacement?null:entity.approvedVersionId,evidenceRefs:incomingRefs,reasonCodes:[replacement?'official_replacement':'equivalent_facts']};
}
