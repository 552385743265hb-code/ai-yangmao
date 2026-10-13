import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/worker/index';
import { identityDb } from './fixtures/identity/db';
import type { ScreeningSubject } from '../pipeline/screening/context';

afterEach(() => { vi.doUnmock('../pipeline/screening/screener'); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

const envOf = (f: ReturnType<typeof identityDb>, extra: Record<string, string> = {}) => ({ DB: f.db, INGEST_TOKEN: 'ingest-test-token-123', ADMIN_TOKEN: 'admin-test-token-123456', ...extra });

function call(f: ReturnType<typeof identityDb>, path: string, init?: RequestInit, extra: Record<string, string> = {}) {
  return worker.fetch(new Request(`https://local.test/api/ingest/${path}`, { ...init, headers: { Authorization: 'Bearer ingest-test-token-123', 'Content-Type': 'application/json', ...init?.headers } }), envOf(f, extra) as never, {} as ExecutionContext);
}

const newCandidate = {
  verdict: 'new_candidate', matchId: null, ruleId: null, reasonCategory: null, occurrenceCheck: null, confidence: 0.4,
  evidenceQuote: 'Vendor', explanation: '新的', urgency: { tier: 'P2', deadline: null, signals: [], quote: null },
};

describe('screening queue content', () => {
  it('screens a posted lead with the title and text the ingest route stored', async () => {
    const f = identityDb();
    const title = 'Vendor 新用户送 API 额度';
    const body = 'Vendor 官方公告：新用户注册即送 API 额度。';
    const raw = `${body}\n[研判] 内部备注不要进筛查`;
    const posted = await call(f, 'leads', { method: 'POST', body: JSON.stringify([{ origin: 'linuxdo', url: 'https://linux.do/t/vendor-credits/42', title, raw }]) }, { SCREENING_MODE: 'shadow' });
    expect(posted.status).toBe(200);
    const seen: ScreeningSubject[] = [];
    vi.stubEnv('API_BASE', 'https://local.test');
    vi.stubEnv('INGEST_TOKEN', 'ingest-test-token-123');
    vi.stubEnv('SCREENING_MODE', 'shadow');
    vi.stubEnv('SCREENING_PACE_MS', '0');
    vi.stubEnv('LLM_MIN_GAP_MS', '0');
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (!url.startsWith('https://local.test/')) throw new Error(`unexpected ${url}`);
      return worker.fetch(new Request(url, init), envOf(f, { SCREENING_MODE: 'shadow' }) as never, {} as ExecutionContext);
    }));
    vi.doMock('../pipeline/screening/screener', () => ({
      screenSubject: vi.fn(async (subject: ScreeningSubject) => {
        seen.push(subject);
        return { verdict: newCandidate, model: 'm', calibrated: false, contextHash: 'h', downgradeReasons: [] };
      }),
      SCREENING_PROMPT_VERSION: 'screening-v1',
    }));
    const { runScreening } = await import('../pipeline/screening/run');
    await runScreening({ deadlineAt: Date.now() + 60_000, dry: false });
    expect(seen[0]).toMatchObject({ title, text: body, url: 'https://linux.do/t/vendor-credits/42', origin: 'linuxdo', platformIds: ['vendor'], truncated: false });
    expect(seen[0].text).not.toContain('内部备注');
    expect(f.sqlite.prepare('SELECT count(*) n FROM screening_decisions').get()).toEqual({ n: 1 });
  });

  it('marks lead text truncated at 12k characters', async () => {
    const f = identityDb();
    const raw = `Vendor ${'额'.repeat(12000)}`;
    await call(f, 'leads', { method: 'POST', body: JSON.stringify([{ origin: 'linuxdo', url: 'https://linux.do/t/long/7', title: 'Vendor 长文', raw }]) }, { SCREENING_MODE: 'shadow' });
    const queue = await (await call(f, 'screening/queue')).json() as { items: { subject: { text?: string; truncated?: boolean } }[] };
    expect(queue.items[0].subject.text).toHaveLength(12000);
    expect(queue.items[0].subject.truncated).toBe(true);
  });

  it('returns the candidate source text for a task', async () => {
    const f = identityDb();
    const source = 'Vendor official page: new accounts receive API credits today.';
    f.sqlite.exec(`INSERT INTO source_documents(id, original_url, url_key) VALUES ('doc', 'https://vendor.example/free', 'doc');
      INSERT INTO source_observations(id, document_id, content_hash, text, text_truncated, fetch_kind, final_url, observed_at, last_seen_at, trust_json) VALUES ('obs', 'doc', 'hash', '${source}', 0, 'direct', 'https://vendor.example/free', '2026-10-12T00:00:00Z', '2026-10-12T00:00:00Z', '{}');
      INSERT INTO intake_candidates(id, observation_id, extraction_version, span_key, candidate_key, facts_json, facts_hash, raw_candidate_json) VALUES ('cand', 'obs', 'v1', 'span', 'cand-key', '{}', 'facts', '{"title":"Vendor free credits","platformId":"vendor","evidence":{"url":"https://vendor.example/free"}}');
      INSERT INTO review_tasks(id, task_key, kind) VALUES ('task-1', 'task-key', 'initial');
      INSERT INTO task_candidates(task_id, candidate_id) VALUES ('task-1', 'cand');
      INSERT INTO screening_items(id, subject_kind, subject_id, platform_id, state, tier, tier_by, discovered_at, due_at, updated_at) VALUES ('task:task-1', 'task', 'task-1', 'vendor', 'awaiting_screen', 'P2', 'gate0', '2026-10-12T00:00:00.000Z', '2026-10-15T00:00:00.000Z', '2026-10-12T00:00:00.000Z')`);
    const queue = await (await call(f, 'screening/queue')).json() as { items: { subject: Record<string, unknown> }[] };
    expect(queue.items.find(item => item.subject.taskId === 'task-1')?.subject).toMatchObject({
      candidateId: 'cand', title: 'Vendor free credits', url: 'https://vendor.example/free', platformId: 'vendor', text: source,
    });
  });
});

