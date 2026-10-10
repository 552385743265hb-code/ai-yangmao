import { afterEach,expect,it,vi } from 'vitest';
import { captureIdentityShadow } from '../pipeline/identity-shadow';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('A04/A05 shadow captures original text and stable spans in batches of ten without calling models or the legacy writer',async()=>{
 vi.stubEnv('API_BASE','https://mock.local');vi.stubEnv('IDENTITY_MODE','shadow');
 const requests:{url:string;body:any}[]=[];
 vi.stubGlobal('fetch',async(url:string,init:RequestInit)=>{requests.push({url,body:JSON.parse(String(init.body))});return new Response(JSON.stringify(url.endsWith('/observations')?{observationId:'obs-test',documentId:'doc-test',contentHash:'a'.repeat(64),truncated:false}:{receipts:requests.at(-1)!.body.candidates.map((c:any)=>({inputId:c.inputId,candidateId:'c-'+c.inputId,canonicalOfferId:null,entityId:null,versionId:null,decisionId:null,taskId:null,outcome:'deferred',retryable:true,reasonCodes:['shadow_pending_resolution']}))}),{headers:{'Content-Type':'application/json'}});});
 const text=Array.from({length:11},(_,i)=>`Reward ${i} gives credits.`).join('\n');
 const result=await captureIdentityShadow({url:'https://vendor.example/rewards',text,sourceId:'vendor-source',candidates:Array.from({length:11},(_,i)=>({title:`随机 ${i}`,evidence:{excerpts:{benefit:`Reward ${i} gives credits.`}}}))});
 expect(result).toMatchObject({recorded:11});
 expect(requests.map(r=>new URL(r.url).pathname)).toEqual(['/api/ingest/observations','/api/ingest/candidates','/api/ingest/candidates']);
 expect(requests[0].body.text).toBe(text);
 expect(requests[1].body.candidates).toHaveLength(10);
 expect(requests[2].body.candidates).toHaveLength(1);
 expect(requests[1].body.candidates[0].facts.eligibility).toEqual({state:'unknown'});
});
it('A27 missing explicit endpoint or dry run performs no network writes',async()=>{
 vi.stubEnv('API_BASE','');vi.stubEnv('DRY_RUN','0');
 vi.stubGlobal('fetch',()=>{throw new Error('must not reach network');});
 expect(await captureIdentityShadow({url:'https://vendor.example',text:'',candidates:[]})).toMatchObject({recorded:0,reason:'explicit_api_base_required'});
 vi.stubEnv('API_BASE','https://mock.local');vi.stubEnv('DRY_RUN','1');
 expect(await captureIdentityShadow({url:'https://vendor.example',text:'',candidates:[]})).toMatchObject({recorded:0,reason:'disabled'});
});
