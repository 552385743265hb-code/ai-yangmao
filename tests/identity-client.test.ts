import { afterEach,expect,it,vi } from 'vitest';
import { postIdentityOffers } from '../pipeline/identity-client';
import { displayOffer } from './fixtures/identity/offer';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('A06 fifty legacy candidates are split into ten-item requests with positional receipts intact',async()=>{
 vi.stubEnv('API_BASE','https://mock.local');const sizes:number[]=[];
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{const body=JSON.parse(String(init.body));sizes.push(body.length);return new Response(JSON.stringify({results:body.map((o:any)=>({id:o.id}))}));});
 const result=await postIdentityOffers(Array.from({length:50},(_,i)=>({...displayOffer(),id:'candidate-'+i})));
 expect(sizes).toEqual([10,10,10,10,10]);expect(result.results.map(r=>r.id)).toEqual(Array.from({length:50},(_,i)=>'candidate-'+i));
});
it('A06 a missing receipt never becomes a successful batch',async()=>{
 vi.stubEnv('API_BASE','https://mock.local');vi.stubGlobal('fetch',async()=>new Response('{"results":[]}'));
 await expect(postIdentityOffers([displayOffer()])).rejects.toThrow(/receipt/);
});
