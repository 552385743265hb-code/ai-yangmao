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
