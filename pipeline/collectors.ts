// 各类信源的采集器。线索类（AIHOT / HN / Reddit）只产出线索，官方页面才会交给模型抽取成羊毛。
import { XMLParser } from 'fast-xml-parser';
import { BROWSER_UA, UA, fetchRetry, fetchText, isLead, sleep } from './lib';
import type { LeadIn } from '../src/shared/ingest';

export interface Source { id: string; kind: string; url: string; tier: string; platformId: string | null; lastHash: string | null; lastText?: string | null; lastOkAt?: string | null; config?: Record<string, unknown>; deferThisRun?: boolean; platform: { id: string; name: string; status: string } | null; autoPublish: boolean }

const AIHOT_UA = { 'User-Agent': UA, Accept: 'application/json' };

/** AIHOT：Codex 重置接口 → 每条员工原帖一条线索；全部动态 → 命中羊毛关键词的条目。 */
export async function aihot(src: Source): Promise<LeadIn[]> {
  const res = await fetchRetry(src.url, { headers: AIHOT_UA, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json() as Record<string, unknown>;
  if (Array.isArray(j.events)) {
    // 只收最近 7 天的重置；同一次重置只取最新的一条原帖，避免重复
    const since = Date.now() - 7 * 86400_000;
    return (j.events as { title?: string; displayLabel?: string; occurredOn?: string; createdAt?: string; posts?: { url?: string; text?: string; originalText?: string }[] }[])
      .filter(e => Date.parse(e.occurredOn ?? e.createdAt ?? '') >= since)
      .flatMap(e => (e.posts ?? []).filter(p => p.url).slice(0, 1).map(p => ({
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
/** Hacker News：从上一次成功采集前两小时补查，分页走完才更新信源检查点。 */
export async function hn(src: Source): Promise<LeadIn[]> {
  const recent = Math.floor(Date.now() / 1000) - 8 * 3600;
  const prior = src.lastOkAt ? Math.floor(Date.parse(src.lastOkAt) / 1000) - 2 * 3600 : recent;
  const since = Number.isFinite(prior) ? Math.min(recent, prior) : recent;
  const out = new Map<string, LeadIn>();
  for (const q of HN_QUERIES) {
    for (let page = 0; ; page++) {
      const u = `https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=100&page=${page}&numericFilters=created_at_i>${since}&query=${encodeURIComponent(q)}`;
      const j = JSON.parse(await fetchText(u, { accept: 'application/json' })) as { hits: { objectID: string; title?: string; url?: string | null }[]; nbPages?: number };
      for (const h of j.hits) {
        if (!h.title || !isLead(h.title)) continue;
        const url = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
        out.set(url, { origin: 'hn', url, title: h.title.slice(0, 300), raw: `https://news.ycombinator.com/item?id=${h.objectID}` });
      }
      if (page + 1 >= (j.nbPages ?? 1)) break;
      if (page >= 99) throw new Error(`HN 查询 ${q} 超过 100 页，尚未完整补回，保留原采集检查点`);
    }
  }
  return [...out.values()];
}

// 正文字段里常是整段 HTML，不当 XML 往下解析，否则层级太深会报“Maximum nested tags exceeded”（2026-10-01 ElevenLabs 博客 RSS）
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', stopNodes: ['*.content:encoded', '*.description', '*.content', '*.summary'] });
interface FeedItem { title: string; link: string; summary: string }
export function parseFeed(body: string): FeedItem[] {
  if (/^\s*(<!doctype html|<html)/i.test(body)) throw new Error('这个 RSS 地址返回的是网页不是 RSS，请改成网页列表信源');
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
// Reddit 对同一来源的连续请求很敏感：串行、间隔 10 秒，遇到 429 等 60 秒重试一次。
let redditChain: Promise<unknown> = Promise.resolve();
export function reddit(src: Source): Promise<LeadIn[]> {
  const job = redditChain.then(() => redditOnce(src));
  redditChain = job.catch(() => undefined).then(() => sleep(10000));
  return job;
}
/** 配置了 Reddit 应用（免费）就走官方 API：云服务器的 IP 直接读 RSS 常被限流。 */
let redditToken: string | null = null;
async function redditApi(src: Source): Promise<LeadIn[]> {
  const sub = src.url.match(/\/r\/([^/]+)/)?.[1];
  if (!sub) throw new Error('信源地址里找不到子版块名');
  if (!redditToken) {
    const auth = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64');
    const r = await fetch('https://www.reddit.com/api/v1/access_token', { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
    if (!r.ok) throw new Error(`Reddit 授权失败 HTTP ${r.status}`);
    redditToken = (await r.json() as { access_token: string }).access_token;
  }
  const r = await fetch(`https://oauth.reddit.com/r/${sub}/new?limit=50&raw_json=1`, { headers: { Authorization: `Bearer ${redditToken}`, 'User-Agent': UA } });
  if (!r.ok) throw new Error(`Reddit API HTTP ${r.status}`);
  const j = await r.json() as { data: { children: { data: { title: string; permalink: string; url?: string; selftext?: string } }[] } };
  return j.data.children.map(c => c.data).filter(d => isLead(d.title))
    .map(d => ({ origin: 'reddit' as const, url: `https://www.reddit.com${d.permalink}`, title: d.title.slice(0, 300), raw: `${d.url ?? ''}\n${d.selftext ?? ''}`.slice(0, 4000) }));
}
async function redditOnce(src: Source): Promise<LeadIn[]> {
  if (process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) return redditApi(src);
  let body: string;
  try { body = await fetchText(src.url, { accept: 'application/atom+xml' }); }
  catch (e) { if (!String(e).includes('429')) throw e; await sleep(60000); body = await fetchText(src.url, { accept: 'application/atom+xml' }); }
  const items = parseFeed(body);
  return items.filter(i => i.link && isLead(i.title)).map(i => ({ origin: 'reddit' as const, url: i.link, title: i.title.slice(0, 300), raw: i.summary.slice(0, 4000) }));
}

/** 第三方 RSS 线索（LINUX DO 福利羊毛、IT之家 等）。config.filter = "all" 时整版都算线索（版块本身就是羊毛区）。 */
/**
 * 本地中继（Mac）用 curl 抓社区 RSS：LINUX DO 前面的 Cloudflare 会按 Node 请求特征和频率间歇性发人机验证（403），
 * 换 UA 也不稳定，curl 在同一台机器上稳定返回 200（2026-10-01 排查）。
 */
async function curlText(url: string): Promise<string> {
  const { execFile } = await import('node:child_process');
  const out = await new Promise<string>((resolve, reject) => execFile('curl', ['-sL', '--max-time', '30', '-A', BROWSER_UA, '-H', 'Accept: application/rss+xml,application/xml;q=0.9,*/*;q=0.8', '-w', '\n%{http_code}', url],
    { maxBuffer: 20 * 1024 * 1024 }, (err, stdout) => (err ? reject(err) : resolve(stdout))));
  const cut = out.lastIndexOf('\n'), code = Number(out.slice(cut + 1));
  if (code !== 200) throw new Error(`HTTP ${code}`);
  return out.slice(0, cut);
}

export async function feed(src: Source): Promise<LeadIn[]> {
  const cfg = (src.config ?? {}) as { origin?: LeadIn['origin']; filter?: 'all' | 'lead'; relay?: string };
  const items = parseFeed(cfg.relay === 'mac' ? await curlText(src.url) : await fetchText(src.url, { accept: 'application/rss+xml' }));
  return items
    .filter(i => i.link && (cfg.filter === 'all' || isLead(`${i.title} ${i.summary.slice(0, 300)}`)))
    .map(i => ({ origin: cfg.origin ?? 'media', url: i.link, title: i.title.slice(0, 300), raw: i.summary.slice(0, 4000) }));
}
