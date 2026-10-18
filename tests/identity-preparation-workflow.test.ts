import {it,expect,vi,afterEach} from 'vitest';
import {resumeIdentityIntake} from '../pipeline/identity-workflow';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('maintenance continues a history task through bounded pages without model calls or publication',async()=>{
 vi.stubEnv('IDENTITY_MODE','enforce');vi.stubEnv('API_BASE','https://fixture.invalid');vi.stubEnv('INGEST_TOKEN','test-token');
 let writes=0,model=0;
 vi.stubGlobal('fetch',vi.fn(async(input:string,init?:RequestInit)=>{const url=String(input);
  if(url.endsWith('/identity-retries'))return Response.json({candidates:[]});
  if(url.endsWith('/identity-preparations'))return Response.json({tasks:[{id:'task',revision:0}]});
  if(url.includes('/identity-preparations/task/scan')){writes++;return Response.json(writes===1?{status:'scanning',scanned:40,revision:1}:{status:'ready',scanned:41,revision:2});}
  if(url.includes('generativelanguage')||url.includes('openrouter'))model++;
  throw new Error('unexpected '+url);
 }));
 const result=await resumeIdentityIntake(Date.now()+20000);expect(writes).toBe(2);expect(model).toBe(0);
});
