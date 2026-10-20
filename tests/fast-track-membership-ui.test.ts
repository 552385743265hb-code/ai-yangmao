import { expect, it } from 'vitest';
import { fixture } from './fixtures/frontend';

// 2026-10-17 Higgsfield Wan 3.0: member perks could not be fast-tracked because nothing let the owner pick a catalog membership.
const catalog = { revision: 3, products: [{ id: 'higgsfield', name: 'Higgsfield', aliases: [], status: 'verified', sourceUrl: 'https://higgsfield.ai', verifiedAt: '2026-10-01', revision: 1 }],
  plans: [{ id: 'higgsfield-pro', productId: 'higgsfield', name: 'Pro', aliases: [], status: 'verified', sourceUrl: 'https://higgsfield.ai', verifiedAt: '2026-10-01', revision: 1, billing: 'paid' }] };
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
// linkedom has no browser FormData implementation; collect successful controls as the browser does (as frontend-workflow.test.ts).
function formData(window: any) {
  return class {
    fields: [string, string][];
    constructor(form: any) {
      this.fields = [...form.querySelectorAll('[name]')].filter((c: any) => !c.disabled && (!(c instanceof window.HTMLInputElement) || !['checkbox', 'radio'].includes(c.type) || c.checked || c.hasAttribute('checked'))).map((c: any) => [c.name, c.value]);
    }
    get(name: string) { return this.fields.find(([k]) => k === name)?.[1] ?? null; }
    getAll(name: string) { return this.fields.filter(([k]) => k === name).map(([, v]) => v); }
    [Symbol.iterator]() { return this.fields[Symbol.iterator](); }
  };
}
function pick(document: any, window: any) {
  const change = (selector: string, value: string) => { const input = document.querySelector(selector)!; Object.defineProperty(input, 'value', { configurable: true, value }); input.dispatchEvent(new window.Event('change', { bubbles: true })); };
  change('[data-member-vendor]', 'higgsfield');
  const plan = document.querySelector('[data-member-plan="higgsfield-pro"]')!; plan.checked = true; plan.setAttribute('checked', ''); plan.dispatchEvent(new window.Event('change', { bubbles: true }));
}

it('the needs-owner panel asks for a catalog membership and submits the picked plan', async () => {
  const posts: { url: string; body: any }[] = [];
  const job = { id: 'j1', platformName: 'Higgsfield', benefit: 'Wan 3.0 七天无限', url: 'https://higgsfield.ai/creator-hub/changelog', state: 'needs_owner', missing: ['membershipRequirement'], requirements: ['member:Higgsfield 付费订阅', 'net'], error: null };
  const { document, window, run, context } = fixture((url, init) => { if (init?.method === 'POST') { posts.push({ url, body: JSON.parse(String(init.body)) }); return { state: 'published', offerId: 'o1' }; } return { jobs: [job] }; }, '#admin', catalog);
  context.FormData = formData(window);
  document.querySelector('#admBody')!.innerHTML = '<div data-ft-jobs></div>';
  await run("loadFastTrackJobs(document.querySelector('[data-ft-jobs]'))"); await tick(); await tick();
  expect(document.querySelector('[data-ft-complete]')!.textContent).toContain('模型读到：Higgsfield 付费订阅');
  const form = document.querySelector('[data-ft-complete]')!;
  form.dispatchEvent(new window.Event('submit', { cancelable: true })); await tick();
  expect(posts.filter(p => !p.url.endsWith('/reconcile'))).toEqual([]);
  pick(document, window);
  form.dispatchEvent(new window.Event('submit', { cancelable: true })); await tick();
  expect(posts.some(p => p.url.endsWith('/fast-track/j1/complete'))).toBe(true);
  expect(posts.find(p => p.url.endsWith('/complete'))!.body.fields.membershipSelectionOnly).toBe(true);
  expect(posts.find(p => p.url.endsWith('/complete'))!.body.fields.membershipRequirement).toMatchObject({ status: 'needs_review', catalogRevision: 3, evidenceUrls: [], anyOf: [{ allOf: [{ productId: 'higgsfield', planIds: ['higgsfield-pro'] }] }] });
});

