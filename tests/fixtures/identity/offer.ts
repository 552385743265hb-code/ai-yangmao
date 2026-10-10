import type { OfferIn } from '../../../src/shared/ingest';
export function displayOffer(valueText='注册赠送 10 美元 API 额度'):OfferIn {
 return {id:'vendor-signup',platformId:'vendor',title:'注册 API 赠额',type:'new',modalities:['text'],models:['model-v1'],tags:[],claimMethod:'signup',requirements:['none'],audience:'new',valueText,usdEstimate:null,usdMax:null,claimStart:null,claimEnd:null,endKind:'unknown',sourceTz:'UTC',steps:[],evidence:{url:'https://vendor.example/rewards',tier:'site',capturedAt:'2026-10-10T10:00:00.000Z',excerpts:{benefit:'Campaign signup-2026 grants 10 USD.',eligibility:'All new accounts qualify.',claim:'Sign up to claim.'}}};
}
