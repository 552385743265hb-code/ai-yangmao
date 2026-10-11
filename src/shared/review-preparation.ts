import type {OfficialReview} from './official-review';
type EvidenceOffer={evidence:{tier:string;excerpts:{benefit?:string;eligibility?:string;claim?:string}};verifyResult?:string|null;officialReview?:OfficialReview|null};
/** Unknown dates/amounts stay unknown. A source label alone is not usable benefit evidence. */
export function needsEvidence(o:EvidenceOffer,requireScope=true){return o.evidence.tier!=='tested'&&(o.evidence.tier==='media'||(o.evidence.excerpts.benefit?.trim().length??0)<12||(requireScope&&!o.evidence.excerpts.eligibility?.trim()&&!o.evidence.excerpts.claim?.trim())||o.verifyResult==='evidence_missing');}
export function reviewPreparation(o:EvidenceOffer){
 if(!needsEvidence(o))return {stage:'ready' as const,recommendation:'review' as const,label:'等待你决定',reason:'已保留权益原文。请核对领取条件与重复关系，再决定收录；系统不会自动上架。'};
 const r=o.officialReview;
 if(r?.status==='checking')return {stage:'collecting' as const,label:'系统补证中',reason:'正在读取官方出处、核对原文；完成后仍需人工决定。'};
 if(r&&!r.nextAttemptAt)return {stage:'blocked' as const,label:'补证受阻，暂缓收录',reason:r.reason||'未找到足够证据。建议保留待审或补充准确官方入口，不建议直接通过。'};
 return {stage:'collecting' as const,label:r?.nextAttemptAt?'等待系统重试':'等待系统补证',reason:r?.reason||'官方权益原文不足，已纳入自动补证队列；无需先作通过或拒绝决定。'};
}
