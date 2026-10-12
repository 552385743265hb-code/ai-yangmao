import {z} from 'zod';
const DAY=86400000;
export const claimEndDerivationSchema=z.object({kind:z.literal('relative_duration'),durationDays:z.literal(7),anchorField:z.enum(['claimStart','publishedAt']),anchorValue:z.string().max(50),precision:z.enum(['date','timestamp']),estimatedEndAt:z.iso.datetime().nullable(),claimEnd:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),sourceUrl:z.url(),quote:z.string().min(1).max(4000)});
export type ClaimEndDerivation=z.infer<typeof claimEndDerivationSchema>;
interface Candidate {type:string;claimStart?:string|null;claimEnd?:string|null;endKind:string;publishedAt?:string|null;sourceTz:string;sourceText?:string;evidence:{url:string;tier:string;excerpts:{benefit?:string;validity?:string;claim?:string};claimEndDerivation?:ClaimEndDerivation};}
const week=/(?:free|available\s+for\s+free)[\s\S]{0,100}?(?:for\s+(?:a|one|1)\s+week|for\s+(?:seven|7)\s+days)|(?:一周|7\s*天)[^。\n]{0,30}(?:限免|免费)|(?:限免|免费)[^。\n]{0,30}(?:一周|7\s*天)/i;
const personal=/(?:领取|激活|注册|兑换|购买)后|(?:after|upon|from)[\s\S]{0,40}(?:sign.?up|register|registration|activation|purchase)|(?:each|every|per)\s+(?:user|account)/i;
const norm=(s:string)=>s.replace(/\s+/g,' ').trim();
function sourceDate(value:string,tz:string):string{
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;
}
/** Fill only grounded collection drafts. Stored/admin validation does not retroactively rewrite a baseline. */
export function fillCampaignDeadline<T extends Candidate>(offer:T):T {
 if(offer.claimEnd||offer.type!=='free'||offer.evidence.tier==='media')return offer;
 const quote=[offer.evidence.excerpts.validity,offer.evidence.excerpts.benefit].find(q=>q&&q.length<=4000&&week.test(q)&&!personal.test(q));
 if(!quote||personal.test(offer.evidence.excerpts.claim??''))return offer;
 if(offer.sourceText&&!norm(offer.sourceText).includes(norm(quote)))return offer;
 const published=offer.publishedAt;
 const valid=(s:string|null|undefined)=>!!s&&/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(s)&&Number.isFinite(Date.parse(s));
 if(!valid(offer.claimStart)&&!valid(published))return offer;
 try {
  const precise=valid(published)&&published!.includes('T')&&(!offer.claimStart||sourceDate(published!,offer.sourceTz)===offer.claimStart);
  const anchorField=precise||!offer.claimStart?'publishedAt':'claimStart';
  const anchorValue=(anchorField==='publishedAt'?published:offer.claimStart)!;
  const precision=anchorValue.includes('T')?'timestamp':'date';
  const estimatedEndAt=precision==='timestamp'?new Date(Date.parse(anchorValue)+7*DAY).toISOString():null;
  const claimEnd=estimatedEndAt?sourceDate(estimatedEndAt,offer.sourceTz):new Date(Date.parse(anchorValue+'T00:00:00Z')+7*DAY).toISOString().slice(0,10);
  const derivation:ClaimEndDerivation={kind:'relative_duration',durationDays:7,anchorField,anchorValue,precision,estimatedEndAt,claimEnd,sourceUrl:offer.evidence.url,quote};
  return {...offer,claimEnd,endKind:'date',evidence:{...offer.evidence,claimEndDerivation:derivation}};
 }catch{return offer;}
}
