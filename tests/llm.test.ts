import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const offer = {
  key: 'free-api', title: '免费 API 额度', type: 'standing', valueText: '每月 100 至 200 美元',
  usdEstimate: 100, usdMax: 200, modalities: ['text'], claimMethod: 'signup', requirements: ['none'],
  audience: 'all', endKind: 'standing', sourceTz: 'UTC', steps: [], excerpts: {},
};
const gemini = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }], usageMetadata: { totalTokenCount: 100 } }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('OPENROUTER_API_KEY', '');
  vi.stubEnv('GLM_API_KEY', '');
  vi.stubEnv('DEEPSEEK_API_KEY', '');
  vi.stubEnv('LLM_MIN_GAP_MS', '0');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('model result contract', () => {
  it.each(['{"error":"could not read source"}', '{"offers":null}', '{"offers":{}}', '{"offers":[null]}', '{"offers":['])
    ('does not turn malformed output %s into a successful empty extraction', async output => {
      vi.stubGlobal('fetch', vi.fn(async () => gemini(output)));
      const { extract } = await import('../pipeline/llm');
      await expect(extract('Vendor', 'https://vendor.example/free', 'Free API credits')).rejects.toThrow();
    });

  it('falls back after an invalid envelope and still records the first provider usage', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    vi.stubEnv('OPENROUTER_MODEL', 'test:free');
    const settle = vi.fn(async () => undefined);
    vi.stubGlobal('fetch', vi.fn(async input => String(input).includes('googleapis')
      ? gemini('{"error":"unable to extract"}')
      : new Response(JSON.stringify({ choices: [{ message: { content: '{"offers":[]}' } }], usage: { total_tokens: 10 } }))));
    const { extract } = await import('../pipeline/llm');
    const result = await extract('Vendor', 'https://vendor.example/free', 'Free API credits', undefined, {
      budget: { async reserve() { return { id: 1, tokens: 1000, costCny: 0 }; }, settle },
    });
    expect(result).toMatchObject({ provider: 'openrouter', offers: [] });
    expect(settle.mock.calls.map(call => call[2])).toEqual([100, 10]);
  });

  it('keeps only quotations from the supplied evidence body, excluding the discovery headline', async () => {
    const headline = 'Every Max member receives free credits.';
    const body = 'The service supports API calls.';
    vi.stubGlobal('fetch', vi.fn(async () => gemini(JSON.stringify({ offers: [{ ...offer, excerpts: { benefit: headline } }] }))));
    const { extract } = await import('../pipeline/llm');
    const result = await extract('Vendor', 'https://vendor.example/free', `${headline}\n${body}`, undefined, { evidenceText: body });
    expect(result.offers[0].excerpts).toEqual({});
  });

  it('normalizes both endpoints of a value range, including string numbers', async () => {
    const { tidy } = await import('../pipeline/llm');
    expect(tidy({ ...offer, usdEstimate: '100', usdMax: '200' } as never)).toMatchObject({ usdEstimate: 100, usdMax: 200 });
  });
});

describe('provider cooldown within a collection run', () => {
  it('does not reserve budget or start a provider after the run deadline', async () => {
    const fetcher = vi.fn(), reserve = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const { extract } = await import('../pipeline/llm');
    await expect(extract('Vendor', 'https://vendor.example/free', 'Free API credits', undefined, {
      deadlineAt: Date.now() - 1, budget: { reserve, settle: vi.fn() },
    })).rejects.toThrow('本轮即将结束');
    expect(reserve).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not repeat quota waits or call the paid fallback without authorization', async () => {
    vi.useFakeTimers();
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    vi.stubEnv('OPENROUTER_MODEL', 'test:free');
    vi.stubEnv('DEEPSEEK_API_KEY', 'test-key');
    const fetcher = vi.fn(async () => new Response('quota exhausted', { status: 429 }));
    vi.stubGlobal('fetch', fetcher);
    const { extract } = await import('../pipeline/llm');
    const started = Date.now();
    const run = (async () => {
      for (let i = 0; i < 50; i++) await expect(extract('Vendor', 'https://vendor.example/free', 'Free API credits')).rejects.toThrow();
    })();
    await vi.runAllTimersAsync();
    await run;
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.map(call => String(call[0])).some(url => url.includes('deepseek'))).toBe(false);
    expect(Date.now() - started).toBeLessThan(60_000);
  });
});
