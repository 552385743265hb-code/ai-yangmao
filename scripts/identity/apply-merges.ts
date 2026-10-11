import {pathToFileURL} from 'node:url';
import {argument,openHistoryInput,readApprovedJson} from './store';
import {mergePlanSchema,historyEnvironment,entityManifestSchema,type MergeReceipt} from '../../src/shared/identity/history-types';
import {buildMergePlan,readEntityManifests} from '../../src/worker/identity/merge-plan';
import {IdentityMergeService} from '../../src/worker/identity/merge';
import {stableJson} from '../../src/shared/identity/normalize';
export async function main(args=process.argv.slice(2)){
 const input=argument(args,'--input'),environment=argument(args,'--environment'),apply=args.includes('--apply'),requestId=argument(args,'--request-id'),actor=argument(args,'--actor'),rollback=argument(args,'--rollback');
 if(!input||!environment)throw new Error('--input and explicit --environment required; no production endpoint');
 const env=historyEnvironment.parse(environment);
 if(apply&&(!requestId||!actor))throw new Error('--request-id and --actor required for isolated apply');
 if(rollback){
  const revision=Number(argument(args,'--revision'));if(!Number.isSafeInteger(revision)||revision<0)throw new Error('expected --revision required');
  if(apply&&argument(args,'--approve-operation')!==rollback)throw new Error('exact --approve-operation required');
  const opened=openHistoryInput(input,environment,{writable:apply});try{
   if(apply)console.log(JSON.stringify(await new IdentityMergeService(opened.db,{environment:env,enabled:true,actor:actor!}).rollbackMerge(rollback,revision,requestId!),null,2));
   else {const op=await opened.db.prepare('SELECT o.*,p.plan_json FROM merge_operations o JOIN merge_plans p ON p.plan_hash=o.plan_hash WHERE o.id=?').bind(rollback).first<Record<string,unknown>>();if(!op)throw new Error('operation missing');if(mergePlanSchema.parse(JSON.parse(String(op.plan_json))).environment!==env)throw new Error('environment mismatch');const expected=entityManifestSchema.array().parse(JSON.parse(String(op.after_manifest)).expected),current=await readEntityManifests(opened.db,expected.map(m=>String(m.entity.id)));console.log(JSON.stringify({mode:'dry-run',operationId:rollback,expectedRevision:revision,conflicts:op.state!=='applied'||op.revision!==revision||stableJson(current)!==stableJson(expected)?[{code:'rollback_conflict',detail:'operation or related state changed'}]:[],writes:0},null,2));}
  }finally{opened.close();}return;
 }
 const plan=mergePlanSchema.parse(readApprovedJson(argument(args,'--plan'),environment));if(plan.environment!==env)throw new Error('environment mismatch');
 if(apply&&argument(args,'--approve-plan')!==plan.planHash)throw new Error('exact --approve-plan required');
 const opened=openHistoryInput(input,environment,{writable:apply});try{
  if(!apply){const current=await buildMergePlan(opened.db,{environment:env,snapshotHash:plan.snapshotHash,sourceCodeSha:plan.sourceCodeSha,groups:plan.groups.map(g=>({entityIds:g.entityIds,canonicalEntityId:g.canonicalEntityId,canonicalReason:g.canonicalReason,evidence:g.evidence}))});console.log(JSON.stringify({mode:'dry-run',writes:0,...current},null,2));return;}
  const service=new IdentityMergeService(opened.db,{environment:env,enabled:true,actor:actor!}),receipts:MergeReceipt[]=[];
  for(const group of plan.groups){const receipt=await service.applyMerge(plan,requestId!,plan.planHash,group.id);receipts.push(receipt);if(receipt.status==='conflict')break;}
  console.log(JSON.stringify({mode:'isolated-apply',planHash:plan.planHash,receipts,remainingGroups:plan.groups.slice(receipts.length).map(g=>g.id)},null,2));if(receipts.some(r=>r.status==='conflict'))process.exitCode=1;
 }finally{opened.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
