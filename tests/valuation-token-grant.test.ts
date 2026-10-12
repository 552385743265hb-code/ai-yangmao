import {expect,it} from 'vitest';
import {calculateValuationV2,deriveEcbValuationFx} from '../src/shared/valuation-engine';
import {computeCollectedValuation} from '../src/shared/valuation-intake';
import {sha256} from '../src/shared/identity/normalize';
const now='2026-10-11T12:00:00Z',url='https://vendor.example/grant';
function fixture(total=20000000,scenario:'text'|'coding'='text',currency='USD'){
 const grant=`Receive ${total} tokens as a one-time free grant for ActualModel.`,price=`ActualModel: input ${currency} 2 and output ${currency} 4 per 1000000 tokens.`,text=grant+' '+price;
 const fact=(value:number,quote:string)=>({value,sourceId:'benefit',quote});
 const factors={kind:'token_grant',scenario,totalTokens:fact(total,grant),models:[{id:'ActualModel',currency,inputPrice:fact(2,price),outputPrice:fact(4,price),tokenPriceUnits:fact(1000000,price)}],sources:[{id:'benefit',url,checkedAt:now,excerpt:text,priceBasis:'Synthetic official grant and matched model prices'}]};
 return {factors,context:{now,sourceTexts:{benefit:text}},text,grant};
}
it.each(['text','coding'] as const)('prices the entire 20M token grant with the %s ratio',scenario=>{
 const {factors,context}=fixture(20000000,scenario);const result=calculateValuationV2(factors,context);
 expect(result.errors).toEqual([]);expect(result.valuation).toMatchObject({period:'one_time',method:'scenario',usdEstimate:scenario==='text'?46.666667:43.636364,fullValue:scenario==='text'?46.666667:43.636364});
 const short=calculateValuationV2({...factors,coverageDays:{value:7,sourceId:'benefit',quote:'7 day validity.'},sources:[{...factors.sources[0],excerpt:fixture().text+' 7 day validity.'}]},{...context,sourceTexts:{benefit:fixture().text+' 7 day validity.'}});
 expect(short.valuation?.usdEstimate).toBe(result.valuation?.usdEstimate);
});
it('prices all 500M tokens with verified ECB FX and original CNY units',()=>{
 const {factors,context}=fixture(500000000,'text','CNY');const xml='<Cube time="2026-10-10"><Cube currency="USD" rate="1.1"/><Cube currency="CNY" rate="7.4"/><Cube currency="INR" rate="100"/></Cube>';
 const fx=deriveEcbValuationFx(xml,now,now)!;expect(fx).toBeTruthy();
 const id=Object.keys(fx.catalog).find(k=>fx.catalog[k].currency==='CNY')!;
 const result=calculateValuationV2({...factors,fx:{currency:'CNY',date:'2026-10-10',usdRate:{catalogId:id}}},{...context,catalog:fx.catalog});
 expect(result.errors).toEqual([]);expect(result.valuation?.usdEstimate).toBeCloseTo((500000000/6*5*2+500000000/6*4)/1000000*1.1/7.4,5);
});
it('rejects spoof quantities, non-token grants, recurring grants and invented eligible models',()=>{
 const {factors,context}=fixture();
 for(const patch of [{totalTokens:{...factors.totalTokens,value:500000000}},{models:[{...factors.models[0],id:'DifferentModel'}]},{totalTokens:{...factors.totalTokens,quote:'Free 20000000 credits.'}},{totalTokens:{...factors.totalTokens,quote:'Receive 20000000 tokens every month.'}}]){
 const text=context.sourceTexts.benefit+' '+(('totalTokens'in patch?patch.totalTokens?.quote:undefined)??'');
 expect(calculateValuationV2({...factors,...patch,sources:[{...factors.sources[0],excerpt:text}]},{...context,sourceTexts:{benefit:text}}).valuation).toBeNull();
 }
 for(const model of [{...factors.models[0],currency:'CNY'},{...factors.models[0],tokenPriceUnits:{...factors.models[0].tokenPriceUnits,value:1000}}])expect(calculateValuationV2({...factors,models:[model]},context).valuation).toBeNull();
});
it('intake requires actual activity model and quantity evidence and never invents a proxy',async()=>{
 const {factors,text}=fixture();const input={platformId:'vendor',type:'new',models:['ActualModel'],sourceText:text,sourceFetch:{originalUrl:url,finalUrl:url,fetchedUrl:url,method:'direct' as const,sourceVerified:true,truncated:false,contentHash:await sha256(text)},evidence:{url,tier:'site',capturedAt:now,excerpts:{benefit:text}},valuationFactors:factors};
 expect((await computeCollectedValuation(input,now)).valuation?.usdEstimate).toBe(46.666667);
 const unknown=await computeCollectedValuation({...input,valuationFactors:{...factors,models:[{...factors.models[0],id:'ArbitraryFallback'}]}},now);
 expect(unknown.valuation).toMatchObject({status:'needs_judgment',usdEstimate:null});
});
it('counts a shared grant once and selects the lower median actual-model purchase cost',()=>{
 const {factors,context}=fixture();const quote=factors.totalTokens.quote.replace('ActualModel.','ActualModel and OtherModel.');
 const price='OtherModel: input USD 6 and output USD 12 per 1000000 tokens.';const text=quote+' '+context.sourceTexts.benefit+' '+price;
 const fact=(value:number)=>({value,sourceId:'benefit',quote:price});
 const result=calculateValuationV2({...factors,totalTokens:{...factors.totalTokens,quote},models:[...factors.models,{id:'OtherModel',inputPrice:fact(6),outputPrice:fact(12),tokenPriceUnits:fact(1000000)}],sources:[{...factors.sources[0],excerpt:text}]},{...context,sourceTexts:{benefit:text}});
 expect(result.errors).toEqual([]);expect(result.valuation?.usdEstimate).toBe(46.666667);expect(result.valuation?.coverage).toMatchObject({pricedModels:2,totalModels:2});
 expect((result.valuation?.inputs.components as any[])[0].alternatives).toHaveLength(2);
});
