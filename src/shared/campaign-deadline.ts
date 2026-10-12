import {z} from 'zod';
import {zonedTime} from './lifecycle';
const DAY=86400000;
const durationSchema=z.object({count:z.number().positive().finite(),unit:z.enum(['minute','hour','day','week','month','year'])});
export const claimEndDerivationSchema=z.object({kind:z.literal('relative_duration'),durationDays:z.number().positive().optional(),components:z.array(durationSchema).min(1).max(12).optional(),anchorField:z.enum(['claimStart','publishedAt']),anchorValue:z.string().max(50),precision:z.enum(['date','timestamp']),estimatedEndAt:z.iso.datetime().nullable(),earliestEndAt:z.iso.datetime().optional(),latestEndAt:z.iso.datetime().optional(),claimEnd:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),sourceUrl:z.url(),quote:z.string().min(1).max(4000)}).refine(x=>!!x.components||!!x.durationDays);
export type ClaimEndDerivation=z.infer<typeof claimEndDerivationSchema>;
interface Candidate {type:string;claimStart?:string|null;claimEnd?:string|null;endKind:string;publishedAt?:string|null;sourceTz:string;sourceText?:string;evidence:{url:string;tier:string;excerpts:{benefit?:string;validity?:string;claim?:string};claimEndDerivation?:ClaimEndDerivation};}
const personal=/(?:领取|激活|注册|兑换|购买)后|(?:after|upon|from)[\s\S]{0,40}(?:sign.?up|register|registration|activation|purchase)|(?:each|every|per)\s+(?:user|account)/i;
const norm=(s:string)=>s.replace(/\s+/g,' ').trim();
const words:Record<string,number>={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,hundred:100};
function number(s:string):number{
 if(/^\d+(?:\.\d+)?$/.test(s))return +s;
 if(s==='半')return .5;
 if(/[a-z]/i.test(s)){let n=0;for(const w of s.toLowerCase().split(/[-\s]+/)){if(!(w in words))return NaN;n=w==='hundred'?Math.max(1,n)*100:n+words[w];}return n;}
 const digits:Record<string,number>={一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,零:0};let n=0,d=0;for(const c of s){if(c==='十'||c==='百'||c==='千'){n+=(d||1)*({十:10,百:100,千:1000}[c]);d=0;}else if(c in digits)d=digits[c];else return NaN;}return n+d;
}
/** Parse scoped duration declarations, not dates, billing cadence, alternatives or multiple unrelated windows. */
export function parseCampaignDuration(quote:string):z.infer<typeof durationSchema>[]|null {
 if(/(?:截止|截至|到|至)\s*(?:本月)?[0-9一二三四五六七八九十]+[日号](?!后)/.test(quote))return null;
 if(personal.test(quote)||/每(?:天|日|周|月|年)|per\s+(?:day|week|month|year)|monthly|weekly|yearly|每隔/i.test(quote))return null;
 const en=Object.keys(words).join('|');
 const quarter=quote.replace(new RegExp(`\\bfor\\s+((?:${en})(?:[- ](?:${en}))*|[0-9]+)\\s+quarters?\\b`,'gi'),(_,n)=>`for ${number(n)*3} months`).replace(/([一二两三四五六七八九十百千]+|[0-9]+)个季度/g,(_,n)=>`${number(n)*3}个月`).replace(/\b(?:a|one|1)\s+fortnight\b/gi,'2 weeks');
 const normalized=quarter.replace(new RegExp(`\\b((?:${en})(?:[- ](?:${en}))*)\\s+and\\s+a\\s+half\\s*[-]?\\s*(?:calendar\\s+)?(minutes?|hours?|days?|weeks?|months?|years?)\\b`,'gi'),(_,n,u)=>`${number(n)+.5} ${u}`).replace(/\bhalf\s+(?:an?\s+)?(minutes?|hours?|days?|weeks?|months?|years?)\b/gi,'0.5 $1');
 const text=normalized.replace(/\d{4}-\d{1,2}-\d{1,2}/g,'').replace(/(?:19|20|21)\d{2}年/g,'').replace(/(?:\d{4}年)?[\d一二三四五六七八九十]+月[\d一二三四五六七八九十]+[日号]/g,'');
 const re=new RegExp(`([0-9]+(?:\\.[0-9]+)?|[一二两三四五六七八九十百千零半]+)\\s*个?\\s*(分钟|小时|自然日|自然月|自然年|天|日|星期|周|个月|月|年)|\\b((?:${en})(?:[- ](?:${en}))*|[0-9]+(?:\\.[0-9]+)?)\\s*[-]?\\s*(?:calendar\\s+)?(minutes?|hours?|days?|weeks?|months?|years?)\\b`,'gi');
 const map:Record<string,z.infer<typeof durationSchema>['unit']>={分钟:'minute',小时:'hour',天:'day',日:'day',自然日:'day',自然月:'month',自然年:'year',星期:'week',周:'week',个月:'month',月:'month',年:'year'};
 const matches=[...text.matchAll(re)];if(!matches.length||matches.length>12)return null;
 const result:z.infer<typeof durationSchema>[]=[];
 for(let i=0;i<matches.length;i++){const m=matches[i],count=number(m[1]??m[3]),unit=map[m[2]]??m[4].toLowerCase().replace(/s$/,'') as z.infer<typeof durationSchema>['unit'];if(!Number.isFinite(count)||count<=0||count>100000||(['month','year'].includes(unit)&&!Number.isInteger(count)))return null;
  if(i){const prev=matches[i-1];const between=text.slice(prev.index!+prev[0].length,m.index);if(!/^\s*(?:and|\+|又|零|及)?\s*$/i.test(between))return null;}
  if(result.at(-1)?.unit===unit)result[result.length-1].count+=count;else result.push({count,unit});
 }
 return result;
}
function parts(value:Date,tz:string){return Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(value).map(x=>[x.type,x.value]));}
function sourceDate(value:Date,tz:string):string{const p=parts(value,tz);return `${p.year}-${p.month}-${p.day}`;}
function advance(value:Date,components:z.infer<typeof durationSchema>[],tz:string,dateOnly:boolean):Date{
 let at=value;
 for(const {count,unit} of components){
  if(unit==='month'||unit==='year'||(dateOnly&&['day','week'].includes(unit)&&Number.isInteger(count))){
   const p=parts(at,tz);let y=+p.year,m=+p.month-1,d=+p.day;
   if(unit==='month'||unit==='year'){const index=y*12+m+count*(unit==='year'?12:1);y=Math.floor(index/12);m=index%12;d=Math.min(d,new Date(Date.UTC(y,m+1,0)).getUTCDate());}
   else {const date=new Date(Date.UTC(y,m,d+count*(unit==='week'?7:1)));y=date.getUTCFullYear();m=date.getUTCMonth();d=date.getUTCDate();}
   at=new Date(zonedTime(`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,`${p.hour}:${p.minute}:${p.second}`,tz).getTime()+at.getUTCMilliseconds());
  }else at=new Date(at.getTime()+count*({minute:60000,hour:3600000,day:DAY,week:7*DAY}[unit as 'minute'|'hour'|'day'|'week']));
 }
 return at;
}
/** Fill collection drafts only; reviewed stored baselines are not rewritten by unrelated validation. */
export function fillCampaignDeadline<T extends Candidate>(offer:T):T {
 if(offer.claimEnd||['standing','apply'].includes(offer.type)||offer.evidence.tier==='media')return offer;
 const quote=[offer.evidence.excerpts.validity,offer.evidence.excerpts.benefit].find(q=>q&&q.length<=4000&&parseCampaignDuration(q)&&!personal.test(q));
 if(!quote||personal.test(offer.evidence.excerpts.claim??''))return offer;
 const globalStatement=/(?:活动|限免|限时|campaign|promotion|offer\s+(?:runs|lasts)|availability)/i.test(quote);
 if(offer.type!=='free'&&!globalStatement)return offer;
 if(/会员|订阅|试用期|有效期|membership|subscription|trial|credits?\s+(?:valid|expire)/i.test(quote)&&!globalStatement)return offer;
 if(offer.sourceText&&!norm(offer.sourceText).includes(norm(quote)))return offer;
 const components=parseCampaignDuration(quote)!;
 const valid=(s:string|null|undefined)=>!!s&&/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(s)&&Number.isFinite(Date.parse(s));
 if(!valid(offer.claimStart)&&!valid(offer.publishedAt))return offer;
 try {
  const published=offer.publishedAt;
  const precise=valid(published)&&published!.includes('T')&&(!offer.claimStart||sourceDate(new Date(published!),offer.sourceTz)===offer.claimStart);
  const anchorField=precise||!offer.claimStart?'publishedAt':'claimStart',anchorValue=(anchorField==='publishedAt'?published:offer.claimStart)!;
  const precision=anchorValue.includes('T')?'timestamp':'date';
  const start=precision==='timestamp'?new Date(anchorValue):zonedTime(anchorValue,'00:00:00',offer.sourceTz);
  const earliest=advance(start,components,offer.sourceTz,precision==='date');
  let latest=precision==='timestamp'?earliest:advance(advance(start,[{count:1,unit:'day'}],offer.sourceTz,true),components,offer.sourceTz,true);
  if(precision==='date'&&latest<=earliest)latest=advance(earliest,[{count:1,unit:'day'}],offer.sourceTz,true);
  const claimEnd=sourceDate(new Date(latest.getTime()-(precision==='date'?1:0)),offer.sourceTz);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(claimEnd))return offer;
  const durationDays=components.every(c=>['day','week'].includes(c.unit))?components.reduce((n,c)=>n+c.count*(c.unit==='week'?7:1),0):undefined;
  const derivation:ClaimEndDerivation={kind:'relative_duration',components,...(durationDays?{durationDays}:{}),anchorField,anchorValue,precision,estimatedEndAt:precision==='timestamp'?earliest.toISOString():null,earliestEndAt:earliest.toISOString(),latestEndAt:latest.toISOString(),claimEnd,sourceUrl:offer.evidence.url,quote};
  return {...offer,claimEnd,endKind:'date',evidence:{...offer.evidence,claimEndDerivation:derivation}};
 }catch{return offer;}
}
