export function actorKind(i: {
  reviewer?: string | null;
  actor?: string | null;
  leadRaw?: string | null;
  leadResolution?: { status?: string; reason?: string | null } | null;
  reviewerNames?: string[];
  labelActorKind?: 'owner' | 'model' | 'unknown' | null;
}): 'owner' | 'model' | 'unknown' {
  if (i.labelActorKind) return i.labelActorKind;
  const name = i.reviewer ?? i.actor ?? '';
  if (name === 'system' || name.startsWith('pipeline:') || name.startsWith('agent:')) return 'model';
  const note = `${i.leadResolution?.reason ?? ''}\n${i.leadRaw ?? ''}`;
  if ((i.leadRaw ?? '').includes('[研判]') && note.includes('模型判断不是 AI 羊毛')) return 'model';
  if (name === 'admin' || name === 'hermes' || (name && (i.reviewerNames ?? []).includes(name))) return 'owner';
  if (!i.leadResolution && !(i.leadRaw ?? '').includes('[研判]')) return 'unknown';
  return 'unknown';
}
