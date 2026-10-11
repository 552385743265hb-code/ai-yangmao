import * as YMMembership from '../src/shared/membership';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';

const pause = () => new Promise(resolve => setTimeout(resolve, 0));
const offer = (id: string, extra: Record<string, unknown> = {}) => ({ id, code: id, platformId: 'vendor', platform: 'Vendor', title: '免费额度', type: '限时免费开放', value: '免费 10 积分', end: '截止未知', status: 'active', reviewState: 'pending', requirements: ['none'], audience: 'all', claimMethod: 'auto', sourceTz: 'UTC', evidenceUrl: 'https://vendor.example', evidenceTier: 'docs', excerpts: {}, models: [], tags: [], modalities: ['text'], checks: [], steps: [], ...extra });
const queue = (pending: ReturnType<typeof offer>[]) => ({ pending, incomplete: [], newLeads: 0, needsVerification: [], pendingPlatforms: [], suggestAutoPublish: [] });

function fixture(handle: (url: string, init?: RequestInit) => unknown | Promise<unknown>) {
  const { window, document } = parseHTML(`<html><body>${readFileSync('web/src/body.html', 'utf8')}</body></html>`);
  document.querySelector('#main')!.innerHTML = '<div id="admBody"></div>';
  window.scrollTo = () => {};
  const charts = new Map<string, any>();
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  const context = createContext({YMMembership, structuredClone, window, document, console, Intl, Date, Map, Set, URL, URLSearchParams, Response, FormData,
    location: { hash: '#admin' }, navigator: {}, getComputedStyle: () => ({ getPropertyValue: () => '#123456' }),
    matchMedia: () => ({ matches: false, addEventListener() {} }), MutationObserver: class { observe() {} },
    localStorage: storage, sessionStorage: storage, setTimeout, clearTimeout, setInterval() {},
    echarts: { getInstanceByDom: () => null, init: (element: HTMLElement) => ({ setOption: (options: any) => charts.set(element.id, options), on() {}, dispose() {}, isDisposed: () => false }) },
    fetch: async (url: string, init?: RequestInit) => new Response(JSON.stringify(url.endsWith('/memberships') ? {revision:0,products:[],plans:[]} : await handle(url, init))),
  });
  const app = readFileSync('web/src/app.js', 'utf8');
  runInContext(readFileSync('web/src/data.js', 'utf8') + '\n' + readFileSync('web/src/membership.js', 'utf8') + '\n' + app.slice(0, app.indexOf('(async function boot()')), context);
  const run = (code: string) => runInContext(code, context);
  run("PLATFORMS=[{id:'vendor',name:'Vendor',type:'lab'}];ADM.token='fixture';ADM.role='admin';");
  return { document, window, context, run, charts };
}

function publicOffer(run: (code: string) => any, extra: Record<string, unknown> = {}) {
  run(`OFFERS=[{id:'public-offer',p:'vendor',t:'常驻免费额度',ty:'standing',m:['text'],c:'auto',r:['none'],v:'每月 10 美元',usd:10,noUsd:false,s:null,e:null,ek:'standing',vf:0,vfDay:0,fs:-10,since:-10,discoveredAt:new Date(Date.now()-10*DAY).toISOString(),verifiedAt:new Date().toISOString(),withdrawnAt:null,st:'docs',tz:'UTC',val:'每月',aud:'all',cn:true,early:'官方页面',why:'',steps:[],models:[],tags:[],evidence:{url:'https://vendor.example',excerpts:{}},note:'原文',verify:'ok',...${JSON.stringify(extra)}}];prepare();location.hash='#offer-public-offer';`);
}

