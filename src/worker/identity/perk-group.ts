import { samePerk, textSimilarity, type PerkView } from '../../shared/identity/perk-anchors';

/**
 * Group repeated reports of one perk into one review card (2026-10-16). The same perk arrives from many pages in
 * different words (OpenCode 11×, Vercel trial 9×, MiniMax Design 6× in one week), and each used to open its own card.
 * A new unresolved candidate joins an open identity card for the same vendor whose first report it matches; the card
 * shows every source and the owner still decides. Capped at 10 candidates — a claim-group rejection covers at most 10.
 */
const GROUP_MAX = 10, GROUP_WINDOW_DAYS = 21;

function view(raw: string): PerkView | null {
  try {
    const c = (JSON.parse(raw) as { candidate?: Record<string, unknown> }).candidate ?? {};
    if (typeof c.platformId !== 'string' || typeof c.title !== 'string') return null;
    return { platformId: c.platformId, title: c.title, valueText: typeof c.valueText === 'string' ? c.valueText : '', models: Array.isArray(c.models) ? c.models.filter((m): m is string => typeof m === 'string') : [], requirements: Array.isArray(c.requirements) ? c.requirements.filter((m): m is string => typeof m === 'string') : [] };
  } catch { return null; }
}

export async function findPerkGroup(db: D1Database, candidateId: string, candidateRaw: string): Promise<string | null> {
  const me = view(candidateRaw);
  if (!me) return null;
  const since = new Date(Date.now() - GROUP_WINDOW_DAYS * 86400_000).toISOString();
  const rows = await db.prepare(`SELECT t.task_key, (SELECT count(*) FROM task_candidates x WHERE x.task_id=t.id) n,
      (SELECT c.raw_candidate_json FROM task_candidates tc JOIN intake_candidates c ON c.id=tc.candidate_id WHERE tc.task_id=t.id ORDER BY c.id LIMIT 1) raw
    FROM review_tasks t WHERE t.kind='identity' AND t.entity_id IS NULL AND t.state IN ('open','checking','manual') AND t.created_at>=?
      AND t.task_key LIKE 'identity:%' AND t.task_key<>? ORDER BY t.created_at DESC LIMIT 120`).bind(since, 'identity:' + candidateId).all<{ task_key: string; n: number; raw: string | null }>();
  let best: { key: string; score: number } | null = null;
  for (const row of rows.results) {
    if (row.n >= GROUP_MAX || !row.raw) continue;
    const other = view(row.raw);
    if (!other || !samePerk(me, other)) continue;
    const score = textSimilarity(`${me.title} ${me.valueText}`, `${other.title} ${other.valueText}`);
    if (!best || score > best.score) best = { key: row.task_key, score };
  }
  return best?.key ?? null;
}
