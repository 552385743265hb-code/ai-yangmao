import type { MutationResult } from '../../shared/identity/types';
export type Binding = string | number | null;
export type ExpectedRevision = {kind:'entity'|'task'|'block';id:string;revision:number};
export interface Predicate {sql:string;args:Binding[]}
export interface MutationPlan<T> {
 requestId:string;payloadHash:string;expected:ExpectedRevision[];statements:D1PreparedStatement[];receipt:T;
 guards?:Predicate[];assertions?:Predicate[];
}
export const commandGuard = "EXISTS(SELECT 1 FROM identity_commands WHERE request_id=? AND payload_hash=? AND state='staged')";
const allowed=new Set(['source_documents','source_observations','intake_candidates','intake_extractions','lead_candidate_links','benefit_entities','benefit_versions','entity_observations','identity_aliases','review_decisions','review_tasks','task_candidates','identity_constraints','identity_blocks','identity_events','offers','offer_proposals','reviews','offer_revisions','rejected_offer_updates','leads']);
const identifier=(name:string)=>{if(!/^[a-z_]+$/.test(name))throw new Error('invalid internal SQL identifier');return '"'+name+'"';};
const ownsVersion=(table:string,column:string,entity='entity_id')=>`(${column} IS NULL OR EXISTS(SELECT 1 FROM benefit_versions v WHERE v.id=${table}.${column} AND v.entity_id=${table}.${entity}))`;
const ownership:Record<string,string>={
 benefit_entities:ownsVersion('benefit_entities','current_approved_version_id','id'),
 benefit_versions:ownsVersion('benefit_versions','base_version_id'),
 review_tasks:[ownsVersion('review_tasks','version_id'),ownsVersion('review_tasks','base_version_id'),"(decision_id IS NULL OR EXISTS(SELECT 1 FROM review_decisions d WHERE d.id=review_tasks.decision_id AND (d.entity_id=review_tasks.entity_id OR review_tasks.entity_id IS NULL)))"].join(' AND '),
 review_decisions:[...['version_id','base_version_id','target_version_id'].map(c=>ownsVersion('review_decisions',c)),"(entity_id IS NULL OR candidate_id IS NULL OR EXISTS(SELECT 1 FROM intake_candidates c WHERE c.id=review_decisions.candidate_id AND c.entity_id=review_decisions.entity_id))","(supersedes_id IS NULL OR EXISTS(SELECT 1 FROM review_decisions d WHERE d.id=review_decisions.supersedes_id AND (d.entity_id=review_decisions.entity_id OR d.candidate_id=review_decisions.candidate_id)))"].join(' AND '),
 intake_candidates:[ownsVersion('intake_candidates','version_id'),"(task_id IS NULL OR EXISTS(SELECT 1 FROM review_tasks t WHERE t.id=intake_candidates.task_id AND (t.entity_id IS NULL OR t.entity_id=intake_candidates.entity_id)))","(decision_id IS NULL OR EXISTS(SELECT 1 FROM review_decisions d WHERE d.id=intake_candidates.decision_id AND (d.candidate_id=intake_candidates.id OR d.entity_id=intake_candidates.entity_id)))"].join(' AND '),
 identity_events:[ownsVersion('identity_events','version_id'),"(task_id IS NULL OR EXISTS(SELECT 1 FROM review_tasks t WHERE t.id=identity_events.task_id AND (t.entity_id=identity_events.entity_id OR (t.entity_id IS NULL AND identity_events.entity_id IS NULL))))"].join(' AND '),
};
/** Server-internal builder. Client JSON never supplies a table name, column or SQL. */
export class MutationBuilder {
 private statements:D1PreparedStatement[]=[];
 private assertions:Predicate[]=[];
 private guards:Predicate[]=[];
 constructor(private db:D1Database,readonly requestId:string,readonly payloadHash:string){}
 private table(table:string) {if(!allowed.has(table))throw new Error('unsupported mutation table');return identifier(table);}
 insert(table:string,data:Record<string,Binding>,onConflict:'error'|'nothing'='error'):void {
  const keys=Object.keys(data);const name=this.table(table);
  this.statements.push(this.db.prepare(`INSERT INTO ${name}(${keys.map(identifier).join(',')}) SELECT ${keys.map(()=>'?').join(',')} WHERE ${commandGuard}${onConflict==='nothing'?' ON CONFLICT DO NOTHING':''}`).bind(...keys.map(k=>data[k]),this.requestId,this.payloadHash));
  if(ownership[table]&&data.id!=null)this.assert(`NOT EXISTS(SELECT 1 FROM ${name} WHERE id=? AND NOT (${ownership[table]}))`,[data.id]);
 }
 update(table:string,data:Record<string,Binding>,where:string,args:Binding[]):void {
  const name=this.table(table),keys=Object.keys(data);
  this.statements.push(this.db.prepare(`UPDATE ${name} SET ${keys.map(k=>identifier(k)+'=?').join(',')} WHERE (${where}) AND ${commandGuard}`).bind(...keys.map(k=>data[k]),...args,this.requestId,this.payloadHash));
 }
 remove(table:string,where:string,args:Binding[]):void {
  this.statements.push(this.db.prepare(`DELETE FROM ${this.table(table)} WHERE (${where}) AND ${commandGuard}`).bind(...args,this.requestId,this.payloadHash));
 }
 assert(sql:string,args:Binding[]=[]):void {this.assertions.push({sql,args});}
 require(sql:string,args:Binding[]=[]):void {this.guards.push({sql,args});}
 assertOwnership(table:string,id:string):void {
  if(ownership[table])this.assert(`NOT EXISTS(SELECT 1 FROM ${this.table(table)} WHERE id=? AND NOT (${ownership[table]}))`,[id]);
 }
 plan<T>(expected:ExpectedRevision[],receipt:T):MutationPlan<T> {return {requestId:this.requestId,payloadHash:this.payloadHash,expected,statements:this.statements,receipt,guards:this.guards,assertions:this.assertions};}
}
export async function readIdentityReceipt<T>(db:D1Database,requestId:string,payloadHash:string):Promise<MutationResult<T>|null> {
 const row=await db.prepare('SELECT payload_hash,state,result_json FROM identity_commands WHERE request_id=?').bind(requestId).first<{payload_hash:string;state:string;result_json:string|null}>();
 if(!row)return null;
 if(row.payload_hash!==payloadHash||row.state!=='applied'||!row.result_json)return {status:'conflict',value:null};
 return {status:'replayed',value:JSON.parse(row.result_json) as T};
}
export async function commitIdentityMutation<T>(db:D1Database,plan:MutationPlan<T>):Promise<MutationResult<T>> {
 const prior=await readIdentityReceipt<T>(db,plan.requestId,plan.payloadHash);if(prior)return prior;
 if(plan.expected.length>40||plan.statements.length>40)throw new Error('identity mutation exceeds bounded batch');
 const guards:Predicate[]=[...(plan.guards??[])];
 for(const item of [...plan.expected].sort((a,b)=>(a.kind+':'+a.id).localeCompare(b.kind+':'+b.id))) {
  if(!Number.isSafeInteger(item.revision)||item.revision<0)throw new Error('invalid revision');
  if(item.kind==='entity')guards.push({sql:'EXISTS(SELECT 1 FROM benefit_entities WHERE id=? AND business_revision=?)',args:[item.id,item.revision]});
  else if(item.kind==='task')guards.push({sql:'EXISTS(SELECT 1 FROM review_tasks WHERE id=? AND revision=?)',args:[item.id,item.revision]});
  else guards.push({sql:'coalesce((SELECT revision FROM identity_blocks WHERE block_key=?),0)=?',args:[item.id,item.revision]});
 }
 const assertions=plan.assertions??[];
 const firstArgs:Binding[]=[plan.requestId,plan.payloadHash,JSON.stringify(plan.expected),...guards.flatMap(g=>g.args)];
 const lastArgs:Binding[]=[...assertions.flatMap(g=>g.args),JSON.stringify(plan.receipt),plan.requestId,plan.payloadHash];
 if(firstArgs.length>100||lastArgs.length>100)throw new Error('identity mutation exceeds D1 binding limit');
 const results=await db.batch([
  db.prepare(`INSERT OR IGNORE INTO identity_commands(request_id,payload_hash,state,expected_json) SELECT ?,?,'staged',? WHERE ${guards.length?guards.map(g=>'('+g.sql+')').join(' AND '):'1'} RETURNING request_id`).bind(...firstArgs),
  ...plan.statements,
  db.prepare(`UPDATE identity_commands SET state=CASE WHEN ${assertions.length?assertions.map(g=>'('+g.sql+')').join(' AND '):'1'} THEN 'applied' ELSE 'invalid' END,result_json=? WHERE request_id=? AND payload_hash=? AND state='staged' RETURNING request_id`).bind(...lastArgs),
 ]);
 const applied=await readIdentityReceipt<T>(db,plan.requestId,plan.payloadHash);
 if(!applied)return {status:'conflict',value:null};
 return {...applied,status:applied.status==='replayed'&&results[0].results.length?'applied':applied.status};
}
