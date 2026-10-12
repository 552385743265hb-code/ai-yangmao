import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/worker/index';
import { identityDb } from './fixtures/identity/db';

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

  it('keeps screening spend off the extraction cap and enforces free pools', async () => {
    const f = identityDb();
    const seedModelRuns = (spec: { line?: string; costCny?: number; pool?: string; purpose?: string; count?: number }) => {
      for (let i = 0; i < (spec.count ?? 1); i++) f.sqlite.prepare(`INSERT INTO runs(kind, started_at, ok, stats, tokens, cost_cny) VALUES ('model', ?, 0, ?, 10, ?)`).run(new Date().toISOString(), JSON.stringify({ line: spec.line ?? null, pool: spec.pool ?? null, purpose: spec.purpose ?? null }), spec.costCny ?? 0);
    };
    const reserve = (body: Record<string, unknown>) => worker.fetch(new Request('https://local.test/api/ingest/model-budget/reserve', { method: 'POST', headers: { Authorization: 'Bearer ingest-test-token-123', 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'openrouter', tokens: 10, ...body }) }), { DB: f.db, INGEST_TOKEN: 'ingest-test-token-123', ADMIN_TOKEN: 'admin-test-token-123456', MONTHLY_COST_CAP_CNY: '10' } as never, {} as ExecutionContext);
    const free = { costCny: 0, line: 'screening', pool: 'openrouter-free' };
    seedModelRuns({ line: 'extraction', costCny: 10 });
    expect((await reserve({ provider: 'openrouter', tokens: 10, costCny: 0.1, line: 'screening' })).status).toBe(200);
    seedModelRuns({ pool: 'openrouter-free', purpose: 'backfill', count: 400 });
    expect((await reserve({ provider: 'openrouter', tokens: 10, costCny: 0, line: 'screening', pool: 'openrouter-free', purpose: 'backfill' })).status).toBe(429);
    seedModelRuns({ pool: 'openrouter-free', purpose: 'normal', count: 400 });
    expect((await reserve({ ...free, purpose: 'normal' })).status).toBe(429);
    expect((await reserve({ ...free, purpose: 'urgent' })).status).toBe(200);
  });
});
