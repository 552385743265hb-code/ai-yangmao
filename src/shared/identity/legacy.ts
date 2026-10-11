import type { IntakeReceipt } from './types';
export function legacyReceipt(inputId:string,receipt:IntakeReceipt):Record<string,unknown> {
 const duplicate=receipt.outcome.startsWith('duplicate_');
 return {id:receipt.canonicalOfferId??inputId,identityReceipt:{...receipt,inputId},identityHandled:true,
  ...(duplicate&&receipt.canonicalOfferId?{duplicateId:receipt.canonicalOfferId,unchanged:true}:{}),
  ...(receipt.outcome==='created_pending'||receipt.outcome==='proposed_update'?{reviewState:'pending'}:{}),
  ...(receipt.outcome==='deferred'?{error:'identity deferred',retryable:true}:{}),
  ...(!receipt.canonicalOfferId?{skipped:'identity task owns candidate'}:{})};
}
