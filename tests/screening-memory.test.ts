import { beforeEach, describe, expect, it } from 'vitest';
import worker from '../src/worker/index';
import { identityDb } from './fixtures/identity/db';

let f: ReturnType<typeof identityDb>;
beforeEach(() => { f = identityDb(); });

function seedOffer(row: { id: string; reviewState: string; reviewMemo: string; adminNote: string }) {
  f.sqlite.prepare(`INSERT INTO offers(id, platform_id, title, type, modalities, claim_method, requirements, audience, value_text, end_kind, review_state, evidence, steps, review_memo, admin_note, tags)
    VALUES (?, 'vendor', 'Visible offer', 'standing', '["text"]', 'signup', '["none"]', 'all', 'free', 'standing', ?, ?, '[]', ?, ?, '[]')`)
    .run(row.id, row.reviewState, JSON.stringify({ url: 'https://vendor.example/perk', tier: 'official', capturedAt: '2026-10-01T00:00:00.000Z', excerpts: { benefit: 'free tokens' } }), row.reviewMemo, row.adminNote);
}
function seedReview(row: { offerId: string; action: string; reviewer: string; reasonCode: string }) {
  f.sqlite.prepare(`INSERT INTO reviews(offer_id, action, reviewer, reason_code, reason) VALUES (?, ?, ?, ?, '不是 AI')`).run(row.offerId, row.action, row.reviewer, row.reasonCode);
}
function seedLead(row: { id: number; status: string; raw: string }) {
  f.sqlite.prepare(`INSERT INTO leads(id, origin, url, status, raw) VALUES (?, 'linuxdo', ?, ?, ?)`).run(row.id, `https://linux.do/t/x/${row.id}`, row.status, row.raw);
}
async function get(path: string, token = 'ingest-test-token-123', env: Record<string, string> = {}) {
  return worker.fetch(new Request(`https://local.test/api/ingest/${path}`, { headers: { Authorization: `Bearer ${token}` } }), { DB: f.db, INGEST_TOKEN: 'ingest-test-token-123', ADMIN_TOKEN: 'admin-test-token-123456', ...env } as never, {} as ExecutionContext);
}

describe('screening memory', () => {
  it('labels actors and exposes no internal fields', async () => {
    seedOffer({ id: 'o1', reviewState: 'rejected', reviewMemo: 'internal', adminNote: 'n' });
    seedReview({ offerId: 'o1', action: 'reject', reviewer: 'admin', reasonCode: 'not_ai' });
    seedLead({ id: 2, status: 'rejected', raw: 'x\n[研判] 模型判断不是 AI 羊毛' });
    seedLead({ id: 3, status: 'rejected', raw: 'y' });
    const body = await (await get('screening/memory')).json() as { records: { ref: string; decision: string; actorKind: string; reasonCategory: string }[] };
    expect(body.records.find(r => r.ref === 'offer:o1')).toMatchObject({ decision: 'rejected', actorKind: 'owner', reasonCategory: 'non_ai' });
    expect(body.records.find(r => r.ref === 'lead:2')!.actorKind).toBe('model');
    expect(body.records.find(r => r.ref === 'lead:3')!.actorKind).toBe('unknown');
    expect(JSON.stringify(body)).not.toMatch(/reviewMemo|adminNote|internal/);
  });
  it('counts a configured reviewer name as the owner', async () => {
    seedOffer({ id: 'o2', reviewState: 'rejected', reviewMemo: '', adminNote: '' });
    seedReview({ offerId: 'o2', action: 'reject', reviewer: 'alice', reasonCode: 'other' });
    const body = await (await get('screening/memory', 'ingest-test-token-123', { REVIEWER_TOKENS: 'alice:aaaaaaaaaaaaaaaaaaaa' })).json() as { records: { ref: string; actorKind: string }[] };
    expect(body.records.find(record => record.ref === 'offer:o2')?.actorKind).toBe('owner');
  });
  it('requires the ingest token', async () => { expect((await get('screening/memory', 'wrong')).status).toBe(401); });
});
