import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sha256, relevantText } from '../pipeline/lib';

const benefit = 'All Max members receive free API credits monthly: $100 or $200.';
const page = `<html><body><article><p>${benefit}</p><p>${'Product documentation. '.repeat(50)}</p></article></body></html>`;
const candidate = {
  key: 'max-api', platformId: 'vendor', title: 'Max 每月 API 赠额', type: 'standing', modalities: ['text'],
  claimMethod: 'member', requirements: ['member:Max'], audience: 'all', valueText: '每月赠送 100 至 200 美元 API 额度',
  usdEstimate: 100, usdMax: 200, claimStart: null, claimEnd: null, endKind: 'standing', sourceTz: 'UTC', steps: [],
  excerpts: { benefit },
};
const lead = { id: 1, origin: 'aihot', url: 'https://vendor.example/offer', title: 'Vendor 免费 API 额度', raw: benefit, createdAt: new Date().toISOString() };
const aihotSource = { id: 'aihot', kind: 'aihot', tier: 'lead', url: 'https://mock-aihot.example/api', config: {} };
const rssSource = { id: 'rss', kind: 'rss', tier: 'site', platformId: 'vendor', platform: { id: 'vendor', name: 'Vendor', status: 'approved' }, url: 'https://vendor.example/rss', config: {}, lastHash: null, lastText: null };
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });

interface HarnessOptions {
  officialJob?: boolean;
  officialSearchStatus?: number;
  sources?: Record<string, unknown>[];
  leads?: Record<string, unknown>[];
  pages?: Record<string, string | number>;
  modelOutput?: string;
  geminiStatus?: number;
  budgetDenied?: boolean;
  costMonthCny?: number;
  verification?: Record<string, unknown>[];
  verificationStatus?: number;
  verified?: boolean;
  known?: Record<string, unknown>[];
}
function harness(options: HarnessOptions = {}) {
  const writes: { url: string; body: any }[] = [];
  const reads: string[] = [];
  let reservation = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: unknown, init: RequestInit = {}) => {
    const url = String(input), body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    reads.push(url);
    if (body) writes.push({ url, body });
    if (url.endsWith('/budget')) return json({ tokensToday: 0, costMonthCny: options.costMonthCny ?? 0 });
    if (url.endsWith('/sources')) return json({ sources: options.sources ?? [aihotSource] });
    if (url === aihotSource.url) return json({ items: [] });
    if (url.endsWith('/snapshots')) return json({ changed: false });
    if (url.endsWith('/api/platforms')) return json({ platforms: [{ id: 'vendor', name: 'Vendor', site: 'https://vendor.example', xHandles: [], staffHandles: [] }] });
    if (url.includes('/leads?')) return json({ leads: options.leads ?? [] });
    if (url.includes('/official-reviews/queue')) return json({jobs:options.officialJob?[{id:'vendor-max-api',title:candidate.title}]:[],remaining:options.officialJob?1:0});
    if(url.endsWith('/official-reviews/vendor-max-api/claim'))return json({claimed:true,jobId:'12345678-1234-4234-8234-123456789012',offer:{...candidate,id:'vendor-max-api',firstChannel:'reddit',evidence:{url:'https://community.example/post',tier:'media',capturedAt:new Date().toISOString(),excerpts:{}}},platform:{id:'vendor',name:'Vendor',site:'https://vendor.example',xHandles:[],staffHandles:[]},sources:[]});
    if(url.endsWith('/official-reviews/vendor-max-api/result'))return json({status:body.status});
    if(url==='https://mcp.exa.ai/mcp')return options.officialSearchStatus?new Response('unavailable',{status:options.officialSearchStatus}):json({result:{content:[{type:'text',text:'Title: Official benefit\nURL: https://vendor.example/confirmed\nHighlights: Discovery snippet only'}]}});
    if (url.endsWith('/offers-index')) return json({ offers: options.known ?? [] });
    if (url.includes('/corrections?')) return json({ corrections: [] });
    if (url.endsWith('/model-budget/reserve')) return options.budgetDenied ? jsonError() : json({ id: ++reservation });
    if (url.endsWith('/settle')) return json({ ok: true });
    if (url.includes('generativelanguage.googleapis.com')) return options.geminiStatus
      ? new Response('quota exhausted', { status: options.geminiStatus })
      : json({ candidates: [{ content: { parts: [{ text: options.modelOutput ?? JSON.stringify({ offers: [candidate] }) }] } }], usageMetadata: { totalTokenCount: 100 } });
    if (url.includes('api.deepseek.com')) return json({ choices: [{ message: { content: options.modelOutput ?? JSON.stringify({ offers: [candidate] }) } }], usage: { total_tokens: 100, prompt_tokens: 80, completion_tokens: 20 } });
    if (url.endsWith('/offers')) return json({ results: body.map((o: { id: string }) => ({ id: o.id, created: true, reviewState: 'pending' })) });
    if (url.endsWith('/status') || url.endsWith('/runs')) return json({ ok: true });
    if (url.includes('/verification-queue')) return options.verificationStatus
      ? new Response('verification queue unavailable', { status: options.verificationStatus }) : json({ offers: options.verification ?? [] });
    if (url.endsWith('/verify')) return json({ verified: options.verified ?? true });
    if (url.startsWith('https://r.jina.ai/')) return new Response('blocked', { status: 403 });
    if (url.startsWith('https://vendor.example/')) {
      const response = options.pages?.[url] ?? page;
      return typeof response === 'number' ? new Response('blocked', { status: response }) : new Response(response);
    }
    if(url==='https://community.example/post')return new Response(page);
    throw new Error(`Unexpected mocked request: ${url}`);
  }));
  return { reads, writes, payloads: (suffix: string) => writes.filter(write => write.url.endsWith(suffix)).map(write => write.body) };
}
const jsonError = () => new Response(JSON.stringify({ error: '模型预算不足' }), { status: 429 });
const rss = (...urls: string[]) => `<rss><channel>${urls.map(url => `<item><title>Free API credits</title><link>${url}</link></item>`).join('')}</channel></rss>`;

