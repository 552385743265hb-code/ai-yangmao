import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/d1';
import worker from '../src/worker/index';
import * as s from '../src/db/schema';
import { identityDb } from './fixtures/identity/db';
import { displayOffer } from './fixtures/identity/offer';

let f: ReturnType<typeof identityDb>;
const env = () => ({ DB: f.db, ADMIN_TOKEN: 'admin-test-token-123', INGEST_TOKEN: 'ingest-test-token-123', IDENTITY_MODE: 'off' } as Parameters<typeof worker.fetch>[1]);
async function request(path: string, body?: unknown, headers: Record<string, string> = {}) {
  return worker.fetch(new Request('https://local.test' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://local.test', 'CF-Connecting-IP': '192.0.2.1', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), env(), {} as ExecutionContext);
}
async function session(ip = '192.0.2.1') {
  const response = await request('/api/community/session', {}, { 'CF-Connecting-IP': ip });
  expect(response.status).toBe(200);
  return { cookie: response.headers.get('set-cookie')!.split(';')[0], user: await response.json() as { name: string } };
}
const post = (cookie: string, content = '实薅成功，额度到账。', requestId = crypto.randomUUID()) => request('/api/offers/vendor-signup/comments', { content, requestId }, { Cookie: cookie });
beforeEach(async () => {
  f = identityDb();
  await drizzle(f.db).insert(s.offers).values({ ...displayOffer(), reviewState: 'approved' });
});
afterEach(() => { vi.restoreAllMocks(); f.sqlite.close(); });

describe('public anonymous ranch comments', () => {
  it('retries a six-digit ID collision instead of assigning two visitors the same name', async () => {
    const original = crypto.getRandomValues.bind(crypto);
    const values = [42, 42, 43];
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(((array: any) => {
      if (array instanceof Uint32Array && array.length === 1) { array[0] = values.shift() ?? 44; return array; }
      return original(array);
    }) as typeof crypto.getRandomValues);
    expect((await session()).user.name).toBe('羊毛党100042');
    expect((await session()).user.name).toBe('羊毛党100043');
  });
  it('assigns a stable server identity with an HttpOnly cookie and publishes to every reader', async () => {
    const a = await session();
    expect(a.user.name).toMatch(/^羊毛党\d{6}$/);
    const resumed = await request('/api/community/session', {}, { Cookie: a.cookie });
    expect(await resumed.json()).toEqual(a.user);
    const response = await post(a.cookie);
    expect(response.status).toBe(201);
    const published = await response.json() as any;
    const list = await request('/api/offers/vendor-signup/comments');
    expect(list.headers.get('Cache-Control')).toBe('no-store');
    expect(await list.json()).toMatchObject({ comments: [{ id: published.comment.id, author: a.user.name, content: '实薅成功，额度到账。' }], nextCursor: null });
    expect(JSON.stringify(published)).not.toMatch(/token|request_key|anonymous_id|192\.0\.2/);
    const fresh = await request('/api/community/session', {}, { 'CF-Connecting-IP': '192.0.2.2' });
    expect(fresh.headers.get('set-cookie')).toMatch(/HttpOnly/);
    expect(fresh.headers.get('set-cookie')).toMatch(/SameSite=Strict/);
    expect(fresh.headers.get('set-cookie')).toMatch(/Secure/);
    expect((await fresh.json() as any).name).not.toBe(a.user.name);
  });
  it('requires a valid server session and rejects a forged author or cross-origin submission', async () => {
    expect((await post('ym_anon=forged')).status).toBe(401);
    const a = await session();
    expect((await request('/api/offers/vendor-signup/comments', { content: '冒用', requestId: crypto.randomUUID(), author: 'admin' }, { Cookie: a.cookie })).status).toBe(400);
    expect((await request('/api/community/session', {}, { Origin: 'https://attacker.test' })).status).toBe(403);
    expect((await request('/api/offers/vendor-signup/comments', { content: '攻击', requestId: crypto.randomUUID() }, { Cookie: a.cookie, Origin: 'https://attacker.test' })).status).toBe(403);
  });
  it('validates length and whitespace without changing user content into HTML', async () => {
    const a = await session();
    expect((await post(a.cookie, '  \n ')).status).toBe(400);
    expect((await post(a.cookie, '薅'.repeat(501))).status).toBe(400);
    const raw = '<img src=x onerror=alert(1)>\n体验较慢';
    expect((await post(a.cookie, raw)).status).toBe(201);
    expect(await (await request('/api/offers/vendor-signup/comments')).json()).toMatchObject({ comments: [{ content: raw }] });
  });
  it('makes retried submissions idempotent and rejects reuse with different content', async () => {
    const a = await session(), id = crypto.randomUUID();
    const first = await post(a.cookie, '第一条体验', id);
    const retry = await post(a.cookie, '第一条体验', id);
    expect(first.status).toBe(201); expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual(await first.json());
    expect((await post(a.cookie, '换了内容', id)).status).toBe(409);
    expect((await (await request('/api/offers/vendor-signup/comments')).json() as any).comments).toHaveLength(1);
  });
  it('limits rapid posting and stops cookie rotation from evading the IP limit', async () => {
    const a = await session();
    expect((await post(a.cookie)).status).toBe(201);
    const rapid = await post(a.cookie, '另一条体验');
    expect(rapid.status).toBe(429); expect(Number(rapid.headers.get('Retry-After'))).toBeGreaterThan(0);
    // Independent sessions on the same address share a network posting budget.
    for (let n = 0; n < 9; n++) {
      const b = await session();
      expect((await post(b.cookie, `体验 ${n}`)).status).toBe(201);
    }
    const b = await session();
    expect((await post(b.cookie, '换 Cookie 刷屏')).status).toBe(429);
  });
  it('does not expose or allow posting on an unpublished offer or platform', async () => {
    const a = await session();
    f.sqlite.exec("UPDATE offers SET review_state='pending'");
    expect((await request('/api/offers/vendor-signup/comments')).status).toBe(404);
    expect((await post(a.cookie)).status).toBe(404);
    f.sqlite.exec("UPDATE offers SET review_state='approved'; UPDATE platforms SET status='pending'");
    expect((await request('/api/offers/vendor-signup/comments')).status).toBe(404);
    expect((await post(a.cookie)).status).toBe(404);
  });
  it('keeps earlier visitor comments visible when an old offer ID is routed to its canonical offer', async () => {
    const a=await session();await post(a.cookie,'合并前的体验');
    await drizzle(f.db).insert(s.offers).values({...displayOffer(),id:'canonical',reviewState:'approved'});
    f.sqlite.exec("INSERT INTO benefit_entities(id,platform_id,canonical_offer_id) VALUES('root','vendor','canonical'),('child','vendor','vendor-signup'); UPDATE benefit_entities SET state='merged',merged_into='root' WHERE id='child'");
    const canonical=await (await request('/api/offers/canonical/comments')).json() as any;
    expect(canonical.comments.map((c:any)=>c.content)).toEqual(['合并前的体验']);
    expect(await (await request('/api/offers/vendor-signup/comments')).json()).toEqual(canonical);
    const response=await request('/api/admin/offers/vendor-signup/comments',{content:'合并后的体验',requestId:crypto.randomUUID()},{Authorization:'Bearer admin-test-token-123'});
    expect(response.status).toBe(201);
    expect(f.sqlite.prepare('SELECT offer_id FROM offer_comments ORDER BY id DESC LIMIT 1').get()?.offer_id).toBe('canonical');
  });
  it('puts admin and visitor messages in one list and allows only administrators to remove them', async () => {
    const a = await session(); await post(a.cookie);
    const admin = await request('/api/admin/offers/vendor-signup/comments', { content: '管理员的实薅体验', requestId: crypto.randomUUID() }, { Authorization: 'Bearer admin-test-token-123' });
    expect(admin.status).toBe(201);
    const adminComment = (await admin.json() as any).comment;
    let list = await (await request('/api/offers/vendor-signup/comments')).json() as any;
    expect(list.comments.map((c: any) => c.author)).toEqual(['admin', a.user.name]);
    expect((await request(`/api/admin/comments/${adminComment.id}/delete`, {}, { Cookie: a.cookie })).status).toBe(401);
    expect((await request(`/api/admin/comments/${adminComment.id}/delete`, {}, { Authorization: 'Bearer admin-test-token-123' })).status).toBe(200);
    list = await (await request('/api/offers/vendor-signup/comments')).json() as any;
    expect(list.comments).toHaveLength(1); expect(list.comments[0].author).toBe(a.user.name);
  });
  it('keeps the original admin note in the same stream when the existing editing API is used', async () => {
    const headers = { Authorization: 'Bearer admin-test-token-123' };
    expect((await request('/api/admin/offers/vendor-signup/note', { note: '原有心得' }, headers)).status).toBe(200);
    expect(await (await request('/api/offers/vendor-signup/comments')).json()).toMatchObject({ comments: [{ author: 'admin', content: '原有心得' }] });
    await request('/api/admin/offers/vendor-signup/note', { note: '更新的心得' }, headers);
    expect((await (await request('/api/offers/vendor-signup/comments')).json() as any).comments).toHaveLength(1);
    await request('/api/admin/offers/vendor-signup/note', { note: '' }, headers);
    expect((await (await request('/api/offers/vendor-signup/comments')).json() as any).comments).toHaveLength(0);
  });
  it('paginates without repeating or dropping comments, including when a comment is removed', async () => {
    const headers = { Authorization: 'Bearer admin-test-token-123' };
    for (let n = 1; n <= 23; n++) await request('/api/admin/offers/vendor-signup/comments', { content: `体验 ${n}`, requestId: crypto.randomUUID() }, headers);
    const page = await (await request('/api/offers/vendor-signup/comments')).json() as any;
    expect(page.comments).toHaveLength(20); expect(page.comments[0].content).toBe('体验 23');
    await request(`/api/admin/comments/${page.comments[0].id}/delete`, {}, headers);
    const next = await (await request('/api/offers/vendor-signup/comments?before=' + page.nextCursor)).json() as any;
    expect(next.comments.map((c: any) => c.content)).toEqual(['体验 3', '体验 2', '体验 1']);
    expect(next.nextCursor).toBeNull();
  });
  it('leaves the old admin note intact if synchronizing its comment fails', async () => {
    f.sqlite.exec("UPDATE offers SET admin_note='原有内容'");
    f.inject(sql => { if (sql.startsWith('INSERT INTO offer_comments')) throw new Error('fixture write failure'); });
    expect((await request('/api/admin/offers/vendor-signup/note', {note:'新内容'}, {Authorization:'Bearer admin-test-token-123'})).status).toBe(500);
    f.inject();
    expect(f.sqlite.prepare('SELECT admin_note FROM offers').get()?.admin_note).toBe('原有内容');
  });
  it('rejects oversized bodies and invalid pagination without writing a comment', async () => {
    const a = await session();
    expect((await post(a.cookie, '大'.repeat(5000))).status).toBe(413);
    expect((await request('/api/offers/vendor-signup/comments?before=-1')).status).toBe(400);
    expect(f.sqlite.prepare('SELECT count(*) n FROM offer_comments').get()?.n).toBe(0);
  });
});
