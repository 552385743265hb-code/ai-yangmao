import { beforeEach, describe, expect, it } from 'vitest';
import { platformNotesFor } from '../pipeline/llm';
import type { PlatformProfile } from '../src/shared/screening/types';
import { profilesFromNotes, putProfile } from '../src/worker/screening/profiles';
import { identityDb } from './fixtures/identity/db';

let f: ReturnType<typeof identityDb>;
beforeEach(() => { f = identityDb(); });

function profile(id: string, pitfalls: string[]): PlatformProfile {
  return { platformId: id, channels: [], patterns: [], pitfalls: pitfalls.map(text => ({ text, since: null })), cadence: [], fieldEditRates: {}, quicklyExhausted: false, revision: 0 };
}
const prof = profile('vendor', ['keep']);

describe('platform profiles', () => {
  it('turns dated notes into pitfalls', () => {
    const [p] = profilesFromNotes(new Map([['zhipu', ['2026-10-08：体验卡是一张7天卡，不是7张。']]]));
    expect(p).toMatchObject({ platformId: 'zhipu', pitfalls: [{ text: '2026-10-08：体验卡是一张7天卡，不是7张。', since: '2026-10-08' }] });
  });
  it('prefers D1 profiles in extraction notes', () => {
    expect(platformNotesFor(['zhipu'], new Map([['zhipu', ['old']]]), [profile('zhipu', ['new'])])).toContain('new');
  });
  it('rejects a stale profile edit', async () => { expect(await putProfile(f.db, 'vendor', prof, 99, 'admin')).toBe(false); });
});
