import { readFileSync } from 'node:fs';
import { parsePlatformNotes } from '../../pipeline/llm';
import { profilesFromNotes } from '../../src/worker/screening/profiles';

const notes = parsePlatformNotes(readFileSync(new URL('../../pipeline/platform-notes.md', import.meta.url), 'utf8'));
const updatedAt = new Date().toISOString();
for (const profile of profilesFromNotes(notes)) {
  const json = JSON.stringify(profile).replaceAll("'", "''");
  process.stdout.write(`INSERT OR IGNORE INTO platform_profiles(platform_id, profile_json, revision, updated_at, updated_by) VALUES ('${profile.platformId.replaceAll("'", "''")}', '${json}', 0, '${updatedAt}', 'seed-profiles');\n`);
}
