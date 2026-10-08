/** 重置是一次发放事件，同名的不同日期不能并入历史活动。 */
export interface ResetEvent { platformId?: string; tags?: string[]; title?: string; publishedAt?: string | null; claimStart?: string | null; sourceTz?: string; evidence?: {url:string}; evidenceUrl?: string }
export function resetEventDay(o: ResetEvent): string | null {
  if (!o.tags?.includes('reset')) return null;
  const url = o.evidence?.url ?? o.evidenceUrl ?? '';
  const tweet = url.match(/^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)/i)?.[1];
  const published = tweet ? new Date(Number((BigInt(tweet)>>22n)+1288834974657n)) : o.publishedAt ? new Date(o.publishedAt) : null;
  if (published && Number.isFinite(published.getTime())) {
    const tz = o.platformId==='openai' ? 'America/Los_Angeles' : o.sourceTz ?? 'UTC';
    try { return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(published); } catch { return published.toISOString().slice(0,10); }
  }
  return o.claimStart ?? null;
}
