import {z} from 'zod';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {relative} from 'node:path';
import {argument} from './store';
const reporterSchema=z.object({success:z.boolean(),testResults:z.array(z.object({name:z.string(),assertionResults:z.array(z.object({fullName:z.string(),status:z.string()}))}))});
/** Consumes executed Vitest assertions, not source-code ID presence. Human subcase review remains necessary. */
export function acceptanceReport(input:unknown){
 const report=reporterSchema.parse(input);
 const scenarios=Array.from({length:45},(_,index)=>{const id=`A${String(index+1).padStart(2,'0')}`;
  const tests=report.testResults.flatMap(file=>file.assertionResults.filter(t=>new RegExp(`\\b${id}\\b`).test(t.fullName)).map(t=>({file:file.name.startsWith('/')?relative(process.cwd(),file.name):file.name,name:t.fullName,status:t.status})));
  const status=tests.some(t=>t.status==='failed')?'failed':tests.length&&tests.every(t=>t.status==='passed')?'passed':'incomplete';return {id,taggedTestsStatus:status,contractCoverage:'not_established_by_reporter',tests};});
 return {schemaVersion:'identity-acceptance-v2',contractCoverage:'not_established_by_reporter',taggedTestsStatus:!report.success||scenarios.some(s=>s.taggedTestsStatus==='failed')?'failed':scenarios.every(s=>s.taggedTestsStatus==='passed')?'passed':'incomplete',
  scope:'Only executed tagged assertions. Complete contract subcase coverage requires an explicit separate review; not human-corpus or production acceptance.',scenarios};
}
export function main(args=process.argv.slice(2)){const input=argument(args,'--input');if(!input)throw new Error('explicit local Vitest JSON --input required');const report=acceptanceReport(JSON.parse(readFileSync(input,'utf8')));console.log(JSON.stringify(report,null,2));if(report.taggedTestsStatus!=='passed')process.exitCode=1;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)try{main();}catch(e){console.error(e instanceof Error?e.message:String(e));process.exitCode=1;}
