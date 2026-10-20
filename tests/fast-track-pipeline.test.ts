import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const job = { id: 'job-1', platformId: 'odyssey', platformName: 'Odyssey', url: 'https://odyssey.world/introducing-odyssey-3', benefit: 'Odyssey-3 公开研究预览，可免费试用', note: null };
const offer = { key: 'odyssey-3-preview', title: 'Odyssey-3 公开研究预览', type: 'free', modalities: ['video'], claimMethod: 'signup', requirements: ['none'], audience: 'all', valueText: '免费试用', usdEstimate: null, claimStart: null, claimEnd: null, endKind: 'unknown', creditValidity: null, sourceTz: 'UTC', steps: ['打开官网'], excerpts: { benefit: 'Odyssey-3 公开研究预览，可免费试用' } };

interface Options { freeStatus?: number; freeOffer?: Record<string, unknown>; paidStatus?: number; publishSteps?: number; errorsBeforeOwner?: number; reviewFacts?: unknown; reviewBadQuotes?: boolean; jobOverride?: Record<string,unknown>; pageText?: string }
function harness(options: Options = {}) {
  const currentJob={...job,...options.jobOverride};
  const posts: { url: string; body: any }[] = [];
  let advances = 0, results = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: unknown, init: RequestInit = {}) => {
    const url = String(input), body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    if (init.method === 'POST') posts.push({ url, body });
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.endsWith('/fast-track/queue')) return json({ jobs: [{ id: 'job-1', publishing: false }] });
    if (url.endsWith('/fast-track/job-1/claim')) return json({ job:currentJob });
    if (url.endsWith('/fast-track/job-1/result')) {
      results++;
      if (body.error) return json({ state: results >= (options.errorsBeforeOwner ?? 3) ? 'needs_owner' : 'queued' });
      return json({ state: options.publishSteps ? 'publishing' : 'published' });
    }
    if (url.endsWith('/fast-track/job-1/advance')) return json({ state: ++advances >= (options.publishSteps ?? 0) ? 'published' : 'publishing' });
    if (url.endsWith('/model-budget/reserve')) return json({ id: 1 });
    if (url.endsWith('/settle')) return json({ ok: true });
    const reviewing=JSON.stringify(body??{}).includes('独立字段核对助手');
    const review={facts:options.reviewFacts??{type:{value:'free',quote:'Odyssey-3 is available as a public research preview.'},modalities:[{value:'video',quote:'Odyssey-3 is available as a public research preview.'}],audience:{value:'all',quote:''}}};
    if(options.reviewBadQuotes)review.facts={type:{value:'free',quote:'NOT IN SOURCE'},modalities:[{value:'video',quote:'NOT IN SOURCE'}],audience:{value:'all',quote:''}};
    if (url.includes('generativelanguage.googleapis.com')) return options.freeStatus ? new Response('quota', { status: options.freeStatus }) : json({ candidates: [{ content: { parts: [{ text: JSON.stringify(reviewing?review:{ offers: [options.freeOffer ?? offer] }) }] } }], usageMetadata: { totalTokenCount: 100 } });
    if (url.includes('api.deepseek.com') && !/json/i.test(String(body?.messages?.[0]?.content))) return json({error:'Prompt must contain JSON'},400);
    if (url.includes('api.deepseek.com')) return options.paidStatus ? new Response('down', { status: options.paidStatus }) : json({ choices: [{ message: { content: JSON.stringify(reviewing?review:{ offers: [offer] }) } }], usage: { total_tokens: 9000, prompt_tokens: 8000, completion_tokens: 1000 } });
    if (url.startsWith(new URL(String(currentJob.url)).origin)) return new Response(options.pageText??'<html><body><h1>Introducing Odyssey-3</h1><p>Odyssey-3 is available as a public research preview. Try it free in your browser today.</p></body></html>', { headers: { 'Content-Type': 'text/html' } });
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
  expect(h.called('generativelanguage')).toHaveLength(2);
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
  expect(h.called('api.deepseek.com')).toHaveLength(2);
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

it('uses the paid fallback for schema-invalid free fields even when every basic key is present', async () => {
 const h=harness({freeOffer:{...offer,claimMethod:'login',sourceTz:'Mars/Somewhere'}});
 const {runFastTrack}=await import('../pipeline/fast-track');
 expect(await runFastTrack(options())).toMatchObject({published:1});
 expect(h.called('api.deepseek.com')).toHaveLength(2);
 expect(h.result().fields.claimMethod).toBe('signup');
});

