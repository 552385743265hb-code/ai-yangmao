import { afterEach,expect,it,vi } from 'vitest';
import { reviewIdentity, runIdentityReviews, validateIdentitySuggestion, identityCacheKey } from '../pipeline/identity-review';
import { terms,known } from './fixtures/identity/terms';
import type { VersionedEntity } from '../src/shared/identity/types';
const entity:VersionedEntity={id:'e1',platformId:'vendor',revision:1,publicationRevision:1,approvedVersionId:'v1',terms:terms()};
const evidence={observationId:'o1',fullText:'Signup grants 10 USD.',truncated:false,sourceVerified:true,quoteById:{q:'Signup grants 10 USD.','quote-1':'Signup grants 10 USD.'}};
const input=()=>({candidate:terms(),entities:[structuredClone(entity)],evidence:structuredClone(evidence), retrievalComplete:true});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('A19 candidate-external IDs, fake quotes and injected approval fields are rejected',()=>{
 const valid={relation:'SAME',entityId:'e1',termsRelation:'EQUIVALENT',evidenceRefs:['q']};
 expect(validateIdentitySuggestion(valid,input()).entityId).toBe('e1');
 for(const bad of [{...valid,entityId:'outside'},{...valid,evidenceRefs:['made-up']},{...valid,approve:true}])expect(()=>validateIdentitySuggestion(bad,input())).toThrow();
});
it('A29 cache identity changes with business revisions, rules and relevant evidence',async()=>{
 const a=input(),b=input();b.entities[0].revision=2;
 expect(await identityCacheKey(a)).not.toBe(await identityCacheKey(b));
 const c=input();c.evidence.quoteById.q='A different statement';
 expect(await identityCacheKey(a)).not.toBe(await identityCacheKey(c));
});
it('A18/A19 assist off, truncated input and incomplete history make no provider call',async()=>{
 vi.stubEnv('IDENTITY_MODEL_ASSIST','false');vi.stubGlobal('fetch',()=>{throw new Error('no network allowed');});
 expect((await reviewIdentity(input())).reasonCodes).toContain('model_assist_disabled');
 vi.stubEnv('IDENTITY_MODEL_ASSIST','true');
 expect((await reviewIdentity({...input(),retrievalComplete:false})).reasonCodes).toContain('retrieval_incomplete');
 expect((await reviewIdentity({...input(),evidence:{...evidence,truncated:true}})).reasonCodes).toContain('source_incomplete');
});
it('A19 a correct deterministic duplicate bypasses the model even with assistance enabled',async()=>{
 vi.stubEnv('IDENTITY_MODEL_ASSIST','true');vi.stubGlobal('fetch',()=>{throw new Error('no network allowed');});
 const data=input();data.candidate.occurrenceAnchor=known('signup');data.entities[0].terms!.occurrenceAnchor=known('signup');data.evidence.fullText='Campaign signup grants 10 USD.';data.evidence.quoteById['quote-1']=data.evidence.fullText;
 expect(await reviewIdentity(data)).toMatchObject({relation:'SAME',termsRelation:'EQUIVALENT'});
});
it('A27 a worker run handles at most four jobs and preserves the remaining queue',async()=>{
 vi.stubEnv('IDENTITY_MODEL_ASSIST','false');
 const jobs=Array.from({length:6},(_,i)=>({id:`job-${i}`,input:input()}));
 const results=await runIdentityReviews(jobs);
 expect(results.results.map(r=>r.id)).toEqual(['job-0','job-1','job-2','job-3']);
 expect(results.deferredIds).toEqual(['job-4','job-5']);
});
it('A27 denied budget and malformed suggestions stay unresolved without a fail-open new decision',async()=>{
 vi.stubEnv('IDENTITY_MODEL_ASSIST','true');vi.stubEnv('GEMINI_API_KEY','mock-key');vi.stubEnv('API_BASE','https://mock.local');
 let providerCalls=0;
 vi.stubGlobal('fetch',async(url:string)=>{if(url.includes('/reserve'))return new Response('denied',{status:429});providerCalls++;throw new Error('provider must not be reached');});
 expect(await reviewIdentity(input())).toMatchObject({relation:'UNRESOLVED',reasonCodes:['model_unavailable_or_invalid']});
 expect(providerCalls).toBe(0);
});
it('A15 unrelated page text and observation IDs do not invalidate the reviewed evidence basis',async()=>{
 const a=input(),b=input();b.evidence.observationId='later-observation';b.evidence.fullText+=' Unrelated navigation and status update.';
 expect(await identityCacheKey(a)).toBe(await identityCacheKey(b));
});