it('the fast-track form loads the catalog only when opened and sends the picked membership with the job', async () => {
  const posts: any[] = []; let catalogLoads = 0;
  const { document, window, run, context } = fixture((url, init) => { if (init?.method === 'POST') { posts.push(JSON.parse(String(init.body))); return { jobId: 'j2', platformId: 'vendor', registered: { kind: 'existing', value: '' }, dispatched: true }; } return {}; }, '#admin', new Proxy(catalog, { get: (t, k) => { if (k === 'products') catalogLoads++; return (t as any)[k]; } }));
  context.FormData = formData(window);
  document.querySelector('#admBody')!.innerHTML = run('fastTrackFormHtml()');
  run("bindFastTrackForm(document.querySelector('[data-fast-track]'), null, null)");
  expect(catalogLoads).toBe(0);
  const form = document.querySelector('[data-fast-track]')!;
  Object.defineProperty(form.querySelector('[name="platformId"]')!, 'value', { configurable: true, value: 'vendor' });
  Object.defineProperty(form.querySelector('[name="url"]')!, 'value', { configurable: true, value: 'https://higgsfield.ai/creator-hub/changelog' });
  Object.defineProperty(form.querySelector('[name="benefit"]')!, 'value', { configurable: true, value: 'Wan 3.0 七天无限' });
  const details = form.querySelector('[data-ft-membership]')!; details.open = true; details.dispatchEvent(new window.Event('toggle')); await tick(); await tick();
  pick(document, window);
  form.dispatchEvent(new window.Event('submit', { cancelable: true })); await tick();
  expect(posts[0]).toMatchObject({ platformId: 'vendor', benefit: 'Wan 3.0 七天无限', membershipSelectionOnly:true, membershipRequirement: { status: 'needs_review', evidenceUrls:[], anyOf: [{ allOf: [{ planIds: ['higgsfield-pro'] }] }] } });
});

it('restores a paused joint rule and keeps its restrictions while sending narrowed identities to the model',async()=>{
 const seat={...catalog.plans[0],id:'higgsfield-max',name:'Max'};
 const excluded={...catalog.plans[0],id:'higgsfield-excluded',name:'Excluded'};
 const usage={...catalog.plans[0],id:'usage-pack',name:'Usage Pack',productId:'usage'};
 const fullCatalog={...catalog,products:[...catalog.products,{...catalog.products[0],id:'usage',name:'Usage',platformIds:['higgsfield']}],plans:[...catalog.plans,seat,excluded,usage]};
 const rule={schemaVersion:'membership-v1',status:'confirmed',catalogRevision:3,evidenceUrls:['https://higgsfield.ai/perk'],anyOf:[{allOf:[{productId:'higgsfield',scope:'plans',planIds:['higgsfield-pro','higgsfield-max','higgsfield-excluded'],excludePlanIds:['higgsfield-excluded'],limits:{billingCycles:['annual']}},{productId:'usage',scope:'plans',planIds:['usage-pack'],excludePlanIds:[]}]}]};
 const job={id:'joint',platformId:'higgsfield',platformName:'Higgsfield',benefit:'Member bonus',url:'https://higgsfield.ai/perk',state:'needs_owner',missing:['membershipRequirement'],requirements:['member:Pro / Max AND usage pack'],membershipRequirement:rule};
 const posts:any[]=[];const {document,window,run,context}=fixture((url,init)=>{if(init?.method==='POST'){posts.push({url,body:JSON.parse(String(init.body))});return {state:'queued'};}return {jobs:[job]};},'#admin',fullCatalog);
 context.FormData=formData(window);document.querySelector('#admBody')!.innerHTML='<div data-ft-jobs></div>';
 await run("loadFastTrackJobs(document.querySelector('[data-ft-jobs]'))");await tick();await tick();
 const form:any=document.querySelector('[data-ft-complete]');expect(form.membershipEditor.requirement).toEqual(rule);
 const pro:any=form.querySelector('[data-member-plan="higgsfield-pro"]');expect(pro.hasAttribute('checked')).toBe(true);pro.checked=false;pro.removeAttribute('checked');pro.dispatchEvent(new window.Event('change',{bubbles:true}));
 expect(form.membershipEditor.requirement.anyOf[0].allOf).toEqual([{...rule.anyOf[0].allOf[0],planIds:['higgsfield-max']},rule.anyOf[0].allOf[1]]);
 form.dispatchEvent(new window.Event('submit',{cancelable:true}));await tick();
 const sent=posts.find(p=>p.url.endsWith('/complete')).body.fields;
 expect(sent.membershipSelectionOnly).toBe(true);expect(sent.membershipRequirement.status).toBe('needs_review');
 expect(sent.membershipRequirement.anyOf.flatMap((g:any)=>g.allOf).flatMap((c:any)=>c.planIds).sort()).toEqual(['higgsfield-max','usage-pack']);
 expect(sent.membershipRequirement.anyOf.flatMap((g:any)=>g.allOf).every((c:any)=>!c.excludePlanIds.length&&!c.limits)).toBe(true);
});
