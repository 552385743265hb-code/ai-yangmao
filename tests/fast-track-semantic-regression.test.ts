import {expect,it} from 'vitest';
import {mergeFastTrackFields,fastTrackFieldIssues} from '../src/shared/fast-track-fields';

const context={platformId:'perplexity',url:'https://x.com/AskPerplexity/status/2111120664543596957',benefit:'有效付费会员使用 Computer /reverse-engineer，免费至2026年10月31日，每人最多10000 credits',sourceText:'Ask Computer to reverse-engineer an app and it inspects how the app works without its source code, then builds a working version. Tasks that use /reverse-engineer are free through October 31, up to 10,000 credits per user.'};
const wrong={title:'Computer /reverse-engineer 免费额度',type:'trial',modalities:['text','image'],audience:'old',claimMethod:'app',requirements:['member:Perplexity 付费会员'],valueText:context.benefit,endKind:'date',claimEnd:'2026-10-31',sourceTz:'UTC',membershipRequirement:{schemaVersion:'membership-v1',status:'confirmed',catalogRevision:15,anyOf:[{allOf:[{productId:'perplexity',scope:'any_paid',planIds:[],excludePlanIds:[]}]}],evidenceUrls:[context.url]}};
it('detects semantic errors in a schema-valid copy of the real Perplexity extraction',()=>{
 const fields=mergeFastTrackFields(wrong,{},context.benefit,'Perplexity');
 const issues=fastTrackFieldIssues(fields,context);
 expect(issues.join('\n')).toContain('type');
 expect(issues.join('\n')).toContain('modalities');
 expect(issues.join('\n')).toContain('audience');
 expect(issues.join('\n')).toContain('requirements');
});

import {makeSemanticReview,semanticReviewIssues,semanticFactIssues} from '../src/shared/fast-track-semantics';
const facts={type:{value:'free',quote:'Tasks that use /reverse-engineer are free through October 31, up to 10,000 credits per user.'},modalities:[{value:'text',quote:'Ask Computer to reverse-engineer an app and it inspects how the app works without its source code, then builds a working version.'}],audience:{value:'all',quote:''}} as const;
it('corrects all four real mistakes while preserving structured membership and dates',()=>{
 const result=makeSemanticReview(wrong,facts as any,context,'real-review-model');
 expect(result.issues).toEqual([]);
 expect(result.review.changes.map(c=>c.field)).toEqual(['type','modalities','audience','requirements']);
 expect(result.fields).toMatchObject({type:'free',modalities:['text'],audience:'all',requirements:['member:Perplexity 付费会员','net'],claimEnd:'2026-10-31',membershipRequirement:wrong.membershipRequirement});
 expect(semanticReviewIssues(result.fields,result.review,context)).toEqual([]);
 expect(semanticReviewIssues({...result.fields,audience:'old'},result.review,context).join(' ')).toContain('audience');
});
it('rejects invented source quotes and a subscriber-only inference for old accounts',()=>{
 expect(semanticFactIssues({...facts,audience:{value:'old',quote:'有效付费会员使用 Computer /reverse-engineer，免费至2026年10月31日，每人最多10000 credits'}} as any,context).join(' ')).toContain('old');
 expect(semanticFactIssues({...facts,type:{value:'free',quote:'Fabricated quote'}} as any,context).join(' ')).toContain('摘录不在');
});
it('does not treat screenshots or UI design as free image generation',()=>{
 const c={...context,sourceText:'Inspect screenshots of an app and build its UI. This does not include image generation.'};
 const review=makeSemanticReview(wrong,{type:{value:'free',quote:c.benefit},modalities:[{value:'image',quote:c.sourceText}],audience:{value:'all',quote:''}},c,'review-model');
 expect(review.issues.join(' ')).toContain('modalities');
});
it('preserves actual image, video and audio benefits rather than forcing everything to text',()=>{
 for(const [modality,source] of [['image','Generate images with Seedream for free until October 31.'],['video','Generate videos with Wan 3.0 for free until October 31.'],['audio','Generate speech with stepaudio-3-realtime-preview for free until October 31.']] as const){
  const c={...context,platformId:'stepfun',benefit:source,sourceText:source};
  const result=makeSemanticReview({...wrong,requirements:['none']},{type:{value:'free',quote:source},modalities:[{value:modality,quote:source}],audience:{value:'all',quote:''}},c,'review');
  expect(result.issues).toEqual([]);expect(result.fields.modalities).toEqual([modality]);expect(result.fields.requirements).toEqual(['none']);
 }
});
it('keeps first-use trials and explicitly exclusive audiences when supported by source text',()=>{
 const c={...context,platformId:'stepfun',benefit:'New users only: first use gives seven days to generate videos with Wan 3.0.',sourceText:''};
 const result=makeSemanticReview({...wrong,requirements:['none']},{type:{value:'trial',quote:c.benefit},modalities:[{value:'video',quote:c.benefit}],audience:{value:'new',quote:c.benefit}},c,'review');
 expect(result.issues).toEqual([]);expect(result.fields).toMatchObject({type:'trial',audience:'new'});
});

