/** Read historical receipts through proven routes; never writes a synthetic sent mark. */
export async function notificationInheritance(db:D1Database,offerIds:string[],channel:string){
 const blocked=new Set<string>(),sent=new Map<string,Set<string>>(),announcedReviewKeys=new Set<string>(),conflicts:{offerId:string;reason:string}[]=[];
 const block=(id:string,reason:string)=>{blocked.add(id);if(!conflicts.some(c=>c.offerId===id&&c.reason===reason))conflicts.push({offerId:id,reason});};
 if(!offerIds.length)return {blocked,sent,announcedReviewKeys,conflicts};
 const aliases=(await db.prepare(`SELECT a.id source_entity_id,a.canonical_offer_id source_offer_id,a.current_approved_version_id source_version_id,r.id canonical_entity_id,r.canonical_offer_id canonical_offer_id,r.current_approved_version_id canonical_version_id,r.publication_revision canonical_publication_revision,(SELECT count(*) FROM benefit_versions WHERE entity_id=a.id) version_count,ao.claim_start a_start,ao.claim_end a_end,ao.end_kind a_kind,ao.source_tz a_tz,ro.claim_start r_start,ro.claim_end r_end,ro.end_kind r_kind,ro.source_tz r_tz FROM benefit_entities a JOIN benefit_entities r ON r.id=a.merged_into JOIN offers ao ON ao.id=a.canonical_offer_id JOIN offers ro ON ro.id=r.canonical_offer_id WHERE a.state='merged' AND r.state='active' AND r.canonical_offer_id IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(offerIds)).all<Record<string,string|number|null>>()).results;
 if(!aliases.length)return {blocked,sent,announcedReviewKeys,conflicts};
 const aliasIds=JSON.stringify(aliases.map(a=>a.source_offer_id)),entityIds=JSON.stringify(aliases.map(a=>a.source_entity_id));
 const routes=(await db.prepare("SELECT * FROM identity_version_routes WHERE status='active' AND source_entity_id IN (SELECT value FROM json_each(?))").bind(entityIds).all<Record<string,string|number|null>>()).results;
 const taskRoutes=(await db.prepare("SELECT m.*,source.entity_id source_entity_id,t.material_revision current_material_revision FROM merge_task_sources m JOIN review_tasks t ON t.id=m.canonical_task_id JOIN review_tasks source ON source.id=m.source_task_id WHERE m.status='active' AND source.entity_id IN (SELECT value FROM json_each(?))").bind(entityIds).all<Record<string,string|number>>()).results;
 const receipts=(await db.prepare(`SELECT id,status,payload FROM deliveries d WHERE channel=?1 AND status IN ('sent','pending','unknown') AND (EXISTS(SELECT 1 FROM json_tree(d.payload,'$.items') i WHERE i.key='id' AND i.value IN (SELECT value FROM json_each(?2))) OR EXISTS(SELECT 1 FROM json_each(d.payload,'$.marks') m WHERE json_extract(m.value,'$.offerId') IN (SELECT value FROM json_each(?2))) OR EXISTS(SELECT 1 FROM json_each(d.payload,'$.reviewAlerts') a JOIN review_tasks t ON t.id=json_extract(a.value,'$.taskId') WHERE t.entity_id IN (SELECT value FROM json_each(?3)))) LIMIT 501`).bind(channel,aliasIds,entityIds).all<{id:string;status:string;payload:string}>()).results;
 if(receipts.length>500){for(const a of aliases)block(String(a.canonical_offer_id),'history_incomplete');return {blocked,sent,announcedReviewKeys,conflicts};}
 const sourceEvents=receipts.flatMap(receipt=>{const payload=JSON.parse(receipt.payload);return (payload.marks??[]).filter((m:any)=>m.stage==='changed'&&m.eventId).map((m:any)=>m.eventId);});
 const transitions=sourceEvents.length?(await db.prepare(`SELECT ev.id,ev.entity_id,ev.version_id,json_extract(ev.payload_json,'$.publicationRevision') publication_revision,d.base_version_id FROM identity_events ev JOIN review_decisions d ON d.id=json_extract(ev.payload_json,'$.decisionId') JOIN benefit_entities e ON e.id=ev.entity_id WHERE ev.kind='changed' AND (ev.id IN (SELECT value FROM json_each(?1)) OR (e.canonical_offer_id IN (SELECT value FROM json_each(?2)) AND json_extract(ev.payload_json,'$.publicationRevision')=e.publication_revision)) LIMIT 501`).bind(JSON.stringify(sourceEvents),JSON.stringify(offerIds)).all<{id:string;entity_id:string;version_id:string;publication_revision:number;base_version_id:string|null}>()).results:[];
 if(transitions.length>500){for(const a of aliases)block(String(a.canonical_offer_id),'transition_history_incomplete');return {blocked,sent,announcedReviewKeys,conflicts};}
 const explicit=new Set<string>();
 const inherit=(a:typeof aliases[number],mark:{stage?:string;versionId?:string;entityId?:string;eventId?:string})=>{
  const canonical=String(a.canonical_offer_id),version=mark.versionId??(a.version_count===1?String(a.source_version_id):null);
  const route=routes.find(r=>r.source_entity_id===a.source_entity_id&&r.source_version_id===version&&r.canonical_entity_id===a.canonical_entity_id);
  if(!version||!route||(mark.entityId&&mark.entityId!==a.source_entity_id)){block(canonical,'unknown_version_mapping');return;}
  if(route.canonical_version_id!==a.canonical_version_id)return;
  const stage=mark.stage;if(!stage)return;
  if(['ending','ended'].includes(stage)&&(!a.a_end||a.a_start!==a.r_start||a.a_end!==a.r_end||a.a_kind!==a.r_kind||a.a_tz!==a.r_tz)){block(canonical,'unknown_claim_window_mapping');return;}
  // A restoration is a new approved transition even when its old fact version exists.
  // Only inherit publication `new`/urgent and proven lifecycle windows here.
  if(stage==='changed'){
   if(route.canonical_publication_revision!==a.canonical_publication_revision)return;
   const source=transitions.find(t=>t.id===mark.eventId&&t.entity_id===a.source_entity_id&&t.version_id===version);
   if(source&&source.publication_revision!==route.source_publication_revision)return;
   const target=transitions.find(t=>t.entity_id===a.canonical_entity_id&&t.version_id===a.canonical_version_id&&t.publication_revision===a.canonical_publication_revision);
   if(!source?.base_version_id||!target?.base_version_id){block(canonical,'unknown_transition_mapping');return;}
   if(!routes.some(r=>r.source_entity_id===a.source_entity_id&&r.source_version_id===source.base_version_id&&r.canonical_version_id===target.base_version_id))return;
  }
  const set=sent.get(canonical)??new Set<string>();set.add(stage);if(stage==='urgent')set.add('new');sent.set(canonical,set);
 };
 for(const receipt of receipts){
  const payload=JSON.parse(receipt.payload) as {items?:Record<string,{id:string}[]>;marks?:{offerId:string;stage:string;versionId?:string;entityId?:string;eventId?:string}[];reviewAlerts?:{taskId?:string;materialRevision?:number}[]};
  const ids=new Set([...(payload.marks??[]).map(m=>m.offerId),...Object.values(payload.items??{}).flat().map(i=>i.id)]);
  for(const a of aliases.filter(a=>ids.has(String(a.source_offer_id)))){
   if(receipt.status!=='sent'){block(String(a.canonical_offer_id),'delivery_'+receipt.status);continue;}
   const marks=(payload.marks??[]).filter(m=>m.offerId===a.source_offer_id);
   for(const mark of marks){explicit.add(String(a.source_offer_id)+':'+mark.stage);inherit(a,mark);}
  }
  for(const alert of payload.reviewAlerts??[]){const route=taskRoutes.find(r=>r.source_task_id===alert.taskId);if(!route)continue;
   if(route.current_material_revision===route.canonical_material_revision&&alert.materialRevision===route.source_material_revision)announcedReviewKeys.add(`review:${route.canonical_task_id}:${route.canonical_material_revision}:${channel}`);
   else if(receipt.status!=='sent'){const a=aliases.find(a=>a.source_entity_id===taskRoutes.find(r=>r.source_task_id===alert.taskId)?.source_entity_id);if(a)block(String(a.canonical_offer_id),'review_delivery_unmapped');}
  }
 }
 const notifications=(await db.prepare("SELECT offer_id,stage,status FROM notifications WHERE channel=? AND offer_id IN (SELECT value FROM json_each(?))").bind(channel,aliasIds).all<{offer_id:string;stage:string;status:string}>()).results;
 for(const n of notifications){const a=aliases.find(a=>a.source_offer_id===n.offer_id)!;if(['pending','unknown'].includes(n.status))block(String(a.canonical_offer_id),'notification_'+n.status);else if(n.status==='sent'&&!explicit.has(n.offer_id+':'+n.stage))inherit(a,{stage:n.stage});}
 return {blocked,sent,announcedReviewKeys,conflicts};
}
