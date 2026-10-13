import type { PlatformProfile } from '../../shared/screening/types';

type SourceRow = { platformId: string; url: string; kind: string };

function channelKind(kind: string): PlatformProfile['channels'][number]['kind'] {
  if (kind === 'rss' || kind === 'feed') return 'rss';
  if (kind === 'web_list' || kind === 'aihot') return 'announcement';
  if (kind === 'json') return 'docs';
  return 'other';
}

export function profilesFromNotes(notes: Map<string, string[]>, sources: SourceRow[] = []): PlatformProfile[] {
  return [...notes.entries()].map(([platformId, bullets]) => ({
    platformId,
    channels: sources.filter(source => source.platformId === platformId).map(source => ({ url: source.url, kind: channelKind(source.kind), approvedEvidenceCount: 0 })),
    patterns: [],
    pitfalls: bullets.map(text => ({ text, since: text.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null })),
    cadence: [],
    fieldEditRates: {},
    quicklyExhausted: false,
    revision: 0,
  }));
}

export async function putProfile(db: D1Database, platformId: string, profile: PlatformProfile, expectedRevision: number, actor: string): Promise<boolean> {
  const next = { ...profile, platformId, revision: expectedRevision + 1 };
  const json = JSON.stringify(next);
  const now = new Date().toISOString();
  const updated = await db.prepare(`UPDATE platform_profiles SET profile_json=?, revision=?, updated_at=?, updated_by=? WHERE platform_id=? AND revision=?`)
    .bind(json, next.revision, now, actor, platformId, expectedRevision).run();
  if ((updated.meta?.changes ?? 0) > 0) return true;
  if (expectedRevision !== 0) return false;
  const inserted = await db.prepare(`INSERT INTO platform_profiles(platform_id, profile_json, revision, updated_at, updated_by)
    SELECT ?, ?, 1, ?, ? WHERE NOT EXISTS (SELECT 1 FROM platform_profiles WHERE platform_id=?)`)
    .bind(platformId, json, now, actor, platformId).run();
  return (inserted.meta?.changes ?? 0) > 0;
}
