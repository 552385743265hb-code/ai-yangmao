/** Local measurement only. Metadata absent from D1 first/raw is explicitly unmeasured. */
export function measureD1(db:D1Database){
 let statements=0,metadataStatements=0,rowsRead=0,rowsWritten=0,errors=0,elapsedMs=0;
 const originals=new WeakMap<object,D1PreparedStatement>();
 const record=(result:unknown)=>{const meta=(result as {meta?:{rows_read?:number;rows_written?:number}})?.meta;
  if(Number.isFinite(meta?.rows_read)&&Number.isFinite(meta?.rows_written)){metadataStatements++;rowsRead+=meta!.rows_read!;rowsWritten+=meta!.rows_written!;}};
 async function run(count:number,fn:()=>Promise<unknown>,batch=false){statements+=count;const start=performance.now();try{const result=await fn();if(batch)(result as unknown[]).forEach(record);else record(result);return result;}catch(e){errors++;throw e;}finally{elapsedMs+=performance.now()-start;}}
 const wrap=(s:D1PreparedStatement):D1PreparedStatement=>{const proxy=new Proxy(s,{get(t,k){
  if(k==='bind')return (...args:unknown[])=>wrap(t.bind(...args));
  const value=Reflect.get(t,k);if(['all','run','first','raw'].includes(String(k)))return (...args:unknown[])=>run(1,()=>Reflect.apply(value,t,args));return typeof value==='function'?value.bind(t):value;
 }});originals.set(proxy,s);return proxy;};
 const wrapped=new Proxy(db,{get(t,k){if(k==='prepare')return (sql:string)=>wrap(t.prepare(sql));if(k==='batch')return (items:D1PreparedStatement[])=>run(items.length,()=>t.batch(items.map(s=>originals.get(s)??s)),true);if(k==='exec')return ()=>{throw new Error('metrics requires individual prepared statements');};const value=Reflect.get(t,k);return typeof value==='function'?value.bind(t):value;}});
 return {db:wrapped,snapshot:()=>({statements,metadataStatements,metadataMissing:statements-metadataStatements,rowsRead:metadataStatements?rowsRead:null,rowsWritten:metadataStatements?rowsWritten:null,rowsArePartial:metadataStatements!==statements,errors,elapsedMs})};
}
