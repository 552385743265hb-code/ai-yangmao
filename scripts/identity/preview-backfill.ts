import {pathToFileURL} from 'node:url';
import {readApprovedJson,argument} from './store';
import {buildBackfillPlan} from './backfill';
export async function main(args=process.argv.slice(2)){
 if(args.includes('--apply'))throw new Error('backfill preview is read-only; no apply authorization');
 const environment=argument(args,'--environment'),snapshot=readApprovedJson(argument(args,'--input'),environment);if(snapshot.context?.environment!==environment)throw new Error('environment mismatch');
 const cursor=argument(args,'--cursor');console.log(JSON.stringify(await buildBackfillPlan(snapshot,cursor?JSON.parse(cursor):null),null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
