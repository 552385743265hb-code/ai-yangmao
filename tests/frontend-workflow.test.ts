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
  const context = createContext({ window, document, console, Intl, Date, Map, Set, URL, Response, FormData,
    location: { hash: '#admin' }, navigator: {}, getComputedStyle: () => ({ getPropertyValue: () => '#123456' }),
    matchMedia: () => ({ matches: false, addEventListener() {} }), MutationObserver: class { observe() {} },
    localStorage: storage, sessionStorage: storage, setTimeout, clearTimeout, setInterval() {},
    echarts: { init: (element: HTMLElement) => ({ setOption: (options: any) => charts.set(element.id, options), on() {}, dispose() {} }) },
    fetch: async (url: string, init?: RequestInit) => new Response(JSON.stringify(await handle(url, init))),
  });
  const app = readFileSync('web/src/app.js', 'utf8');
  runInContext(readFileSync('web/src/data.js', 'utf8') + '\n' + app.slice(0, app.indexOf('(async function boot()')), context);
  const run = (code: string) => runInContext(code, context);
  run("PLATFORMS=[{id:'vendor',name:'Vendor',type:'lab'}];ADM.token='fixture';ADM.role='admin';");
  return { document, window, context, run, charts };
}

function publicOffer(run: (code: string) => any, extra: Record<string, unknown> = {}) {
  run(`OFFERS=[{id:'public-offer',p:'vendor',t:'常驻免费额度',ty:'standing',m:['text'],c:'auto',r:['none'],v:'每月 10 美元',usd:10,noUsd:false,s:null,e:null,ek:'standing',vf:0,vfDay:0,fs:-10,since:-10,discoveredAt:new Date(Date.now()-10*DAY).toISOString(),verifiedAt:new Date().toISOString(),withdrawnAt:null,st:'docs',tz:'UTC',val:'每月',aud:'all',cn:true,early:'官方页面',why:'',steps:[],models:[],tags:[],evidence:{url:'https://vendor.example',excerpts:{}},note:'原文',verify:'ok',...${JSON.stringify(extra)}}];prepare();location.hash='#offer-public-offer';`);
}

describe('frontend review workflow', () => {
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
