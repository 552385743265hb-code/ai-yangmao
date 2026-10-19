import {z} from 'zod';
import {OFFER_TYPES} from './lifecycle';
import {networkEdition,applyNetworkRequirements} from './network-requirements';

export interface SemanticContext {platformId:string;url:string;benefit:string;sourceText:string;note?:string|null}
export type ListingFields=Record<string,unknown>;
export const SEMANTIC_KEYS=['type','modalities','audience','requirements'] as const;
const quote=z.string().max(4000);
export const semanticFactsSchema=z.object({
 type:z.object({value:z.enum(OFFER_TYPES),quote:quote.min(1)}).strict(),
 modalities:z.array(z.object({value:z.enum(['text','image','video','audio']),quote:quote.min(1)}).strict()).min(1).max(4),
 audience:z.object({value:z.enum(['new','old','all','unclear']),quote}).strict(),
}).strict();
export type SemanticFacts=z.infer<typeof semanticFactsSchema>;
export const semanticReviewSchema=z.object({
 version:z.literal('fast-track-semantics-v1'),model:z.string().min(1).max(120),
 initialFields:z.record(z.string(),z.unknown()),reviewedFields:z.record(z.string(),z.unknown()),
 facts:semanticFactsSchema,modelFacts:semanticFactsSchema.optional(),changes:z.array(z.object({field:z.enum(SEMANTIC_KEYS),before:z.unknown(),after:z.unknown()})).max(4),
}).strict();
export type SemanticReview=z.infer<typeof semanticReviewSchema>;
const normal=(s:string)=>s.normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
export function semanticSource(c:SemanticContext){return [`管理员提供的主要权益：${c.benefit}`,c.note?`管理员备注：${c.note}`:'',c.sourceText].filter(Boolean).join('\n');}
export function semanticFields(fields:ListingFields){return Object.fromEntries(SEMANTIC_KEYS.map(k=>[k,fields[k]??null]));}
export function withNetworkPolicy(fields:ListingFields,c:SemanticContext):ListingFields {
 if(!Array.isArray(fields.requirements))return fields;
 return {...fields,requirements:applyNetworkRequirements({platformId:c.platformId,title:String(fields.title??''),requirements:fields.requirements as string[],evidence:{url:c.url}}).requirements};
}
const generation:Record<string,RegExp>={
 image:/(?:generat\w*.{0,45}(?:image|picture|photo)|(?:image|picture).{0,35}generat|生图|生成.{0,10}(?:图像|图片)|(?:图像|图片)生成|\bflux\b|seedream|nano banana|gpt.image|\bimagen\b)/i,
 video:/(?:generat\w*.{0,45}video|video.{0,35}generat|生成.{0,10}视频|视频生成|\bsora\b|\bveo\b|\bkling\b|\bwan[ -]?\d|seedance|odyssey)/i,
 audio:/(?:speech|audio|voice|语音|音频|转写|朗读|配音|音乐|stepaudio)/i,
};
const deniedGeneration=/(?:no|not|without).{0,18}(?:image|video).{0,12}generat|(?:不含|不支持|并非|不是).{0,12}(?:生成|生图)/i;
const personalTrial=/(?:首次|第一次|新用户|新注册|激活后|领取后|首次使用|first.use|first.time|new.user|new.account|after.activation|after.claim)/i;
const globalFree=/(?:free|免费|限免|零费|不扣)/i;
const globalWindow=/(?:through\s+(?:[a-z]+\s+\d|\d)|until\s+(?:[a-z]+\s+\d|\d)|免费至|限时|截至|截止|免费期|统一到期)/i;
const globalAccess=/(?:tasks?|access|calls?).{0,90}(?:are|is|can).{0,25}free|(?:任务|技能|模型|调用|使用).{0,45}(?:免费至|限时免费|限免|免费开放)/i;
const newOnly=/(?:new\s+(?:users?|accounts?|subscribers?|customers?)|first.time|first.use|首次(?:注册|使用|登录|领取)|新(?:注册|用户|账号))/i;
const oldOnly=/(?:existing.{0,35}only|only.{0,35}existing|before.{0,35}(?:register|subscrib|account)|already.{0,35}(?:register|subscrib)|previously.{0,25}(?:register|subscrib)|老用户.{0,8}(?:专享|限定|才可)|(?:此前|之前|活动开始前).{0,20}(?:注册|订阅)|(?:注册|订阅).{0,20}(?:之前|早于))/i;
const inclusive=/(?:new\s+and\s+existing|existing\s+and\s+new|新老用户|新用户.{0,20}老用户|any\s*one|anyone|all\s+users)/i;

