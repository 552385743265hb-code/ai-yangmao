import type {EntityManifest,LegacyRow} from '../../shared/identity/history-types';
import {MutationBuilder,balancedAnd} from './commit';
import {IdentityError} from './store';
const unique=(rows:LegacyRow[])=>[...new Map(rows.map(r=>[String(r.id??r.offer_id??r.entity_id)+':'+String(r.candidate_id??''),r])).values()];
/** Compare raw values, including JSON TEXT bytes, inside the guarded transaction. */
export function guardMergeSnapshot(builder:MutationBuilder,manifests:EntityManifest[]){
 const ids=JSON.stringify(manifests.map(m=>m.entity.id)),offers=JSON.stringify(manifests.flatMap(m=>m.offer?[m.offer.id]:[]));
 const scopes:{table:string;rows:LegacyRow[];where:string;args:(string|number|null)[]}[]=[
  {table:'benefit_entities',rows:manifests.map(m=>m.entity),where:'t.id IN (SELECT value FROM json_each(?))',args:[ids]},
  {table:'platforms',rows:unique(manifests.flatMap(m=>m.platform?[m.platform]:[])),where:'t.id IN (SELECT value FROM json_each(?))',args:[JSON.stringify([...new Set(manifests.map(m=>m.entity.platform_id))])]},
  {table:'offers',rows:manifests.flatMap(m=>m.offer?[m.offer]:[]),where:'t.id IN (SELECT value FROM json_each(?))',args:[offers]},
 ];
 const entityTables={benefit_versions:'versions',review_tasks:'tasks',identity_aliases:'aliases',review_decisions:'decisions',entity_observations:'observations',identity_events:'events'} as const;
 for(const [table,field] of Object.entries(entityTables))scopes.push({table,rows:unique(manifests.flatMap(m=>m[field as typeof entityTables[keyof typeof entityTables]])),where:'t.entity_id IN (SELECT value FROM json_each(?))',args:[ids]});
 const offerTables={offer_proposals:'proposals',reviews:'reviews',offer_revisions:'revisions',notifications:'notifications'} as const;
 for(const [table,field] of Object.entries(offerTables))scopes.push({table,rows:unique(manifests.flatMap(m=>m[field])),where:'t.offer_id IN (SELECT value FROM json_each(?))',args:[offers]});
 scopes.push({table:'identity_constraints',rows:unique(manifests.flatMap(m=>m.constraints)),where:'(t.entity_a IN (SELECT value FROM json_each(?)) OR t.entity_b IN (SELECT value FROM json_each(?)))',args:[ids,ids]},
 {table:'leads',rows:unique(manifests.flatMap(m=>m.leads)),where:"(t.offer_id IN (SELECT value FROM json_each(?)) OR EXISTS(SELECT 1 FROM json_each(t.resolution,'$.offerIds') l WHERE l.value IN (SELECT value FROM json_each(?))))",args:[offers,offers]},
 {table:'deliveries',rows:unique(manifests.flatMap(m=>m.deliveries)),where:"(EXISTS(SELECT 1 FROM json_tree(t.payload,'$.items') i WHERE i.key='id' AND i.value IN (SELECT value FROM json_each(?))) OR EXISTS(SELECT 1 FROM json_each(t.payload,'$.marks') m WHERE json_extract(m.value,'$.offerId') IN (SELECT value FROM json_each(?))) OR EXISTS(SELECT 1 FROM json_each(t.payload,'$.reviewAlerts') a JOIN review_tasks rt ON rt.id=json_extract(a.value,'$.taskId') WHERE rt.entity_id IN (SELECT value FROM json_each(?))))",args:[offers,offers,ids]});
 for(const scope of scopes){
  const columns=Object.keys(scope.rows[0]??{});if(columns.some(c=>!/^\w+$/.test(c)))throw new IdentityError(400,'invalid snapshot columns');
  // Using one scoped CTE avoids repeating scope bindings across two comparisons.
  const comparison=columns.length?balancedAnd(columns.map(c=>`actual."${c}" IS json_extract(saved.value,'$.${c}')`)):'0';
  builder.require(`(WITH actual AS (SELECT t.* FROM ${scope.table} t WHERE ${scope.where}) SELECT (SELECT count(*) FROM actual)=? AND NOT EXISTS(SELECT 1 FROM actual WHERE NOT EXISTS(SELECT 1 FROM json_each(?) saved WHERE ${comparison})))`,[...scope.args,scope.rows.length,JSON.stringify(scope.rows)]);
 }
}
export function guardRoutingSnapshot(builder:MutationBuilder,table:'identity_version_routes'|'merge_task_sources',rows:LegacyRow[],operationId:string){
 const columns=Object.keys(rows[0]??{});if(columns.some(c=>!/^\w+$/.test(c)))throw new IdentityError(400,'invalid routing snapshot columns');
 const comparison=columns.length?balancedAnd(columns.map(c=>`actual."${c}" IS json_extract(saved.value,'$.${c}')`)):'0';
 builder.require(`(WITH actual AS (SELECT * FROM ${table} WHERE operation_id=?) SELECT (SELECT count(*) FROM actual)=? AND NOT EXISTS(SELECT 1 FROM actual WHERE NOT EXISTS(SELECT 1 FROM json_each(?) saved WHERE ${comparison})))`,[operationId,rows.length,JSON.stringify(rows)]);
}
