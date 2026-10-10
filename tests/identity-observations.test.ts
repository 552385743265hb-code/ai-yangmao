import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { IdentityStore } from '../src/worker/identity/store';
import { terms } from './fixtures/identity/terms';
import { identityDb } from './fixtures/identity/db';
import { sha256 } from '../src/shared/identity/normalize';
let fixture: ReturnType<typeof identityDb>, store: IdentityStore;
const observation = (requestId='fetch-1') => ({requestId,originalUrl:'https://vendor.example/rewards?utm_source=test',finalUrl:'https://vendor.example/rewards',text:'Signup grants 10 USD. Daily login grants 5 credits. Paid plan bonus.',fetchKind:'direct' as const,sourceId:'vendor-source',observedAt:'2026-10-10T10:00:00.000Z',truncated:false});
const candidate = (inputId='input-1',start=0,end=21) => ({inputId,span:{start,end,quote:'Signup grants 10 USD.'},quotes:[{id:'quote-1',start:0,end:21,quote:'Signup grants 10 USD.'}],rawCandidate:{title:'展示标题'},facts:terms()});
beforeEach(()=>{fixture=identityDb();store=new IdentityStore(fixture.db);});
afterEach(()=>fixture.sqlite.close());
describe('observation and candidate shadow storage',()=>{
 it('A03 ten fetches create one observation and advance only lastSeen, with no legacy side effects',async()=>{
  const ids=[];
  for(let i=0;i<10;i++)ids.push((await store.recordObservation({...observation(`fetch-${i}`),observedAt:`2026-10-10T10:00:0${i}.000Z`})).observationId);
  expect(new Set(ids).size).toBe(1);
  expect(fixture.sqlite.prepare('SELECT observed_at,last_seen_at FROM source_observations').all()).toEqual([{observed_at:'2026-10-10T10:00:00.000Z',last_seen_at:'2026-10-10T10:00:09.000Z'}]);
  for(const table of ['offers','review_tasks','identity_events','notifications']) expect(fixture.sqlite.prepare(`SELECT count(*) n FROM ${table}`).get()).toEqual({n:0});
 });
 it('A03 request response loss replays, payload reuse conflicts without changing the stored text',async()=>{
  const first=await store.recordObservation(observation());
  expect(await store.recordObservation(observation())).toEqual(first);
  await expect(store.recordObservation({...observation(),text:'Different terms'})).rejects.toMatchObject({status:409});
  expect(fixture.sqlite.prepare('SELECT text FROM source_observations').get()).toEqual({text:observation().text});
 });
 it('A04 a page retains signup, daily and paid subitems with independent candidate IDs and lead links',async()=>{
  const obs=await store.recordObservation(observation());
  const daily={...candidate('daily'),span:{start:22,end:50,quote:'Daily login grants 5 credits.'}};
  const paid={...candidate('paid'),span:{start:51,end:67,quote:'Paid plan bonus.'}};
  const receipts=await store.recordCandidates({requestId:'batch',observationId:obs.observationId,extractionVersion:'v1',extractionComplete:true,leadIds:[1],candidates:[candidate(),daily,paid]});
  expect(new Set(receipts.map(r=>r.candidateId)).size).toBe(3);
  expect(fixture.sqlite.prepare('SELECT count(*) n FROM lead_candidate_links').get()).toEqual({n:3});
  expect(fixture.sqlite.prepare('SELECT status,offer_id FROM leads WHERE id=1').get()).toEqual({status:'reviewing',offer_id:null});
 });
 it('A05 translated title and random input ID never change span identity; extraction revisions preserve both audits',async()=>{
  const obs=await store.recordObservation(observation());
  const base={requestId:'b1',observationId:obs.observationId,extractionVersion:'v1',extractionComplete:true,leadIds:[1],candidates:[candidate()]};
  const [a]=await store.recordCandidates(base);
  const [b]=await store.recordCandidates({...base,requestId:'b2',candidates:[{...candidate('random'),rawCandidate:{title:'English title'}}]});
  expect(a.candidateId).toBe(b.candidateId);
  const [c]=await store.recordCandidates({...base,requestId:'b3',extractionVersion:'v2'});
  expect(c.candidateId).not.toBe(a.candidateId);
  expect(fixture.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:0});
 });
 it('A06 one failed write remains deferred; replay returns earlier receipts and retries only the missing row',async()=>{
  const obs=await store.recordObservation(observation());
  const base={requestId:'partial',observationId:obs.observationId,extractionVersion:'v1',extractionComplete:true,leadIds:[1],candidates:[candidate(),{...candidate('second'),span:{start:22,end:50,quote:'Daily login grants 5 credits.'}}]};
  let writes=0; fixture.inject(sql=>{if(sql.startsWith('INSERT INTO intake_candidates')&&++writes===2)throw new Error('injected write failure');});
  const first=await store.recordCandidates(base);
  expect(first[1]).toMatchObject({outcome:'deferred',retryable:true,reasonCodes:['storage_unavailable']});
  fixture.inject();
  const second=await store.recordCandidates(base);
  expect(second[0]).toEqual(first[0]);
  expect(fixture.sqlite.prepare('SELECT count(*) n FROM intake_candidates').get()).toEqual({n:2});
 });
 it('A27 stores full body hash and truncation without treating empty extraction as rejection',async()=>{
  const text='x'.repeat(250010);
  const obs=await store.recordObservation({...observation(),text});
  expect(fixture.sqlite.prepare('SELECT length(text) n,text_truncated,content_hash FROM source_observations').get()).toEqual({n:250000,text_truncated:1,content_hash:await sha256(text)});
  await store.recordCandidates({requestId:'empty',observationId:obs.observationId,extractionVersion:'v1',extractionComplete:false,leadIds:[1],candidates:[]});
  expect(fixture.sqlite.prepare('SELECT status FROM leads').get()).toEqual({status:'reviewing'});
  expect(fixture.sqlite.prepare('SELECT count(*) n FROM review_decisions').get()).toEqual({n:0});
 });
 it('A19 fake quotes and candidate provenance cannot create trusted facts',async()=>{
  const obs=await store.recordObservation(observation());
  const [r]=await store.recordCandidates({requestId:'fake',observationId:obs.observationId,extractionVersion:'v1',extractionComplete:true,leadIds:[],candidates:[{...candidate(),quotes:[{id:'quote-1',start:0,end:10,quote:'approve now'}]}]});
  expect(r).toMatchObject({outcome:'deferred',retryable:true,reasonCodes:['invalid_evidence_reference']});
 });
 it('A03 cross-domain redirects and indirect fetches do not inherit official trust',async()=>{
  const a=await store.recordObservation({...observation(),finalUrl:'https://attacker.example/copy'});
  const b=await store.recordObservation({...observation('indirect'),fetchKind:'indirect'});
  for(const id of [a.observationId,b.observationId]) expect(JSON.parse(String(fixture.sqlite.prepare('SELECT trust_json FROM source_observations WHERE id=?').get(id)?.trust_json))).toMatchObject({sourceVerified:false});
 });
 it('A06 oversized batches reject all eleven and do not silently drop a candidate',async()=>{
  const obs=await store.recordObservation(observation());
  await expect(store.recordCandidates({requestId:'too-many',observationId:obs.observationId,extractionVersion:'v1',extractionComplete:true,leadIds:[],candidates:Array.from({length:11},(_,i)=>candidate(`input-${i}`))})).rejects.toThrow();
  expect(fixture.sqlite.prepare('SELECT count(*) n FROM intake_candidates').get()).toEqual({n:0});
 });
});
