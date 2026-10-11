// Synthetic-only 0029 -> current schema upgrade, driven by explicit local Wrangler migrations.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {getPlatformProxy} from 'wrangler';
import {drizzle} from 'drizzle-orm/d1';
import {offers} from '../../src/db/schema.ts';
import {displayOffer} from '../../tests/fixtures/identity/offer.ts';
import {terms,known} from '../../tests/fixtures/identity/terms.ts';
import {hashTerms,sha256,stableJson} from '../../src/shared/identity/normalize.ts';
import {IdentityStore} from '../../src/worker/identity/store.ts';
const path=process.env.IDENTITY_UPGRADE_PERSIST,action=process.argv[2];
if(!path?.startsWith('.superpowers/sdd/acceptance-audit-4371ea0/d1-upgrade-')||!['seed','verify'].includes(action))throw new Error('explicit isolated synthetic upgrade required');
const proxy=await getPlatformProxy({configPath:'tests/fixtures/identity/wrangler.jsonc',persist:{path:path+'/v3'}});
try{
 const db=proxy.env.DB,text='Campaign upgrade grants students and businesses independent rewards.',facts=terms();facts.occurrenceAnchor=known('upgrade');
 const raw={...displayOffer(),requirements:['student']},span={start:0,end:text.length,quote:text},quotes=[{id:'quote-1',...span}],family=await sha256(stableJson(['old-observation','upgrade-v1',`0:${text.length}`,'signup_grant']));
 const tables=['offers','reviews','deliveries','source_observations','intake_candidates'];
 if(action==='seed'){
  await db.prepare("INSERT INTO platforms(id,name,type,status,site) VALUES('vendor','Synthetic upgrade','lab','approved','https://vendor.example')").run();
  await db.prepare("INSERT INTO sources(id,platform_id,kind,url,tier) VALUES('vendor-source','vendor','web_list','https://vendor.example/rewards','site')").run();
  await drizzle(db).insert(offers).values({...displayOffer(),reviewState:'approved'});
  await db.prepare("INSERT INTO reviews(offer_id,action,reviewer,reason) VALUES('vendor-signup','approve','admin','Preserve human decision')").run();
  await db.prepare("INSERT INTO deliveries(id,fingerprint,channel,kind,status,payload) VALUES('old-unknown','old-unknown','telegram','digest','unknown','{\"marks\":[]}')").run();
  await db.prepare("INSERT INTO source_documents(id,original_url,url_key) VALUES('old-document','https://vendor.example/rewards','upgrade')").run();
  await db.prepare("INSERT INTO source_observations(id,document_id,content_hash,text,text_truncated,fetch_kind,final_url,observed_at,last_seen_at,trust_json) VALUES('old-observation','old-document',?, ?,0,'direct','https://vendor.example/rewards','2026-10-10T00:00:00Z','2026-10-10T00:00:00Z',?)").bind(await sha256(text),text,JSON.stringify({sourceVerified:true,productId:'vendor'})).run();
  const receipt={inputId:'original',candidateId:'old-candidate',canonicalOfferId:null,entityId:null,versionId:null,decisionId:null,taskId:null,outcome:'deferred',retryable:true,reasonCodes:['retained-original']};
  await db.prepare("INSERT INTO intake_candidates(id,observation_id,extraction_version,span_key,candidate_key,facts_json,facts_hash,raw_candidate_json,receipt_json) VALUES('old-candidate','old-observation','upgrade-v1',?,?,?,?,?,?)").bind(`0:${text.length}`,family,JSON.stringify(facts),await hashTerms(facts),JSON.stringify({candidate:raw,span,quotes}),JSON.stringify(receipt)).run();
  const snapshot={};for(const table of tables)snapshot[table]=(await db.prepare('SELECT * FROM '+table).all()).results;writeFileSync(path+'/original.json',JSON.stringify(snapshot));console.log(JSON.stringify({schema:'0029',syntheticSnapshot:'saved',tables}));
 }else{
  const before=JSON.parse(readFileSync(path+'/original.json','utf8'));
  for(const table of tables){const after=(await db.prepare('SELECT * FROM '+table).all()).results;assert.equal(after.length,before[table].length);assert.deepEqual(after.map(row=>Object.fromEntries(Object.keys(before[table][0]).map(k=>[k,row[k]]))),before[table]);}
  const store=new IdentityStore(db),input={observationId:'old-observation',extractionVersion:'upgrade-v1',extractionComplete:true,candidates:[{inputId:'same',span,quotes,facts,rawCandidate:raw}]};
  const [same]=await store.recordCandidates({...input,requestId:'upgrade-same'});assert.equal(same.candidateId,'old-candidate');
  const [other]=await store.recordCandidates({...input,requestId:'upgrade-other',candidates:[{...input.candidates[0],inputId:'business',rawCandidate:{...raw,requirements:['biz']}}]});assert.notEqual(other.candidateId,same.candidateId);assert.equal(other.decisionId,null);
  assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);assert.equal((await db.prepare("SELECT status FROM deliveries WHERE id='old-unknown'").first()).status,'unknown');console.log(JSON.stringify({schema:'current',originalColumnsUnchanged:true,legacyReplay:true,distinctRawScope:true,foreignKeys:true,productionOperations:0}));
 }
}finally{await proxy.dispose();}
