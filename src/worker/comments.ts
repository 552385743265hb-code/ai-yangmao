import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import type { Env } from './index';
import { canonicalOfferPredicate, resolveCanonicalOffer } from './identity/canonical';
import { sha256 } from '../shared/identity/normalize';

type Bindings = { Bindings: Env };
type C = Context<Bindings> | Context<{ Bindings: Env; Variables: { role: 'admin' | 'reviewer'; who: string } }>;
type Comment = { id: number; offer_id: string; anonymous_id: number | null; public_id?: number | null; content: string; request_key: string; created_at: string; deleted_at: string | null };
type User = { id: number; public_id: number };
const COOKIE = 'ym_anon';
const YEAR = 365 * 86400;
const input = z.object({ content: z.string().trim().min(1).max(500), requestId: z.uuid() }).strict();
const publicComment = (r: Comment) => ({ id: r.id, author: r.anonymous_id == null ? 'admin' : `羊毛党${r.public_id}`, content: r.content, createdAt: r.created_at });
const joinedComments = 'SELECT c.*,u.public_id FROM offer_comments c LEFT JOIN anonymous_comment_users u ON u.id=c.anonymous_id';
// Keep messages attached to the original row, so merge/rollback never rewrites user history.
const commentFamily = `WITH RECURSIVE family(id,offer_id) AS (
  SELECT id,canonical_offer_id FROM benefit_entities WHERE canonical_offer_id=?1 AND state='active'
  UNION SELECT e.id,e.canonical_offer_id FROM benefit_entities e JOIN family f ON e.merged_into=f.id
  WHERE e.platform_id=(SELECT platform_id FROM offers WHERE id=?1)
), related(id) AS (
  SELECT ?1 UNION SELECT offer_id FROM family WHERE offer_id IS NOT NULL
  UNION SELECT alias_key FROM identity_aliases WHERE namespace='legacy_offer_id' AND status='active' AND entity_id IN (SELECT id FROM family)
) `;

export const commentMutationGuard: MiddlewareHandler<Bindings> = async (c, next) => {
  c.header('Cache-Control', 'no-store');
  const origin = c.req.header('Origin');
  if ((origin && origin !== new URL(c.req.url).origin) || c.req.header('Sec-Fetch-Site') === 'cross-site') return c.json({ error: '请在牧场页面内提交留言' }, 403);
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header('Content-Type') ?? '')) return c.json({ error: '请使用 JSON 提交留言' }, 415);
  await next();
};
export const commentBodyLimit = bodyLimit({ maxSize: 4096, onError: c => c.json({ error: '留言最多 500 字' }, 413) });

async function currentUser(c: C): Promise<User | null> {
  const token = getCookie(c, COOKIE);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return c.env.DB.prepare('SELECT id,public_id FROM anonymous_comment_users WHERE token_hash=? AND expires_at>?').bind(await sha256(token), Date.now()).first<User>();
}
async function networkKey(c: C) {
  // Cloudflare supplies the address; only a keyed hash is stored, never a raw IP.
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(c.env.ADMIN_TOKEN), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('ranch-comments:' + (c.req.header('CF-Connecting-IP') ?? 'local')));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
async function rate(c: C, key: string, maximum: number, windowMs: number) {
  const now = Date.now();
  const reserved = await c.env.DB.prepare(`INSERT INTO comment_rate_limits(key,used,expires_at) VALUES(?1,1,?2)
    ON CONFLICT(key) DO UPDATE SET used=CASE WHEN expires_at<=?3 THEN 1 ELSE used+1 END,
    expires_at=CASE WHEN expires_at<=?3 THEN excluded.expires_at ELSE expires_at END
    WHERE expires_at<=?3 OR used<?4 RETURNING key`).bind(key, now + windowMs, now, maximum).first();
  if (reserved) return null;
  const existing = await c.env.DB.prepare('SELECT expires_at FROM comment_rate_limits WHERE key=?').bind(key).first<{ expires_at: number }>();
  c.header('Retry-After', String(Math.max(1, Math.ceil(((existing?.expires_at ?? now + windowMs) - now) / 1000))));
  return c.json({ error: '留言太频繁，请稍后再试' }, 429);
}
async function visibleOffer(c: C, ref: string) {
  let route;
  try { route = await resolveCanonicalOffer(c.env.DB, ref); } catch { return null; }
  const row = await c.env.DB.prepare(`SELECT offers.id FROM offers JOIN platforms p ON p.id=offers.platform_id
    WHERE offers.id=? AND offers.review_state='approved' AND p.status='approved' AND ${canonicalOfferPredicate}`).bind(route.offerId).first<{ id: string }>();
  return row?.id ?? null;
}

