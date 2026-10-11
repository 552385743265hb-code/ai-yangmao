import { canonicalTermsSchema, type CanonicalTermsV1 } from './types';

const canonicalText = (value: string) => value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
export function normalizeDecimal(value: string): string {
  const normalized = canonicalText(value);
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) throw new Error('invalid exact decimal');
  const [whole, fraction = ''] = normalized.split('.');
  const significant = fraction.replace(/0+$/, '');
  return whole.replace(/^0+(?=\d)/, '') + (significant ? `.${significant}` : '');
}
export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.entries(value).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`;
}
export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}
// Canonical facts only. Evidence identifiers and source text are never normalized.
function normalizeValue(value: unknown, key = ''): unknown {
  if (key === 'evidenceRefs') return value;
  if (typeof value === 'string') return canonicalText(value);
  if (Array.isArray(value)) {
    const items = value.map(v => normalizeValue(v));
    if (items.every(v => typeof v === 'string')) return [...new Set(items)].sort();
    return items;
  }
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, normalizeValue(v,k)]));
  return value;
}
export function normalizeTerms(input: CanonicalTermsV1): CanonicalTermsV1 {
  const parsed = canonicalTermsSchema.parse(normalizeValue(canonicalTermsSchema.parse(input)));
  const pools = new Set<string>();
  for (const pool of parsed.benefitPools) {
    if (pools.has(pool.poolKey)) throw new Error('duplicate pool key');
    pools.add(pool.poolKey);
    if (pool.amount.state === 'known') {
      pool.amount.value.value = normalizeDecimal(pool.amount.value.value);
      if (pool.amount.value.currency !== null) {
        const currency = pool.amount.value.currency.toUpperCase();
        if (!/^[A-Z]{3}$/.test(currency)) throw new Error('currency requires an explicit ISO code');
        pool.amount.value.currency = currency;
      }
    }
  }
  parsed.benefitPools.sort((a,b) => a.poolKey < b.poolKey ? -1 : a.poolKey > b.poolKey ? 1 : 0);
  if (parsed.costs.state === 'known') {
    parsed.costs.value.upfrontAmount = normalizeDecimal(parsed.costs.value.upfrontAmount);
    parsed.costs.value.currency = parsed.costs.value.currency.toUpperCase();
    if (!/^[A-Z]{3}$/.test(parsed.costs.value.currency)) throw new Error('currency requires an explicit ISO code');
  }
  return parsed;
}
export function withoutEvidence(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutEvidence);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'evidenceRefs').map(([k,v]) => [k, withoutEvidence(v)]));
  return value;
}
export async function hashTerms(input: CanonicalTermsV1): Promise<string> {
  return sha256(`terms-v1\n${stableJson(withoutEvidence(normalizeTerms(input)))}`);
}
export function normalizeDocumentUrl(input: string): string {
  const url = new URL(input);
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error('invalid document URL');
  if (['twitter.com','www.twitter.com','www.x.com'].includes(url.hostname)) url.hostname = 'x.com';
  // Unknown www hosts, path case, content parameters and anchors may distinguish rewards.
  for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key) || ['fbclid','gclid','msclkid'].includes(key.toLowerCase())) url.searchParams.delete(key);
  url.searchParams.sort();
  return `url-v1:${url.href}`;
}

/** Bounded lexical recall tokens; Chinese bigrams avoid treating a whole sentence as one word. */
export function identitySearchTokens(text: string): string[] {
  const normalized=canonicalText(text).toLowerCase();
  const tokens: string[]=[...(normalized.match(/[\p{L}\p{N}]+/gu)??[])];
  for(const run of normalized.match(/[\p{Script=Han}]+/gu)??[]) for(let i=0;i<run.length-1;i++)tokens.push(run.slice(i,i+2));
  return [...new Set(tokens)].slice(0,128);
}

/** A lookup aid for a scoped reviewed claim, never proof of identity by itself. */
export function claimIdentityKey(facts:CanonicalTermsV1):string|null {
 return facts.issuerProductId.state==='known'&&facts.mechanism.state==='known'&&facts.occurrenceAnchor.state==='known'?JSON.stringify([facts.issuerProductId.value,facts.mechanism.value,facts.occurrenceAnchor.value]):null;
}
