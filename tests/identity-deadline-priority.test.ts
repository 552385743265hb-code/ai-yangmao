import {it,expect} from 'vitest';
import {auditFixture} from './fixtures/identity/audit';
import {canonicalTermsSchema} from '../src/shared/identity/types';
import {unknown} from './fixtures/identity/terms';

const facts=canonicalTermsSchema.parse({schemaVersion:'terms-v1',issuerProductId:unknown,mechanism:unknown,benefitPools:[],eligibility:unknown,geography:unknown,claimChannels:unknown,costs:unknown,claimWindow:unknown,occurrenceAnchor:unknown});
const day=(offset:number)=>new Date(Date.now()+offset*86400_000).toISOString().slice(0,10);
async function task(f:ReturnType<typeof auditFixture>,key:string,patch:Record<string,unknown>,order:number,indirect=false){
 const text=`Official campaign ${key} grants a free benefit to new accounts.`;
 const observation=indirect?(await f.call('ingest/observations',{requestId:key,originalUrl:'https://vendor.example/'+key,finalUrl:'https://vendor.example/'+key,text,sourceId:'vendor-source',fetchKind:'indirect',observedAt:'2026-10-12T10:00:00Z'})).body.observationId:await f.observation(key,text);
 const candidate=await f.candidate(key,observation,text,facts,{id:key,title:key,...patch});
 const resolved=await f.call('ingest/identity-candidates/'+candidate.candidateId+'/resolve',{requestId:key+'-resolve'});
 expect(resolved.body.outcome).toBe('needs_identity_review');
 f.sqlite.prepare('UPDATE review_tasks SET created_at=? WHERE id=?').run(`2026-01-${String(order).padStart(2,'0')}T00:00:00Z`,resolved.body.taskId);
 return resolved.body.taskId as string;
}

it('prepares imminent and explicitly time-limited activities first while reserving one slot for the oldest backlog item',async()=>{
 const f=auditFixture();try{
  const oldest=await task(f,'ordinary-old',{},1);
  await task(f,'ordinary-middle',{},2);
  await task(f,'later',{endKind:'date',claimEnd:day(30)},3);
  const hinted=await task(f,'限时免费候选',{},4);
  const soon=await task(f,'soon',{endKind:'date',claimEnd:day(5)},5);
  const imminent=await task(f,'imminent',{endKind:'date',claimEnd:day(2)},6);
  const queued=await f.call('ingest/identity-preparations');expect(queued.status).toBe(200);
  expect(queued.body.tasks.map((t:any)=>t.id)).toEqual([imminent,soon,hinted,oldest]);
 }finally{f.sqlite.close();}
});

it('an imminent unverified activity retries evidence within an hour, unlike an undated backlog item',async()=>{
 const f=auditFixture();try{
  const urgent=await task(f,'urgent-indirect',{endKind:'date',claimEnd:day(2)},1,true);
  const ordinary=await task(f,'ordinary-indirect',{},2,true);
  for(const id of [urgent,ordinary])expect((await f.call('ingest/identity-preparations/'+id+'/scan',{requestId:'scan-'+id,expectedRevision:0})).body.status).toBe('needs_source');
  const read=(id:string)=>JSON.parse((f.sqlite.prepare('SELECT suggestion_json FROM review_tasks WHERE id=?').get(id) as any).suggestion_json);
  const urgentDelay=Date.parse(read(urgent).nextAttemptAt)-Date.now(),ordinaryDelay=Date.parse(read(ordinary).nextAttemptAt)-Date.now();
  expect(urgentDelay).toBeGreaterThan(0);expect(urgentDelay).toBeLessThanOrEqual(60*60_000);
  expect(ordinaryDelay).toBeGreaterThan(5*60*60_000);
 }finally{f.sqlite.close();}
});
it('an administrator can immediately run bounded history preparation for a verified imminent candidate',async()=>{
 const f=auditFixture();try{
  const id=await task(f,'urgent-verified',{endKind:'date',claimEnd:day(2)},1);
  const result=await f.call('admin/identity/tasks/'+id+'/prepare',{requestId:'manual-priority-prepare',expectedRevision:0},true);
  expect(result.status,JSON.stringify(result.body)).toBe(200);expect(result.body.status).toBe('ready');
  const card=(await f.call('admin/identity/tasks',undefined,true)).body.tasks.find((item:any)=>item.id===id);
  expect(card.reviewPreparation.canDecide).toBe(true);
  expect(f.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:0});
  expect(f.sqlite.prepare('SELECT count(*) n FROM review_decisions').get()).toEqual({n:0});
 }finally{f.sqlite.close();}
});
it('immediate preparation obeys the canary and rejects supplied fetch proofs',async()=>{
 const f=auditFixture();try{
  const id=await task(f,'guarded-urgent',{endKind:'date',claimEnd:day(2)},1);
  expect((await f.call('admin/identity/tasks/'+id+'/prepare',{requestId:'outside-canary',expectedRevision:0},true,{IDENTITY_CANARY_PLATFORMS:'other'})).status).toBe(409);
  expect((await f.call('admin/identity/tasks/'+id+'/prepare',{requestId:'forged-source',expectedRevision:0,freshSource:{sourceText:'claimed proof'}},true)).status).toBe(400);
  expect((f.sqlite.prepare('SELECT revision FROM review_tasks WHERE id=?').get(id) as any).revision).toBe(0);
 }finally{f.sqlite.close();}
});
it('structured deadline facts still trigger urgency when the public candidate has no claimEnd',async()=>{
 const f=auditFixture();try{
  const text='Official campaign has an ending date and a free benefit.',o=await f.observation('structured-window',text);
  const end=day(2),terms=canonicalTermsSchema.parse({...facts,claimWindow:{state:'known',value:{startsAt:null,endsAt:end,timezone:'UTC'},evidenceRefs:['quote-1']}});
  const candidate=await f.candidate('structured-window',o,text,terms,{id:'structured-window',title:'短期优惠',claimEnd:null,endKind:'unknown'});
  const created=await f.call('ingest/identity-candidates/'+candidate.candidateId+'/resolve',{requestId:'structured-window-resolve'});
  const card=(await f.call('admin/identity/tasks',undefined,true)).body.tasks.find((item:any)=>item.id===created.body.taskId);
  expect(card.reviewPreparation).toMatchObject({urgency:'imminent',deadline:end,canDecide:false});
 }finally{f.sqlite.close();}
});
it('an expired limited-time headline does not displace still-open dated work',async()=>{
 const f=auditFixture();try{
  const oldest=await task(f,'ordinary-old',{},1);
  const later=await task(f,'still-open',{endKind:'date',claimEnd:day(20)},2);
  await task(f,'限时但已结束',{endKind:'date',claimEnd:day(-5)},3);
  const queue=await f.call('ingest/identity-preparations');
  expect(queue.body.tasks.map((item:any)=>item.id).slice(0,2)).toEqual([later,oldest]);
 }finally{f.sqlite.close();}
});
