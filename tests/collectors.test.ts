import { afterEach, describe, expect, it, vi } from 'vitest';
import { hn, type Source } from '../pipeline/collectors';

afterEach(() => vi.unstubAllGlobals());

describe('Hacker News backfill', () => {
  it('uses the previous successful run and reads every result page before advancing', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      urls.push(String(input));
      const page = Number(new URL(String(input)).searchParams.get('page'));
      return new Response(JSON.stringify({ nbPages: 2, hits: [{ objectID: `id-${urls.length}`, title: 'Free credits for new AI users', url: `https://vendor.example/offer-${urls.length}` }] }));
    }));
    const previous = new Date(Date.now() - 20 * 3600_000).toISOString();
    const source = { id: 'hn', kind: 'hn', url: 'https://hn.algolia.com/', tier: 'lead', platformId: null, lastHash: null, lastOkAt: previous, platform: null, autoPublish: false } as Source;
    const leads = await hn(source);
    expect(leads).toHaveLength(12); // 6 queries, 2 pages each
    expect(urls).toHaveLength(12);
    const first = new URL(urls[0]);
    const since = Number(first.searchParams.get('numericFilters')?.split('>')[1]);
    expect(Math.floor(Date.now() / 1000) - since).toBeGreaterThan(20 * 3600);
  });
});
