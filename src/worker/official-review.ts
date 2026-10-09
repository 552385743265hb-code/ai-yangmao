import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import * as s from '../db/schema';
import { leadPriority } from '../shared/leads';
import { officialTier, type OfficialReview } from '../shared/official-review';
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
  return {offer,target,platform,sources,version:`${offer.updatedAt}|${proposal?.updatedAt??''}`,eligible:!!platform&&platform.status==='approved'&&target.evidence.tier==='media'&&(offer.reviewState==='pending'||(offer.reviewState==='approved'&&!!proposal))};
}
function due(r:OfficialReview|null,now:number,updatedAt?:string) {
  if(!r)return true;
  if(r.status==='checking')return now-Date.parse(r.checkedAt)>20*60_000;
  if(updatedAt && Date.parse(updatedAt)>Date.parse(r.checkedAt))return true;
  return !!r.nextAttemptAt&&Date.parse(r.nextAttemptAt)<=now;
}
officialReviewRoutes.get('/queue',async c=>{
  const d=db(c.env),limit=Math.max(1,Math.min(20,Number(c.req.query('limit'))||8)),now=Date.now();
  const approved=new Set((await d.select({id:s.platforms.id}).from(s.platforms).where(eq(s.platforms.status,'approved'))).map(p=>p.id));
  const rows=await d.select().from(s.offers).where(inArray(s.offers.reviewState,['pending','approved']));
  const proposals=await d.select().from(s.offerProposals),byId=new Map(proposals.map(p=>[p.offerId,p]));
  const candidates=rows.filter(o=>{
    const p=byId.get(o.id),target=p?{...o,...p.candidate} as typeof o:o;
    return approved.has(target.platformId)&&target.evidence.tier==='media'&&(o.reviewState==='pending'||!!p)&&due(o.officialReview,now,p?.updatedAt??o.updatedAt);
  }).sort((a,b)=>leadPriority({id:0,origin:'aihot',title:a.title,raw:a.valueText})-leadPriority({id:0,origin:'aihot',title:b.title,raw:b.valueText})
    || (a.officialReview?.attempts??0)-(b.officialReview?.attempts??0) || a.discoveredAt.localeCompare(b.discoveredAt));
  return c.json({jobs:candidates.slice(0,limit).map(o=>({id:o.id,title:o.title})),remaining:candidates.length});
});
officialReviewRoutes.post('/:id/claim',async c=>{
  const state=await context(c.env,c.req.param('id')),now=Date.now();
  if(!state?.eligible || !due(state.offer.officialReview,now,state.version.split('|').filter(Boolean).sort().at(-1)))return c.json({claimed:false});
  const review:OfficialReview={status:'checking',jobId:crypto.randomUUID(),inputVersion:state.version,originUrl:state.target.evidence.url,attempts:(state.offer.officialReview && state.offer.officialReview.inputVersion===state.version ? state.offer.officialReview.attempts : 0)+1,checkedAt:new Date(now).toISOString(),nextAttemptAt:null,reason:'正在搜索官方出处并核对原文',queries:[],candidates:[]};
  const expected=state.offer.officialReview?JSON.stringify(state.offer.officialReview):null;
  const changed=await db(c.env).update(s.offers).set({officialReview:review}).where(and(eq(s.offers.id,state.offer.id),sql`COALESCE(${s.offers.officialReview},'')=COALESCE(${expected},'')`)).returning({id:s.offers.id});
  return c.json(changed.length?{claimed:true,jobId:review.jobId,offer:state.target,platform:state.platform,sources:state.sources}:{claimed:false});
});
officialReviewRoutes.post('/:id/result',async c=>{
  const parsed=z.object({jobId:z.string().uuid(),status:z.enum(['matched','unresolved','failed']),reason:z.string().max(500),queries:z.array(z.string().max(350)).max(4),candidates:z.array(z.url()).max(10),chosenUrl:z.url().optional(),changedFields:z.array(z.string().max(60)).max(35)}).safeParse(await c.req.json().catch(()=>null));
  if(!parsed.success)return c.json({error:'官方复核结果格式不正确'},400);
  const state=await context(c.env,c.req.param('id'));
  if(!state||state.offer.officialReview?.jobId!==parsed.data.jobId||state.offer.officialReview.status!=='checking')return c.json({error:'官方复核任务已失效'},409);
  const old=state.offer.officialReview,now=Date.now();
  let {status,reason}=parsed.data;
  if(status==='matched'&&(!state.platform || state.target.evidence.url!==parsed.data.chosenUrl || state.target.evidence.tier==='media' || !officialTier(state.target.evidence.url,state.platform,state.sources))) {
    status='unresolved';reason='已找到候选官方证据，但字段保护或状态变化使结果未应用，请管理员核对';
  }
  const retry=status==='matched'||old.attempts>=5?null:new Date(now+Math.min(24,2**(old.attempts-1))*3600_000).toISOString();
  const review:OfficialReview={...parsed.data,inputVersion:old.inputVersion,originUrl:old.originUrl,status,reason,attempts:old.attempts,checkedAt:new Date(now).toISOString(),nextAttemptAt:retry};
  const changed=await db(c.env).update(s.offers).set({officialReview:review}).where(and(eq(s.offers.id,state.offer.id),sql`json_extract(${s.offers.officialReview},'$.jobId')=${old.jobId}`,sql`json_extract(${s.offers.officialReview},'$.status')='checking'`)).returning({id:s.offers.id});
  return changed.length?c.json({ok:true,status,nextAttemptAt:retry}):c.json({error:'官方复核任务已更新'},409);
});
