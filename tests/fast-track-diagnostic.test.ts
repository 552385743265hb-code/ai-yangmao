import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {makeSemanticReview} from '../src/shared/fast-track-semantics';
const mocks=vi.hoisted(()=>({api:vi.fn(),rebuild:vi.fn(),review:vi.fn(),write:vi.fn()}));
vi.mock('node:fs',async importOriginal=>({...await importOriginal<typeof import('node:fs')>(),writeFileSync:mocks.write}));
vi.mock('../pipeline/lib',()=>({api:mocks.api}));
vi.mock('../pipeline/fast-track',()=>({rebuildFastTrackFields:mocks.rebuild,reviewFastTrackFields:mocks.review}));
vi.mock('../pipeline/llm',()=>({modelAvailable:()=>true,paidAvailable:()=>true}));
import {verifyFastTrack,compareDiagnosticMembership} from '../scripts/verify-fast-track';
const entry=(id:string)=>({id,name:id,aliases:[],status:'verified' as const,sourceUrl:'https://official.example',verifiedAt:null,revision:1});
const catalog={revision:9,products:[entry('p')],plans:[{...entry('pro'),productId:'p',billing:'paid' as const},{...entry('free'),productId:'p',billing:'free' as const}]};
const membership={schemaVersion:'membership-v1',status:'confirmed',catalogRevision:9,anyOf:[{allOf:[{productId:'p',scope:'plans',planIds:['pro'],excludePlanIds:[]}]}],evidenceUrls:['https://official.example']};
const fields={title:'公开预览',type:'free',modalities:['text'],claimMethod:'signup',requirements:['net'],audience:'all',valueText:'免费试用',claimStart:null,claimEnd:null,endKind:'unknown',creditValidity:null,sourceTz:'UTC',steps:['打开官网'],excerpts:{benefit:'Public research preview. Try it free.'}};
const job={id:'real-job',platformId:'vendor',platformName:'Vendor',url:'https://official.example',benefit:'Public research preview. Try it free.',note:'Original note',ownerFields:{title:'OWNER_ANSWER'}};
const source='Public research preview. Try it free.';
const review=()=>makeSemanticReview(fields,{type:{value:'free',quote:source},modalities:[{value:'text',quote:source}],audience:{value:'all',quote:''}},{...job,sourceText:source},'real-model').review;
const report=()=>JSON.parse(mocks.write.mock.calls.at(-1)![1]);
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('API_BASE','https://mock.local');vi.stubEnv('FAST_TRACK_REBUILD_FIELDS','0');vi.stubEnv('MONTHLY_COST_CAP_CNY','72');mocks.api.mockImplementation(async path=>path==='/budget'?{costMonthCny:1}:{job,fields,sourceText:source,offerId:'offer-1',membershipCatalog:catalog});vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({offer:fields}),{status:200})));mocks.rebuild.mockImplementation(async(_job,options)=>{options.account(50,0.01);return {fields,sourceText:source,semanticReview:review(),model:'real-model'};});mocks.review.mockResolvedValue({fields,review:review()});});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('rebuilds with only original job data, reads baseline after the model, and emits full validation evidence',async()=>{
 let finished=false;
 mocks.api.mockImplementation(async path=>path==='/budget'?{costMonthCny:1}:{job:{...job,get ownerFields(){throw Error('owner answer read');}},get fields(){if(!finished)throw Error('saved answer read before model');return {...fields,title:'SAVED_ANSWER'};},sourceText:'SAVED_SOURCE',offerId:'offer-1',membershipCatalog:catalog});
 mocks.rebuild.mockImplementation(async(input,options)=>{expect(Object.keys(input).sort()).toEqual(['id','platformId','platformName','url','benefit','note','membershipCatalog'].sort());expect(JSON.stringify(input)).not.toMatch(/OWNER_ANSWER|SAVED_ANSWER|SAVED_SOURCE/);options.account(50,0.01);finished=true;return {fields,sourceText:source,semanticReview:review(),model:'real-model'};});
 vi.stubGlobal('fetch',vi.fn(async()=>{expect(finished).toBe(true);return new Response(JSON.stringify({offer:fields}),{status:200});}));
 await verifyFastTrack('real-job',true);
 expect(mocks.api.mock.calls).toEqual([['/fast-track/real-job/review-input'],['/budget']]);
 expect(vi.mocked(fetch).mock.calls.map(c=>String(c[0]))).toEqual(['https://mock.local/api/offers/offer-1']);
 expect(mocks.review).not.toHaveBeenCalled();
 expect(report()).toMatchObject({mode:'rebuild',businessWrites:0,fields,membershipRequirement:null,validationIssues:[],catalogRevision:9,model:'real-model',tokens:50,costCny:0.01,passed:true});
});
it('gates rebuild paid fallback on the shared monthly cost and this run spend',async()=>{
 mocks.api.mockImplementation(async path=>path==='/budget'?{costMonthCny:71.9}:{job,fields,sourceText:source,offerId:null,membershipCatalog:catalog});
 mocks.rebuild.mockImplementation(async(_job,options)=>{expect(options.allowPaid()).toBe(true);options.account(100,0.06);expect(options.allowPaid()).toBe(false);return {fields,sourceText:source,semanticReview:review(),model:'real-model'};});
 await verifyFastTrack('real-job',true);
 expect(report().budget).toEqual({monthlyCapCny:72,costMonthCny:71.9});
 expect(report().rebuildInputs).toEqual({ownerFields:{},previousFieldsSupplied:false,savedFieldsSupplied:false,approvedFieldsSupplied:false});
});
it('keeps the default saved-review mode and refuses a rebuild without a job before any read',async()=>{
 await verifyFastTrack('real-job');expect(mocks.rebuild).not.toHaveBeenCalled();expect(mocks.review).toHaveBeenCalledOnce();expect(report().mode).toBe('saved-review');
 mocks.api.mockClear();await expect(verifyFastTrack('',true)).rejects.toThrow('FAST_TRACK_REVIEW_JOB');expect(mocks.api).not.toHaveBeenCalled();
});
it('persists invalid rebuilt fields and validation failures without any business mutation',async()=>{
 mocks.rebuild.mockResolvedValue({fields:{...fields,sourceTz:'Mars/Unknown'},sourceText:source,semanticReview:review(),model:'real-model'});
 await expect(verifyFastTrack('real-job',true)).rejects.toThrow();
 expect(report().passed).toBe(false);expect(report().validationIssues.length).toBeGreaterThan(0);expect(report().fields.sourceTz).toBe('Mars/Unknown');expect(report().businessWrites).toBe(0);
});
it('compares broad and concrete membership by current verified IDs and retains raw unknown differences',()=>{
 const broad={...membership,anyOf:[{allOf:[{productId:'p',scope:'any_paid',planIds:[],excludePlanIds:[]}]}]};
 expect(compareDiagnosticMembership(membership,broad,catalog).equivalent).toBe(true);
 const unknown={...membership,anyOf:[{allOf:[{productId:'missing',scope:'any_paid',planIds:[],excludePlanIds:[]}]}]};
 expect(compareDiagnosticMembership(membership,unknown,catalog)).toMatchObject({equivalent:null,actual:membership,baseline:unknown});
});
it('requires the job flag in the workflow and leaves rebuild disabled by default',()=>{
 const workflow=readFileSync('.github/workflows/collect.yml','utf8');
 expect(workflow).toMatch(/fast_track_rebuild:[\s\S]*?type: boolean\s+default: false/);
 expect(workflow).toContain('FAST_TRACK_REBUILD_FIELDS:');expect(workflow).toContain('fast_track_rebuild requires fast_track_review_job');
});
