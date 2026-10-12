import type { UrgencyResult } from './types';

const TIERS = ['P0', 'P1', 'P2', 'P3'] as const;
type Tier = (typeof TIERS)[number];
const SAME_DAY = /(今天|今日|当天|today)/i;
const ONE_TIME = /(重置卡|重置|兑换码|激活码|cdk|redeem code|发码|发放)/i;
const QUANTITY = /(限量|先到先得|发完即止|手慢无|前\s*\d+\s*(名|位|个)|first\s+\d+)/i;
const LIMITED = /(限时|limited[ -]?time)/i;
const RESET = /(重置卡|reset)/i;

const rank = (tier: string) => TIERS.indexOf(tier as Tier);

export function classifyUrgency(input: { title: string; text: string; claimEndAt?: Date | null; tags?: string[]; quicklyExhausted?: boolean }, now: Date): UrgencyResult {
  const blob = `${input.title}\n${input.text}`;
  const hours = input.claimEndAt ? (input.claimEndAt.getTime() - now.getTime()) / 3600e3 : null;
  let tier: Tier = 'P3';
  const signals: UrgencyResult['signals'] = [];
  if (hours != null && hours > 0) {
    signals.push('deadline');
    tier = hours <= 24 ? 'P0' : hours <= 72 ? 'P1' : hours <= 336 ? 'P2' : 'P3';
  }
  const sameDay = SAME_DAY.test(blob);
  const oneTime = ONE_TIME.test(blob);
  const quantity = QUANTITY.test(blob);
  if (sameDay && oneTime) {
    signals.push('same_day_one_time');
    tier = 'P0';
  }
  if (quantity) {
    signals.push('quantity_limited');
    const raised: Tier = sameDay || input.quicklyExhausted ? 'P0' : 'P1';
    if (rank(raised) < rank(tier)) tier = raised;
  }
  if (LIMITED.test(blob) && hours == null) {
    signals.push('limited_time_unknown_date');
    if (rank('P2') < rank(tier)) tier = 'P2';
  }
  if ((input.tags ?? []).includes('reset') || RESET.test(blob)) signals.push('reset_event');
  const strongest = tier === 'P0' && signals.includes('same_day_one_time') ? SAME_DAY
    : signals.includes('quantity_limited') && (tier === 'P0' || tier === 'P1') ? QUANTITY
    : signals.includes('limited_time_unknown_date') && tier === 'P2' ? LIMITED
    : null;
  return {
    tier,
    deadline: input.claimEndAt ? input.claimEndAt.toISOString() : null,
    signals,
    quote: strongest ? shortestSentence(blob, strongest) : null,
  };
}

function shortestSentence(blob: string, pattern: RegExp): string | null {
  const parts = blob.split(/(?<=[。！？!?\n])/).map(s => s.trim()).filter(Boolean);
  const hits = parts.filter(s => pattern.test(s));
  if (!hits.length) return null;
  return hits.reduce((a, b) => a.length <= b.length ? a : b);
}

const DUE_MS: Record<Tier, number> = { P0: 30 * 60e3, P1: 2 * 3600e3, P2: 24 * 3600e3, P3: 72 * 3600e3 };

export function systemDueAt(tier: Tier, discoveredAt: string): string {
  return new Date(Date.parse(discoveredAt) + DUE_MS[tier]).toISOString();
}

export function latestUsefulReviewAt(deadline: string | null, tier: Tier): string | null {
  if (!deadline) return null;
  const hours = tier === 'P0' ? 2 : 12;
  return new Date(Date.parse(deadline) - hours * 3600e3).toISOString();
}

const WINDOW_MS: Record<Tier, number> = { P0: 3600e3, P1: 12 * 3600e3, P2: 48 * 3600e3, P3: 48 * 3600e3 };

export function verificationWindowEndsAt(a: { tier: Tier; discoveredAt: string; deadline: string | null; now: Date }): string {
  let end = Date.parse(a.discoveredAt) + WINDOW_MS[a.tier];
  if (a.deadline) {
    const cap = a.now.getTime() + 0.25 * (Date.parse(a.deadline) - a.now.getTime());
    end = Math.min(end, cap);
  }
  end = Math.max(end, a.now.getTime());
  return new Date(end).toISOString();
}

export function verificationRetryDelayMs(tier: Tier, attempts: number): number {
  if (tier === 'P0') return 15 * 60e3;
  if (tier === 'P1') return 2 * 3600e3;
  const hours = Math.min(24, 2 ** Math.min(5, attempts - 1));
  return hours * 3600e3;
}

export function compareQueueOrder(a: { tier: string; latestUsefulReviewAt: string | null; discoveredAt: string }, b: typeof a): number {
  const byTier = rank(a.tier) - rank(b.tier);
  if (byTier) return byTier;
  if (a.tier === 'P3') return a.discoveredAt < b.discoveredAt ? -1 : a.discoveredAt > b.discoveredAt ? 1 : 0;
  const aReview = a.latestUsefulReviewAt;
  const bReview = b.latestUsefulReviewAt;
  if (aReview !== bReview) {
    if (aReview == null) return 1;
    if (bReview == null) return -1;
    if (aReview < bReview) return -1;
    if (aReview > bReview) return 1;
  }
  return a.discoveredAt < b.discoveredAt ? -1 : a.discoveredAt > b.discoveredAt ? 1 : 0;
}