it('rejects perk as well as trial for a globally free task with a fixed end date',()=>{
 const c={...context,benefit:'Perplexity有效付费会员在Computer使用/reverse-engineer技能的任务可免费至2026年10月31日，每人最多10000 credits'};
 for(const type of ['trial','perk','standing'])expect(fastTrackFieldIssues({...wrong,type},c).join(' ')).toContain('type:');
});
it('does not reclassify a genuine member bonus as global free access',()=>{
 const c={...context,benefit:'Paid subscribers get 500 bonus credits, valid until October 31.',sourceText:'Paid subscribers get 500 bonus credits, valid until October 31.'};
 const fields={...wrong,type:'perk',audience:'all',modalities:['text'],requirements:['net','member:Perplexity Pro']};
 expect(fastTrackFieldIssues(fields,c).filter(i=>i.startsWith('type:'))).toEqual([]);
});

it('preserves a real old-account restriction despite an unrelated all-users notice elsewhere on the page',()=>{
 const benefit='Only existing subscribers registered before October 1 receive 500 bonus credits.';
 const c={...context,benefit,sourceText:'All users can read the support page. '+benefit};
 const result=makeSemanticReview({...wrong,type:'perk',modalities:['text']},{type:{value:'perk',quote:benefit},modalities:[{value:'text',quote:benefit}],audience:{value:'old',quote:benefit}},c,'review');
 expect(result.issues).toEqual([]);expect(result.fields.audience).toBe('old');
});

it('automatically corrects an explicit globally free task even when the reviewer calls it a perk',()=>{
 const c={...context,benefit:'Perplexity有效付费会员在Computer使用/reverse-engineer技能的任务可免费至2026年10月31日，每人最多10000 credits'};
 const result=makeSemanticReview(wrong,{...facts,type:{value:'perk',quote:facts.type.quote}} as any,c,'review');
 expect(result.issues).toEqual([]);expect(result.fields.type).toBe('free');
 expect(result.review.facts.type.value).toBe('free');expect(result.review.modelFacts?.type.value).toBe('perk');
 expect(semanticReviewIssues(result.fields,result.review,c)).toEqual([]);
});

