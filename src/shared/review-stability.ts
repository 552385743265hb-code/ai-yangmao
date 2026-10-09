import type { Evidence } from '../db/schema';

// Formatting and excerpt selection are not changes to the underlying terms.
export const normalizeTerms = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[\s`*_]+/g, '');
const keys = ['benefit', 'eligibility', 'validity'] as const;
export function evidenceClaims(evidence: Evidence): string[] {
  return keys.map(k => normalizeTerms(evidence.excerpts[k] ?? '')).filter(x => x.length >= 8);
}
export function sameEvidencePage(a: string, b: string): boolean {
  try {
    const x = new URL(a), y = new URL(b);
    return x.origin === y.origin && x.pathname.replace(/\/$/, '') === y.pathname.replace(/\/$/, '') && x.search === y.search;
  } catch { return false; }
}
/** Only a changed, grounded term on the same official page can reopen approved data. */
export function changedOfficialTerms(before: Evidence, after: Evidence, sourceText?: string): boolean {
  if (!sourceText || ['media','tested'].includes(before.tier) || ['media','tested'].includes(after.tier)
    || !sameEvidencePage(before.url, after.url)) return false;
  const text = normalizeTerms(sourceText), old = evidenceClaims(before), next = evidenceClaims(after);
  if (!old.length || !next.length || !next.every(q => text.includes(q))) return false;
  return keys.some(k => {
    const a = normalizeTerms(before.excerpts[k] ?? ''), b = normalizeTerms(after.excerpts[k] ?? '');
    return a.length >= 8 && b.length >= 8 && !text.includes(a) && text.includes(b);
  });
}
/** A rejected terms version stays rejected even when the model selects another sentence. */
export function rejectedTermsStillPresent(rejected: Evidence, incoming: Evidence, sourceText?: string): boolean {
  if (!sourceText || !sameEvidencePage(rejected.url, incoming.url)) return false;
  const quotes = evidenceClaims(rejected), text = normalizeTerms(sourceText);
  return quotes.length > 0 && quotes.every(q => text.includes(q));
}
