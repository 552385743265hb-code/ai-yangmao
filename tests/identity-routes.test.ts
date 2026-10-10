import { beforeEach,afterEach,expect,it } from 'vitest';
import worker from '../src/worker/index';
import { identityDb } from './fixtures/identity/db';
let f:ReturnType<typeof identityDb>;
beforeEach(()=>{f=identityDb();});afterEach(()=>f.sqlite.close());
async function post(path:string,body:unknown,token='ingest-test-token-123') {
 return worker.fetch(new Request(`https://local.test/api/ingest/${path}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)}),{DB:f.db,INGEST_TOKEN:'ingest-test-token-123',ADMIN_TOKEN:'admin-test-token-123'} as Parameters<typeof worker.fetch>[1],{} as ExecutionContext);
}
it('A30 observations require ingest auth and reject forged trust metadata',async()=>{
 const input={requestId:'route',originalUrl:'https://vendor.example/rewards',finalUrl:'https://vendor.example/rewards',text:'Terms',fetchKind:'direct',observedAt:'2026-10-10T10:00:00.000Z'};
 expect((await post('observations',input,'wrong')).status).toBe(401);
 expect((await post('observations',{...input,sourceVerified:true})).status).toBe(400);
 const res=await post('observations',input);expect(res.status).toBe(200);
 expect(await res.json()).toMatchObject({observationId:expect.stringMatching(/^obs_/)});
 expect(res.headers.get('Cache-Control')).toBe('no-store');
});
it('A27 an incomplete empty batch is recorded without falsely closing a lead',async()=>{
 const res=await post('observations',{requestId:'route',originalUrl:'https://vendor.example/rewards',finalUrl:'https://vendor.example/rewards',text:'',fetchKind:'unavailable',observedAt:'2026-10-10T10:00:00.000Z'});
 const {observationId}=await res.json() as {observationId:string};
 const receipt=await post('candidates',{requestId:'empty',observationId,extractionVersion:'v1',extractionComplete:false,leadIds:[1],candidates:[]});
 expect(receipt.status).toBe(200);
 expect(f.sqlite.prepare('SELECT status FROM leads WHERE id=1').get()).toEqual({status:'reviewing'});
 expect(f.sqlite.prepare('SELECT count(*) n FROM identity_commands').get()).toEqual({n:2});
});
