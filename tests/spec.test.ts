import { describe, expect, it } from 'vitest';
import { blocking, checkOffer, type SpecInput } from '../src/shared/spec';
import { liveStatus } from '../src/shared/lifecycle';

const base: SpecInput = {
  type: 'free', title: '某平台限时免费', valueText: '7 天免费使用', usdEstimate: 5, claimStart: '2026-09-01', claimEnd: '2026-12-31', endKind: 'date',
  sourceTz: 'Asia/Shanghai', requirements: ['none'], audience: 'all', creditValidity: '7 天', models: [], tags: [], steps: ['注册'],
  evidence: { tier: 'site', excerpts: { benefit: '免费' } },
};
const now = new Date('2026-10-01T00:00:00Z');
const fields = (o: SpecInput) => checkOffer(o, now).map(i => `${i.level}:${i.field}`);

describe('羊毛数据规格', () => {
  it('字段齐全时没有拦截也没有提醒', () => {
    expect(checkOffer(base, now).filter(i => i.level !== 'info')).toEqual([]);
  });
  it('已结束的历史活动没有开始日期：拦截（墓场、日历、时间线没法定位）', () => {
    const o = { ...base, claimStart: null, claimEnd: '2026-09-15' };
    expect(blocking(checkOffer(o, now)).map(i => i.field)).toEqual(['claimStart']);
    expect(checkOffer({ ...base, claimStart: null }, now).find(i => i.field === 'claimStart')?.level).toBe('warn');
  });
  it('缺美元、提到模型却没填免费模型、重置没发布时间、门槛待确认、整句英文：分别给出提醒或拦截', () => {
    const o = { ...base, title: 'Free access to GLM-4.7-Flash for everyone', valueText: '免费调用 GLM-4.7-Flash', usdEstimate: null, tags: ['reset'], requirements: ['unknown'] };
    expect(fields(o)).toEqual(expect.arrayContaining(['warn:title', 'block:requirements', 'warn:usdEstimate', 'warn:models', 'warn:publishedAt']));
    expect(checkOffer({ ...o, models: ['GLM-4.7-Flash'], publishedAt: '2026-09-01T08:00:00Z' }, now).some(i => ['models', 'publishedAt'].includes(i.field))).toBe(false);
  });
  it('每条提醒都写明影响哪些栏目', () => {
    for (const i of checkOffer({ ...base, usdEstimate: null, endKind: 'unknown', claimEnd: null }, now)) expect(i.sections.length).toBeGreaterThan(0);
  });
});

describe('管理员实测条目的状态', () => {
  const t = { type: 'free' as const, claimStart: '2026-09-01', sourceTz: 'UTC', lastVerifiedAt: '2026-09-01T00:00:00Z', evidence: { tier: 'tested' } };
  it('有截止日期的到截止前一直有效，不会因为没有自动复核变成待核验', () => {
    expect(liveStatus({ ...t, claimEnd: '2026-12-31', endKind: 'date' }, now)).toBe('active');
    expect(liveStatus({ ...t, claimEnd: '2026-12-31', endKind: 'date', evidence: { tier: 'site' } }, now)).toBe('stale');
  });
  it('没有截止日期的 7 天内要复测', () => {
    expect(liveStatus({ ...t, claimEnd: null, endKind: 'unknown', lastVerifiedAt: '2026-09-28T00:00:00Z' }, now)).toBe('active');
    expect(liveStatus({ ...t, claimEnd: null, endKind: 'unknown' }, now)).toBe('stale');
  });
});
