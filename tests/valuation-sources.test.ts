import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPublic } from '../pipeline/safe-fetch';
import { collectValuationSources, parseEcbFxSources, valuationSourcesPrompt, valuationSourceUrlAllowed,
  type ValuationSourceCache } from '../pipeline/valuation-sources';
import { sha256 } from '../pipeline/lib';

vi.mock('../pipeline/safe-fetch', async importOriginal => ({
  ...await importOriginal<typeof import('../pipeline/safe-fetch')>(), fetchPublic: vi.fn(),
}));
const mockedFetch = vi.mocked(fetchPublic);
const fxUrl = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const officialXml = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
<Cube><Cube time='2026-10-09'>
<Cube currency='USD' rate='1.1206'/>
<Cube currency='CNY' rate='7.4992'/>
<Cube currency='INR' rate='108.3965'/>
</Cube></Cube></gesmes:Envelope>`;
const response = (body: string, url: string, status = 200) => {
  const result = new Response(body, { status }); Object.defineProperty(result, 'url', { value: url }); return result;
};
const asOf = '2026-10-11T12:00:00Z';

beforeEach(() => { mockedFetch.mockReset(); });
afterEach(() => { vi.useRealTimers(); });

describe('bounded reviewed valuation source collection', () => {
  it('refreshes FX only while requested price catalog entries remain fresh', async () => {
    mockedFetch.mockImplementation(async url => response(officialXml, url));
    const collected = await collectValuationSources(['openai', 'elevenlabs', 'lovable', 'openai'], { now: asOf });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch.mock.calls[0][0]).toBe(fxUrl);
    expect(collected).toHaveLength(1);
    const fx = collected[0];
    expect(fx.role).toBe('fx');
    expect(fx.text).toBe(officialXml);
    expect(fx.sourceFetch).toMatchObject({ originalUrl: fxUrl, finalUrl: fxUrl, fetchedUrl: fxUrl,
      sourceVerified: true, truncated: false, method: 'direct', contentHash: sha256(officialXml) });
    expect(fx.catalogFacts?.['ecb-2026-10-09.CNY'].value).toBe(0.14942927245572862);
    expect(fx.catalogFacts?.['ecb-2026-10-09.INR'].value).toBe(0.010337972166998012);
    expect(fx.catalogFacts?.['ecb-2026-10-09.CNY'].source.checkedAt).toBe(new Date(asOf).toISOString());
    expect(valuationSourcesPrompt(collected)).not.toContain('catalogFacts');
  });
  it('fetches each expired official price URL once per run and transports current literal text', async () => {
    const laterXml = officialXml.replace("time='2026-10-09'", "time='2026-11-11'");
    mockedFetch.mockImplementation(async url => response(url === fxUrl ? laterXml
      : '<html><p>Starter $9 /month, 30,000 credits</p></html>', url));
    const cache: ValuationSourceCache = new Map();
    const args = { now: '2026-11-11T12:00:00Z', cache };
    const first = await collectValuationSources(['elevenlabs'], args);
    const again = await collectValuationSources(['elevenlabs'], args);
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(first).toEqual(again);
    expect(first.find(s => s.role === 'price')?.text).toBe('Starter $9 /month, 30,000 credits');
    expect(first.find(s => s.role === 'price')?.url).toBe('https://elevenlabs.io/pricing');
    expect(first.find(s => s.role === 'price')).not.toHaveProperty('catalogFacts');
  });
  it('caches concurrent requests and failures without attempting model-selected URLs', async () => {
    mockedFetch.mockRejectedValue(new Error('unavailable'));
    const cache: ValuationSourceCache = new Map();
    const result = await Promise.all([
      collectValuationSources(['openai'], { now: asOf, cache }),
      collectValuationSources(['lovable'], { now: asOf, cache }),
    ]);
    expect(result).toEqual([[], []]);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(valuationSourceUrlAllowed('https://attacker.example/pricing')).toBe(false);
    expect(valuationSourceUrlAllowed('https://elevenlabs.io/pricing?next=attacker')).toBe(false);
    expect(await collectValuationSources(['https://attacker.example/pricing'], { now: asOf })).toEqual([]);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
  it('refuses unreviewed redirect destinations, malformed or stale FX, and oversized source text', async () => {
    mockedFetch.mockResolvedValueOnce(response(officialXml, 'https://untrusted.example/fx'));
    expect(await collectValuationSources(['openai'], { now: asOf })).toEqual([]);
    mockedFetch.mockResolvedValueOnce(response('<error>Access denied</error>', fxUrl));
    expect(await collectValuationSources(['openai'], { now: asOf })).toEqual([]);
    mockedFetch.mockResolvedValueOnce(response(officialXml, fxUrl));
    expect(await collectValuationSources(['openai'], { now: '2026-10-18T12:00:00Z' })).toEqual([]);
    mockedFetch.mockResolvedValueOnce(response('a'.repeat(1_000_001), fxUrl));
    expect(await collectValuationSources(['openai'], { now: asOf })).toEqual([]);
    expect(parseEcbFxSources(officialXml.replace("rate='7.4992'", "rate='0'"), asOf)).toBeNull();
    expect(parseEcbFxSources(officialXml.replace("time='2026-10-09'", "time='2026-10-12'"), asOf)).toBeNull();
  });
  it('respects caller deadline even when a cached fetch is still pending', async () => {
    vi.useFakeTimers();
    mockedFetch.mockImplementation(() => new Promise(() => {}));
    const cache: ValuationSourceCache = new Map();
    const first = collectValuationSources(['openai'], { now: asOf, cache, deadlineAt: Date.now() + 4_000 });
    const second = collectValuationSources(['openai'], { now: asOf, cache, deadlineAt: Date.now() + 50 });
    await vi.advanceTimersByTimeAsync(50);
    expect(await second).toEqual([]);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3_950);
    expect(await first).toEqual([]);
    expect(await collectValuationSources(['openai'], { now: asOf, deadlineAt: Date.now() - 1 })).toEqual([]);
  });
  it('limits expired-page fanout and leaves failed pricing as unknown', async () => {
    mockedFetch.mockImplementation(async url => response('unreadable price shell', url));
    const result = await collectValuationSources(['openai', 'elevenlabs', 'lovable', 'zhipu', 'dreamina', 'tencent'],
      { now: '2026-11-11T12:00:00Z' });
    expect(mockedFetch.mock.calls.length).toBeLessThanOrEqual(5);
    expect(new Set(mockedFetch.mock.calls.map(([url]) => url)).size).toBe(mockedFetch.mock.calls.length);
    expect(result.filter(s => s.role === 'price')).toHaveLength(4);
    expect(result.every(s => !s.catalogFacts)).toBe(true);
  });
});
