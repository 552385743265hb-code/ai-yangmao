import {z} from 'zod';
import {legacyTables,snapshotSchema,historyContextSchema,type HistoryContext,type LegacyRow,type LegacyTable} from '../../shared/identity/history-types';
import {sha256,stableJson} from '../../shared/identity/normalize';
import {backfillItem,buildBackfillPlan,makeBackfillItem,validateSnapshot} from '../../../scripts/identity/backfill';
import {IdentityError} from './store';
import {balancedAnd,readIdentityReceipt,type Predicate} from './commit';
export const backfillSourceSchema=z.strictObject({table:z.enum(['offers','leads','rejected_offer_updates']),id:z.string().min(1).max(200)});
const shape={schemaVersion:z.literal('identity-object-backfill-v1'),source:backfillSourceSchema,snapshot:snapshotSchema,conflicts:z.array(z.string()).max(20),estimatedWrites:z.number().int().nonnegative()};
export const objectBackfillPlanSchema=z.strictObject({...shape,planHash:z.string().regex(/^[a-f0-9]{64}$/)});
export type ObjectBackfillPlan=z.infer<typeof objectBackfillPlanSchema>;
async function boundedRows(db:D1Database,sql:string,args:(string|number|null)[]){const rows=(await db.prepare(sql+' LIMIT 1001').bind(...args).all<LegacyRow>()).results;if(rows.length>1000)throw new IdentityError(409,'oversized legacy object; explicit partition required');return rows;}
export async function previewBackfillObject(db:D1Database,raw:unknown,context:HistoryContext):Promise<ObjectBackfillPlan>{
 const source=backfillSourceSchema.parse(raw);historyContextSchema.parse(context);
 const row=await db.prepare(`SELECT * FROM ${source.table} WHERE id=?`).bind(source.id).first<LegacyRow>();if(!row)throw new IdentityError(404,'legacy object missing');
 if(source.table==='leads'&&row.status!=='rejected')throw new IdentityError(409,'only rejected legacy leads need refusal backfill');
 source.id=String(row.id);
 const tables=Object.fromEntries(legacyTables.map(t=>[t,[]])) as unknown as z.infer<typeof snapshotSchema>['tables'];tables[source.table]=[row];
 const offerId=source.table==='offers'?row.id:source.table==='rejected_offer_updates'?row.offer_id:null;
 if(offerId){
  if(source.table!=='offers'){const offer=await db.prepare('SELECT * FROM offers WHERE id=?').bind(offerId).first<LegacyRow>();if(!offer)throw new IdentityError(409,'original offer missing');tables.offers=[offer];}
  const [reviews,leads,proposals]=await Promise.all([boundedRows(db,'SELECT * FROM reviews WHERE offer_id=? ORDER BY id',[offerId]),boundedRows(db,'SELECT * FROM leads WHERE offer_id=? ORDER BY id',[offerId]),boundedRows(db,'SELECT * FROM offer_proposals WHERE offer_id=? ORDER BY offer_id',[offerId])]);tables.reviews=reviews;tables.leads=leads;tables.offer_proposals=proposals;
 }
 const body={schemaVersion:'identity-snapshot-v1' as const,context,tables,confirmedFacts:{}};
 const snapshot=snapshotSchema.parse({...body,snapshotHash:await sha256(stableJson(body))});
 const base={schemaVersion:'identity-object-backfill-v1' as const,source,snapshot,conflicts:[] as string[],estimatedWrites:source.table==='offers'?32:20};
 if(JSON.stringify(base).length>750000)throw new IdentityError(409,'oversized frozen object plan');
 return {...base,planHash:await sha256(stableJson(base))};
}
function relatedGuards(plan:ObjectBackfillPlan):Predicate[]{
 const offer=plan.snapshot.tables.offers[0];if(!offer)return [];
 return (['reviews','leads','offer_proposals'] as LegacyTable[]).map(table=>{
  const rows=plan.snapshot.tables[table],keys=rows.length?Object.keys(rows[0]):[],matches=keys.map(k=>{if(!/^[a-z_]+$/.test(k))throw new IdentityError(400,'invalid legacy column');return `t."${k}" IS json_extract(j.value,'$.${k}')`;});
  return {sql:`(SELECT count(*) FROM ${table} WHERE offer_id=?)=? AND NOT EXISTS(SELECT 1 FROM ${table} t WHERE t.offer_id=? AND NOT EXISTS(SELECT 1 FROM json_each(?) j WHERE ${balancedAnd(matches)}))`,args:[offer.id,rows.length,offer.id,JSON.stringify(rows)]};
 });
}
export async function applyBackfillObject(db:D1Database,raw:unknown,approvedPlanHash:string,context:HistoryContext){
 const plan=objectBackfillPlanSchema.parse(raw),{planHash,...body}=plan;
 if(approvedPlanHash!==planHash||await sha256(stableJson(body))!==planHash||stableJson(context)!==stableJson(plan.snapshot.context))throw new IdentityError(403,'exact server environment and plan approval required');
 await validateSnapshot(plan.snapshot);
 const legacyPlan=await buildBackfillPlan(plan.snapshot),row=plan.snapshot.tables[plan.source.table].find(r=>String(r.id)===plan.source.id);if(!row)throw new IdentityError(409,'backfill object is outside its frozen snapshot');
 const item=makeBackfillItem(plan.source.table,row);
 const command='backfill:'+({offers:'offer',leads:'lead',rejected_offer_updates:'rejected_update'}[item.table])+':'+item.row.id;
 const hash=await sha256(stableJson({backfillVersion:'v1',item,confirmedFacts:plan.snapshot.confirmedFacts[String(item.row.id)]??null}));
 const replay=await readIdentityReceipt(db,command,hash);if(replay){if(replay.status==='conflict')throw new IdentityError(409,'legacy object already has a different receipt');return {status:'replayed',source:plan.source,planHash};}
 const fresh=await previewBackfillObject(db,plan.source,context);if(fresh.planHash!==planHash)throw new IdentityError(409,'legacy object or related human records changed after preview');
 if(plan.conflicts.length)throw new IdentityError(409,'backfill conflict');
 const status=await backfillItem(db,legacyPlan,item,context.approvedBy,relatedGuards(plan));return {status,source:plan.source,planHash};
}
