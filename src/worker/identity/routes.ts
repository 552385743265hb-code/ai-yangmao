import {IdentityMergeService} from './merge';
import {buildMergePlan} from './merge-plan';
import {mergePlanSchema} from '../../shared/identity/history-types';
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
identityAdminRoutes.get('/claim-decisions',async c=>{
 const input=z.object({productId:z.string().min(1).max(200).optional(),cursor:z.string().max(200).default(''),limit:z.coerce.number().int().min(1).max(10).default(10)}).safeParse(c.req.query());if(!input.success)return c.json({error:'invalid claim cursor'},400);
 const {productId,cursor,limit}=input.data;
 const rows=await c.env.DB.prepare("SELECT d.id,d.candidate_id,d.reason_text,d.reason_code,d.scope_json,d.reopen_policy_json,c.facts_json,c.raw_candidate_json,o.final_url FROM review_decisions d JOIN intake_candidates c ON c.id=d.candidate_id JOIN source_observations o ON o.id=c.observation_id WHERE d.entity_id IS NULL AND d.action='reject' AND json_extract(d.scope_json,'$.kind')='claim' AND d.id>? AND (?2 IS NULL OR json_extract(c.facts_json,'$.issuerProductId.state')<>'known' OR json_extract(c.facts_json,'$.issuerProductId.value')=?2) AND NOT EXISTS(SELECT 1 FROM review_decisions n WHERE n.supersedes_id=d.id) ORDER BY d.id LIMIT ?3").bind(cursor,productId??null,limit+1).all<Record<string,unknown>>();
 return c.json({decisions:rows.results.slice(0,limit).map(r=>({id:r.id,candidateId:r.candidate_id,reason:r.reason_text||r.reason_code,scope:JSON.parse(String(r.scope_json)),reopenPolicy:JSON.parse(String(r.reopen_policy_json)),facts:JSON.parse(String(r.facts_json)),quotes:(JSON.parse(String(r.raw_candidate_json)).quotes??[]).slice(0,5),url:r.final_url})),nextCursor:rows.results.length>limit?String(rows.results[limit-1].id):null});
});
identityAdminRoutes.get('/tasks',async c=>{
 const query=z.object({cursor:z.string().max(200).optional(),limit:z.coerce.number().int().min(1).max(5).default(5)}).safeParse(c.req.query());
 if(!query.success)return c.json({error:'invalid task cursor'},400);
 const rows=await c.env.DB.prepare("SELECT * FROM review_tasks WHERE state IN ('open','checking','manual') AND (entity_id IS NULL OR EXISTS(SELECT 1 FROM benefit_entities e WHERE e.id=review_tasks.entity_id AND e.state='active')) AND id>? ORDER BY id LIMIT ?").bind(query.data.cursor??'',query.data.limit+1).all<Record<string,unknown>>();
 const tasks=[];
 for(const task of rows.results.slice(0,query.data.limit)){
  const sources=await c.env.DB.prepare("SELECT DISTINCT c.id AS candidateId,c.facts_json,c.raw_candidate_json,o.id AS observationId,coalesce(json_extract(f.provenance_json,'$.finalUrl'),o.final_url) final_url,coalesce(f.provenance_json,o.trust_json) trust_json,coalesce(json_extract(f.provenance_json,'$.truncated'),o.text_truncated) text_truncated FROM task_candidates tc JOIN intake_candidates c ON c.id=tc.candidate_id JOIN source_observations o ON o.id=c.observation_id LEFT JOIN source_observation_fetches f ON f.id=c.source_fetch_id AND f.observation_id=o.id WHERE tc.task_id=?1 OR tc.task_id IN (SELECT source_task_id FROM merge_task_sources WHERE canonical_task_id=?1 AND status='active') ORDER BY c.id LIMIT 11").bind(task.id).all<Record<string,unknown>>();
  const version=task.version_id?await c.env.DB.prepare('SELECT facts_json,display_candidate_json FROM benefit_versions WHERE id=? AND entity_id=?').bind(task.version_id,task.entity_id).first<Record<string,unknown>>():null;
  const entity=task.entity_id?await c.env.DB.prepare('SELECT id,canonical_offer_id,current_approved_version_id,business_revision,publication_revision FROM benefit_entities WHERE id=?').bind(task.entity_id).first<Record<string,unknown>>():null;
  const previous=entity?.current_approved_version_id?await c.env.DB.prepare('SELECT facts_json FROM benefit_versions WHERE id=? AND entity_id=?').bind(entity.current_approved_version_id,entity.id).first<{facts_json:string}>():null;
  const decisions=task.entity_id?await c.env.DB.prepare('SELECT id,action,reason_code,reason_text,scope_json,reopen_policy_json,actor,created_at FROM review_decisions WHERE entity_id=? ORDER BY created_at DESC LIMIT 10').bind(task.entity_id).all():{results:[]};
  const proposal=entity?.canonical_offer_id?await c.env.DB.prepare('SELECT manual_fields FROM offer_proposals WHERE offer_id=?').bind(entity.canonical_offer_id).first<{manual_fields:string}>():null;
  tasks.push({...task,protectedFields:proposal?JSON.parse(proposal.manual_fields):[],entity,previousFacts:previous?JSON.parse(previous.facts_json):null,facts:version?JSON.parse(String(version.facts_json)):null,display:version?JSON.parse(String(version.display_candidate_json)):null,sources:sources.results.slice(0,10).map(row=>({...row,facts:JSON.parse(String(row.facts_json)),quotes:JSON.parse(String(row.raw_candidate_json)).quotes??[]})),sourcesComplete:sources.results.length<=10,decisions:decisions.results,reviewVersion:`identity:${task.id}:${task.revision}`});
 }
 return c.json({tasks,nextCursor:rows.results.length>query.data.limit?String(rows.results[query.data.limit-1]?.id):null});
});
identityAdminRoutes.post('/tasks/:id/resolve',async c=>{
 const raw=await c.req.json() as Record<string,unknown>;
 const service=new IdentityService(c.env.DB);
 if(raw.action==='same_claim'){if(c.get('role')!=='admin')return c.json({error:'administrator required'},403);const {action:_action,...input}=raw;return c.json(await service.confirmRejectedClaim(c.req.param('id'),{...input,actor:c.get('who')}));}
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

identityAdminRoutes.post('/merges/preview',async c=>{
 if(c.get('role')!=='admin'||!c.env.IDENTITY_HISTORY_ENVIRONMENT)return c.json({error:'explicit nonproduction administrator environment required'},403);
 const raw=await c.req.json();if(raw.environment!==c.env.IDENTITY_HISTORY_ENVIRONMENT)return c.json({error:'history environment mismatch'},403);
 if(!Array.isArray(raw.groups)||raw.groups.length!==1)return c.json({error:'preview one complete group per Worker request; offline preview supports up to ten'},400);
 return c.json(await buildMergePlan(c.env.DB,raw));
});
identityAdminRoutes.post('/merges/apply',async c=>{
 if(c.get('role')!=='admin'||c.env.HISTORICAL_MERGE_ENABLED!=='true'||!c.env.IDENTITY_HISTORY_ENVIRONMENT)return c.json({error:'historical merge disabled or unauthorized'},403);
 const body=z.strictObject({plan:mergePlanSchema,requestId:z.string().min(1).max(150),approvedPlanHash:z.string(),groupId:z.string().optional()}).parse(await c.req.json());
 const r=await new IdentityMergeService(c.env.DB,{environment:c.env.IDENTITY_HISTORY_ENVIRONMENT,enabled:true,actor:c.get('who')}).applyMerge(body.plan,body.requestId,body.approvedPlanHash,body.groupId);return c.json(r,r.status==='conflict'?409:200);
});
identityAdminRoutes.post('/merges/rollback',async c=>{
 if(c.get('role')!=='admin'||c.env.HISTORICAL_MERGE_ENABLED!=='true'||!c.env.IDENTITY_HISTORY_ENVIRONMENT)return c.json({error:'historical rollback disabled or unauthorized'},403);
 const body=z.strictObject({operationId:z.string(),expectedRevision:z.number().int().nonnegative(),requestId:z.string().min(1).max(150)}).parse(await c.req.json());
 const r=await new IdentityMergeService(c.env.DB,{environment:c.env.IDENTITY_HISTORY_ENVIRONMENT,enabled:true,actor:c.get('who')}).rollbackMerge(body.operationId,body.expectedRevision,body.requestId);return c.json(r,r.status==='conflict'?409:200);
});
