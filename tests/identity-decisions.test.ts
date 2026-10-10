import { expect,it } from 'vitest';
import { decisionApplies,evaluateReopen,reviewTaskKey } from '../src/shared/identity/decision-policy';
import { terms,known } from './fixtures/identity/terms';
import type { ReviewDecision } from '../src/shared/identity/types';
function decision():ReviewDecision {return {id:'refusal-1',entityId:'e1',candidateId:'c1',versionId:'v1',action:'reject',reasonCode:'insufficient_evidence',scope:{kind:'exact_version',entityId:'e1',versionId:'v1'},reopenPolicy:{kind:'missing_facts',missingFacts:['benefitPools.vendor:api.amount']},rulesVersion:'rules-v1',evidenceRefs:['old-evidence'],actor:'admin',baseVersionId:null,targetVersionId:'v1',idempotencyKey:'d1',supersedesId:null,createdAt:'2026-10-10T10:00:00.000Z'};}
const evidence={observationId:'obs',fullText:'Signup grants 10 USD.',truncated:false,sourceVerified:true,quoteById:{'quote-1':'Signup grants 10 USD.'}};
it('A26 paid bundle scope does not suppress a genuinely independent grant',()=>{
 const d=decision();d.reasonCode='paid_bundle';d.scope={kind:'scoped_mechanism',productId:'vendor',mechanism:'recurring_quota',confirmedBy:'admin'};
 expect(decisionApplies(d,terms(),{entityId:'e1',candidateId:'different',versionId:'v1',observationId:'obs'})).toBe(false);
 const recurring=terms();recurring.mechanism=known('recurring_quota');recurring.costs=known({upfrontAmount:'10',currency:'USD',subscriptionRequired:true,autoRenewal:true});
 expect(decisionApplies(d,recurring,{entityId:'e1',candidateId:'different',versionId:'v1',observationId:'obs'})).toBe(true);
});
it('A26 only grounded official evidence for the specified missing slots permits reopening',async()=>{
 expect(await evaluateReopen(decision(),terms(),evidence)).toMatchObject({allowed:true,basisHash:expect.stringMatching(/^[a-f0-9]{64}$/)});
 const vague=terms();vague.benefitPools[0].amount={state:'unknown'};
 for(const proof of [{...evidence,sourceVerified:false},{...evidence,truncated:true},{...evidence,quoteById:{}}])expect((await evaluateReopen(decision(),terms(),proof)).allowed).toBe(false);
 expect((await evaluateReopen(decision(),vague,evidence)).allowed).toBe(false);
});
it('A26 new observation date or unrelated page changes cannot create a new reopen basis',async()=>{
 const a=await evaluateReopen(decision(),terms(),evidence);
 const b=await evaluateReopen(decision(),terms(),{...evidence,observationId:'new',fullText:evidence.fullText+' Navigation changed.'});
 expect(a.basisHash).toBe(b.basisHash);
});
it('A26 other and expired decisions never turn into platform-wide blacklists or implicit reopening',async()=>{
 const d=decision();d.reasonCode='other';d.scope={kind:'observation_only',observationId:'old'};d.reopenPolicy={kind:'manual',missingFacts:[]};
 expect(decisionApplies(d,terms(),{entityId:'e1',versionId:'v1',candidateId:'c1',observationId:'new'})).toBe(false);
 expect((await evaluateReopen(d,terms(),evidence)).allowed).toBe(false);
 d.reasonCode='expired';d.scope={kind:'occurrence',productId:'vendor',anchor:'old-round'};d.reopenPolicy={kind:'new_occurrence',missingFacts:[]};
 const facts=terms();facts.occurrenceAnchor=known('new-round');
 expect((await evaluateReopen(d,facts,{...evidence,fullText:'Campaign new-round opens today.',quoteById:{'quote-1':'Campaign new-round opens today.'}})).allowed).toBe(true);
 facts.occurrenceAnchor=known('old-round');expect((await evaluateReopen(d,facts,evidence)).allowed).toBe(false);
});
it('A17 initial and base-to-target tasks are stable while restoring an old version is a new transition',()=>{
 expect(reviewTaskKey({kind:'initial',entityId:'e1'})).toBe('initial:e1');
 expect(reviewTaskKey({kind:'terms_change',entityId:'e1',baseVersionId:'vB',versionId:'vA'})).toBe('terms:e1:vB:vA');
 expect(reviewTaskKey({kind:'terms_change',entityId:'e1',baseVersionId:'vB',versionId:'vA'})).not.toBe(reviewTaskKey({kind:'terms_change',entityId:'e1',baseVersionId:'vA',versionId:'vB'}));
});
it('A26 a paid recurring bundle refusal cannot suppress a free recurring grant on the same product',()=>{
 const d=decision();d.reasonCode='paid_bundle';d.scope={kind:'scoped_mechanism',productId:'vendor',mechanism:'recurring_quota',confirmedBy:'admin'};
 const free=terms();free.mechanism=known('recurring_quota');free.costs=known({upfrontAmount:'0',currency:'USD',subscriptionRequired:false,autoRenewal:false});
 expect(decisionApplies(d,free,{entityId:null,candidateId:'new-free',versionId:null,observationId:'new'})).toBe(false);
});