/** These checks complement the model review; they do not decide whether an owner-vouched benefit is admitted. */
export function semanticFieldIssues(fields:ListingFields,c:SemanticContext):string[]{
 const source=semanticSource(c),issues:string[]=[];
 const excerpt=(fields.excerpts as Record<string,unknown>|undefined)?.benefit;
 const focus=c.benefit+'\n'+(typeof excerpt==='string'?excerpt:'');
 if(fields.type!=='free'&&globalAccess.test(focus)&&globalFree.test(focus)&&globalWindow.test(focus)&&!personalTrial.test(focus))issues.push('type: 统一活动期内特定任务/能力零费用，应为 free；付费资格不把它变成 perk，个人首次试用才是 trial');
 else if(fields.type==='trial'&&globalFree.test(source)&&globalWindow.test(source)&&!personalTrial.test(source))issues.push('type: 全局活动截止前免费不是首次使用试用，应按限时免费 free 核对');
 if(fields.audience==='old'&&!oldOnly.test(source))issues.push('audience: 会员资格不等于仅老用户；没有明确老用户排他条件时按 all 核对');
 if(fields.audience==='new'&&!newOnly.test(source))issues.push('audience: 没有新注册/首次使用的限定，不得标仅新用户');
 if((fields.audience==='old'||fields.audience==='new')&&inclusive.test(focus))issues.push('audience: 原文包含新老用户或 anyone，应核对 all');
 if(Array.isArray(fields.modalities))for(const m of fields.modalities){
  if(typeof m==='string'&&generation[m]&&(!generation[m].test(source)||deniedGeneration.test(source)&&!source.split(/[\n.!。]/).some(line=>generation[m].test(line)&&!deniedGeneration.test(line))))issues.push(`modalities: ${m} 缺少实际生成/转写输出依据，界面、截图、输入素材不代表免费生成`);
 }
 if(Array.isArray(fields.requirements)&&networkEdition({platformId:c.platformId,title:String(fields.title??''),requirements:fields.requirements as string[],evidence:{url:c.url}})==='international'&&(!fields.requirements.includes('net')||fields.requirements.includes('none')))issues.push('requirements: 国际产品必须保留 net，不能有 none');
 return issues;
}
export function semanticFactIssues(facts:SemanticFacts,c:SemanticContext):string[]{
 const source=normal(semanticSource(c)),issues:string[]=[];
 for(const [field,q] of [['type',facts.type.quote],...facts.modalities.map(m=>['modalities',m.quote]),['audience',facts.audience.quote]]){
  if(q&&!source.includes(normal(q)))issues.push(`${field}: 核对摘录不在本次管理员描述或来源正文中`);
 }
 if(facts.audience.value==='old'&&!oldOnly.test(facts.audience.quote))issues.push('audience: old 必须引用明确只面向原有账号/活动前订阅的原句');
 if(facts.audience.value==='new'&&!newOnly.test(facts.audience.quote))issues.push('audience: new 必须引用新注册或首次使用原句');
 for(const m of facts.modalities)if(generation[m.value]&&(!generation[m.value].test(m.quote)||deniedGeneration.test(m.quote)))issues.push(`modalities: ${m.value} 的摘录没有证明实际生成或转写输出`);
 return issues;
}
export function applySemanticFacts(fields:ListingFields,facts:SemanticFacts,c:SemanticContext):ListingFields{
 const recurring=facts.type.value==='standing'||facts.type.value==='apply';
 const endKind=recurring?'standing':fields.claimEnd?'date':fields.endKind==='standing'?'unknown':fields.endKind;
 const audience=facts.audience.value==='unclear'&&!newOnly.test(semanticSource(c))&&!oldOnly.test(semanticSource(c))?'all':facts.audience.value;
 return withNetworkPolicy({...fields,type:facts.type.value,endKind,modalities:[...new Set(facts.modalities.map(m=>m.value))],audience},c);
}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function makeSemanticReview(initial:ListingFields,facts:SemanticFacts,c:SemanticContext,model:string):{fields:ListingFields;review:SemanticReview;issues:string[]}{
 const modelFacts=facts;
 const excerpt=(initial.excerpts as Record<string,unknown>|undefined)?.benefit;
 const focus=c.benefit+'\n'+(typeof excerpt==='string'?excerpt:'');
 if(globalAccess.test(focus)&&globalFree.test(focus)&&globalWindow.test(focus)&&!personalTrial.test(focus)&&facts.type.value!=='free'){
  const q=globalAccess.test(c.benefit)&&globalWindow.test(c.benefit)?c.benefit:typeof excerpt==='string'?excerpt:facts.type.quote;
  facts={...facts,type:{value:'free',quote:q}};
 }
 const fields=applySemanticFacts(initial,facts,c);
 const issues=[...semanticFactIssues(facts,c),...semanticFieldIssues(fields,c)];
 const before=semanticFields(initial),after=semanticFields(fields);
 const changes=SEMANTIC_KEYS.filter(k=>!same(before[k],after[k])).map(field=>({field,before:before[field],after:after[field]}));
 return {fields,review:{version:'fast-track-semantics-v1',model,initialFields:before,reviewedFields:after,facts,...(!same(modelFacts,facts)?{modelFacts}:{}),changes},issues};
}
export function semanticReviewIssues(fields:ListingFields,raw:unknown,c:SemanticContext,owner:ListingFields={}):string[]{
 const parsed=semanticReviewSchema.safeParse(raw);
 if(!parsed.success)return ['semanticReview: 缺少有效的发布前语义核对记录'];
 const r=parsed.data,issues=[...semanticFactIssues(r.facts,c),...semanticFieldIssues(fields,c)];
 const expected=semanticFields(applySemanticFacts(fields,r.facts,c));
 for(const k of SEMANTIC_KEYS)if(!(k in owner)&&(!same(expected[k],fields[k])||!same(r.reviewedFields[k],fields[k])))issues.push(`${k}: 发布字段与已校正的语义记录不一致`);
 return [...new Set(issues)];
}
