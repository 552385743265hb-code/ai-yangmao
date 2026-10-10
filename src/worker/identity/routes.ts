import { z } from 'zod';
import { mechanismSchema,canonicalTermsSchema } from '../../shared/identity/types';
import { sha256 } from '../../shared/identity/normalize';
import { identitySelected,requireIdentityReady,unknownIdentityTerms } from './adapters';
import { aggregateIdentityLead } from './leads';
import { IdentityService } from './service';
import { Hono } from 'hono';
import type { Env } from '../index';
import { candidateBatchInputSchema, observationInputSchema } from '../../shared/identity/types';
import { IdentityError, IdentityStore } from './store';

// Mounted below the existing ingest middleware; never grants admin permissions.
export const identityIngestRoutes = new Hono<{ Bindings: Env }>();
identityIngestRoutes.onError((error,c) => {
  if (error instanceof z.ZodError) return c.json({error:'invalid identity request'},400);
  if (error instanceof IdentityError) return c.json({error:error.message},error.status);
  return c.json({error:'identity storage unavailable',retryable:true},503);
});
identityIngestRoutes.post('/observations',async c=>{
  if (c.env.IDENTITY_MODE === 'off') return c.json({error:'identity intake disabled'},409);
  const body=observationInputSchema.safeParse(await c.req.json().catch(()=>null));
  if(!body.success)return c.json({error:'invalid observation'},400);
  return c.json(await new IdentityStore(c.env.DB).recordObservation(body.data));
});
identityIngestRoutes.post('/candidates',async c=>{
  if (c.env.IDENTITY_MODE === 'off') return c.json({error:'identity intake disabled'},409);
  const body=candidateBatchInputSchema.safeParse(await c.req.json().catch(()=>null));
  if(!body.success)return c.json({error:'invalid candidates'},400);
  if(body.data.candidates.length>1)return c.json({error:'candidate intake accepts one item per request under the default D1 budget'},400);
  const receipts=await new IdentityStore(c.env.DB).recordCandidates(body.data);
  return c.json({receipts,mode:c.env.IDENTITY_MODE??'shadow',resolutionRequired:c.env.IDENTITY_MODE==='enforce'});

});

identityIngestRoutes.get('/identity-candidates',async c=>{
  const query=z.object({productId:z.string().min(1).max(200),cursor:z.string().max(2000).optional(),mechanism:mechanismSchema.optional(),anchor:z.string().max(200).optional()}).safeParse(c.req.query());
  if(!query.success)return c.json({error:'invalid identity retrieval'},400);
  const facts=unknownIdentityTerms();facts.issuerProductId={state:'known',value:query.data.productId,evidenceRefs:['query']};
  if(query.data.mechanism)facts.mechanism={state:'known',value:query.data.mechanism,evidenceRefs:['query']};
  if(query.data.anchor)facts.occurrenceAnchor={state:'known',value:query.data.anchor,evidenceRefs:['query']};
  return c.json(await new IdentityStore(c.env.DB).retrieveCandidates(query.data.productId,facts,query.data.cursor));
});
identityIngestRoutes.get('/identity-tasks',async c=>{
  const rows=await c.env.DB.prepare("SELECT id,revision,kind FROM review_tasks t WHERE kind='identity' AND (state='open' OR (state='checking' AND lease_until<?)) AND EXISTS(SELECT 1 FROM task_candidates WHERE task_id=t.id) ORDER BY created_at,id LIMIT 4").bind(new Date().toISOString()).all();
  return c.json({tasks:rows.results});
});
identityIngestRoutes.post('/identity-tasks/:id/claim',async c=>c.json(await new IdentityService(c.env.DB).claimTask(c.req.param('id'),await c.req.json())));
identityIngestRoutes.post('/identity-tasks/:id/result',async c=>c.json(await new IdentityService(c.env.DB).submitTaskSuggestion(c.req.param('id'),await c.req.json())));

