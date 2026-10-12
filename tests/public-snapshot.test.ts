import {it,expect} from 'vitest';
import worker from '../src/worker/index';
import {snapshotResponse,snapshotActive} from '../src/worker/public-snapshot';
const snapshot={capturedAt:'2026-10-11T06:44:32Z',platforms:[{id:'p',name:'Platform',type:'tool',status:'approved',site:'https://example.com'}],offers:[{id:'public',platformId:'p',title:'Public',type:'standing',requirements:['none'],modalities:['text'],endKind:'standing',sourceTz:'UTC',claimStart:null,claimEnd:null,reviewState:'approved',evidence:{tier:'site',url:'https://example.com',excerpts:{benefit:'hello'}},lastVerifiedAt:'2026-10-11T06:00:00Z'}]};
const assets={fetch:async()=>Response.json(snapshot)} as unknown as Fetcher;
it('serves all frontend bootstrap endpoints without querying exhausted D1',async()=>{
 const db={prepare(){throw Error('D1 must not be queried');}} as unknown as D1Database;
 for(const path of ['/api/offers?view=all','/api/platforms','/api/meta','/api/coverage']){
  const response=await worker.fetch(new Request('https://local.test'+path),{DB:db,ASSETS:assets,D1_PUBLIC_SNAPSHOT_UNTIL:'2099-01-01T00:00:00Z'} as any,{} as any);expect(response.status).toBe(200);const j=await response.json() as any;expect(j.degraded).toBe(true);
 }
});
it('snapshot mode blocks admin/ingest before database and expires',async()=>{
 const response=await worker.fetch(new Request('https://local.test/api/admin/queue'),{DB:{prepare(){throw Error('DB read')}},ASSETS:assets,D1_PUBLIC_SNAPSHOT_UNTIL:'2099-01-01T00:00:00Z'} as any,{} as any);expect(response.status).toBe(503);expect((await response.json() as any).error).toContain('只读');
 expect(snapshotActive('2000-01-01T00:00:00Z')).toBe(false);
});
it('returns explicit missing-detail and filters without claiming current verification',async()=>{
 const r=await snapshotResponse(new Request('https://local.test/api/offers/missing'),assets);expect(r!.status).toBe(404);
 const filtered=await snapshotResponse(new Request('https://local.test/api/offers?platform=other'),assets);expect((await filtered!.json() as any).offers).toEqual([]);
});
it('strips internal withdrawal and review notes from older snapshots',async()=>{
 const oldAssets={fetch:async()=>Response.json({...snapshot,offers:[{...snapshot.offers[0],withdrawnReason:'private workflow',reviewMemo:'private memo',reviewSuggestion:{reason:'private choice'},officialReview:{reason:'private check'}}]})} as unknown as Fetcher;
 for(const path of ['/api/offers?view=all','/api/offers/public']){
  const response=await snapshotResponse(new Request('https://local.test'+path),oldAssets);
  expect(await response!.text()).not.toMatch(/private|withdrawnReason|reviewMemo|reviewSuggestion|officialReview/);
 }
});
