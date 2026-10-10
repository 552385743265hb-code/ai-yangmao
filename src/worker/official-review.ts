import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import * as s from '../db/schema';
import { leadPriority } from '../shared/leads';
import { claimEndAt } from '../shared/lifecycle';
import { officialTier, officialReviewDue, OFFICIAL_REVIEW_LEASE_MS, type OfficialReview } from '../shared/official-review';
import type { Env } from './index';
const db=(env:Env)=>drizzle(env.DB,{schema:s});
export const officialReviewRoutes=new Hono<{Bindings:Env}>();
async function context(env:Env,id:string) {
  const d=db(env),[offer]=await d.select().from(s.offers).where(eq(s.offers.id,id));
  if(!offer)return null;
  const [proposal]=await d.select().from(s.offerProposals).where(eq(s.offerProposals.offerId,id));
  const target=proposal?{...offer,...proposal.candidate} as typeof offer:offer;
  const [platform]=await d.select().from(s.platforms).where(eq(s.platforms.id,target.platformId));
  const sources=await d.select({url:s.sources.url,tier:s.sources.tier}).from(s.sources).where(eq(s.sources.platformId,target.platformId));
  const identity=await env.DB.prepare('SELECT business_revision FROM benefit_entities WHERE canonical_offer_id=?').bind(offer.id).first<{business_revision:number}>();
  return {offer,target,platform,sources,identityRevision:identity?.business_revision,version:`${offer.updatedAt}|${proposal?.updatedAt??''}`,eligible:!!platform&&platform.status==='approved'&&target.evidence.tier==='media'&&(offer.reviewState==='pending'||(offer.reviewState==='approved'&&!!proposal))};
}
const proposalVersion = (id:string, version?:string) => version
  ? sql`EXISTS (SELECT 1 FROM offer_proposals WHERE offer_id=${id} AND updated_at=${version})`
  : sql`NOT EXISTS (SELECT 1 FROM offer_proposals WHERE offer_id=${id})`;
