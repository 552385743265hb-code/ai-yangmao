import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const job = { id: 'job-1', platformId: 'odyssey', platformName: 'Odyssey', url: 'https://odyssey.world/introducing-odyssey-3', benefit: 'Odyssey-3 公开研究预览，可免费试用', note: null };
const offer = { key: 'odyssey-3-preview', title: 'Odyssey-3 公开研究预览', type: 'free', modalities: ['video'], claimMethod: 'signup', requirements: ['none'], audience: 'all', valueText: '免费试用', usdEstimate: null, claimStart: null, claimEnd: null, endKind: 'unknown', creditValidity: null, sourceTz: 'UTC', steps: ['打开官网'], excerpts: { benefit: 'Odyssey-3 公开研究预览，可免费试用' } };

interface Options { freeStatus?: number; freeOffer?: Record<string, unknown>; paidStatus?: number; publishSteps?: number; errorsBeforeOwner?: number }
function harness(options: Options = {}) {
  const posts: { url: string; body: any }[] = [];
  let advances = 0, results = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: unknown, init: RequestInit = {}) => {
    const url = String(input), body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    if (init.method === 'POST') posts.push({ url, body });
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.endsWith('/fast-track/queue')) return json({ jobs: [{ id: 'job-1', publishing: false }] });
    if (url.endsWith('/fast-track/job-1/claim')) return json({ job });
    if (url.endsWith('/fast-track/job-1/result')) {
      results++;
      if (body.error) return json({ state: results >= (options.errorsBeforeOwner ?? 3) ? 'needs_owner' : 'queued' });
      return json({ state: options.publishSteps ? 'publishing' : 'published' });
    }
    if (url.endsWith('/fast-track/job-1/advance')) return json({ state: ++advances >= (options.publishSteps ?? 0) ? 'published' : 'publishing' });
    if (url.endsWith('/model-budget/reserve')) return json({ id: 1 });
    if (url.endsWith('/settle')) return json({ ok: true });
    if (url.includes('generativelanguage.googleapis.com')) return options.freeStatus ? new Response('quota', { status: options.freeStatus }) : json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ offers: [options.freeOffer ?? offer] }) }] } }], usageMetadata: { totalTokenCount: 100 } });
    if (url.includes('api.deepseek.com')) return options.paidStatus ? new Response('down', { status: options.paidStatus }) : json({ choices: [{ message: { content: JSON.stringify({ offers: [offer] }) } }], usage: { total_tokens: 9000, prompt_tokens: 8000, completion_tokens: 1000 } });
    if (url.startsWith('https://odyssey.world/')) return new Response('<html><body><h1>Introducing Odyssey-3</h1><p>Odyssey-3 is available as a public research preview. Try it free in your browser today.</p></body></html>', { headers: { 'Content-Type': 'text/html' } });
    return new Response('not found', { status: 404 });
  }));
  const called = (host: string) => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes(host));
  const result = () => posts.filter(p => p.url.endsWith('/fast-track/job-1/result')).at(-1)!.body;
  return { posts, advances: () => advances, called, result };
}

beforeEach(() => {
  vi.resetModules();
  for (const [key, value] of Object.entries({ API_BASE: 'https://mock.local', INGEST_TOKEN: 'test-ingest', GEMINI_API_KEY: 'test-key', OPENROUTER_API_KEY: '', GLM_API_KEY: '', DEEPSEEK_API_KEY: 'test-deepseek', LLM_MIN_GAP_MS: '0' })) vi.stubEnv(key, value);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

const options = (allowPaid = true) => ({ deadlineAt: Date.now() + 60_000, dry: false, account: vi.fn(), log: () => undefined, allowPaid: () => allowPaid, retryDelayMs: 0 });

it('fills the fields with a free model and never touches the paid fallback when that succeeds', async () => {
  const h = harness();
  const { runFastTrack } = await import('../pipeline/fast-track');
  const run = options();
  expect(await runFastTrack(run)).toMatchObject({ claimed: 1, published: 1 });
  expect(h.result()).toMatchObject({ model: 'gemini', fields: { title: 'Odyssey-3 公开研究预览', type: 'free', modalities: ['video'], requirements: ['none'], endKind: 'unknown' } });
  expect(h.result().sourceText).toContain('public research preview');
  expect(String((h.called('generativelanguage')[0][1] as RequestInit).body)).toContain('管理员已经确认');
  expect(h.called('api.deepseek.com')).toHaveLength(0);
  expect(run.account).toHaveBeenCalledWith(100, 0);
});

it('falls back to DeepSeek in the same attempt when the free model fails', async () => {
  const h = harness({ freeStatus: 429 });
  const { runFastTrack } = await import('../pipeline/fast-track');
  const run = options();
  expect(await runFastTrack(run)).toMatchObject({ published: 1 });
  expect(h.result()).toMatchObject({ model: 'deepseek', fields: { title: 'Odyssey-3 公开研究预览' } });
  expect(run.account).toHaveBeenCalledWith(9000, expect.any(Number));
  expect(run.account.mock.calls.at(-1)![1]).toBeGreaterThan(0);
});

it('falls back to DeepSeek when the free reply lacks basic fields', async () => {
  const h = harness({ freeOffer: { ...offer, claimMethod: undefined, requirements: ['unknown'] } });
  const { runFastTrack } = await import('../pipeline/fast-track');
  expect(await runFastTrack(options())).toMatchObject({ published: 1 });
  expect(h.called('api.deepseek.com')).toHaveLength(1);
  expect(h.result()).toMatchObject({ model: 'deepseek', fields: { claimMethod: 'signup', requirements: ['none'] } });
});

it('sends the most complete partial fields when both tiers fall short, so the owner fills only the gap', async () => {
  const h = harness({ freeOffer: { ...offer, claimMethod: undefined }, paidStatus: 503 });
  const { runFastTrack } = await import('../pipeline/fast-track');
  await runFastTrack(options());
  expect(h.result()).toMatchObject({ model: 'gemini', fields: { title: 'Odyssey-3 公开研究预览' } });
  expect(h.result().fields.claimMethod).toBeUndefined();
});

it('without the paid fallback, retries within the run and then hands the job to the owner', async () => {
  const h = harness({ freeStatus: 429 });
  const { runFastTrack } = await import('../pipeline/fast-track');
  expect(await runFastTrack(options(false))).toMatchObject({ claimed: 1, needsOwner: 1 });
  expect(h.posts.filter(p => p.url.endsWith('/fast-track/job-1/claim'))).toHaveLength(3);
  expect(h.called('api.deepseek.com')).toHaveLength(0);
  expect(h.result().error).toBeTruthy();
});

it('drives a multi-request publish to completion', async () => {
  const h = harness({ publishSteps: 3 });
  const { runFastTrack } = await import('../pipeline/fast-track');
  expect(await runFastTrack(options())).toMatchObject({ published: 1 });
  expect(h.advances()).toBe(3);
});
