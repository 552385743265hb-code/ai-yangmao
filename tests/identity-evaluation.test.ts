import {expect,it} from 'vitest';
import {evaluateCorpus,corpusHash,summarizePredictions} from '../scripts/identity/evaluate';
import {measureD1} from '../scripts/identity/metrics';
import {known,terms} from './fixtures/identity/terms';
import {identityDb} from './fixtures/identity/db';
function corpus(){const facts=terms();facts.occurrenceAnchor=known('campaign');return {schemaVersion:'identity-corpus-v1',environment:'synthetic',datasetVersion:'fixture-v1',approvedBy:'fixture-author',frozenAt:'2026-10-10T00:00:00Z',pairs:[{id:'one',label:'SAME_EQUIVALENT',labelAuthor:'fixture-author',labelEvidence:'Explicit same campaign and grant.',crossLanguageOrSource:true,candidate:facts,entity:{id:'old',platformId:'vendor',revision:1,publicationRevision:1,approvedVersionId:'v1',terms:facts},evidence:{observationId:'o1',fullText:'campaign grants 10 USD',truncated:false,sourceVerified:true,quoteById:{'quote-1':'campaign grants 10 USD'}}}]};}
it('frozen corpus hash rejects tampered labels and duplicate IDs; synthetic data never passes the field gate',async()=>{
 const input=corpus(),hash=await corpusHash(input);const report=await evaluateCorpus(input,hash);
 expect(report.counts.SAME_EQUIVALENT).toBe(1);expect(report.metrics.automaticPrecision).toEqual({numerator:1,denominator:1,rate:1});expect(report.fieldAcceptance).toBe('not_evaluated');expect(report.cohortSufficient).toBe(false);
 const tampered=structuredClone(input);tampered.pairs[0].label='DISTINCT';await expect(evaluateCorpus(tampered,hash)).rejects.toThrow('hash');
 const repeated=structuredClone(input);repeated.pairs.push(repeated.pairs[0]);await expect(corpusHash(repeated)).rejects.toThrow('unique');
});
it('precision recall and uncertain rates expose denominators and false merges instead of hiding abstentions',()=>{
 const result=summarizePredictions([{label:'SAME_EQUIVALENT',predicted:'SAME_EQUIVALENT'},{label:'SAME_EQUIVALENT',predicted:'UNRESOLVED'},{label:'DISTINCT',predicted:'SAME_EQUIVALENT'},{label:'SAME_CHANGED',predicted:'SAME_CHANGED'},{label:'UNRESOLVED',predicted:'UNRESOLVED'}].map(r=>({...r,relation:r.predicted.startsWith('SAME')?'SAME':r.predicted,termsRelation:r.predicted.startsWith('SAME')?r.predicted.slice(5):'INSUFFICIENT'})) as any);
 expect(result.automaticPrecision).toEqual({numerator:2,denominator:3,rate:2/3});expect(result.duplicateRecall).toEqual({numerator:1,denominator:2,rate:0.5});expect(result.uncertainRate.rate).toBe(0.4);expect(result.falseMerge).toBe(1);expect(result.falseReject).toBeNull();expect(result.duplicateReviewLeak).toBeNull();expect(summarizePredictions([]).automaticPrecision.rate).toBeNull();
});
it('D1 metrics preserve duplicate-column raw results and count batch statements once; absent metadata is unknown',async()=>{
 const f=identityDb(),m=measureD1(f.db);await m.db.prepare('SELECT 1 AS one').first();
 expect(await m.db.prepare('SELECT 1 AS x,2 AS x').raw()).toEqual([[1,2]]);
 await m.db.batch([m.db.prepare('SELECT 1'),m.db.prepare('SELECT 2')]);
 expect(m.snapshot()).toMatchObject({statements:4,rowsRead:null,rowsWritten:null,metadataStatements:0,metadataMissing:4,errors:0});f.sqlite.close();
});
it('D1 metrics aggregate measured row metadata without converting failures to zero',async()=>{
 const f=identityDb(),db=new Proxy(f.db,{get(t,k){if(k==='prepare')return ()=>({all:async()=>({results:[],meta:{rows_read:7,rows_written:2}}),first:async()=>{throw new Error('fault');}});return Reflect.get(t,k);}}),m=measureD1(db);
 await m.db.prepare('metadata').all();await expect(m.db.prepare('failed').first()).rejects.toThrow('fault');
 expect(m.snapshot()).toMatchObject({statements:2,rowsRead:7,rowsWritten:2,metadataStatements:1,metadataMissing:1,errors:1});f.sqlite.close();
});
it('acceptance report cannot pass merely from scenario IDs when a covered test is skipped or fails',async()=>{
 const {acceptanceReport}=await import('../scripts/identity/acceptance-report');
 const assertions=Array.from({length:45},(_,i)=>({fullName:`A${String(i+1).padStart(2,'0')} real behavior`,status:'passed'}));
 const result=acceptanceReport({success:true,testResults:[{name:'tests/identity-example.test.ts',assertionResults:assertions}]});expect(result.taggedTestsStatus).toBe('passed');expect(result.scenarios).toHaveLength(45);
 assertions[44].status='pending';expect(acceptanceReport({success:true,testResults:[{name:'a',assertionResults:assertions}]}).taggedTestsStatus).toBe('incomplete');
 assertions[0].status='failed';expect(acceptanceReport({success:false,testResults:[{name:'a',assertionResults:assertions}]}).taggedTestsStatus).toBe('failed');
 expect(acceptanceReport({success:true,testResults:[]}).taggedTestsStatus).toBe('incomplete');
});
it('the frozen four-pair synthetic example has a genuine old-to-new changed pair and remains below the field cohort',async()=>{
 const {readFileSync}=await import('node:fs');const sample=JSON.parse(readFileSync(new URL('./fixtures/identity/evaluation-synthetic.json',import.meta.url),'utf8'));
 const changed=sample.pairs.find((p:any)=>p.label==='SAME_CHANGED');expect(changed.entity.terms.benefitPools[0].amount.value.value).toBe('10');expect(changed.candidate.benefitPools[0].amount.value.value).toBe('20');
 const distinct=sample.pairs.find((p:any)=>p.label==='DISTINCT');expect(distinct.entity.terms.issuerProductId.value).toBe(distinct.entity.platformId);expect(distinct.candidate.issuerProductId.value).toBe('other');
 const report=await evaluateCorpus(sample,await corpusHash(sample));expect(report.metrics.changedRecall.rate).toBe(1);expect(report.fieldAcceptance).toBe('not_evaluated');
});
it('raw SAME with insufficient terms still counts as a false identity match for a DISTINCT gold control',async()=>{
 const input=corpus();input.pairs[0].entity.terms=structuredClone(input.pairs[0].entity.terms);input.pairs[0].label='DISTINCT';Object.assign(input.pairs[0].evidence,{confirmedEntityId:'old'});input.pairs[0].candidate.benefitPools[0].amount={state:'unknown'} as any;
 input.pairs[0].evidence.fullText='Umbrella campaign campaign: a separate student signup bonus grants 20 USD.';input.pairs[0].evidence.quoteById['quote-1']=input.pairs[0].evidence.fullText;
 const report=await evaluateCorpus(input,await corpusHash(input));expect(report.metrics.falseMerge).toBe(1);expect(report.metrics.automaticPrecision.denominator).toBe(1);expect(report.rows[0]).toMatchObject({relation:'SAME',termsRelation:'INSUFFICIENT'});expect(report.semanticGate).toBe('not_met');
});
it('tagged test results never assert complete contract subcase coverage',async()=>{
 const {acceptanceReport}=await import('../scripts/identity/acceptance-report');const report=acceptanceReport({success:true,testResults:[{name:'a',assertionResults:[{fullName:'A24 one sequential case',status:'passed'}]}]});expect(report.scenarios[23].taggedTestsStatus).toBe('passed');expect(report.scenarios[23].contractCoverage).toBe('not_established_by_reporter');expect(report.scenarios[23]).not.toHaveProperty('status');
});
