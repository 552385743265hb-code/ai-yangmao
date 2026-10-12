import {Hono} from 'hono';
import {z} from 'zod';
import {membershipSchema,validateMembership,normalizeMembership,formatMembership,migrateLegacyMembership,type MembershipCatalog,type MembershipRequirement,type MembershipProduct,type MembershipPlan} from '../shared/membership';
import type {Env} from './index';
export class MembershipError extends Error {constructor(public status:400|409,message:string){super(message);}}
export async function readMembershipCatalog(db:D1Database):Promise<MembershipCatalog>{
 const row=await db.prepare('SELECT revision,data_json FROM membership_catalog WHERE id=1').first<{revision:number;data_json:string}>();
 if(!row)throw new MembershipError(409,'会员目录尚未初始化');
 const data=JSON.parse(row.data_json);return {revision:row.revision,products:data.products,plans:data.plans};
}
type MemberOffer={requirements:string[];membershipRequirement?:MembershipRequirement|null};
const memberTexts=(requirements:string[])=>requirements.filter(r=>r.startsWith('member:'));
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
/** Only the selector's explicit structured edit changes confirmed qualification. */
export async function prepareMembershipFields(db:D1Database,original:MemberOffer,fields:Record<string,unknown>):Promise<Record<string,unknown>>{
 const explicit=Object.hasOwn(fields,'membershipRequirement');
 const req=Object.hasOwn(fields,'requirements')?z.array(z.string()).parse(fields.requirements):original.requirements;
 if(!explicit){
  if(!Object.hasOwn(fields,'requirements')||same(memberTexts(req),memberTexts(original.requirements)))return fields;
  if(original.membershipRequirement?.status==='confirmed'||original.membershipRequirement?.status==='not_required')throw new MembershipError(400,'请使用会员资格选择器修改产品与套餐，不能用自由文字覆盖已确认资格');
  const catalog=await readMembershipCatalog(db);
  return {...fields,membershipRequirement:migrateLegacyMembership(req,catalog)};
 }
 const parsed=membershipSchema.safeParse(fields.membershipRequirement);
 if(!parsed.success)throw new MembershipError(400,'会员资格结构不正确：'+parsed.error.issues.map(i=>i.message).join('；'));
 const catalog=await readMembershipCatalog(db),r=normalizeMembership(parsed.data);
 if(r.catalogRevision!==catalog.revision)throw new MembershipError(409,'会员目录已更新，请刷新目录后核对并保存');
 const errors=validateMembership(r,catalog);if(errors.length)throw new MembershipError(400,errors.join('；'));
 let requirements=req.filter(v=>!v.startsWith('member:'));
 if(r.status!=='not_required'){
  requirements=requirements.filter(v=>v!=='none');
  if(r.status==='needs_review'&&!r.anyOf.length){
   const legacy=r.legacyText?.length?r.legacyText:memberTexts(original.requirements).map(t=>t.slice(7));
   requirements.push(...(legacy.length?legacy.map(t=>'member:'+t):['member:会员条件未映射']));
  }else requirements.push('member:'+formatMembership(r,catalog));
 }
 return {...fields,membershipRequirement:r,requirements:requirements.length?requirements:['none']};
}
export async function membershipPublicationError(db:D1Database,offer:MemberOffer):Promise<string|null>{
 const r=offer.membershipRequirement;
 if(!r){return memberTexts(offer.requirements).length?'会员资格尚未结构化确认，请选择产品、套餐和限制':null;}
 const parsed=membershipSchema.safeParse(r);if(!parsed.success)return '会员资格结构不正确';
 if(r.status==='needs_review')return '新的会员资格组合尚未确认，请明确产品、套餐和限制';
 if(r.status==='not_required')return memberTexts(offer.requirements).length?'会员资格与门槛文案冲突':null;
 const catalog=await readMembershipCatalog(db);
 const errors=validateMembership(r,catalog);
 if(errors.length)return errors.join('；');
 return same(memberTexts(offer.requirements),['member:'+formatMembership(r,catalog)])?null:'会员资格与门槛文案冲突，请重新保存选择结果';
}
/** Collector input remains a proposal, never a confirmed membership claim. */
export function collectedMembership(requirements:string[],input:MembershipRequirement|null|undefined,catalog:MembershipCatalog):MembershipRequirement|null{
 if(!memberTexts(requirements).length&&!input)return null;
 if(input){const r=membershipSchema.parse(input);if(r.status==='not_required'&&memberTexts(requirements).length)return migrateLegacyMembership(requirements,catalog);return {...r,status:r.status==='not_required'?'not_required':'needs_review',catalogRevision:catalog.revision};}
 return migrateLegacyMembership(requirements,catalog);
}
const url=z.string().max(2000).refine(s=>{try{const u=new URL(s);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password;}catch{return false;}},'需要有效的官方来源链接');
const inputSchema=z.object({kind:z.enum(['product','plan']),name:z.string().trim().min(2).max(120),productId:z.string().optional(),aliases:z.array(z.string().trim().min(1).max(120)).max(30).default([]),billing:z.enum(['free','paid','unknown']).default('unknown'),sourceUrl:url,expectedCatalogRevision:z.number().int().nonnegative()}).strict();
const key=(s:string)=>s.normalize('NFKC').trim().toLocaleLowerCase();
async function saveCatalog(db:D1Database,previous:MembershipCatalog,next:MembershipCatalog){
 const result=await db.prepare("UPDATE membership_catalog SET revision=revision+1,data_json=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=1 AND revision=? RETURNING revision").bind(JSON.stringify({products:next.products,plans:next.plans}),previous.revision).first();
 if(!result)throw new MembershipError(409,'会员目录已被其他审核员修改，请刷新');
}
export async function membershipImpact(db:D1Database,catalog:MembershipCatalog,id:string,kind:string){
 const productId=kind==='product'?id:catalog.plans.find(p=>p.id===id)?.productId;
 if(!productId)throw new MembershipError(400,'目录项不存在');
 const rows=await db.prepare('SELECT id,title,membership_requirement FROM offers WHERE membership_requirement IS NOT NULL').all<{id:string;title:string;membership_requirement:string}>();
 return rows.results.filter(o=>{const parsed=membershipSchema.safeParse(JSON.parse(o.membership_requirement));return parsed.success&&parsed.data.anyOf.some(g=>g.allOf.some(c=>c.productId===productId&&(kind==='product'||c.scope!=='plans'||c.planIds.includes(id)||c.excludePlanIds.includes(id))));}).map(({id,title})=>({id,title}));
}
export const membershipAdminRoutes=new Hono<{Bindings:Env;Variables:{role:'admin'|'reviewer';who:string}}>();
membershipAdminRoutes.onError((e,c)=>e instanceof MembershipError?c.json({error:e.message},e.status):c.json({error:'会员目录操作失败'},500));
membershipAdminRoutes.get('/',async c=>c.json(await readMembershipCatalog(c.env.DB)));
membershipAdminRoutes.post('/',async c=>{
 const parsed=inputSchema.safeParse(await c.req.json().catch(()=>null));if(!parsed.success)return c.json({error:'目录资料不正确',issues:parsed.error.issues},400);
 const b=parsed.data,old=await readMembershipCatalog(c.env.DB);if(old.revision!==b.expectedCatalogRevision)throw new MembershipError(409,'会员目录已更新');
 if(b.kind==='plan'&&!old.products.some(p=>p.id===b.productId))throw new MembershipError(400,'会员产品不存在');
 const entries=b.kind==='product'?old.products:old.plans.filter(p=>p.productId===b.productId);
 const incoming=new Set([b.name,...b.aliases].map(key));if(entries.some(p=>[p.name,...p.aliases].some(n=>incoming.has(key(n)))))throw new MembershipError(409,'这个名称或别名已在同一产品目录中存在');
 const entry:MembershipProduct|MembershipPlan={id:'member-'+crypto.randomUUID(),name:b.name,aliases:b.aliases,status:'pending',sourceUrl:b.sourceUrl,verifiedAt:null,revision:1,...(b.kind==='plan'?{productId:b.productId!,billing:b.billing}:{})};
 const next=structuredClone(old);if(b.kind==='product')next.products.push(entry);else next.plans.push(entry as MembershipPlan);await saveCatalog(c.env.DB,old,next);
 return c.json({entry,catalogRevision:old.revision+1},201);
});
membershipAdminRoutes.get('/:id/impact',async c=>{const kind=c.req.query('kind');if(!['product','plan'].includes(kind??''))return c.json({error:'缺少目录类型'},400);const catalog=await readMembershipCatalog(c.env.DB);return c.json({affectedOffers:await membershipImpact(c.env.DB,catalog,c.req.param('id'),kind!),catalogRevision:catalog.revision});});
membershipAdminRoutes.post('/:id/verify',async c=>{
 if(c.get('role')!=='admin')return c.json({error:'目录核实需要管理员'},403);
 const parsed=z.object({kind:z.enum(['product','plan']),expectedCatalogRevision:z.number().int().nonnegative(),expectedRevision:z.number().int().positive(),acknowledgeAffectedOffers:z.boolean()}).strict().safeParse(await c.req.json().catch(()=>null));if(!parsed.success)return c.json({error:'需要当前目录版本与影响确认'},400);
 const b=parsed.data,catalog=await readMembershipCatalog(c.env.DB);if(catalog.revision!==b.expectedCatalogRevision)throw new MembershipError(409,'会员目录已更新');
 const entry=(b.kind==='product'?catalog.products:catalog.plans).find(x=>x.id===c.req.param('id'));if(!entry)throw new MembershipError(400,'目录项不存在');if(entry.revision!==b.expectedRevision)throw new MembershipError(409,'目录项已更新');
 if(b.kind==='plan'&&!catalog.products.some(p=>p.id===(entry as MembershipPlan).productId&&p.status==='verified'))throw new MembershipError(400,'先核实所属产品');
 const affected=await membershipImpact(c.env.DB,catalog,entry.id,b.kind);if(affected.length&&!b.acknowledgeAffectedOffers)throw new MembershipError(409,'请先核对受影响的会员资格');
 const next=structuredClone(catalog),target=(b.kind==='product'?next.products:next.plans).find(x=>x.id===entry.id)!;target.status='verified';target.revision++;target.verifiedAt=new Date().toISOString();
 await saveCatalog(c.env.DB,catalog,next);return c.json({entry:target,catalogRevision:catalog.revision+1,affectedOffers:affected});
});
