/** Fast-track listing fields: shared by the Worker (publish gate) and the pipeline (paid fallback decision). */
export const BASIC_FIELDS = ['title', 'type', 'claimMethod', 'valueText', 'modalities', 'requirements', 'endKind'] as const;
export type FastTrackFields = Record<string, unknown>;

/** Owner-entered values win; the owner's benefit line is the listing's benefit text; the model fills the rest. */
export function mergeFastTrackFields(extracted: FastTrackFields, owner: FastTrackFields, benefit: string): FastTrackFields {
  const fields: FastTrackFields = { ...extracted };
  for (const [key, value] of Object.entries(owner)) if (value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length)) fields[key] = value;
  fields.valueText = typeof owner.valueText === 'string' && owner.valueText.trim() ? owner.valueText : benefit;
  if (owner.claimEnd) fields.endKind = 'date';
  // Models often call an open-ended preview “standing”; only standing/apply offers may be (owner choices are kept).
  const recurring = fields.type === 'standing' || fields.type === 'apply';
  if (!owner.endKind && !owner.claimEnd && recurring !== (fields.endKind === 'standing')) fields.endKind = recurring ? 'standing' : 'unknown';
  if (!fields.sourceTz) fields.sourceTz = owner.claimEnd || owner.claimStart ? 'Asia/Shanghai' : 'UTC';
  return fields;
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
