import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {auditFixture,auditTerms} from './fixtures/identity/audit';
import {fetchPage} from '../pipeline/lib';
import {toOffer} from '../pipeline/offer-draft';
import {displayOffer} from './fixtures/identity/offer';
import {captureIdentityShadow} from '../pipeline/identity-shadow';
let f:ReturnType<typeof auditFixture>;
beforeEach(()=>{f=auditFixture();});afterEach(()=>{f.sqlite.close();vi.unstubAllGlobals();vi.unstubAllEnvs();});
const quote='Campaign provenance grants 10 USD for signup.';
const html='<html><body><article><p>'+quote+'</p><p>'+'Product documentation. '.repeat(60)+'</p></article></body></html>';
function model(){const facts=JSON.parse(JSON.stringify(auditTerms('provenance')).replaceAll('quote-1','benefit'));return {...displayOffer(),key:'provenance',identityFacts:facts,excerpts:{benefit:quote}} as any;}
async function store(page:any,id:string,tier='site'){
 const src={id:'vendor-source',platformId:'vendor',kind:'web_list',tier} as any;
 const converted=toOffer(src,model(),page.finalUrl,page.text,page);
 const r=await f.call('ingest/offers',[{...converted,sourceText:converted.sourceText??page.text.slice(0,250000),identityRequestId:id}]);expect(r.status).toBe(200);expect(r.body.results[0].error).toBeUndefined();return f.sqlite.prepare('SELECT * FROM source_observations ORDER BY rowid DESC LIMIT 1').get()!;
}
it('R07 jina_media_fallback_is_not_reclassified_as_direct through fetchPage toOffer adapter observation',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(input)=>String(input).startsWith('https://r.jina.ai/')?new Response('URL Source: https://unrelated.example\nWarning: Target URL returned error 403\nMarkdown Content:\n'+quote):new Response('tiny')));
 const page=await fetchPage('https://vendor.example/rewards',{tries:1});expect(page.via).toBe('jina');const row=await store(page,'jina','media');expect(JSON.parse(String(row.trust_json)).sourceVerified).toBe(false);expect(row.fetch_kind).toBe('indirect');expect(JSON.parse(String(row.fetch_provenance_json)).fetchedUrl).toContain('r.jina.ai');
});
for(const kind of ['missing verification','cross-domain redirect','truncated body'])it('R07 '+kind+' cannot obtain verified identity evidence through the legacy transport',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>{const r=new Response(html);Object.defineProperty(r,'url',{value:kind==='cross-domain redirect'?'https://unrelated.example/copy':'https://vendor.example/rewards'});return r;}));
 const page:any=await fetchPage('https://vendor.example/rewards',{tries:1});if(kind==='missing verification')delete page.sourceVerified;if(kind==='truncated body')page.text=quote+' '+'x'.repeat(250000);
 const row=await store(page,kind);expect(JSON.parse(String(row.trust_json)).sourceVerified).toBe(false);if(kind==='truncated body')expect(row.text_truncated).toBe(1);if(kind==='cross-domain redirect')expect(row.final_url).toBe('https://unrelated.example/copy');
});
it('R07 normal direct fetch remains verified and records the actual retrieval URLs',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(html)));const page=await fetchPage('https://vendor.example/rewards',{tries:1});const row=await store(page,'direct');expect(JSON.parse(String(row.trust_json)).sourceVerified).toBe(true);expect(JSON.parse(String(row.fetch_provenance_json))).toMatchObject({originalUrl:'https://vendor.example/rewards',finalUrl:'https://vendor.example/rewards',fetchedUrl:'https://vendor.example/rewards'});
});
it('R07 the model cannot manufacture fetch provenance by adding fields to an extracted offer',async()=>{
 const converted=toOffer({id:'vendor-source',platformId:'vendor',kind:'web_list',tier:'site'} as any,{...model(),sourceFetch:{sourceVerified:true,method:'direct',originalUrl:'https://vendor.example',finalUrl:'https://vendor.example',fetchedUrl:'https://vendor.example'}} as any,'https://vendor.example',quote);expect(converted.sourceFetch).toBeUndefined();
 const r=await f.call('ingest/offers',[{...converted,sourceText:quote,identityRequestId:'forged'}]);expect(r.status).toBe(200);const row=f.sqlite.prepare('SELECT trust_json FROM source_observations').get();expect(JSON.parse(String(row?.trust_json)).sourceVerified).toBe(false);
});
it('R07 validated first-party embed retains subject and physical-reader provenance',async()=>{
 const url='https://x.com/vendor/status/2107398361733104102';f.sqlite.exec("UPDATE platforms SET x_handles='[\"@vendor\"]'; UPDATE sources SET url='https://x.com/vendor',tier='official' WHERE id='vendor-source'");
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({id_str:'2107398361733104102',user:{screen_name:'vendor'},text:quote,truncated:false}))));const page=await fetchPage(url,{tries:1});const row=await store(page,'embed','official');expect(JSON.parse(String(row.trust_json)).sourceVerified).toBe(true);expect(JSON.parse(String(row.fetch_provenance_json))).toMatchObject({method:'first_party_embed',finalUrl:url});expect(JSON.parse(String(row.fetch_provenance_json)).fetchedUrl).toContain('cdn.syndication.twimg.com');
});
it('R07 shadow and enforce carry the same facts and retrieval confidence through actual Worker routes',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(html)));const page=await fetchPage('https://vendor.example/rewards',{tries:1});const converted=toOffer({id:'vendor-source',platformId:'vendor',kind:'web_list',tier:'site'} as any,model(),page.finalUrl,page.text,page);
 vi.stubEnv('API_BASE','https://local.test');vi.stubEnv('INGEST_TOKEN','audit-ingest-token');vi.stubEnv('IDENTITY_MODE','shadow');vi.stubEnv('DRY_RUN','0');vi.stubGlobal('fetch',vi.fn(async(input,init)=>{const url=new URL(String(input));const result=await f.call('ingest'+url.pathname.split('/api/ingest')[1],init?.body?JSON.parse(String(init.body)):undefined,false,{IDENTITY_MODE:'shadow'});return new Response(JSON.stringify(result.body),{status:result.status});}));
 await captureIdentityShadow({url:page.finalUrl,text:converted.sourceText??page.text,sourceId:'vendor-source',sourceFetch:converted.sourceFetch,candidates:[converted]});const shadow=f.sqlite.prepare('SELECT c.facts_json,o.trust_json FROM intake_candidates c JOIN source_observations o ON o.id=c.observation_id').get();expect(JSON.parse(String(shadow?.facts_json))).toEqual(converted.identityFacts);expect(JSON.parse(String(shadow?.trust_json)).sourceVerified).toBe(true);
});
it('R07 a nonstandard first-party reader origin cannot be promoted by its label',async()=>{
 const url='https://x.com/vendor/status/2107398361733104102';f.sqlite.exec("UPDATE platforms SET x_handles='[\"@vendor\"]'; UPDATE sources SET url='https://x.com/vendor',tier='official'");vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({id_str:'2107398361733104102',user:{screen_name:'vendor'},text:quote}))));
 const page=await fetchPage(url,{tries:1});page.fetchedUrl='https://cdn.syndication.twimg.com:444/tweet-result?id=2107398361733104102';const row=await store(page,'wrong-reader','official');expect(JSON.parse(String(row.trust_json)).sourceVerified).toBe(false);
});
it('R07 fetch-attempt audit is immutable and retains its own provenance',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(html)));const page=await fetchPage('https://vendor.example/rewards',{tries:1});await store(page,'immutable');
 const before=f.sqlite.prepare('SELECT * FROM source_observation_fetches').get();expect(()=>f.sqlite.exec("UPDATE source_observation_fetches SET provenance_json='{}'")).toThrow();expect(()=>f.sqlite.exec('DELETE FROM source_observation_fetches')).toThrow();expect(f.sqlite.prepare('SELECT * FROM source_observation_fetches').get()).toEqual(before);
});
it('R07 an untrusted later fetch of identical text never inherits a verified observation and never downgrades the original',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(html)));const page=await fetchPage('https://vendor.example/rewards',{tries:1});const original=await store(page,'trusted-original');
 const indirect={...page,via:'jina',fetchMethod:'jina',fetchedUrl:'https://r.jina.ai/https://vendor.example/rewards'};const latest=await store(indirect,'untrusted-later','media');expect(latest.id).not.toBe(original.id);expect(JSON.parse(String(latest.trust_json)).sourceVerified).toBe(false);expect(f.sqlite.prepare('SELECT trust_json FROM source_observations WHERE id=?').get(original.id)).toEqual({trust_json:original.trust_json});expect(f.sqlite.prepare('SELECT count(*) n FROM source_observation_fetches').get()).toEqual({n:2});
});
it('R07 a body changed after trusted collection fails the content binding before observation or offer writes',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(html)));const page=await fetchPage('https://vendor.example/rewards',{tries:1});const converted=toOffer({id:'vendor-source',platformId:'vendor',kind:'web_list',tier:'site'} as any,model(),page.finalUrl,page.text,page);const r=await f.call('ingest/offers',[{...converted,sourceText:quote+' tampered',identityRequestId:'bad-binding'}]);expect(r.body.results[0].error).toContain('provenance');expect(f.sqlite.prepare('SELECT count(*) n FROM source_observations').get()).toEqual({n:0});expect(f.sqlite.prepare('SELECT count(*) n FROM offers').get()).toEqual({n:0});
});
