import {mergePreviewInputSchema,type EntityManifest,type LegacyRow,type MergePlan,type MergeGroupPlan,type MergeConflict,type MergePreviewInput} from '../../shared/identity/history-types';
import {canonicalTermsSchema} from '../../shared/identity/types';
import {stableJson,sha256,withoutEvidence} from '../../shared/identity/normalize';
import {RULES_VERSION,RESOLVER_VERSION} from '../../shared/identity/compare';
import {IdentityError} from './store';
const parse=(v:unknown)=>typeof v==='string'?JSON.parse(v):v;
const key=(row:LegacyRow)=>String(row.id??row.offer_id??row.entity_id)+':'+String(row.candidate_id??'');
const sort=(rows:LegacyRow[])=>rows.sort((a,b)=>key(a)<key(b)?-1:key(a)>key(b)?1:0);
/** Bounded group read, shared by preview and pre-commit validation. No writes. */
export async function readEntityManifests(db:D1Database,ids:string[]):Promise<EntityManifest[]>{
 if(ids.length>10)throw new IdentityError(400,'oversized merge group');const bind=JSON.stringify(ids);
 const rows=async(query:string,value=bind)=>sort((await db.prepare(query).bind(value).all<LegacyRow>()).results);
 const entities=await rows('SELECT * FROM benefit_entities WHERE id IN (SELECT value FROM json_each(?))');
 const offerIds=JSON.stringify(entities.flatMap(e=>e.canonical_offer_id?[e.canonical_offer_id]:[]));
 const offers=await rows('SELECT * FROM offers WHERE id IN (SELECT value FROM json_each(?))',offerIds);
 const related:Record<string,LegacyRow[]>={};
 for(const table of ['benefit_versions','review_tasks','identity_aliases','review_decisions','entity_observations'])related[table]=await rows(`SELECT * FROM ${table} WHERE entity_id IN (SELECT value FROM json_each(?)) ORDER BY entity_id LIMIT 501`);
 for(const table of ['offer_proposals','reviews','offer_revisions','notifications'])related[table]=await rows(`SELECT * FROM ${table} WHERE offer_id IN (SELECT value FROM json_each(?)) ORDER BY offer_id LIMIT 501`,offerIds);
 const constraints=await rows('SELECT * FROM identity_constraints WHERE entity_a IN (SELECT value FROM json_each(?1)) OR entity_b IN (SELECT value FROM json_each(?1)) LIMIT 501');
 const deliveries=await rows("SELECT * FROM deliveries d WHERE EXISTS(SELECT 1 FROM json_tree(d.payload,'$.items') j WHERE j.key='id' AND j.value IN (SELECT value FROM json_each(?1))) OR EXISTS(SELECT 1 FROM json_each(d.payload,'$.marks') m WHERE json_extract(m.value,'$.offerId') IN (SELECT value FROM json_each(?1))) OR EXISTS(SELECT 1 FROM json_each(d.payload,'$.reviewAlerts') a JOIN review_tasks t ON t.id=json_extract(a.value,'$.taskId') JOIN benefit_entities e ON e.id=t.entity_id WHERE e.canonical_offer_id IN (SELECT value FROM json_each(?1))) LIMIT 501",offerIds);
 const leads=await rows("SELECT * FROM leads l WHERE l.offer_id IN (SELECT value FROM json_each(?1)) OR EXISTS(SELECT 1 FROM json_each(l.resolution,'$.offerIds') v WHERE v.value IN (SELECT value FROM json_each(?1))) LIMIT 501",offerIds);
 const manifests=[];
 for(const entity of entities){const eid=entity.id,oid=entity.canonical_offer_id;const er=(table:string)=>related[table].filter(r=>r.entity_id===eid),or=(table:string)=>related[table].filter(r=>r.offer_id===oid);
  const data={entity,offer:offers.find(o=>o.id===oid)??null,versions:er('benefit_versions'),tasks:er('review_tasks'),aliases:er('identity_aliases'),decisions:er('review_decisions'),observations:er('entity_observations'),proposals:or('offer_proposals'),reviews:or('reviews'),revisions:or('offer_revisions'),notifications:or('notifications'),deliveries:deliveries.filter(d=>{const p=parse(d.payload);return Object.values(p.items??{}).flat().some((v:any)=>v.id===oid)||(p.marks??[]).some((m:any)=>m.offerId===oid)||(p.reviewAlerts??[]).some((a:any)=>er('review_tasks').some(t=>t.id===a.taskId));}),leads:leads.filter(l=>l.offer_id===oid||(parse(l.resolution??'null')?.offerIds??[]).includes(oid)),constraints:constraints.filter(c=>c.entity_a===eid||c.entity_b===eid)};
  manifests.push({...data,stateHash:await sha256(stableJson(data))});
 }
 // Truncation must not masquerade as complete history. Every group is bounded.
 if([...Object.values(related),constraints,deliveries,leads].some(a=>a.length>500))throw new IdentityError(409,'oversized group history; explicit smaller plan required');
 return manifests;
}
const fingerprintProposal=(row:LegacyRow)=>{const value={...parse(row.candidate)};for(const key of ['id','discoveredAt','updatedAt','reviewMemo','reviewSuggestion','officialReview'])delete value[key];return stableJson(value);};
export async function buildMergePlan(db:D1Database,raw:MergePreviewInput|unknown):Promise<MergePlan>{
 const input=mergePreviewInputSchema.parse(raw),groups:MergeGroupPlan[]=[],globalConflicts:MergeConflict[]=[];const seen=new Set<string>();
 if(input.groups.length>10)globalConflicts.push({code:'oversized',ids:[],detail:'最多十组；本计划不可执行，未截断组列表'});
 for(let index=0;index<input.groups.length;index++){
  const request=input.groups[index],entityIds=[...request.entityIds].sort(),conflicts:MergeConflict[]=[];
  const conflict=(code:string,detail:string,ids=entityIds)=>conflicts.push({code,ids,detail});
  const oversized=entityIds.length>10||input.groups.length>10;
  if(oversized)conflict('oversized','每组最多十个实体，超过时不读取或自动拆组');
  if(new Set(entityIds).size!==entityIds.length)conflict('duplicate_member','组内实体重复');
  if(entityIds.some(id=>seen.has(id)))conflict('overlapping_groups','一个实体不能属于多个组');entityIds.forEach(id=>seen.add(id));
  let expected:EntityManifest[]=[];
  if(!oversized){try{expected=await readEntityManifests(db,entityIds);}catch(e){if(e instanceof IdentityError&&e.message.startsWith('oversized'))conflict('oversized_history',e.message);else throw e;}}
  const root=expected.find(e=>e.entity.id===request.canonicalEntityId),approved=expected.filter(e=>e.entity.current_approved_version_id);
  if(!oversized&&expected.length!==entityIds.length)conflict('missing_entity','存在不存在的活动身份');
  if(!root?.offer)conflict('missing_canonical_offer','主记录必须存在，且属于本组');
  if(new Set(expected.map(e=>e.entity.platform_id)).size>1)conflict('cross_product','发放产品不同');
  if(expected.some(e=>e.entity.state!=='active'))conflict('non_active_member','已合并成员需要重新核对等价组，不能堆叠路由');
  if(expected.some(e=>e.constraints.some(c=>c.relation==='different'&&entityIds.includes(String(c.entity_a))&&entityIds.includes(String(c.entity_b)))))conflict('manual_different','人工 different 是硬否决');
  if(request.evidence.relation!=='same')conflict('identity_not_confirmed','证据没有确认同一次活动');
  const versions=expected.map(e=>e.versions.find(v=>v.id===e.entity.current_approved_version_id)??e.versions.find(v=>v.state==='pending'));
  const facts=versions.map(v=>v?canonicalTermsSchema.safeParse(parse(v.facts_json)):null);
  if(!oversized&&facts.some(f=>!f?.success||f.data.mechanism.state!=='known'||f.data.occurrenceAnchor.state!=='known'))conflict('insufficient_facts','缺少领取机制或独立轮次依据，不能按未知事实 hash 合并');
  const anchors=facts.flatMap(f=>f?.success&&f.data.occurrenceAnchor.state==='known'?[f.data.occurrenceAnchor.value]:[]);
  if(new Set(anchors).size>1)conflict('occurrence_conflict','属于独立发放轮次');
  const approvedHashes=approved.map(e=>e.versions.find(v=>v.id===e.entity.current_approved_version_id)?.terms_hash);
  if(new Set(approvedHashes).size>1)conflict('approved_terms_conflict','两个已批准版本的实质条款不同，不能自动选主覆盖');
  if(facts.filter(f=>f?.success).length>1&&new Set(facts.flatMap(f=>f?.success?[stableJson(withoutEvidence(f.data))]:[])).size>1)conflict('terms_conflict','成员事实不同或缺失，需先完成事实核对');
  const values=expected.filter(e=>e.offer).map(e=>stableJson([e.offer!.usd_estimate,e.offer!.usd_max,e.offer!.valuation]));
  if(new Set(values).size>1)conflict('valuation_conflict','人工估值不同，必须显式解决');
  const notes=expected.filter(e=>e.offer).map(e=>e.offer!.admin_note??'');if(new Set(notes).size>1)conflict('manual_note_conflict','人工公开心得不同，保留并待确认');
  const protectedFields=new Set(expected.flatMap(e=>e.revisions.filter(r=>r.author==='admin').flatMap(r=>(parse(r.diff) as {field:string}[]).map(d=>d.field))).filter(k=>!['reviewMemo','lastVerifiedAt','verifyResult'].includes(k)));
  for(const field of protectedFields){const column=field.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());if(new Set(expected.filter(e=>e.offer).map(e=>stableJson(e.offer![column]??null))).size>1)conflict('manual_field_conflict','人工字段 '+field+' 不同，需明确保留方案');}
  const proposals=expected.flatMap(e=>e.proposals);if(new Set(proposals.map(fingerprintProposal)).size>1)conflict('proposal_conflict','不同待审提案不能覆盖');
  const decisions=expected.flatMap(e=>e.decisions),superseded=new Set(decisions.flatMap(d=>d.supersedes_id?[d.supersedes_id]:[]));
  if(approved.length&&decisions.some(d=>d.action==='reject'&&!superseded.has(d.id??'')))conflict('decision_conflict','批准与未撤销拒绝需要管理员解决范围冲突');
  if(expected.some(e=>e.tasks.some(t=>t.state==='checking')))conflict('leased_task','仍有在途审核任务');
  const deliveries=[...new Map(expected.flatMap(e=>e.deliveries).map(d=>[d.id,d])).values()];
  const notificationImpact={sent:deliveries.filter(d=>d.status==='sent').map(d=>String(d.id)),pending:deliveries.filter(d=>d.status==='pending').map(d=>String(d.id)),unknown:deliveries.filter(d=>d.status==='unknown').map(d=>String(d.id))};
  const before=expected.filter(e=>e.offer?.review_state==='approved').map(e=>String(e.offer!.id)),after=root?.offer?.review_state==='approved'?[String(root.offer.id)]:[];
  groups.push({id:'group-'+index,entityIds,canonicalEntityId:request.canonicalEntityId,canonicalOfferId:root?.offer?String(root.offer.id):null,canonicalReason:request.canonicalReason,evidence:request.evidence,status:oversized?'oversized':conflicts.length?'conflict':'ready',conflicts,expected,beforeManifest:{states:expected.map(e=>({entityId:e.entity.id,state:e.entity.state,mergedInto:e.entity.merged_into,businessRevision:e.entity.business_revision,routingGeneration:e.entity.routing_generation})),originalOfferIds:expected.map(e=>e.offer?.id??null)},afterManifest:{states:expected.map(e=>({entityId:e.entity.id,state:e.entity.id===request.canonicalEntityId?'active':'merged',mergedInto:e.entity.id===request.canonicalEntityId?null:request.canonicalEntityId,businessRevision:Number(e.entity.business_revision)+1,routingGeneration:Number(e.entity.routing_generation)+1}))},notificationImpact,publicChange:{before,after},estimatedWrites:expected.length*2+3,executionOrder:entityIds,rollbackImpact:['原行与审计不改写','只有无不兼容后续变更时可反向恢复路由',...(notificationImpact.pending.length||notificationImpact.unknown.length?['存在未确认发送，继续阻止重发并保留人工核查']:[])]});
 }
 const base={schemaVersion:'identity-merge-plan-v1' as const,environment:input.environment,snapshotHash:input.snapshotHash,sourceCodeSha:input.sourceCodeSha,resolverVersion:RESOLVER_VERSION,rulesVersion:RULES_VERSION,scanCursor:null,highWaterMarks:Object.fromEntries(groups.flatMap(g=>g.expected.map(e=>[String(e.entity.id),String(e.entity.business_revision)]))),counts:{groups:groups.length,entities:groups.reduce((n,g)=>n+g.entityIds.length,0),conflicts:globalConflicts.length+groups.reduce((n,g)=>n+g.conflicts.length,0)},groups,conflicts:globalConflicts,estimatedWrites:groups.reduce((n,g)=>n+g.estimatedWrites,0)};
 return {...base,planHash:await sha256(stableJson(base))};
}