describe('screening queue membership', () => {
  it('leaves a screened item out of the queue without changing its state', async () => {
    const f = identityDb();
    await call(f, 'leads', { method: 'POST', body: JSON.stringify([{ origin: 'linuxdo', url: 'https://linux.do/t/stay/3', title: 'Vendor 待筛', raw: 'Vendor 待筛正文' }]) }, { SCREENING_MODE: 'shadow' });
    const lead = f.sqlite.prepare(`SELECT id FROM leads WHERE url='https://linux.do/t/stay/3'`).get() as { id: number };
    const verdict = await call(f, 'screening/verdicts', {
      method: 'POST',
      body: JSON.stringify({
        requestId: 'req-stay', itemId: `lead:${lead.id}`,
        subject: { kind: 'lead', leadId: lead.id, discoveredAt: '2026-10-12T00:00:00.000Z' },
        verdict: newCandidate, model: 'm', calibrated: false, promptVersion: 'screening-v1', contextHash: 'h', downgradeReasons: [],
      }),
    }, { SCREENING_MODE: 'shadow' });
    expect(verdict.status).toBe(200);
    const queue = await (await call(f, 'screening/queue')).json() as { items: { itemId: string }[] };
    expect(queue.items.map(item => item.itemId)).not.toContain(`lead:${lead.id}`);
    expect(f.sqlite.prepare('SELECT state FROM screening_items WHERE id=?').get(`lead:${lead.id}`)).toEqual({ state: 'awaiting_screen' });
  });

  it('clears the latest decision when the same lead comes back with new text', async () => {
    const f = identityDb();
    const url = 'https://linux.do/t/again/8';
    await call(f, 'leads', { method: 'POST', body: JSON.stringify([{ origin: 'linuxdo', url, title: 'Vendor 初稿', raw: 'Vendor 第一次正文' }]) }, { SCREENING_MODE: 'shadow' });
    const lead = f.sqlite.prepare('SELECT id FROM leads WHERE url=?').get(url) as { id: number };
    await call(f, 'screening/verdicts', {
      method: 'POST',
      body: JSON.stringify({
        requestId: 'req-again', itemId: `lead:${lead.id}`,
        subject: { kind: 'lead', leadId: lead.id, discoveredAt: '2026-10-12T00:00:00.000Z' },
        verdict: newCandidate, model: 'm', calibrated: false, promptVersion: 'screening-v1', contextHash: 'h', downgradeReasons: [],
      }),
    }, { SCREENING_MODE: 'shadow' });
    const again = await call(f, 'leads', { method: 'POST', body: JSON.stringify([{ origin: 'linuxdo', url, title: 'Vendor 更新', raw: 'Vendor 第二次正文已经变了' }]) }, { SCREENING_MODE: 'shadow' });
    expect(await again.json()).toMatchObject({ created: 0 });
    expect(f.sqlite.prepare('SELECT title, raw FROM leads WHERE id=?').get(lead.id)).toEqual({ title: 'Vendor 更新', raw: 'Vendor 第二次正文已经变了' });
    expect(f.sqlite.prepare('SELECT latest_decision_id, state FROM screening_items WHERE id=?').get(`lead:${lead.id}`)).toEqual({ latest_decision_id: null, state: 'awaiting_screen' });
  });
});

