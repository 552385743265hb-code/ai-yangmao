import {z} from 'zod';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {canonicalTermsSchema,evidenceContextSchema,versionedEntitySchema} from '../../src/shared/identity/types';
import {compareCandidate} from '../../src/shared/identity/compare';
import {sha256,stableJson} from '../../src/shared/identity/normalize';
import {argument} from './store';
const labelSchema=z.enum(['SAME_EQUIVALENT','DISTINCT','SAME_CHANGED','UNRESOLVED']);
type Label=z.infer<typeof labelSchema>;
export const corpusSchema=z.strictObject({
 schemaVersion:z.literal('identity-corpus-v1'),environment:z.enum(['synthetic','redacted_local']),datasetVersion:z.string().min(1),approvedBy:z.string().min(1),frozenAt:z.iso.datetime(),
 pairs:z.array(z.strictObject({id:z.string().min(1),label:labelSchema,labelAuthor:z.string().min(1),labelEvidence:z.string().min(1),crossLanguageOrSource:z.boolean(),candidate:canonicalTermsSchema,entity:versionedEntitySchema,evidence:evidenceContextSchema})).max(1000),
}).refine(c=>new Set(c.pairs.map(p=>p.id)).size===c.pairs.length,'pair IDs must be unique');
export async function corpusHash(input:unknown){return sha256(stableJson(corpusSchema.parse(input)));}
const ratio=(numerator:number,denominator:number)=>({numerator,denominator,rate:denominator?numerator/denominator:null});
export function summarizePredictions(rows: {label:Label;predicted:Label}[]){
 const same=(x:Label)=>x==='SAME_EQUIVALENT'||x==='SAME_CHANGED';
 return {automaticPrecision:ratio(rows.filter(r=>same(r.predicted)&&r.predicted===r.label).length,rows.filter(r=>same(r.predicted)).length),
 duplicateRecall:ratio(rows.filter(r=>r.label==='SAME_EQUIVALENT'&&r.predicted===r.label).length,rows.filter(r=>r.label==='SAME_EQUIVALENT').length),
 changedRecall:ratio(rows.filter(r=>r.label==='SAME_CHANGED'&&r.predicted===r.label).length,rows.filter(r=>r.label==='SAME_CHANGED').length),
 uncertainRate:ratio(rows.filter(r=>r.predicted==='UNRESOLVED').length,rows.length),
 falseMerge:rows.filter(r=>r.label==='DISTINCT'&&same(r.predicted)).length,
 // The pure resolver does not execute decisions/tasks. Never infer these workflow metrics.
 falseReject:null,duplicateReviewLeak:null};
}
export async function evaluateCorpus(input:unknown,approvedHash:string){
 const c=corpusSchema.parse(input),hash=await corpusHash(c);if(hash!==approvedHash)throw new Error('frozen corpus hash mismatch');
 const rows=c.pairs.map(p=>{const verdict=compareCandidate(p.candidate,p.entity,p.evidence);const predicted:Label=verdict.relation==='SAME'&&verdict.termsRelation!=='INSUFFICIENT'?`SAME_${verdict.termsRelation}`:verdict.relation==='DISTINCT'?'DISTINCT':'UNRESOLVED';return {id:p.id,label:p.label,predicted,reasonCodes:verdict.reasonCodes};});
 const counts=Object.fromEntries(labelSchema.options.map(label=>[label,rows.filter(p=>p.label===label).length])) as Record<Label,number>;
 const crossLanguageOrSource=c.pairs.filter(p=>p.label==='SAME_EQUIVALENT'&&p.crossLanguageOrSource).length;
 const cohortSufficient=counts.SAME_EQUIVALENT>=20&&counts.DISTINCT>=20&&counts.SAME_CHANGED>=10&&counts.UNRESOLVED>=10&&crossLanguageOrSource>=8;
 const metrics=summarizePredictions(rows);
 const semanticGate=cohortSufficient&&metrics.duplicateRecall.rate!>=0.9&&metrics.falseMerge===0&&metrics.changedRecall.rate===1&&rows.filter(p=>p.label==='UNRESOLVED').every(p=>p.predicted==='UNRESOLVED')&&rows.filter(p=>p.label==='SAME_EQUIVALENT').every(p=>p.predicted==='SAME_EQUIVALENT'||p.predicted==='UNRESOLVED');
 return {schemaVersion:'identity-evaluation-v1',environment:c.environment,corpusHash:hash,datasetVersion:c.datasetVersion,counts,crossLanguageOrSource,cohortSufficient,metrics,semanticGate:semanticGate?'passed':'not_met',fieldAcceptance:'not_evaluated',
  limitations:['Pure resolver only: task/publication/refusal outcomes require separate workflow replay.',...(c.environment==='synthetic'?['Synthetic labels cannot establish field quality.']:[]),...(!cohortSufficient?['Required labelled cohort is incomplete.']:[])],modelCalls:0,modelTokens:0,modelCostUsd:0,rows};
}
export async function main(args=process.argv.slice(2)){
 const input=argument(args,'--input'),environment=argument(args,'--environment');if(!input||!['synthetic','redacted_local'].includes(environment??'')||args.includes('--apply'))throw new Error('explicit local --input and --environment required; read-only evaluation');
 const corpus=corpusSchema.parse(JSON.parse(readFileSync(input,'utf8')));if(corpus.environment!==environment)throw new Error('environment mismatch');
 const hash=argument(args,'--hash');console.log(JSON.stringify(hash?await evaluateCorpus(corpus,hash):{mode:'preview',corpusHash:await corpusHash(corpus),pairCount:corpus.pairs.length,fieldAcceptance:'not_evaluated'},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
