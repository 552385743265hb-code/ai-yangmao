import type {EntityManifest,LegacyRow,MergeConflict,MergeReconciliation} from '../../shared/identity/history-types';
import {canonicalTermsSchema} from '../../shared/identity/types';
import {factSlots} from '../../shared/identity/compare';
import {sha256,stableJson} from '../../shared/identity/normalize';
import {hasKnownTerms} from './reviewed-legacy';
import {IdentityError} from './store';
import type {MutationBuilder} from './commit';

const parse=(value:unknown)=>typeof value==='string'?JSON.parse(value):value;
const column=(field:string)=>field.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
const jsonFields=new Set(['requirements','models']);
const value=(row:LegacyRow,field:string)=>jsonFields.has(field)?parse(row[column(field)]):row[column(field)];

/** Resolve only missing legacy facts and explicitly selected display differences.
 * Raw manifests are never changed: they remain the transaction's expected state. */
export async function reconcileMerge(db:D1Database,expected:EntityManifest[],root:EntityManifest|undefined,resolution:MergeReconciliation,conflicts:MergeConflict[]){
 const errors:MergeConflict[]=[],proofs:LegacyRow[]=[],ids=expected.map(m=>String(m.entity.id));
 const fail=(detail:string)=>errors.push({code:'reconciliation_conflict',ids,detail});
 if(!root?.offer||root.entity.platform_id!==resolution.productId||root.offer.platform_id!==resolution.productId)fail('the retained canonical product must already match the attested product');
 if(expected.length!==resolution.members.length||new Set(resolution.members.map(m=>m.entityId)).size!==expected.length)fail('every member must be named exactly once');
 for(const m of expected){
  const selected=resolution.members.find(v=>v.entityId===m.entity.id),version=m.versions.find(v=>v.id===m.entity.current_approved_version_id);
  if(!selected||selected.stateHash!==m.stateHash||selected.versionId!==version?.id||m.offer?.review_state!=='approved')fail('exact approved version or raw state changed');
  const original=version?canonicalTermsSchema.safeParse(parse(version.facts_json)):null;
  if(!original?.success||hasKnownTerms(original.data))fail('only entirely unknown legacy identity facts may be completed by this operation');
  if(m.tasks.some(t=>['open','checking','manual'].includes(String(t.state)))||m.proposals.length||m.deliveries.length||m.notifications.length)fail('legacy reconciliation does not support review drafts or notification history');
  // Existing product-scoped aliases cannot silently acquire a new meaning.
  if(m.entity.platform_id!==resolution.productId&&m.aliases.some(a=>a.namespace!=='legacy_offer_id'))fail('product correction with semantic aliases needs a separate review');
 }
 const facts=resolution.facts,quotes=new Map(resolution.quotes.map(q=>[q.id,q]));
 if(quotes.size!==resolution.quotes.length)fail('quote IDs must be unique');
 if(facts.issuerProductId.state!=='known'||facts.issuerProductId.value!==resolution.productId||facts.mechanism.state!=='known'||facts.occurrenceAnchor.state!=='known'||!facts.benefitPools.length)fail('precise product mechanism occurrence and benefit facts are required');
 for(const fact of factSlots(facts).values())if(fact.state==='known'&&(!fact.evidenceRefs.length||fact.evidenceRefs.some(id=>!quotes.has(id))))fail('every known fact must reference supplied evidence');
 if(facts.occurrenceAnchor.state==='known'&&!facts.occurrenceAnchor.evidenceRefs.some(id=>quotes.get(id)?.quote.includes(facts.occurrenceAnchor.state==='known'?facts.occurrenceAnchor.value:'')))fail('the occurrence anchor must appear in quoted evidence');
 const required=new Set<string>();
 for(const c of conflicts){
  if(c.code==='manual_field_conflict'){const field=/人工字段 (.+) 不同/.exec(c.detail)?.[1];if(field)required.add(field);else fail('unrecognized manual field conflict');}
  if(c.code==='valuation_conflict')for(const field of ['valuation','usdEstimate','usdMax'])required.add(field);
  if(c.code==='manual_note_conflict')required.add('adminNote');
  if(c.code==='cross_product')required.add('platformId');
 }
 for(const field of required)if(resolution.fieldChoices[field]!==root?.offer?.id)fail('explicit canonical field choice required: '+field);
 for(const field of Object.keys(resolution.fieldChoices))if(!required.has(field)||resolution.fieldChoices[field]!==root?.offer?.id)fail('unexpected field choice: '+field);
 const decisions=expected.flatMap(m=>m.decisions),superseded=new Set(decisions.flatMap(d=>d.supersedes_id?[d.supersedes_id]:[])),rejects=decisions.filter(d=>d.action==='reject'&&!superseded.has(d.id!));
 if(rejects.length!==resolution.retainedClaims.length||new Set(resolution.retainedClaims.map(c=>c.decisionId)).size!==rejects.length)fail('each active refusal requires its own exact retained-claim proof');
 const rejectedRows=resolution.retainedClaims.length?(await db.prepare('SELECT * FROM rejected_offer_updates WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(resolution.retainedClaims.map(c=>c.rejectedUpdateId))).all<LegacyRow>()).results:[];
 for(const claim of resolution.retainedClaims){
  const decision=rejects.find(d=>d.id===claim.decisionId),scope=decision?parse(decision.scope_json):null,basis=decision?parse(decision.basis_json):null;
  if(!decision||scope?.kind!=='claim'||scope.candidateId!==claim.candidateId||decision.candidate_id!==claim.candidateId||decision.version_id!==null||await sha256(stableJson(decision))!==claim.decisionHash||basis?.legacyTable!=='rejected_offer_updates'||basis.legacyId!==claim.rejectedUpdateId){fail('refusal scope or exact decision proof does not match');continue;}
  if(decisions.some(d=>d.action==='approve'&&d.candidate_id===claim.candidateId)){fail('the refused claim is also an approved subject');continue;}
  const update=rejectedRows.find(row=>row.id===claim.rejectedUpdateId);
  if(!update||await sha256(stableJson(update))!==claim.rejectedUpdateHash||!expected.some(m=>m.entity.id===decision.entity_id&&m.offer?.id===update.offer_id)){fail('rejected update source changed or belongs to another offer');continue;}
  const diff=parse(update.diff);if(!Array.isArray(diff)){fail('invalid rejection diff');continue;}
  for(const field of claim.distinguishingFields){
   const changes=diff.filter(d=>d.field===field);
   if(changes.length!==1||stableJson(changes[0].from)===stableJson(changes[0].to)||expected.some(m=>!m.offer||stableJson(value(m.offer,field))!==stableJson(changes[0].from)))fail('retained versions must preserve the original value rejected by the proposal: '+field);
  }
  proofs.push(update);
 }
 if(errors.length)return {conflicts:[...conflicts,...errors],resolvedConflicts:[],proofs};
 const resolvable=new Set(['cross_product','insufficient_facts','valuation_conflict','manual_note_conflict','manual_field_conflict','decision_conflict']);
 return {conflicts:conflicts.filter(c=>!resolvable.has(c.code)),resolvedConflicts:conflicts.filter(c=>resolvable.has(c.code)),proofs};
}
/** Exact source rows, including raw JSON bytes, are guarded inside the batch. */
function guardRows(builder:MutationBuilder,table:'rejected_offer_updates'|'platforms',rows:LegacyRow[]){
 if(!rows.length)return;
 const columns=Object.keys(rows[0]);
 if(!columns.includes('id')||columns.some(c=>!/^\w+$/.test(c))||rows.some(row=>stableJson(Object.keys(row).sort())!==stableJson([...columns].sort())))throw new IdentityError(400,'invalid reconciliation snapshot columns');
 // One JSON binding for the entire proof set: commit combines all requirements
 // into a single D1 statement with a total limit of 100 parameters.
 builder.require(`NOT EXISTS(SELECT 1 FROM json_each(?) saved WHERE NOT EXISTS(SELECT 1 FROM ${table} actual WHERE ${columns.map(c=>`actual."${c}" IS json_extract(saved.value,'$.${c}')`).join(' AND ')}))`,[JSON.stringify(rows)]);
}
export function guardReconciliationProofs(builder:MutationBuilder,proofs:LegacyRow[]){guardRows(builder,'rejected_offer_updates',proofs);}
export function guardRestoredPlatforms(builder:MutationBuilder,before:EntityManifest[],post:EntityManifest[]){
 const present=new Set(post.flatMap(m=>m.platform?[m.platform.id]:[]));
 const removed=[...new Map(before.flatMap(m=>m.platform&&!present.has(m.platform.id)?[[m.platform.id,m.platform] as const]:[])).values()];
 guardRows(builder,'platforms',removed);
}
