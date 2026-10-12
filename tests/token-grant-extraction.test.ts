import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {computeCollectedValuation} from '../src/shared/valuation-intake';
import {sha256} from '../src/shared/identity/normalize';
const url='https://docs.devin.ai/grant';
beforeEach(()=>{vi.resetModules();vi.stubEnv('GEMINI_API_KEY','fixture-key');vi.stubEnv('OPENROUTER_API_KEY','');vi.stubEnv('GLM_API_KEY','');vi.stubEnv('DEEPSEEK_API_KEY','');vi.stubEnv('LLM_MIN_GAP_MS','0');vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-11T12:00:00Z'));});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();});
it.each([[20_000_000,100],[500_000_000,2500]])('passes the full %i fixed token grant from extraction to the real calculator',async(totalTokens,expected)=>{
 const text=`All new accounts receive a one-time grant of ${totalTokens} tokens for SWE-2. Tokens expire after 7 days. No payment is required.`;
 const factors={kind:'token_grant',scenario:'text',totalTokens:{value:totalTokens,sourceId:'benefit',quote:text},models:[{id:'SWE-2',currency:'USD',inputPrice:{catalogId:'swe-2.inputPrice'},outputPrice:{catalogId:'swe-2.outputPrice'},tokenPriceUnits:{catalogId:'swe-2.tokenPriceUnits'}}],sources:[{id:'benefit',url,checkedAt:new Date().toISOString(),excerpt:text,priceBasis:'Official grant terms'}]};
 const offer={key:'grant',title:'新用户Token赠额',platformId:'devin',type:'new',modalities:['text'],models:['SWE-2'],claimMethod:'signup',requirements:['none'],audience:'new',valueText:`注册赠送${totalTokens}Token`,usdEstimate:999,usdMax:999,endKind:'unknown',creditValidity:'领取后7天有效',sourceTz:'UTC',steps:[],excerpts:{benefit:text},valuationFactors:factors};
 let system='';const fetcher=vi.fn(async(_input,init)=>{system=JSON.parse(String(init?.body)).systemInstruction.parts[0].text;return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({offers:[offer]})}]}}],usageMetadata:{totalTokenCount:100}}));});vi.stubGlobal('fetch',fetcher);
 const {extract}=await import('../pipeline/llm');const result=await extract('Devin',url,text);expect(fetcher).toHaveBeenCalledTimes(1);expect(result.offers[0].usdEstimate).toBeNull();expect(result.offers[0].valuationFactors).toEqual(factors);
 const valuation=await computeCollectedValuation({...result.offers[0],platformId:'devin',sourceText:text,sourceFetch:{originalUrl:url,finalUrl:url,fetchedUrl:url,method:'direct',sourceVerified:true,truncated:false,contentHash:await sha256(text)},evidence:{url,tier:'official',capturedAt:new Date().toISOString(),excerpts:{benefit:text}}});
 expect(valuation.errors).toEqual([]);expect(valuation.valuation).toMatchObject({period:'one_time',usdEstimate:expected});
 expect(system).toContain('一次性固定 Token 赠额必须用');expect(system).toContain('周期刷新、无限量或非固定一次性赠额');expect(system).toContain('不能因平台名自动选择U2 Flash、GLM');
});
it('keeps a platform-only fixed token grant unknown without guessing a model',async()=>{
 const text='All new accounts receive a one-time grant of 20000000 tokens. No model or pricing is specified.';
 const offer={key:'grant',title:'新用户Token赠额',platformId:'vendor',type:'new',modalities:['text'],models:[],claimMethod:'signup',requirements:['none'],audience:'new',valueText:'注册赠送20000000Token',usdEstimate:null,usdMax:null,endKind:'unknown',sourceTz:'UTC',steps:[],excerpts:{benefit:text},valuationFactors:{kind:'unknown',reason:'没有原文明示模型或可匹配价格',sources:[{id:'benefit',url,checkedAt:new Date().toISOString(),excerpt:text,priceBasis:'Official grant terms'}]}};
 const fetcher=vi.fn(async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({offers:[offer]})}]}}],usageMetadata:{totalTokenCount:100}})));vi.stubGlobal('fetch',fetcher);
 const {extract}=await import('../pipeline/llm');const result=await extract('Vendor',url,text);expect(fetcher).toHaveBeenCalledTimes(1);expect(result.offers[0]).toMatchObject({models:[],usdEstimate:null,valuationFactors:{kind:'unknown'}});
 const valuation=await computeCollectedValuation({...result.offers[0],platformId:'vendor',sourceText:text,sourceFetch:{originalUrl:url,finalUrl:url,fetchedUrl:url,method:'direct',sourceVerified:true,truncated:false,contentHash:await sha256(text)},evidence:{url,tier:'official',capturedAt:new Date().toISOString(),excerpts:{benefit:text}}});
 expect(valuation.valuation?.usdEstimate).toBeNull();expect(valuation.valuation?.status).toBe('needs_judgment');
});
