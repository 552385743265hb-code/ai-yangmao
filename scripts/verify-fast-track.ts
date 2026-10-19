// Real saved extraction -> real model -> the production semantic validator. No business write or re-publication.
import {writeFileSync} from 'node:fs';
import {api} from '../pipeline/lib';
import {reviewFastTrackFields} from '../pipeline/fast-track';
import {modelAvailable,paidAvailable} from '../pipeline/llm';
import {mergeFastTrackFields,fastTrackFieldIssues} from '../src/shared/fast-track-fields';
import {semanticReviewIssues} from '../src/shared/fast-track-semantics';
import {validateMembership,type MembershipCatalog,type MembershipRequirement} from '../src/shared/membership';

const id=process.env.FAST_TRACK_REVIEW_JOB??'';
if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw Error('FAST_TRACK_REVIEW_JOB must be an existing job ID');
const input=await api<{job:{platformId:string;platformName:string;url:string;benefit:string;note:string|null;ownerFields:Record<string,unknown>};fields:Record<string,unknown>;sourceText:string;offerId:string|null;membershipCatalog:MembershipCatalog}>(`/fast-track/${encodeURIComponent(id)}/review-input`);
const fields=mergeFastTrackFields(input.fields,input.job.ownerFields,input.job.benefit,input.job.platformName);
const context={...input.job,sourceText:input.sourceText};
let tokens=0,costCny=0;
const options={deadlineAt:Date.now()+6*60_000,dry:false,account:(t:number,c:number)=>{tokens+=t;costCny+=c;},log:console.log};
let result:Awaited<ReturnType<typeof reviewFastTrackFields>>|undefined,lastError:unknown;
for(const tier of ['free','paid'] as const){
 if(tier==='free'&&!modelAvailable(false)||tier==='paid'&&!paidAvailable())continue;
 try{result=await reviewFastTrackFields(fields,context,options,tier);break;}catch(e){lastError=e;}
}
if(!result)throw lastError??Error('No semantic review model available');
const issues=[...fastTrackFieldIssues(result.fields,context),...semanticReviewIssues(result.fields,result.review,context)];
if(result.fields.membershipRequirement)issues.push(...validateMembership(result.fields.membershipRequirement as MembershipRequirement,input.membershipCatalog));
if(issues.length)throw Error(issues.join('; '));
// The approved baseline is loaded after the model call and is never supplied as the answer to the model.
const report={jobId:id,offerId:input.offerId,businessWrites:0,baselineCompared:false,tokens,costCny,review:result.review,passed:false,baseline:null as Record<string,unknown>|null,errors:[] as string[]};
const saveReport=()=>writeFileSync('fast-track-semantic-verification.json',JSON.stringify(report,null,2));
saveReport();
console.log('FAST_TRACK_SEMANTIC_RESULT',JSON.stringify(result.review));
if(input.offerId){
 const base=(process.env.API_BASE??'https://ai-yangmao.com').replace(/\/$/,'');
 const r=await fetch(`${base}/api/offers/${encodeURIComponent(input.offerId)}`,{signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error(`Baseline read failed: ${r.status}`);
 const {offer}=await r.json() as {offer:Record<string,unknown>};
 report.baseline=Object.fromEntries(['type','modalities','audience','requirements'].map(k=>[k,offer[k]]));
 for(const key of ['type','modalities','audience'])if(JSON.stringify(result.fields[key])!==JSON.stringify(offer[key]))report.errors.push(`Semantic result differs from approved baseline: ${key}`);
 if(Array.isArray(offer.requirements)&&offer.requirements.includes('net')&&!(result.fields.requirements as string[]).includes('net'))report.errors.push('Missing net compared with approved baseline');
 report.baselineCompared=true;
}
report.passed=report.errors.length===0;
saveReport();
if(!report.passed)throw Error(report.errors.join('; '));
console.log('FAST_TRACK_SEMANTIC_VERIFIED',JSON.stringify(report));