export const identityAdminRoutes=new Hono<{Bindings:Env;Variables:{role:'admin'|'reviewer';who:string}}>();
identityAdminRoutes.onError((error,c)=>{
 if(error instanceof IdentityError)return c.json({error:error.message},error.status);
 if(error instanceof z.ZodError)return c.json({error:'invalid identity request'},400);
 return c.json({error:'identity operation unavailable',retryable:true},503);
});
identityAdminRoutes.get('/tasks',async c=>{
 const query=z.object({cursor:z.string().max(200).optional(),limit:z.coerce.number().int().min(1).max(8).default(5)}).safeParse(c.req.query());
 if(!query.success)return c.json({error:'invalid task cursor'},400);
 const rows=await c.env.DB.prepare("SELECT * FROM review_tasks WHERE state IN ('open','checking','manual') AND id>? ORDER BY id LIMIT ?").bind(query.data.cursor??'',query.data.limit+1).all<Record<string,unknown>>();
 const tasks=[];
 for(const task of rows.results.slice(0,query.data.limit)){
  const sources=await c.env.DB.prepare('SELECT c.id AS candidateId,c.facts_json,c.raw_candidate_json,o.id AS observationId,o.final_url,o.trust_json,o.text_truncated FROM task_candidates tc JOIN intake_candidates c ON c.id=tc.candidate_id JOIN source_observations o ON o.id=c.observation_id WHERE tc.task_id=? ORDER BY c.id LIMIT 11').bind(task.id).all<Record<string,unknown>>();
  const version=task.version_id?await c.env.DB.prepare('SELECT facts_json,display_candidate_json FROM benefit_versions WHERE id=? AND entity_id=?').bind(task.version_id,task.entity_id).first<Record<string,unknown>>():null;
  const entity=task.entity_id?await c.env.DB.prepare('SELECT id,canonical_offer_id,current_approved_version_id,business_revision,publication_revision FROM benefit_entities WHERE id=?').bind(task.entity_id).first<Record<string,unknown>>():null;
  const previous=entity?.current_approved_version_id?await c.env.DB.prepare('SELECT facts_json FROM benefit_versions WHERE id=? AND entity_id=?').bind(entity.current_approved_version_id,entity.id).first<{facts_json:string}>():null;
  const decisions=task.entity_id?await c.env.DB.prepare('SELECT id,action,reason_code,scope_json,reopen_policy_json,actor,created_at FROM review_decisions WHERE entity_id=? ORDER BY created_at DESC LIMIT 10').bind(task.entity_id).all():{results:[]};
  tasks.push({...task,entity,previousFacts:previous?JSON.parse(previous.facts_json):null,facts:version?JSON.parse(String(version.facts_json)):null,display:version?JSON.parse(String(version.display_candidate_json)):null,sources:sources.results.slice(0,10).map(row=>({...row,facts:JSON.parse(String(row.facts_json)),raw:JSON.parse(String(row.raw_candidate_json))})),sourcesComplete:sources.results.length<=10,decisions:decisions.results,reviewVersion:`identity:${task.id}:${task.revision}`});
 }
 return c.json({tasks,nextCursor:rows.results.length>query.data.limit?String(rows.results[query.data.limit-1]?.id):null});
});
identityAdminRoutes.post('/tasks/:id/resolve',async c=>{
 const raw=await c.req.json() as Record<string,unknown>;
 const service=new IdentityService(c.env.DB);
 const result=raw.action==='same'||raw.action==='new'||raw.action==='distinct'
   ?await service.resolveIdentityTask(c.req.param('id'),{...raw,action:raw.action==='distinct'?'new':raw.action,actor:c.get('who')} as never)
   :await service.decideTask(c.req.param('id'),{...raw,actor:c.get('who'),role:c.get('role')} as never);
 return c.json(result);
});

identityAdminRoutes.post('/decisions/:id/reopen',async c=>{
 if(c.get('role')!=='admin')return c.json({error:'administrator required'},403);
 return c.json(await new IdentityService(c.env.DB).reopenDecision(c.req.param('id'),{...await c.req.json(),actor:c.get('who')}));
});
identityAdminRoutes.post('/aliases/:id/revoke',async c=>{
 if(c.get('role')!=='admin')return c.json({error:'administrator required'},403);
 return c.json(await new IdentityService(c.env.DB).revokeAlias(c.req.param('id'),{...await c.req.json(),actor:c.get('who')}));
});

identityIngestRoutes.post('/identity-candidates/:id/resolve',async c=>{
 if(c.env.IDENTITY_MODE!=='enforce')return c.json({error:'identity resolution disabled'},409);
 const body=z.object({requestId:z.string().min(1).max(200),expectedRevision:z.number().int().nonnegative().optional()}).safeParse(await c.req.json().catch(()=>null));
 if(!body.success)return c.json({error:'invalid resolution request'},400);
 const row=await c.env.DB.prepare('SELECT facts_json,revision FROM intake_candidates WHERE id=?').bind(c.req.param('id')).first<{facts_json:string;revision:number}>();
 if(!row)return c.json({error:'candidate missing'},404);
 const facts=canonicalTermsSchema.parse(JSON.parse(row.facts_json));
 if(facts.issuerProductId.state==='known'){if(!identitySelected(c.env,facts.issuerProductId.value))return c.json({error:'product is not selected for enforce'},409);await requireIdentityReady(c.env.DB,facts.issuerProductId.value);}
 if(body.data.expectedRevision!==undefined&&body.data.expectedRevision!==row.revision)return c.json({error:'candidate revision changed'},409);
 return c.json(await new IdentityService(c.env.DB).resolveCandidate(c.req.param('id'),body.data.requestId));
});

identityIngestRoutes.post('/identity-leads/:id/reconcile',async c=>{
 const id=z.coerce.number().int().positive().safeParse(c.req.param('id'));if(!id.success)return c.json({error:'invalid lead'},400);
 return c.json(await aggregateIdentityLead(c.env.DB,id.data)??{status:'unmanaged'});
});

identityIngestRoutes.get('/identity-retries',async c=>{
 if(c.env.IDENTITY_MODE!=='enforce')return c.json({candidates:[]});
 const products=(c.env.IDENTITY_CANARY_PLATFORMS??'').split(',').map(p=>p.trim()).filter(Boolean).slice(0,20);
 if(!products.length)return c.json({candidates:[]});
 const rows=await c.env.DB.prepare(`SELECT id,revision FROM intake_candidates WHERE state='deferred' AND (next_attempt_at IS NULL OR next_attempt_at<=?) AND (json_extract(facts_json,'$.issuerProductId.state')='unknown' OR json_extract(facts_json,'$.issuerProductId.value') IN (${products.map(()=>'?').join(',')})) ORDER BY attempts,id LIMIT 4`).bind(new Date().toISOString(),...products).all();
 return c.json({candidates:rows.results});
});