export const commentRoutes = new Hono<Bindings>();
commentRoutes.post('/community/session', commentMutationGuard, commentBodyLimit, async c => {
  const existing = await currentUser(c);
  if (existing) return c.json({ name: `羊毛党${existing.public_id}` });
  const limited = await rate(c, 'session:' + await networkKey(c), 30, 3600e3);
  if (limited) return limited;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  let user: User | null = null;
  const tokenHash = await sha256(token);
  for (let attempt = 0; attempt < 8 && !user; attempt++) {
    const publicId = 100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000;
    user = await c.env.DB.prepare('INSERT INTO anonymous_comment_users(public_id,token_hash,created_at,expires_at) VALUES(?,?,?,?) ON CONFLICT(public_id) DO NOTHING RETURNING id,public_id')
      .bind(publicId, tokenHash, new Date().toISOString(), Date.now() + YEAR * 1000).first<User>();
  }
  if (!user) throw new Error('anonymous identity allocation failed');
  setCookie(c, COOKIE, token, { path: '/', httpOnly: true, secure: new URL(c.req.url).protocol === 'https:', sameSite: 'Strict', maxAge: YEAR });
  await c.env.DB.prepare('DELETE FROM comment_rate_limits WHERE key IN (SELECT key FROM comment_rate_limits WHERE expires_at<? LIMIT 100)').bind(Date.now()).run();
  return c.json({ name: `羊毛党${user.public_id}` });
});
commentRoutes.get('/offers/:ref/comments', async c => {
  c.header('Cache-Control', 'no-store');
  const offerId = await visibleOffer(c, c.req.param('ref'));
  if (!offerId) return c.json({ error: '没有这条羊毛' }, 404);
  const before = c.req.query('before');
  if (before && (!/^\d+$/.test(before) || !Number.isSafeInteger(Number(before)) || Number(before) < 1)) return c.json({ error: '分页参数不正确' }, 400);
  const rows = await c.env.DB.prepare(commentFamily + joinedComments + ` WHERE c.offer_id IN (SELECT id FROM related) AND c.deleted_at IS NULL AND c.id<?2
    AND EXISTS(SELECT 1 FROM offers original WHERE original.id=c.offer_id AND original.review_state='approved'
      AND original.platform_id=(SELECT platform_id FROM offers WHERE id=?1)) ORDER BY c.id DESC LIMIT 21`)
    .bind(offerId, before ? Number(before) : Number.MAX_SAFE_INTEGER).all<Comment>();
  const page = rows.results.slice(0, 20);
  return c.json({ comments: page.map(publicComment), nextCursor: rows.results.length > 20 ? page.at(-1)!.id : null });
});
commentRoutes.post('/offers/:ref/comments', commentMutationGuard, commentBodyLimit, c => createComment(c, c.req.param('ref')));