beforeEach(() => {
  vi.resetModules();
  for (const [key, value] of Object.entries({ API_BASE: 'https://mock.local', INGEST_TOKEN: 'test-ingest', GEMINI_API_KEY: 'test-key', OPENROUTER_API_KEY: '', GLM_API_KEY: '', DEEPSEEK_API_KEY: '', FAST_LEADS: '1', FORCE: '0', DRY_RUN: '0', ONLY_SOURCES: '', DAILY_TOKEN_CAP: '0', MONTHLY_COST_CAP_CNY: '10', LLM_MIN_GAP_MS: '0' })) vi.stubEnv(key, value);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('lead evidence and value delivery', () => {
  it('keeps an unreachable official link at media tier and preserves the complete value range', async () => {
    const h = harness({ leads: [lead], pages: { [lead.url]: 403 } });
    const { runPipeline } = await import('../pipeline/run');
    await runPipeline();
    expect(h.payloads('/offers')[0][0]).toMatchObject({ usdEstimate: 100, usdMax: 200, evidence: { tier: 'media', excerpts: { benefit } } });
    expect(h.payloads('/status')[0]).toMatchObject({ status: 'linked' });
  });

  it('never treats the aggregator headline as a quotation from a successfully fetched official page', async () => {
    const headline = 'Every member receives an additional 900 dollars.';
    const h = harness({ leads: [{ ...lead, title: headline }], modelOutput: JSON.stringify({ offers: [{ ...candidate, excerpts: { benefit: headline } }] }) });
    const { runPipeline } = await import('../pipeline/run');
    await runPipeline();
    expect(h.payloads('/offers')[0][0].evidence.tier).toBe('site');
    expect(h.payloads('/offers')[0][0].evidence.excerpts).toEqual({});
  });

  it('does not advance an official page checkpoint after an invalid model envelope', async () => {
    vi.stubEnv('FAST_LEADS', '0');
    const h = harness({ sources: [{ ...rssSource, kind: 'web_list', url: lead.url }], modelOutput: '{"error":"could not read source"}' });
    const { runPipeline } = await import('../pipeline/run');
    const result = await runPipeline();
    expect(result.ok).toBe(false);
    expect(h.payloads('/snapshots').some(snapshot => snapshot.hash)).toBe(false);
    expect(h.payloads('/offers')).toEqual([]);
  });

  it('gives reset extraction the existing event dates and evidence links, not just its repeated title', async () => {
    const evidenceUrl = 'https://x.com/OpenAI/status/1950000000000000000';
    const h = harness({ leads: [lead], known: [{ id: 'vendor-july-reset', platformId: 'vendor', title: 'Codex 重置卡发放', valueText: '1 张',
      tags: ['reset'], claimStart: '2026-07-13', publishedAt: '2026-07-13T18:00:00Z', evidenceUrl }] });
    const { runPipeline } = await import('../pipeline/run');
    await runPipeline();
    const instruction = h.writes.find(write => write.url.includes('googleapis'))!.body.systemInstruction.parts[0].text;
    expect(instruction).toContain('2026-07-13');
    expect(instruction).toContain('2026-07-13T18:00:00Z');
    expect(instruction).toContain(evidenceUrl);
  });
});

describe('official RSS progress', () => {
  it('continues beyond a broken article and checkpoints only articles completed successfully', async () => {
    vi.stubEnv('FAST_LEADS', '0');
    const bad = 'https://vendor.example/bad', good = 'https://vendor.example/good';
    const h = harness({ sources: [rssSource], pages: { [rssSource.url]: rss(bad, good), [bad]: 403 } });
    const { runPipeline } = await import('../pipeline/run');
    const result = await runPipeline();
    expect(h.reads).toContain(good);
    expect(h.payloads('/offers')).toHaveLength(1);
    expect(h.payloads('/snapshots').find(snapshot => snapshot.hash)?.text).toBe(good);
    expect(result.stats.coverageDegraded).toBe(true);
    expect(result.ok).toBe(false);
  });

  it('force re-extracts already completed RSS articles with an unchanged feed hash', async () => {
    vi.stubEnv('FAST_LEADS', '0');
    vi.stubEnv('FORCE', '1');
    const url = 'https://vendor.example/offer';
    const h = harness({ sources: [{ ...rssSource, lastHash: sha256(url), lastText: url }], pages: { [rssSource.url]: rss(url) } });
    const { runPipeline } = await import('../pipeline/run');
    await runPipeline();
    expect(h.reads).toContain(url);
    expect(h.payloads('/offers')).toHaveLength(1);
  });

  it('does not let five broken articles permanently occupy the five successful-extraction slots', async () => {
    vi.stubEnv('FAST_LEADS', '0');
    const broken = Array.from({ length: 5 }, (_, n) => `https://vendor.example/bad-${n}`);
    const good = 'https://vendor.example/good';
    const h = harness({ sources: [rssSource], pages: { [rssSource.url]: rss(...broken, good), ...Object.fromEntries(broken.map(url => [url, 403])) } });
    const { runPipeline } = await import('../pipeline/run');
    await runPipeline();
    expect(h.reads).toContain(good);
    expect(h.payloads('/snapshots').find(snapshot => snapshot.hash)?.text).toBe(good);
  });
});

describe('verification health', () => {
  it('still records a failed run if the verification queue itself is unavailable', async () => {
    vi.stubEnv('FAST_LEADS', '0');
    const h = harness({ verificationStatus: 500 });
    const { runPipeline } = await import('../pipeline/run');
    const result = await runPipeline();
    expect(result.ok).toBe(false);
    expect(h.payloads('/runs')[0]).toMatchObject({ ok: false, stats: { verificationFailed: 1, coverageDegraded: true } });
  });

  it.each(['unreachable', 'missing quotes'])('reports degraded coverage when an existing offer is %s', async reason => {
    vi.stubEnv('FAST_LEADS', '0');
    const h = harness({ verification: [{ id: 'vendor-free', url: lead.url, tier: 'site', pageHash: sha256(relevantText(`${benefit}\n${'Product documentation. '.repeat(50)}`)), proposalHash: null, sourceId: null, platformId: 'vendor' }],
      pages: reason === 'unreachable' ? { [lead.url]: 403 } : undefined, verified: false });
    const { runPipeline } = await import('../pipeline/run');
    const result = await runPipeline();
    expect(result.ok).toBe(false);
    expect(result.stats.coverageDegraded).toBe(true);
    expect(result.stats.verificationFailed).toBeGreaterThan(0);
    expect(h.payloads('/runs')[0]).toMatchObject({ ok: false, stats: { coverageDegraded: true } });
  });
});

describe('bounded lead processing and paid fallback', () => {
  it('finishes immediately after a budget refusal and preserves remaining new leads', async () => {
    const h = harness({ leads: Array.from({ length: 50 }, (_, id) => ({ ...lead, id })), budgetDenied: true });
    const { runPipeline } = await import('../pipeline/run');
    const result = await runPipeline();
    expect(h.payloads('/model-budget/reserve')).toHaveLength(1);
    expect(h.payloads('/status')).toEqual([]);
    expect(result.stats.coverageDegraded).toBe(true);
    expect(result.ok).toBe(false);
  });

  it.each([
    { title: 'Codex 重置卡已发放', createdAt: new Date().toISOString() },
    { title: '工具发布动态', raw: 'New product settings.', createdAt: new Date(Date.now() - 3 * 3600_000).toISOString() },
  ])('uses the budgeted paid fallback after free quota failure for an eligible lead %o', async details => {
    vi.useFakeTimers();
    vi.stubEnv('DEEPSEEK_API_KEY', 'test-key');
    const h = harness({ leads: [{ ...lead, ...details }], geminiStatus: 429 });
    const { runPipeline } = await import('../pipeline/run');
    const run = runPipeline();
    await vi.runAllTimersAsync();
    await run;
    expect(h.reads.filter(url => url.includes('api.deepseek.com'))).toHaveLength(1);
    expect(h.payloads('/offers')).toHaveLength(1);
    expect(h.payloads('/model-budget/reserve').find(body => body.provider === 'deepseek').costCny).toBeGreaterThan(0);
  });

  it('keeps ordinary fresh leads free-only and does not repeat quota attempts for every lead', async () => {
    vi.useFakeTimers();
    vi.stubEnv('DEEPSEEK_API_KEY', 'test-key');
    const h = harness({ leads: Array.from({ length: 50 }, (_, id) => ({ ...lead, id, title: '工具发布动态', raw: 'New product settings.' })), geminiStatus: 429 });
    const { runPipeline } = await import('../pipeline/run');
    const run = runPipeline();
    await vi.runAllTimersAsync();
    const result = await run;
    expect(h.reads.filter(url => url.includes('googleapis'))).toHaveLength(1);
    expect(h.reads.filter(url => url.includes('api.deepseek.com'))).toHaveLength(0);
    expect(h.payloads('/status')).toEqual([]);
    expect(result.stats.coverageDegraded).toBe(true);
  });

  it('does not enable paid calls when the existing monthly cost ceiling is exhausted', async () => {
    vi.useFakeTimers();
    vi.stubEnv('DEEPSEEK_API_KEY', 'test-key');
    const h = harness({ leads: [{ ...lead, title: 'Codex 重置卡已发放' }], geminiStatus: 429, costMonthCny: 10 });
    const { runPipeline } = await import('../pipeline/run');
    const run = runPipeline();
    await vi.runAllTimersAsync();
    await run;
    expect(h.reads.some(url => url.includes('api.deepseek.com'))).toBe(false);
    expect(h.payloads('/status')).toEqual([]);
  });
});


describe('scheduled official review integration',()=>{
  it('automatically searches and re-extracts official evidence in the normal pipeline run',async()=>{
    const h=harness({officialJob:true,leads:[{...lead,origin:'reddit',url:'https://community.example/post'}]});
    const {runPipeline}=await import('../pipeline/run');const result=await runPipeline();
    expect(h.reads).toContain('https://mcp.exa.ai/mcp');expect(h.reads).toContain('https://vendor.example/confirmed');
    const writes=h.payloads('/offers');expect(writes).toHaveLength(2);
    expect(writes[0][0].evidence.tier).toBe('media');
    expect(writes[1][0]).toMatchObject({id:'vendor-max-api',officialReviewJobId:'12345678-1234-4234-8234-123456789012',usdMax:200,evidence:{url:'https://vendor.example/confirmed',tier:'site',excerpts:{benefit}}});
    expect((result.stats as any).officialReview.matched).toBe(1);
  });
  it('records search failure and coverage degradation rather than pretending no official benefit exists',async()=>{
    const h=harness({officialJob:true,officialSearchStatus:429});
    const {runPipeline}=await import('../pipeline/run');const result=await runPipeline();
    expect(h.payloads('/offers')).toHaveLength(0);
    expect(h.payloads('/official-reviews/vendor-max-api/result')[0]).toMatchObject({status:'failed'});
    expect(result.stats.coverageDegraded).toBe(true);
  });
});

it('leaves the community draft untouched when fetched official pages do not corroborate the target',async()=>{
  const h=harness({officialJob:true,modelOutput:'{"offers":[]}'});
  const {runPipeline}=await import('../pipeline/run');await runPipeline();
  expect(h.payloads('/offers')).toHaveLength(0);
  expect(h.payloads('/official-reviews/vendor-max-api/result')[0]).toMatchObject({status:'unresolved'});
});
