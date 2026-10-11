import {historyContextSchema,snapshotSchema,legacyTables,type HistoryContext,type IdentitySnapshot,type LegacyRow,type LegacyTable} from '../../src/shared/identity/history-types';
import {sha256,stableJson,hashTerms,normalizeDocumentUrl} from '../../src/shared/identity/normalize';
import {RULES_VERSION,RESOLVER_VERSION} from '../../src/shared/identity/compare';
import {canonicalTermsSchema,reviewDecisionSchema,type IntakeReceipt} from '../../src/shared/identity/types';
function unknownIdentityTerms(){const unknown={state:'unknown'} as const;return canonicalTermsSchema.parse({schemaVersion:'terms-v1',issuerProductId:unknown,mechanism:unknown,benefitPools:[],eligibility:unknown,geography:unknown,claimChannels:unknown,costs:unknown,claimWindow:unknown,occurrenceAnchor:unknown});}
import {MutationBuilder,commitIdentityMutation,readIdentityReceipt} from '../../src/worker/identity/commit';
import {IdentityError} from '../../src/worker/identity/store';
import {offerIn} from '../../src/shared/ingest';

export async function captureLocalSnapshot(db:D1Database,raw:HistoryContext):Promise<IdentitySnapshot>{
 const context=historyContextSchema.parse(raw),tables={} as IdentitySnapshot['tables'];
 for(const table of legacyTables)tables[table]=(await db.prepare(`SELECT * FROM ${table} ORDER BY ${table==='offer_proposals'?'offer_id':'id'} LIMIT 50001`).all<LegacyRow>()).results;
 const body={schemaVersion:'identity-snapshot-v1' as const,context,tables,confirmedFacts:{}};
 return snapshotSchema.parse({...body,snapshotHash:await sha256(stableJson(body))});
}
export async function validateSnapshot(raw:IdentitySnapshot){const s=snapshotSchema.parse(raw),{snapshotHash,...body}=s;if(await sha256(stableJson(body))!==snapshotHash)throw new IdentityError(409,'snapshot hash mismatch');return s;}
export interface BackfillCursor {snapshotHash:string;lastProcessedId:string}
interface BackfillItem {key:string;table:'offers'|'leads'|'rejected_offer_updates';row:LegacyRow}
export interface BackfillPlan {schemaVersion:'identity-backfill-plan-v1';snapshot:IdentitySnapshot;manifest:{environment:string;snapshotHash:string;sourceCodeSha:string;resolverVersion:string;rulesVersion:string;highWaterMarks:Record<string,string|null>;counts:Record<string,number>;scanCursor:BackfillCursor|null};items:BackfillItem[];nextCursor:BackfillCursor|null;conflicts:{key:string;reason:string}[];estimatedWrites:number;planHash:string}
export async function buildBackfillPlan(raw:IdentitySnapshot,cursor?:BackfillCursor|null):Promise<BackfillPlan>{
 const snapshot=await validateSnapshot(raw);if(cursor&&cursor.snapshotHash!==snapshot.snapshotHash)throw new IdentityError(409,'cursor snapshot mismatch');
 const all:BackfillItem[]=[...snapshot.tables.offers.map(row=>({key:'1-offer:'+row.id,table:'offers' as const,row})),...snapshot.tables.leads.filter(r=>r.status==='rejected').map(row=>({key:'2-lead:'+String(row.id).padStart(16,'0'),table:'leads' as const,row})),...snapshot.tables.rejected_offer_updates.map(row=>({key:'3-update:'+String(row.id).padStart(16,'0'),table:'rejected_offer_updates' as const,row}))].sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
 if(cursor&&!all.some(i=>i.key===cursor.lastProcessedId))throw new IdentityError(409,'snapshot cursor not found');
 const rest=all.filter(i=>!cursor||i.key>cursor.lastProcessedId),items=rest.slice(0,100),nextCursor=rest.length>100?{snapshotHash:snapshot.snapshotHash,lastProcessedId:items.at(-1)!.key}:null;
 const manifest={environment:snapshot.context.environment,snapshotHash:snapshot.snapshotHash,sourceCodeSha:snapshot.context.sourceCodeSha,resolverVersion:RESOLVER_VERSION,rulesVersion:RULES_VERSION,highWaterMarks:Object.fromEntries(legacyTables.map(t=>[t,snapshot.tables[t].length?String(snapshot.tables[t].at(-1)![t==='offer_proposals'?'offer_id':'id']):null])),counts:Object.fromEntries(legacyTables.map(t=>[t,snapshot.tables[t].length])),scanCursor:cursor??null};
 const base={schemaVersion:'identity-backfill-plan-v1' as const,snapshot,manifest,items,nextCursor,conflicts:items.filter(i=>i.table==='offers'&&snapshot.tables.leads.filter(l=>l.offer_id===i.row.id).length>1000).map(i=>({key:i.key,reason:'oversized lead association set; requires explicit smaller reconciliation plan'})),estimatedWrites:items.reduce((n,i)=>n+(i.table==='offers'?12:8),0)};return {...base,planHash:await sha256(stableJson(base))};
}
const entityId=async(id:unknown)=>'legacy-entity-'+await sha256(String(id));
const json=(value:unknown)=>typeof value==='string'?JSON.parse(value):value;
function display(row:LegacyRow){const value:Record<string,unknown>={};for(const [key,v] of Object.entries(row)){const k=key.replace(/_([a-z])/g,(_,c:string)=>c.toUpperCase());value[k]=['modalities','requirements','steps','models','tags','evidence','valuation'].includes(k)&&v!==null?json(v):v;}const parsed=offerIn.safeParse({...value,sourceId:value.sourceId??undefined,firstChannel:value.firstChannel??undefined});return parsed.success?parsed.data:null;}
function unchanged(builder:MutationBuilder,table:LegacyTable,row:LegacyRow){const entries=Object.entries(row);builder.require(`EXISTS(SELECT 1 FROM ${table} WHERE ${entries.map(([k])=>`"${k}" IS ?`).join(' AND ')})`,entries.map(([,v])=>v));}
async function snapshotObservation(db:D1Database,builder:MutationBuilder,url:string,body:string,at:string,snapshotHash:string){
 const urlKey=normalizeDocumentUrl(url),doc=(await db.prepare('SELECT id FROM source_documents WHERE url_key=?').bind(urlKey).first<{id:string}>())?.id??'legacy-document-'+await sha256(urlKey),contentHash=await sha256(body),observation=(await db.prepare("SELECT id FROM source_observations WHERE document_id=? AND content_hash=? AND fetch_kind='indirect'").bind(doc,contentHash).first<{id:string}>())?.id??'legacy-observation-'+await sha256(doc+':'+contentHash);
 builder.insert('source_documents',{id:doc,original_url:url,url_key:urlKey},'nothing');
 builder.insert('source_observations',{id:observation,document_id:doc,content_hash:contentHash,text:body.slice(0,250000),text_truncated:Number(body.length>250000),fetch_kind:'indirect',final_url:url,observed_at:at,last_seen_at:at,trust_json:JSON.stringify({sourceVerified:false,productId:null,reason:'legacy_snapshot',snapshotHash})},'nothing');return observation;
}
async function backfillItem(db:D1Database,plan:BackfillPlan,item:BackfillItem,actor:string){
 const {row,table}=item,id=String(row.id),command='backfill:'+({offers:'offer',leads:'lead',rejected_offer_updates:'rejected_update'}[table])+':'+id,hash=await sha256(stableJson({backfillVersion:'v1',item,confirmedFacts:plan.snapshot.confirmedFacts[id]??null}));
 const replay=await readIdentityReceipt(db,command,hash);if(replay){if(replay.status==='conflict')throw new IdentityError(409,'backfill object conflict');return replay.status;}
 const current=await db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(row.id).first<LegacyRow>();if(stableJson(current)!==stableJson(row))throw new IdentityError(409,'legacy row changed');
 const offer=table==='offers'?row:table==='rejected_offer_updates'?plan.snapshot.tables.offers.find(o=>o.id===row.offer_id):null;
 const entity=offer?await entityId(offer.id):null;
 if(table!=='offers'&&entity&&!await db.prepare('SELECT 1 FROM benefit_entities WHERE id=?').bind(entity).first())throw new IdentityError(409,'offer backfill required first');
 const evidence=offer?json(offer.evidence):null,body=table==='leads'?String(row.raw??row.title??'Legacy rejected claim'):table==='rejected_offer_updates'?stableJson({evidence:json(row.evidence),diff:json(row.diff)}):Object.values(evidence?.excerpts??{}).filter(v=>typeof v==='string').join('\n');
 const url=table==='leads'?String(row.url):String(evidence?.url??'https://snapshot.invalid/'+id),candidate='legacy-candidate-'+await sha256(table+':'+id);
 const builder=new MutationBuilder(db,command,hash);unchanged(builder,table,row);
 const observation=await snapshotObservation(db,builder,url,body,String(row.created_at??row.at??offer?.discovered_at??'1970-01-01T00:00:00.000Z'),plan.snapshot.snapshotHash);
 const facts=canonicalTermsSchema.parse(table==='offers'?plan.snapshot.confirmedFacts[id]?.facts??unknownIdentityTerms():unknownIdentityTerms()),factsHash=await hashTerms(facts),version=entity&&table==='offers'?'legacy-version-'+await sha256(entity+':'+factsHash):null;
 const state=table==='offers'?String(row.review_state):'rejected',decision='legacy-decision-'+await sha256(command),task=state==='pending'?'legacy-task-'+await sha256(command):null;
 const receipt:IntakeReceipt={inputId:id,candidateId:candidate,canonicalOfferId:offer?String(offer.id):null,entityId:entity,entityRevision:entity?0:null,versionId:version,decisionId:state==='pending'?null:decision,taskId:task,outcome:state==='approved'?'duplicate_approved':state==='pending'?'created_pending':'duplicate_rejected',retryable:false,reasonCodes:['historical_backfill']};
 if(table==='offers'){
  builder.require('NOT EXISTS(SELECT 1 FROM benefit_entities WHERE canonical_offer_id=?)',[id]);builder.insert('benefit_entities',{id:entity!,platform_id:String(row.platform_id),canonical_offer_id:id,publication_revision:state==='approved'?1:0,first_seen_at:String(row.discovered_at),last_seen_at:String(row.updated_at)});
  builder.insert('benefit_versions',{id:version!,entity_id:entity!,terms_schema:'terms-v1',terms_hash:factsHash,facts_json:JSON.stringify(facts),display_candidate_json:JSON.stringify(display(row)??{}),state:state==='approved'?'approved':state==='rejected'?'rejected':'pending'});
  if(state==='approved')builder.update('benefit_entities',{current_approved_version_id:version},'id=?',[entity!]);
  builder.insert('identity_aliases',{id:'legacy-alias-'+await sha256(id),namespace:'legacy_offer_id',alias_key:id,scope_key:String(row.platform_id),entity_id:entity!,basis_json:JSON.stringify({snapshotHash:plan.snapshot.snapshotHash,originalOfferId:id})});
 }
 builder.insert('intake_candidates',{id:candidate,observation_id:observation,extraction_version:'legacy-backfill-v1',span_key:'legacy:'+table+':'+id,candidate_key:await sha256(command),raw_candidate_json:JSON.stringify({candidate:offer?display(offer)??{}:{legacyLeadId:row.id},quotes:body?[{id:'legacy',start:0,end:Math.min(body.length,250000),quote:body.slice(0,250000)}]:[],span:{start:0,end:Math.min(body.length,250000),quote:body.slice(0,250000)}}),facts_json:JSON.stringify(facts),facts_hash:factsHash,state:state==='pending'?'pending_initial':state==='rejected'?'resolved_rejected':'resolved_same',entity_id:entity,version_id:version,decision_id:null,task_id:null,receipt_json:JSON.stringify(receipt)});
 if(entity)builder.insert('entity_observations',{entity_id:entity,candidate_id:candidate,relation:'evidence_only',resolver_version:RESOLVER_VERSION,reason_json:'["historical_backfill"]'});
 if(table==='leads')builder.insert('lead_candidate_links',{lead_id:row.id,candidate_id:candidate});
 if(table==='offers')builder.insertLeadLinks(plan.snapshot.tables.leads.filter(l=>l.offer_id===id).map(l=>Number(l.id)),candidate);
 if(state==='pending'){builder.insert('review_tasks',{id:task!,task_key:'initial:'+entity,kind:'initial',entity_id:entity,version_id:version});builder.insert('task_candidates',{task_id:task!,candidate_id:candidate});}
 else {
  const resolution=table==='leads'&&row.resolution?json(row.resolution):null;
  const matchingReviews=offer?plan.snapshot.tables.reviews.filter(r=>r.offer_id===offer.id&&(table==='rejected_offer_updates'?r.action==='reject'&&r.at===row.at:r.action===(state==='approved'?'approve':'reject'))):[];
  const lastReview=table==='rejected_offer_updates'?(matchingReviews.length===1?matchingReviews[0]:null):matchingReviews.at(-1);
  const code=reviewDecisionSchema.shape.reasonCode.safeParse(resolution?.reasonCode??lastReview?.reason_code);const reasonCode=code.success?code.data:'other';
  builder.insert('review_decisions',{id:decision,entity_id:entity,candidate_id:candidate,version_id:version,action:state==='approved'?'approve':'reject',reason_code:reasonCode,reason_text:String(resolution?.reason??lastReview?.reason??'历史决定，保留原范围待核对'),scope_json:JSON.stringify(version?{kind:'exact_version',entityId:entity,versionId:version}:table==='leads'?{kind:'observation_only',observationId:observation}:{kind:'claim',candidateId:candidate}),reopen_policy_json:'{"kind":"manual","missingFacts":[]}',basis_json:JSON.stringify({snapshotHash:plan.snapshot.snapshotHash,legacyTable:table,legacyId:row.id,legacyResolution:table==='leads'?row.resolution??null:null}),rules_version:RULES_VERSION,evidence_refs_json:JSON.stringify([observation]),actor,idempotency_key:command});
 }
 builder.update('intake_candidates',{decision_id:state==='pending'?null:decision,task_id:task},'id=?',[candidate]);builder.assertOwnership('intake_candidates',candidate);
 // Existing proposal bytes stay at the legacy offer; a bounded manual task owns it.
 const proposal=table==='offers'?plan.snapshot.tables.offer_proposals.find(p=>p.offer_id===id):null;
 if(proposal){
  unchanged(builder,'offer_proposals',proposal);const proposalValue=json(proposal.candidate),proposalBody=Object.values(proposalValue.evidence?.excerpts??{}).filter(v=>typeof v==='string').join('\n');
  const proposalObservation=await snapshotObservation(db,builder,String(proposalValue.evidence?.url??url),proposalBody,String(proposal.detected_at??proposal.updated_at),plan.snapshot.snapshotHash);
  const proposalTask='legacy-proposal-task-'+await sha256(id),proposalCandidate='legacy-proposal-candidate-'+await sha256(id),proposalFacts=unknownIdentityTerms();
  builder.insert('review_tasks',{id:proposalTask,task_key:'legacy-proposal:'+entity,kind:'identity',entity_id:entity,base_version_id:state==='approved'?version:null,state:'manual',suggestion_json:JSON.stringify({reason:'legacy_proposal_requires_fact_review',originalOfferId:id})});
  const proposalReceipt:IntakeReceipt={...receipt,inputId:'proposal:'+id,candidateId:proposalCandidate,taskId:proposalTask,versionId:null,decisionId:null,outcome:'needs_identity_review',reasonCodes:['legacy_proposal_requires_fact_review']};
  builder.insert('intake_candidates',{id:proposalCandidate,observation_id:proposalObservation,extraction_version:'legacy-backfill-v1',span_key:'legacy-proposal:'+id,candidate_key:await sha256('proposal:'+id),raw_candidate_json:JSON.stringify({candidate:proposalValue,quotes:proposalBody?[{id:'legacy',start:0,end:Math.min(proposalBody.length,20000),quote:proposalBody.slice(0,20000)}]:[]}),facts_json:JSON.stringify(proposalFacts),facts_hash:await hashTerms(proposalFacts),state:'pending_identity',entity_id:entity,task_id:proposalTask,receipt_json:JSON.stringify(proposalReceipt)});
  builder.insert('task_candidates',{task_id:proposalTask,candidate_id:proposalCandidate});builder.insert('entity_observations',{entity_id:entity!,candidate_id:proposalCandidate,relation:'evidence_only',resolver_version:RESOLVER_VERSION,reason_json:'["legacy_proposal"]'});
 }
 const result=await commitIdentityMutation(db,builder.plan([],{key:item.key,entityId:entity,candidateId:candidate}));if(result.status==='conflict')throw new IdentityError(409,'backfill snapshot conflict');return result.status;
}
/** Only explicit isolated callers may mutate. The CLI below this module defaults to pure plans. */
export async function applyBackfillPage(db:D1Database,plan:BackfillPlan,permission:{environment:HistoryContext['environment'];approvedPlanHash:string;actor:string}){
 const {planHash,...body}=plan;if(permission.environment!==plan.snapshot.context.environment||permission.approvedPlanHash!==planHash||await sha256(stableJson(body))!==planHash||!permission.actor)throw new IdentityError(403,'exact isolated backfill plan approval required');
 const rebuilt=await buildBackfillPlan(plan.snapshot,plan.manifest.scanCursor);if(rebuilt.planHash!==planHash)throw new IdentityError(409,'backfill plan content conflict');
 if(plan.items.length>100||plan.conflicts.length)throw new IdentityError(409,'backfill plan conflict');const receipts=[];
 const progress=await db.prepare('SELECT cursor_json FROM identity_backfill_progress WHERE snapshot_hash=?').bind(plan.snapshot.snapshotHash).first<{cursor_json:string}>();
 if(plan.manifest.scanCursor&&(!progress||String(JSON.parse(progress.cursor_json).lastProcessedId)<plan.manifest.scanCursor.lastProcessedId))throw new IdentityError(409,'preceding snapshot checkpoint required');
 for(const item of plan.items){
  const status=await backfillItem(db,plan,item,permission.actor);receipts.push({key:item.key,status});
  const command='backfill-progress:'+plan.snapshot.snapshotHash+':'+item.key,hash=await sha256(stableJson({snapshotHash:plan.snapshot.snapshotHash,key:item.key})),builder=new MutationBuilder(db,command,hash);
  const current=await db.prepare('SELECT cursor_json,revision FROM identity_backfill_progress WHERE snapshot_hash=?').bind(plan.snapshot.snapshotHash).first<{cursor_json:string;revision:number}>();
  if(!current)builder.insert('identity_backfill_progress',{snapshot_hash:plan.snapshot.snapshotHash,cursor_json:JSON.stringify({snapshotHash:plan.snapshot.snapshotHash,lastProcessedId:item.key}),manifest_json:JSON.stringify(plan.manifest),revision:1},'nothing');
  else if(String(JSON.parse(current.cursor_json).lastProcessedId)<item.key){builder.require('EXISTS(SELECT 1 FROM identity_backfill_progress WHERE snapshot_hash=? AND revision=?)',[plan.snapshot.snapshotHash,current.revision]);builder.update('identity_backfill_progress',{cursor_json:JSON.stringify({snapshotHash:plan.snapshot.snapshotHash,lastProcessedId:item.key}),manifest_json:JSON.stringify(plan.manifest),revision:current.revision+1},'snapshot_hash=?',[plan.snapshot.snapshotHash]);}
  const checkpoint=await commitIdentityMutation(db,builder.plan([],{cursor:item.key}));if(checkpoint.status==='conflict')throw new IdentityError(409,'checkpoint changed; resume the same snapshot');
 }
 return {snapshotHash:plan.snapshot.snapshotHash,receipts,nextCursor:plan.nextCursor};
}
