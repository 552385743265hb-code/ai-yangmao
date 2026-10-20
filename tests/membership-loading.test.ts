import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { fixture } from './fixtures/frontend';

const app = readFileSync('web/src/app.js', 'utf8');
const boot = app.slice(app.indexOf('(async function boot()'));
const catalog = {
  revision: 62,
  vendors: [{ id: 'vendor', name: 'Vendor', status: 'available' }],
  products: [{ id: 'studio', name: 'Vendor Studio', platformIds: ['vendor'], aliases: [], status: 'verified', sourceUrl: 'https://vendor.example/plans', verifiedAt: '2026-10-20', revision: 1 }],
  plans: [{ id: 'studio-pro', productId: 'studio', name: 'Vendor Studio Pro', billing: 'paid', aliases: [], status: 'verified', sourceUrl: 'https://vendor.example/plans', verifiedAt: '2026-10-20', revision: 1 }],
};

function loadingPage(hash = '#today') {
  let release!: (value: unknown) => void;
  let reject!: (error: Error) => void;
  const platforms = new Promise((resolve, fail) => { release = resolve; reject = fail; });
  const page = fixture(url => {
    if (url === '/api/platforms') return platforms;
    if (url.startsWith('/api/offers?')) return { offers: [] };
    return {};
  }, hash, catalog);
  page.run("C.phone=true; C.subscriptions=[{planId:'studio-pro'}]; C.membershipStorageVersion=2; C.membershipCatalogRevision=0;");
  const loading = page.run(boot);
  page.run('openCond()');
  return { ...page, loading, ready: () => release({ platforms: [{ id: 'vendor', name: 'Vendor', type: 'tool' }] }), reject };
}

it.each(['#today', '#agent'])('replaces an already-open loading panel on %s after initial data arrives', async hash => {
  const page = loadingPage(hash);
  const phone = page.document.querySelector('[data-c="phone"]');
  const prematurelyUnavailable = !!page.document.querySelector('#sheetPanel .warn-note');
  const hadLoadingState = !!page.document.querySelector('[data-owned-subscriptions] [role="status"]');
  page.ready();
  await page.loading;
  expect(page.document.querySelector('[data-owned-vendor]')).not.toBeNull();
  expect(prematurelyUnavailable).toBe(false);
  expect(hadLoadingState).toBe(true);
  expect(page.document.querySelector('[data-owned-plan="studio-pro"]')?.hasAttribute('checked')).toBe(true);
  expect(page.document.querySelectorAll('[data-remove-owned-plan]')).toHaveLength(1);
  expect(page.document.querySelector('[data-c="phone"]')).toBe(phone);
  expect(phone?.hasAttribute('checked')).toBe(true);
});

it('shows the real unavailable state when initial loading fails without rebuilding other preferences', async () => {
  const page = loadingPage();
  const phone = page.document.querySelector('[data-c="phone"]');
  page.reject(new Error('platform endpoint unavailable'));
  await page.loading;
  expect(page.document.querySelector('[data-owned-subscriptions] [role="status"]')).toBeNull();
  expect(page.document.querySelector('#sheetPanel .warn-note')).not.toBeNull();
  expect(page.document.querySelector('[data-owned-vendor]')).toBeNull();
  expect(page.document.querySelector('[data-c="phone"]')).toBe(phone);
});

it('does not reopen a conditions sheet that was closed while initial loading was pending', async () => {
  const page = loadingPage();
  page.run('closeSheet()');
  page.ready();
  await page.loading;
  expect(page.document.querySelector('#sheet')?.hasAttribute('hidden')).toBe(true);
});
