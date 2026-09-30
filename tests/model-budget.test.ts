import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('model attempts consume their own budget records', () => {
  it('records usage from an invalid first response before using a fallback', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'fake');
    vi.stubEnv('OPENROUTER_API_KEY', 'fake');
    vi.stubEnv('OPENROUTER_MODEL', 'fake:free');
    vi.stubEnv('DEEPSEEK_API_KEY', '');
    vi.stubEnv('LLM_MIN_GAP_MS', '0');
    const reservations: string[] = [], settlements: number[] = [];
    const budget = {
      async reserve(provider: string) { reservations.push(provider); return { id: reservations.length, tokens: 100000, costCny: 0 }; },
      async settle(_reservation: unknown, _provider: string, tokens: number) { settlements.push(tokens); },
    };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('generativelanguage')) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not-json' }] } }], usageMetadata: { totalTokenCount: 50000 } }));
      if (url.includes('openrouter.ai')) return new Response(JSON.stringify({ choices: [{ message: { content: '{"offers":[]}' } }], usage: { total_tokens: 10 } }));
      throw new Error('unexpected provider');
    }));
    const { extract } = await import('../pipeline/llm');
    const result = await extract('Vendor', 'https://vendor.example/free', 'Free tokens', () => undefined, { budget });
    expect(result.provider).toBe('openrouter');
    expect(reservations).toEqual(['gemini', 'openrouter']);
    expect(settlements).toEqual([50000, 10]);
  });

  it('keeps a conservative reservation when a paid provider omits usage metadata', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('OPENROUTER_API_KEY', '');
    vi.stubEnv('DEEPSEEK_API_KEY', 'fake');
    vi.stubEnv('LLM_MIN_GAP_MS', '0');
    const settle = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"offers":[]}' } }] }))));
    const { extract } = await import('../pipeline/llm');
    const result = await extract('Vendor', 'https://vendor.example/free', 'Free tokens', () => undefined, {
      allowPaid: true,
      budget: { async reserve() { return { id: 1, tokens: 10000, costCny: 0.1 }; }, settle },
    });
    expect(result.tokens).toBe(10000);
    expect(result.costCny).toBe(0.1);
    expect(settle).not.toHaveBeenCalled();
  });
});
