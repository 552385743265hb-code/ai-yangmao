// 羊毛的时间与状态规则。网站接口、采集管线、推送共用这一份，保证三处判断一致。
// 规则来源：docs/design.md §6。

export const OFFER_TYPES = ['new', 'free', 'perk', 'topup', 'gift', 'standing', 'apply'] as const;
export type OfferType = (typeof OFFER_TYPES)[number];
export type EndKind = 'date' | 'unknown' | 'standing';
export type LiveStatus = 'upcoming' | 'active' | 'ending' | 'ended' | 'standing' | 'stale' | 'open';

export interface OfferTiming {
  type: OfferType;
  claimStart: string | null; // 官方时区下的日期 YYYY-MM-DD
  claimEnd: string | null; // 官方时区下的日期 YYYY-MM-DD，当天 23:59:59 截止
  endKind: EndKind;
  sourceTz: string; // IANA 时区，如 America/Los_Angeles
  lastVerifiedAt: string | null; // ISO 时间，最近一次核验成功
  discoveredAt?: string | null; // 官方未写开始时间时，不能推断系统发现之前也有效
  verifyResult?: string | null; // evidence_missing 表示刚检查的证据页已不再支持原条款
  withdrawnAt?: string | null; // 官方撤回
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;
export const ENDING_WINDOW = 3 * DAY;
export const STANDING_STALE_AFTER = 14 * DAY;
export const LIMITED_STALE_AFTER = 48 * HOUR;

/** 某个时区的偏移（分钟，东区为正）。 */
export function tzOffsetMinutes(tz: string, at: Date): number {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(f.formatToParts(at).map(x => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** 把"某时区的墙上时间"换成绝对时间。跑两轮，夏令时切换当天也准确。 */
export function zonedTime(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm, ss = 0] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm, ss);
  let t = wall - tzOffsetMinutes(tz, new Date(wall)) * 60000;
  t = wall - tzOffsetMinutes(tz, new Date(t)) * 60000;
  return new Date(t);
}

export const claimStartAt = (o: OfferTiming) => (o.claimStart ? zonedTime(o.claimStart, '00:00:00', o.sourceTz) : null);
export const claimEndAt = (o: OfferTiming) => (o.endKind === 'date' && o.claimEnd ? zonedTime(o.claimEnd, '23:59:59', o.sourceTz) : null);

export function isLimited(type: OfferType) {
  return type !== 'standing' && type !== 'apply';
}

/** 当前状态。抓取失败只会让状态变成 stale（待核验），永远不会直接判定结束。 */
export function liveStatus(o: OfferTiming, now: Date = new Date()): LiveStatus {
  const t = now.getTime();
  const verifiedAge = o.lastVerifiedAt ? t - Date.parse(o.lastVerifiedAt) : Infinity;
  if (o.withdrawnAt && Date.parse(o.withdrawnAt) <= t) return 'ended';
  const end = claimEndAt(o);
  if (end && end.getTime() < t) return 'ended';
  if (o.verifyResult === 'evidence_missing') return 'stale';
  if (o.type === 'standing') return verifiedAge >= STANDING_STALE_AFTER ? 'stale' : 'standing';
  if (o.type === 'apply') return verifiedAge >= STANDING_STALE_AFTER ? 'stale' : 'open';
  const start = claimStartAt(o);
  if (start && start.getTime() > t) return 'upcoming';
  if (verifiedAge > LIMITED_STALE_AFTER) return 'stale';
  if (end && end.getTime() - t <= ENDING_WINDOW) return 'ending';
  return 'active';
}

/** 能否出现在"今天可领"列表。 */
export const isClaimable = (s: LiveStatus) => s === 'active' || s === 'ending' || s === 'standing';

/**
 * 某一天（按访问者时区）这条限时羊毛是否有效：领取区间与当天 00:00–23:59:59 有交集。
 * 用于日历和 /on <日期> 查询。常驻与申请制不参与按日查询。
 */
export function activeOnDate(o: OfferTiming, date: string, viewerTz: string): boolean {
  if (!isLimited(o.type)) return false;
  const dayStart = zonedTime(date, '00:00:00', viewerTz).getTime();
  const dayEnd = zonedTime(date, '23:59:59', viewerTz).getTime();
  const start = claimStartAt(o)?.getTime() ?? (o.discoveredAt ? Date.parse(o.discoveredAt) : -Infinity);
  const withdrawn = o.withdrawnAt ? Date.parse(o.withdrawnAt) : Infinity;
  const end = Math.min(claimEndAt(o)?.getTime() ?? Infinity, withdrawn);
  return start <= dayEnd && end >= dayStart;
}

/**
 * 自动上架的硬门槛：权益、资格、有效期三项都要有官方原文摘录。
 * 领取方式不要求原文：官方很少专门写，按常识推断即可（应用＝下载登录、云和模型＝开通使用、会员＝充值），claim 摘录有就展示，没有不算缺。
 */
export interface EvidenceExcerpts { benefit?: string; eligibility?: string; claim?: string; validity?: string }
export function missingEvidence(e: EvidenceExcerpts | null | undefined): (keyof EvidenceExcerpts)[] {
  const keys: (keyof EvidenceExcerpts)[] = ['benefit', 'eligibility', 'validity'];
  return keys.filter(k => !e?.[k]?.trim());
}
