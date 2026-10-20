import {membershipSchema,type MembershipCatalog} from './membership';
type Fields=Record<string,unknown>;
const normal=(v:string)=>v.normalize('NFKC').toLowerCase().replace(/[\s（）()]/g,'');
const mentions=(p:{name:string;aliases:string[]},text:string)=>[p.name,...p.aliases].some(n=>normal(n).length>=3&&normal(text).includes(normal(n)));
/** Only verified choices reach the model. Pending or retired entries are data gaps, not selectable IDs. */
export function fastTrackCatalogChoices(c:MembershipCatalog):MembershipCatalog{
 const products=c.products.filter(p=>p.status==='verified');
 return {...c,products,plans:c.plans.filter(p=>p.status==='verified'&&products.some(x=>x.id===p.productId))};
}
/** Prompt-only projection: grouping removes repeated ownership and audit fields, never identities. */
export function fastTrackCatalogPrompt(c:MembershipCatalog){
 const choices=fastTrackCatalogChoices(c);
 return {revision:choices.revision,products:choices.products.map(p=>({
  id:p.id,name:p.name,
  ...(p.aliases?.length?{aliases:p.aliases}:{}),
  ...(p.platformIds?.length?{platformIds:p.platformIds}:{}),
  ...(p.legacy===true?{legacy:true}:{}),
  plans:choices.plans.filter(plan=>plan.productId===p.id).map(plan=>({
   id:plan.id,name:plan.name,...(plan.aliases?.length?{aliases:plan.aliases}:{}),billing:plan.billing,...(plan.legacy===true?{legacy:true}:{}),
  })),
 }))};
}
export interface CatalogBlock {catalogRevision:number;reason:string;entries:{id:string;name:string;kind:'product'|'plan';status:string;sourceUrl:string}[]}
/** A changed directory can resolve the pause; another model call cannot verify pending directory facts. */
export function fastTrackCatalogBlock(fields:Fields,c:MembershipCatalog,benefit:string):CatalogBlock|null{
 const memberTexts=Array.isArray(fields.requirements)?fields.requirements.filter((r):r is string=>typeof r==='string'&&r.startsWith('member:')):[];
 const parsed=membershipSchema.safeParse(fields.membershipRequirement);
 if(!memberTexts.length&&(!parsed.success||parsed.data.status==='not_required'))return null;
 const text=benefit+' '+memberTexts.join(' '),choices=fastTrackCatalogChoices(c);
 const alternatives=choices.products.filter(p=>mentions(p,text)&&choices.plans.some(t=>t.productId===p.id));
 const entries:CatalogBlock['entries']=[];
 if(parsed.success)for(const {allOf} of parsed.data.anyOf)for(const clause of allOf){
  const p=c.products.find(p=>p.id===clause.productId);
  if(p&&p.status!=='verified'&&!alternatives.length)entries.push({...p,kind:'product'});
  for(const id of [...clause.planIds,...clause.excludePlanIds]){
   const t=c.plans.find(p=>p.id===id);
   if(t&&t.status!=='verified')entries.push({...t,kind:'plan'});
  }
 }
 if(!parsed.success&&!alternatives.length)for(const p of c.products)if(p.status!=='verified'&&mentions(p,text))entries.push({...p,kind:'product'});
 if(!entries.length)return null;
 const unique=[...new Map(entries.map(e=>[e.id,e])).values()].map(({id,name,kind,status,sourceUrl})=>({id,name,kind,status,sourceUrl}));
 return {catalogRevision:c.revision,reason:'会员目录待核实：'+unique.map(e=>`${e.name}（${e.status==='retired'?'已停用':'资料待核实'}）`).join('、'),entries:unique};
}
