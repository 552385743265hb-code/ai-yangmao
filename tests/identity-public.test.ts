import {beforeEach,afterEach,it,expect} from 'vitest';
import worker from '../src/worker/index';
import {identityDb} from './fixtures/identity/db';
import {displayOffer} from './fixtures/identity/offer';
let f:ReturnType<typeof identityDb>;
const env=()=>({DB:f.db,INGEST_TOKEN:'ingest-test-token-123',ADMIN_TOKEN:'admin-test-token-123',IDENTITY_MODE:'off'} as Parameters<typeof worker.fetch>[1]);
async function get(path:string){return worker.fetch(new Request('https://local.test'+path),env(),{} as ExecutionContext);}
beforeEach(async()=>{f=identityDb();for(const id of ['old','canonical','unmapped'])await worker.fetch(new Request('https://local.test/api/ingest/offers',{method:'POST',headers:{Authorization:'Bearer ingest-test-token-123','Content-Type':'application/json'},body:JSON.stringify([{...displayOffer(),id,title:id,valueText:id+' 10 USD',evidence:{...displayOffer().evidence,url:'https://vendor.example/'+id,excerpts:{...displayOffer().evidence.excerpts,benefit:id+' campaign 10 USD'}}}])}),env(),{} as ExecutionContext);
 // Fixture rows are intentionally independent until a logical route is installed.
 const original=f.sqlite.prepare('SELECT * FROM offers LIMIT 1').get()!;const keys=Object.keys(original);for(const id of ['old','canonical','unmapped'])if(!f.sqlite.prepare('SELECT 1 FROM offers WHERE id=?').get(id))f.sqlite.prepare(`INSERT INTO offers(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>k==='id'?id:original[k]));
 f.sqlite.exec("UPDATE offers SET review_state='approved',last_verified_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),review_memo='INTERNAL-SECRET'; INSERT INTO benefit_entities(id,platform_id,canonical_offer_id) VALUES('root','vendor','canonical'),('child','vendor','old'); UPDATE benefit_entities SET state='merged',merged_into='root' WHERE id='child'");
});afterEach(()=>f.sqlite.close());
it('A31/A43/A44 all public collections exclude merged rows in off mode and preserve unmapped offers',async()=>{
 const list=await (await get('/api/offers?view=all')).json() as any;
 expect(list.offers.map((o:any)=>o.id).sort()).toEqual(['canonical','unmapped']);expect(list.count).toBe(2);expect(JSON.stringify(list)).not.toContain('INTERNAL-SECRET');
 const platform=await (await get('/api/platforms/vendor')).json() as any;expect(platform.offers).toHaveLength(2);
 const rss=await (await get('/rss.xml')).text();expect(rss).not.toContain('#offer-old');expect(rss).toContain('#offer-canonical');
});
it('A31 old detail IDs resolve to visible canonical while hidden canonical returns 404',async()=>{
 const resolved=await (await get('/api/offers/old')).json() as any;expect(resolved).toMatchObject({requestedOfferId:'old',canonicalOfferId:'canonical',offer:{id:'canonical'}});
 f.sqlite.exec("UPDATE offers SET review_state='rejected' WHERE id='canonical'");expect((await get('/api/offers/old')).status).toBe(404);
});
it('A31 corrupt routing cycles fail closed without exposing an alias',async()=>{
 f.sqlite.exec("UPDATE benefit_entities SET state='merged',merged_into='child' WHERE id='root'");expect((await get('/api/offers/old')).status).toBe(404);
});
