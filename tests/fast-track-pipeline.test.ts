import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const job = { id: 'job-1', platformId: 'odyssey', platformName: 'Odyssey', url: 'https://odyssey.world/introducing-odyssey-3', benefit: 'Odyssey-3 公开研究预览，可免费试用', note: null };
const offer = { key: 'odyssey-3-preview', title: 'Odyssey-3 公开研究预览', type: 'free', modalities: ['video'], claimMethod: 'signup', requirements: ['none'], audience: 'all', valueText: '免费试用', usdEstimate: null, claimStart: null, claimEnd: null, endKind: 'unknown', creditValidity: null, sourceTz: 'UTC', steps: ['打开官网'], excerpts: { benefit: 'Odyssey-3 公开研究预览，可免费试用' } };

function harness(options: { modelStatus?: number; publishSteps?: number } = {}) {
  const posts: { url: string; body: any }[] = [];
  let advances = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: unknown, init: RequestInit = {}) => {
    const url = String(input), body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    if (init.method === 'POST') posts.push({ url, body });
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.endsWith('/fast-track/queue')) return json({ jobs: [{ id: 'job-1', publishing: false }] });
    if (url.endsWith('/fast-track/job-1/claim')) return json({ job });
    if (url.endsWith('/fast-track/job-1/result')) return json({ state: body.error ? 'queued' : (options.publishSteps ? 'publishing' : 'published') });
    if (url.endsWith('/fast-track/job-1/advance')) return json({ state: ++advances >= (options.publishSteps ?? 0) ? 'published' : 'publishing' });
    if (url.endsWith('/model-budget/reserve')) return json({ id: 1 });
    if (url.endsWith('/settle')) return json({ ok: true });
    if (url.includes('generativelanguage.googleapis.com')) return options.modelStatus ? new Response('quota', { status: options.modelStatus }) : json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ offers: [offer] }) }] } }], usageMetadata: { totalTokenCount: 100 } });
    if (url.startsWith('https://odyssey.world/')) return new Response('<html><body><h1>Introducing Odyssey-3</h1><p>Odyssey-3 is available as a public research preview. Try it free in your browser today.</p></body></html>', { headers: { 'Content-Type': 'text/html' } });
    return new Response('not found', { status: 404 });
  }));
  return { posts, advances: () => advances };
}

beforeEach(() => {
  vi.resetModules();
  for (const [key, value] of Object.entries({ API_BASE: 'https://mock.local', INGEST_TOKEN: 'test-ingest', GEMINI_API_KEY: 'test-key', OPENROUTER_API_KEY: '', GLM_API_KEY: '', DEEPSEEK_API_KEY: '', LLM_MIN_GAP_MS: '0' })) vi.stubEnv(key, value);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

const options = () => ({ deadlineAt: Date.now() + 60_000, dry: false, account: vi.fn(), log: () => undefined });

it('claims a job, reads the official page with a free model and reports the listing fields', async () => {
  const h = harness();
  const { runFastTrack } = await import('../pipeline/fast-track');
  const run = options();
  expect(await runFastTrack(run)).toMatchObject({ claimed: 1, published: 1 });
  const result = h.posts.find(p => p.url.endsWith('/fast-track/job-1/result'))!.body;
  expect(result.fields).toMatchObject({ title: 'Odyssey-3 公开研究预览', type: 'free', modalities: ['video'], requirements: ['none'], endKind: 'unknown' });
  expect(result.sourceText).toContain('public research preview');
  expect(run.account).toHaveBeenCalled();
  const modelRequest = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes('generativelanguage'))!;
  expect(String((modelRequest[1] as RequestInit).body)).toContain('管理员已经确认');
});

it('drives a multi-request publish to completion', async () => {
  const h = harness({ publishSteps: 3 });
  const { runFastTrack } = await import('../pipeline/fast-track');
  expect(await runFastTrack(options())).toMatchObject({ published: 1 });
  expect(h.advances()).toBe(3);
});

it('reports a model failure so the Worker can retry or hand it to the owner', async () => {
  const h = harness({ modelStatus: 429 });
  const { runFastTrack } = await import('../pipeline/fast-track');
  expect(await runFastTrack(options())).toMatchObject({ claimed: 1, requeued: 1 });
  expect(h.posts.find(p => p.url.endsWith('/fast-track/job-1/result'))!.body.error).toBeTruthy();
});
