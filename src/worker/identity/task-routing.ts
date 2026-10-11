import type {EntityManifest,LegacyRow,MergeConflict} from '../../shared/identity/history-types';
import {canonicalTermsSchema} from '../../shared/identity/types';
import {stableJson,withoutEvidence} from '../../shared/identity/normalize';
export const activeReviewTask=(t:LegacyRow)=>['open','checking','manual'].includes(String(t.state));
export function equivalentVersion(a:LegacyRow|undefined,b:LegacyRow|undefined){return !!a&&!!b&&a.terms_schema===b.terms_schema&&a.terms_hash===b.terms_hash&&stableJson(withoutEvidence(JSON.parse(String(a.facts_json))))===stableJson(withoutEvidence(JSON.parse(String(b.facts_json))));}
export interface TaskRouteAction {kind:'map'|'carry'|'cancel_duplicate';sourceEntityId:string;sourceTaskId:string;canonicalTaskId:string|null;carrierSourceTaskId:string|null}
export function planTaskRoutes(members:EntityManifest[],canonicalEntityId:string){
 const root=members.find(m=>m.entity.id===canonicalEntityId),actions:TaskRouteAction[]=[],conflicts:MergeConflict[]=[];if(!root)return {actions,conflicts};
 const conflict=(task:LegacyRow,detail:string)=>conflicts.push({code:'task_routing_conflict',ids:[String(task.id)],detail});
 const slots=root.tasks.filter(activeReviewTask).map(task=>({task,version:root.versions.find(v=>v.id===task.version_id),carrier:null as string|null}));
 for(const member of members)for(const task of member.tasks.filter(activeReviewTask)){
  if(['identity','merge_conflict'].includes(String(task.kind))){conflict(task,'先完成未决身份任务，再合并历史实体');continue;}
  const version=member.versions.find(v=>v.id===task.version_id);
  if(!version||!canonicalTermsSchema.safeParse(JSON.parse(String(version.facts_json))).success||task.base_version_id!==member.entity.current_approved_version_id){conflict(task,'审核版本或批准基线已不匹配');continue;}
  if(member===root)continue;
  const base=member.versions.find(v=>v.id===task.base_version_id),rootBase=root.versions.find(v=>v.id===root.entity.current_approved_version_id);
  if(task.kind==='initial'&&equivalentVersion(version,rootBase)&&!member.proposals.length){actions.push({kind:'cancel_duplicate',sourceEntityId:String(member.entity.id),sourceTaskId:String(task.id),canonicalTaskId:null,carrierSourceTaskId:null});continue;}
  if((task.base_version_id!==null||root.entity.current_approved_version_id!==null)&&!equivalentVersion(base,rootBase)){conflict(task,'不能把来源提案套用到不同的 canonical 批准基线');continue;}
  const slot=slots.find(s=>s.task.kind===task.kind&&equivalentVersion(s.version,version));
  if(slot){
   const protectedFields=member.proposals.flatMap(p=>JSON.parse(String(p.manual_fields)) as string[]);
   const sourceDisplay=JSON.parse(String(version.display_candidate_json)),targetDisplay=JSON.parse(String(slot.version!.display_candidate_json));
   if(protectedFields.some(k=>stableJson(sourceDisplay[k])!==stableJson(targetDisplay[k]))){conflict(task,'人工提案字段与 canonical 草稿不同，不能选择性覆盖');continue;}
   actions.push({kind:'map',sourceEntityId:String(member.entity.id),sourceTaskId:String(task.id),canonicalTaskId:slot.carrier?null:String(slot.task.id),carrierSourceTaskId:slot.carrier});
  }else if(!slots.length){actions.push({kind:'carry',sourceEntityId:String(member.entity.id),sourceTaskId:String(task.id),canonicalTaskId:null,carrierSourceTaskId:String(task.id)});slots.push({task,version,carrier:String(task.id)});}
  else conflict(task,'canonical 已有另一份实质不同的待审任务');
 }
 return {actions,conflicts};
}
