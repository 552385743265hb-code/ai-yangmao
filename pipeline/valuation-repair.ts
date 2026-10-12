import { computeCollectedValuation, type ValuationCollectedSource } from '../src/shared/valuation-intake';
import { sha256 } from '../src/shared/identity/normalize';
import type { Extracted } from './llm';

export interface FactorRepairIssue { index:number;key:string;errors:string[];valuationFactors:unknown }
/** Pure shape/source preflight. Its temporary fetch binding is validation-only and never leaves this function. */
export async function valuationRepairIssues(offers:Extracted[],context:{url:string;text:string;platformIds?:Array<string|null|undefined>;valuationSources:ValuationCollectedSource[]}):Promise<FactorRepairIssue[]> {
  const now=new Date().toISOString(),contentHash=await sha256(context.text);
  const issues:FactorRepairIssue[]=[];
  for(const [index,offer] of offers.entries()){
    const raw=offer.valuationFactors;
    const recipe=Array.isArray(raw)&&raw.length===1?raw[0]:raw;
    if(!recipe||typeof recipe!=='object'||Array.isArray(recipe)||!('kind' in recipe)||recipe.kind==='unknown')continue;
    const platformId=(offer as Extracted&{platformId?:string}).platformId??context.platformIds?.find(id=>!!id)??'';
    const result=await computeCollectedValuation({platformId,type:offer.type,models:offer.models,tags:offer.tags,valuationFactors:raw,valuationSources:context.valuationSources,
      sourceText:context.text,sourceFetch:{originalUrl:context.url,finalUrl:context.url,fetchedUrl:context.url,method:'direct',sourceVerified:true,truncated:false,contentHash},
      evidence:{url:context.url,tier:'official',capturedAt:now,excerpts:offer.excerpts??{}}},now);
    if(result.valuation?.status==='priced'||result.valuation?.status==='provisional')continue;
    // Availability, expired prices, missing FX and unknown policy are genuine gaps, not prompt-format failures.
    const errors=result.errors.filter(error=>!/Unknown trusted catalog|fresh.*missing|Stale|expired|Missing matched FX|缺少有效官方汇率|未匹配受控|没有价格|真实上限|未抽取可计算因子/i.test(error)
      &&/Invalid input|Unrecognized|expected|Source .*quote|Source USD entitlement|actual entitlement requires|numeric value|not bound|unbound_factor_source|reference plan|priced row|currency.*context|denomination.*context/i.test(error));
    if(errors.length)issues.push({index,key:offer.key,errors,valuationFactors:raw});
  }
  return issues;
}

/** Repairs may change factors only; identity, eligibility, public text and original excerpts stay frozen. */
export function applyFactorRepairs(offers:Extracted[],issues:FactorRepairIssue[],value:unknown):Extracted[]{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>key!=='repairs')||!('repairs' in value)||!Array.isArray(value.repairs))throw new Error('factor repair response must contain only repairs');
  const expected=new Map(issues.map(issue=>[issue.key,issue.index])),seen=new Set<string>();
  const next=[...offers];
  for(const repair of value.repairs){
    if(!repair||typeof repair!=='object'||Array.isArray(repair)||Object.keys(repair).some(key=>!['key','valuationFactors'].includes(key))||typeof repair.key!=='string'||!expected.has(repair.key)||seen.has(repair.key)||!('valuationFactors' in repair))throw new Error('factor repair changed unauthorized fields or candidate identity');
    seen.add(repair.key);const index=expected.get(repair.key)!;next[index]={...next[index],valuationFactors:repair.valuationFactors};
  }
  return next;
}
