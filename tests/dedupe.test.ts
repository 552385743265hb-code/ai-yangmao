import { describe, expect, it } from 'vitest';
import { findDuplicate } from '../src/shared/dedupe';

const ex = [
  { id: 'a', platformId: 'stepfun', title: '阶跃星辰 Step Plan Flash Mini 每月 400M Credit', valueText: '每月 400M Credit', evidenceUrl: 'https://platform.stepfun.com/docs/zh/step-plan/overview' },
  { id: 'b', platformId: 'qiniu', title: '七牛云 AI 企业订阅计划（2,999元档）', valueText: '2,999 元每月', evidenceUrl: 'https://qiniu.com/ai/plan' },
];
describe('入库去重', () => {
  it('同平台同标题（措辞略不同）判为重复', () =>
    expect(findDuplicate({ platformId: 'stepfun', title: '阶跃星辰 Step Plan Flash Mini：每月 400M Credit', valueText: 'y', evidenceUrl: 'https://x' }, ex)?.id).toBe('a'));
  it('档位金额不同不算重复', () =>
    expect(findDuplicate({ platformId: 'qiniu', title: '七牛云 AI 企业订阅计划（4,999元档）', valueText: '4,999 元每月', evidenceUrl: 'https://qiniu.com/ai/plan' }, ex)).toBeUndefined());
  it('不同平台不算重复', () =>
    expect(findDuplicate({ platformId: 'other', title: ex[0].title, valueText: 'y', evidenceUrl: 'https://x' }, ex)).toBeUndefined());
  it('同链接同额度判为重复', () =>
    expect(findDuplicate({ platformId: 'stepfun', title: '阶跃 Mini 套餐', valueText: '每月 400M Credit', evidenceUrl: 'https://platform.stepfun.com/docs/zh/step-plan/overview/' }, ex)?.id).toBe('a'));
});


it('keeps equal-title reset events on different dates separate',()=>{
  const previous={id:'july',platformId:'openai',title:'Codex 重置卡发放',valueText:'1张重置卡',evidenceUrl:'https://x.com/staff/status/old',eventDay:'2026-07-13'};
  expect(findDuplicate({...previous,eventDay:'2026-10-07'},[previous])).toBeUndefined();
  expect(findDuplicate({...previous,evidenceUrl:'https://x.com/staff/status/confirmed'},[previous])?.id).toBe('july');
});

it('keeps content-identifying query parameters while ignoring tracking parameters',()=>{
  const old={id:'a',platformId:'vendor',title:'活动 A',valueText:'100 credits',evidenceUrl:'https://vendor.example/benefit?id=1&utm_source=feed'};
  expect(findDuplicate({...old,title:'活动 B',evidenceUrl:'https://vendor.example/benefit?id=2'},[old])).toBeUndefined();
  expect(findDuplicate({...old,title:'活动转述',evidenceUrl:'https://vendor.example/benefit?utm_medium=rss&id=1'},[old])?.id).toBe('a');
});

it('does not merge similar benefits from independent dated announcements',()=>{
  const regular={id:'regular',platformId:'devin',title:'Windsurf 平台 Claude Opus 4.6 额度限时优惠',valueText:'限时优惠',evidenceUrl:'https://devin.ai/blog/opus-46',claimStart:'2026-02-05'};
  const fast={...regular,title:'Windsurf 平台 Claude Opus 4.6 (fast mode) 额度限时优惠',evidenceUrl:'https://devin.ai/blog/opus-46-fast',claimStart:'2026-02-07'};
  expect(findDuplicate(fast,[regular])).toBeUndefined();
  expect(findDuplicate({...regular,evidenceUrl:regular.evidenceUrl,claimStart:'2026-02-06'},[regular])?.id).toBe('regular');
});
