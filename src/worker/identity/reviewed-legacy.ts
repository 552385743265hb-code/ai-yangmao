import {offerIn,type OfferIn} from '../../shared/ingest';
import {stableJson,normalizeDocumentUrl} from '../../shared/identity/normalize';
import {factSlots} from '../../shared/identity/compare';
import {canonicalTermsSchema,type CanonicalTermsV1} from '../../shared/identity/types';
export function hasKnownTerms(facts:CanonicalTermsV1){return facts.benefitPools.length>0||[...factSlots(facts).values()].some(f=>f.state!=='unknown');}
/** Exact reviewed assertion only. This is not a semantic entity classifier. */
function fingerprint(value:OfferIn){
 const fields=['platformId','type','claimMethod','audience','requirements','valueText','models','modalities','tags','claimStart','claimEnd','endKind','creditValidity'] as const;
 const normalize=(v:unknown):unknown=>Array.isArray(v)?v.map(normalize).sort((a,b)=>stableJson(a).localeCompare(stableJson(b))):typeof v==='string'?v.normalize('NFKC').replace(/\s+/g,' ').trim():v??null;
 return stableJson({fields:Object.fromEntries(fields.map(k=>[k,normalize(value[k])])),url:normalizeDocumentUrl(value.evidence.url),excerpts:Object.fromEntries(Object.entries(value.evidence.excerpts).map(([k,v])=>[k,normalize(v)]))});
}
export interface ReviewedLegacyMatch {entityId:string;versionId:string;decisionId:string;offerId:string;action:'approve'|'reject';revision:number;updatedAt:string;display:string;relatedRevisions:{id:string;revision:number}[]}
/** Old rows without canonical facts can remember the same reviewed assertion.
 * New canonical scope, changed raw conditions or ambiguous matches never use this path. */
export async function findReviewedLegacy(db:D1Database,raw:string,facts:CanonicalTermsV1):Promise<ReviewedLegacyMatch|null>{
 if(hasKnownTerms(facts))return null;
 const parsed=offerIn.safeParse(JSON.parse(raw).candidate);if(!parsed.success||!Object.values(parsed.data.evidence.excerpts).some(q=>q?.trim()))return null;
 const offer=parsed.data,hash=fingerprint(offer);
 const rows=await db.prepare(`SELECT e.id entity_id,e.business_revision,e.canonical_offer_id,o.updated_at,v.id version_id,v.facts_json,v.display_candidate_json,d.id decision_id,d.action,d.reason_code,d.reason_text
 FROM benefit_entities e JOIN offers o ON o.id=e.canonical_offer_id
 JOIN review_decisions d ON d.entity_id=e.id AND d.idempotency_key='backfill:offer:'||o.id
 JOIN benefit_versions v ON v.id=d.version_id AND v.entity_id=e.id
 WHERE e.platform_id=? AND json_extract(o.evidence,'$.url')=? AND e.state='active' AND o.withdrawn_at IS NULL
 AND ((d.action='approve' AND o.review_state='approved' AND e.current_approved_version_id=v.id) OR (d.action='reject' AND o.review_state='rejected' AND e.current_approved_version_id IS NULL))
 AND NOT EXISTS(SELECT 1 FROM review_decisions n WHERE n.supersedes_id=d.id)
 AND NOT EXISTS(SELECT 1 FROM review_decisions other WHERE other.entity_id=e.id AND other.action='reject' AND other.id<>d.id AND (other.version_id=v.id OR json_extract(other.scope_json,'$.kind')='entity_alias') AND NOT EXISTS(SELECT 1 FROM review_decisions n WHERE n.supersedes_id=other.id)) LIMIT 41`).bind(offer.platformId,offer.evidence.url).all<{entity_id:string;business_revision:number;canonical_offer_id:string;updated_at:string;version_id:string;facts_json:string;display_candidate_json:string;decision_id:string;action:'approve'|'reject';reason_code:string;reason_text:string}>();
 if(rows.results.length>40)return null;
 const matches=rows.results.filter(row=>{const old=offerIn.safeParse(JSON.parse(row.display_candidate_json));return old.success&&(row.action==='reject'||!!old.data.evidence.excerpts.benefit)&&!hasKnownTerms(canonicalTermsSchema.parse(JSON.parse(row.facts_json)))&&fingerprint(old.data)===hash;});
 let row=matches[0];if(!row)return null;
 if(matches.length>1){
  const candidates=matches.filter(m=>m.action==='approve'||m.reason_code!=='duplicate');if(candidates.length!==1)return null;row=candidates[0];
  const others=matches.filter(m=>m!==row);const shortCode=(id:string)=>{let h=2166136261;for(const c of id){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36).padStart(4,'0').slice(-4);};
  const ids=await db.prepare('SELECT id FROM offers ORDER BY id LIMIT 5001').all<{id:string}>();if(ids.results.length>5000)return null;
  const code=shortCode(row.canonical_offer_id),uniqueCode=ids.results.filter(o=>shortCode(o.id)===code).length===1;
  if(!others.every(m=>m.action==='reject'&&m.reason_code==='duplicate'&&(new RegExp('(?<![a-z0-9_-])'+row.canonical_offer_id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![a-z0-9_-])').test(m.reason_text)||(uniqueCode&&new RegExp('(?<![a-z0-9])'+code+'(?![a-z0-9])').test(m.reason_text)))))return null;
  if(await db.prepare("SELECT 1 FROM identity_constraints WHERE relation='different' AND entity_a IN (SELECT value FROM json_each(?1)) AND entity_b IN (SELECT value FROM json_each(?1)) LIMIT 1").bind(JSON.stringify(matches.map(m=>m.entity_id))).first())return null;
 }
return {entityId:row.entity_id,versionId:row.version_id,decisionId:row.decision_id,offerId:row.canonical_offer_id,action:row.action,revision:row.business_revision,updatedAt:row.updated_at,display:row.display_candidate_json,relatedRevisions:matches.map(m=>({id:m.entity_id,revision:m.business_revision}))};
}
