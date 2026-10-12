import { beforeEach, describe, expect, it } from 'vitest';
import worker from '../src/worker/index';
import { leadReviewVersion } from '../src/shared/lead-review';
import { identityDb } from './fixtures/identity/db';

let f: ReturnType<typeof identityDb>;
beforeEach(() => { f = identityDb(); });

function seedLead(row: { id: number; status: string }) {
  f.sqlite.prepare(`INSERT INTO leads(id, origin, url, status) VALUES (?, 'linuxdo', ?, ?)`).run(row.id, `https://linux.do/t/x/${row.id}`, row.status);
}
function v(id: number) {
  const row = f.sqlite.prepare('SELECT id, status, title, url, raw, resolution, offer_id AS offerId FROM leads WHERE id=?').get(id) as { id: number; status: string; title: string | null; url: string; raw: string | null; resolution: string | null; offerId: string | null };
  return leadReviewVersion({ ...row, createdAt: '', resolution: row.resolution ? JSON.parse(row.resolution) : null });
}
function seedOffer(id: string) {
  f.sqlite.prepare(`INSERT INTO offers(id, platform_id, title, type, modalities, claim_method, requirements, audience, value_text, end_kind, review_state, evidence, steps, tags)
    VALUES (?, 'vendor', 'Visible offer', 'standing', '["text"]', 'signup', '["none"]', 'all', 'free', 'standing', 'pending', ?, '[]', '[]')`)
    .run(id, JSON.stringify({ url: 'https://vendor.example/perk', tier: 'official', capturedAt: '2026-10-01T00:00:00.000Z', excerpts: { benefit: 'free tokens' } }));
}
function admin(path: string, body?: unknown) {
  return worker.fetch(new Request(`https://local.test/api/admin/${path}`, { method: 'POST', headers: { Authorization: 'Bearer admin-test-token-123456', 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) }), { DB: f.db, ADMIN_TOKEN: 'admin-test-token-123456', INGEST_TOKEN: 'ingest-test-token-123' } as never, {} as ExecutionContext);
}
async function rejectOffer(id: string, body: unknown) {
  return admin(`offers/${id}/reject`, body);
}

describe('owner reject categories', () => {
  it('requires a category to dismiss a lead and stores the label', async () => {
    seedLead({ id: 4, status: 'reviewing' });
    expect((await admin('leads/4/dismiss', { expectedVersion: v(4) })).status).toBe(400);
    expect((await admin('leads/4/dismiss', { expectedVersion: v(4), reasonCategory: 'relay_station', reason: '中转站' })).status).toBe(200);
    expect(f.sqlite.prepare('SELECT reason_code FROM review_decisions ORDER BY created_at DESC').get()).toEqual({ reason_code: 'other' });
    expect(f.sqlite.prepare("SELECT category, actor_kind, label_source FROM decision_labels WHERE subject_id='4'").get()).toEqual({ category: 'relay_station', actor_kind: 'owner', label_source: 'owner' });
  });
  it('maps non_ai to the legacy not_ai code on offer reject', async () => {
    seedOffer('o1');
    await rejectOffer('o1', { reasonCategory: 'non_ai' });
    expect(f.sqlite.prepare("SELECT reason_code FROM reviews WHERE offer_id='o1'").get()).toEqual({ reason_code: 'not_ai' });
    expect(f.sqlite.prepare("SELECT category FROM decision_labels WHERE subject_kind='offer' AND subject_id='o1'").get()).toEqual({ category: 'non_ai' });
  });
});
