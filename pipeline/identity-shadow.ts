import { api } from './lib';
import { candidateInputSchema, observationReceiptSchema, intakeReceiptSchema, type CanonicalTermsV1 } from '../src/shared/identity/types';
import { z } from 'zod';

interface ShadowInput { url: string; text: string; sourceId?: string; leadIds?: number[]; candidates: unknown[]; extractionComplete?: boolean }
const legacyExcerpt = z.object({claimMethod:z.string().optional(),tags:z.array(z.string()).optional(),type:z.string().optional(),evidence:z.object({excerpts:z.object({benefit:z.string().optional()})})});
// Legacy display strings do not supply canonical terms. The resolver will extract
// supported facts later; collecting a raw candidate must not invent its scope.
function unknownTerms(): CanonicalTermsV1 {
  const unknown={state:'unknown'} as const;
  return {schemaVersion:'terms-v1',issuerProductId:unknown,mechanism:unknown,benefitPools:[],eligibility:unknown,geography:unknown,claimChannels:unknown,costs:unknown,claimWindow:unknown,occurrenceAnchor:unknown};
}
export async function captureIdentityShadow(input: ShadowInput): Promise<{recorded:number;reason?:string}> {
  if(process.env.IDENTITY_MODE==='off'||process.env.DRY_RUN==='1')return {recorded:0,reason:'disabled'};
  if(!process.env.API_BASE?.trim())return {recorded:0,reason:'explicit_api_base_required'};
  const observedAt=new Date().toISOString();
  const requestId=crypto.randomUUID();
  // The old caller does not carry the final redirect URL. Do not claim direct trust.
  const observation=observationReceiptSchema.parse(await api('/observations',{requestId,originalUrl:input.url,finalUrl:input.url,text:input.text,fetchKind:'indirect',sourceId:input.sourceId,observedAt,truncated:false}));
  const candidates=[];
  for(const [index,raw] of input.candidates.entries()) {
    const value=legacyExcerpt.safeParse(raw);
    const quote=value.success?value.data.evidence.excerpts.benefit:undefined;
    if(!quote)continue;
    const start=input.text.indexOf(quote);
    if(start<0||start+quote.length>250000)continue;
    const span={start,end:start+quote.length,quote};
    const fields=value.success?value.data:null;
    // A retrieval hint partitions subitems; it does not assert a canonical fact.
    const mechanismHint=fields?.tags?.includes('daily')?'recurring_quota':fields?.tags?.includes('referral')?'referral':fields?.tags?.includes('reset')?'extra_reset':fields?.claimMethod==='signup'?'signup_grant':fields?.type==='apply'?'application_grant':fields?.type==='trial'?'trial':undefined;
    const candidate=candidateInputSchema.safeParse({inputId:`input-${index}`,mechanismHint,span,quotes:[{id:'benefit',...span}],rawCandidate:raw,facts:unknownTerms()});
    if(candidate.success)candidates.push(candidate.data);
  }
  let recorded=0;
  for(let offset=0;offset<candidates.length||offset===0;offset+=1) {
    const batch=candidates.slice(offset,offset+1);
    const result=z.object({receipts:z.array(intakeReceiptSchema)}).parse(await api('/candidates',{requestId:`${requestId}:${offset}`,observationId:observation.observationId,extractionVersion:'legacy-shadow-v1',extractionComplete:input.extractionComplete!==false&&candidates.length===input.candidates.length,leadIds:input.leadIds??[],candidates:batch}));
    if(result.receipts.length!==batch.length||result.receipts.some((r,i)=>r.inputId!==batch[i].inputId))throw new Error('incomplete shadow receipts');
    recorded+=result.receipts.filter(r=>!r.reasonCodes.includes('storage_unavailable')).length;
  }
  return {recorded,...(recorded!==input.candidates.length?{reason:'shadow_incomplete'}:{})};
}