it('does not accept an unmapped member label as a complete free-model result', async () => {
 const h=harness({freeOffer:{...offer,requirements:['member:Odyssey Pro']}});
 const {runFastTrack}=await import('../pipeline/fast-track');
 await runFastTrack(options());
 expect(h.called('api.deepseek.com')).toHaveLength(2);
});
it('sends the grouped cross-vendor catalog only in the prompt alongside valuation instructions',async()=>{
 const product=(id:string)=>({id,name:id,aliases:['alias-'+id],platformIds:[id],status:'verified',sourceUrl:'https://audit.example/'+id,verifiedAt:'2026-10-20',revision:1});
 const catalog={revision:7,products:[product('issuer'),product('other-vendor')],plans:[{...product('other-pro'),productId:'other-vendor',billing:'paid'}]};
 const h=harness({jobOverride:{membershipCatalog:catalog}});
 const {runFastTrack}=await import('../pipeline/fast-track');
 expect(await runFastTrack(options())).toMatchObject({published:1});
 const body=JSON.parse(String(h.called('generativelanguage')[0][1]?.body));
 const prompt=body.contents[0].parts[0].text as string;
 const marker='会员目录（plans 按所属 product 分组，全部为已核实项）：';
 const projected=JSON.parse(prompt.slice(prompt.indexOf(marker)+marker.length));
 expect(projected).toMatchObject({revision:7,products:[{id:'issuer',plans:[]},{id:'other-vendor',plans:[{id:'other-pro',billing:'paid'}]}]});
 expect(JSON.stringify(projected)).not.toContain('audit.example');
 expect(JSON.stringify(body)).toContain('valuationFactors');
});
it('rebuilds from original inputs without passing saved or owner answers and never runs the publishing loop',async()=>{
 const h=harness();const {rebuildFastTrackFields}=await import('../pipeline/fast-track');
 const result=await rebuildFastTrackFields({...job,ownerFields:{title:'SECRET_OWNER_ANSWER'},previousFields:{title:'SECRET_SAVED_ANSWER'}} as any,options());
 expect(result.fields).toMatchObject({title:offer.title});expect(result.semanticReview).toBeDefined();
 const requests=JSON.stringify(h.called('generativelanguage'));
 expect(requests).not.toContain('SECRET_OWNER_ANSWER');expect(requests).not.toContain('SECRET_SAVED_ANSWER');
 expect(requests).toContain('管理员已填字段（优先保留）：{}');
 expect(h.posts.filter(p=>/\/fast-track\//.test(p.url))).toEqual([]);
});

it('repairs the real Perplexity four-field mistake in a separate model call before submitting a publish result',async()=>{
 const text='Ask Computer to reverse-engineer an app and it inspects how the app works without its source code, then builds a working version. Tasks that use /reverse-engineer are free through October 31, up to 10,000 credits per user.';
 const member={schemaVersion:'membership-v1',status:'confirmed',catalogRevision:1,anyOf:[{allOf:[{productId:'perplexity',scope:'plans',planIds:['perplexity-pro'],excludePlanIds:[]}]}],evidenceUrls:['https://perplexity.ai/promo']};
 const catalog={revision:1,products:[{id:'perplexity',name:'Perplexity',aliases:[],status:'verified'}],plans:[{id:'perplexity-pro',productId:'perplexity',status:'verified',billing:'paid'}]};
 const h=harness({jobOverride:{platformId:'perplexity',platformName:'Perplexity',url:'https://perplexity.ai/promo',benefit:'有效付费会员在Computer使用/reverse-engineer免费至2026年10月31日，每人最高10000credits',membershipCatalog:catalog},pageText:`<html><body>${text}</body></html>`,freeOffer:{...offer,type:'trial',audience:'old',modalities:['text','image'],requirements:['member:Perplexity Pro'],membershipRequirement:member},reviewFacts:{type:{value:'free',quote:'Tasks that use /reverse-engineer are free through October 31, up to 10,000 credits per user.'},modalities:[{value:'text',quote:'Ask Computer to reverse-engineer an app and it inspects how the app works without its source code, then builds a working version.'}],audience:{value:'all',quote:''}}});
 const {runFastTrack}=await import('../pipeline/fast-track');
 expect(await runFastTrack(options())).toMatchObject({published:1,needsOwner:0});
 expect(h.result().fields).toMatchObject({type:'free',modalities:['text'],audience:'all',requirements:['member:Perplexity Pro','net'],membershipRequirement:member});
 expect(h.result().semanticReview.changes.map((c:any)=>c.field)).toEqual(['type','modalities','audience','requirements']);
 expect(h.called('generativelanguage')).toHaveLength(2);expect(h.called('api.deepseek.com')).toHaveLength(0);
});
it('never publishes an unverified draft when semantic reviewers keep inventing quotes',async()=>{
 const h=harness({reviewBadQuotes:true});
 const {runFastTrack}=await import('../pipeline/fast-track');
 expect(await runFastTrack(options(false))).toMatchObject({published:0,needsOwner:1});
 expect(h.posts.filter(p=>p.url.endsWith('/result')).every(p=>p.body.error)).toBe(true);
 expect(h.result().error).toContain('语义核对');
});
