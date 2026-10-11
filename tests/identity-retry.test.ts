import { afterEach,expect,it,vi } from 'vitest';
import { resumeIdentityIntake } from '../pipeline/identity-workflow';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('A06 resumes only server-selected deferred candidates without another extraction or search call',async()=>{
 vi.stubEnv('IDENTITY_MODE','enforce');vi.stubEnv('API_BASE','https://mock.local');vi.stubEnv('IDENTITY_MODEL_ASSIST','false');
 const calls:string[]=[];
 vi.stubGlobal('fetch',async(url:string)=>{calls.push(url);if(url.endsWith('/identity-retries'))return new Response(JSON.stringify({candidates:[{id:'deferred-1',revision:2}]}));if(url.endsWith('/identity-candidates/deferred-1/resolve'))return new Response(JSON.stringify({inputId:'i1',candidateId:'deferred-1',canonicalOfferId:'offer-1',entityId:'e1',versionId:'v1',decisionId:null,taskId:null,outcome:'duplicate_approved',retryable:false,reasonCodes:[]}));throw new Error('unexpected network call');});
 const result=await resumeIdentityIntake(Date.now()+10000);
 expect(result.resolved).toBe(1);expect(calls).toHaveLength(2);expect(calls.some(url=>/generativelanguage|search|exa/.test(url))).toBe(false);
});
it('A27 shadow/off modes do not resolve diagnostic intake or consume models',async()=>{
 vi.stubEnv('IDENTITY_MODE','shadow');vi.stubEnv('API_BASE','https://mock.local');vi.stubGlobal('fetch',()=>{throw new Error('no network');});
 expect(await resumeIdentityIntake(Date.now()+10000)).toEqual({resolved:0,deferred:0,modelTasks:0,status:'disabled',reason:'mode_shadow'});
});
