import { legacyReceipt } from '../src/shared/identity/legacy';
import { z } from 'zod';
import { api } from './lib';
import type { OfferIn } from '../src/shared/ingest';
import { intakeReceiptSchema } from '../src/shared/identity/types';
const receiptSchema=z.object({id:z.string().min(1),error:z.string().optional(),skipped:z.string().optional(),duplicateId:z.string().optional(),reviewState:z.string().optional(),unchanged:z.boolean().optional(),changed:z.array(z.string()).optional(),identityHandled:z.boolean().optional(),identityReceipt:intakeReceiptSchema.optional(),pendingResolution:z.object({candidateId:z.string(),requestId:z.string()}).optional(),intakePersisted:z.boolean().optional()}).passthrough();
export type LegacyIdentityReceipt=z.infer<typeof receiptSchema>;
export async function postIdentityOffers(offers:OfferIn[]):Promise<{results:LegacyIdentityReceipt[]}> {
 if(!process.env.API_BASE)throw new Error('explicit API_BASE required for identity intake');
 const results:LegacyIdentityReceipt[]=[];
 const batchSize=process.env.IDENTITY_MODE==='enforce'?1:10;
 for(let offset=0;offset<offers.length;offset+=batchSize){
  const batch=offers.slice(offset,offset+batchSize);
  const response=z.object({results:z.array(receiptSchema).max(10)}).parse(await api('/offers',batch));
  if(response.results.length!==batch.length)throw new Error('incomplete candidate receipts');
  for(let i=0;i<response.results.length;i++){
   const result=response.results[i];
   if(!result.pendingResolution){results.push(result);continue;}
   try {const resolved=intakeReceiptSchema.parse(await api('/identity-candidates/'+encodeURIComponent(result.pendingResolution.candidateId)+'/resolve',result.pendingResolution));results.push(receiptSchema.parse({...legacyReceipt(batch[i].id,resolved),intakePersisted:true}));}
   catch {results.push({...result,error:'identity resolution deferred; intake persisted',intakePersisted:true});}
  }
  for(const id of new Set(batch.flatMap(o=>o.leadId?[o.leadId]:[])))if(response.results.some(r=>r.identityHandled))await api('/identity-leads/'+id+'/reconcile',{});
 }

 return {results};
}
