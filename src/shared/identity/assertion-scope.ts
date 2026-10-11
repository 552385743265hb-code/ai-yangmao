import {stableJson} from './normalize';
import type {CanonicalTermsV1} from './types';
/** Conservative extraction discriminator. Raw hints cannot prove an entity match. */
export function assertionScopeKey(facts:CanonicalTermsV1,input:unknown):string {
 const raw=(input&&typeof input==='object'&&!Array.isArray(input)?input:{}) as Record<string,unknown>;
 const keys=new Set<string>(['poolKey','benefitPool','claimChannel']);
 if(facts.eligibility.state==='unknown'){keys.add('requirements');keys.add('audience');}
 if(facts.claimChannels.state==='unknown')keys.add('claimMethod');
 if(facts.claimWindow.state==='unknown')for(const key of ['claimStart','claimEnd','endKind'])keys.add(key);
 for(const [field,display] of [['amount','valueText'],['models','models'],['modalities','modalities'],['cadence','tags'],['creditValidity','creditValidity']] as const)
  if(!facts.benefitPools.length||facts.benefitPools.some(p=>p[field].state==='unknown'))keys.add(display);
 const clean=(value:unknown):unknown=>Array.isArray(value)?[...new Set(value.map(v=>stableJson(clean(v))))].sort().map(v=>JSON.parse(v)):typeof value==='string'?value.normalize('NFKC').trim():value;
 return stableJson(Object.fromEntries([...keys].sort().filter(key=>raw[key]!==undefined&&raw[key]!==null).map(key=>[key,clean(raw[key])])));
}
