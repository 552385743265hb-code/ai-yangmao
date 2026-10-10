import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {openHistoryInput,argument} from './store';
import {buildMergePlan} from '../../src/worker/identity/merge-plan';
export {buildMergePlan};
export async function main(args=process.argv.slice(2)){
 if(args.includes('--apply'))throw new Error('this command only previews; apply needs separate exact-plan authorization');
 const input=argument(args,'--input'),environment=argument(args,'--environment'),groups=argument(args,'--groups');
 if(!groups)throw new Error('--groups JSON with explicit evidence and canonical choice is required');
 const request=JSON.parse(readFileSync(groups,'utf8'));if(request.environment!==environment)throw new Error('environment mismatch');
 const opened=openHistoryInput(input,environment);try{console.log(JSON.stringify(await buildMergePlan(opened.db,request),null,2));}finally{opened.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
