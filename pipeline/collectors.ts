// 各类信源的采集器。线索类（AIHOT / HN / Reddit）只产出线索，官方页面才会交给模型抽取成羊毛。
import { XMLParser } from 'fast-xml-parser';
import { UA, fetchText, isLead, sleep } from './lib';
import type { LeadIn } from '../src/shared/ingest';

export interface Source { id: string; kind: string; url: string; tier: string; platformId: string | null; lastHash: string | null; lastText?: string | null; platform: { id: string; name: string; status: string } | null; autoPublish: boolean }

const AIHOT_UA = { 'User-Agent': UA, Accept: 'application/json' };

/** AIHOT：Codex 重置接口 → 每条员工原帖一条线索；全部动态 → 命中羊毛关键词的条目。 */
export async function aihot(src: Source): Promise<LeadIn[]> {
  const res = await fetch(src.url, { headers: AIHOT_UA, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json() as Record<string, unknown>;
  if (Array.isArray(j.events)) {
    return (j.events as { title?: string; displayLabel?: string; occurredOn?: string; posts?: { url?: string; text?: string; originalText?: string }[] }[])
      .flatMap(e => (e.posts ?? []).filter(p => p.url).map(p => ({
        origin: 'aihot' as const, url: p.url!, title: `Codex ${e.displayLabel ?? ''}：${e.title ?? ''}${e.occurredOn ? `（${e.occurredOn}）` : ''}`.slice(0, 300),
        raw: [p.text, p.originalText].filter(Boolean).join('\n').slice(0, 4000),
      })));
  }
  const items = (j.items ?? []) as { title?: string; summary?: string | null; links?: { original?: string }; source?: { name?: string } }[];
  return items
    .filter(i => i.links?.original && isLead(i.title ?? ''))
    .map(i => ({ origin: 'aihot' as const, url: i.links!.original!, title: (i.title ?? '').slice(0, 300), raw: `${i.source?.name ?? ''}\n${i.summary ?? ''}`.slice(0, 4000) }));
}

const HN_QUERIES = ['free credits', 'free tier', 'free tokens', 'rate limits reset', 'free trial AI', 'credits giveaway'];
/** Hacker News：官方搜索接口，只看最近 8 小时（每 6 小时跑一次，留一点重叠）。 */
export async function hn(_src: Source): Promise<LeadIn[]> {
  const since = Math.floor(Date.now() / 1000) - 8 * 3600;
  const out = new Map<string, LeadIn>();
  for (const q of HN_QUERIES) {
    const u = `https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=50&numericFilters=created_at_i>${since}&query=${encodeURIComponent(q)}`;
    const j = JSON.parse(await fetchText(u, { accept: 'application/json' })) as { hits: { objectID: string; title?: string; url?: string | null }[] };
    for (const h of j.hits) {
      if (!h.title || !isLead(h.title)) continue;
      const url = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
      out.set(url, { origin: 'hn', url, title: h.title.slice(0, 300), raw: `https://news.ycombinator.com/item?id=${h.objectID}` });
    }
  }
  return [...out.values()];
}

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
interface FeedItem { title: string; link: string; summary: string }
export function parseFeed(body: string): FeedItem[] {
  const d = xml.parse(body);
  const arr = <T>(x: T | T[] | undefined): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const text = (x: unknown): string => (typeof x === 'string' ? x : x && typeof x === 'object' && '#text' in x ? String((x as { '#text': unknown })['#text']) : '');
  if (d.feed) {
    return arr(d.feed.entry).map((e: Record<string, unknown>) => {
      const links = arr(e.link as { href?: string; rel?: string } | { href?: string; rel?: string }[]);
      const link = links.find(l => !l.rel || l.rel === 'alternate')?.href ?? links[0]?.href ?? '';
      return { title: text(e.title), link, summary: text(e.content ?? e.summary).replace(/<[^>]+>/g, ' ').slice(0, 3000) };
    });
  }
  return arr(d.rss?.channel?.item).map((i: Record<string, unknown>) => ({ title: text(i.title), link: text(i.link), summary: text(i.description).replace(/<[^>]+>/g, ' ').slice(0, 3000) }));
}

/** Reddit：子版块 RSS，标题命中羊毛关键词的帖子作为线索。 */
// Reddit 对同一来源的连续请求很敏感：串行、间隔 4 秒，遇到 429 等 20 秒重试一次。
let redditChain: Promise<unknown> = Promise.resolve();
export function reddit(src: Source): Promise<LeadIn[]> {
  const job = redditChain.then(() => redditOnce(src));
  redditChain = job.catch(() => undefined).then(() => sleep(4000));
  return job;
}
async function redditOnce(src: Source): Promise<LeadIn[]> {
  let body: string;
  try { body = await fetchText(src.url, { accept: 'application/atom+xml' }); }
  catch (e) { if (!String(e).includes('429')) throw e; await sleep(20000); body = await fetchText(src.url, { accept: 'application/atom+xml' }); }
  const items = parseFeed(body);
  return items.filter(i => i.link && isLead(i.title)).map(i => ({ origin: 'reddit' as const, url: i.link, title: i.title.slice(0, 300), raw: i.summary.slice(0, 4000) }));
}
