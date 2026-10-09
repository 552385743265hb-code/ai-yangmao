import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import worker from '../src/worker/index';
import { buildNotice } from '../src/worker/admin';
import { offerIn } from '../src/shared/ingest';
import { liveStatus } from '../src/shared/lifecycle';

let sqlite: DatabaseSync;
let env: Parameters<typeof worker.fetch>[1];

function d1(memory: DatabaseSync) {
  return {
    prepare(sql: string) {
      let args: unknown[] = [];
      return {
        bind(...values: unknown[]) {
          if (values.length > 100) throw new Error('D1_ERROR: too many SQL variables');
          args = values; return this;
        },
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
  it('keeps verification, review queue and notices within D1 limits above 100 offers', async () => {
    await call('ingest/offers', [offer]);
    sqlite.prepare("UPDATE offers SET review_state='approved',last_verified_at=NULL WHERE id='vendor-free'").run();
    const columns = (sqlite.prepare('PRAGMA table_info(offers)').all() as { name: string }[]).map(c => c.name);
    const copy = sqlite.prepare(`INSERT INTO offers (${columns.join(',')}) SELECT ${columns.map(c => c === 'id' ? '?' : c).join(',')} FROM offers WHERE id='vendor-free'`);
    for (let i = 1; i < 120; i++) copy.run(`vendor-free-${i}`);
    sqlite.prepare("INSERT INTO offer_proposals (offer_id,candidate,diff,manual_fields,detected_at,updated_at) VALUES (?,?, '[]','[]',?,?)")
      .run('vendor-free-119', JSON.stringify({ evidence: { pageHash: 'proposal-hash' } }), new Date().toISOString(), new Date().toISOString());
    for (const suffix of ['', '?sourceId=source&force=1']) {
      const queue = await call(`ingest/verification-queue${suffix}`);
      expect(queue.status).toBe(200);
      const offers = queue.body.offers as { id: string; proposalHash: string | null }[];
      expect(offers).toHaveLength(120);
      expect(offers.find(o => o.id === 'vendor-free-119')?.proposalHash).toBe('proposal-hash');
      expect(offers.find(o => o.id === 'vendor-free')?.proposalHash).toBeNull();
    }
    expect((await call('ingest/verification-queue?sourceId=missing')).body.offers).toEqual([]);
    await expect(buildNotice(env, 'digest', 'telegram')).resolves.toBeDefined();
    const proposal = sqlite.prepare("INSERT OR REPLACE INTO offer_proposals (offer_id,candidate,diff,manual_fields,detected_at,updated_at) VALUES (?,?,?,'[]',?,?)");
    for (let i = 0; i < 120; i++) proposal.run(i ? `vendor-free-${i}` : 'vendor-free',
      JSON.stringify({ valueText: '200 tokens' }), JSON.stringify([{ field: 'valueText', from: '100 tokens', to: '200 tokens' }]),
      new Date().toISOString(), new Date().toISOString());
    const review = await call('admin/queue', undefined, 'admin');
    expect(review.status).toBe(200);
    expect(review.body.pending).toHaveLength(120);
  });

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
    expect((await call('admin/notify?kind=digest', undefined, 'admin')).body).toMatchObject({ needsVerificationCount: 0 });
    expect((await call('admin/queue', undefined, 'admin')).body.needsVerification).toHaveLength(0);
    const withdrawn = await call('admin/offers/vendor-free/withdraw', { reason: 'The vendor ended its free allowance', evidenceUrl: 'https://vendor.example/withdrawal' }, 'admin');
    expect(withdrawn.body.status).toBe('ended');
    expect((await call('admin/queue', undefined, 'admin')).body.needsVerification).toHaveLength(0);
    const status = sqlite.prepare("SELECT withdrawn_at, withdrawn_reason FROM offers WHERE id='vendor-free'").get() as { withdrawn_at: string; withdrawn_reason: string };
    expect(status.withdrawn_at).toBeTruthy();
    expect(status.withdrawn_reason).toContain('ended');
  });
});

