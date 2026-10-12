// Synthetic-only check of approved-offer contract lifecycle on real local Wrangler D1.
import assert from 'node:assert/strict';
import {getPlatformProxy} from 'wrangler';
import worker from '../../src/worker/index.ts';
import {displayOffer} from '../../tests/fixtures/identity/offer.ts';
import {measureD1} from './metrics.ts';

const path=process.env.IDENTITY_STALE_PERSIST;
if(!path?.startsWith('.superpowers/sdd/identity-review-clarity/d1-stale-'))throw new Error('fresh synthetic D1 path required');
const proxy=await getPlatformProxy({configPath:'tests/fixtures/identity/wrangler.jsonc',persist:{path:path+'/v3'}});
try{
 const db=proxy.env.DB,measurements=[];
 await db.prepare("INSERT INTO platforms(id,name,type,status,site) VALUES('vendor','Synthetic vendor','lab','approved','https://vendor.example')").run();
 await db.prepare("INSERT INTO sources(id,platform_id,kind,url,tier) VALUES('vendor-source','vendor','web_list','https://vendor.example/pricing','site')").run();
 const env={DB:db,ADMIN_TOKEN:'local-admin-token',INGEST_TOKEN:'local-ingest-token',IDENTITY_MODE:'off'};
 const call=async(path,body,admin=false)=>{
  const m=measureD1(db),response=await worker.fetch(new Request('https://local.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+(admin?env.ADMIN_TOKEN:env.INGEST_TOKEN),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),{...env,DB:m.db},{});
  const data=await response.json();measurements.push({path,status:response.status,...m.snapshot()});assert.equal(response.status,200,JSON.stringify(data));return data;
 };
 const original=displayOffer(),base={...original,evidence:{...original.evidence,url:'https://vendor.example/pricing',pageHash:'a'.repeat(64)}};
 const stale={...base,id:'stale-synthetic',title:'Synthetic previously approved benefit'};
 await call('ingest/offers',[stale]);await call('admin/offers/'+stale.id+'/approve',{},true);
 const before=await db.prepare('SELECT last_verified_at,verify_result,updated_at FROM offers WHERE id=?').bind(stale.id).first();
 const failed=await call('ingest/verify',{offerId:stale.id,url:stale.evidence.url,finalUrl:stale.evidence.url,text:'Official page no longer contains the saved benefit sentence.',trustedDirect:true,pageHash:'b'.repeat(64),processedChange:true});assert.deepEqual({verified:failed.verified,notRequired:failed.notRequired},{verified:false,notRequired:true});
 assert.deepEqual(await db.prepare('SELECT last_verified_at,verify_result,updated_at FROM offers WHERE id=?').bind(stale.id).first(),before);
 assert.deepEqual((await call('ingest/verification-queue?force=1')).offers,[]);
 const queue=await call('admin/queue',undefined,true);assert.equal(queue.pending.some(item=>item.id===stale.id),false);assert.equal(queue.needsVerification.some(item=>item.id===stale.id),false);
 assert.equal((await call('offers/'+stale.id)).offer.status,'active');
 const present={...base,id:'present-synthetic',title:'Synthetic benefit with changed page footer',evidence:{...base.evidence,url:'https://vendor.example/other'}};
 await call('ingest/offers',[present]);await call('admin/offers/'+present.id+'/approve',{},true);
 const check=await call('ingest/verify',{offerId:present.id,url:present.evidence.url,finalUrl:present.evidence.url,text:Object.values(present.evidence.excerpts).join('\n')+'\nUnrelated footer changed.',trustedDirect:true,pageHash:'c'.repeat(64),processedChange:false});
 assert.deepEqual({verified:check.verified,notRequired:check.notRequired,unchanged:check.unchanged},{verified:false,notRequired:true,unchanged:true});
 const next=await call('admin/queue',undefined,true);assert.equal(next.needsVerification.some(item=>item.id===present.id),false);
 const tomorrow=new Date(Date.now()+86400_000).toISOString().slice(0,10),yesterday=new Date(Date.now()-86400_000).toISOString().slice(0,10);
 const dated={...base,id:'dated-synthetic',title:'Synthetic dated benefit',claimStart:yesterday,claimEnd:tomorrow,endKind:'date',evidence:{...base.evidence,url:'https://vendor.example/dated'}};
 await call('ingest/offers',[dated]);await call('admin/offers/'+dated.id+'/approve',{},true);
 await db.prepare("UPDATE offers SET last_verified_at='2025-01-01T00:00:00Z',verify_result='evidence_missing' WHERE id=?").bind(dated.id).run();
 assert.equal((await call('offers/'+dated.id)).offer.status,'ending');
 await db.prepare('UPDATE offers SET claim_end=? WHERE id=?').bind(yesterday,dated.id).run();
 assert.equal((await call('offers/'+dated.id)).offer.status,'ended');
 assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 assert.ok(measurements.every(item=>item.statements<=50));
 console.log(JSON.stringify({status:'passed',checks:measurements.length,maxStatements:Math.max(...measurements.map(item=>item.statements)),approvalRetained:true,legacyProbeReadOnly:true,datedOfferBecomesHistory:true,externalFetches:0}));
}finally{await proxy.dispose();}