/** Admin authority is supplied only by the authenticated administrator router. */
export async function createComment(c: C, ref: string, administrator = false) {
  c.header('Cache-Control', 'no-store');
  const offerId = await visibleOffer(c, ref);
  if (!offerId) return c.json({ error: '没有这条羊毛' }, 404);
  const user = administrator ? null : await currentUser(c);
  if (!administrator && !user) return c.json({ error: '匿名身份已失效，请重新获取后提交' }, 401);
  const body = input.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: '请填写 1–500 字的心得' }, 400);
  const { content, requestId } = body.data;
  const requestKey = `${administrator ? 'admin' : `user:${user!.id}`}:${requestId}`;
  const previous = await c.env.DB.prepare(joinedComments + ' WHERE c.request_key=?').bind(requestKey).first<Comment>();
  if (previous) {
    if (previous.offer_id !== offerId || previous.content !== content || previous.deleted_at) return c.json({ error: '这次留言已提交或已被移除，请刷新后重试' }, 409);
    return c.json({ comment: publicComment(previous) });
  }
  if (user) {
    const duplicate = await c.env.DB.prepare('SELECT id FROM offer_comments WHERE anonymous_id=? AND offer_id=? AND deleted_at IS NULL AND content=? AND created_at>? LIMIT 1')
      .bind(user.id, offerId, content, new Date(Date.now() - 86400e3).toISOString()).first();
    if (duplicate) return c.json({ error: '你已经发表过这条心得' }, 409);
    const ip = await networkKey(c);
    for (const [key, max, window] of [[`user-minute:${user.id}`, 1, 60e3], [`user-day:${user.id}`, 20, 86400e3], [`ip-ten-minutes:${ip}`, 10, 600e3], [`ip-day:${ip}`, 100, 86400e3]] as const) {
      const limited = await rate(c, key, max, window);
      if (limited) return limited;
    }
  }
  const row = await c.env.DB.prepare(`INSERT INTO offer_comments(offer_id,anonymous_id,content,request_key,created_at)
    SELECT offers.id,?2,?3,?4,?5 FROM offers JOIN platforms p ON p.id=offers.platform_id
    WHERE offers.id=?1 AND offers.review_state='approved' AND p.status='approved' AND ${canonicalOfferPredicate}
    ON CONFLICT(request_key) DO NOTHING RETURNING *`).bind(offerId, user?.id ?? null, content, requestKey, new Date().toISOString()).first<Comment>();
  if (row) return c.json({ comment: publicComment({ ...row, public_id: user?.public_id }) }, 201);
  const concurrent = await c.env.DB.prepare(joinedComments + ' WHERE c.request_key=?').bind(requestKey).first<Comment>();
  if (concurrent && concurrent.offer_id === offerId && concurrent.content === content && !concurrent.deleted_at) return c.json({ comment: publicComment(concurrent) });
  return c.json({ error: '条目状态已变化，请刷新后重试' }, 409);
}

export function legacyNoteStatement(db: D1Database, offerId: string, note: string | null, at: string) {
  if (!note) return db.prepare('UPDATE offer_comments SET deleted_at=? WHERE request_key=?').bind(at, 'legacy:' + offerId);
  return db.prepare(`INSERT INTO offer_comments(offer_id,anonymous_id,content,request_key,created_at) VALUES(?,NULL,?,?,?)
    ON CONFLICT(request_key) DO UPDATE SET content=excluded.content,deleted_at=NULL`).bind(offerId, note, 'legacy:' + offerId, at);
}
export async function removeComment(c: C, id: string) {
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) return c.json({ error: '留言编号不正确' }, 400);
  const row = await c.env.DB.prepare('SELECT * FROM offer_comments WHERE id=?').bind(Number(id)).first<Comment>();
  if (!row) return c.json({ error: '没有这条留言' }, 404);
  const statements = [c.env.DB.prepare('UPDATE offer_comments SET deleted_at=coalesce(deleted_at,?) WHERE id=?').bind(new Date().toISOString(), row.id)];
  if (row.request_key === 'legacy:' + row.offer_id) statements.push(c.env.DB.prepare('UPDATE offers SET admin_note=NULL WHERE id=?').bind(row.offer_id));
  await c.env.DB.batch(statements);
  return c.json({ ok: true });
}
