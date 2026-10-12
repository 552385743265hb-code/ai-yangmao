import {afterEach,beforeEach,expect,it} from 'vitest';
import {auditFixture,auditTerms} from './fixtures/identity/audit';
import {displayOffer} from './fixtures/identity/offer';
import {sha256} from '../src/shared/identity/normalize';
import {computeCollectedValuation,protectedValuationFields} from '../src/shared/valuation-intake';
import {IdentityService} from '../src/worker/identity/service';
import {toOffer} from '../pipeline/offer-draft';
import type {Source} from '../pipeline/collectors';
import type {Extracted} from '../pipeline/llm';
import type {FetchedPage} from '../pipeline/lib';
let f:ReturnType<typeof auditFixture>;
beforeEach(()=>f=auditFixture());afterEach(()=>f.sqlite.close());
const date='2026-10-11T20:00:00Z',url='https://vendor.example/rewards';
const sources=(excerpt:string)=>[{id:'benefit',url,checkedAt:date,excerpt,priceBasis:'本次原文赠金'}];
async function draft(text='Campaign signup-2026 grants 10 USD.') {
 const o=displayOffer();o.evidence.capturedAt=date;o.evidence.excerpts.benefit=text;
 const raw={...o,key:'signup',excerpts:o.evidence.excerpts,usdEstimate:999,usdMax:999,valuationFactors:{kind:'direct_usd',amount:{value:10,sourceId:'benefit',quote:text},sources:sources(text)}} as unknown as Extracted;
 const page={text,originalUrl:url,finalUrl:url,fetchedUrl:url,fetchMethod:'direct',via:'direct',sourceVerified:true,truncated:false} as FetchedPage;
 const offer=toOffer({id:'vendor-source',platformId:'vendor',kind:'web_list',tier:'site'} as Source,raw,url,text,page);
 // Exact source references come from this collector's quote IDs.
 offer.identityFacts=JSON.parse(JSON.stringify(auditTerms('signup-2026')).replaceAll('quote-1','benefit'));
 return offer;
}
it('real toOffer draft strips model USD and Worker calculates a new legacy pending offer',async()=>{
 const input=await draft();expect(input.usdEstimate).toBeNull();
 const result=await f.call('ingest/offers',[input],false,{IDENTITY_MODE:'off'});expect(result.status).toBe(200);
 const row=f.sqlite.prepare('SELECT usd_estimate,valuation,review_state FROM offers').get()!;
 expect(row.usd_estimate).toBe(10);expect(row.review_state).toBe('pending');expect(JSON.parse(String(row.valuation))).toMatchObject({version:'v2',status:'priced',inputs:{calculationEngine:'v2-auto'}});
 expect((await f.call('offers')).body.offers).toHaveLength(0);
});
it('enforce adapter persists source proof and computes the same candidate without leaking the recipe into display or identity',async()=>{
 const result=await f.call('ingest/offers',[await draft()]);if(result.body.results[0].pendingResolution){const resolution=await f.call('ingest/identity-candidates/'+result.body.results[0].pendingResolution.candidateId+'/resolve',result.body.results[0].pendingResolution);result.body.results[0].identityReceipt=resolution.body;}expect(result.body.results[0].error).toBeUndefined();expect(result.body.results[0]).toMatchObject({identityReceipt:{outcome:'created_pending'}});
 const row=f.sqlite.prepare('SELECT usd_estimate,valuation FROM offers').get()!;expect(row.usd_estimate).toBe(10);
 const version=f.sqlite.prepare('SELECT facts_json,display_candidate_json FROM benefit_versions').get()!;expect(String(version.facts_json)).not.toContain('valuationFactors');expect(String(version.display_candidate_json)).not.toContain('valuationFactors');expect(String(version.display_candidate_json)).not.toContain('sourceText');
});
it('preview is authenticated and read only; unsupported/cross-source/fabricated factors fail closed',async()=>{
 const input=await draft();const request={platformId:'vendor',type:'new',sourceUrl:url,sourceText:input.sourceText,sourceFetch:input.sourceFetch,valuationFactors:input.valuationFactors,capturedAt:date,benefitQuote:input.evidence.excerpts.benefit};
 expect((await f.call('ingest/valuation-preview',request,true)).status).toBe(401);
 const ok=await f.call('ingest/valuation-preview',request);expect(ok.body.valuation.usdEstimate).toBe(10);expect(f.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:0});
 const factors=input.valuationFactors as any;
 for(const patch of [{...factors,amount:{...factors.amount,value:999}},{...factors,sources:[{...factors.sources[0],url:'https://different.example/pricing'}]},{kind:'unsupported',sources:factors.sources}]){const result=await f.call('ingest/valuation-preview',{...request,valuationFactors:patch});expect(result.body.valuation).toMatchObject({status:'needs_judgment',usdEstimate:null});}
});
it('unknown and unverified source keep null needs_judgment and model cannot declare valuation resolved',async()=>{
 const input=await draft();for(const patch of [{valuationFactors:undefined},{valuationFactors:{kind:'unknown',resolved:true,sources:sources(input.sourceText!)}},{sourceFetch:{...input.sourceFetch!,sourceVerified:false}}]){const result=await computeCollectedValuation({...input,...patch});expect(result.valuation).toMatchObject({status:'needs_judgment',usdEstimate:null,usdMax:null});}
});
it('default ChatGPT reset uses trusted Plus price and program quarter convention, not a forged source 4',async()=>{
 const text='All eligible ChatGPT accounts receive 1 extra reset.',sourceUrl='https://openai.com/reset';
 const result=await computeCollectedValuation({platformId:'openai',type:'perk',tags:['reset'],sourceText:text,sourceFetch:{originalUrl:sourceUrl,finalUrl:sourceUrl,fetchedUrl:sourceUrl,method:'direct',sourceVerified:true,truncated:false,contentHash:await sha256(text)},evidence:{url:sourceUrl,tier:'official',capturedAt:date,excerpts:{benefit:text}}});
 expect(result.valuation).toMatchObject({usdEstimate:5,status:'provisional',inputs:{ruleIds:['plan_fraction_quarter']}});expect(result.valuation?.sources.some(s=>s.url.includes('valuation-policy'))).toBe(false);
});
it('human values are protected as a group while auto drafts remain recomputable',async()=>{
 const automatic=(await computeCollectedValuation(await draft())).valuation!;
 expect([...protectedValuationFields({valuation:automatic})]).toEqual([]);
 expect([...protectedValuationFields({valuation:automatic},['usdEstimate'])]).toEqual(expect.arrayContaining(['usdEstimate','usdMax','valuation']));
 expect([...protectedValuationFields({valuation:{...automatic,inputs:{}}})]).toEqual(expect.arrayContaining(['usdEstimate','usdMax','valuation']));
});

