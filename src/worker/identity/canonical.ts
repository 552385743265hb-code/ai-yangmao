import {sql} from 'drizzle-orm';
import {IdentityError} from './store';
// Always applied, including IDENTITY_MODE=off. Unmapped legacy rows stay visible.
export const canonicalOfferPredicate=`NOT EXISTS(SELECT 1 FROM benefit_entities e WHERE e.canonical_offer_id=offers.id AND e.state<>'active') AND NOT EXISTS(SELECT 1 FROM identity_aliases a JOIN benefit_entities e ON e.id=a.entity_id WHERE a.namespace='legacy_offer_id' AND a.status='active' AND a.alias_key=offers.id AND (e.canonical_offer_id<>offers.id OR e.canonical_offer_id IS NULL))`;
export const canonicalOffers=sql.raw(canonicalOfferPredicate);
export async function resolveCanonicalOffer(db:D1Database,offerId:string):Promise<{offerId:string;entityId:string|null;generation:number}> {
 const first=await db.prepare("SELECT e.* FROM benefit_entities e WHERE e.canonical_offer_id=?1 OR e.id=(SELECT entity_id FROM identity_aliases WHERE namespace='legacy_offer_id' AND status='active' AND alias_key=?1) LIMIT 2").bind(offerId).all<{id:string;platform_id:string;canonical_offer_id:string|null;state:string;merged_into:string|null;routing_generation:number}>();
 if(first.results.length>1)throw new IdentityError(404,'ambiguous canonical route');
 if(!first.results.length)return {offerId,entityId:null,generation:0};
 let row=first.results[0];const product=row.platform_id,seen=new Set<string>();
 for(let depth=0;depth<10;depth++){
  if(seen.has(row.id)||row.platform_id!==product)break;seen.add(row.id);
  if(row.state==='active'&&row.canonical_offer_id){const target=await db.prepare('SELECT platform_id FROM offers WHERE id=?').bind(row.canonical_offer_id).first<{platform_id:string}>();if(target?.platform_id===product)return {offerId:row.canonical_offer_id,entityId:row.id,generation:row.routing_generation};break;}
  if(!row.merged_into)break;
  const next=await db.prepare('SELECT * FROM benefit_entities WHERE id=?').bind(row.merged_into).first<typeof row>();if(!next)break;row=next;
 }
 throw new IdentityError(404,'canonical route unavailable');
}
export async function canonicalOfferMap(db:D1Database,ids:string[]){
 const unique=[...new Set(ids)];if(unique.length>2000)throw new IdentityError(400,'too many offer references');const map=new Map<string,{offerId:string;generation:number}>();if(!unique.length)return map;
 const rows=await db.prepare("SELECT o.id origin_id,e.state,e.id entity_id,r.id root_id,coalesce(r.canonical_offer_id,e.canonical_offer_id,o.id) offer_id,coalesce(r.routing_generation,e.routing_generation,0) generation FROM offers o LEFT JOIN benefit_entities e ON e.canonical_offer_id=o.id LEFT JOIN benefit_entities r ON r.id=e.merged_into AND r.state='active' AND r.platform_id=e.platform_id WHERE o.id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(unique)).all<{origin_id:string;state:string|null;entity_id:string|null;root_id:string|null;offer_id:string;generation:number}>();
 for(const row of rows.results){if(row.state==='merged'&&!row.root_id)throw new IdentityError(409,'invalid lead canonical route');map.set(row.origin_id,{offerId:row.offer_id,generation:row.generation});}return map;
}
