import { beforeEach, describe, expect, it } from 'vitest';
import worker from '../src/worker/index';
import { identityDb } from './fixtures/identity/db';

let f: ReturnType<typeof identityDb>;
beforeEach(() => {
  f = identityDb();
  f.sqlite.prepare(`INSERT INTO offers(id, platform_id, title, type, modalities, claim_method, requirements, audience, value_text, end_kind, evidence, steps) VALUES ('o1','vendor','Offer','standing','["text"]','signup','["none"]','all','free','standing',?,'[]')`).run(JSON.stringify({ url: 'https://vendor.example/a', tier: 'official', capturedAt: '2026-10-01T00:00:00.000Z', excerpts: {} }));
});

function seedLead(row: { id: number; status: string }) {
  f.sqlite.prepare(`INSERT INTO leads(id, origin, url, status) VALUES (?, 'linuxdo', ?, ?)`).run(row.id, `https://linux.do/t/x/${row.id}`, row.status);
}
function seedItem(id: string, over: { tier?: string } = {}) {
  const [kind, subject] = id.split(':');
  f.sqlite.prepare(`INSERT INTO screening_items(id, subject_kind, subject_id, state, tier, tier_by, discovered_at, due_at, updated_at) VALUES (?, ?, ?, 'awaiting_screen', ?, 'gate0', '2026-10-12T00:00:00.000Z', '2026-10-15T00:00:00.000Z', '2026-10-12T00:00:00.000Z')`).run(id, kind, subject, over.tier ?? 'P2');
}
const none = { tier: 'P3', deadline: null, signals: [], quote: null };
const dup = (matchId: string) => ({ verdict: 'duplicate_published', matchId, ruleId: null, reasonCategory: 'duplicate', occurrenceCheck: null, confidence: 1, evidenceQuote: 'Offer', explanation: '与已上架活动相同', urgency: none });
const verdictBody = (over: Record<string, unknown> = {}) => ({
  requestId: 'req-1', itemId: 'lead:7', subject: { kind: 'lead', leadId: 7, discoveredAt: '2026-10-12T00:00:00.000Z' },
  verdict: dup('offer:o1'), model: 'm', calibrated: false, promptVersion: 'screening-v1', contextHash: 'h', downgradeReasons: [], ...over,
});
async function post(path: string, body: unknown, env: { SCREENING_MODE?: string } = {}) {
  return worker.fetch(new Request(`https://local.test/api/ingest/${path}`, { method: 'POST', headers: { Authorization: 'Bearer ingest-test-token-123', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), { DB: f.db, INGEST_TOKEN: 'ingest-test-token-123', ADMIN_TOKEN: 'admin-test-token-123456', ...env } as never, {} as ExecutionContext);
}
async function get(path: string) {
  return worker.fetch(new Request(`https://local.test/api/ingest/${path}`, { headers: { Authorization: 'Bearer ingest-test-token-123' } }), { DB: f.db, INGEST_TOKEN: 'ingest-test-token-123', ADMIN_TOKEN: 'admin-test-token-123456' } as never, {} as ExecutionContext);
}

describe('screening routes', () => {
  it('records a shadow verdict without touching the lead', async () => {
    seedLead({ id: 7, status: 'new' }); seedItem('lead:7');
    const r = await post('screening/verdicts', verdictBody({ itemId: 'lead:7', verdict: dup('offer:o1') }), { SCREENING_MODE: 'shadow' });
    expect(await r.json()).toMatchObject({ mode: 'shadow', applied: false });
    expect(f.sqlite.prepare('SELECT status FROM leads WHERE id=7').get()).toEqual({ status: 'new' });
  });
  it('rejects unknown matches and dedupes requests', async () => {
    seedLead({ id: 7, status: 'new' }); seedItem('lead:7');
    expect((await post('screening/verdicts', verdictBody({ verdict: dup('offer:missing') }))).status).toBe(400);
    await post('screening/verdicts', verdictBody({ requestId: 'same' })); await post('screening/verdicts', verdictBody({ requestId: 'same' }));
    expect(f.sqlite.prepare('SELECT count(*) n FROM screening_decisions').get()).toEqual({ n: 1 });
  });
  it('orders the queue by urgency', async () => {
    seedItem('lead:1', { tier: 'P3' }); seedItem('lead:2', { tier: 'P0' });
    expect((await (await get('screening/queue?limit=2')).json() as { items: { itemId: string }[] }).items.map(i => i.itemId)).toEqual(['lead:2', 'lead:1']);
  });
});
