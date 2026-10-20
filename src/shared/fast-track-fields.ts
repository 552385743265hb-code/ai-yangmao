/** Fast-track listing fields: shared by the Worker (publish gate) and the pipeline (paid fallback decision). */
import {membershipSchema,type MembershipRequirement} from './membership';
import {semanticFieldIssues,type SemanticContext} from './fast-track-semantics';
import { collectedOfferIn, normalizeRequirements } from './ingest';

export const BASIC_FIELDS = ['title', 'type', 'claimMethod', 'valueText', 'modalities', 'requirements', 'endKind'] as const;
export type FastTrackFields = Record<string, unknown>;

/** Owner-entered values win; the owner's benefit line is the listing's benefit text; the model fills the rest. */
export function mergeFastTrackFields(extracted: FastTrackFields, owner: FastTrackFields, benefit: string, platformName?: string): FastTrackFields {
  const fields: FastTrackFields = { ...extracted };
  for (const [key, value] of Object.entries(owner)) if (key !== 'membershipSelectionOnly' && value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length)) fields[key] = value;
  // Checkbox input chooses identities only. The model remains responsible for source restrictions.
  if (owner.membershipSelectionOnly === true && owner.membershipRequirement) {
    const selected = membershipSchema.safeParse(owner.membershipRequirement);
    const modeled = membershipSchema.safeParse(extracted.membershipRequirement);
    if(selected.success && selected.data.status==='not_required'){
      // Clearing checkboxes delegates eligibility to the model; it is not a full-rule override.
      fields.membershipRequirement=modeled.success&&['confirmed','not_required'].includes(modeled.data.status)
        ? modeled.data : {...selected.data,status:'needs_review'};
    } else if (selected.success && ['confirmed','needs_review'].includes(selected.data.status)) {
      const choices = (r: MembershipRequirement) => {
        const clauses = r.anyOf.flatMap(g => g.allOf);
        if (!clauses.length || clauses.some(c => c.scope !== 'plans' || !c.planIds.length || c.excludePlanIds.length)) return null;
        return JSON.stringify([...new Set(clauses.flatMap(c => c.planIds.map(id => JSON.stringify([c.productId,id]))))].sort());
      };
      const picked = choices(selected.data);
      fields.membershipRequirement = modeled.success && modeled.data.status === 'confirmed' && picked !== null && choices(modeled.data) === picked
        ? {...modeled.data,catalogRevision:selected.data.catalogRevision}
        : {...selected.data,status:'needs_review'};
    }
  }
  delete fields.membershipSelectionOnly;
  // A bare `member` used to fail the listing schema with no field for the owner to fix (Higgsfield Wan 3.0, 2026-10-16/17).
  if (fields.requirements !== undefined) fields.requirements = normalizeRequirements(fields.requirements, platformName);
  fields.valueText = typeof owner.valueText === 'string' && owner.valueText.trim() ? owner.valueText : benefit;
  if (owner.claimEnd) fields.endKind = 'date';
  // Models often call an open-ended preview “standing”; only standing/apply offers may be (owner choices are kept).
  const recurring = fields.type === 'standing' || fields.type === 'apply';
  if (!owner.endKind && !owner.claimEnd && recurring !== (fields.endKind === 'standing')) fields.endKind = recurring ? 'standing' : 'unknown';
  if (typeof fields.sourceTz === 'string') {
    const offset = /^(?:UTC|GMT)\s*([+-])(\d{1,2})(?::00)?$/i.exec(fields.sourceTz.trim());
    if (offset && Number(offset[2]) <= 14) fields.sourceTz = Number(offset[2]) === 0 ? 'UTC' : `Etc/GMT${offset[1] === '+' ? '-' : '+'}${Number(offset[2])}`;
  }
  if (!fields.sourceTz) fields.sourceTz = owner.claimEnd || owner.claimStart ? 'Asia/Shanghai' : 'UTC';
  return fields;
}

/**
 * Both model and owner may supply a structured membership; a bare member: label is incomplete.
 * Pipeline and Worker share this check so model fallback can fill the catalog selection.
 */
export function missingOwnerChoices(fields: FastTrackFields): string[] {
  const member = Array.isArray(fields.requirements) && fields.requirements.some(r => typeof r === 'string' && r.startsWith('member:'));
  const picked = (fields.membershipRequirement as { status?: unknown } | undefined)?.status;
  return (member || picked === 'needs_review') && picked !== 'confirmed' && picked !== 'not_required' ? ['membershipRequirement'] : [];
}

export function missingBasicFields(fields: FastTrackFields): string[] {
  const missing: string[] = BASIC_FIELDS.filter(key => {
    const value = fields[key];
    if (key === 'requirements') return !Array.isArray(value) || !value.length || value.includes('unknown');
    if (key === 'modalities') return !Array.isArray(value) || !value.length;
    return typeof value !== 'string' || value.trim().length < (key === 'title' ? 2 : 1);
  });
  if (fields.endKind === 'date' && !fields.claimEnd) missing.push('claimEnd');
  return missing;
}

/** The model fallback must see the same schema failures as the publishing endpoint. */
export function fastTrackFieldIssues(fields: FastTrackFields, context?: SemanticContext): string[] {
  const basic = missingBasicFields(fields);
  // Valuation inputs are optional extras: publish drops malformed ones and lists unvalued, so they never block here.
  const { valuationFactors: _factors, valuationSources: _sources, sourceFetch: _proof, ...listing } = fields;
  const parsed = collectedOfferIn.safeParse({
    ...listing, id: 'fast-track-preflight', platformId: context?.platformId ?? 'preflight',
    valueText: String(fields.valueText ?? '').slice(0, 200),
    evidence: {url:'https://example.com/',tier:'official',capturedAt:'2026-01-01T00:00:00Z',excerpts:{benefit:'Administrator authorized benefit'}},
  });
  if (Array.isArray(fields.requirements) && fields.requirements.includes('pay:金额未写明')) basic.push('requirements: 请依据原文明确是否必须先充值及充值条件，不得把按量计费当作充值门槛');
  return [...new Set([...(context ? semanticFieldIssues(fields,context) : []), ...basic, ...missingOwnerChoices(fields), ...(!parsed.success ? parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) : [])])];
}
