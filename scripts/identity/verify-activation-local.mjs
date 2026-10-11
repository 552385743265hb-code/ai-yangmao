// Synthetic data, real local Wrangler D1; no external calls.
import assert from 'node:assert/strict';
import {getPlatformProxy} from 'wrangler';
import worker from '../../src/worker/index.ts';
import {displayOffer} from '../../tests/fixtures/identity/offer.ts';
import {measureD1} from './metrics.ts';
const path=process.env.IDENTITY_ACTIVATION_PERSIST;
if(!path?.startsWith('.superpowers/sdd/activation-20261011/d1-'))throw new Error('fresh isolated D1 required');
const proxy=await getPlatformProxy({configPath:'tests/fixtures/identity/wrangler.jsonc',persist:{path:path+'/v3'}});
try{
const db=proxy.env.DB,measurements=[];
await db.prepare("INSERT INTO platforms(id,name,type,status,site) VALUES('vendor','Synthetic','lab','approved','https://vendor.example')").run();
const env={DB:db,ADMIN_TOKEN:'synthetic-admin-token',INGEST_TOKEN:'synthetic-ingest-token',IDENTITY_MODE:'off',IDENTITY_CANARY_PLATFORMS:'*',IDENTITY_HISTORY_ENVIRONMENT:'production',IDENTITY_HISTORY_SOURCE_SHA:'a'.repeat(40),HISTORICAL_MERGE_ENABLED:'true'};
const call=async(path,body,admin=false,status=200)=>{const m=measureD1(db);const r=await worker.fetch(new Request('https://local.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+(admin?'synthetic-admin-token':'synthetic-ingest-token'),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),{...env,DB:m.db},{});const value=await r.json();measurements.push({path,...m.snapshot()});assert.equal(r.status,status,JSON.stringify(value));return value;};
await call('ingest/offers',[displayOffer()]);await db.prepare("UPDATE offers SET review_state='approved'").run();
for(let i=0;i<99;i++)await db.prepare("INSERT INTO leads(origin,url,status,offer_id) VALUES('manual',?,'rejected','vendor-signup')").bind('https://local.test/'+i).run();
await db.prepare("INSERT INTO rejected_offer_updates(offer_id,evidence,diff) VALUES('vendor-signup',?,'[]')").bind(JSON.stringify(displayOffer().evidence)).run();
const before=await db.prepare('SELECT * FROM offers').first();
const apply=async(source)=>{const plan=await call('admin/identity/backfill/preview',source,true);await call('admin/identity/backfill/apply',{plan,approvedPlanHash:'b'.repeat(64)},true,403);assert.equal((await call('admin/identity/backfill/apply',{plan,approvedPlanHash:plan.planHash},true)).status,'applied');assert.equal((await call('admin/identity/backfill/apply',{plan,approvedPlanHash:plan.planHash},true)).status,'replayed');};
await apply({table:'offers',id:'vendor-signup'});await apply({table:'rejected_offer_updates',id:'1'});
let pending=await call('admin/identity/backfill/pending',undefined,true);for(const id of pending.leads)await apply({table:'leads',id:String(id)});
assert.deepEqual(await db.prepare('SELECT * FROM offers').first(),before);
env.IDENTITY_MODE='enforce';const replay=await call('ingest/offers',[{...displayOffer(),id:'new-extraction',identityRequestId:'historical-replay',sourceText:Object.values(displayOffer().evidence.excerpts).join('\n')}]);assert.equal(replay.results[0].identityReceipt.outcome,'duplicate_approved');
await db.prepare("INSERT INTO leads(id,origin,url,status) VALUES(1000,'manual','https://local.test/new','reviewing')").run();const page=await call('admin/leads?status=reviewing',undefined,true);const lead=page.leads.find(x=>x.id===1000);await call('admin/leads/1000/dismiss',{expectedVersion:lead.reviewVersion,reason:'Synthetic explicit refusal'},true);
pending=await call('admin/identity/backfill/pending',undefined,true);assert.deepEqual(pending.offers,[]);assert.deepEqual(pending.leads,[]);assert.deepEqual(pending.rejected_offer_updates,[]);
assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
console.log(JSON.stringify({status:'passed',measurements,originalOfferUnchanged:true,foreignKeys:true,models:0,externalMessages:0}));
}finally{await proxy.dispose();}