officialReviewRoutes.get('/queue',async c=>{
  const d=db(c.env),limit=Math.max(1,Math.min(20,Number(c.req.query('limit'))||8)),now=Date.now();
  const approved=new Set((await d.select({id:s.platforms.id}).from(s.platforms).where(eq(s.platforms.status,'approved'))).map(p=>p.id));
  const rows=await d.select().from(s.offers).where(inArray(s.offers.reviewState,['pending','approved']));
  const proposals=await d.select().from(s.offerProposals),byId=new Map(proposals.map(p=>[p.offerId,p]));
  const candidates=rows.map(o=>{
    const p=byId.get(o.id),target=p?{...o,...p.candidate} as typeof o:o;
    const recovery=o.officialReview?.status==='checking'&&now-Date.parse(o.officialReview.checkedAt)>=OFFICIAL_REVIEW_LEASE_MS&&target.evidence.tier!=='media';
    return {o,target,recovery,eligible:recovery||(approved.has(target.platformId)&&target.evidence.tier==='media'&&(o.reviewState==='pending'||!!p)&&officialReviewDue(o.officialReview,now,`${o.updatedAt}|${p?.updatedAt??''}`))};
  }).filter(x=>x.eligible);
  const rank=(x:typeof candidates[number])=>{
    if(x.recovery)return -1;
    const end=claimEndAt(x.target)?.getTime();
    return end!=null&&end>=now&&end-now<48*3600_000?0:1+leadPriority({id:0,origin:'aihot',title:x.target.title,raw:x.target.valueText});
  };
  candidates.sort((a,b)=>rank(a)-rank(b)||(a.o.officialReview?.attempts??0)-(b.o.officialReview?.attempts??0)||a.o.discoveredAt.localeCompare(b.o.discoveredAt));
  const selected=candidates.slice(0,limit);
  // 与初抽一样保留积压名额，持续到来的重置/赠额不能饿死旧草稿。
  if(limit>=5&&candidates.length>limit){
    const oldest=[...candidates].sort((a,b)=>a.o.discoveredAt.localeCompare(b.o.discoveredAt))[0];
    if(!selected.includes(oldest))selected[selected.length-1]=oldest;
  }
  return c.json({jobs:selected.map(x=>({id:x.o.id,title:x.target.title,recovery:x.recovery})),remaining:candidates.length});
});
officialReviewRoutes.post('/:id/claim',async c=>{
  const state=await context(c.env,c.req.param('id')),now=Date.now();
  if(!state)return c.json({claimed:false});
  const old=state.offer.officialReview;
  const expected=old?JSON.stringify(old):null;
  const guard=and(eq(s.offers.id,state.offer.id),eq(s.offers.updatedAt,state.offer.updatedAt),proposalVersion(state.offer.id,state.version.split('|')[1]||undefined),sql`COALESCE(${s.offers.officialReview},'')=COALESCE(${expected},'')`);
  // 业务写入已成功、结果回执丢失：结束过期占位并清楚交给管理员，不凭状态推断再次验证成功。
  if(old?.status==='checking'&&now-Date.parse(old.checkedAt)>=OFFICIAL_REVIEW_LEASE_MS&&state.target.evidence.tier!=='media'){
    const changed=await db(c.env).update(s.offers).set({officialReview:{...old,status:'unresolved',inputVersion:state.version,checkedAt:new Date(now).toISOString(),nextAttemptAt:null,reason:'上次任务回执中断；条目已有官方证据，保留当前内容，请管理员核对后审核'}}).where(guard).returning({id:s.offers.id});
    return c.json({claimed:false,recovered:changed.length>0});
  }
  if(!state.eligible || !officialReviewDue(old,now,state.version))return c.json({claimed:false});
  const review:OfficialReview={identityRevision:state.identityRevision,status:'checking',jobId:crypto.randomUUID(),inputVersion:state.version,originUrl:state.target.evidence.url,attempts:(state.offer.officialReview && state.offer.officialReview.inputVersion===state.version ? state.offer.officialReview.attempts : 0)+1,checkedAt:new Date(now).toISOString(),nextAttemptAt:null,reason:'正在搜索官方出处并核对原文',queries:[],candidates:[]};
  review.unresolvedAttempts=old?.inputVersion===state.version?(old.unresolvedAttempts??(old.status==='unresolved'?old.attempts:0)):0;
  const changed=await db(c.env).update(s.offers).set({officialReview:review}).where(guard).returning({id:s.offers.id});
  return c.json(changed.length?{claimed:true,jobId:review.jobId,previousCandidates:old?.inputVersion===state.version?old.candidates:[],offer:state.target,platform:state.platform,sources:state.sources}:{claimed:false});
});
officialReviewRoutes.post('/:id/result',async c=>{
  const parsed=z.object({jobId:z.string().uuid(),status:z.enum(['matched','unresolved','failed']),reason:z.string().max(500),queries:z.array(z.string().max(350)).max(4),candidates:z.array(z.url()).max(10),chosenUrl:z.url().optional(),changedFields:z.array(z.string().max(60)).max(35)}).safeParse(await c.req.json().catch(()=>null));
  if(!parsed.success)return c.json({error:'官方复核结果格式不正确'},400);
  const state=await context(c.env,c.req.param('id'));
  if(!state||state.offer.officialReview?.jobId!==parsed.data.jobId)return c.json({error:'官方复核任务已失效'},409);
  if(state.offer.officialReview.status!=='checking')return c.json({ok:true,status:state.offer.officialReview.status,nextAttemptAt:state.offer.officialReview.nextAttemptAt});
  if(state.identityRevision!==undefined&&state.offer.officialReview.identityRevision!==state.identityRevision)return c.json({error:'身份版本已更新，旧官方复核结果已失效'},409);
  const old=state.offer.officialReview,now=Date.now();
  let {status,reason}=parsed.data;
  if(status==='matched'&&(!state.platform || state.target.evidence.url!==parsed.data.chosenUrl || state.target.evidence.tier==='media' || !officialTier(state.target.evidence.url,state.platform,state.sources))) {
    status='unresolved';reason='已找到候选官方证据，但字段保护或状态变化使结果未应用，请管理员核对';
  }
  // 技术故障不等于证据不足：搜索/抓取服务恢复后仍可自动继续。
  const unresolvedAttempts=(old.unresolvedAttempts??0)+(status==='unresolved'?1:0);
  const end=claimEndAt(state.target)?.getTime();
  const delayHours=end!=null&&end>now&&end-now<48*3600_000?1:Math.min(24,2**Math.min(5,old.attempts-1));
  const retry=status==='matched'||(status==='unresolved'&&unresolvedAttempts>=5)?null:new Date(now+delayHours*3600_000).toISOString();
  const review:OfficialReview={...parsed.data,inputVersion:status==='matched'?state.version:old.inputVersion,originUrl:old.originUrl,status,reason,attempts:old.attempts,unresolvedAttempts,checkedAt:new Date(now).toISOString(),nextAttemptAt:retry};
  const changed=await db(c.env).update(s.offers).set({officialReview:review}).where(and(eq(s.offers.id,state.offer.id),eq(s.offers.updatedAt,state.offer.updatedAt),proposalVersion(state.offer.id,state.version.split('|')[1]||undefined),sql`json_extract(${s.offers.officialReview},'$.jobId')=${old.jobId}`,sql`json_extract(${s.offers.officialReview},'$.status')='checking'`)).returning({id:s.offers.id});
  return changed.length?c.json({ok:true,status,nextAttemptAt:retry}):c.json({error:'官方复核任务已更新'},409);
});
