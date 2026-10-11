export interface LeadResolution {
  status: 'checking'|'retry'|'manual'|'linked'|'closed';
  jobId: string;
  attempts: number;
  inconclusive: number;
  checkedAt: string;
  nextAttemptAt: string|null;
  reason: string;
  queries: string[];
  candidates: string[];
  offerIds?: string[];
  originOfferIds?: string[];
  identityTaskIds?: string[];
  identityCandidateIds?: string[];
  evidenceUrl?: string;
  quote?: string;
}
export interface ReviewableLead {id:number;status:string;url:string;title:string|null;raw:string|null;createdAt:string;resolution:LeadResolution|null;offerId?:string|null;originOfferId?:string|null;identityReadVersion?:string}
export const LEAD_LEASE_MS=20*60_000;
export function leadReviewDue(l:ReviewableLead,now=Date.now()):boolean {
  if(l.status!=='reviewing')return false;
  const r=l.resolution;
  if(!r)return true;
  if(r.status==='checking')return now-Date.parse(r.checkedAt)>=LEAD_LEASE_MS;
  return r.status==='retry'&&!!r.nextAttemptAt&&Date.parse(r.nextAttemptAt)<=now;
}
export const leadReviewVersion=(l:ReviewableLead)=>{
  let hash=2166136261;
  for(const ch of JSON.stringify([l.status,l.title,l.url,l.raw,l.resolution])){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return `${l.id}-${(hash>>>0).toString(36)}`;
};
export function leadTask(l:ReviewableLead){
  return {id:l.id,title:l.title,url:l.url,status:l.status,createdAt:l.createdAt,offerId:l.offerId??null,originOfferId:l.originOfferId??l.offerId??null,
    note:l.resolution?.reason??l.raw?.split('[研判]').at(-1)?.slice(0,500)??null,
    resolution:l.resolution,reviewVersion:l.identityReadVersion??leadReviewVersion(l)};
}
