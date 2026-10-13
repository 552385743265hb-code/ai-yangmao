import { beforeEach, afterEach, it, expect } from 'vitest';
import worker from '../src/worker/index';
import { identityDb } from './fixtures/identity/db';
import { parseDiscordChannelLink } from '../src/worker/discord-publishers';

let f: ReturnType<typeof identityDb>;
const env = () => ({ DB: f.db, ADMIN_TOKEN: 'admin-test-token-123', INGEST_TOKEN: 'ingest-test-token-123' });
const admin = (path: string, body?: unknown) => worker.fetch(new Request(`https://local.test/api/admin/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: 'Bearer admin-test-token-123', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }), env() as never, {} as never);
const higgs = 'https://discord.com/channels/1173418785630330921/1313602726311104542/1427000000000000001';
beforeEach(() => {
  f = identityDb();
  f.sqlite.exec(`INSERT INTO sources(id,platform_id,kind,url,tier,config,fail_streak) VALUES('discord-official-announcements','vendor','discord','https://discord.com/channels/1558646769938735136/1558646770689384560','official','${JSON.stringify({ publishers: [{ platformId: 'vendor', name: 'Vendor', guildId: '662267976984297473', channelId: '952771221915840552' }] })}',16)`);
  f.sqlite.prepare("INSERT INTO runs(kind,started_at,stats) VALUES('sweep','2026-10-13T00:00:00Z',?)").run(JSON.stringify({ discordUnmapped: [higgs] }));
});
afterEach(() => f.sqlite.close());

it('parses channel and message links', () => {
  expect(parseDiscordChannelLink(higgs)).toEqual({ guildId: '1173418785630330921', channelId: '1313602726311104542' });
  expect(parseDiscordChannelLink('https://example.com/channels/1/2')).toBeNull();
});
it('lists skipped origins until they are registered, then refuses duplicates', async () => {
  expect((await (await admin('discord/unmapped')).json() as { origins: unknown[] }).origins).toEqual([expect.objectContaining({ guildId: '1173418785630330921', messageUrl: higgs })]);
  expect((await admin('discord/publishers', { platformId: 'vendor', name: 'Higgsfield AI #announcements', link: higgs })).status).toBe(200);
  expect((await (await admin('discord/unmapped')).json() as { origins: unknown[] }).origins).toEqual([]);
  expect(f.sqlite.prepare("SELECT fail_streak FROM sources WHERE id='discord-official-announcements'").get()).toEqual({ fail_streak: 0 });
  expect((await admin('discord/publishers', { platformId: 'vendor', name: 'again', link: higgs })).status).toBe(409);
});
it('rejects bad links and unknown platforms', async () => {
  expect((await admin('discord/publishers', { platformId: 'vendor', name: 'x', link: 'https://example.com' })).status).toBe(400);
  expect((await admin('discord/publishers', { platformId: 'nope', name: 'x', link: higgs })).status).toBe(404);
});
