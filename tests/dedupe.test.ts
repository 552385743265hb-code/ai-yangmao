import { describe, expect, it } from 'vitest';
import { findDuplicate } from '../src/shared/dedupe';
import {resetEventDay} from '../src/shared/reset-event';

const ex = [
  { id: 'a', platformId: 'stepfun', title: '阶跃星辰 Step Plan Flash Mini 每月 400M Credit', valueText: '每月 400M Credit', evidenceUrl: 'https://platform.stepfun.com/docs/zh/step-plan/overview' },
  { id: 'b', platformId: 'qiniu', title: '七牛云 AI 企业订阅计划（2,999元档）', valueText: '2,999 元每月', evidenceUrl: 'https://qiniu.com/ai/plan' },
];
describe('入库去重', () => {
  it('recognizes a daily free-tier FAQ summary as the existing daily check-in benefit',()=>{
    const old={id:'oiioii-daily-check-in',platformId:'oiioii',title:'OiiOii 免费档每日积分／签到奖励',valueText:'每天60积分',evidenceUrl:'https://www.oiioii.ai/price'};
    expect(findDuplicate({...old,id:'other',title:'OiiOii 免费档每日积分',valueText:'免费档提供每日积分',evidenceUrl:'https://www.oiioii.ai/faq'},[old])?.id).toBe(old.id);
    expect(findDuplicate({...old,title:'OiiOii 新用户注册60积分',valueText:'首次注册赠60积分'},[old])).toBeUndefined();
    expect(findDuplicate({...old,title:'OiiOii 视频模型每天60积分',valueText:'仅视频池每天60积分'},[old])).toBeUndefined();
  });
  it('recognizes the same one-week promotion reposted the next day without merging independent model modes',()=>{
    const old={id:'nous-original',platformId:'nous',title:'Nous Portal Step 5 Preview 免费一周',valueText:'免费一周',claimStart:'2026-10-08',evidenceUrl:'https://portal.nousresearch.com/'};
    expect(findDuplicate({...old,claimStart:'2026-10-09',evidenceUrl:'https://x.com/StepFun_ai/status/repost'},[old])?.id).toBe(old.id);
    expect(findDuplicate({...old,claimStart:'2026-11-09',evidenceUrl:'https://x.com/StepFun_ai/status/new'},[old])).toBeUndefined();
  });
  it('uses the stable original ID when extraction adds a date suffix to a continuing monthly allowance',()=>{
    const old={id:'anthropic-max-member-monthly-api',platformId:'anthropic',title:'Anthropic Max与Team订阅每月API额度',valueText:'Max100/200，Team最高500',evidenceUrl:'https://platform.claude.com/credits'};
    expect(findDuplicate({...old,id:old.id+'-2026-10-08',title:'Claude Max / Team会员每月API额度扩展',valueText:'Max5x100、20x200、Team500',evidenceUrl:'https://x.com/ClaudeDevs/status/new'},[old])?.id).toBe(old.id);
    expect(findDuplicate({...old,id:'unrelated-new-key',title:'Claude Max / Team会员每月API额度扩展',valueText:'Max5x100、20x200、Team500',evidenceUrl:'https://x.com/ClaudeDevs/status/new'},[old])?.id).toBe(old.id);
  });
  it('does not treat a monthly allowance mislabeled reset as a new reset event',()=>{
    expect(resetEventDay({title:'Claude Max / Team 会员每月 API 额度扩展',tags:['reset'],publishedAt:'2026-10-08T16:09:00Z'})).toBeNull();
    expect(resetEventDay({title:'Codex 每月额度重置卡发放',tags:['reset'],publishedAt:'2026-10-08T16:09:00Z'})).toBe('2026-10-08');
  });
  it('同平台同标题（措辞略不同）判为重复', () =>
    expect(findDuplicate({ platformId: 'stepfun', title: '阶跃星辰 Step Plan Flash Mini：每月 400M Credit', valueText: 'y', evidenceUrl: 'https://x' }, ex)?.id).toBe('a'));
  it('档位金额不同不算重复', () =>
    expect(findDuplicate({ platformId: 'qiniu', title: '七牛云 AI 企业订阅计划（4,999元档）', valueText: '4,999 元每月', evidenceUrl: 'https://qiniu.com/ai/plan' }, ex)).toBeUndefined());
  it('不同平台不算重复', () =>
    expect(findDuplicate({ platformId: 'other', title: ex[0].title, valueText: 'y', evidenceUrl: 'https://x' }, ex)).toBeUndefined());
  it('同链接同额度判为重复', () =>
    expect(findDuplicate({ platformId: 'stepfun', title: '阶跃 Mini 套餐', valueText: '每月 400M Credit', evidenceUrl: 'https://platform.stepfun.com/docs/zh/step-plan/overview/' }, ex)?.id).toBe('a'));
});