// Original administrator benefit and independent review facts from the real MiniMax rebuild.
const minimaxBenefit="所有订阅用户在 MiniMax Code 中可无限量免费使用 MiniMax M3.1 Flash 模型，活动持续至 2026 年 10 月 25 日 23:59 (UTC+8)🎁  From now through October 25, 2026, 23:59 (UTC+8), all subscribers can use the M3.1 Flash model within MiniMax Code with no usage caps — use it as much as you want.";
const minimaxInitial={"type": "free", "modalities": ["text", "code"], "audience": "old", "requirements": ["net", "member:MiniMax Code（国际版 M Plan / Token Plan） M Plan Go", "member:MiniMax Code（国际版 M Plan / Token Plan） M Plan Explore", "member:MiniMax Code（国际版 M Plan / Token Plan） M Plan Build", "member:MiniMax Code（国际版 M Plan / Token Plan） Token Plan Plus（存量）", "member:MiniMax Code（国际版 M Plan / Token Plan） Token Plan Max（存量）", "member:MiniMax Code（国际版 M Plan / Token Plan） Token Plan Ultra（存量）"]};
const minimaxModelFacts={"type": {"value": "perk", "quote": "所有订阅用户在 MiniMax Code 中可无限量免费使用 MiniMax M3.1 Flash 模型"}, "modalities": [{"value": "text", "quote": "all subscribers can use the M3.1 Flash model within MiniMax Code with no usage caps"}], "audience": {"value": "all", "quote": "all subscribers can use the M3.1 Flash model within MiniMax Code with no usage caps"}};
for(const chineseOnly of [false,true])it(`corrects the real MiniMax free-before-action benefit (${chineseOnly?'Chinese only':'bilingual'}) without rewriting model facts`,()=>{
 const benefit=chineseOnly?minimaxBenefit.split('🎁')[0]:minimaxBenefit;
 const modelFacts=chineseOnly?{...minimaxModelFacts,modalities:[{value:'text',quote:minimaxModelFacts.type.quote}],audience:{value:'all',quote:minimaxModelFacts.type.quote}}:minimaxModelFacts;
 const c={platformId:'minimax',url:'https://agent.minimax.io/',benefit,sourceText:''};
 const result=makeSemanticReview({...minimaxInitial,endKind:'date',claimEnd:'2026-10-25'},modelFacts as any,c,'gemini');
 expect(result.fields).toMatchObject({type:'free',modalities:['text'],audience:'all',claimEnd:'2026-10-25'});
 expect(result.review.modelFacts).toEqual(modelFacts);expect(result.review.facts.type.value).toBe('free');
 expect(result.issues).toEqual([]);expect(semanticReviewIssues(result.fields,result.review,c)).toEqual([]);
});
for(const action of ['使用','调用','访问','体验','运行','生成'])it(`recognizes free before ${action} and a dated 持续到 window`,()=>{
 const benefit=`所有订阅用户可免费  ${action} MiniMax M3.1 Flash 模型，活动持续到 2026 年 10 月 25 日。`;
 const c={...context,benefit,sourceText:''};
 const result=makeSemanticReview({...wrong,type:'perk',modalities:['text'],audience:'all'},{type:{value:'perk',quote:benefit},modalities:[{value:'text',quote:benefit}],audience:{value:'all',quote:''}},c,'review');
 expect(result.fields.type).toBe('free');expect(result.review.modelFacts?.type.value).toBe('perk');expect(result.issues).toEqual([]);
});
for(const benefit of ['订阅会员领取免费积分，供调用模型，活动持续至2026年10月25日。','订阅会员额外赠送免费调用额度，活动持续到2026年10月25日。'])it('keeps extra member credits as perk despite a dated campaign',()=>{
 const c={...context,benefit,sourceText:''};
 const result=makeSemanticReview({...wrong,type:'perk',modalities:['text'],audience:'all'},{type:{value:'perk',quote:benefit},modalities:[{value:'text',quote:benefit}],audience:{value:'all',quote:''}},c,'review');
 expect(result.fields.type).toBe('perk');expect(result.review.modelFacts).toBeUndefined();expect(result.issues).toEqual([]);
});
it('keeps a personal new-account first-activation trial with a campaign deadline',()=>{
 const benefit='新用户首次激活后可免费使用模型7天，活动持续至2026年10月25日。';
 const c={...context,benefit,sourceText:''};
 const result=makeSemanticReview({...wrong,modalities:['text'],audience:'new'},{type:{value:'trial',quote:benefit},modalities:[{value:'text',quote:benefit}],audience:{value:'new',quote:benefit}},c,'review');
 expect(result.fields.type).toBe('trial');expect(result.review.modelFacts).toBeUndefined();expect(result.issues).toEqual([]);
});
