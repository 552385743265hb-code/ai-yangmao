import { describe, expect, it } from 'vitest';
import { isFreebie, isLead } from '../pipeline/lib';

// 2026-10-01 漏抓排查：这些都是官方页或社区里真实出现过的福利说法，之前因为关键词表缺“积分、灵感值、邀请、实名、首月”等被过滤掉
describe('羊毛关键词', () => {
  it('官方页面里多模态平台的积分类福利能被识别', () => {
    for (const s of ['免费账号每日登录20积分', '每日补至50积分，不累计', '每月128免费灵感值', 'Free套餐每日免费积分70',
      '完成有效实名认证可领取16元全平台通用代金券', '连续包月首月90% off', 'Create using 50 credits that renew daily',
      '每邀请1位用户完成注册认证，邀请人可得16元', '每天3小时免费体验']) expect(isFreebie(s), s).toBe(true);
    expect(isFreebie('Our company was founded in 2020')).toBe(false);
  });
  it('社区线索里的同类说法能被识别', () => {
    for (const s of ['即梦每日登录送66积分', '硅基流动实名认证送16元代金券', 'Dreamina 90% off first month', '邀请好友双方各得250积分']) expect(isLead(s), s).toBe(true);
  });
});

import { parseModelJson } from '../pipeline/llm';
describe('模型输出的 JSON', () => {
  it('后面多吐内容、末尾多逗号、带代码块标记都能解析', () => {
    expect(parseModelJson('{"offers":[]}\n以上是结果')).toEqual({ offers: [] });
    expect(parseModelJson('```json\n{"offers":[{"a":1,},]}\n```')).toEqual({ offers: [{ a: 1 }] });
    expect(parseModelJson('{"offers":[{"t":"含 } 括号"}]}{"extra":1}')).toEqual({ offers: [{ t: '含 } 括号' }] });
  });
});
