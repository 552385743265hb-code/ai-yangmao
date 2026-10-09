// 入库硬性去重：不依赖模型给的 ID 或 sameAs。同一平台下标题几乎一样，或证据链接相同且额度几乎一样，视为同一条。
const bigrams = (s: string) => {
  const t = s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
};
export function similarity(a: string, b: string): number {
  const A = bigrams(a), B = bigrams(b);
  if (!A.size || !B.size) return a.trim() === b.trim() ? 1 : 0;
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  return (2 * n) / (A.size + B.size);
}
export const normUrl = (value: string) => {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid|msclkid)$/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    const host=url.hostname.toLowerCase().replace(/^www\./,'');
    return (host==='twitter.com'?'x.com':host) + url.pathname.replace(/\/+$/,'') + url.search;
  } catch { return value.trim(); }
};
// 档位、金额不同的标题（如 2,999 元档 / 4,999 元档）只差几个数字，不能当成同一条
const digits = (s: string) => (s.normalize('NFKC').match(/\d[\d,.]*/g) ?? []).map(x => x.replace(/,/g, '')).sort().join('|');

export interface DedupeCandidate { id: string; platformId: string; title: string; valueText: string; evidenceUrl: string; eventDay?: string | null; claimStart?: string | null; sameOccurrenceAs?:string }
// 同日不同公告可能是第二次发放，也可能是传播进度。没有同活动判断时保留待审，不能硬合并。
export const ambiguousReset = (a: Omit<DedupeCandidate,'id'>, b:DedupeCandidate) =>
  !!(a.eventDay && a.eventDay===b.eventDay && normUrl(a.evidenceUrl)!==normUrl(b.evidenceUrl) && a.sameOccurrenceAs!==b.id);
export const differentOccurrence = (a: Omit<DedupeCandidate, 'id'>, b: Omit<DedupeCandidate, 'id'>) =>
  !!((a.eventDay && b.eventDay && a.eventDay !== b.eventDay) ||
    (a.claimStart && b.claimStart && a.claimStart !== b.claimStart && normUrl(a.evidenceUrl) !== normUrl(b.evidenceUrl)));

export function findDuplicate<T extends DedupeCandidate>(o: Omit<DedupeCandidate, 'id'>, existing: T[]): T | undefined {
  return existing.find(e => e.platformId === o.platformId && !differentOccurrence(o,e) && !ambiguousReset(o,e) && (
    (digits(e.title) === digits(o.title) && similarity(e.title, o.title) >= 0.85) ||
    (normUrl(e.evidenceUrl) === normUrl(o.evidenceUrl) && digits(e.valueText) === digits(o.valueText) && similarity(e.valueText, o.valueText) >= 0.85)));
}

/** 补全后的精确冲突只交审核处理，不能静默覆盖两个已有草稿或重复上架。 */
export function sameBenefit(a: {platformId:string;title:string;valueText:string;type:string;claimMethod:string;claimStart?:string|null;claimEnd?:string|null;publishedAt?:string|null;tags?:string[];evidence:{url:string}}, b: typeof a): boolean {
  const text=(value:string)=>value.normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
  return a.platformId===b.platformId && a.type===b.type && a.claimMethod===b.claimMethod
    && normUrl(a.evidence.url)===normUrl(b.evidence.url) && text(a.title)===text(b.title) && text(a.valueText)===text(b.valueText)
    && (a.claimStart??null)===(b.claimStart??null) && (a.claimEnd??null)===(b.claimEnd??null)
    && (!(a.tags?.includes('reset')||b.tags?.includes('reset')) || (a.publishedAt??null)===(b.publishedAt??null));
}