it('auto-generated pending amount updates with later official factors while admin money edits remain stable',async()=>{
 const input=await draft();await f.call('ingest/offers',[input],false,{IDENTITY_MODE:'off'});
 const next=await draft('Campaign signup-2026 grants 20 USD.');(next.valuationFactors as any).amount.value=20;next.valueText='注册赠送 20 美元 API 额度';
 const updated=await f.call('ingest/offers',[next],false,{IDENTITY_MODE:'off'});expect(updated.body.results[0].error).toBeUndefined();expect(f.sqlite.prepare('SELECT usd_estimate FROM offers').get()).toEqual({usd_estimate:20});
 const edit=await f.call('admin/offers/'+input.id+'/edit',{fields:{usdEstimate:7,usdMax:null,valuation:null},approve:false},true,{IDENTITY_MODE:'off'});expect(edit.status).toBe(200);
 await f.call('ingest/offers',[input],false,{IDENTITY_MODE:'off'});expect(f.sqlite.prepare('SELECT usd_estimate,valuation FROM offers').get()).toEqual({usd_estimate:7,valuation:null});
});

it('dynamic ECB rates are rederived from verified official XML rather than supplied catalogFacts',async()=>{
 const sourceUrl='https://bigmodel.cn/grant',text='Free GLM Coding Lite subscription grant.';
 const fxUrl='https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
 const xml=`<Cube time='2026-10-11'><Cube currency='USD' rate='1.2'/><Cube currency='CNY' rate='9'/><Cube currency='INR' rate='90'/></Cube>`;
 const result=await computeCollectedValuation({platformId:'zhipu',type:'gift',sourceText:text,sourceFetch:{originalUrl:sourceUrl,finalUrl:sourceUrl,fetchedUrl:sourceUrl,method:'direct',sourceVerified:true,truncated:false,contentHash:await sha256(text)},evidence:{url:sourceUrl,tier:'official',capturedAt:date,excerpts:{benefit:text}},valuationSources:[{id:'fx',role:'fx',url:fxUrl,text:xml,checkedAt:date,sourceFetch:{originalUrl:fxUrl,finalUrl:fxUrl,fetchedUrl:fxUrl,method:'direct',sourceVerified:true,truncated:false,contentHash:await sha256(xml)},catalogFacts:{'ecb-2026-10-11.CNY':{value:999}}} as any],valuationFactors:{kind:'plan',price:{catalogId:'glm-coding-lite.amount'},billingPeriod:'month',currency:'CNY',benchmark:'entry_plan',fx:{currency:'CNY',date:'2026-10-11',usdRate:{catalogId:'ecb-2026-10-11.CNY'}},sources:[{id:'benefit',url:sourceUrl,checkedAt:date,excerpt:text,priceBasis:'Free monthly plan'}]}});
 expect(result.valuation?.usdEstimate).toBeCloseTo(118*1.2/9,4);
});

