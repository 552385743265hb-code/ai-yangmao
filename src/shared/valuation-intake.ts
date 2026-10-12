import { calculateValuationV2, deriveEcbValuationFx } from './valuation-engine';
import { getValuationFactCatalog, VALUATION_PRICE_CATALOG } from './valuation-catalog';
import type { Valuation } from './valuation';
import { sourceFetchSchema, type SourceFetch } from './identity/fetch-evidence';
import {z} from 'zod';
import { sha256 } from './identity/normalize';

export const valuationSourceSchema=z.object({id:z.string().min(1).max(200),url:z.url(),text:z.string().min(1).max(250000),sourceFetch:sourceFetchSchema,checkedAt:z.string(),role:z.enum(['price','fx'])});
export type ValuationCollectedSource=z.infer<typeof valuationSourceSchema>;
export interface ValuationIntakeInput {
  platformId:string; type:string; models?:string[]; tags?:string[]; valuationFactors?:unknown;
  valuationSources?:ValuationCollectedSource[];
  sourceText?:string; sourceFetch?:SourceFetch;
  evidence:{url:string;tier:string;capturedAt:string;excerpts:{benefit?:string}};
}
export function automaticValuation(value:unknown):boolean {
  return !!value&&typeof value==='object'&&!Array.isArray(value)
    && (value as Valuation).version==='v2'&&(value as Valuation).inputs?.calculationEngine==='v2-auto';
}
export function protectedValuationFields(previous:{valuation?:unknown;usdEstimate?:number|null;usdMax?:number|null},manualFields:Iterable<string>=[]):Set<string> {
  const fields=new Set(manualFields);
  if(previous.valuation&&!automaticValuation(previous.valuation)||!previous.valuation&&(previous.usdEstimate!=null||previous.usdMax!=null)||fields.has('valuation')||fields.has('usdEstimate')||fields.has('usdMax')) {
    fields.add('valuation');fields.add('usdEstimate');fields.add('usdMax');
  }
  return fields;
}
/** Authenticate source bindings and independently compute every collector result. No business writes. */
export async function computeCollectedValuation(input:ValuationIntakeInput,now=new Date().toISOString()):Promise<{valuation:Valuation|null;errors:string[]}> {
  const cited=input.evidence.excerpts.benefit?.trim();
  const quote=cited&&(!input.sourceText||input.sourceText.includes(cited))?cited:input.sourceText?.slice(0,500)||'No source text available.';
  const sources=[{id:'benefit',url:input.evidence.url,checkedAt:input.evidence.capturedAt||now,excerpt:quote,priceBasis:'本次采集的权益原文'}];
  const unknown=(reason:string,errors:string[]=[])=>{
    const result=calculateValuationV2({kind:'unknown',reason:'金额未知，不按零计算。',sources}, {now,sourceTexts:{benefit:input.sourceText??quote}});
    return {...result,valuation:result.valuation?{...result.valuation,period:input.type==='apply'?'apply_max':result.valuation.period}:null,errors:[reason,...errors,...result.errors]};
  };
  if(!input.sourceText||!input.sourceFetch?.sourceVerified||input.sourceFetch.truncated||input.evidence.tier==='media'||input.evidence.tier==='tested')return unknown('完整官方正文及可靠抓取证明尚未齐备');
  if(input.sourceFetch.finalUrl!==input.evidence.url||await sha256(input.sourceText)!==input.sourceFetch.contentHash)return unknown('抓取正文与所引来源未绑定',['source_binding_mismatch']);
  if(!input.valuationFactors&&!(input.platformId==='openai'&&input.tags?.includes('reset')))return unknown('未抽取可计算因子，等待补证');
  let selectedFactors:unknown=input.valuationFactors;
  // Authorized V2 reset convention is selected by code, never fabricated as a source number.
  if(input.platformId==='openai'&&input.tags?.includes('reset')&&/重置|reset/i.test(quote)){
    const supplied=input.valuationFactors as Record<string,unknown>|undefined;
    selectedFactors={kind:'plan',price:supplied?.kind==='plan'&&supplied.price&&typeof supplied.price==='object'&&'value' in supplied.price?supplied.price:{catalogId:'chatgpt-plus.amount'},billingPeriod:'month',benchmark:'plan_fraction',referencePlan:'ChatGPT Plus',denominator:{ruleId:'plan_fraction_quarter'},sources:supplied?.kind==='plan'&&Array.isArray(supplied.sources)?supplied.sources:sources,...(supplied?.kind==='plan'&&supplied.multiplier?{multiplier:supplied.multiplier}:{})};
  }
  const factors=selectedFactors as {sources?:Array<{id:string;url:string;excerpt:string}>;kind?:string};
  const sourceTexts:Record<string,string>={};
  const runtimeCatalog:ReturnType<typeof getValuationFactCatalog>={};
  const allowedUrls=VALUATION_PRICE_CATALOG.filter(p=>p.platformId===input.platformId||p.kind==='token_model'&&(input.models??[]).some(m=>m.toLowerCase()===p.model.toLowerCase())).flatMap(p=>p.sources.map(s=>s.url));
  const validSources:ValuationCollectedSource[]=[];
  for(const source of input.valuationSources??[]){
    if(source.sourceFetch.finalUrl!==source.url||!source.sourceFetch.sourceVerified||source.sourceFetch.truncated||await sha256(source.text)!==source.sourceFetch.contentHash)continue;
    if(source.role==='price'&&!allowedUrls.includes(source.url))continue;
    if(source.role==='fx'){
      if(source.url!=='https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml')continue;
      const date=/\btime=['"](\d{4}-\d{2}-\d{2})['"]/.exec(source.text)?.[1];
      if(!date||date>now.slice(0,10)||Date.parse(now)-Date.parse(date)>7*86400000)continue;
      const parsed=deriveEcbValuationFx(source.text,source.checkedAt,now);
      if(!parsed)continue;Object.assign(runtimeCatalog,parsed.catalog);
    }
    validSources.push(source);
  }
  if(!Array.isArray(factors.sources)||!factors.sources.length||factors.sources.some(s=>!s||!(s.url===input.evidence.url&&input.sourceText!.includes(s.excerpt)||validSources.some(v=>v.url===s.url&&v.text.includes(s.excerpt)))))return unknown('因子引用未绑定本次正文',['unbound_factor_source']);
  const actualFact=(value:unknown)=>!value||typeof value==='object'&&'value' in value&&'sourceId' in value&&factors.sources!.some(s=>s.id===(value as {sourceId:string}).sourceId&&s.url===input.evidence.url);
  const recipe=factors as unknown as Record<string,unknown>;
  for(const key of ['amount','maximum','fullAmount','first30Maximum','entitlementUnits','months','multiplier','coverageDays'])if(!actualFact(recipe[key]))return unknown('实际赠额与权益数量必须来自本次活动原文',['entitlement_source_mismatch']);
  if(recipe.denominator&&!(input.platformId==='openai'&&input.tags?.includes('reset')))return unknown('当前权益未匹配受控套餐分数约定',['unsupported_fraction_policy']);
  if((input.type==='apply')!==(factors.kind==='apply')&&factors.kind!=='unknown')return unknown('申请制与计算周期不一致',['valuation_type_mismatch']);
  const available={...getValuationFactCatalog(now),...runtimeCatalog};
  const permitted=VALUATION_PRICE_CATALOG.filter(p=>p.kind!=='token_model'?p.platformId===input.platformId:p.platformId===input.platformId||input.sourceText!.toLowerCase().includes(p.model.toLowerCase())&&(input.models??[]).some(m=>m.toLowerCase()===p.model.toLowerCase()));
  const catalog=Object.fromEntries(Object.entries(available).filter(([id])=>id.startsWith('ecb-')||permitted.some(p=>id.startsWith(p.id+'.'))));
  const scenario=(factors.kind==='scenario'?factors:(factors as {scenario?:unknown}).scenario) as {benchmark?:string;components?:Array<{models?:Array<Record<string,unknown>>}>}|undefined;
  if(scenario?.components)for(const component of scenario.components){
    for(const cap of Object.values((component as {caps?:Record<string,unknown>}).caps??{}))if(!actualFact(cap))return unknown('实际免费用量上限必须来自本次活动原文',['entitlement_source_mismatch']);
    for(const model of component.models??[]){
    const names=Object.values(model).flatMap(v=>v&&typeof v==='object'&&'catalogId' in v?[String(v.catalogId)]:[]);
    const used=VALUATION_PRICE_CATALOG.filter(p=>p.kind==='token_model'&&names.some(id=>id.startsWith(p.id+'.')));
    if(used.length>1)return unknown('不同模型价格不能混算',['model_catalog_mismatch']);
    const chosen=used[0];
    if(chosen?.kind==='token_model'){
      const normalize=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
      if(![chosen.id,chosen.model].some(name=>normalize(name)===normalize(String(model.id??''))))return unknown('计算型号与可信目录型号不一致',['model_catalog_mismatch']);
      const proxy=scenario.benchmark==='substitute_model'&&chosen.genericProxyEligible&&chosen.platformId===input.platformId;
      if(!proxy&&!input.sourceText!.toLowerCase().includes(chosen.model.toLowerCase()))return unknown('权益原文未确认此模型免费',['model_entitlement_unproven']);
      if(chosen.tokenPriceUnits!==1_000_000&&('inputPerMillion' in model||'outputPerMillion' in model))return unknown('模型价格的原始计费单位不同',['model_unit_mismatch']);
    }else if(!input.sourceText!.toLowerCase().includes(String(model.id??'').toLowerCase()))return unknown('权益原文未确认此模型免费',['model_entitlement_unproven']);
  }
  }
  const medicalRule=input.platformId==='baichuan'&&/海纳百川/i.test(input.sourceText!)&&/Baichuan[- ]M3[- ]Plus/i.test(input.sourceText!)&&/医疗机构|medical institution/i.test(input.sourceText!)&&/免费|free/i.test(input.sourceText!);
  const context={catalog,platformId:input.platformId,allowedRuleIds:medicalRule?['baichuan_medical_usage_30']:[]};
  for(const source of factors.sources){sourceTexts[source.id]=source.url===input.evidence.url?input.sourceText:validSources.find(v=>v.url===source.url)!.text;}
  if(factors.kind==='unknown')return unknown((factors as {reason?:string}).reason??'当前事实不足以自动定价');
  const result=calculateValuationV2(selectedFactors,{...context,sourceTexts,now});
  if(!result.valuation)return unknown('计算因子未通过验证',result.errors);
  return {valuation:{...result.valuation,inputs:{...result.valuation.inputs,calculationEngine:'v2-auto'}},errors:result.errors};
}
/** Transport details never become public offer fields or canonical identity facts. */
export function stripValuationTransport<T extends Record<string,unknown>>(input:T) {
  const {valuationFactors:_recipe,valuationSources:_prices,sourceText:_text,sourceFetch:_fetch,...display}=input;
  return display;
}
