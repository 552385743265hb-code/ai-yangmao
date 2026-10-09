/** 重置是一次发放事件，同名的不同日期不能并入历史活动。 */
export interface ResetEvent { platformId?: string; tags?: string[]; title?: string; publishedAt?: string | null; claimStart?: string | null; sourceTz?: string; evidence?: {url:string}; evidenceUrl?: string }
export function resetEventDay(o: ResetEvent): string | null {
  if (!o.tags?.includes('reset')) return null;
  // A model-applied tag cannot turn a recurring allowance into a separately dated reset.
  if (/每月|每天|每日|monthly|daily/i.test(o.title ?? '') && !/重置|reset/i.test(o.title ?? '')) return null;
  const url = o.evidence?.url ?? o.evidenceUrl ?? '';
  const tweet = url.match(/^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)/i)?.[1];
  const published = tweet ? new Date(Number((BigInt(tweet)>>22n)+1288834974657n)) : o.publishedAt ? new Date(o.publishedAt) : null;
  if (published && Number.isFinite(published.getTime())) {
    const tz = o.platformId==='openai' ? 'America/Los_Angeles' : o.sourceTz ?? 'UTC';
    let postedDay: string;
    try { postedDay = new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(published); }
    catch { postedDay = published.toISOString().slice(0,10); }
    // 明确的发放日可串起跨日预告/确认；过旧开始日可能来自模型复用历史条目。
    // 七天是保守的合并保护窗口，不是活动有效期。更久的回顾由管理员判断。
    if (o.claimStart && /^\d{4}-\d{2}-\d{2}$/.test(o.claimStart) &&
      Date.parse(postedDay)-Date.parse(o.claimStart) <= 7*86400_000) return o.claimStart;
    return postedDay;
  }
  return o.claimStart ?? null;
}
