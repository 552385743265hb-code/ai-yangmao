// Read-only public acceptance against a running local Worker or a deployment.
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const base=(process.argv[2]??'http://127.0.0.1:8770').replace(/\/$/,'');
const read=async(path,options)=>{const r=await fetch(base+path,{...options,signal:AbortSignal.timeout(30_000)});assert.equal(r.status,200,`${path}: HTTP ${r.status}`);return r;};
const privateFields=new Set(['reviewMemo','reviewSuggestion','officialReview','preparation','reviewVersion','identityGuards','marks','ADMIN_TOKEN']);
const checkPublic=value=>{if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){assert(!privateFields.has(key),'private field: '+key);checkPublic(item);}};
const started=Date.now();
assert.match(await (await read('/api/agent')).text(),/匿名只读/);
const skill=await (await read('/ai-yangmao-public/SKILL.md')).text();assert.match(skill,/name: ai-yangmao-public/);
assert.match(await (await read('/llms.txt')).text(),/api\/mcp/);
const client=new Client({name:'ai-yangmao-release-smoke',version:'1.0.0'});
try{
  await client.connect(new StreamableHTTPClientTransport(new URL(base+'/api/mcp')));
  const {tools}=await client.listTools();assert.equal(tools.length,4);assert(tools.every(t=>t.annotations.readOnlyHint));
  const args={status:'all',sort:'new',limit:3,profile:{student:false,phone:false,card:false}};
  const search=await client.callTool({name:'yangmao_search_offers',arguments:args});assert(!search.isError);
  const data=search.structuredContent;checkPublic(data);assert(data.offers.length>0);assert(data.offers.every(o=>o.summary&&o.detailUrl));
  assert(Buffer.byteLength(JSON.stringify(search))<100*1024);
  const http=await (await read('/api/agent/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args)})).json();
  assert.deepEqual(http.offers.map(o=>o.id),data.offers.map(o=>o.id));
  const detail=await client.callTool({name:'yangmao_get_offer',arguments:{id:data.offers[0].id,profile:args.profile}});assert(!detail.isError);checkPublic(detail.structuredContent);assert(detail.structuredContent.offer.evidence.url);
  const daily=await client.callTool({name:'yangmao_get_daily',arguments:{}});assert(!daily.isError);checkPublic(daily.structuredContent);
  const httpDaily=await (await read('/api/agent/daily')).json();assert.deepEqual(httpDaily,daily.structuredContent);
  const bad=await client.callTool({name:'yangmao_get_daily',arguments:{date:'2000-01-01'}});assert(bad.isError);
  const concurrent=await Promise.all(Array.from({length:8},()=>client.callTool({name:'yangmao_search_offers',arguments:{limit:1}})));assert(concurrent.every(r=>!r.isError));
  console.log(JSON.stringify({base,tools:tools.map(t=>t.name),matches:data.total,searchBytes:Buffer.byteLength(JSON.stringify(search)),dailyAvailable:httpDaily.available,dailyDay:httpDaily.report?.day,concurrentReads:8,privateFields:false,elapsedMs:Date.now()-started}));
}finally{await client.close();}
