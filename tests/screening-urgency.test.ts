import { describe, expect, it } from 'vitest';
import { claimEndAt } from '../src/shared/lifecycle';
import { classifyUrgency, compareQueueOrder, latestUsefulReviewAt, systemDueAt, verificationRetryDelayMs, verificationWindowEndsAt } from '../src/shared/screening/urgency';

const now = new Date('2026-10-12T00:00:00Z');
const at = (h: number) => new Date(now.getTime() + h * 3600e3);

describe('urgency', () => {
  it('tiers by deadline', () => {
    expect(classifyUrgency({ title: 't', text: '', claimEndAt: at(10) }, now).tier).toBe('P0');
    expect(classifyUrgency({ title: 't', text: '', claimEndAt: at(48) }, now).tier).toBe('P1');
    expect(classifyUrgency({ title: 't', text: '', claimEndAt: at(120) }, now).tier).toBe('P2');
    expect(classifyUrgency({ title: 't', text: '', claimEndAt: at(480) }, now).tier).toBe('P3');
  });
  it('tiers by wording with verbatim quotes', () => {
    const r = classifyUrgency({ title: 'Claude 重置卡今天发放', text: '' }, now);
    expect(r).toMatchObject({ tier: 'P0', signals: expect.arrayContaining(['same_day_one_time', 'reset_event']) });
    expect('Claude 重置卡今天发放').toContain(r.quote);
    expect(classifyUrgency({ title: '限量 1000 份，先到先得', text: '' }, now).tier).toBe('P1');
    expect(classifyUrgency({ title: '限时免费', text: '' }, now)).toMatchObject({ tier: 'P2', signals: ['limited_time_unknown_date'] });
    expect(classifyUrgency({ title: '抢疯了 速来', text: '' }, now).tier).toBe('P3');
  });
  it('respects the platform timezone at the 24 h boundary (Review Focus)', () => {
    const end = claimEndAt({ endKind: 'date', claimEnd: '2026-10-31', sourceTz: 'Asia/Shanghai' } as never)!;
    expect(classifyUrgency({ title: 't', text: '', claimEndAt: end }, new Date('2026-10-31T00:30:00Z')).tier).toBe('P0');
    expect(classifyUrgency({ title: 't', text: '', claimEndAt: end }, new Date('2026-10-29T12:00:00Z')).tier).toBe('P1');
  });
  it('computes clocks', () => {
    expect(systemDueAt('P0', '2026-10-12T10:00:00.000Z')).toBe('2026-10-12T10:30:00.000Z');
    expect(latestUsefulReviewAt('2026-10-13T00:00:00.000Z', 'P0')).toBe('2026-10-12T22:00:00.000Z');
    expect(verificationWindowEndsAt({ tier: 'P0', discoveredAt: now.toISOString(), deadline: null, now })).toBe('2026-10-12T01:00:00.000Z');
    expect(verificationWindowEndsAt({ tier: 'P2', discoveredAt: now.toISOString(), deadline: at(40).toISOString(), now })).toBe(at(10).toISOString());
    expect(verificationRetryDelayMs('P0', 3)).toBe(15 * 60e3);
  });
  it('orders the queue', () => {
    const p = (tier: string, l: string | null, d: string) => ({ tier, latestUsefulReviewAt: l, discoveredAt: d }) as never;
    const sorted = [p('P3', null, '1'), p('P1', '5', '2'), p('P0', '9', '3'), p('P1', '4', '4')].sort(compareQueueOrder);
    expect(sorted.map((x: { discoveredAt: string }) => x.discoveredAt)).toEqual(['3', '4', '2', '1']);
  });
});