describe('screening model budget', () => {
  it('reserves the screening line, free pool and purpose before a free model call', async () => {
    vi.stubEnv('API_BASE', 'https://budget.test');
    vi.stubEnv('INGEST_TOKEN', 'ingest-test-token-123');
    vi.stubEnv('SCREENING_PACE_MS', '0');
    vi.stubEnv('LLM_MIN_GAP_MS', '0');
    vi.stubEnv('OPENROUTER_API_KEY', 'fake');
    vi.stubEnv('SCREENING_MODELS', 'meta/llama:free');
    const reserves: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/model-budget/reserve')) {
        reserves.push(JSON.parse(String(init?.body ?? '{}')));
        return Response.json({ id: reserves.length });
      }
      if (String(url).includes('/settle')) return Response.json({ ok: true });
      return Response.json({ model: 'meta/llama:free', choices: [{ message: { content: '{}' } }], usage: { total_tokens: 3, prompt_tokens: 1, completion_tokens: 2 } });
    }));
    const { callScreeningModel } = await import('../pipeline/screening/model');
    await callScreeningModel({ system: 's', user: 'u', purpose: 'normal', deadlineAt: Date.now() + 60_000, calibrations: [] });
    expect(reserves[0]).toMatchObject({ line: 'screening', pool: 'openrouter-free', purpose: 'normal' });
  });

  it('treats an exhausted free pool as model unavailability for ordinary work', async () => {
    vi.stubEnv('API_BASE', 'https://budget.test');
    vi.stubEnv('INGEST_TOKEN', 'ingest-test-token-123');
    vi.stubEnv('SCREENING_PACE_MS', '0');
    vi.stubEnv('LLM_MIN_GAP_MS', '0');
    vi.stubEnv('OPENROUTER_API_KEY', 'fake');
    vi.stubEnv('SCREENING_MODELS', 'meta/llama:free');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('/model-budget/reserve')) return Response.json({ error: '模型预算不足', quota: 'pool_exhausted' }, { status: 429 });
      return Response.json({ model: 'meta/llama:free', choices: [{ message: { content: '{}' } }], usage: { total_tokens: 1, prompt_tokens: 1, completion_tokens: 0 } });
    }));
    const { callScreeningModel } = await import('../pipeline/screening/model');
    const { DeferError } = await import('../pipeline/llm');
    await expect(callScreeningModel({ system: 's', user: 'u', purpose: 'normal', deadlineAt: Date.now() + 60_000, calibrations: [] })).rejects.toBeInstanceOf(DeferError);
  });

  it('keeps a settled screening call on the screening line and in the free pool', async () => {
    const f = identityDb();
    const reserve = await call(f, 'model-budget/reserve', { method: 'POST', body: JSON.stringify({ provider: 'openrouter', tokens: 20, costCny: 1, line: 'screening', pool: 'openrouter-free', purpose: 'normal' }) }, { MONTHLY_COST_CAP_CNY: '10', SCREENING_MONTHLY_CAP_CNY: '72' });
    const id = (await reserve.json() as { id: number }).id;
    const settled = await call(f, `model-budget/${id}/settle`, { method: 'POST', body: JSON.stringify({ provider: 'openrouter', tokens: 4, costCny: 1 }) });
    expect(settled.status).toBe(200);
    const stats = JSON.parse(String((f.sqlite.prepare('SELECT stats FROM runs WHERE id=?').get(id) as { stats: string }).stats));
    expect(stats).toMatchObject({ state: 'settled', line: 'screening', pool: 'openrouter-free', purpose: 'normal' });
    const extraction = await call(f, 'model-budget/reserve', { method: 'POST', body: JSON.stringify({ provider: 'deepseek', tokens: 20, costCny: 9.5, line: 'extraction' }) }, { MONTHLY_COST_CAP_CNY: '10', SCREENING_MONTHLY_CAP_CNY: '72' });
    expect(extraction.status).toBe(200);
    const pool = f.sqlite.prepare(`SELECT COUNT(*) n FROM runs WHERE json_extract(stats,'$.pool')='openrouter-free'`).get() as { n: number };
    expect(pool.n).toBe(1);
  });
});

