// 采集管线的公共工具：网站写入接口、抓取（含 Jina Reader 兜底）、正文精简、关键词、哈希。
import { createHash } from 'node:crypto';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

export const UA = 'Mozilla/5.0 (compatible; ai-yangmao-bot/0.1; +https://ai-yangmao.com)';
const API = (process.env.API_BASE ?? 'https://ai-yangmao.com').replace(/\/$/, '');
const TOKEN = process.env.INGEST_TOKEN ?? '';

export async function api<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}/api/ingest${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`写入接口 ${path} 返回 ${res.status}：${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

/** 网络层出错（不是 HTTP 错误码）时隔几秒重试，最多 2 次。 */
export async function fetchRetry(url: string, init: RequestInit, tries = 3): Promise<Response> {
  for (let i = 1; ; i++) {
    try { return await fetch(url, init); }
    catch (e) {
      if (i >= tries) throw new Error(`网络错误（已重试 ${tries - 1} 次）：${(e as Error & { cause?: { code?: string } }).cause?.code ?? (e as Error).message}`);
      await new Promise(r => setTimeout(r, 3000 * i));
    }
  }
}

export async function fetchText(url: string, opts: { accept?: string; timeoutMs?: number } = {}): Promise<string> {
  const res = await fetchRetry(url, { headers: { 'User-Agent': UA, Accept: opts.accept ?? '*/*', 'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8' }, signal: AbortSignal.timeout(opts.timeoutMs ?? 30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/** 用 Readability（Firefox 阅读模式同款）抽正文，参考 AIHOT 的做法。 */
export function readableText(html: string, url: string): string {
  try {
    const { document } = parseHTML(html);
    const article = new Readability(document as unknown as Document, { charThreshold: 200, keepClasses: false }).parse();
    return article?.content ? htmlToText(article.content) : '';
  } catch { return ''; }
}

/**
 * 抓官方页面正文，三层兜底：
 * 1. 直接抓取，Readability 正文和整页纯文本里，取羊毛相关内容更多的那个（Readability 有时会丢掉定价说明）；
 * 2. 字数仍然太少（多半是脚本渲染的页面），改用 Jina Reader，要 Markdown 格式以保留表格结构。
 */
export async function fetchPage(url: string): Promise<{ text: string; via: 'readability' | 'direct' | 'jina' }> {
  let text = '', via: 'readability' | 'direct' = 'direct';
  try {
    const html = await fetchText(url, { accept: 'text/html' });
    const full = htmlToText(html), read = readableText(html, url);
    // 哪个版本保留的羊毛相关内容多就用哪个；一样多时用更干净的 Readability
    if (read.length >= 800 && relevantText(read).length >= relevantText(full).length) { text = read; via = 'readability'; } else text = full;
  } catch { /* 直接抓失败就走 Jina */ }
  if (text.length >= 800) return { text, via };
  const headers: Record<string, string> = { 'User-Agent': UA, 'X-Return-Format': 'markdown', Accept: 'text/plain', 'X-Locale': 'en-US' };
  if (process.env.JINA_API_KEY) headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
  const res = await fetch(`https://r.jina.ai/${url}`, { headers, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`直接抓取只有 ${text.length} 字，Jina Reader 返回 ${res.status}`);
  const body = (await res.text()).replace(/^[\s\S]*?Markdown Content:\n/, ''); // 去掉 Jina 的元信息头
  return { text: body.replace(/\n\s*\n+/g, '\n').trim(), via: 'jina' };
}

// 羊毛关键词两档：
// FREEBIE 用于官方页面里挑相关句子，宽一点，单独的 free 也算；
// LEAD 用于第三方线索（AIHOT / HN / Reddit）的标题，要求明确的搭配，避免 credit agreement 这类误判。
export const FREEBIE = /(免费|赠送|额度|限免|重置|体验金|代金券|优惠券|新人|新用户|充值.{0,6}送|福利|\bfree\b|credits?\b|bonus|reset|promo|giveaway|unlimited|no\s+(additional\s+)?(cost|charge)|at\s+no\s+charge|allocation|rate\s+limits?|quota|trial)/i;
export const LEAD = /(免费|赠送|送.{0,6}(额度|token|积分|会员|体验金|代金券)|限免|限时免费|额度重置|重置卡|体验金|代金券|充值.{0,6}送|free\s+(tier|credits?|tokens?|trial|access|usage|quota|plan|month|week|for\s+(everyone|all|free\s+users))|\$\s?\d[\d,]*\s+(in\s+)?(free\s+)?(api\s+)?credits?|credits?\s+(grant|giveaway|bonus)|rate\s+limits?\s+(reset|doubled|increased)|resets?\s+(rate|usage|limits)|giveaway|promo\s+code|unlimited\s+(usage|generations?|access))/i;
export const isFreebie = (s: string) => FREEBIE.test(s);
export const isLead = (s: string) => LEAD.test(s);
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** 只保留和羊毛相关的句子（前后各带一行上下文），用来算哈希和喂给模型：页面其他部分变了不会触发。 */
export function relevantText(text: string, max = 12000): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const keep = new Set<number>();
  lines.forEach((l, i) => { if (isFreebie(l)) [i - 1, i, i + 1].forEach(j => { if (j >= 0 && j < lines.length) keep.add(j); }); });
  return [...keep].sort((a, b) => a - b).map(i => lines[i]).join('\n').slice(0, max);
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || sha256(s).slice(0, 10);
}
