/** Refresh only already-public, approved data. Private DB backups are never deployment assets. */
import { writeFileSync } from 'node:fs';
import { publicSafeValuation, valuationMatchesAmounts } from '../src/shared/valuation';

const base = (process.env.API_BASE ?? 'https://ai-yangmao.com').replace(/\/$/, '');
const output = process.argv[2] ?? 'public/public-snapshot.json';
const read = async (path: string) => {
  const response = await fetch(`${base}/api/${path}`, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw Error(`Public snapshot fetch failed: ${path} HTTP ${response.status}`);
  const body = await response.json() as Record<string, any>;
  if (body.readOnly || body.degraded || body.dataMode === 'approved-snapshot') throw Error('Refuse to redate a degraded or old snapshot');
  return body;
};
const health = await read('health');
if (health.ok !== true) throw Error('Public service is not healthy');
const [offerResponse, platformResponse, coverage] = await Promise.all([
  read('offers?view=all&valuation=v2&schema=membership-v1'), read('platforms'), read('coverage'),
]);
const platforms = platformResponse.platforms;
if (!Array.isArray(platforms) || platforms.some(p => p.status !== 'approved')) throw Error('Unexpected public platform state');
const fields = new Set(['id', 'platformId', 'title', 'type', 'tags', 'models', 'modalities', 'claimMethod', 'requirements',
  'membershipRequirement', 'audience', 'valueText', 'usdEstimate', 'usdMax', 'valuation', 'claimStart', 'claimEnd',
  'endKind', 'creditValidity', 'sourceTz', 'publishedAt', 'discoveredAt', 'lastVerifiedAt', 'verifyResult',
  'withdrawnAt', 'adminNote', 'reviewState', 'evidence', 'steps', 'firstChannel', 'createdAt', 'updatedAt']);
if (!Array.isArray(offerResponse.offers)) throw Error('Missing public offers');
const offers = offerResponse.offers.map((raw: Record<string, any>) => {
  if (raw.reviewState !== 'approved' || !platforms.some(p => p.id === raw.platformId)) throw Error('Unexpected unpublished offer');
  const offer = Object.fromEntries(Object.entries(raw).filter(([key]) => fields.has(key)));
  const value = publicSafeValuation(offer.valuation);
  offer.valuation = value && valuationMatchesAmounts(value, offer) ? value : null;
  return offer;
});
const capturedAt = new Date().toISOString();
writeFileSync(output, JSON.stringify({ capturedAt, offers, platforms, coverage }));
console.log(JSON.stringify({ capturedAt, offers: offers.length, platforms: platforms.length, output }));
