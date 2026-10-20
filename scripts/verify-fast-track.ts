// Read-only model diagnostic. Only the existing model budget ledger may be written.
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {api} from '../pipeline/lib';
import {rebuildFastTrackFields,reviewFastTrackFields} from '../pipeline/fast-track';
import {modelAvailable,paidAvailable} from '../pipeline/llm';
import {mergeFastTrackFields,fastTrackFieldIssues} from '../src/shared/fast-track-fields';
import {semanticReviewIssues,type SemanticReview} from '../src/shared/fast-track-semantics';
import {membershipSchema,membershipPlanAlternatives,normalizeMembership,validateMembership,type MembershipCatalog,type MembershipRequirement} from '../src/shared/membership';

type Fields=Record<string,unknown>;
interface ReviewInput {job:{id:string;platformId:string;platformName:string;url:string;benefit:string;note:string|null;ownerFields:Fields};fields:Fields;sourceText:string;offerId:string|null;membershipCatalog:MembershipCatalog}
/** Compare eligibility only after inference; names, evidence URLs and clause ordering are not eligibility. */
export function compareDiagnosticMembership(actual:unknown,baseline:unknown,catalog:MembershipCatalog){
 const expand=(value:unknown)=>{
  const parsed=membershipSchema.safeParse(value);if(!parsed.success||parsed.data.status==='needs_review')return null;
  const r=parsed.data;let unresolved=false;
  const anyOf=r.anyOf.map(g=>({allOf:g.allOf.map(c=>{
   const resolve=(ids:string[])=>ids.flatMap(id=>{const found=membershipPlanAlternatives(id,catalog);if(!found)unresolved=true;return found??[];});
   const excluded=resolve(c.excludePlanIds);
   if(c.scope==='any_paid'&&catalog.plans.some(p=>p.productId===c.productId&&p.status==='verified'&&p.billing==='unknown'))unresolved=true;
   const candidates=c.scope==='plans'?resolve(c.planIds):catalog.plans.filter(p=>p.productId===c.productId&&p.status==='verified'&&(c.scope==='any_subscription'||p.billing==='paid')).map(p=>p.id);
   if(!catalog.products.some(p=>p.id===c.productId&&p.status==='verified')||candidates.some(id=>!catalog.plans.some(p=>p.id===id&&p.productId===c.productId&&p.status==='verified')))unresolved=true;
   return {...c,scope:'plans' as const,planIds:candidates.filter(id=>!excluded.includes(id)),excludePlanIds:[]};
  })}));
  return unresolved?null:normalizeMembership({...r,anyOf,catalogRevision:catalog.revision,evidenceUrls:[],legacyText:undefined});
 };
 const a=expand(actual),b=expand(baseline);
 const facts=(r:MembershipRequirement)=>({status:r.status,anyOf:r.anyOf});
 return {equivalent:a&&b?JSON.stringify(facts(a))===JSON.stringify(facts(b)):null,actual,baseline,expandedActual:a?facts(a):null,expandedBaseline:b?facts(b):null};
}
export async function verifyFastTrack(id=process.env.FAST_TRACK_REVIEW_JOB??'',rebuild=process.env.FAST_TRACK_REBUILD_FIELDS==='1'){
 if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw Error('FAST_TRACK_REVIEW_JOB must be an existing job ID');
 const input=await api<ReviewInput>(`/fast-track/${encodeURIComponent(id)}/review-input`);
 let tokens=0,costCny=0;
 const monthlyCap=Number(process.env.MONTHLY_COST_CAP_CNY??72);
 let costMonthCny=0;
 const options={deadlineAt:Date.now()+6*60_000,dry:false,account:(t:number,c:number)=>{tokens+=t;costCny+=c;},log:console.log,allowPaid:()=>paidAvailable()&&monthlyCap-costMonthCny-costCny>0.05};
 const report={jobId:id,offerId:input.offerId,mode:rebuild?'rebuild':'saved-review',businessWrites:0,catalogRevision:input.membershipCatalog.revision,rebuildInputs:rebuild?{ownerFields:{},previousFieldsSupplied:false,savedFieldsSupplied:false,approvedFieldsSupplied:false}:null,budget:rebuild?{monthlyCapCny:monthlyCap,costMonthCny}:null,baselineCompared:false,tokens:0,costCny:0,model:null as string|null,fields:null as Fields|null,membershipRequirement:null as unknown,validationIssues:[] as string[],review:null as SemanticReview|null,passed:false,baseline:null as Fields|null,savedFields:null as Fields|null,membershipComparison:null as ReturnType<typeof compareDiagnosticMembership>|null,errors:[] as string[]};
 const save=()=>{report.tokens=tokens;report.costCny=costCny;writeFileSync('fast-track-semantic-verification.json',JSON.stringify(report,null,2));};
 save();
 try{
  if(rebuild){
   const budget=await api<{costMonthCny:number}>('/budget');
   if(!Number.isFinite(monthlyCap)||monthlyCap<0||!Number.isFinite(budget.costMonthCny)||budget.costMonthCny<0)throw Error('Invalid shared model budget');
   costMonthCny=budget.costMonthCny;report.budget={monthlyCapCny:monthlyCap,costMonthCny};
  }
  let fields:Fields,sourceText:string,review:SemanticReview;
  if(rebuild){
   // Do not read saved fields, owner corrections or approved answers until extraction and review finish.
   const result=await rebuildFastTrackFields({id:input.job.id??id,platformId:input.job.platformId,platformName:input.job.platformName,url:input.job.url,benefit:input.job.benefit,note:input.job.note,membershipCatalog:input.membershipCatalog},options);
   report.model=result.model??null;report.fields=result.fields??null;report.membershipRequirement=result.fields?.membershipRequirement??null;
   if(result.fields){
    const context={platformId:input.job.platformId,url:input.job.url,benefit:input.job.benefit,note:input.job.note,sourceText:result.sourceText??''};
    report.validationIssues=fastTrackFieldIssues(result.fields,context);
    if(result.fields.membershipRequirement)report.validationIssues.push(...validateMembership(result.fields.membershipRequirement as MembershipRequirement,input.membershipCatalog));
   }
   if(result.error||result.catalogBlock||!result.fields||!result.semanticReview)throw Error(result.error??result.catalogBlock?.reason??'Rebuild did not finish extraction and semantic review');
   fields=result.fields;sourceText=result.sourceText??'';review=result.semanticReview;
  }else{
   fields=mergeFastTrackFields(input.fields,input.job.ownerFields,input.job.benefit,input.job.platformName);sourceText=input.sourceText;
   let result:Awaited<ReturnType<typeof reviewFastTrackFields>>|undefined,lastError:unknown;
   for(const tier of ['free','paid'] as const){
    if(tier==='free'&&!modelAvailable(false)||tier==='paid'&&!paidAvailable())continue;
    try{result=await reviewFastTrackFields(fields,{...input.job,sourceText},options,tier);break;}catch(e){lastError=e;}
   }
   if(!result)throw lastError??Error('No semantic review model available');
   fields=result.fields;review=result.review;report.model=review.model;
  }
  report.fields=fields;report.membershipRequirement=fields.membershipRequirement??null;report.review=review;
  const context={platformId:input.job.platformId,url:input.job.url,benefit:input.job.benefit,note:input.job.note,sourceText};
  report.validationIssues=[...fastTrackFieldIssues(fields,context),...semanticReviewIssues(fields,review,context)];
  if(fields.membershipRequirement)report.validationIssues.push(...validateMembership(fields.membershipRequirement as MembershipRequirement,input.membershipCatalog));
  report.errors.push(...report.validationIssues);
  // Saved and approved answers become visible only after the model has returned its complete result.
  report.savedFields=input.fields;
  if(input.offerId){
   const base=(process.env.API_BASE??'https://ai-yangmao.com').replace(/\/$/,'');
   const response=await fetch(`${base}/api/offers/${encodeURIComponent(input.offerId)}`,{signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error(`Baseline read failed: ${response.status}`);
   const {offer}=await response.json() as {offer:Fields};
   report.baseline=Object.fromEntries(['type','modalities','audience','requirements','membershipRequirement'].map(k=>[k,offer[k]]));
   for(const key of ['type','modalities','audience'])if(JSON.stringify(fields[key])!==JSON.stringify(offer[key]))report.errors.push(`Semantic result differs from approved baseline: ${key}`);
   if(Array.isArray(offer.requirements)&&offer.requirements.includes('net')&&!(fields.requirements as string[]).includes('net'))report.errors.push('Missing net compared with approved baseline');
   if(rebuild){report.membershipComparison=compareDiagnosticMembership(fields.membershipRequirement,offer.membershipRequirement,input.membershipCatalog);if(report.membershipComparison.equivalent===false)report.errors.push('Rebuilt membership eligibility differs from approved baseline');}
   report.baselineCompared=true;
  }
  report.passed=report.errors.length===0;save();
  if(!report.passed)throw Error(report.errors.join('; '));
  console.log('FAST_TRACK_SEMANTIC_VERIFIED',JSON.stringify(report));return report;
 }catch(error){if(!report.errors.length)report.errors.push(error instanceof Error?error.message:String(error));save();throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await verifyFastTrack();
