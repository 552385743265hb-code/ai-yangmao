import { fetchPublic } from './safe-fetch';
import { htmlToText, sha256, UA, type FetchedPage } from './lib';
import { fetchedSource } from './fetch-evidence';
import { VALUATION_FX_SNAPSHOT, VALUATION_PRICE_CATALOG, valuationPriceIsFresh,
  type ValuationFactCatalog } from '../src/shared/valuation-catalog';
import type { SourceFetch } from '../src/shared/identity/fetch-evidence';
import { deriveEcbValuationFx } from '../src/shared/valuation-engine';

export interface ValuationCollectedSource {
  id: string;
  url: string;
  text: string;
  sourceFetch: SourceFetch;
  checkedAt: string;
  role: 'price' | 'fx';
  /** Convenience output only: the ingest service must recompute these from verified XML. */
  catalogFacts?: ValuationFactCatalog;
}
export type ValuationSourceCache = Map<string, Promise<ValuationCollectedSource | null>>;
export interface CollectValuationSourceOptions {
  deadlineAt?: number;
  now?: Date | string;
  /** Reuse for the duration of a collector run; failures are cached too. */
  cache?: ValuationSourceCache;
}
const FX_URL = VALUATION_FX_SNAPSHOT.source.url;
const allowedPriceUrls = [...new Set(VALUATION_PRICE_CATALOG.flatMap(p => p.sources.map(s => s.url)))];
const allowedUrls = new Set([...allowedPriceUrls, FX_URL]);

/** A fixed allowlist from reviewed price sources; never accepts a URL authored by extraction. */
export function valuationSourceUrlAllowed(url: string): boolean { return allowedUrls.has(url); }

/** Official daily ECB quotes: return derived rates with original XML provenance, never a model-authored ratio. */
export function parseEcbFxSources(xml: string, checkedAt: string): ValuationFactCatalog | null {
  return deriveEcbValuationFx(xml, checkedAt)?.catalog ?? null;
}

async function collectOne(url: string, role: 'price' | 'fx', checkedAt: string, deadlineAt: number): Promise<ValuationCollectedSource | null> {
  if (!valuationSourceUrlAllowed(url)) return null;
  const remaining = deadlineAt - Date.now();
  if (remaining <= 0) return null;
  const timeoutMs = Math.max(1, Math.min(4_000, remaining));
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const work = async (): Promise<ValuationCollectedSource | null> => {
      const response = await fetchPublic(url, { headers: { 'User-Agent': UA,
        Accept: role === 'fx' ? 'application/xml,text/xml' : 'text/html,text/plain' }, signal: controller.signal });
      // Redirect targets must themselves be exact reviewed sources, not merely a trusted-looking hostname.
      const finalUrl = response.url || url;
      if (!response.ok || !valuationSourceUrlAllowed(finalUrl) || (role === 'fx' && finalUrl !== FX_URL)) return null;
      const body = await response.text();
      if (body.length > 1_000_000) return null;
      const text = role === 'fx' ? body : htmlToText(body);
      if (!text.trim() || text.length > 250_000) return null;
      const page: FetchedPage = { text, via: 'direct', originalUrl: url, finalUrl, fetchedUrl: finalUrl,
        fetchMethod: 'direct', sourceVerified: true, truncated: false };
      const proof = fetchedSource(page).sourceFetch;
      if (!proof || proof.contentHash !== sha256(text)) return null;
      const catalogFacts = role === 'fx' ? parseEcbFxSources(text, checkedAt) : undefined;
      if (role === 'fx' && !catalogFacts) return null;
      return { id: role === 'fx' ? 'valuation-fx' : `valuation-price-${allowedPriceUrls.indexOf(url)}`,
        url: finalUrl, text, sourceFetch: proof, checkedAt, role, ...(catalogFacts ? { catalogFacts } : {}) };
    };
    return await Promise.race([work(), new Promise<null>(resolve => { timer = setTimeout(() => { controller.abort(); resolve(null); }, timeoutMs); })]);
  } catch { return null; }
  finally { if (timer) clearTimeout(timer); controller.abort(); }
}

/** Refresh FX and only expired platform prices. These pages are factor evidence; they never replace benefit evidence. */
export async function collectValuationSources(platformIds: string[], opts: CollectValuationSourceOptions = {}): Promise<ValuationCollectedSource[]> {
  const now = new Date(opts.now ?? new Date());
  if (!Number.isFinite(now.getTime())) return [];
  const platformSet = new Set(platformIds);
  const relevant = VALUATION_PRICE_CATALOG.filter(p => platformSet.has(p.platformId));
  if (!relevant.length) return [];
  const deadlineAt = Math.min(opts.deadlineAt ?? Infinity, Date.now() + 12_000);
  if (!Number.isFinite(deadlineAt) || deadlineAt <= Date.now()) return [];
  const checkedAt = now.toISOString();
  const expiredUrls = [...new Set(relevant.filter(p => !valuationPriceIsFresh(p, now)).flatMap(p => p.sources.map(s => s.url)))].slice(0, 4);
  const jobs = [{ url: FX_URL, role: 'fx' as const }, ...expiredUrls.map(url => ({ url, role: 'price' as const }))];
  const cache = opts.cache ?? new Map();
  const results: (ValuationCollectedSource | null)[] = new Array(jobs.length).fill(null);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(3, jobs.length) }, async () => {
    while (next < jobs.length && Date.now() < deadlineAt) {
      const index = next++; const { url, role } = jobs[index];
      const key = `${checkedAt.slice(0, 10)}|${url}`;
      let promise = cache.get(key);
      if (!promise) { promise = collectOne(url, role, checkedAt, deadlineAt); cache.set(key, promise); }
      const remaining = Math.max(0, deadlineAt - Date.now());
      let timer: ReturnType<typeof setTimeout> | undefined;
      try { results[index] = await Promise.race([promise, new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), remaining); })]); }
      finally { if (timer) clearTimeout(timer); }
    }
  }));
  return results.filter((r): r is ValuationCollectedSource => r !== null);
}

/** Price text has its own IDs and role; the extractor must keep the existing benefit quote and approval untouched. */
export function valuationSourcesPrompt(sources: readonly ValuationCollectedSource[]): string {
  return JSON.stringify(sources.map(({ id, url, text, checkedAt, role }) => ({ id, url, text, checkedAt, role })));
}