describe('frontend review workflow', () => {
  it('shows proposal additions, removals and edits against public values, including zero and nested evidence', async () => {
    const changes = [
      {field:'valueText',from:'新人送20积分',to:'新人送40积分'},
      {field:'usdEstimate',from:0,to:null},
      {field:'models',from:['Model A','Model A','Model B'],to:['Model A','Model C']},
      {field:'claimEnd',from:null,to:'2026-10-20'},
      {field:'evidence',from:{url:'https://vendor.example/old',tier:'media',excerpts:{benefit:'旧原文'},capturedAt:'old'},to:{url:'https://vendor.example/new',tier:'docs',excerpts:{benefit:'<img src=x onerror=alert(1)>'},capturedAt:'new'}},
    ];
    const f = fixture(() => queue([offer('updated',{pendingUpdate:true,updateDiff:changes})]));
    await f.run('admQueue()');
    const diff=f.document.querySelector('[data-update-diff]')!;
    expect(diff.hasAttribute('open')).toBe(true);
    expect(diff.textContent).toContain('当前公开'); expect(diff.textContent).toContain('待审更新');
    expect(diff.querySelector('[data-diff-field="valueText"] del')!.textContent).toBe('2');
    expect(diff.querySelector('[data-diff-field="valueText"] ins')!.textContent).toBe('4');
    expect(diff.querySelector('[data-diff-field="usdEstimate"]')!.textContent).toContain('删除');
    expect(diff.querySelector('[data-diff-field="usdEstimate"] del')!.textContent).toBe('$0');
    expect(diff.querySelector('[data-diff-field="claimEnd"]')!.textContent).toContain('新增');
    const models=diff.querySelector('[data-diff-field="models"]')!;
    expect(models.querySelectorAll('del')).toHaveLength(2);expect(models.querySelector('ins')!.textContent).toBe('Model C');
    expect(diff.querySelector('[data-diff-field="evidence.url"]')).not.toBeNull();
    expect(diff.querySelector('[data-diff-field="evidence.tier"]')!.textContent).toContain('官方文档');
    expect(diff.querySelector('[data-diff-field="evidence.capturedAt"]')).toBeNull();
    expect(diff.querySelector('img')).toBeNull();expect(diff.textContent).toContain('<img src=x onerror=alert(1)>');
  });
  it('distinguishes missing proposal comparison data from metadata-only updates and preserves false values', () => {
    const f=fixture(()=>queue());
    expect(f.run('reviewDiffBlock({pendingUpdate:true})')).toContain('暂未加载');
    expect(f.run(`reviewDiffBlock({pendingUpdate:true,updateDiff:[{field:'evidence',from:{capturedAt:'old'},to:{capturedAt:'new'}}]})`)).toContain('仅核验记录更新');
    expect(f.run(`reviewDiffRows([{field:'flag',from:false,to:true}])[0].kind`)).toBe('modify');
    expect(f.run('reviewDiffBlock({pendingUpdate:false})')).toBe('');
  });
  it('shows official backlog, exhausted retries and degraded verification separately',async()=>{
    const page=fixture(()=>({hoursSince:1,failingSources:[],tokensToday:0,tokenCap:0,costMonthCny:0,sources:[],
      officialReviewCounts:{waiting:7,checking:1,retrying:3,matched:4,exhausted:2,stalled:1},leadWorkflow:{new:5,reviewing:6,important:1},coverageDegraded:true,lastCollectAttempt:{stats:{verificationFailed:9,verificationDeferred:0}}}));
    await page.run('admHealth()');
    const text=page.document.querySelector('#admBody')!.textContent;
    expect(text).toContain('待处理 7');expect(text).toContain('重试耗尽待人工 2');expect(text).toContain('核验失败 9 次');expect(text).toContain('线索复核 6');
  });
  it('keeps a review deep link through login and focuses the pending card', async () => {
    const page = fixture(url => url.endsWith('/whoami') ? { role: 'admin', who: 'admin' } : queue([offer('target'), offer('other')]));
    page.run("location.hash='#admin-offer-target';ADM.token='';ADM.role='';ADM.tab='health';ADM.sug='reject';render(false)");
    expect(page.document.querySelector('#admLogin')).not.toBeNull();
    (page.document.querySelector('#admTok') as HTMLInputElement).value = 'fixture';
    page.document.querySelector('#admLogin')!.dispatchEvent(new page.window.Event('submit'));
    await pause();
    expect(page.run('route()')).toEqual(['admin', 'target']);
    expect(page.document.querySelector('[data-focused="1"]')?.getAttribute('data-offer-id')).toBe('target');
    expect(page.document.querySelector('#main')?.textContent).not.toContain('没找到这条羊毛');
  });

  it('isolates a legacy invalid publication date instead of breaking the queue', async () => {
    const page = fixture(() => queue([offer('bad-date', { publishedAt: 'unknown' }), offer('valid', { publishedAt: '2026-10-08T10:00:00Z' })]));
    await page.run('admQueue()');
    expect(page.document.querySelectorAll('[data-code]')).toHaveLength(2);
    const card = page.document.querySelector('[data-code="bad-date"]')!;
    card.querySelector('[data-act="edit"]')!.dispatchEvent(new page.window.Event('click'));
    expect((card.querySelector('[name="publishedAt"]') as HTMLInputElement).value).toBe('');
    expect(card.textContent).toContain('原发布时间无效');
  });

  it.each([false, true])('preserves date-only publication precision unless its input changes (changed=%s)', async changed => {
    const writes: { fields: { publishedAt: string } }[] = [];
    const page = fixture((_url, init) => {
      if (init?.body) { writes.push(JSON.parse(String(init.body))); return { changed: ['title'], approved: true }; }
      return queue([offer('date-only', { publishedAt: '2026-10-08' })]);
    });
    // linkedom has no browser FormData implementation; collect successful controls as the browser does.
    page.context.FormData = class {
      fields: [string, string][];
      constructor(form: HTMLFormElement) {
        this.fields = [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name]')]
          .filter(control => !control.disabled && (!(control instanceof page.window.HTMLInputElement) || !['checkbox', 'radio'].includes(control.type) || control.hasAttribute('checked')))
          .map(control => [control.name, control.value]);
      }
      [Symbol.iterator]() { return this.fields[Symbol.iterator](); }
    };
    await page.run('admQueue()');
    const card = page.document.querySelector('[data-code="date-only"]')!;
    card.querySelector('[data-act="edit"]')!.dispatchEvent(new page.window.Event('click'));
    const form = card.querySelector('[data-editform]')!;
    const published = form.querySelector('[name="publishedAt"]') as HTMLInputElement;
    expect(published.value).toBe('2026-10-08T00:00');
    expect(form.textContent).toContain('未改动则保留日期精度');
    (form.querySelector('[name="title"]') as HTMLInputElement).value = '修改标题';
    if (changed) published.value = '2026-10-08T09:30';
    form.dispatchEvent(new page.window.Event('submit')); await pause();
    expect(writes).toHaveLength(1);
    expect(writes[0].fields.publishedAt).toBe(changed ? new Date('2026-10-08T09:30').toISOString() : '2026-10-08');
  });

  it('loads the oldest manual-review lead without replacing a platform draft or earlier rows', async () => {
    const leads = Array.from({ length: 121 }, (_, i) => ({ id: 121 - i, title: `线索 ${121 - i}`, origin: 'aihot', url: `https://vendor.example/${i}`, status: i === 120 ? 'reviewing' : 'new' }));
    const requests: string[] = [];
    let failPageOnce = true;
    const page = fixture(url => {
      requests.push(url);
      const params = new URL(url, 'https://fixture.example').searchParams;
      if (params.has('before') && failPageOnce) { failPageOnce = false; throw new Error('临时网络错误'); }
      const all = leads.filter(l => params.get('status') === 'all' || l.status === params.get('status'));
      const remaining = all.filter(l => !params.has('before') || l.id < Number(params.get('before')));
      const batch = remaining.slice(0, 60);
      return { leads: batch, nextCursor: remaining.length > 60 ? batch.at(-1)!.id : null, total: all.length };
    });
    await page.run("ADM.tab='leads';admLeads()");
    const firstRow = page.document.querySelector('[data-lead="121"]');
    const name = page.document.querySelector('#admPlatform [name="name"]') as HTMLInputElement;
    name.value = '未提交的平台草稿';
    page.document.querySelector('[data-lead-more]')!.dispatchEvent(new page.window.Event('click')); await pause();
    expect(page.document.querySelector('[data-lead-more]')!.textContent).toBe('重试加载');
    expect(page.document.querySelector('[data-lead="121"]')).toBe(firstRow);
    page.document.querySelector('[data-lead-more]')!.dispatchEvent(new page.window.Event('click')); await pause();
    page.document.querySelector('[data-lead-more]')!.dispatchEvent(new page.window.Event('click')); await pause();
    expect(page.document.querySelector('[data-lead="1"] [data-retry]')).not.toBeNull();
    expect(page.document.querySelectorAll('[data-lead]')).toHaveLength(121);
    expect(page.document.querySelector('[data-lead="121"]')).toBe(firstRow);
    expect(name.value).toBe('未提交的平台草稿');
    expect(requests.some(url => url.includes('before=62'))).toBe(true);
    expect(requests.some(url => url.includes('before=2'))).toBe(true);
    const select = page.document.querySelector('[data-lead-status]') as HTMLSelectElement;
    (select.querySelector('option[value="reviewing"]') as HTMLOptionElement).selected = true;
    select.dispatchEvent(new page.window.Event('change')); await pause();
    expect(page.document.querySelectorAll('[data-lead]')).toHaveLength(1);
    expect(page.document.querySelector('[data-lead="1"]')).not.toBeNull();
    expect(name.value).toBe('未提交的平台草稿');
  });

  it('keeps a newer note dirty after an earlier save completes, including after blur', async () => {
    let finish: (() => void) | undefined;
    const page = fixture((url, init) => init?.body ? new Promise(resolve => { finish = () => resolve({ adminNote: JSON.parse(String(init.body)).note }); }) : {});
    publicOffer(page.run); page.run("pOffer('public-offer')");
    const form = page.document.querySelector('#noteForm')!;
    const input = form.querySelector('textarea') as HTMLTextAreaElement;
    input.value = '草稿 A'; input.dispatchEvent(new page.window.Event('input', { bubbles: true }));
    form.dispatchEvent(new page.window.Event('submit'));
    input.value = '草稿 B'; input.dispatchEvent(new page.window.Event('input', { bubbles: true }));
    page.run("pOffer('public-offer')");
    const currentForm = page.document.querySelector('#noteForm')!;
    expect((currentForm.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    expect((currentForm.querySelector('textarea') as HTMLTextAreaElement).value).toBe('草稿 B');
    finish!(); await pause();
    expect(currentForm.querySelector('[data-notemsg]')!.textContent).toBe('当前修改未保存');
    expect(page.run('OMAP["public-offer"].note')).toBe('草稿 A');
    Object.defineProperty(page.document, 'activeElement', { value: page.document.body, configurable: true });
    expect(page.run('keepPage()')).toBe(true);
    page.run("pOffer('public-offer')");
    expect((page.document.querySelector('#noteForm textarea') as HTMLTextAreaElement).value).toBe('草稿 B');
  });

  it('excludes stale and withdrawn standing offers from current-value charts and uses lifecycle status', () => {
    const page = fixture(() => ({}));
    publicOffer(page.run, { verify: 'evidence_missing' });
    page.run("OFFERS.push({...OFFERS[0],id:'withdrawn',verify:'ok',withdrawnAt:new Date(Date.now()-DAY).toISOString()});prepare();pLibrary()");
    const rows = [...page.document.querySelectorAll('tbody tr')].map(row => row.textContent);
    expect(rows[0]).toContain('待核验'); expect(rows[1]).toContain('已结束');
    expect(rows.join('')).not.toContain('新鲜');
    expect(page.charts.get('cRank').series[0].data).toEqual([]);
  });

  it('uses an early withdrawal date in details, cemetery, and weekly ended counts', () => {
    const page = fixture(() => ({}));
    publicOffer(page.run);
    page.run("Object.assign(OFFERS[0],{ty:'free',ek:'date',e:10,withdrawnAt:dayAt(-3).toISOString()});prepare();pOffer('public-offer')");
    const endText = page.run("md(dayAt(-3))+'结束'");
    expect(page.document.querySelector('.ring-big')!.textContent).toContain(endText);
    page.run('pInsights()');
    expect(page.document.querySelector('.grave')!.textContent).toContain(page.run('md(dayAt(-3))'));
    expect(page.run('TREND.ed.reduce((a,b)=>a+b,0)')).toBe(1);
  });
});

it('shows automatic official review provenance and lets reviewers requeue without approving',async()=>{
  const requests:string[]=[];
  const page=fixture((url)=>{requests.push(url);return url.endsWith('/official-retry')?{ok:true}:queue([offer('check',{evidenceTier:'media',officialReview:{status:'unresolved',attempts:2,checkedAt:'2026-10-08T10:00:00Z',nextAttemptAt:'2026-10-08T12:00:00Z',reason:'官网未能确认',originUrl:'https://community.example/post',queries:['Vendor credits'],candidates:['https://vendor.example/credits']}})]);});
  await page.run('admQueue()');
  const block=page.document.querySelector('[data-official-review]')!;
  expect(block.textContent).toContain('暂未找到充分官方证据');expect(block.textContent).toContain('Vendor credits');
  block.querySelector('[data-official-retry]')!.dispatchEvent(new page.window.Event('click'));
  await pause();expect(requests).toContain('/api/admin/offers/check/official-retry');expect(requests.some(p=>p.endsWith('/approve'))).toBe(false);
});

it('shows an actionable lead review task even when there are no pending offers',async()=>{
  const writes:any[]=[];
  const page=fixture((_url,init)=>{
    if(init?.body){writes.push(JSON.parse(String(init.body)));return {ok:true};}
    return {...queue([]),leadTasks:[{id:1312,title:'额度重置预告',url:'https://example.org/post',status:'reviewing',reviewVersion:'lead-version',note:'证据不足，需判断是否已有活动',resolution:{status:'manual',attempts:3,nextAttemptAt:null}}]};
  });
  await page.run('admQueue()');
  const task=page.document.querySelector('[data-lead-task="1312"]');
  expect(task).not.toBeNull();expect(task!.textContent).toContain('关联已有活动');
  (task!.querySelector('[data-lead-reason]') as HTMLInputElement).value='官方只是说明传播进度';
  task!.querySelector('[data-lead-resolve="closed"]')!.dispatchEvent(new page.window.Event('click'));
  await pause();
  expect(writes[0]).toMatchObject({expectedVersion:'lead-version',outcome:'closed',reason:'官方只是说明传播进度'});
});

const valuation = (extra: Record<string, unknown> = {}) => ({ version: 'v1', status: 'priced', method: 'face_value', period: 'one_time', usdEstimate: 20, usdMax: null, fullValue: null, formula: '官方赠送 $20', inputs: {}, sources: [{ url: 'https://vendor.example/pricing', checkedAt: '2026-10-09', excerpt: 'Monthly price: $20', priceBasis: '官方售价' }], assumptions: [], reviewedAt: '2026-10-09', ...extra });
function valuedOffers(page: ReturnType<typeof fixture>, rows: Record<string, unknown>[]) {
  publicOffer(page.run);
  page.run(`OFFERS=${JSON.stringify(rows)}.map(row=>({...OFFERS[0],ty:'free',s:-7,e:7,ek:'date',st:'tested',...row}));prepare()`);
}

describe('V1 valuation across public pages', () => {
  it('reuses timezone formatters across a full calendar while preserving zoned date changes', () => {
    const page = fixture(() => ({}));
    let constructions = 0;
    page.context.Intl = { DateTimeFormat: class extends Intl.DateTimeFormat {
      constructor(...args: ConstructorParameters<typeof Intl.DateTimeFormat>) { super(...args); constructions++; }
    } };
    valuedOffers(page, [{ id: 'ny', s: -2, e: 40, ek: 'date', tz: 'America/New_York', valuation: valuation() },
      { id: 'cn', s: -2, e: 40, ek: 'date', tz: 'Asia/Shanghai', valuation: valuation() }]);
    page.run('pCalendar()');
    const before = page.run('endInstant(OMAP.ny).getTime()');
    page.run('OMAP.ny.e++;');
    expect(page.run('endInstant(OMAP.ny).getTime()')).toBeGreaterThan(before);
    expect(constructions).toBeLessThanOrEqual(2);
  });
  it('requests the V2 response contract and still accepts V1 metadata from the fresh offer list', async () => {
    const old = { id: 'cached', platformId: 'vendor', title: '额度', type: 'standing', valueText: '每月20美元', usdEstimate: 20, usdMax: null,
      modalities: ['text'], requirements: ['none'], claimMethod: 'auto', endKind: 'standing',
      lastVerifiedAt: new Date().toISOString(), discoveredAt: new Date().toISOString(), evidence: { tier: 'docs', excerpts: {} } };
    const page = fixture(url => url === '/api/platforms' ? { platforms: [{ id: 'vendor', name: 'Vendor', type: 'lab' }] }
      : url.startsWith('/api/offers') ? { offers: [{ ...old, valuation: new URL(url, 'https://ai-yangmao.com').searchParams.get('valuation') === 'v2' && new URL(url, 'https://ai-yangmao.com').searchParams.get('schema') === 'valuation-v2' ? valuation() : null }] } : {});
    await page.run('loadData()'); page.run('prepare();pToday()');
    expect(page.run('valueSummary(OFFERS)')).toMatchObject({ official: 20, priced: 1, legacy: 0 });
    expect(page.document.querySelector('.total')!.textContent).toContain('已计价 1/1');
  });
  it('renders the reviewed record version and preserves V1 and V2 amounts while excluding unsupported metadata', () => {
    const page = fixture(() => ({}));
    valuedOffers(page, [{ id: 'v1', valuation: valuation() },
      { id: 'v2', valuation: valuation({ version: 'v2', method: 'official_price', status: 'provisional', usdEstimate: 15,
        inputs: { benchmarkType: 'entry_plan', referencePlan: 'Starter <img src=x onerror=alert(1)>', usageMultiplier: 1 } }) },
      { id: 'v2-null', valuation: valuation({ version: 'v2', status: 'beta_unpriced', method: 'none', usdEstimate: null, formula: null }) },
      { id: 'future', usd: 999, valuation: valuation({ version: 'v3', usdEstimate: 999 }) }]);
    expect(page.run('valueSummary(OFFERS)')).toMatchObject({ official: 35, priced: 2, unknown: 2, legacy: 1 });
    page.run("pOffer('v1')");
    expect(page.document.querySelector('[data-valuation]')!.textContent).toContain('· V1');
    page.run("pOffer('v2')");
    const block = page.document.querySelector('[data-valuation]')!;
    expect(block.textContent).toContain('· V2');
    expect(block.textContent).toContain('Starter <img src=x onerror=alert(1)>');
    expect(block.querySelector('img')).toBeNull();
    expect(page.document.querySelector('[data-detail-value]')!.textContent).toContain('≈ $15');
    page.run("pOffer('v2-null')");
    expect(page.document.querySelector('[data-detail-value]')!.textContent).toContain('价值待定');
    expect(page.document.querySelector('[data-detail-value]')!.textContent).not.toContain('$0');
    page.run("pOffer('future')");
    expect(page.document.querySelector('[data-valuation]')!.textContent).toContain('已审核估值口径');
    expect(page.document.querySelector('[data-valuation]')!.textContent).not.toContain('按 V1');
  });
  it('plots an application model reference separately from real grant caps without inventing an award amount', () => {
    const page = fixture(() => ({}));
    valuedOffers(page, [
      { id: 'grant', ty: 'apply', ek: 'standing', valuation: valuation({ period: 'apply_max', usdEstimate: null, usdMax: 1000, inputs: { first30Max: 10, fullApplyMax: 1000 } }) },
      { id: 'proxy', ty: 'apply', ek: 'standing', valuation: valuation({ version: 'v2', method: 'scenario', status: 'provisional', period: 'apply_max', usdEstimate: 30,
        formula: '30 × 月度固定用量 × Reference Model 价格 = $30', inputs: { benchmarkType: 'substitute_model', referenceModel: 'Reference Model', usageMultiplier: 30,
          first30Max: null, fullApplyMax: null } }) },
      { id: 'proxy-zero', ty: 'apply', ek: 'standing', valuation: valuation({ version: 'v2', method: 'scenario', status: 'provisional', period: 'apply_max', usdEstimate: 0,
        inputs: { benchmarkType: 'substitute_model', referenceModel: 'Reference Model' } }) },
    ]);
    page.run('pApply()');
    const chart = page.charts.get('cApply');
    expect(chart.series.map((s: any) => s.data.map((row: any) => [row.id, row.value]))).toEqual([
      [['proxy', null], ['grant', 10]], [['proxy', 30], ['grant', null]],
    ]);
    expect(chart.series[1].name).toBe('月度使用方案参考');
    expect(chart.tooltip.formatter({ data: chart.series[1].data[0] })).toContain('参考购买成本，不代表申请额度或保证获批');
    expect(chart.tooltip.formatter({ data: chart.series[1].data[0] })).not.toContain('月度参考上限');
    expect(page.document.querySelector('main')!.textContent).toContain('月度参考价值');
    expect(page.run('applyFirst30Maximum(OMAP.proxy)')).toBeNull();
    expect(page.run('applyMaximum(OMAP.proxy)')).toBeNull();
    expect(page.run('valueSummary(OFFERS).total')).toBe(0);
    expect(page.run('valLabel(OMAP.proxy)')).toContain('≈ $30');
    expect(page.run('valLabel(OMAP.proxy)')).toContain('月度使用方案参考');
    expect(page.run('valLabel(OMAP.proxy)')).not.toContain('最高');
    expect(page.run('valLabel(OMAP["proxy-zero"])')).toContain('$0');
    page.document.querySelector('[data-apply-period="full"]')!.dispatchEvent(new page.window.Event('click'));
    expect(page.charts.get('cApply').series).toHaveLength(1);
    expect(page.charts.get('cApply').series[0].data.map((row: any) => [row.id, row.value])).toEqual([['grant', 1000]]);
    page.run("pOffer('proxy')");
    const detail = page.document.querySelector('[data-apply-values]')!.textContent;
    expect(detail).toContain('月度使用方案参考 ≈ $30');
    expect(detail).toContain('完整申请权益上限 价值待定');
    expect(detail).toContain('没有保证可得的下限');
    expect(detail).not.toMatch(/确定金额|月度参考上限/);
    expect(page.document.querySelector('[data-valuation]')!.textContent).toContain('用量倍数30');
    page.run("pOffer('grant')");
    expect(page.document.querySelector('[data-apply-values]')!.textContent).toContain('月度参考上限 $10');
  });
  it('switches evidenced model plans only in the detail amount and formula, leaving the baseline totals intact', () => {
    const page = fixture(() => ({}));
    valuedOffers(page, [{ id: 'models', valuation: valuation({ method: 'scenario', usdEstimate: 4, baselineModel: 'Model A', formula: '默认工作量 × Model A价格 = $4', inputs: { alternatives: [{ model: 'Model A', amount: 4, formula: '默认工作量 × Model A价格 = $4' }, { model: 'Model B', amount: 8, formula: '配额内工作量 × Model B价格 = $8' }] } }) }]);
    const original = page.run('JSON.stringify(valueSummary(OFFERS))');
    page.run("pOffer('models')");
    const select = page.document.querySelector('#valueModel') as HTMLSelectElement;
    expect(select.selectedOptions?.[0]?.textContent || select.querySelector('[selected]')!.textContent).toContain('Model A · 默认基准');
    (select.querySelector('option[value="1"]') as HTMLOptionElement).selected = true;
    select.dispatchEvent(new page.window.Event('change', { bubbles: true }));
    expect(page.document.querySelector('[data-detail-value]')!.textContent).toContain('≈ $8');
    expect(page.document.querySelector('[data-detail-formula]')!.textContent).toBe('配额内工作量 × Model B价格 = $8');
    expect(page.document.querySelector('[data-model-note]')!.textContent).toContain('另一个使用方案：Model B');
    expect(page.run('JSON.stringify(valueSummary(OFFERS))')).toBe(original);
    expect(page.run('OMAP.models.valuation.usdEstimate')).toBe(4);
    (select.querySelector('option[value="default"]') as HTMLOptionElement).selected = true;
    select.dispatchEvent(new page.window.Event('change'));
    expect(page.document.querySelector('[data-detail-value]')!.textContent).toContain('≈ $4');
    expect(page.document.querySelector('[data-detail-formula]')!.textContent).toBe('默认工作量 × Model A价格 = $4');
    page.run('pToday()'); expect(page.document.querySelector('.total')!.textContent).toContain('用量估算 ≈ $4');
  });

  it('keeps unpriced activities unpriced even when alternative inputs contain a number, and invents no choices without evidence', () => {
    const page = fixture(() => ({}));
    valuedOffers(page, [{ id: 'beta', valuation: valuation({ status: 'beta_unpriced', method: 'none', usdEstimate: null, formula: null, inputs: { alternatives: [{ model: 'Unpriced Model', amount: 99, formula: 'not a price for this model' }] } }) }, { id: 'plain', valuation: valuation() }]);
    page.run("pOffer('beta')");
    expect(page.document.querySelector('#valueModel')).toBeNull();
    expect(page.document.querySelector('[data-detail-value]')!.textContent).toContain('公测免费 · 价值待定');
    expect(page.document.querySelector('[data-valuation]')!.textContent).not.toContain('$99');
    page.run("pOffer('plain')"); expect(page.document.querySelector('#valueModel')).toBeNull();
  });

  it('renders alternative formulas, model names and price excerpts as text, and rejects unsafe source links', () => {
    const page = fixture(() => ({}));
    const formula = '<svg onload=alert(1)> × $8', model = '<img src=x onerror=alert(1)>';
    valuedOffers(page, [{ id: 'safe-models', valuation: valuation({ method: 'scenario', baselineModel: 'Model A', inputs: { alternatives: [{ model, amount: 8, formula }] }, sources: [{ url: 'https://vendor.example/pricing', checkedAt: '2026-10-09', excerpt: '<img src=x onerror=alert(1)>', priceBasis: '官方价格' }, { url: 'javascript:alert(1)', checkedAt: '2026-10-09', excerpt: 'unsafe', priceBasis: 'unsafe' }] }) }]);
    page.run("pOffer('safe-models')");
    const select = page.document.querySelector('#valueModel') as HTMLSelectElement;
    expect(select.textContent).toContain(model);
    (select.querySelector('option[value="0"]') as HTMLOptionElement).selected = true;
    select.dispatchEvent(new page.window.Event('change'));
    const block = page.document.querySelector('[data-valuation]')!;
    expect(page.document.querySelector('[data-detail-formula]')!.textContent).toBe(formula);
    expect(block.querySelector('img')).toBeNull(); expect(block.querySelector('svg')).toBeNull();
    expect(block.querySelectorAll('a')).toHaveLength(1);
    expect(block.querySelector('a')!.getAttribute('href')).toBe('https://vendor.example/pricing');
  });

  it('keeps a verified zero distinct from an unknown value and an unreviewed legacy amount', () => {
    const page = fixture(() => ({}));
    valuedOffers(page, [{ id: 'zero', valuation: valuation({ usdEstimate: 0 }) }, { id: 'beta', valuation: valuation({ method: 'none', status: 'beta_unpriced', usdEstimate: null }) }, { id: 'legacy', usd: 999, valuation: null }]);
    page.run("ALLF={...defaultAllF(),sort:'value'};pAll()");
    expect(page.run('valueSummary(OFFERS)')).toMatchObject({ official: 0, officialN: 1, priced: 1, unknown: 2, legacy: 1 });
    expect(page.run('valLabel(OMAP.zero)')).toContain('$0');
    expect(page.run('valLabel(OMAP.beta)')).not.toContain('$0');
    expect(page.run('filtered()[0].id')).toBe('zero');
    expect(page.run('summaryText(valueSummary([OMAP.beta]))')).not.toContain('$0');
  });

  it('preserves API nulls and uses separate first-30 totals, including an annual membership without its full value', async () => {
    const raw = (id: string, v: unknown, usdEstimate: number | null) => ({ id, platformId: 'vendor', title: id, type: 'standing', valueText: '免费权益', usdEstimate, usdMax: null, valuation: v, modalities: ['text'], requirements: ['none'], claimMethod: 'auto', claimStart: null, claimEnd: null, endKind: 'standing', lastVerifiedAt: new Date().toISOString(), discoveredAt: new Date().toISOString(), audience: 'all', sourceTz: 'UTC', evidence: { tier: 'docs', excerpts: {} } });
    const page = fixture(url => url === '/api/platforms' ? { platforms: [{ id: 'vendor', name: 'Vendor', type: 'lab' }] } : url.startsWith('/api/offers') ? { offers: [
      raw('official', valuation(), 20), raw('annual', valuation({ method: 'official_price', period: 'first30', fullValue: 240 }), 20),
      raw('scenario', valuation({ method: 'scenario', status: 'provisional', usdEstimate: 0.93, period: 'first30' }), 0.93),
      raw('beta', valuation({ method: 'none', status: 'beta_unpriced', usdEstimate: null }), null), raw('legacy', null, 999),
    ] } : {});
    await page.run('loadData()'); page.run('prepare();pToday()');
    expect(page.run('OMAP.beta.usd')).toBeNull();
    expect(page.run('valueSummary(OFFERS)')).toMatchObject({ official: 40, scenario: 0.93, priced: 3, total: 5, unknown: 2, legacy: 1 });
    const hero = page.document.querySelector('.total')!.textContent;
    expect(hero).toContain('官方口径 $40'); expect(hero).toContain('用量估算 ≈ $0.93'); expect(hero).not.toContain('$240'); expect(hero).not.toContain('$999');
    expect(hero).toContain('已计价 3/5'); expect(page.run('valLabel(OMAP.beta)')).toContain('公测免费 · 价值待定');
    expect(page.run('valLabel(OMAP.beta)')).not.toContain('$0');
    expect(page.run('dims(OMAP.beta)[0]')).toBeNull(); expect(Number.isFinite(page.run('score(OMAP.beta)'))).toBe(true);
    page.run("pOffer('annual')"); expect(page.document.querySelector('[data-valuation]')!.textContent).toContain('完整权益参考值：$240');
  });

  it('splits standing matrices and ranking by method and keeps unknown modality coverage', () => {
    const page = fixture(() => ({}));
    valuedOffers(page, [
      { id: 'official', ty: 'standing', ek: 'standing', valuation: valuation({ period: 'monthly' }) },
      { id: 'scenario', ty: 'standing', ek: 'standing', valuation: valuation({ method: 'scenario', usdEstimate: 4, period: 'first30' }) },
      { id: 'beta', ty: 'standing', ek: 'standing', m: ['video'], valuation: valuation({ status: 'beta_unpriced', method: 'none', usdEstimate: null }) },
    ]);
    page.run('pLibrary()');
    const rank = page.charts.get('cRank');
    expect(rank.series.map((s: any) => [s.name, s.data[0].value])).toEqual([['官方口径', 20], ['用量估算', 4]]);
    expect(page.charts.get('cMatrix-official').series[0].data.find((r: any) => r[0] === 2)[2]).toBeNull();
    expect(page.charts.get('cMatrix-scenario').series[0].data[0][2]).toBe(4);
    expect(page.document.querySelector('main')!.textContent).toContain('已计价 2/3');
    page.run("OFFERS=OFFERS.filter(o=>o.id==='beta');prepare();pLibrary()");
    expect(page.charts.get('cRank').series[0].data).toEqual([]);
    expect(page.document.querySelector('main')!.textContent).toContain('公测免费 · 价值待定');
  });

  it('uses application maximum with no synthetic floor and omits unknown applications from the dollar chart', () => {
    const page = fixture(() => ({}));
    valuedOffers(page, [
      { id: 'grant', ty: 'apply', ek: 'standing', valuation: valuation({ period: 'apply_max', usdEstimate: null, usdMax: 100000, inputs: { first30Max: 10000, fullApplyMax: 100000 } }) },
      { id: 'grant-small', ty: 'apply', ek: 'standing', valuation: valuation({ period: 'apply_max', usdEstimate: 10, usdMax: 500, inputs: { first30Max: 100, fullApplyMax: 500 } }) },
      { id: 'unknown', ty: 'apply', ek: 'standing', valuation: valuation({ period: 'apply_max', status: 'needs_judgment', method: 'none', usdEstimate: null }) },
    ]);
    page.run('pApply()');
    expect(page.charts.get('cApply').series[0].data.map((x: any) => [x.id, x.value])).toEqual([['grant', 10000], ['grant-small', 100]]);
    page.document.querySelector('[data-apply-period="full"]')!.dispatchEvent(new page.window.Event('click'));
    expect(page.charts.get('cApply').series[0].data.map((x: any) => [x.id, x.value])).toEqual([['grant', 100000], ['grant-small', 500]]);
    expect(page.run("valLabel(OMAP.grant)")).toContain('最高 $100k');
    expect(page.run('valueSummary(OFFERS).total')).toBe(0);
    page.run("pOffer('grant')");
    expect(page.document.querySelector('[data-valuation]')!.textContent).toContain('没有保证可得的下限');
    expect(page.charts.get('cRadar').radar.indicator).toHaveLength(5);
  });

  it('compares application first-30 upper limits by default and switches to whole-plan caps without treating unknown as zero', () => {
    const page = fixture(() => ({}));
    valuedOffers(page, [
      { id: 'gcloud', ty: 'apply', ek: 'standing', val: '2 年', valuation: valuation({ period: 'apply_max', usdEstimate: null, usdMax: 350000, inputs: { first30Max: null, fullApplyMax: 350000 } }) },
      { id: 'oss', ty: 'apply', ek: 'standing', val: '6 个月', valuation: valuation({ period: 'apply_max', usdEstimate: null, usdMax: 1200, inputs: { first30Max: 200, fullApplyMax: 1200 } }) },
      { id: 'baichuan', ty: 'apply', ek: 'standing', valuation: valuation({ period: 'apply_max', status: 'needs_judgment', method: 'none', usdEstimate: null, usdMax: null, inputs: { first30Max: null, fullApplyMax: null } }) },
      { id: 'zero', ty: 'apply', ek: 'standing', valuation: valuation({ period: 'apply_max', usdEstimate: null, usdMax: 0, inputs: { first30Max: 0, fullApplyMax: 0 } }) },
    ]);
    page.run('pApply()');
    expect(page.charts.get('cApply').series[0].data.map((x: any) => [x.id, x.value])).toEqual([['oss', 200]]);
    expect(page.document.querySelector('[data-apply-period="first30"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(page.document.querySelectorAll('.ocard')).toHaveLength(4);
    expect(page.document.querySelector('main')!.textContent).toContain('已计价 2/4');
    expect(page.run('valLabel(OMAP.oss)')).toContain('最高 $1.2k');
    expect(page.run('valLabel(OMAP.oss)')).toContain('完整申请权益上限');
    expect(page.run('valLabel(OMAP.oss)')).not.toContain('最高 $200');
    expect(page.run('valLabel(OMAP.baichuan)')).not.toContain('$0');
    expect(page.run('applyFirst30Maximum(OMAP.gcloud)')).toBeNull();
    page.document.querySelector('[data-apply-period="full"]')!.dispatchEvent(new page.window.Event('click'));
    expect(page.charts.get('cApply').series[0].data.map((x: any) => [x.id, x.value])).toEqual([['gcloud', 350000], ['oss', 1200]]);
    expect(page.document.querySelector('main')!.textContent).toContain('各计划期限不同');
    page.document.querySelector('[data-apply-period="first30"]')!.dispatchEvent(new page.window.Event('click'));
    expect(page.charts.get('cApply').series[0].data.map((x: any) => x.value)).toEqual([200]);
    page.run("pOffer('oss')");
    const values = page.document.querySelector('[data-apply-values]')!.textContent;
    expect(values).toContain('月度参考上限 $200');
    expect(values).toContain('完整申请权益上限 $1.2k');
    expect(values).toContain('6 个月');
    expect(page.charts.get('cRadar').radar.indicator).toHaveLength(5);
    expect(page.run('valueSummary(OFFERS).total')).toBe(0);
    page.run("pOffer('gcloud')");
    expect(page.document.querySelector('[data-apply-values]')!.textContent).toContain('月度参考上限 价值待定');
    page.run("ALLF={...defaultAllF(),st:'',sort:'value'}");
    expect(page.run('filtered()[0].id')).toBe('oss');
  });

  it('keeps small positive values inside the quadrant axis without an unrelated million-dollar ceiling', () => {
    const page = fixture(() => ({}));
    valuedOffers(page, [{ id: 'small', valuation: valuation({ method: 'scenario', usdEstimate: 0.046722 }) },
      { id: 'large', valuation: valuation({ usdEstimate: 300 }) }, { id: 'zero', valuation: valuation({ usdEstimate: 0 }) }]);
    page.run('pInsights()');
    const q = page.charts.get('cQuad');
    expect(q.yAxis.min).toBeLessThanOrEqual(0.046722);
    expect(q.yAxis.max).toBeGreaterThan(300);
    expect(q.yAxis.max).toBeLessThanOrEqual(1000);
    expect(q.series.flatMap((s: any) => s.data.map((d: any) => d.id))).toEqual(['large', 'small']);
    expect(q.series[0].markArea.data[0][1].yAxis).toBe(q.yAxis.max);
  });

  it('keeps historical values in grouped insight charts, but excludes unknown values from quadrants', () => {
    const page = fixture(() => ({}));
    valuedOffers(page, [
      { id: 'official', valuation: valuation() }, { id: 'scenario', valuation: valuation({ method: 'scenario', usdEstimate: 4 }) },
      { id: 'history', withdrawnAt: new Date(Date.now() - 3 * 864e5).toISOString(), valuation: valuation({ usdEstimate: 50 }) },
      { id: 'beta', valuation: valuation({ status: 'beta_unpriced', method: 'none', usdEstimate: null }) },
    ]);
    page.run('pInsights()');
    expect(page.charts.get('cQuad').series.flatMap((s: any) => s.data.map((d: any) => d.id))).toEqual(['official', 'scenario']);
    expect(page.charts.get('cTree').series[0].data.map((group: any) => [group.name, group.children[0].value])).toEqual([['官方口径', 70], ['用量估算', 4]]);
    const tree = page.charts.get('cTree');
    expect(tree.series[0].label.formatter({ name: '', value: 74, data: {} })).toBe('');
    expect(tree.tooltip.formatter({ name: '', value: 74, data: {} })).not.toContain('$74');
    expect(page.charts.get('cRace').series.map((s: any) => [s.name, s.data[0].value])).toEqual([['官方口径', 70], ['用量估算', 4]]);
    expect(page.document.querySelector('.grave')!.textContent).toContain('常驻免费额度');
    page.run("pPlatform('vendor')");
    expect(page.document.querySelector('main')!.textContent).toContain('官方口径 $70');
    expect(page.charts.get('cPRadar').series[0].data.map((d: any) => d.name)).toEqual(['官方口径', '用量估算']);
    expect(page.charts.get('cPHist').series[0].data).toHaveLength(4);
  });

  it('renders unknown calendar days without zero and applies the official-only filter through its change event', () => {
    const page = fixture(() => ({}));
    valuedOffers(page, [
      { id: 'official', valuation: valuation() }, { id: 'scenario', valuation: valuation({ method: 'scenario', usdEstimate: 4 }) },
      { id: 'beta', valuation: valuation({ status: 'beta_unpriced', method: 'none', usdEstimate: null }) },
    ]);
    page.run("CAL.metric='official';pCalendar()");
    const date = page.run('ymd(T0)');
    expect(page.charts.get('cal1').series[0].data.find((r: any) => r[0] === date)[1]).toBe(20);
    page.run("OFFERS=OFFERS.filter(o=>o.id==='beta');prepare();pCalendar()");
    const cal = page.charts.get('cal1'), index = cal.series[0].data.findIndex((r: any) => r[0] === date);
    expect(cal.series[0].data[index][1]).toBeNull();
    expect(cal.tooltip.formatter({ dataIndex: index })).not.toContain('$0');
    expect(page.document.querySelector('#dayList')!.textContent).toContain('公测免费 · 价值待定');
    valuedOffers(page, [{ id: 'official', valuation: valuation() }, { id: 'scenario', valuation: valuation({ method: 'scenario', usdEstimate: 4 }) }]);
    page.run('pAll()');
    const filter = page.document.querySelector('#f-value') as HTMLSelectElement;
    (filter.querySelector('option[value="official"]') as HTMLOptionElement).selected = true;
    filter.dispatchEvent(new page.window.Event('change'));
    expect(page.document.querySelectorAll('#allList .ocard')).toHaveLength(1);
    expect(page.document.querySelector('#allList .stretch')!.getAttribute('href')).toBe('#offer-official');
  });

  it('snapshots the method and nullable value when claiming, and renders personal progress separately', () => {
    const page = fixture(() => ({}));
    valuedOffers(page, [{ id: 'official', valuation: valuation() }, { id: 'scenario', valuation: valuation({ method: 'scenario', usdEstimate: 4 }) }, { id: 'beta', valuation: valuation({ status: 'beta_unpriced', method: 'none', usdEstimate: null }) }]);
    for (const id of ['official', 'scenario', 'beta']) {
      page.run(`location.hash='#offer-${id}';pOffer('${id}')`);
      page.document.querySelector('[data-got]')!.dispatchEvent(new page.window.Event('click', { bubbles: true }));
    }
    expect(page.run('MINE.claimed.map(x=>x.usd)')).toEqual([20, 4, null]);
    expect(page.run('MINE.claimed[1].valuation.method')).toBe('scenario');
    page.run('pMine()');
    const progress = page.document.querySelector('.value-progress')!.textContent;
    expect(progress).toContain('本月已记领 · 官方口径$20'); expect(progress).toContain('本月已记领 · 用量估算≈ $4');
    expect(page.document.querySelector('main')!.textContent).toContain('已计价 2/3');
    expect(page.document.querySelector('main')!.textContent).toContain('不代表已实际节省');
    page.run("pOffer('beta')");
    const explanation = page.document.querySelector('[data-valuation]')!;
    expect(explanation.querySelector('a')!.getAttribute('href')).toBe('https://vendor.example/pricing');
    expect(page.charts.get('cRadar').radar.indicator).toHaveLength(5);
  });
});

describe('admin platform catalog', () => {
  it('refreshes the catalog before editing a newly admitted platform', async () => {
    const calls: {url:string;init?:RequestInit}[]=[];
    const f=fixture((url,init)=>{calls.push({url,init});return url.startsWith('/api/platforms')?{platforms:[{id:'vendor',name:'Vendor',type:'lab'},{id:'unisound',name:'云知声',type:'lab'}]}:queue([offer('new-platform',{platformId:'unisound',platform:'云知声'})]);});
    await f.run('admQueue()');
    f.document.querySelector('[data-act="edit"]')!.dispatchEvent(new f.window.Event('click'));
    const option=f.document.querySelector('select[name="platformId"] option[value="unisound"]');
    expect(option).not.toBeNull();expect(option!.hasAttribute('selected')).toBe(true);
    expect(calls.find(x=>x.url.startsWith('/api/platforms'))?.init?.cache).toBe('no-store');
  });
  it('keeps the current platform selected when catalog refresh fails', async () => {
    const f=fixture(url=>{if(url.startsWith('/api/platforms'))throw new Error('offline');return queue([offer('unknown-platform',{platformId:'unisound',platform:'云知声'})]);});
    await f.run('admQueue()');
    f.document.querySelector('[data-act="edit"]')!.dispatchEvent(new f.window.Event('click'));
    expect(f.document.querySelector('select[name="platformId"] option[selected]')?.getAttribute('value')).toBe('unisound');
  });
  it('adds new choices to an open form without replacing its draft or selection', async () => {
    let expanded=false;
    const f=fixture(url=>url.startsWith('/api/platforms')?{platforms:[{id:'vendor',name:'Vendor',type:'lab'},...(expanded?[{id:'unisound',name:'云知声',type:'lab'}]:[])]}:queue([offer('editing')]));
    await f.run('admQueue()');f.document.querySelector('[data-act="edit"]')!.dispatchEvent(new f.window.Event('click'));
    const form=f.document.querySelector('[data-editform]')!;
    (form.querySelector('[name="title"]') as HTMLInputElement).value='未保存草稿';
    expanded=true;await f.run('refreshAdminPlatforms()');
    expect(f.document.querySelector('[data-editform]')).toBe(form);
    expect((form.querySelector('[name="title"]') as HTMLInputElement).value).toBe('未保存草稿');
    expect(form.querySelector('select[name="platformId"] option[selected]')?.getAttribute('value')).toBe('vendor');
    expect(form.querySelector('select[name="platformId"] option[value="unisound"]')).not.toBeNull();
  });
});

describe('public all-offers freshness', () => {
  it('loads newly published platforms without replacing selected filters', async () => {
    const calls:{url:string;init?:RequestInit}[]=[];
    const raw={id:'new-free',platformId:'unisound',title:'新厂商限免',type:'free',modalities:['text'],claimMethod:'signup',requirements:['none'],audience:'all',valueText:'免费调用',claimEnd:'2026-10-31',endKind:'date',sourceTz:'Asia/Shanghai',lastVerifiedAt:new Date().toISOString(),discoveredAt:new Date().toISOString(),evidence:{tier:'site',url:'https://vendor.example',excerpts:{}}};
    const f=fixture((url,init)=>{calls.push({url,init});return url.startsWith('/api/platforms')?{platforms:[{id:'unisound',name:'云知声',type:'lab'}]}:url.startsWith('/api/offers')?{offers:[raw]}:url.startsWith('/api/meta')?{lastSuccessfulCollect:null}:{};});
    f.run("OFFERS=[];prepare();location.hash='#all';ALLF.m='text';pAll();");
    const filter=f.document.querySelector('#f-m');
    await pause();await pause();
    expect(f.document.querySelector('#f-p option[value="unisound"]')).not.toBeNull();
    expect(f.document.querySelector('#allList')!.textContent).toContain('新厂商限免');
    expect(f.document.querySelector('#f-m')).toBe(filter);expect(f.run('ALLF.m')).toBe('text');
    expect(calls.filter(x=>x.url.startsWith('/api/offers')&&x.init?.cache==='no-store')).toHaveLength(1);
  });
  it('keeps existing content and choices when fresh API requests fail', async () => {
    const f=fixture(()=>{throw new Error('offline');});publicOffer(f.run);
    f.run("location.hash='#all';ALLF.m='text';pAll();");
    await pause();await pause();
    expect(f.document.querySelector('#allList')!.textContent).toContain('常驻免费额度');
    expect(f.document.querySelector('#f-p option[value="vendor"]')).not.toBeNull();
  });
});

it('A28/A29 identity task card collects sources, protects manual fields and previews a versioned decision',async()=>{
 const writes:any[]=[];const task={id:'task-a',kind:'terms_change',revision:4,material_revision:2,entity:{canonical_offer_id:'offer-a',id:'entity-a'},display:{title:'同一活动额度更新',valueText:'20 USD'},facts:{amount:'20'},previousFacts:{amount:'10'},protectedFields:['usdEstimate'],sources:[{candidateId:'c-a',final_url:'https://vendor.example',quotes:[{quote:'Original 20 USD.'}]},{candidateId:'c-b',final_url:'https://vendor.example/faq',quotes:[{quote:'Same campaign.'}]}],sourcesComplete:true,decisions:[{action:'reject',reason_text:'旧证据不足',scope_json:'{}'}]};
 const f=fixture((url,init)=>{if(init?.method==='POST'){writes.push(JSON.parse(String(init.body)));return {decisionId:'d'};}return url.includes('/identity/tasks')?{tasks:[task],nextCursor:null}:queue([]);});
 await f.run('admQueue()');
 const card=f.document.querySelector('[data-identity-task="task-a"]')!;expect(card).not.toBeNull();expect(card.textContent).toContain('Original 20 USD.');expect(card.textContent).toContain('人工保留');expect(card.textContent).toContain('旧证据不足');
 card.querySelector('[data-identity-action="approve"]')!.dispatchEvent(new f.window.Event('click'));await pause();expect(writes).toHaveLength(0);expect(card.querySelector('[data-identity-preview]')!.textContent).toContain('确认通过');
 card.querySelector('[data-identity-confirm]')!.dispatchEvent(new f.window.Event('click'));await pause();expect(writes[0]).toMatchObject({action:'approve',expectedRevision:4});
});
it('A31 old offer hashes replace the URL with the canonical public ID',async()=>{
 const f=fixture(url=>({canonicalOfferId:'public-offer',requestedOfferId:'old',offer:{id:'public-offer'}}));publicOffer(f.run);const changed:string[]=[];
 (f.context as any).history={replaceState:(_a:any,_b:any,url:string)=>{changed.push(url);(f.context as any).location.hash=url;}};
 f.run("location.hash='#offer-old';pOffer('old')");await pause();expect(changed).toEqual(['#offer-public-offer']);
});
it('A28 review facts use readable values without internal citation keys',()=>{
 const f=fixture(()=>queue([]));const html=f.run(`identityFactsTable(null,{benefitPools:[{poolKey:'api',amount:{state:'known',value:{value:'10',unit:'currency',currency:'USD'},evidenceRefs:['private-quote-key']},cadence:{state:'known',value:{kind:'once'},evidenceRefs:['private-quote-key']}}]})`);
 expect(html).toContain('10 USD');expect(html).toContain('单次');expect(html).not.toContain('private-quote-key');
});
it('A27 an unknown identity task can submit an explicitly confirmed product and mechanism',async()=>{
 const sent:any[]=[];const task={id:'unknown',kind:'identity',revision:0,sources:[{candidateId:'c',final_url:'https://vendor.example',quotes:[{id:'q',quote:'Vendor signup grant'}],facts:{issuerProductId:{state:'unknown'},mechanism:{state:'unknown'}}}]};
 const f=fixture((url,init)=>{if(init?.method==='POST'){sent.push(JSON.parse(String(init.body)));return {};}return url.includes('/identity/tasks')?{tasks:[task]}:queue([]);});await f.run('admQueue()');const card=f.document.querySelector('[data-identity-task="unknown"]')!;
 expect(card.querySelector('[data-identity-product]')).not.toBeNull();(card.querySelector('[data-identity-product] option[value="vendor"]') as HTMLOptionElement).selected=true;(card.querySelector('[data-identity-mechanism] option[value="signup_grant"]') as HTMLOptionElement).selected=true;(card.querySelector('[data-identity-reason]') as HTMLInputElement).value='已核对官网注册礼';
 card.querySelector('[data-identity-action="new"]')!.dispatchEvent(new f.window.Event('click'));card.querySelector('[data-identity-confirm]')!.dispatchEvent(new f.window.Event('click'));await pause();expect(sent[0].facts).toMatchObject({issuerProductId:{state:'known',value:'vendor'},mechanism:{state:'known',value:'signup_grant'}});expect(sent[0].reason).toBe('已核对官网注册礼');
});
it('R02 offerless claim cards let administrators inspect and explicitly preview an original refusal',async()=>{
 const sent:any[]=[];const task={id:'claim-task',kind:'identity',revision:2,sources:[{candidateId:'c-new',final_url:'https://vendor.example/new',quotes:[{id:'q',quote:'Campaign x grant'}],facts:{issuerProductId:{state:'known',value:'vendor'},mechanism:{state:'unknown'}}}]};
 const f=fixture((url,init)=>{if(init?.method==='POST'){sent.push(JSON.parse(String(init.body)));return {};}if(url.includes('/claim-decisions'))return {decisions:[{id:'original-refusal',reason:'Original narrow refusal',facts:{},quotes:[{quote:'Original claim evidence'}],url:'https://vendor.example/old'}],nextCursor:null};return url.includes('/identity/tasks')?{tasks:[task]}:queue([]);});
 await f.run('admQueue()');const card=f.document.querySelector('[data-identity-task="claim-task"]')!;expect(card.querySelector('[data-identity-claim-search]')).not.toBeNull();card.querySelector('[data-identity-claim-search]')!.dispatchEvent(new f.window.Event('click'));await pause();expect(card.textContent).toContain('Original claim evidence');card.querySelector('[data-identity-claim-choice]')!.dispatchEvent(new f.window.Event('click'));
 (card.querySelector('[data-identity-reason]') as HTMLInputElement).value='核对两份官方原文确为同一项已拒奖励';card.querySelector('[data-identity-action="same_claim"]')!.dispatchEvent(new f.window.Event('click'));expect(sent).toHaveLength(0);expect(card.querySelector('[data-identity-preview]')!.textContent).toContain('原拒绝');card.querySelector('[data-identity-confirm]')!.dispatchEvent(new f.window.Event('click'));await pause();expect(sent[0]).toMatchObject({action:'same_claim',candidateId:'c-new',decisionId:'original-refusal',expectedRevision:2});
});
it('R02 an offerless evidence reopen requires identity resolution before any approval control',async()=>{
 const task={id:'reopen-claim',kind:'evidence_reopen',entity:null,revision:0,sources:[{candidateId:'c',final_url:'https://vendor.example',quotes:[],facts:{}}]};const f=fixture(url=>url.includes('/identity/tasks')?{tasks:[task]}:queue([]));await f.run('admQueue()');const card=f.document.querySelector('[data-identity-task="reopen-claim"]')!;expect(card.querySelector('[data-identity-action="new"]')).not.toBeNull();expect(card.querySelector('[data-identity-action="approve"]')).toBeNull();
});
it('R03 budget-sized manual history checks continue with the same request and keep the task actionable',async()=>{
 const sent:any[]=[];const task={id:'paged-task',kind:'identity',revision:3,sources:[{candidateId:'c',final_url:'https://vendor.example',quotes:[{id:'q',quote:'Known new activity'}],facts:{}}]};
 const f=fixture((url,init)=>{if(init?.method==='POST'){sent.push(JSON.parse(String(init.body)));return sent.length===1?{outcome:'deferred',retryable:true,reasonCodes:['manual_history_continue']}:{outcome:'created_pending'};}return url.includes('/identity/tasks')?{tasks:[task]}:queue([]);});await f.run('admQueue()');const card=f.document.querySelector('[data-identity-task="paged-task"]')!;(card.querySelector('[data-identity-reason]') as HTMLInputElement).value='Verified an independent new benefit.';card.querySelector('[data-identity-action="new"]')!.dispatchEvent(new f.window.Event('click'));const confirm=card.querySelector('[data-identity-confirm]') as HTMLButtonElement;confirm.dispatchEvent(new f.window.Event('click'));await pause();expect(confirm.disabled).toBe(false);expect(card.textContent).toContain('继续检查');confirm.dispatchEvent(new f.window.Event('click'));await pause();expect(sent).toHaveLength(2);expect(sent[1]).toEqual(sent[0]);expect(confirm.disabled).toBe(true);
});
it('R04 a published card submits its visibility token rather than a draft review token',async()=>{
 const sent:any[]=[];const q={...queue([]),incomplete:[offer('live',{reviewState:'approved',reviewVersion:'identity:draft:7',visibilityVersion:'entity:live:3:time'})]};const f=fixture((url,init)=>{if(init?.method==='POST'){sent.push(JSON.parse(String(init.body)));return {title:'合成'};}return url.includes('/identity/tasks')?{tasks:[]}:q;});await f.run('admQueue()');const details=f.document.querySelector('[data-incomplete]') as HTMLDetailsElement;details.open=true;details.dispatchEvent(new f.window.Event('toggle'));const card=f.document.querySelector('[data-code="live"]')!;expect(card).not.toBeNull();card.querySelector('[data-act="rejectopen"]')!.dispatchEvent(new f.window.Event('click'));(card.querySelector('[data-reason]') as HTMLInputElement).value='确认当前公开活动不应继续收录';card.querySelector('[data-act="reject"]')!.dispatchEvent(new f.window.Event('click'));await pause();expect(sent[0].expectedReviewVersion).toBe('entity:live:3:time');
});
it('R05 paused publications have an explicit versioned reopen preview which does not approve',async()=>{
 const sent:{url:string;body:any}[]=[];const hold={offerId:'paused',title:'暂停的合成活动',reason:'人工下架',action:'unpublish',visibilityVersion:'entity:paused:9:time',restorationTaskId:null};const f=fixture((url,init)=>{if(init?.method==='POST'){sent.push({url,body:JSON.parse(String(init.body))});return {taskId:'restoration'};}return url.includes('/visibility-holds')?{holds:[hold]}:url.includes('/identity/tasks')?{tasks:[]}:queue([]);});await f.run('admQueue()');const card=f.document.querySelector('[data-visibility-hold="paused"]')!;expect(card).not.toBeNull();(card.querySelector('[data-reopen-reason]') as HTMLInputElement).value='已核对原始证据并明确恢复到待审状态';card.querySelector('[data-reopen-preview]')!.dispatchEvent(new f.window.Event('click'));expect(sent).toHaveLength(0);expect(card.textContent).toContain('仍需审核');card.querySelector('[data-reopen-confirm]')!.dispatchEvent(new f.window.Event('click'));await pause();expect(sent[0]).toMatchObject({url:expect.stringContaining('/reopen-visibility'),body:{expectedReviewVersion:'entity:paused:9:time'}});expect(sent[0].body.approve).toBeUndefined();
});
it('keeps rich activity cards, authoritative totals and a separate evidence queue instead of duplicate technical cards',async()=>{
 const ready=offer('ready',{identityTaskId:'t1',reviewVersion:'identity:t1:0',preparation:{stage:'ready',label:'等待你决定',reason:'请核对原文'}}),waiting=offer('waiting',{preparation:{stage:'collecting',label:'等待系统补证',reason:'官方原文不足'}});
 const q={...queue([ready,waiting]),counts:{activities:9,leadReview:80,paused:6,newLeads:0},managedTaskIds:['t1'],leadTasks:[]};
 const f=fixture(url=>url.includes('/identity/tasks')?{tasks:[{id:'t1',kind:'initial',display:{title:ready.title},sources:[]}]}:url.includes('/visibility-holds')?{holds:[{offerId:'paused',title:'暂停活动',reason:'历史可见性状态需要明确重开',visibilityVersion:'v'}]}:q);
 await f.run('admQueue()');expect(f.document.querySelector('[data-review-summary]')?.textContent).toContain('活动待审 9');expect(f.document.querySelector('[data-review-summary]')?.textContent).toContain('线索复核 80');expect(f.document.querySelector('[data-review-summary]')?.textContent).toContain('暂停发布 6');
 expect(f.document.querySelectorAll('[data-code="ready"]')).toHaveLength(1);expect(f.document.querySelector('[data-identity-task="t1"]')).toBeNull();expect(f.document.querySelector('[data-code="ready"] [data-act="approve"]')).not.toBeNull();expect(f.document.querySelector('[data-system-evidence] [data-code="waiting"]')).not.toBeNull();expect(f.document.querySelector('[data-code="waiting"] [data-act="approve"]')).toBeNull();expect(f.document.querySelector('[data-paused-section]')?.hasAttribute('open')).toBe(false);
});

it('later identity pages cannot duplicate already displayed managed activity cards',async()=>{const a=offer('one'),b=offer('two');const q={...queue([a,b]),managedTaskIds:['t1','t2']};const f=fixture(url=>url.includes('/identity/tasks?')?{tasks:[{id:'t2',kind:'initial',sources:[]}]}:url.includes('/identity/tasks')?{tasks:[{id:'t1',kind:'initial',sources:[]}],nextCursor:'t1'}:q);await f.run('admQueue()');const button=f.document.querySelector('[data-identity-slot] button')!;button.dispatchEvent(new f.window.Event('click'));await pause();expect(!!f.document.querySelector('[data-identity-task="t2"]')).toBe(false);expect(f.document.querySelectorAll('[data-code]')).toHaveLength(2);});
it('managed card records manual testing as a draft without claiming publication or decrementing review totals',async()=>{const sent:any[]=[];const q=queue([offer('managed',{evidenceTier:'media',reviewVersion:'identity:task:0'})]);const f=fixture((url,init)=>{if(init?.method==='POST'){sent.push({url,body:JSON.parse(String(init.body))});return {approved:false,reviewVersion:'identity:task:1'};}return url.includes('/identity/tasks')?{tasks:[]}:q;});await f.run('admQueue()');f.document.querySelector('[data-act="tested"]')!.dispatchEvent(new f.window.Event('click'));await pause();expect(sent).toHaveLength(1);expect(sent[0].body.approve).toBe(false);expect(f.document.querySelector('[data-activity-count]')?.textContent).toBe('1');});
it('saving a note retains the managed task version for the following explicit approval',async()=>{const sent:any[]=[];const q=queue([offer('managed',{reviewVersion:'identity:task:7'})]);const f=fixture((url,init)=>{if(init?.method==='POST'){sent.push({url,body:JSON.parse(String(init.body))});return url.endsWith('/note')?{reviewVersion:'2026-10-11T00:00:00Z'}:{title:'manual decision'};}return url.includes('/identity/tasks')?{tasks:[]}:q;});await f.run('admQueue()');(f.document.querySelector('[data-note]') as HTMLTextAreaElement).value='人工心得';f.document.querySelector('[data-act="note"]')!.dispatchEvent(new f.window.Event('click'));await pause();f.document.querySelector('[data-act="approve"]')!.dispatchEvent(new f.window.Event('click'));await pause();expect(sent[1].body.expectedReviewVersion).toBe('identity:task:7');});
it('rich managed draft edits submit only changed fields and never reassign an unchanged product',async()=>{const sent:any[]=[];const q=queue([offer('managed',{reviewVersion:'identity:task:0',usdEstimate:null,usdMax:null,claimStart:null,claimEnd:null,endKind:'unknown',creditValidity:null,publishedAt:null})]);const f=fixture((url,init)=>{if(init?.method==='POST'){sent.push(JSON.parse(String(init.body)));return {approved:false,changed:['title']};}return url.includes('/identity/tasks')?{tasks:[]}:q;});f.context.FormData=class{values:any[];constructor(form:any){this.values=[...form.querySelectorAll('input,select,textarea')].filter((e:any)=>e.name&&(!['checkbox','radio'].includes(e.type)||e.hasAttribute('checked'))).map((e:any)=>[e.name,e.tagName==='SELECT'?(e.querySelector('option[selected]')||e.querySelector('option'))?.value:e.value]);}[Symbol.iterator](){return this.values[Symbol.iterator]();}};await f.run('admQueue()');f.document.querySelector('[data-act="edit"]')!.dispatchEvent(new f.window.Event('click'));const form=f.document.querySelector('[data-editform]')!;(form.querySelector('[name="title"]') as HTMLInputElement).value='只修改标题';form.dispatchEvent(new f.window.Event('submit',{cancelable:true}));await pause();expect(sent).toHaveLength(1);expect(sent[0]).toMatchObject({approve:false,fields:{title:'只修改标题'}});expect(Object.keys(sent[0].fields)).toEqual(['title']);});

describe('membership draft saving without implicit approval',()=>{
  it.each([false,true])('saves legacy pending membership draft and approved simple edit separately (live=%s)',async live=>{
    const writes:any[]=[];
    const item=offer('legacy-membership',{reviewState:live?'approved':'pending',requirements:live?['none']:['member:不明确套餐']});
    const page=fixture((_url,init)=>{
      if(init?.body){writes.push(JSON.parse(String(init.body)));return {changed:['title'],approved:false};}
      return {...queue(live?[]:[item]),incomplete:live?[item]:[]};
    });
    page.context.FormData=class {
      fields:[string,string][];
      constructor(form:HTMLFormElement){this.fields=[...form.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('[name]')].filter(x=>!x.disabled&&(!['checkbox','radio'].includes((x as HTMLInputElement).type)||x.hasAttribute('checked'))).map(x=>[x.name,x.value]);}
      [Symbol.iterator](){return this.fields[Symbol.iterator]();}
    };
    page.run('saveMessages=[];toast=message=>saveMessages.push(message)');
    await page.run('admQueue()');
    if(live){const section=page.document.querySelector('[data-incomplete]')!;(section as HTMLDetailsElement).open=true;section.dispatchEvent(new page.window.Event('toggle'));}
    const card=page.document.querySelector('[data-code="legacy-membership"]')!;
    card.querySelector('[data-act="edit"]')!.dispatchEvent(new page.window.Event('click'));await pause();
    const form=card.querySelector('[data-editform]')!;
    expect(form.querySelector('button[type="submit"]')!.textContent).toBe(live?'保存':'保存草稿');
    (form.querySelector('[name="title"]') as HTMLInputElement).value='标题修订';
    if(!live){
      const status=form.querySelector('[data-membership-status]')!;Object.defineProperty(status,'value',{configurable:true,value:'needs_review'});status.dispatchEvent(new page.window.Event('change',{bubbles:true}));
      form.querySelector('[data-membership-unresolved]')!.dispatchEvent(new page.window.Event('click',{bubbles:true}));
    }
    form.dispatchEvent(new page.window.Event('submit'));await pause();
    expect(writes).toHaveLength(1);expect(writes[0].approve).toBe(false);
    if(!live)expect(writes[0].fields.membershipRequirement.status).toBe('needs_review');
    expect(page.run('saveMessages.join("；")')).toContain(live?'已保存':'草稿已保存，尚未通过上架');
    if(live)expect(page.run('saveMessages.join("；")')).not.toContain('草稿');
  });
});
