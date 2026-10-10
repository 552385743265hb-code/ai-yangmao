import {officialTier,type OfficialPlatform,type OfficialSource} from './official-review';
import {normUrl} from './dedupe';

// Product nouns are not brands. Latin aliases need token boundaries (e.g. xAI != AI).
const generic=new Set(['ai','api','app','code','cloud','studio','portal','pro','free','model','models','cn','international','中国','国内','国际版']);
export function platformMentioned(text:string,platform:Pick<OfficialPlatform,'id'|'name'>):boolean {
 text=text.replace(/https?:\/\/[^\s<>"）)]+/gi,' ');
 const aliases=[platform.id,platform.name,...platform.name.split(/[（）()\/·、\s]+/)];
 return aliases.some(raw=>{
  const name=raw.normalize('NFKC').trim().toLowerCase();
  if(name.length<2||generic.has(name))return false;
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const pattern=/^[a-z0-9 _-]+$/.test(name)?`(?<![a-z0-9])${escaped}(?![a-z0-9])`:escaped;
  return new RegExp(pattern,'iu').test(text.normalize('NFKC'));
 });
}
type Lead={url:string;title:string|null;raw:string|null};
type Candidate={title:string;valueText:string;type:string;requirements?:string[];evidence:{url:string;excerpts?:Record<string,string|undefined>}};
const signals:Record<string,RegExp>={
 student:/学生|教师|在校|教育认证|student|teacher|education/i,
 reset:/重置|reset/i,referral:/邀请|推荐奖励|referral|invite/i,
 daily:/签到|每日|每天|daily|check.?in|per day/i,
 startup:/创业|初创|startups?|founders?/i,
 oss:/开源|open.source|\boss\b/i,
 cashback:/返现|消费返利|cashback/i,
};
/** Fail closed on a candidate that cannot be tied to the original lead. Search hits are not identity evidence. */
export function leadScopeMismatch(lead:Lead,platform:OfficialPlatform,sources:OfficialSource[],candidate:Candidate):string|null {
 const original=`${lead.title??''}\n${(lead.raw??'').split('[研判]')[0]}`;
 const direct=!!officialTier(lead.url,platform,sources);
 const urls=original.match(/https?:\/\/[^\s<>"）)]+/g)??[];
 const linked=urls.some(url=>!!officialTier(url,platform,sources));
 if(!direct&&!linked&&!platformMentioned(original,platform))return '原线索未指向该发放平台，不能用搜索到的其他福利替代';
 if(!direct&&/号池|账号池|账号买卖|账号转售|API\s*转售|中转站|account\s*pool/i.test(original))return '原线索涉及中转或账号转售，不能改抽模型厂商的无关活动';
 const targetKinds=Object.entries(signals).filter(([,pattern])=>pattern.test(original)).map(([kind])=>kind);
 const candidateText=`${candidate.title}\n${candidate.valueText}\n${candidate.requirements?.join(' ')??''}\n${Object.values(candidate.evidence.excerpts??{}).join(' ')}`;
 const nextKinds=Object.entries(signals).filter(([,pattern])=>pattern.test(candidateText)).map(([kind])=>kind);
 // An exact official landing page may legitimately reveal previously unstated conditions.
 const exactOfficial=direct&&normUrl(lead.url)===normUrl(candidate.evidence.url);
 if(nextKinds.some(kind=>!targetKinds.includes(kind))&&!exactOfficial)return '候选活动的资格或领取机制未出现在原线索中，需人工核对活动身份';
 if(targetKinds.length&&!targetKinds.some(kind=>nextKinds.includes(kind)))return '候选与原线索的活动机制不同';
 return null;
}
