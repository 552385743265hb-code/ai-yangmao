import { z } from 'zod';
import { api } from './lib';
import { intakeReceiptSchema } from '../src/shared/identity/types';
import { reviewIdentity,type IdentityReviewInput } from './identity-review';
export async function resumeIdentityIntake(deadlineAt:number):Promise<{resolved:number;deferred:number;modelTasks:number}> {
 const stats={resolved:0,deferred:0,modelTasks:0};
 if(process.env.IDENTITY_MODE!=='enforce'||!process.env.API_BASE)return stats;
 const queue=z.object({candidates:z.array(z.object({id:z.string(),revision:z.number().int()})).max(4)}).parse(await api('/identity-retries'));
 for(const candidate of queue.candidates){
  if(Date.now()>=deadlineAt){stats.deferred++;continue;}
  try {const receipt=intakeReceiptSchema.parse(await api('/identity-candidates/'+encodeURIComponent(candidate.id)+'/resolve',{requestId:crypto.randomUUID(),expectedRevision:candidate.revision}));if(receipt.retryable)stats.deferred++;else stats.resolved++;}
  catch {stats.deferred++;}
 }
 if(process.env.IDENTITY_MODEL_ASSIST!=='true'||Date.now()>=deadlineAt)return stats;
 const tasks=z.object({tasks:z.array(z.object({id:z.string(),revision:z.number().int()})).max(4)}).parse(await api('/identity-tasks'));
 for(const task of tasks.tasks){
  if(Date.now()>=deadlineAt)break;
  try {
   const claimed=await api<{revision:number;leaseToken:string;context:IdentityReviewInput}>('/identity-tasks/'+encodeURIComponent(task.id)+'/claim',{requestId:crypto.randomUUID(),expectedRevision:task.revision});
   const result=await reviewIdentity(claimed.context,deadlineAt);
   await api('/identity-tasks/'+encodeURIComponent(task.id)+'/result',{requestId:crypto.randomUUID(),expectedRevision:claimed.revision,leaseToken:claimed.leaseToken,result});stats.modelTasks++;
  } catch {stats.deferred++;}
 }
 return stats;
}