describe('review gates and preserved public version', () => {
  it('审批页：待审条目带上架前检查；已上架但缺字段的进入“已上架、字段待补”；复测仍有效会更新核验时间', async () => {
    await call('ingest/offers', [{ ...offer, usdEstimate: null }]);
    const q1 = await call('admin/queue', undefined, 'admin');
    const pending = (q1.body.pending as { id: string; checks: { field: string; sections: string[] }[] }[]).find(o => o.id === 'vendor-free')!;
    expect(pending.checks.map(c => c.field)).toContain('usdEstimate');
    expect(pending.checks.find(c => c.field === 'usdEstimate')!.sections.length).toBeGreaterThan(0);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    const q2 = await call('admin/queue', undefined, 'admin');
    expect((q2.body.incomplete as { id: string }[]).map(o => o.id)).toContain('vendor-free');
    const r = await call('admin/offers/vendor-free/retested', {}, 'admin');
    expect(r.status).toBe(200);
    expect((sqlite.prepare("SELECT verify_result FROM offers WHERE id='vendor-free'").get() as { verify_result: string }).verify_result).toBe('管理员复测仍有效');
  });

  it('证据链接在平台已登记官方信源的域名下（不同于官网域名）也能通过', async () => {
    sqlite.prepare("INSERT INTO sources (id,platform_id,kind,url,tier,config) VALUES ('vendor-docs','vendor','web_list','https://docs.vendor-other.example/pricing','docs','{}')").run();
    await call('ingest/offers', [{ ...offer, sourceId: undefined, evidence: { ...evidence, url: 'https://docs.vendor-other.example/announcements' } }]);
    const r = await call('admin/offers/vendor-free/approve', {}, 'admin');
    expect(r.status, JSON.stringify(r.body)).toBe(200);
  });

  it('内部核验记录只给管理员看，公开接口不输出', async () => {
    await call('ingest/offers', [offer]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    expect((await call('admin/offers/vendor-free/memo', { memo: '漏抓原因：平台没有信源' }, 'admin')).status).toBe(200);
    const pub = await call('offers?view=all');
    expect(JSON.stringify(pub.body)).not.toContain('漏抓原因');
    expect(JSON.stringify((await call('offers/vendor-free')).body)).not.toContain('漏抓原因');
    expect(JSON.stringify((await call('admin/queue', undefined, 'admin')).body) + JSON.stringify((await call('admin/offers/vendor-free', undefined, 'admin')).body)).toContain('漏抓原因');
  });

  it('管理员心得：写入后公开显示，采集更新不会覆盖', async () => {
    await call('ingest/offers', [offer]);
    expect((await call('admin/offers/vendor-free/note', { note: '速度慢，适合做翻译' }, 'admin')).status).toBe(200);
    await call('ingest/offers', [{ ...offer, valueText: offer.valueText + '（更新）' }]);
    expect(sqlite.prepare("SELECT admin_note FROM offers WHERE id='vendor-free'").get()).toEqual({ admin_note: '速度慢，适合做翻译' });
    expect((await call('admin/offers/vendor-free/note', { note: '' }, 'admin')).body.adminNote).toBeNull();
  });

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

  it('does not ask for review when extraction loses evidence or changes optional presentation', async () => {
    await call('ingest/offers', [offer]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    const changed = await call('ingest/offers', [{ ...offer, sourceId: undefined,
      steps: ['Open the app'], creditValidity: 'Not stated',
      evidence: { ...evidence, excerpts: {}, capturedAt: new Date().toISOString() } }]);
    expect((changed.body.results as { unchanged: boolean }[])[0].unchanged).toBe(true);
    expect((await call('admin/queue', undefined, 'admin')).body.pending).toEqual([]);
    const saved = sqlite.prepare("SELECT evidence,verify_result FROM offers WHERE id='vendor-free'").get() as { evidence: string; verify_result: string };
    expect(JSON.parse(saved.evidence).excerpts).toEqual(evidence.excerpts);
    expect(saved.verify_result).not.toBe('evidence_missing');
  });

  it('processed extraction with unchanged terms verifies even when saved quotes were paraphrased', async () => {
    await call('ingest/offers', [offer]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    const hash = 'a'.repeat(64);
    await call('ingest/offers', [{ ...offer, evidence: { ...evidence, pageHash: hash, excerpts: {} } }]);
    const verified = await call('ingest/verify', { offerId: offer.id, url: evidence.url,
      text: 'All members can receive one hundred tokens when they register.', pageHash: hash, processedChange: true });
    expect(verified.body.verified).toBe(true);
    expect((await call('admin/queue', undefined, 'admin')).body.needsVerification).toEqual([]);
  });

  it.each([
    ['models', ['Model A']], ['tags', ['daily']], ['usdMax', 10],
    ['valueText', '200 tokens'], ['requirements', ['card']], ['claimEnd', '2099-12-31'],
  ])('requires review for necessary field %s and preserves the published version', async (field, value) => {
    await call('ingest/offers', [offer]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    const changed = await call('ingest/offers', [{ ...offer, [field]: value,
      ...(field === 'claimEnd' ? { endKind: 'date' } : {}),
      ...(field === 'usdMax' ? { usdEstimate: 1 } : {}) }]);
    expect((changed.body.results as { reviewState: string }[])[0].reviewState).toBe('pending_update');
    const pending = (await call('admin/queue', undefined, 'admin')).body.pending as { changedFields: string[] }[];
    expect(pending[0].changedFields).toContain(field);
    expect(sqlite.prepare("SELECT value_text,review_state FROM offers WHERE id='vendor-free'").get())
      .toEqual({ value_text: '100 tokens', review_state: 'approved' });
  });

  it('does not propose cosmetic drift (title wording, modalities, timezone, claim method) on approved offers', async () => {
    await call('ingest/offers', [offer]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    const r = await call('ingest/offers', [{ ...offer, title: offer.title + ' (reworded)', modalities: ['text', 'image'], sourceTz: 'Asia/Tokyo', claimMethod: 'auto',
      evidence: { ...evidence, excerpts: { ...evidence.excerpts, benefit: 'Another sentence about the same 100 tokens' } } }]);
    expect((await call('admin/queue', undefined, 'admin')).body.pending).toEqual([]);
  });

  it('ignores ordering and whitespace and discards legacy evidence-only proposals', async () => {
    const initial = { ...offer, models: ['A', 'B'], modalities: ['text', 'code'] };
    await call('ingest/offers', [initial]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    sqlite.prepare("INSERT INTO offer_proposals (offer_id,candidate,diff) VALUES (?,?,?)")
      .run(offer.id, JSON.stringify(initial), JSON.stringify([{ field: 'evidence', from: evidence, to: { ...evidence, excerpts: {} } }]));
    expect((await call('admin/queue', undefined, 'admin')).body.pending).toEqual([]);
    const changed = await call('ingest/offers', [{ ...initial, models: ['B', 'A'], modalities: ['code', 'text'], valueText: '  100   tokens  ' }]);
    expect((changed.body.results as { unchanged: boolean }[])[0].unchanged).toBe(true);
    expect(sqlite.prepare('SELECT count(*) AS n FROM offer_proposals').get()).toEqual({ n: 0 });
  });

  it('requires review of real changes even for sources allowed to auto-publish', async () => {
    sqlite.prepare("UPDATE sources SET auto_publish=1 WHERE id='source'").run();
    await call('ingest/offers', [offer]);
    expect(sqlite.prepare('SELECT review_state FROM offers').get()).toEqual({ review_state: 'approved' });
    const result = await call('ingest/offers', [{ ...offer, valueText: '200 tokens', evidence: { ...evidence, excerpts: {} } }]);
    expect((result.body.results as { reviewState: string }[])[0].reviewState).toBe('pending_update');
    expect(sqlite.prepare('SELECT value_text FROM offers').get()).toEqual({ value_text: '100 tokens' });
    const candidate = JSON.parse((sqlite.prepare('SELECT candidate FROM offer_proposals').get() as { candidate: string }).candidate);
    expect(candidate.evidence.excerpts).toEqual(evidence.excerpts);
  });

  it('proposes a necessary change supported by new terms even after an administrator correction', async () => {
    await call('ingest/offers', [offer]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    await call('admin/offers/vendor-free/edit', { fields: { valueText: '100 tokens corrected' } }, 'admin');
    const result = await call('ingest/offers', [{ ...offer, valueText: '200 tokens',
      evidence: { ...evidence, excerpts: { ...evidence.excerpts, benefit: 'Free 200 tokens' } } }]);
    expect((result.body.results as { reviewState: string }[])[0].reviewState).toBe('pending_update');
    expect(sqlite.prepare('SELECT value_text FROM offers').get()).toEqual({ value_text: '100 tokens corrected' });
  });

  it('does not bless a failed quotation check by storing its hash and retrying', async () => {
    await call('ingest/offers', [offer]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    const body = { offerId: offer.id, url: evidence.url, text: 'Unrelated page', pageHash: 'b'.repeat(64), processedChange: true };
    expect((await call('ingest/verify', body)).body.verified).toBe(false);
    expect((await call('ingest/verify', body)).body.verified).toBe(false);
    expect((await call('admin/queue', undefined, 'admin')).body.needsVerification).toEqual([]);
  });

  it('keeps known dates and valuations when a later extraction omits them', async () => {
    await call('ingest/offers', [{ ...offer, usdEstimate: 1, usdMax: 10, claimStart: '2026-01-01', claimEnd: '2099-12-31', endKind: 'date' }]);
    await call('admin/offers/vendor-free/approve', {}, 'admin');
    const result = await call('ingest/offers', [{ ...offer, audience: 'unclear', requirements: ['unknown'] }]);
    expect((result.body.results as { unchanged: boolean }[])[0].unchanged).toBe(true);
    expect((await call('admin/queue', undefined, 'admin')).body.pending).toEqual([]);
    expect(sqlite.prepare('SELECT usd_max,claim_end FROM offers').get()).toEqual({ usd_max: 10, claim_end: '2099-12-31' });
  });

  it('does not let a disabled staff source auto-publish with a forged payload tier', async () => {
    sqlite.prepare("UPDATE sources SET tier='staff',enabled=0,auto_publish=1 WHERE id='source'").run();
    const result = await call('ingest/offers', [offer]);
    expect((result.body.results as { reviewState: string }[])[0].reviewState).toBe('pending');
  });

  it('refuses ambiguous short codes and gives both records their full IDs in the queue', async () => {
    await call('ingest/offers', [{ ...offer, id: 'offer-159', title: 'Short code A 5 credits', valueText: '5 credits' }, { ...offer, id: 'offer-14600', title: 'Short code B 9 credits', valueText: '9 credits' }]);
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
    await call('ingest/offers', [offer, { ...offer, id: 'vendor-pending', title: 'Another pending offer', valueText: '7 extra credits' }]);
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


describe('lead to review workflow', () => {
  it('puts time-sensitive AIHOT leads before community noise and reserves backlog capacity', async () => {
    const insert = sqlite.prepare("INSERT INTO leads(origin,url,title,created_at) VALUES (?,?,?,?)");
    insert.run('reddit','https://example.org/old','Old free API credits','2026-09-01T00:00:00Z');
    for (let i=0;i<60;i++) insert.run('linuxdo',`https://example.org/noise-${i}`,'免费话费游戏','2026-10-01T00:00:00Z');
    insert.run('aihot','https://example.org/max','Anthropic Max 每月赠送 API 额度','2026-10-07T00:00:00Z');
    insert.run('aihot','https://example.org/reset','Codex 重置卡已发放','2026-10-08T00:00:00Z');
    insert.run('ithome','https://example.org/game','游戏免费更新：AI 敌人等级重置','2026-10-08T01:00:00Z');
    const result = await call('ingest/leads?limit=25');
    const rows = result.body.leads as {title:string}[];
    expect(rows.slice(0,2).map(l=>l.title)).toEqual(['Codex 重置卡已发放','Anthropic Max 每月赠送 API 额度']);
    expect(rows.map(l=>l.title)).toContain('Old free API credits');
  });
  it('alerts about untriaged reset leads and new pending offers hourly, without publishing or repeating', async () => {
    sqlite.prepare("INSERT INTO leads(origin,url,title) VALUES ('aihot','https://example.org/reset','Codex 重置卡已发放')").run();
    await call('ingest/offers',[offer]);
    const first = await call('admin/notify/claim',{kind:'urgent',channel:'telegram'},'admin');
    expect(first.body.empty).toBe(false);
    expect(first.body.reviewAlerts).toHaveLength(2);
    expect((sqlite.prepare("SELECT review_state FROM offers WHERE id='vendor-free'").get() as {review_state:string}).review_state).toBe('pending');
    const concurrent = await call('admin/notify/claim',{kind:'urgent',channel:'telegram'},'admin');
    expect(concurrent.body.empty).toBe(true);
    await call(`admin/notify/${first.body.deliveryId}/ack`,{status:'sent'},'admin');
    expect((await call('admin/notify?kind=urgent',undefined,'admin')).body.empty).toBe(true);
    sqlite.prepare("INSERT INTO leads(origin,url,title) VALUES ('aihot','https://example.org/reset2','Codex 第二次重置卡发放')").run();
    expect((await call('admin/notify?kind=urgent',undefined,'admin')).body.reviewAlerts).toHaveLength(1);
  });
});


it('refuses to consume a lead when its supposed offer did not persist', async () => {
  sqlite.prepare("INSERT INTO leads(origin,url,title) VALUES ('aihot','https://example.org/max','Max API credits')").run();
  expect((await call('ingest/leads/1/status',{status:'linked',offerId:'missing'})).status).toBe(409);
  expect((sqlite.prepare('SELECT status FROM leads WHERE id=1').get() as {status:string}).status).toBe('new');
  await call('ingest/offers',[{...offer,leadId:1}]);
  expect((sqlite.prepare('SELECT status FROM leads WHERE id=1').get() as {status:string}).status).toBe('new');
  expect((await call('ingest/leads/1/status',{status:'linked',offerId:'vendor-free'})).status).toBe(200);
});


it('creates a new pending reset event even when the model reuses a historical ID', async () => {
  const old = {...offer,id:'vendor-reset',title:'Codex 重置卡发放',type:'perk',tags:['reset'],claimStart:'2026-07-13',publishedAt:'2026-07-13T18:00:00Z'};
  await call('ingest/offers',[old]);
  sqlite.prepare("UPDATE offers SET review_state='approved' WHERE id='vendor-reset'").run();
  const next = await call('ingest/offers',[{...old,claimStart:'2026-10-07',publishedAt:'2026-10-07T19:00:00Z',evidence:{...evidence,url:'https://vendor.example/october-reset'}}]);
  expect((next.body.results as {id:string}[])[0].id).not.toBe('vendor-reset');
  expect((sqlite.prepare("SELECT count(*) n FROM offers WHERE review_state='pending'").get() as {n:number}).n).toBe(1);
  expect((sqlite.prepare("SELECT published_at FROM offers WHERE id='vendor-reset'").get() as {published_at:string}).published_at).toBe(old.publishedAt);
  expect((sqlite.prepare('SELECT count(*) n FROM offer_proposals').get() as {n:number}).n).toBe(0);
});


it('does not bury a new pending Max benefit behind routine review backlog',async()=>{
  for (let i=0;i<20;i++) await call('ingest/offers',[{...offer,id:`vendor-noise-${i}`,title:`工具体验 ${i}`,valueText:`${i+1} credits`}]);
  await call('ingest/offers',[{...offer,id:'vendor-max',title:'Anthropic Max 每月免费 API 额度',valueText:'700 API credits'}]);
  const notice = await call('admin/notify?kind=urgent',undefined,'admin');
  const alerts=notice.body.reviewAlerts as {title:string}[];
  expect(alerts[0].title).toContain('Anthropic Max');
  expect(alerts).toHaveLength(10);
});

describe('workflow audit regressions', () => {
  it('rejects malformed publication timestamps before they can break the review UI', async () => {
    expect((await call('ingest/offers',[{...offer,publishedAt:'unknown'}])).status).toBe(400);
  });
  it('cannot downgrade a published offer to forbidden evidence through an ordinary edit', async () => {
    await call('ingest/offers',[offer]);await call('admin/offers/vendor-free/approve',{},'admin');
    const edit=await call('admin/offers/vendor-free/edit',{fields:{evidence:{...evidence,tier:'media'},requirements:['unknown']}},'admin');
    expect(edit.status).toBe(400);
    expect((sqlite.prepare("SELECT review_state,requirements FROM offers WHERE id='vendor-free'").get() as {requirements:string}).requirements).toBe('["none"]');
  });
  it('an explicit approval records the reviewer verification so the offer is immediately eligible',async()=>{
    await call('ingest/offers',[offer]);
    sqlite.prepare("UPDATE offers SET last_verified_at=? WHERE id='vendor-free'").run(new Date(Date.now()-3*86400_000).toISOString());
    expect((await call('admin/offers/vendor-free/approve',{},'admin')).status).toBe(200);
    const listed=await call('offers');expect((listed.body.offers as {id:string}[]).map(x=>x.id)).toContain('vendor-free');
  });
  it('keeps pending or unknown Feishu batches out of all reconstructed rankings',async()=>{
    await call('ingest/offers',[offer]);await call('admin/offers/vendor-free/approve',{},'admin');
    const first=await call('admin/notify/claim',{kind:'digest',channel:'feishu'},'admin');
    expect(first.body.deliveryId).toBeTruthy();
    const second=await call('admin/notify/claim',{kind:'digest',channel:'feishu'},'admin');
    expect(second.body.empty).toBe(true);expect(second.body.deliveryId).toBeUndefined();
    await call(`admin/notify/${first.body.deliveryId}/ack`,{status:'unknown'},'admin');
    expect((await call('admin/notify?kind=digest&channel=feishu',undefined,'admin')).body.empty).toBe(true);
  });
  it('atomically prevents overlapping digest and urgent claims from sending the same offer twice',async()=>{
    await call('ingest/offers',[{...offer,endKind:'date',claimEnd:new Date(Date.now()+86400_000).toISOString().slice(0,10)}]);
    await call('admin/offers/vendor-free/approve',{},'admin');
    const results=await Promise.all(['digest','urgent'].map(kind=>call('admin/notify/claim',{kind,channel:'telegram'},'admin')));
    expect(results.filter(r=>r.body.deliveryId)).toHaveLength(1);
  });
  it('keeps expiring pending offers ahead of fresh leads and uses a protected review destination',async()=>{
    await call('ingest/offers',[{...offer,endKind:'date',claimEnd:new Date(Date.now()+86400_000).toISOString().slice(0,10)}]);
    const insert=sqlite.prepare("INSERT INTO leads(origin,url,title) VALUES ('aihot',?,'Codex 重置卡发放')");
    for(let i=0;i<20;i++)insert.run(`https://example.org/reset-${i}`);
    const r=await call('admin/notify?kind=urgent',undefined,'admin');
    const alerts=r.body.reviewAlerts as {key:string;url:string}[];
    expect(alerts[0].key).toBe('offer:vendor-free');expect(alerts[0].url).toContain('#admin-offer-vendor-free');
    const detail=await call('admin/offers/vendor-free',undefined,'admin');expect((detail.body.offer as {link:string}).link).toContain('#admin-offer-vendor-free');
  });
  it('paginates older manual-review leads and supports status filtering without omission',async()=>{
    const insert=sqlite.prepare("INSERT INTO leads(origin,url,title,status) VALUES ('aihot',?,'lead',?)");
    for(let i=0;i<65;i++)insert.run(`https://example.org/lead-${i}`,i===0?'reviewing':'new');
    const first=await call('admin/leads?limit=60',undefined,'admin');
    expect(first.body.total).toBe(65);expect(first.body.nextCursor).toBe(6);
    const next=await call(`admin/leads?limit=60&before=${first.body.nextCursor}`,undefined,'admin');
    expect((next.body.leads as {id:number}[]).map(l=>l.id)).toEqual([5,4,3,2,1]);expect(next.body.nextCursor).toBeNull();
    const manual=await call('admin/leads?status=reviewing',undefined,'admin');
    expect((manual.body.leads as {id:number}[]).map(l=>l.id)).toEqual([1]);
  });
});

it('does not revive official verification or erase an existing proposal using media-only extraction',async()=>{
  await call('ingest/offers',[offer]);await call('admin/offers/vendor-free/approve',{},'admin');
  const before='2026-07-01T00:00:00Z';
  sqlite.prepare("UPDATE offers SET last_verified_at=?,verify_result='evidence_missing' WHERE id='vendor-free'").run(before);
  await call('ingest/offers',[{...offer,valueText:'200 credits'}]);
  await call('ingest/offers',[{...offer,evidence:{...evidence,tier:'media'}}]);
  expect((sqlite.prepare("SELECT last_verified_at FROM offers WHERE id='vendor-free'").get() as {last_verified_at:string}).last_verified_at).toBe(before);
  expect((sqlite.prepare("SELECT count(*) n FROM offer_proposals WHERE offer_id='vendor-free'").get() as {n:number}).n).toBe(1);
});

it('rejects stale review cards and does not report competing approvals as both successful',async()=>{
  await call('ingest/offers',[offer]);
  const q=await call('admin/queue',undefined,'admin');
  const shown=(q.body.pending as {reviewVersion:string}[])[0].reviewVersion;
  sqlite.prepare("UPDATE offers SET updated_at='2030-01-01T00:00:00Z',value_text='changed' WHERE id='vendor-free'").run();
  expect((await call('admin/offers/vendor-free/approve',{expectedReviewVersion:shown},'admin')).status).toBe(409);
  const competing=await Promise.all(['approve','reject'].map(action=>call(`admin/offers/vendor-free/${action}`,{},'admin')));
  expect(competing.map(r=>r.status).sort()).toEqual([200,409]);
});

it('accepting and rejecting the same proposal cannot both succeed',async()=>{
  await call('ingest/offers',[offer]);await call('admin/offers/vendor-free/approve',{},'admin');
  await call('ingest/offers',[{...offer,valueText:'200 credits'}]);
  const actions=await Promise.all(['approve','reject'].map(action=>call(`admin/offers/vendor-free/${action}`,{},'admin')));
  expect(actions.map(r=>r.status).sort()).toEqual([200,409]);
});

it('reports the latest incomplete collect rather than masking it with an older success',async()=>{
  const insert=sqlite.prepare("INSERT INTO runs(kind,started_at,finished_at,ok,stats) VALUES ('collect',?,?,?,?)");
  insert.run('2026-10-07T00:00:00Z','2026-10-07T00:10:00Z',1,'{}');
  insert.run('2026-10-08T00:00:00Z','2026-10-08T00:10:00Z',1,JSON.stringify({errors:['vendor: 复核失败']}));
  const health=await call('admin/health',undefined,'admin');
  expect(health.body.coverageDegraded).toBe(true);
});

it('lets pending extraction improve fields while preserving fields explicitly edited by a reviewer',async()=>{
  await call('ingest/offers',[{...offer,title:'粗略标题',audience:'unclear',claimMethod:'auto',steps:[],evidence:{...evidence,tier:'media'}}]);
  const next={...offer,title:'完整的官方标题',audience:'all',claimMethod:'signup',steps:['注册领取'],creditValidity:'30 天'};
  await call('ingest/offers',[next]);
  const detail=await call('admin/offers/vendor-free',undefined,'admin');
  expect(detail.body.offer).toMatchObject({title:next.title,audience:'all',claimMethod:'signup',steps:['注册领取'],creditValidity:'30 天',evidenceTier:'docs',reviewState:'pending'});
  await call('admin/offers/vendor-free/edit',{fields:{title:'管理员确认标题'}},'admin');
  await call('ingest/offers',[{...next,title:'模型换个说法'}]);
  expect((await call('admin/offers/vendor-free',undefined,'admin')).body.offer).toMatchObject({title:'管理员确认标题'});
});

it('applies official evidence and missing steps to pending offers even if core terms are unchanged',async()=>{
  await call('ingest/offers',[{...offer,evidence:{...evidence,tier:'media'}}]);
  await call('ingest/offers',[{...offer,steps:['注册后领取'],creditValidity:'30 天'}]);
  expect((await call('admin/offers/vendor-free',undefined,'admin')).body.offer).toMatchObject({evidenceTier:'docs',steps:['注册后领取'],creditValidity:'30 天'});
});

describe('automatic official review queue',()=>{
  it('leases jobs once, permits protected draft updates, and never auto-approves the result',async()=>{
    await call('ingest/offers',[{...offer,evidence:{...evidence,tier:'media'}}]);
    expect(((await call('ingest/official-reviews/queue')).body.jobs as unknown[])).toHaveLength(1);
    const first=await call('ingest/official-reviews/vendor-free/claim',{});
    expect(first.body.claimed).toBe(true);
    expect((await call('ingest/official-reviews/vendor-free/claim',{})).body.claimed).toBe(false);
    sqlite.prepare("UPDATE sources SET auto_publish=1 WHERE id='source'").run();
    const changed=await call('ingest/offers',[{...offer,officialReviewJobId:first.body.jobId}]);
    expect((changed.body.results as {reviewState:string}[])[0].reviewState).toBe('pending');
    const end=await call('ingest/official-reviews/vendor-free/result',{jobId:first.body.jobId,status:'matched',reason:'官方正文匹配',queries:['vendor free credits'],candidates:[evidence.url],chosenUrl:evidence.url,changedFields:['evidence']});
    expect(end.body.status).toBe('matched');
    expect(((await call('ingest/official-reviews/queue')).body.jobs as unknown[])).toHaveLength(0);
    const detail=await call('admin/offers/vendor-free',undefined,'admin');expect((detail.body.offer as any).officialReview.status).toBe('matched');
    await call('admin/offers/vendor-free/approve',{},'admin');
    expect(JSON.stringify((await call('offers?view=all')).body)).not.toContain('vendor free credits');
    expect(JSON.stringify((await call('offers?view=all')).body)).not.toContain('officialReview');
  });
  it('preserves media evidence and schedules retry if no official support was found',async()=>{
    await call('ingest/offers',[{...offer,evidence:{...evidence,tier:'media'}}]);
    const lease=await call('ingest/official-reviews/vendor-free/claim',{});
    const result=await call('ingest/official-reviews/vendor-free/result',{jobId:lease.body.jobId,status:'unresolved',reason:'没有充分证据',queries:['vendor credits'],candidates:[],changedFields:[]});
    expect(result.body.nextAttemptAt).toBeTruthy();
    expect(((await call('ingest/official-reviews/queue')).body.jobs as unknown[])).toHaveLength(0);
    const record=await call('admin/offers/vendor-free',undefined,'admin');expect(record.body.offer).toMatchObject({reviewState:'pending',evidenceTier:'media'});
    expect((await call('admin/offers/vendor-free/official-retry',{},'admin')).status).toBe(200);
    expect(((await call('ingest/official-reviews/queue')).body.jobs as unknown[])).toHaveLength(1);
  });
  it('does not accept a forged or completed official review job id',async()=>{
    await call('ingest/offers',[{...offer,evidence:{...evidence,tier:'media'}}]);
    const r=await call('ingest/offers',[{...offer,officialReviewJobId:'12345678-1234-4234-8234-123456789012'}]);
    expect((r.body.results as any[])[0].error).toContain('失效');
  });
});

it('discards official-review edits if the administrator changed the draft after it was claimed',async()=>{
  await call('ingest/offers',[{...offer,evidence:{...evidence,tier:'media'}}]);
  const lease=await call('ingest/official-reviews/vendor-free/claim',{});
  sqlite.prepare("UPDATE offers SET title='管理员正在修改',updated_at='2030-01-01T00:00:00Z' WHERE id='vendor-free'").run();
  const saved=await call('ingest/offers',[{...offer,officialReviewJobId:lease.body.jobId}]);
  expect((saved.body.results as any[])[0].error).toBeTruthy();
  expect((await call('admin/offers/vendor-free',undefined,'admin')).body.offer).toMatchObject({title:'管理员正在修改',evidenceTier:'media'});
});

it('requeues a corrected media draft even after automatic retries previously stopped',async()=>{
  await call('ingest/offers',[{...offer,evidence:{...evidence,tier:'media'}}]);
  sqlite.prepare("UPDATE offers SET official_review=?,updated_at='2030-01-02T00:00:00Z' WHERE id='vendor-free'").run(JSON.stringify({status:'unresolved',jobId:'old',inputVersion:'old',attempts:5,checkedAt:'2030-01-01T00:00:00Z',nextAttemptAt:null,reason:'old',queries:[],candidates:[]}));
  expect(((await call('ingest/official-reviews/queue')).body.jobs as unknown[])).toHaveLength(1);
});

it('official review of an update improves its proposal while keeping the public approved version unchanged',async()=>{
  await call('ingest/offers',[offer]);await call('admin/offers/vendor-free/approve',{},'admin');
  await call('ingest/offers',[{...offer,valueText:'200 tokens',evidence:{...evidence,tier:'media',url:'https://community.example/post'}}]);
  const lease=await call('ingest/official-reviews/vendor-free/claim',{});expect(lease.body.claimed).toBe(true);
  await call('ingest/offers',[{...offer,valueText:'200 tokens',officialReviewJobId:lease.body.jobId}]);
  const result=await call('ingest/official-reviews/vendor-free/result',{jobId:lease.body.jobId,status:'matched',reason:'官方匹配',queries:['vendor'],candidates:[evidence.url],chosenUrl:evidence.url,changedFields:['valueText','evidence']});
  expect(result.body.status).toBe('matched');
  expect(((await call('offers?view=all')).body.offers as any[])[0].valueText).toBe(offer.valueText);
  const admin=await call('admin/offers/vendor-free',undefined,'admin');expect(admin.body.pendingUpdate).toBe(true);expect((admin.body.offer as any).evidenceTier).toBe('docs');
});

it('does not let unapproved platforms occupy the official verification queue',async()=>{
  await call('ingest/offers',[{...offer,evidence:{...evidence,tier:'media'}}]);
  sqlite.prepare("UPDATE platforms SET status='pending' WHERE id='vendor'").run();
  expect(((await call('ingest/official-reviews/queue')).body.jobs as unknown[])).toHaveLength(0);
});

it('official review cannot silently discard a pending update when official terms match the old public version',async()=>{
  await call('ingest/offers',[offer]);await call('admin/offers/vendor-free/approve',{},'admin');
  await call('ingest/offers',[{...offer,valueText:'200 tokens',evidence:{...evidence,tier:'media',url:'https://community.example/post'}}]);
  const lease=await call('ingest/official-reviews/vendor-free/claim',{});
  const result=await call('ingest/offers',[{...offer,officialReviewJobId:lease.body.jobId}]);
  expect((result.body.results as any[])[0].skipped).toBeTruthy();
  expect((await call('admin/offers/vendor-free',undefined,'admin')).body.pendingUpdate).toBe(true);
});
