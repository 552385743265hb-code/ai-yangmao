import { wechatAccounts, wechatBiz } from '../shared/official-review';
/** An owner approval backed by a WeChat article teaches the platform its official account (__biz). */
export async function learnWechatAccount(db: D1Database, platformId: string, evidenceUrl: string | null | undefined): Promise<boolean> {
  const biz = wechatBiz(evidenceUrl); if (!biz) return false;
  const row = await db.prepare('SELECT wechat FROM platforms WHERE id=?').bind(platformId).first<{ wechat: string | null }>();
  if (!row || wechatAccounts(row.wechat).includes(biz)) return false;
  const next = row.wechat?.trim() ? `${row.wechat.trim()},${biz}` : biz;
  const r = await db.prepare('UPDATE platforms SET wechat=? WHERE id=? AND wechat IS ?').bind(next, platformId, row.wechat).run();
  return (r.meta?.changes ?? 0) > 0;
}
