import { describe, expect, it } from 'vitest';
import { activeOnDate, claimEndAt, liveStatus, missingEvidence, zonedTime, type OfferTiming } from './lifecycle';

const base: OfferTiming = {
  type: 'free', claimStart: '2026-10-01', claimEnd: '2026-10-10', endKind: 'date',
  sourceTz: 'Asia/Shanghai', lastVerifiedAt: '2026-10-05T00:00:00Z',
};
const at = (iso: string) => new Date(iso);
/** 在 now 前 1 小时核验过，排除"待核验"的干扰。 */
const fresh = (o: OfferTiming, iso: string) => ({ ...o, lastVerifiedAt: new Date(Date.parse(iso) - 3600_000).toISOString() });

describe('时区换算', () => {
  it('美西时间 23:59:59 截止，换算成北京时间是次日 14:59:59', () => {
    const end = claimEndAt({ ...base, claimEnd: '2026-10-10', sourceTz: 'America/Los_Angeles' })!;
    expect(end.toISOString()).toBe('2026-10-11T06:59:59.000Z'); // PDT = UTC-7
  });
  it('夏令时结束当天也换算正确', () => {
    expect(zonedTime('2026-11-01', '23:59:59', 'America/Los_Angeles').toISOString()).toBe('2026-11-02T07:59:59.000Z'); // PST = UTC-8
  });
});

describe('状态', () => {
  it('截止前 3 天内为即将结束', () => {
    expect(liveStatus(fresh(base, '2026-10-08T00:00:00Z'), at('2026-10-08T00:00:00Z'))).toBe('ending');
    expect(liveStatus(base, at('2026-10-05T12:00:00Z'))).toBe('active');
  });
  it('截止时刻之后才算结束（按官方时区当天 23:59:59）', () => {
    expect(liveStatus(fresh(base, '2026-10-10T15:59:00Z'), at('2026-10-10T15:59:00Z'))).toBe('ending'); // 北京 23:59
    expect(liveStatus(base, at('2026-10-10T16:00:01Z'))).toBe('ended');
  });
  it('开始前为未开始', () => {
    expect(liveStatus(base, at('2026-09-30T00:00:00Z'))).toBe('upcoming');
  });
  it('抓取失败只会转为待核验，不会误判结束', () => {
    const o = { ...base, lastVerifiedAt: '2026-10-01T00:00:00Z' };
    expect(liveStatus(o, at('2026-10-04T00:00:00Z'))).toBe('stale');
  });
  it('恢复核验后回到进行中', () => {
    expect(liveStatus({ ...base, lastVerifiedAt: '2026-10-04T00:00:00Z' }, at('2026-10-04T01:00:00Z'))).toBe('active');
  });
  it('官方撤回立即结束', () => {
    expect(liveStatus({ ...base, withdrawnAt: '2026-10-03T00:00:00Z' }, at('2026-10-04T00:00:00Z'))).toBe('ended');
  });
  it('常驻额度 14 天没核验成功转为待核验', () => {
    const o: OfferTiming = { ...base, type: 'standing', endKind: 'standing', claimStart: null, claimEnd: null, lastVerifiedAt: '2026-10-01T00:00:00Z' };
    expect(liveStatus(o, at('2026-10-14T00:00:00Z'))).toBe('standing');
    expect(liveStatus(o, at('2026-10-15T00:00:01Z'))).toBe('stale');
  });
  it('截止未知的活动没有截止也不会过期', () => {
    const o = { ...base, endKind: 'unknown' as const, claimEnd: null, lastVerifiedAt: '2027-01-01T00:00:00Z' };
    expect(liveStatus(o, at('2027-01-01T12:00:00Z'))).toBe('active');
  });
});

describe('按日期查询', () => {
  const pt = { ...base, claimStart: '2026-10-01', claimEnd: '2026-10-10', sourceTz: 'America/Los_Angeles' };
  it('美西 10 月 10 日截止，在北京时间 10 月 11 日下午仍然有效', () => {
    expect(activeOnDate(pt, '2026-10-11', 'Asia/Shanghai')).toBe(true);
    expect(activeOnDate(pt, '2026-10-12', 'Asia/Shanghai')).toBe(false);
  });
  it('开始前一天无效', () => {
    expect(activeOnDate(base, '2026-09-30', 'Asia/Shanghai')).toBe(false);
    expect(activeOnDate(base, '2026-10-01', 'Asia/Shanghai')).toBe(true);
  });
  it('常驻额度不参与按日查询', () => {
    expect(activeOnDate({ ...base, type: 'standing' }, '2026-10-05', 'Asia/Shanghai')).toBe(false);
  });
  it('未公布开始时间的活动不能倒推到系统发现之前', () => {
    const offer = { ...base, claimStart: null, claimEnd: null, endKind: 'unknown' as const, discoveredAt: '2026-09-30T04:00:00Z' };
    expect(activeOnDate(offer, '2026-09-01', 'Asia/Tokyo')).toBe(false);
    expect(activeOnDate(offer, '2026-09-30', 'Asia/Tokyo')).toBe(true);
  });
});

describe('证据门槛', () => {
  it('四项缺一项就不能自动上架', () => {
    expect(missingEvidence({ benefit: 'x', eligibility: 'y', claim: 'z' })).toEqual(['validity']);
    expect(missingEvidence({ benefit: 'x', eligibility: 'y', claim: 'z', validity: ' ' })).toEqual(['validity']);
    expect(missingEvidence({ benefit: 'x', eligibility: 'y', claim: 'z', validity: 'w' })).toEqual([]);
  });
});
