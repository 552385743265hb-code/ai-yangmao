import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import worker from '../src/worker/index';
import { offerIn } from '../src/shared/ingest';
import { liveStatus } from '../src/shared/lifecycle';

let sqlite: DatabaseSync;
let env: Parameters<typeof worker.fetch>[1];

function d1(memory: DatabaseSync) {
  return {
    prepare(sql: string) {
      let args: unknown[] = [];
      return {
        bind(...values: unknown[]) { args = values; return this; },
        async raw() { const statement = memory.prepare(sql); statement.setReturnArrays(true); return statement.all(...args as []); },
        async all() { return { results: memory.prepare(sql).all(...args as []) }; },
        async first() { return memory.prepare(sql).get(...args as []) ?? null; },
        async run() { return { meta: memory.prepare(sql).run(...args as []), success: true }; },
      };
    },
  } as unknown as D1Database;
}

async function call(path: string, body?: unknown, kind: 'ingest' | 'admin' = 'ingest') {
  const response = await worker.fetch(new Request(`https://local.test/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer audit-${kind}-token-long-enough`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), env, {} as ExecutionContext);
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  for (const name of readdirSync(new URL('../migrations/', import.meta.url)).filter(name => /^\d+_.+\.sql$/.test(name)).sort()) {
    sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  }
  env = { DB: d1(sqlite), INGEST_TOKEN: 'audit-ingest-token-long-enough', ADMIN_TOKEN: 'audit-admin-token-long-enough' } as typeof env;
  sqlite.prepare("INSERT INTO platforms (id,name,type,status) VALUES ('vendor','Vendor','lab','approved')").run();
  sqlite.prepare("INSERT INTO sources (id,platform_id,kind,url,tier) VALUES ('source','vendor','web_list','https://vendor.example/free','docs')").run();
});
afterEach(() => sqlite.close());

const evidence = {
  url: 'https://vendor.example/free', tier: 'docs', capturedAt: '2026-09-30T00:00:00Z',
  excerpts: { benefit: 'Free 100 tokens', eligibility: 'All users', claim: 'Sign up', validity: 'No published end date' },
};
const offer = {
  id: 'vendor-free', platformId: 'vendor', sourceId: 'source', title: 'Vendor free tokens', type: 'new',
  modalities: ['text'], claimMethod: 'signup', requirements: ['none'], audience: 'all', valueText: '100 tokens',
  claimStart: null, claimEnd: null, endKind: 'unknown', sourceTz: 'UTC', evidence,
};

