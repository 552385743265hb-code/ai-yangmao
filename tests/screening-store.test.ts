import { describe, expect, it } from 'vitest';
import { identityDb } from './fixtures/identity/db';
import { ScreeningStore, itemId } from '../src/worker/screening/store';

describe('screening store', () => {
  it('upserts one item per subject and records decisions idempotently', async () => {
    const f = identityDb(); const s = new ScreeningStore(f.db);
    const base = { subjectKind: 'lead', subjectId: '7', state: 'awaiting_screen', tier: 'P2', tierBy: 'gate0', discoveredAt: '2026-10-12T00:00:00.000Z', dueAt: '2026-10-13T00:00:00.000Z' } as const;
    await s.upsertItem(base); await s.upsertItem({ ...base, tier: 'P0' });
    expect(f.sqlite.prepare("SELECT count(*) n, max(tier) t FROM screening_items").get()).toEqual({ n: 1, t: 'P0' });
    const d = { requestId: 'r1', itemId: itemId('lead', 7), verdict: 'unsure', confidence: 0, evidenceQuote: 'x', explanation: 'x', urgency: { tier: 'P0', deadline: null, signals: [], quote: null }, model: 'm', calibrated: false, promptVersion: 'screening-v1', contextHash: 'h', mode: 'shadow' } as const;
    expect((await s.recordDecision(d)).duplicate).toBe(false);
    expect((await s.recordDecision(d)).duplicate).toBe(true);
  });
  it('setItemState refuses a stale revision', async () => {
    const f = identityDb(); const s = new ScreeningStore(f.db);
    const row = await s.upsertItem({ subjectKind: 'task', subjectId: 't1', state: 'awaiting_screen', tier: 'P3', tierBy: 'gate0', discoveredAt: '2026-10-12T00:00:00.000Z', dueAt: '2026-10-15T00:00:00.000Z' });
    expect(await s.setItemState(row.id, row.revision, { state: 'owner' })).toBe(true);
    expect(await s.setItemState(row.id, row.revision, { state: 'closed' })).toBe(false);
  });
});
