import { Hono } from 'hono';
import type { Env } from '../index';
import { candidateBatchInputSchema, observationInputSchema } from '../../shared/identity/types';
import { IdentityError, IdentityStore } from './store';

// Mounted below the existing ingest middleware; never grants admin permissions.
export const identityIngestRoutes = new Hono<{ Bindings: Env }>();
identityIngestRoutes.onError((error,c) => {
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
  const receipts=await new IdentityStore(c.env.DB).recordCandidates(body.data);
  return c.json({receipts,mode:'shadow'});
});
