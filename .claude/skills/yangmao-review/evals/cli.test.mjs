// 本地假 API；不连接生产、不使用真实凭据。项目根目录运行 node --test <本文件>。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('../scripts/offer.ts', import.meta.url));
const view = { id:'synthetic',code:'test',platformId:'synthetic',platform:'合成',title:'合成权益',type:'standing',value:'每日60积分',reviewVersion:'v1',reviewState:'approved',status:'active',requirements:['none'],excerpts:{benefit:'60 credits'},evidenceUrl:'https://example.invalid',evidenceTier:'site',checks:[],updateDiff:[{field:'valueText',from:'每日60积分',to:'每日80积分'}] };
async function run(args, { conflict = false } = {}) {
  const requests = [];
  const server = createServer(async (req, res) => {
    let body=''; for await (const part of req) body += part;
    requests.push({method:req.method,url:req.url,body:body ? JSON.parse(body) : null});
    res.setHeader('Content-Type','application/json');
    if (req.method === 'GET') res.end(JSON.stringify({offer:view,pendingUpdate:true,revisions:[]}));
    else if (conflict) { res.statusCode=409; res.end(JSON.stringify({error:'内容已更新'})); }
    else res.end(JSON.stringify({ok:true}));
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  try {
    const child=spawn(process.execPath,['--import','tsx',cli,...args],{env:{...process.env,ADMIN_TOKEN:'synthetic-test-token-only',YM_API:`http://127.0.0.1:${server.address().port}`}});
    let output=''; child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
    const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve)});
    return {code,output,requests};
  } finally { await new Promise(resolve=>server.close(resolve)); }
}
for (const command of ['apply','approve','reject']) test(`${command} 没有审核版本不发请求`, async () => {
  const r=await run([command,'test','/nonexistent','--code','duplicate','--reason','合成']);
  assert.equal(r.code,1);assert.match(r.output,/必须传 --version/);assert.equal(r.requests.length,0);
});
test('show 明确候选并展示原版差异和版本',async()=>{
  const r=await run(['show','test']);assert.equal(r.code,0);assert.match(r.output,/reviewVersion：v1/);assert.match(r.output,/下列字段是候选/);assert.match(r.output,/每日60积分/);assert.match(r.output,/每日80积分/);assert.equal(r.requests.length,1);
});
test('apply 旧版本不提交补丁',async()=>{
  const r=await run(['apply','test','/nonexistent','--version','v0','--reason','合成']);assert.equal(r.code,1);assert.match(r.output,/不提交旧补丁/);assert.deepEqual(r.requests.map(x=>x.method),['GET']);
});
test('apply 正确版本只改指定字段并保持待审',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'yangmao-review-test-'));const patch=join(dir,'patch.json');writeFileSync(patch,JSON.stringify({valueText:'每日80积分'}));
  try { const r=await run(['apply','test',patch,'--version','v1','--reason','官方权益变化']);assert.equal(r.code,0);const post=r.requests.find(x=>x.method==='POST');assert.equal(post.body.expectedReviewVersion,'v1');assert.deepEqual(post.body.fields,{valueText:'每日80积分'});assert.equal(post.body.approve,false); } finally {rmSync(dir,{recursive:true});}
});
test('approve 并发409不刷新版本重放',async()=>{
  const r=await run(['approve','test','--version','v1'],{conflict:true});assert.equal(r.code,1);assert.match(r.output,/409/);assert.equal(r.requests.length,1);assert.equal(r.requests[0].body.expectedReviewVersion,'v1');
});
test('reject 保留理由并传审核版本',async()=>{
  const r=await run(['reject','test','--version','v1','--code','duplicate','--reason','同一活动主ID：canonical']);assert.equal(r.code,0);assert.equal(r.requests[0].body.expectedReviewVersion,'v1');assert.equal(r.requests[0].body.reasonCode,'duplicate');assert.match(r.requests[0].body.reason,/canonical/);
});
test('R04 unpublish 没有可见性版本不发请求',async()=>{const r=await run(['unpublish','test','--reason','已核对下架']);assert.equal(r.code,1);assert.match(r.output,/必须传 --version/);assert.equal(r.requests.length,0);});
test('R04 unpublish 传入明确版本且409不刷新重试',async()=>{const version='entity:synthetic:4:2026-10-10T00:00:00Z';const r=await run(['unpublish','test','--version',version,'--reason','已核对下架'],{conflict:true});assert.equal(r.code,1);assert.equal(r.requests.length,1);assert.equal(r.requests[0].body.expectedReviewVersion,version);});
test('R05 reopen 需要明确版本且只打开新审核任务',async()=>{const missing=await run(['reopen','test','--reason','明确重新核验暂停的公开活动']);assert.equal(missing.code,1);assert.equal(missing.requests.length,0);const r=await run(['reopen','test','--version','entity:e:9:time','--reason','明确重新核验暂停的公开活动']);assert.equal(r.code,0);assert.equal(r.requests[0].url,'/offers/test/reopen-visibility');assert.equal(r.requests[0].body.expectedReviewVersion,'entity:e:9:time');assert.equal(r.requests[0].body.approve,undefined);});