it('does not collapse ambiguous same-day reset announcements solely because the titles match',()=>{
  const first={id:'reset-1',platformId:'openai',title:'Codex 重置',valueText:'1张',eventDay:'2026-10-08',evidenceUrl:'https://x.com/staff/status/1'};
  const second={...first,id:'reset-2',evidenceUrl:'https://x.com/staff/status/2'};
  expect(findDuplicate(second,[first])).toBeUndefined();
  expect(findDuplicate({...second,sameOccurrenceAs:first.id},[first])?.id).toBe(first.id);
});

it('recognizes twitter.com and x.com links to the same reset post as the same source',()=>{
  const post={id:'reset',platformId:'openai',title:'额度重置',valueText:'1张',eventDay:'2026-10-08',evidenceUrl:'https://x.com/staff/status/123'};
  expect(findDuplicate({...post,evidenceUrl:'https://twitter.com/staff/status/123'},[post])?.id).toBe(post.id);
});


it('keeps equal-title reset events on different dates separate',()=>{
  const previous={id:'july',platformId:'openai',title:'Codex 重置卡发放',valueText:'1张重置卡',evidenceUrl:'https://x.com/staff/status/old',eventDay:'2026-07-13'};
  expect(findDuplicate({...previous,eventDay:'2026-10-07'},[previous])).toBeUndefined();
  expect(findDuplicate({...previous,evidenceUrl:'https://x.com/staff/status/confirmed',sameOccurrenceAs:previous.id},[previous])?.id).toBe('july');
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

const senseCanonical={id:'volc-sensenova-token-plan-free-tier-extension',platformId:'sensenova',reviewState:'approved',type:'standing',claimMethod:'signup',requirements:['none'],audience:'all',modalities:['text','image'],models:['SenseNova 6.8 Flash Lite','SenseNova U1 Fast'],title:'商汤 SenseNova TokenPlan 公测免费：每 5 小时 6 万积分',valueText:'公测期 ¥0/月：通用积分池和 Flash-Lite 专属积分池各给滚动 5 小时 6 万积分、每周 60 万积分',claimStart:'2026-08-28',evidenceUrl:'https://platform.sensenova.cn/docs'};
const senseAlias={...senseCanonical,id:'fresh-random-key',reviewState:'pending',title:'商汤 SenseNova 免费公测积分',valueText:'Free · 公测档位提供 60,000 积分 / 5 小时，可用 SenseNova 6.8 Flash Lite 与 SenseNova U1 Fast',claimStart:null,evidenceUrl:'https://www.sensenova.cn/token-plan'};
it('matches the same recurring free plan across pricing/docs and numeric formats',()=>{
 expect(findDuplicate(senseAlias,[senseCanonical])?.id).toBe(senseCanonical.id);
 expect(findDuplicate({...senseAlias,valueText:'Free公测：60000 credits / 5 hours',models:[...senseAlias.models].reverse()},[senseCanonical])?.id).toBe(senseCanonical.id);
 expect(findDuplicate(senseAlias,[{...senseAlias,id:'rejected-alias',reviewState:'rejected'},senseCanonical])?.id).toBe(senseCanonical.id);
});
it('does not collapse independent mechanisms, pools, regions, models, amounts or rounds',()=>{
 for (const change of [
  {type:'new',title:'商汤新人礼',valueText:'注册一次赠60,000积分'},
  {type:'free',title:'商汤无水印生成公测免费',valueText:'无水印生成免费'},
  {title:'商汤 TokenPlan 学生公测积分',requirements:['student']},
  {title:'商汤 TokenPlan 国际版公测积分'},
  {title:'商汤 TokenPlan Flash Lite 专属积分奖励'},
  {models:['SenseNova U1.5 Fast']},
  {valueText:'Free公测：20,000积分 / 5 小时'},
  {modalities:['text']},
  {eventDay:'2026-10-10'},
  {claimStart:'2026-11-01'},
  {evidenceUrl:'https://www.sensenova.cn/another-product'},
 ]) expect(findDuplicate({...senseAlias,...change},[senseCanonical]),JSON.stringify(change)).toBeUndefined();
});

const spaceOriginal={id:'opencode-opencode-space-bunny-free-period-extension',platformId:'opencode',reviewState:'approved',type:'free',claimMethod:'auto',models:['Space Bunny'],title:'OpenCode Space Bunny 模型免费期延长数日',valueText:'官方未写明具体免费额度与延长天数：Space Bunny 模型免费期延长数日，在 OpenCode 免费层中继续免费提供调用',claimStart:'2026-10-06',evidenceUrl:'https://x.com/opencode/status/2107398361733104102'};
const spaceAlias={...spaceOriginal,id:'opencode-opencode-spacebunny-free-tier',reviewState:'pending',claimMethod:'signup',title:'Space Bunny 免费期延长',valueText:'Space Bunny 模型在 OpenCode 免费 tier 限时免费开放，具体天数未明确，模型正在调校中',claimStart:null};
it('identifies Space Bunny aliases by the same model and official extension announcement',()=>{expect(findDuplicate(spaceAlias,[spaceOriginal])?.id).toBe(spaceOriginal.id);});
it('does not merge separate announcements, mechanisms, model scopes or channels',()=>{
 for(const delta of [{evidenceUrl:'https://x.com/opencode/status/2107398361733104103'}, {models:['Other Model']}, {title:'Space Bunny Zen API 免费期延长'}, {claimMethod:'code'}, {type:'new'}, {title:'Space Bunny 发布免费'}, {title:'Space Bunny 学生免费期延长'}, {eventDay:'2026-10-10'}])expect(findDuplicate({...spaceAlias,...delta},[spaceOriginal]),JSON.stringify(delta)).toBeUndefined();
});


it('remembers rejected API launch discounts despite percentage/fold wording and changed IDs',()=>{
 const old={id:'rejected-launch',platformId:'higgsfield',reviewState:'rejected',type:'topup',title:'Higgsfield API 发布首发折扣优惠',valueText:'全场模型85折（15% off），自选4款模型最高5折（50% off）',evidenceUrl:'https://higgsfield.ai/creator-hub/changelog',requirements:['none'],models:[]};
 expect(findDuplicate({...old,id:'new-key',type:'perk',title:'Higgsfield API 首发15%-50%折扣',valueText:'所有模型15%折扣，自选4个模型最高50%折扣。'},[old])?.id).toBe(old.id);
 expect(findDuplicate({...old,id:'folded-key',type:'perk',title:'Higgsfield API 首发折扣',valueText:'所有模型8.5折，自选4个模型最高5折。'},[old])?.id).toBe(old.id);
 expect(findDuplicate({...old,title:'Higgsfield API 学生认证专享5折',valueText:'学生认证用户50%折扣',requirements:['student']},[old])).toBeUndefined();
 expect(findDuplicate({...old,title:'Higgsfield API 首发赠金',valueText:'额外赠送100积分'},[old])).toBeUndefined();
});
it('remembers rejected unquantified free-plan aliases without swallowing a new actual allowance',()=>{
 const old={id:'rejected-free-plan',platformId:'meta',reviewState:'rejected',type:'standing',claimMethod:'signup',title:'Meta Muse 免费层额度',valueText:'免费调用带使用限制，可等额度刷新或升级付费。',evidenceUrl:'https://ai.meta.com/muse/',requirements:['none'],models:[]};
 expect(findDuplicate({...old,id:'brand-new',title:'Muse 免费版使用限制',valueText:'Free tier with usage limits; wait for the limit to refresh.'},[old])?.id).toBe(old.id);
 expect(findDuplicate({...old,title:'Muse 独立赠额',valueText:'每月赠送100积分'},[old])).toBeUndefined();
});
it('does not merge distinct Pixel device generations sharing a Google help page',()=>{
 const base={id:'pixel10',platformId:'google',reviewState:'approved',type:'gift',claimMethod:'app',title:'买Pixel10Pro系列送12个月GoogleAIPro',valueText:'Pixel10Pro可领12个月会员',evidenceUrl:'https://support.google.com/gemini/answer/13529884'};
 expect(findDuplicate({...base,id:'pixel9',title:'买Pixel9Pro系列送12个月GoogleAIPro',valueText:'Pixel9Pro可领12个月会员'},[base])).toBeUndefined();
});

const studentEvidence = {url:'https://mistral.ai/pricing/',tier:'site',pageHash:'a'.repeat(64),excerpts:{
 benefit:'Verified students can get Mistral Pro for $5.99 / month (normally $14.99).',
 eligibility:"Valid for a maximum of 12 months for verified students at accredited higher institutions and if you haven't used Vibe (or Le Chat) before. Price not inclusive of taxes."
}};
const studentMain={id:'student-main',platformId:'mistral',reviewState:'approved',type:'topup',claimMethod:'member',requirements:['student','pay:5.99'],models:[],title:'Mistral Pro 学生价 $5.99/月（原价 $14.99，约四折，最多 12 个月）',valueText:'认证学生可按 $5.99/月订阅，原价 $14.99，最多12个月，每月省$9。',evidenceUrl:studentEvidence.url,evidence:studentEvidence};
const studentAlias={...studentMain,id:'new-key',requirements:['student'],models:['Mistral Medium','Vibe'],title:'Mistral Pro 学生价 $5.99/月（最多 12 个月）',valueText:'高等院校学生通过验证后可享四折订阅，最长一年。',evidence:{...studentEvidence,excerpts:{benefit:studentEvidence.excerpts.eligibility,eligibility:studentEvidence.excerpts.benefit}}};
it('matches approved source claims across field swaps, abbreviated prose and missing inferred fields',()=>{
 expect(findDuplicate(studentAlias,[studentMain])?.id).toBe(studentMain.id);
});
it('does not equate a whole-page hash with a benefit identity',()=>{
 const api={...studentAlias,title:'Mistral Studio 免费API月度额度',valueText:'每月免费调用API',type:'standing',claimMethod:'signup',evidence:{...studentEvidence,excerpts:{benefit:'Free Studio users receive $10 each month for API calls.',eligibility:studentEvidence.excerpts.eligibility}}};
 expect(findDuplicate(api,[studentMain])).toBeUndefined();
});
it('rejects shared boilerplate, fabricated hash equality, new rounds and nonofficial evidence as identity',()=>{
 const boilerplate={eligibility:studentEvidence.excerpts.eligibility,validity:'All subscriptions are subject to our current terms and fair use policy for twelve months.'};
 const old={...studentMain,evidence:{...studentEvidence,excerpts:{...boilerplate,benefit:studentEvidence.excerpts.benefit}}};
 for(const changed of [
  {title:'Mistral Team全新计划',valueText:'团队专用会员',evidence:{...studentEvidence,excerpts:{...boilerplate,benefit:'Teams can access the special subscription for $99 per month.'}}},
  {evidence:{...studentAlias.evidence,tier:'media'}},
  {eventDay:'2026-11-01'},
  {evidence:{...studentEvidence,excerpts:{benefit:studentEvidence.excerpts.benefit,eligibility:studentEvidence.excerpts.benefit}}},
 ])expect(findDuplicate({...studentAlias,...changed},[old])).toBeUndefined();
});
it('handles independent text transformations without treating evidence field labels as identity',()=>{
 const titles=['Mistral 学生身份专属优惠','Pro认证学生特价','学生价最多一年','学生每月可省九美元'];
 for(const title of titles)for(const requirements of [['student'],['student','card'],['student','pay:5.99']]){
  expect(findDuplicate({...studentAlias,title,requirements,evidence:{...studentAlias.evidence,pageHash:'b'.repeat(64)}},[studentMain])?.id).toBe(studentMain.id);
 }
});
it('separates real policy text changes and independent date windows',()=>{
 for(const change of [
  {evidence:{...studentAlias.evidence,excerpts:{benefit:studentEvidence.excerpts.eligibility,eligibility:studentEvidence.excerpts.benefit.replace('$5.99','$4.99')}}},
  {claimStart:'2027-01-01',evidence:{...studentAlias.evidence,excerpts:{...studentAlias.evidence.excerpts,validity:'January 1 through December 31, 2027.'}}},
  {claimEnd:'2027-12-31',evidence:{...studentAlias.evidence,excerpts:{...studentAlias.evidence.excerpts,validity:'January 1 through December 31, 2027.'}}},
 ])expect(findDuplicate({...studentAlias,...change},[{...studentMain,claimStart:'2026-01-01',claimEnd:'2026-12-31',evidence:{...studentEvidence,excerpts:{...studentEvidence.excerpts,validity:'January 1 through December 31, 2026.'}}}])).toBeUndefined();
});

it('does not let fabricated date metadata bypass identical official claims',()=>{
 expect(findDuplicate({...studentAlias,claimStart:'2027-01-01',claimEnd:'2027-12-31'},[{...studentMain,claimStart:'2026-01-01',claimEnd:'2026-12-31'}])?.id).toBe(studentMain.id);
});
