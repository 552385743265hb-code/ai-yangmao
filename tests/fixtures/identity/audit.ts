import {expect} from 'vitest';
import worker from '../../../src/worker/index';
import {identityDb} from './db';
import {displayOffer} from './offer';
import {terms,known} from './terms';
import type {CanonicalTermsV1} from '../../../src/shared/identity/types';
export function auditFixture(){
 const f=identityDb();const call=async(path:string,body?:unknown,admin=false,env:Record<string,string>={})=>{
  const response=await worker.fetch(new Request('https://local.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+(admin?'audit-admin-token':'audit-ingest-token'),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),{DB:f.db,ADMIN_TOKEN:'audit-admin-token',INGEST_TOKEN:'audit-ingest-token',IDENTITY_MODE:'enforce',IDENTITY_CANARY_PLATFORMS:'vendor',...env} as any,{} as any);
  return {status:response.status,body:await response.json() as any};
 };
 const observation=async(id:string,text:string)=>{const r=await call('ingest/observations',{requestId:id,originalUrl:'https://vendor.example/'+id,finalUrl:'https://vendor.example/'+id,text,sourceId:'vendor-source',fetchKind:'direct',observedAt:'2026-10-10T10:00:00Z'});expect(r.status).toBe(200);return r.body.observationId as string;};
 const candidate=async(id:string,observationId:string,text:string,facts:CanonicalTermsV1,patch:Record<string,unknown>={})=>{const r=await call('ingest/candidates',{requestId:id,observationId,extractionVersion:'audit-v1',extractionComplete:true,candidates:[{inputId:id,span:{start:0,end:text.length,quote:text},quotes:[{id:'quote-1',start:0,end:text.length,quote:text}],facts,rawCandidate:{...displayOffer(),...patch}}]});expect(r.status).toBe(200);return r.body.receipts[0];};
 return {...f,call,observation,candidate};
}
export function auditTerms(anchor='campaign'){const v=terms();v.occurrenceAnchor=known(anchor);return v;}