describe('official evidence verification', () => {
  it('refreshes an unchanged offer only when its saved quotations still appear', async () => {
    expect((await call('ingest/offers', [offer])).status).toBe(200);
    sqlite.prepare("UPDATE offers SET review_state='approved',last_verified_at='2026-09-27T00:00:00Z' WHERE id='vendor-free'").run();
    await call('ingest/snapshots', { sourceId: 'source', url: evidence.url, ok: true, hash: 'unchanged' });
    const before = sqlite.prepare("SELECT last_verified_at FROM offers WHERE id='vendor-free'").get() as { last_verified_at: string };
    expect(before.last_verified_at).toBe('2026-09-27T00:00:00Z');
    const queue = await call('ingest/verification-queue');
    expect((queue.body.offers as { id: string }[]).map(row => row.id)).toContain('vendor-free');

    const verified = await call('ingest/verify', { offerId: 'vendor-free', url: evidence.url, text: Object.values(evidence.excerpts).join('\n') });
    expect(verified.body.verified).toBe(true);
    const after = sqlite.prepare("SELECT last_verified_at FROM offers WHERE id='vendor-free'").get() as { last_verified_at: string };
    expect(Date.parse(after.last_verified_at)).toBeGreaterThan(Date.parse(before.last_verified_at));
    expect((await call('ingest/verification-queue')).body.offers).toEqual([]);

    const missing = await call('ingest/verify', { offerId: 'vendor-free', url: evidence.url, text: 'Offer removed' });
    expect(missing.body.verified).toBe(false);
    expect((sqlite.prepare("SELECT last_verified_at FROM offers WHERE id='vendor-free'").get() as { last_verified_at: string }).last_verified_at).toBe(after.last_verified_at);
  });

  it('rejects nonexistent calendar dates and honours withdrawal for permanent offers', () => {
    expect(offerIn.safeParse({ ...offer, claimEnd: '2026-02-30', endKind: 'date' }).success).toBe(false);
    expect(liveStatus({ type: 'standing', claimStart: null, claimEnd: null, endKind: 'standing', sourceTz: 'UTC', lastVerifiedAt: '2026-09-30T00:00:00Z', withdrawnAt: '2026-09-30T01:00:00Z' }, new Date('2026-09-30T02:00:00Z'))).toBe('ended');
  });

  it('removes an offer when current official evidence disappears and records a confirmed withdrawal', async () => {
    await call('ingest/offers', [offer]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    const missing = await call('ingest/verify', { offerId: 'vendor-free', url: evidence.url, text: 'The benefit has been discontinued.' });
    expect(missing.body.verified).toBe(false);
    expect((await call('offers?view=claimable')).body.count).toBe(0);
    expect((await call('admin/notify?kind=digest', undefined, 'admin')).body).toMatchObject({ needsVerificationCount: 1, empty: false });
    expect((await call('admin/queue', undefined, 'admin')).body.needsVerification).toHaveLength(1);
    const withdrawn = await call('admin/offers/vendor-free/withdraw', { reason: 'The vendor ended its free allowance', evidenceUrl: 'https://vendor.example/withdrawal' }, 'admin');
    expect(withdrawn.body.status).toBe('ended');
    expect((await call('admin/queue', undefined, 'admin')).body.needsVerification).toHaveLength(0);
    const status = sqlite.prepare("SELECT withdrawn_at, withdrawn_reason FROM offers WHERE id='vendor-free'").get() as { withdrawn_at: string; withdrawn_reason: string };
    expect(status.withdrawn_at).toBeTruthy();
    expect(status.withdrawn_reason).toContain('ended');
  });
});

describe('review gates and preserved public version', () => {
  it('管理员实测：社区转述的条目改成“管理员实测”即可通过；采集管线不能自称管理员实测', async () => {
    await call('ingest/offers', [{ ...offer, evidence: { ...evidence, url: 'https://forum.example/t/1', tier: 'media' } }]);
    expect((await call('admin/offers/vendor-free/approve', {}, 'admin')).status).toBe(400);
    const edited = await call('admin/offers/vendor-free/edit', { fields: { evidence: { ...evidence, url: 'https://forum.example/t/1', tier: 'tested' } }, approve: true, reason: '我亲自领到了' }, 'admin');
    expect(edited.status, JSON.stringify(edited.body)).toBe(200);
    expect((await call('ingest/verification-queue')).body.offers).toEqual([]);
    const piped = await call('ingest/offers', [{ ...offer, id: 'vendor-other', evidence: { ...evidence, tier: 'tested' } }]);
    expect(JSON.stringify(piped.body)).toContain('只能在后台人工设置');
  });

  it('管理员人工核对后可以填写模型读不到的有效期（如公众号图片里的），不被原文摘录门槛挡住', async () => {
    await call('ingest/offers', [{ ...offer, evidence: { ...evidence, excerpts: { benefit: evidence.excerpts.benefit } } }]);
    const edited = await call('admin/offers/vendor-free/edit', { fields: { creditValidity: '1 个月', audience: 'old' }, approve: true, reason: '有效期在公众号图片里' }, 'admin');
    expect(edited.status, JSON.stringify(edited.body)).toBe(200);
    expect(sqlite.prepare("SELECT review_state, credit_validity FROM offers WHERE id='vendor-free'").get()).toEqual({ review_state: 'approved', credit_validity: '1 个月' });
  });

  it('blocks unapproved platforms and media-only proof, then permits corrected official proof', async () => {
    sqlite.prepare("UPDATE platforms SET status='pending' WHERE id='vendor'").run();
    await call('ingest/offers', [{ ...offer, evidence: { ...evidence, tier: 'media', excerpts: {} } }]);
    expect((await call('admin/offers/vendor-free/approve', {}, 'admin')).status).toBe(400);
    await call('admin/platforms/vendor/approve', {}, 'admin');
    expect((await call('admin/offers/vendor-free/approve', {}, 'admin')).status).toBe(400);
    const edited = await call('admin/offers/vendor-free/edit', { fields: { evidence }, approve: true }, 'admin');
    expect(edited.status, JSON.stringify(edited.body)).toBe(200);
    const publicOffers = await call('offers?view=all');
    expect((publicOffers.body.offers as { id: string }[]).map(o => o.id)).toContain('vendor-free');
    expect((await call('admin/offers/vendor-free/approve', {}, 'admin')).status).toBe(409);
    expect((sqlite.prepare("SELECT clean_streak FROM sources WHERE id='source'").get() as { clean_streak: number }).clean_streak).toBe(0);
    sqlite.prepare("UPDATE platforms SET status='pending' WHERE id='vendor'").run();
    expect((await call('offers?view=all')).body.count).toBe(0);
    expect((await call('offers/vendor-free')).status).toBe(404);
  });

  it('protects an administrator correction and stages a model update without hiding the published offer', async () => {
    await call('ingest/offers', [offer]);
    const firstApproval = await call('admin/offers/vendor-free/approve', {}, 'admin');
    expect(firstApproval.status, JSON.stringify(firstApproval.body)).toBe(200);
    const correction = await call('admin/offers/vendor-free/edit', { fields: { audience: 'old' }, reason: 'Official eligibility clarification' }, 'admin');
    expect(correction.status, JSON.stringify(correction.body)).toBe(200);
    const changed = await call('ingest/offers', [{ ...offer, audience: 'new', valueText: '200 tokens' }]);
    expect((changed.body.results as { reviewState: string }[])[0].reviewState).toBe('pending_update');
    const published = sqlite.prepare("SELECT value_text,audience,review_state FROM offers WHERE id='vendor-free'").get() as { value_text: string; audience: string; review_state: string };
    expect(published).toMatchObject({ value_text: '100 tokens', audience: 'old', review_state: 'approved' });
    const queue = await call('admin/queue', undefined, 'admin');
    expect((queue.body.pending as { pendingUpdate?: boolean; value: string }[])[0]).toMatchObject({ pendingUpdate: true, value: '200 tokens' });
    const approved = await call('admin/offers/vendor-free/approve', {}, 'admin');
    expect(approved.status).toBe(200);
    const current = sqlite.prepare("SELECT value_text,audience,review_state FROM offers WHERE id='vendor-free'").get() as typeof published;
    expect(current).toMatchObject({ value_text: '200 tokens', audience: 'old', review_state: 'approved' });
  });

  it('stages evidence-only changes and preserves both evidence versions after approval', async () => {
    await call('ingest/offers', [offer]);
    const firstApproval = await call('admin/offers/vendor-free/approve', {}, 'admin');
    expect(firstApproval.status, JSON.stringify(firstApproval.body)).toBe(200);
    const updatedEvidence = { ...evidence, excerpts: { ...evidence.excerpts, benefit: 'Free 200 tokens' } };
    const changed = await call('ingest/offers', [{ ...offer, evidence: updatedEvidence }]);
    expect((changed.body.results as { reviewState: string }[])[0].reviewState).toBe('pending_update');
    expect((await call('admin/offers/vendor-free/approve', {}, 'admin')).status).toBe(200);
    const revision = sqlite.prepare("SELECT evidence_before,evidence_after FROM offer_revisions WHERE offer_id='vendor-free' AND author='pipeline' ORDER BY id DESC LIMIT 1").get() as { evidence_before: string; evidence_after: string };
    expect(JSON.parse(revision.evidence_before).excerpts.benefit).toBe('Free 100 tokens');
    expect(JSON.parse(revision.evidence_after).excerpts.benefit).toBe('Free 200 tokens');
  });

  it('does not let a disabled staff source auto-publish with a forged payload tier', async () => {
    sqlite.prepare("UPDATE sources SET tier='staff',enabled=0,auto_publish=1 WHERE id='source'").run();
    const result = await call('ingest/offers', [offer]);
    expect((result.body.results as { reviewState: string }[])[0].reviewState).toBe('pending');
  });

  it('refuses ambiguous short codes and gives both records their full IDs in the queue', async () => {
    await call('ingest/offers', [{ ...offer, id: 'offer-159' }, { ...offer, id: 'offer-14600' }]);
    const ambiguous = await call('admin/offers/etch/approve', {}, 'admin');
    expect(ambiguous.status).toBe(409);
    expect(ambiguous.body.ids).toEqual(['offer-159', 'offer-14600']);
    const queue = await call('admin/queue', undefined, 'admin');
    expect((queue.body.pending as { code: string }[]).map(o => o.code).sort()).toEqual(['offer-14600', 'offer-159']);
  });
});

describe('notification delivery receipts', () => {
  it('does not mark an event sent until delivery is acknowledged, and blocks concurrent claims', async () => {
    await call('ingest/offers', [offer]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    const preview = await call('admin/notify?kind=digest', undefined, 'admin');
    expect((preview.body.items as { new: unknown[] }).new).toHaveLength(1);
    const first = await call('admin/notify/claim', { kind: 'digest', channel: 'telegram' }, 'admin');
    const second = await call('admin/notify/claim', { kind: 'digest', channel: 'telegram' }, 'admin');
    expect(first.body.deliveryId).toBeTruthy();
    expect(second.body.alreadyClaimed).toBe(true);
    expect((sqlite.prepare('SELECT count(*) n FROM notifications').get() as { n: number }).n).toBe(0);
    const ack = await call(`admin/notify/${first.body.deliveryId}/ack`, { status: 'sent' }, 'admin');
    expect(ack.status).toBe(200);
    expect((sqlite.prepare("SELECT status FROM notifications WHERE offer_id='vendor-free' AND stage='new'").get() as { status: string }).status).toBe('sent');
    expect((await call('admin/notify?kind=digest', undefined, 'admin')).body.empty).toBe(true);
  });

  it('keeps unknown outcomes for human reconciliation and excludes admin edits from public change alerts', async () => {
    await call('ingest/offers', [offer]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    const first = await call('admin/notify/claim', { kind: 'digest', channel: 'telegram' }, 'admin');
    await call(`admin/notify/${first.body.deliveryId}/ack`, { status: 'unknown', error: 'transport timed out' }, 'admin');
    expect((await call('admin/notify/claim', { kind: 'digest', channel: 'telegram' }, 'admin')).body.alreadyClaimed).toBe(true);
    expect((await call(`admin/notify/${first.body.deliveryId}/ack`, { status: 'sent' }, 'admin')).status).toBe(409);
    expect((await call(`admin/notify/${first.body.deliveryId}/resolve`, { outcome: 'not_delivered', reason: 'Checked recipient chat history' }, 'admin')).status).toBe(200);
    const retried = await call('admin/notify/claim', { kind: 'digest', channel: 'telegram' }, 'admin');
    expect(retried.body.deliveryId).toBeTruthy();
    expect(retried.body.deliveryId).not.toBe(first.body.deliveryId);
    await call(`admin/notify/${retried.body.deliveryId}/ack`, { status: 'unknown', error: 'second timeout' }, 'admin');
    expect((await call(`admin/notify/${retried.body.deliveryId}/resolve`, { outcome: 'delivered', reason: 'Saw Telegram message in chat' }, 'admin')).status).toBe(200);
    expect((sqlite.prepare("SELECT status FROM notifications WHERE offer_id='vendor-free' AND channel='telegram'").get() as { status: string }).status).toBe('sent');

    const firstFeishu = await call('admin/notify/claim', { kind: 'digest', channel: 'feishu' }, 'admin');
    await call(`admin/notify/${firstFeishu.body.deliveryId}/ack`, { status: 'sent' }, 'admin');
    await call('admin/offers/vendor-free/edit', { fields: { audience: 'old' }, reason: 'Manual correction' }, 'admin');
    const nextFeishu = await call('admin/notify?kind=digest&channel=feishu', undefined, 'admin');
    expect((nextFeishu.body.items as { changed: unknown[] }).changed).toEqual([]);
  });

  it('includes pending review in the administrator digest even with no public events', async () => {
    await call('ingest/offers', [offer]);
    const digest = await call('admin/notify?kind=digest', undefined, 'admin');
    expect(digest.body.pendingCount).toBe(1);
    expect(digest.body.empty).toBe(false);
  });

  it('does not repeat the same pending summary after an event digest was delivered today', async () => {
    await call('ingest/offers', [offer, { ...offer, id: 'vendor-pending', title: 'Another pending offer' }]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    const first = await call('admin/notify/claim', { kind: 'digest', channel: 'telegram' }, 'admin');
    expect(first.body.pendingCount).toBe(1);
    await call(`admin/notify/${first.body.deliveryId}/ack`, { status: 'sent' }, 'admin');
    const second = await call('admin/notify/claim', { kind: 'digest', channel: 'telegram' }, 'admin');
    expect(second.body.empty).toBe(true);
    expect(second.body.deliveryId).toBeUndefined();
  });

  it('does not announce a revision that predates the first new-offer message', async () => {
    await call('ingest/offers', [offer]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    await call('ingest/offers', [{ ...offer, valueText: '200 tokens' }]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    const first = await call('admin/notify/claim', { kind: 'digest', channel: 'telegram' }, 'admin');
    expect((first.body.items as { new: unknown[]; changed: unknown[] }).new).toHaveLength(1);
    await new Promise(resolve => setTimeout(resolve, 5));
    await call(`admin/notify/${first.body.deliveryId}/ack`, { status: 'sent' }, 'admin');
    const next = await call('admin/notify?kind=digest', undefined, 'admin');
    expect((next.body.items as { changed: unknown[] }).changed).toEqual([]);
    expect(next.body.empty).toBe(true);
  });

  it('never sends an urgent notice for an offer whose evidence is stale', async () => {
    const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
    await call('ingest/offers', [{ ...offer, claimEnd: tomorrow, endKind: 'date' }]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    sqlite.prepare("UPDATE offers SET last_verified_at='2026-09-01T00:00:00Z' WHERE id='vendor-free'").run();
    expect((await call('admin/notify?kind=urgent', undefined, 'admin')).body.empty).toBe(true);
  });
});

describe('durable model budget', () => {
  it('reserves atomically across concurrent callers and releases unused tokens after a response', async () => {
    env.DAILY_TOKEN_CAP = '10000';
    env.MONTHLY_COST_CAP_CNY = '1';
    const request = { provider: 'paid-model', tokens: 7000, costCny: 0.7 };
    const [first, second] = await Promise.all([
      call('ingest/model-budget/reserve', request), call('ingest/model-budget/reserve', request),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 429]);
    const accepted = first.status === 200 ? first : second;
    expect((await call('ingest/budget')).body.tokensToday).toBe(7000);
    await call(`ingest/model-budget/${accepted.body.id}/settle`, { provider: 'paid-model', tokens: 1000, costCny: 0.2 });
    expect((await call('ingest/budget')).body).toMatchObject({ tokensToday: 1000, costMonthCny: 0.2 });
    expect((await call('ingest/model-budget/reserve', request)).status).toBe(200);
  });
  it('allows unlimited daily free-model tokens in debug mode while keeping the monthly paid ceiling', async () => {
    env.DAILY_TOKEN_CAP = '0';
    env.MONTHLY_COST_CAP_CNY = '1';
    for (let i = 0; i < 3; i++) expect((await call('ingest/model-budget/reserve', { provider: 'free-model', tokens: 300000, costCny: 0 })).status).toBe(200);
    expect((await call('ingest/budget')).body.tokensToday).toBe(900000);
    expect((await call('ingest/model-budget/reserve', { provider: 'paid-model', tokens: 10000, costCny: 0.7 })).status).toBe(200);
    expect((await call('ingest/model-budget/reserve', { provider: 'paid-model', tokens: 10000, costCny: 0.4 })).status).toBe(429);
  });
});

describe('public status and subscriptions', () => {
  it('distinguishes an untouched source from a healthy source', async () => {
    const coverage = await call('coverage');
    expect((coverage.body.officialPages as { healthy: boolean }[])[0].healthy).toBe(false);
    const health = await call('admin/health', undefined, 'admin');
    expect((health.body.failingSources as { id: string }[]).map(x => x.id)).toContain('source');
  });

  it('serves actual RSS XML for verified, approved offers', async () => {
    await call('ingest/offers', [offer]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    const response = await worker.fetch(new Request('https://local.test/rss.xml'), env, {} as ExecutionContext);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/rss+xml');
    const xml = await response.text();
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain('Vendor free tokens');
  });
});
