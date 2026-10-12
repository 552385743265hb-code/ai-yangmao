import { buildNotice } from './admin';
import { buildCards } from './feishu';
import { publicSafeValuation } from '../shared/valuation';
import type { Env } from './index';
import {zonedTime} from '../shared/lifecycle';

type Notice = Awaited<ReturnType<typeof buildNotice>>;
type NoticeItem = Notice['items']['standing'][number];
const dayAt = (now:Date) => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const publicItem=(o:NoticeItem)=>({id:o.id,title:o.title,platformId:o.platformId,platform:o.platform,type:o.type,
  valueText:o.value,usdEstimate:o.usdEstimate,usdMax:o.usdMax,valuation:publicSafeValuation(o.valuation),
  requirements:o.requirements,membershipRequirement:o.membershipRequirement,audience:o.audience,claimMethod:o.claimMethod,
  steps:o.steps,models:o.models,tags:o.tags,modalities:o.modalities,claimStart:o.claimStart,claimEnd:o.claimEnd,
  endKind:o.endKind,sourceTz:o.sourceTz,creditValidity:o.creditValidity,evidenceUrl:o.evidenceUrl,evidenceTier:o.evidenceTier,
  originalExcerpts:{benefit:o.excerpts.benefit,eligibility:o.excerpts.eligibility,claim:o.excerpts.claim,validity:o.excerpts.validity},lastVerifiedAt:o.lastVerifiedAt??null,score:o.score,link:o.link});
function cardsMarkdown(cards:Awaited<ReturnType<typeof buildCards>>) {
  return cards.map(card=>`# ${card.header.title.content}\n\n`+card.elements.flatMap(element=>{
    const el=element as {tag:string;text?:{content?:string};actions?:{url:string;text:{content:string}}[]};
    if(el.tag==='div')return [el.text?.content??''];
    if(el.tag==='hr')return ['---'];
    if(el.tag==='action')return (el.actions??[]).map(a=>`[${a.text.content}](${a.url})`);
    return [];
  }).join('\n\n')).join('\n\n').replace(/<\/?font\b[^>]*>/g,'');
}
export type PublicDaily = {
  day:string;generatedAt:string;timeZone:'Asia/Tokyo';markdown:string;moreCount:number;revision:number;
  boards:{standing:ReturnType<typeof publicItem>[];rising:ReturnType<typeof publicItem>[];lastcall:ReturnType<typeof publicItem>[]};
};
type FrozenDaily={notice:Notice & {digestDay:string;digestRevision:number};cards:Awaited<ReturnType<typeof buildCards>>;public:PublicDaily;sourceDeliveryId?:string};
async function readFrozen(env:Env):Promise<FrozenDaily|null>{
  const row=await env.DB.prepare('SELECT payload FROM daily_digest WHERE id=1').first<{payload:string}>();
  return row?JSON.parse(row.payload) as FrozenDaily:null;
}
/** The public read path never generates content or touches delivery/translation state. */
export async function readLatestDaily(env:Env):Promise<PublicDaily|null>{return (await readFrozen(env))?.public??null;}
/** Only the existing scheduled/admin send path may call this. */
export async function generateDaily(env:Env,now=new Date(),refreshUnsent=false):Promise<FrozenDaily>{
  const day=dayAt(now), previous=await readFrozen(env);
  if(previous&&(previous.public.day>day||previous.public.day===day&&!refreshUnsent))return previous;
  const start=zonedTime(day,'00:00:00','Asia/Tokyo').toISOString(),end=new Date(Date.parse(start)+86400_000).toISOString();
  const activeDeliverySql="SELECT id FROM deliveries WHERE channel='feishu' AND kind='digest' AND status IN ('sent','pending','unknown') AND (json_extract(payload,'$.digestDay')=? OR (created_at>=? AND created_at<?))";
  if(refreshUnsent&&await env.DB.prepare(activeDeliverySql+' LIMIT 1').bind(day,start,end).first())throw Error('本期已有发送或待核对记录，不能改写固定日报');
  const delivered=!refreshUnsent?await env.DB.prepare("SELECT id,payload,created_at FROM deliveries WHERE channel='feishu' AND kind='digest' AND status='sent' AND created_at>=? AND created_at<? ORDER BY created_at DESC LIMIT 1").bind(start,end).first<{id:string;payload:string;created_at:string}>():null;
  const notice=delivered?JSON.parse(delivered.payload) as Notice:await buildNotice(env,'digest','feishu',now);
  const generatedAt=delivered?.created_at??now.toISOString();
  const cards=await buildCards(delivered?{...env,GEMINI_API_KEY:undefined}:env,notice,new Date(generatedAt));
  const revision=previous?.public.day===day?(previous.public.revision??1)+1:1;
  if(revision>1&&cards.length)cards[0].elements.unshift({tag:'div',text:{tag:'lark_md',content:`本期第 ${revision} 版修订：仅重建尚未发送的日报，请以本版为准。`}});
  const frozen:FrozenDaily={notice:{...notice,digestDay:day,digestRevision:revision},cards,...(delivered?{sourceDeliveryId:delivered.id}:{}),public:{day,generatedAt,timeZone:'Asia/Tokyo',revision,
    markdown:cardsMarkdown(cards)||`# AI 羊毛牧场日报 · ${day}\n\n本期暂无可列入榜单的权益。`,moreCount:notice.moreCount,
    boards:{standing:notice.items.standing.map(publicItem),rising:notice.items.rising.map(publicItem),lastcall:notice.items.lastcall.map(publicItem)}}};
  await env.DB.prepare(`INSERT INTO daily_digest(id,day,generated_at,payload) VALUES(1,?,?,?)
    ON CONFLICT(id) DO UPDATE SET day=excluded.day,generated_at=excluded.generated_at,payload=excluded.payload
    WHERE daily_digest.day<excluded.day OR (?=1 AND daily_digest.day=excluded.day AND daily_digest.payload=? AND NOT EXISTS(${activeDeliverySql}))`).bind(day,generatedAt,JSON.stringify(frozen),refreshUnsent?1:0,JSON.stringify(previous),day,start,end).run();
  const result=(await readFrozen(env))!;
  if(refreshUnsent&&result.public.revision!==revision)throw Error('日报或发送状态已变化，请重新读取后处理');
  return result;
}
