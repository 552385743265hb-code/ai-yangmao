// 薅度分：和网站 web/src/app.js 的 dims/score 同一套规则（改一处要同步另一处）。飞书日报按它挑前 10 条。
import { claimEndAt, isLimited, liveStatus, type OfferTiming } from './lifecycle';

const REQ_PEN: Record<string, number> = { pay: 30, member: 35, phone: 25, card: 25, net: 10, realname: 5, biz: 40, student: 30, invite: 25, targeted: 30, unknown: 50 };
const EASE: Record<string, number> = { auto: 100, member: 90, signup: 80, code: 70, app: 65, topup: 50, form: 30 };
const SRCV: Record<string, number> = { site: 100, docs: 100, official: 85, staff: 70, tested: 80, media: 30 };
const WEIGHTS = [0.25, 0.2, 0.15, 0.15, 0.1, 0.15];
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export type ScoreInput = Parameters<typeof liveStatus>[0] & { usdEstimate?: number | null; requirements: string[]; claimMethod: string; evidence: { tier: string } };

export function haoScore(o: ScoreInput, now = new Date()): number {
  const v = clamp(Math.round(Math.log10((o.usdEstimate ?? 0) + 1) / Math.log10(1001) * 100), 3, 100);
  const keys = (o.requirements.length ? o.requirements : ['none']).map(r => r.split(':')[0]);
  const th = Math.max(5, 100 - keys.reduce((a, k) => a + (REQ_PEN[k] ?? 0), 0));
  const st = liveStatus(o, now), end = claimEndAt(o as OfferTiming);
  let tm: number;
  if (!isLimited(o.type)) tm = st === 'stale' ? 40 : 100;
  else if (o.endKind === 'unknown') tm = 60;
  else if (st === 'ended') tm = 0;
  else if (st === 'upcoming') tm = 100;
  else tm = clamp(Math.round(((end ? Math.floor((end.getTime() - now.getTime()) / 86400_000) : 0) + 1) / 30 * 100), 4, 100);
  const cn = keys.some(k => ['phone', 'card', 'net'].includes(k)) ? (keys.some(k => ['phone', 'card'].includes(k)) ? 20 : 50) : 100;
  const d = [v, th, EASE[o.claimMethod] ?? 50, tm, SRCV[o.evidence.tier] ?? 50, cn];
  return Math.round(d.reduce((a, x, i) => a + x * WEIGHTS[i], 0));
}
