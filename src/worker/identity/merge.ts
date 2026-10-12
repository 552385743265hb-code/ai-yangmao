import {guardReconciliationProofs,guardRestoredPlatforms} from './merge-reconciliation';
import {planTaskRoutes,equivalentVersion} from './task-routing';
import {offerIn} from '../../shared/ingest';
import {z} from 'zod';
import {historyEnvironment,mergePlanSchema,entityManifestSchema,type MergePlan,type MergeReceipt,type RollbackReceipt,type EntityManifest,type LegacyRow} from '../../shared/identity/history-types';
import {canonicalTermsSchema} from '../../shared/identity/types';
import {sha256,stableJson,withoutEvidence} from '../../shared/identity/normalize';
import {RULES_VERSION} from '../../shared/identity/compare';
import {buildMergePlan,readEntityManifests} from './merge-plan';
import {guardMergeSnapshot,guardRoutingSnapshot} from './merge-guards';
import {MutationBuilder,commitIdentityMutation,readIdentityReceipt} from './commit';
import {IdentityError} from './store';
const optionsSchema=z.strictObject({environment:historyEnvironment,enabled:z.boolean(),actor:z.string().min(1).max(200)});
const versions=(ms:EntityManifest[])=>ms.map(m=>({entityId:String(m.entity.id),businessRevision:Number(m.entity.business_revision),generation:Number(m.entity.routing_generation)}));
const active=(t:LegacyRow)=>['open','checking','manual'].includes(String(t.state));
async function rehash(manifests:EntityManifest[]){for(const m of manifests){const {stateHash:_hash,...data}=m;for(const v of Object.values(data))if(Array.isArray(v))v.sort((a,b)=>{const ak=String(a.id??a.offer_id??a.entity_id)+':'+String(a.candidate_id??''),bk=String(b.id??b.offer_id??b.entity_id)+':'+String(b.candidate_id??'');return ak<bk?-1:ak>bk?1:0;});m.stateHash=await sha256(stableJson(data));}return manifests;}
function auditRow(id:string,command:string,entity:LegacyRow,actor:string,action:'merge'|'rollback',reason:string,operationId:string,now:string):LegacyRow{return {id,entity_id:entity.id,candidate_id:null,version_id:null,action,reason_code:'duplicate',scope_json:JSON.stringify({kind:'entity_alias',entityId:entity.id}),reopen_policy_json:'{"kind":"manual","missingFacts":[]}',rules_version:RULES_VERSION,evidence_refs_json:'[]',actor,base_version_id:null,target_version_id:null,idempotency_key:command+':decision',supersedes_id:null,created_at:now,reason_text:reason,basis_json:JSON.stringify({operationId})};}
function eventRow(id:string,entity:LegacyRow,kind:'merge'|'rollback',operationId:string,now:string):LegacyRow{return {id,event_key:kind+':'+operationId,entity_id:entity.id,version_id:null,task_id:null,kind,payload_json:JSON.stringify({operationId}),status:'pending',created_at:now};}
export class IdentityMergeService {
 private options:z.infer<typeof optionsSchema>;
 constructor(private db:D1Database,options:z.infer<typeof optionsSchema>){this.options=optionsSchema.parse(options);}
 private async invalidatePublicCache(builder:MutationBuilder){const row=await this.db.prepare('SELECT generation FROM identity_public_state WHERE id=1').first<{generation:number}>();if(!row)throw new IdentityError(409,'public routing migration required');builder.require('EXISTS(SELECT 1 FROM identity_public_state WHERE id=1 AND generation=?)',[row.generation]);builder.update('identity_public_state',{generation:row.generation+1},'id=1',[]);}
 private enabled(){if(!this.options.enabled)throw new IdentityError(403,'historical merge disabled');}
 async applyMerge(plan:MergePlan,requestId:string,approvedPlanHash:string,groupId=plan?.groups?.[0]?.id):Promise<MergeReceipt>{
  this.enabled();z.string().min(1).max(150).parse(requestId);plan=mergePlanSchema.parse(plan);
  if(plan.environment!==this.options.environment||plan.planHash!==approvedPlanHash)throw new IdentityError(403,'exact nonproduction plan approval required');
  const command='merge:'+requestId+':'+groupId,payloadHash=await sha256(stableJson({plan,approvedPlanHash,actor:this.options.actor}));
  const prior=await readIdentityReceipt<MergeReceipt>(this.db,command,payloadHash);if(prior){if(prior.status==='conflict')throw new IdentityError(409,'merge request payload conflict');return {...prior.value!,status:'replayed'};}
  const {planHash,...body}=plan;if(await sha256(stableJson(body))!==planHash)throw new IdentityError(400,'plan hash mismatch');
  const group=plan.groups.find(g=>g.id===groupId),empty:MergeReceipt={status:'conflict',operationId:null,planHash,groupId:groupId??'',beforeVersions:group?versions(group.expected):[],afterVersions:[],conflicts:[]};
  const conflict=(code:string,detail:string):MergeReceipt=>({...empty,conflicts:[{code,detail,ids:group?.entityIds??[]}]});
  if(!group||plan.conflicts.length||group.status!=='ready')return conflict('plan_conflict','plan contains unresolved or oversized groups');
  if(stableJson(plan).length>750000)return conflict('oversized','group manifest exceeds safe transaction input size');
  const current=await buildMergePlan(this.db,{environment:plan.environment,snapshotHash:plan.snapshotHash,sourceCodeSha:plan.sourceCodeSha,groups:[{entityIds:group.entityIds,canonicalEntityId:group.canonicalEntityId,canonicalReason:group.canonicalReason,evidence:group.evidence,...(group.reconciliation?{reconciliation:group.reconciliation}:{})}]});
  const fresh=current.groups[0];if(fresh.status!=='ready'||stableJson(fresh.expected)!==stableJson(group.expected)||stableJson(fresh.reconciliationProofs??[])!==stableJson(group.reconciliationProofs??[])||stableJson(fresh.resolvedConflicts??[])!==stableJson(group.resolvedConflicts??[]))return conflict('revision_conflict','group changed after preview');
  const descendants=await this.db.prepare('SELECT id FROM benefit_entities WHERE merged_into IN (SELECT value FROM json_each(?)) LIMIT 1').bind(JSON.stringify(group.entityIds)).first();if(descendants)return conflict('existing_merge_conflict','combine prior merge groups only after explicit separate review');
  const before=group.expected,after=structuredClone(before),root=after.find(m=>m.entity.id===group.canonicalEntityId)!;
  const operationId=crypto.randomUUID(),now=new Date().toISOString(),builder=new MutationBuilder(this.db,command,payloadHash);guardMergeSnapshot(builder,before);guardReconciliationProofs(builder,group.reconciliationProofs??[]);await this.invalidatePublicCache(builder);
  const entityUpdates=after.map(m=>{if(group.reconciliation){m.entity.platform_id=group.reconciliation.productId;m.platform=structuredClone(root.platform);}
   Object.assign(m.entity,{state:m.entity.id===group.canonicalEntityId?'active':'merged',merged_into:m.entity.id===group.canonicalEntityId?null:group.canonicalEntityId,business_revision:Number(m.entity.business_revision)+1,routing_generation:Number(m.entity.routing_generation)+1});return {id:m.entity.id,...(group.reconciliation?{platform_id:m.entity.platform_id}:{}),state:m.entity.state,merged_into:m.entity.merged_into,business_revision:m.entity.business_revision,routing_generation:m.entity.routing_generation};});
  const taskUpdates:LegacyRow[]=[],taskSources:LegacyRow[]=[],newVersions:LegacyRow[]=[],newTasks:LegacyRow[]=[],newProposals:LegacyRow[]=[],newEvents:LegacyRow[]=[];
  const routing=planTaskRoutes(before,group.canonicalEntityId);if(routing.conflicts.length)return {...empty,conflicts:routing.conflicts};const carriers=new Map<string,LegacyRow>();
  for(const task of root.tasks.filter(active)){Object.assign(task,{revision:Number(task.revision)+1,lease_token:null,lease_until:null});taskUpdates.push({id:task.id,revision:task.revision,lease_token:null,lease_until:null,state:task.state});}
  for(const action of routing.actions){
   const member=after.find(m=>m.entity.id===action.sourceEntityId)!,task=member.tasks.find(t=>t.id===action.sourceTaskId)!,version=member.versions.find(v=>v.id===task.version_id)!;
   if(action.kind!=='cancel_duplicate'){
    let target=action.canonicalTaskId?root.tasks.find(t=>t.id===action.canonicalTaskId):action.kind==='map'?carriers.get(action.carrierSourceTaskId!):undefined;
    if(action.kind==='carry'){
     let targetVersion=root.versions.find(v=>equivalentVersion(v,version));
     if(!targetVersion){targetVersion={id:crypto.randomUUID(),entity_id:root.entity.id,terms_schema:version.terms_schema,terms_hash:version.terms_hash,facts_json:version.facts_json,display_candidate_json:version.display_candidate_json,state:'pending',base_version_id:root.entity.current_approved_version_id,revision:0,created_at:now};newVersions.push(targetVersion);root.versions.push(targetVersion);}
     target={id:crypto.randomUUID(),task_key:'merge-carried:'+root.entity.id+':'+task.id,kind:task.kind,entity_id:root.entity.id,version_id:targetVersion.id,base_version_id:root.entity.current_approved_version_id,state:'open',revision:0,material_revision:1,lease_token:null,lease_until:null,decision_id:null,created_at:task.created_at,suggestion_json:null,lease_context_json:null};
     newTasks.push(target);root.tasks.push(target);carriers.set(action.sourceTaskId,target);
     const reviewEvent:LegacyRow={id:crypto.randomUUID(),event_key:`review:${target.id}:1:telegram`,entity_id:root.entity.id,version_id:targetVersion.id,task_id:target.id,kind:'review',payload_json:JSON.stringify({taskId:target.id,materialRevision:1,channel:'telegram'}),status:'pending',created_at:now};newEvents.push(reviewEvent);root.events.push(reviewEvent);
    }
    if(!target)return conflict('task_conflict','canonical task carrier missing');
    const proposal=member.proposals[0];if(proposal&&!root.proposals.length){
     const display=root.versions.find(v=>v.id===target!.version_id)!.display_candidate_json;const parsed=offerIn.safeParse(JSON.parse(String(display)));if(!parsed.success)return conflict('proposal_conflict','source draft does not satisfy the offer contract');
     const jsonFields=new Set(['modalities','models','tags','requirements','steps','evidence','valuation']);
     const diff=Object.entries(parsed.data).filter(([key])=>!['id','platformId'].includes(key)).flatMap(([field,to])=>{const column=field.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());if(!(column in root.offer!))return [];const raw=root.offer![column],from=jsonFields.has(field)&&typeof raw==='string'?JSON.parse(raw):raw;return stableJson(from)===stableJson(to)?[]:[{field,from:from??null,to}];});
     const copy:LegacyRow={offer_id:root.offer!.id,candidate:String(display),diff:JSON.stringify(diff),manual_fields:proposal.manual_fields,detected_at:proposal.detected_at,updated_at:now};newProposals.push(copy);root.proposals.push(copy);
    }
    taskSources.push({operation_id:operationId,canonical_task_id:target.id,source_task_id:task.id,source_material_revision:task.material_revision,canonical_material_revision:target.material_revision,status:'active'});
   }
   Object.assign(task,{state:'cancelled',revision:Number(task.revision)+1,lease_token:null,lease_until:null});taskUpdates.push({id:task.id,state:task.state,revision:task.revision,lease_token:null,lease_until:null});
  }
  const mappings:LegacyRow[]=[];
  for(const m of before)for(const version of m.versions){const sourceFacts=canonicalTermsSchema.safeParse(JSON.parse(String(version.facts_json)));if(!sourceFacts.success||sourceFacts.data.occurrenceAnchor.state!=='known')continue;
   const target=root.versions.find(v=>v.terms_hash===version.terms_hash&&stableJson(withoutEvidence(JSON.parse(String(v.facts_json))))===stableJson(withoutEvidence(sourceFacts.data)));if(target)mappings.push({operation_id:operationId,source_entity_id:m.entity.id,source_version_id:version.id,canonical_entity_id:root.entity.id,canonical_version_id:target.id,terms_hash:version.terms_hash,source_publication_revision:m.entity.publication_revision,canonical_publication_revision:root.entity.publication_revision,status:'active'});
  }
  const decision=auditRow(crypto.randomUUID(),command,root.entity,this.options.actor,'merge',group.canonicalReason,operationId,now),event=eventRow(crypto.randomUUID(),root.entity,'merge',operationId,now);if(group.reconciliation)decision.basis_json=JSON.stringify({operationId,reconciliation:group.reconciliation,resolvedConflicts:group.resolvedConflicts});root.decisions.push(decision);root.events.push(event);await rehash(after);
  builder.insert('merge_plans',{plan_hash:planHash,snapshot_hash:plan.snapshotHash,plan_json:JSON.stringify(plan),approved_by:this.options.actor,status:'approved'},'nothing');
  builder.require("NOT EXISTS(SELECT 1 FROM merge_plans WHERE plan_hash=? AND plan_json<>?)",[planHash,JSON.stringify(plan)]);
  builder.insert('merge_operations',{id:operationId,request_id:command,plan_hash:planHash,group_id:group.id,before_manifest:JSON.stringify({expected:before}),after_manifest:JSON.stringify({expected:after,reconciliationProofs:group.reconciliationProofs??[],taskSources,versionRoutes:mappings,created:{versions:newVersions.map(v=>v.id),tasks:newTasks.map(t=>t.id),proposals:newProposals.map(p=>p.offer_id),events:newEvents.map(e=>e.id)}}),state:'applied',created_at:now});
  builder.updateMany('benefit_entities',entityUpdates);builder.insertMany('benefit_versions',newVersions);builder.insertMany('review_tasks',newTasks);builder.insertMany('offer_proposals',newProposals);builder.insertMany('identity_events',newEvents);builder.updateMany('review_tasks',taskUpdates);
  builder.insertMany('merge_members',before.map(m=>({operation_id:operationId,entity_id:m.entity.id,canonical_entity_id:group.canonicalEntityId,expected_revision:m.entity.business_revision,post_revision:Number(m.entity.business_revision)+1})));
  builder.insertMany('identity_version_routes',mappings);builder.insertMany('merge_task_sources',taskSources);
  builder.insert('review_decisions',decision);builder.insert('identity_events',event);
  builder.update('merge_plans',{status:'applied'},"plan_hash=? AND (SELECT count(*) FROM merge_operations WHERE plan_hash=? AND state='applied')=?",[planHash,planHash,plan.groups.length]);
  builder.assert('NOT EXISTS(SELECT 1 FROM identity_version_routes r JOIN benefit_versions s ON s.id=r.source_version_id JOIN benefit_versions c ON c.id=r.canonical_version_id WHERE r.operation_id=? AND (s.entity_id<>r.source_entity_id OR c.entity_id<>r.canonical_entity_id))',[operationId]);
  builder.assert("(SELECT count(*) FROM benefit_entities WHERE id IN (SELECT value FROM json_each(?)) AND state='active')=1",[JSON.stringify(group.entityIds)]);
  const receipt:MergeReceipt={...empty,status:'applied',operationId,afterVersions:versions(after)};
  const result=await commitIdentityMutation(this.db,{...builder.plan(before.map(m=>({kind:'entity' as const,id:String(m.entity.id),revision:Number(m.entity.business_revision)})),receipt),replayChecked:true});return result.status==='conflict'?conflict('revision_conflict','transaction guard rejected changed group'):{...result.value!,status:result.status};
 }
 async rollbackMerge(operationId:string,expectedRevision:number,requestId:string):Promise<RollbackReceipt>{
  this.enabled();z.string().min(1).max(150).parse(requestId);z.number().int().nonnegative().parse(expectedRevision);
  const command='merge-rollback:'+requestId,payloadHash=await sha256(stableJson({operationId,expectedRevision,actor:this.options.actor}));const prior=await readIdentityReceipt<RollbackReceipt>(this.db,command,payloadHash);if(prior){if(prior.status==='conflict')throw new IdentityError(409,'rollback request payload conflict');return {...prior.value!,status:'replayed'};}
  const op=await this.db.prepare('SELECT o.*,p.plan_json FROM merge_operations o JOIN merge_plans p ON p.plan_hash=o.plan_hash WHERE o.id=?').bind(operationId).first<LegacyRow>();
  const fail=(detail:string):RollbackReceipt=>({status:'conflict',operationId,beforeVersions:[],afterVersions:[],conflicts:[{code:'rollback_conflict',ids:[operationId],detail}]});
  if(!op||op.state!=='applied'||op.revision!==expectedRevision)return fail('operation state or revision changed');
  const plan=JSON.parse(String(op.plan_json)) as MergePlan;if(plan.environment!==this.options.environment)throw new IdentityError(403,'history environment mismatch');
  const before=entityManifestSchema.array().parse(JSON.parse(String(op.before_manifest)).expected),post=entityManifestSchema.array().parse(JSON.parse(String(op.after_manifest)).expected);
  const current=await readEntityManifests(this.db,post.map(m=>String(m.entity.id)));if(stableJson(current)!==stableJson(post))return fail('new review evidence routing proposal or delivery cannot be assigned back automatically');
  const routing=JSON.parse(String(op.after_manifest)) as {reconciliationProofs?:LegacyRow[];versionRoutes:LegacyRow[];taskSources:LegacyRow[];created?:{versions:string[];tasks:string[];proposals:string[];events:string[]}};
  const created=z.object({versions:z.array(z.string()),tasks:z.array(z.string()),proposals:z.array(z.string()),events:z.array(z.string())}).parse(routing.created??{versions:[],tasks:[],proposals:[],events:[]});
  const routeRows=(await this.db.prepare('SELECT * FROM identity_version_routes WHERE operation_id=?').bind(operationId).all<LegacyRow>()).results,taskRows=(await this.db.prepare('SELECT * FROM merge_task_sources WHERE operation_id=?').bind(operationId).all<LegacyRow>()).results;
  const sorted=(rows:LegacyRow[])=>rows.map(row=>stableJson(row)).sort();if(stableJson(sorted(routeRows))!==stableJson(sorted(routing.versionRoutes))||stableJson(sorted(taskRows))!==stableJson(sorted(routing.taskSources)))return fail('version or task routing changed after merge');
  const builder=new MutationBuilder(this.db,command,payloadHash);guardMergeSnapshot(builder,current);guardRestoredPlatforms(builder,before,post);guardReconciliationProofs(builder,routing.reconciliationProofs??[]);guardRoutingSnapshot(builder,'identity_version_routes',routeRows,operationId);guardRoutingSnapshot(builder,'merge_task_sources',taskRows,operationId);await this.invalidatePublicCache(builder);builder.require("EXISTS(SELECT 1 FROM merge_operations WHERE id=? AND state='applied' AND revision=?)",[operationId,expectedRevision]);
  const updates=before.map(m=>{const now=current.find(c=>c.entity.id===m.entity.id)!.entity;return {id:m.entity.id,platform_id:m.entity.platform_id,state:m.entity.state,merged_into:m.entity.merged_into,business_revision:Number(now.business_revision)+1,routing_generation:Number(now.routing_generation)+1};});
  builder.updateMany('benefit_entities',updates);
  const tasks=before.flatMap(m=>m.tasks.filter(active).map(t=>{const present=current.flatMap(c=>c.tasks).find(c=>c.id===t.id)!;return {id:t.id,state:t.state,revision:Number(present.revision)+1,lease_token:null,lease_until:null};}));builder.updateMany('review_tasks',[...tasks,...current.flatMap(m=>m.tasks.filter(t=>created.tasks.includes(String(t.id))).map(t=>({id:t.id,state:'cancelled',revision:Number(t.revision)+1,lease_token:null,lease_until:null})))]);
  for(const id of created.proposals){const proposal=current.flatMap(m=>m.proposals).find(p=>p.offer_id===id)!;builder.remove('offer_proposals','offer_id=? AND candidate=? AND updated_at=?',[id,proposal.candidate,proposal.updated_at]);}
  if(created.versions.length)builder.update('benefit_versions',{state:'superseded'},'id IN (SELECT value FROM json_each(?))',[JSON.stringify(created.versions)]);
  if(created.events.length)builder.update('identity_events',{status:'blocked'},'id IN (SELECT value FROM json_each(?))',[JSON.stringify(created.events)]);
  builder.update('identity_version_routes',{status:'rolled_back'},'operation_id=?',[operationId]);builder.update('merge_task_sources',{status:'rolled_back'},'operation_id=?',[operationId]);builder.update('merge_operations',{state:'rolled_back',revision:expectedRevision+1},'id=?',[operationId]);builder.update('merge_plans',{status:'rolled_back'},"plan_hash=? AND NOT EXISTS(SELECT 1 FROM merge_operations WHERE plan_hash=? AND state='applied')",[String(op.plan_hash),String(op.plan_hash)]);
  const root=current.find(m=>m.entity.state==='active')!,now=new Date().toISOString();builder.insert('review_decisions',auditRow(crypto.randomUUID(),command,root.entity,this.options.actor,'rollback','Restore pre-merge routes without changing historical records',operationId,now));builder.insert('identity_events',eventRow(crypto.randomUUID(),root.entity,'rollback',operationId,now));
  const receipt:RollbackReceipt={status:'applied',operationId,beforeVersions:versions(current),afterVersions:updates.map(e=>({entityId:String(e.id),businessRevision:e.business_revision,generation:e.routing_generation})),conflicts:[]};
  const result=await commitIdentityMutation(this.db,{...builder.plan(current.map(m=>({kind:'entity' as const,id:String(m.entity.id),revision:Number(m.entity.business_revision)})),receipt),replayChecked:true});return result.status==='conflict'?fail('rollback snapshot changed inside transaction'):{...result.value!,status:result.status};
 }
}
