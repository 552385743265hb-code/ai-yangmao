/** Owner-managed origins for the Discord announcement source (followed vendor channels). */
const SOURCE_ID = 'discord-official-announcements';
const snowflake = (v: string) => /^\d{17,20}$/.test(v);
export interface DiscordPublisher { platformId: string; name: string; guildId: string; channelId: string }
export interface UnmappedOrigin { guildId: string; channelId: string; messageUrl: string; seenAt: string }

/** `https://discord.com/channels/<server>/<channel>[/<message>]` → ids, or null. */
export function parseDiscordChannelLink(value: string): { guildId: string; channelId: string } | null {
  const m = value.trim().match(/^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/channels\/(\d{17,20})\/(\d{17,20})(?:\/\d{17,20})?\/?$/);
  return m ? { guildId: m[1], channelId: m[2] } : null;
}

async function publishers(db: D1Database): Promise<DiscordPublisher[] | null> {
  const row = await db.prepare('SELECT config FROM sources WHERE id=?').bind(SOURCE_ID).first<{ config: string | null }>();
  if (!row) return null;
  return (JSON.parse(row.config ?? '{}').publishers ?? []) as DiscordPublisher[];
}

/** Origins the collector skipped in recent runs (stats.discordUnmapped) that are still unregistered. */
export async function unmappedDiscordOrigins(db: D1Database): Promise<UnmappedOrigin[]> {
  const known = new Set((await publishers(db) ?? []).map(p => `${p.guildId}/${p.channelId}`));
  const runs = await db.prepare("SELECT started_at, stats FROM runs WHERE kind IN ('collect','sweep') ORDER BY id DESC LIMIT 60").all<{ started_at: string; stats: string }>();
  const found = new Map<string, UnmappedOrigin>();
  for (const run of runs.results) {
    let urls: unknown = [];
    try { urls = JSON.parse(run.stats).discordUnmapped ?? []; } catch { continue; }
    for (const url of Array.isArray(urls) ? urls : []) {
      const ids = typeof url === 'string' ? parseDiscordChannelLink(url) : null;
      const key = ids && `${ids.guildId}/${ids.channelId}`;
      if (ids && key && !known.has(key) && !found.has(key)) found.set(key, { ...ids, messageUrl: url as string, seenAt: run.started_at });
    }
  }
  return [...found.values()];
}

export async function registerDiscordPublisher(db: D1Database, input: DiscordPublisher): Promise<{ status: 200 | 400 | 404 | 409; error?: string }> {
  if (!snowflake(input.guildId) || !snowflake(input.channelId) || !input.name.trim()) return { status: 400, error: 'Discord 服务器/频道编号或名称不正确' };
  if (!await db.prepare('SELECT 1 FROM platforms WHERE id=?').bind(input.platformId).first()) return { status: 404, error: '没有这个平台，先送交平台准入' };
  const current = await publishers(db);
  if (!current) return { status: 404, error: 'Discord 信源尚未配置' };
  if (current.some(p => p.guildId === input.guildId && p.channelId === input.channelId)) return { status: 409, error: '这个 Discord 频道已经登记' };
  const entry = JSON.stringify({ platformId: input.platformId, name: input.name.trim(), guildId: input.guildId, channelId: input.channelId });
  const r = await db.prepare("UPDATE sources SET config=json_insert(config,'$.publishers[#]',json(?)), fail_streak=0, last_error=NULL WHERE id=? AND instr(config, ?)=0")
    .bind(entry, SOURCE_ID, `"channelId":"${input.channelId}"`).run();
  return (r.meta?.changes ?? 0) > 0 ? { status: 200 } : { status: 409, error: '这个 Discord 频道已经登记' };
}
