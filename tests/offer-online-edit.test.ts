import { expect, it } from 'vitest';
import { fixture, publicOffer } from './fixtures/frontend';

// Online edit on a listing page: only with an admin/reviewer key, and saving goes through the review contract (versioned edit).
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const adminOffer = (extra: Record<string, unknown> = {}) => ({ code: 'pub1', id: 'public-offer', platformId: 'vendor', platform: 'Vendor', title: '常驻免费额度', type: '常驻免费', value: '每月 10 美元', end: '常驻', status: 'active', reviewState: 'approved',
  reviewVersion: 'entity:e1:3:2026-10-18T00:00:00.000Z', visibilityVersion: 'entity:e1:3:2026-10-18T00:00:00.000Z', requirements: ['none'], audience: 'all', claimMethod: 'auto', sourceTz: 'UTC', evidenceUrl: 'https://vendor.example', evidenceTier: 'docs',
  excerpts: {}, models: [], tags: [], modalities: ['text'], checks: [], steps: [], ...extra });
function page(role: string | null, offer = adminOffer()) {
  const calls: { url: string; body?: any }[] = [];
  const f = fixture((url, init) => {
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.endsWith('/whoami')) return { role, who: 'tester' };
    if (url.endsWith('/admin/offers/public-offer')) return { offer };
    if (url.endsWith('/edit')) return { ok: true, changed: ['title'], approved: false, reviewVersion: 'identity:t1:1' };
    if (url.includes('/platforms')) return { platforms: [{ id: 'vendor', name: 'Vendor', status: 'approved' }] };
    return { comments: [], nextCursor: null };
  }, '#offer-public-offer');
  publicOffer(f.run);
  if (!role) f.run("ADM.token='';ADM.role='';");
  else f.run(`ADM.role='';`);
  f.run("pOffer('public-offer')");
  return { ...f, calls };
}

it('shows no online edit to visitors without an admin or reviewer key', () => {
  const { document } = page(null);
  expect(document.querySelector('[data-online-edit]')).toBeNull();
});

it('a signed-in reviewer edits a listed perk through the versioned edit API, never a direct approve', async () => {
  const { document, window, calls } = page('reviewer');
  document.querySelector('[data-online-edit]')!.dispatchEvent(new window.Event('click', { bubbles: true })); for (let i = 0; i < 6; i++) await tick();
  const form = document.querySelector('[data-online-edit-box] [data-editform]') as any;
  expect(form).toBeTruthy(); expect(form.hidden).toBe(false);
  expect(document.querySelector('[data-online-edit-box] [data-act="approve"]')).toBeNull();
  expect(calls.some(c => c.url.endsWith('/admin/offers/public-offer'))).toBe(true);
});

it('a pending draft is shown with its publish action at the draft version', async () => {
  const { document, window } = page('admin', adminOffer({ reviewVersion: 'identity:t1:1', reviewState: 'approved' }));
  document.querySelector('[data-online-edit]')!.dispatchEvent(new window.Event('click', { bubbles: true })); for (let i = 0; i < 6; i++) await tick();
  expect(document.querySelector('[data-online-edit-box]')!.textContent).toContain('待发布的修改');
  expect(document.querySelector('[data-online-edit-box] [data-act="approve"]')).toBeTruthy();
});

it('a key without an admin or reviewer role is refused', async () => {
  const { document, window } = page('visitor');
  document.querySelector('[data-online-edit]')!.dispatchEvent(new window.Event('click', { bubbles: true })); for (let i = 0; i < 6; i++) await tick();
  expect(document.querySelector('[data-online-edit-box]')!.textContent).toContain('只有管理员或审核员可以在线编辑');
});