describe('screening failures stay inside the screening pass', () => {
  it('still triages leads when screening throws', async () => {
    vi.resetModules();
    for (const [key, value] of Object.entries({
      API_BASE: 'https://mock.local', INGEST_TOKEN: 'ingest-test-token-123', SCREENING_MODE: 'shadow', FAST_LEADS: '1', DRY_RUN: '0',
      GEMINI_API_KEY: 'test-key', OPENROUTER_API_KEY: '', DEEPSEEK_API_KEY: '', GLM_API_KEY: '', LLM_MIN_GAP_MS: '0', ONLY_SOURCES: '', LEAD_LIMIT: '50',
    })) vi.stubEnv(key, value);
    const reads: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: unknown) => {
      const url = String(input);
      reads.push(url);
      if (url.includes('/screening/')) return new Response('down', { status: 500 });
      if (url.endsWith('/budget')) return Response.json({ tokensToday: 0, costMonthCny: 0 });
      if (url.endsWith('/sources')) return Response.json({ sources: [{ id: 'aihot', kind: 'aihot', tier: 'lead', url: 'https://mock-aihot.example/api', config: {} }] });
      if (url === 'https://mock-aihot.example/api') return Response.json({ items: [] });
      if (url.includes('/leads?')) return Response.json({ leads: [] });
      return Response.json({ ok: true, created: 0, jobs: [], offers: [], results: [], platforms: [] });
    }));
    const { runPipeline } = await import('../pipeline/run');
    const result = await runPipeline();
    expect(result.stats.errors.some(error => error.startsWith('筛查：'))).toBe(true);
    expect(result.stats.coverageDegraded).toBe(true);
    expect(reads.some(url => url.includes('/leads?'))).toBe(true);
  });

  it('escalates a P0 and continues when every model including the paid one fails', async () => {
    vi.doUnmock('../pipeline/screening/screener');
    vi.resetModules();
    vi.stubEnv('API_BASE', 'https://screening.test');
    vi.stubEnv('INGEST_TOKEN', 'ingest-test-token');
    vi.stubEnv('SCREENING_MODE', 'shadow');
    vi.stubEnv('SCREENING_PACE_MS', '0');
    vi.stubEnv('LLM_MIN_GAP_MS', '0');
    vi.stubEnv('OPENROUTER_API_KEY', 'fake');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('SCREENING_PAID_MODEL', 'paid/model');
    vi.stubEnv('SCREENING_PAID_PRICE_IN', '1');
    vi.stubEnv('SCREENING_PAID_PRICE_OUT', '2');
    const posted: { path: string; body: Record<string, unknown> }[] = [];
    const queue = ['P0', 'P2'].map(tier => ({ itemId: `lead:${tier}`, tier, discoveredAt: '2026-10-12T00:00:00.000Z', subject: { kind: 'lead', leadId: tier === 'P0' ? 1 : 2, title: tier, origin: 'linuxdo', url: `https://linux.do/t/${tier}/1`, text: tier } }));
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const path = String(url).replace('https://screening.test/api/ingest/', '').split('?')[0];
      if (init?.body && path.startsWith('screening/')) posted.push({ path, body: JSON.parse(String(init.body)) });
      if (path === 'screening/queue') return Response.json({ items: queue });
      if (path === 'screening/memory') return Response.json({ records: [], rules: [], profiles: [], calibrations: [], nextCursor: null });
      if (String(url).includes('/model-budget/')) return Response.json({ id: 1, ok: true });
      if (String(url).includes('openrouter.ai')) return new Response('no', { status: 500 });
      return Response.json({ ok: true });
    }));
    const { runScreening } = await import('../pipeline/screening/run');
    const stats = await runScreening({ deadlineAt: Date.now() + 60_000, dry: false });
    expect(posted.find(item => item.path.includes('/escalate'))?.body).toMatchObject({ suggestion: 'screening_unavailable' });
    expect(stats.deferred).toBe(1);
  });
});