it('catalog model selection is tied to the actual free model and cannot combine other models prices',async()=>{
 const sourceUrl='https://docs.devin.ai/free',text='SWE-2 is available free with unlimited coding requests.';
 const base={platformId:'devin',type:'free',models:['SWE-2'],sourceText:text,sourceFetch:{originalUrl:sourceUrl,finalUrl:sourceUrl,fetchedUrl:sourceUrl,method:'direct' as const,sourceVerified:true,truncated:false,contentHash:await sha256(text)},evidence:{url:sourceUrl,tier:'official',capturedAt:date,excerpts:{benefit:text}}};
 const factors={kind:'scenario',sources:[{id:'benefit',url:sourceUrl,checkedAt:date,excerpt:text,priceBasis:'Unlimited SWE-2 free coding'}],components:[{scenario:'coding',models:[{id:'SWE-2',inputPrice:{catalogId:'swe-2.inputPrice'},outputPrice:{catalogId:'swe-2.outputPrice'},tokenPriceUnits:{catalogId:'swe-2.tokenPriceUnits'}}]}]};
 expect((await computeCollectedValuation({...base,valuationFactors:factors})).valuation?.usdEstimate).toBe(45);
 const forged=JSON.parse(JSON.stringify(factors));forged.components[0].models[0].id='Claude';expect((await computeCollectedValuation({...base,valuationFactors:forged})).valuation?.status).toBe('needs_judgment');
 const otherText='Claude is free for coding.';const incorrect=await computeCollectedValuation({...base,sourceText:otherText,sourceFetch:{...base.sourceFetch,contentHash:await sha256(otherText)},evidence:{...base.evidence,excerpts:{benefit:otherText}},valuationFactors:{...factors,sources:[{...factors.sources[0],excerpt:otherText}]}});expect(incorrect.valuation?.status).toBe('needs_judgment');
});

it('enforce proposal and approval preserve a human amount even when its edited metadata still has the auto engine marker',async()=>{
 const service=new IdentityService(f.db),facts=auditTerms('human-marker'),text='Campaign human-marker grants 10 USD.';
 const observation=await f.observation('auto-original',text),candidate=await f.candidate('auto-original',observation,text,facts),receipt=await service.resolveCandidate(candidate.candidateId,'auto-original');
 const original=JSON.parse(String(f.sqlite.prepare('SELECT valuation FROM offers').get()?.valuation));
 expect(original.inputs.calculationEngine).toBe('v2-auto');
 const reviewed={...original,status:'priced',method:'face_value',period:'one_time',usdEstimate:7,fullValue:7,formula:'Administrator confirmed 7 USD'};
 const edit=await f.call('admin/offers/'+receipt.canonicalOfferId+'/edit',{requestId:'retain-auto-marker-human-price',identityTaskId:receipt.taskId,expectedIdentityRevision:0,fields:{usdEstimate:7,usdMax:null,valuation:reviewed}},true);expect(edit.status).toBe(200);
 expect((await f.call('admin/identity/tasks/'+receipt.taskId+'/resolve',{requestId:'approve-human-price',expectedRevision:edit.body.revision,action:'approve'},true)).status).toBe(200);
 (facts.benefitPools[0].amount as any).value.value='20';const changedText='Campaign human-marker replaces 10 USD with 20 USD.';
 const nextObservation=await f.observation('auto-changed',changedText),nextCandidate=await f.candidate('auto-changed',nextObservation,changedText,facts,{valueText:'注册赠送 20 美元 API 额度',usdEstimate:999});
 const next=await service.resolveCandidate(nextCandidate.candidateId,'auto-changed');expect(next.outcome).toBe('proposed_update');
 const proposal=JSON.parse(String(f.sqlite.prepare('SELECT candidate FROM offer_proposals').get()?.candidate));expect(proposal).toMatchObject({usdEstimate:7,valuation:reviewed});
 expect((await f.call('admin/identity/tasks/'+next.taskId+'/resolve',{requestId:'approve-next-terms',expectedRevision:0,action:'approve'},true)).status).toBe(200);
 expect(f.sqlite.prepare('SELECT usd_estimate FROM offers').get()).toEqual({usd_estimate:7});expect(JSON.parse(String(f.sqlite.prepare('SELECT valuation FROM offers').get()?.valuation))).toEqual(reviewed);
});
