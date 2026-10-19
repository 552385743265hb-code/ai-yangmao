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
