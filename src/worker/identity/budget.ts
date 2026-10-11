/** Count statements conservatively, including every statement in a D1 batch. */
export class IdentityQueryBudgetError extends Error { constructor(){super('identity query budget exhausted; resume in another request');} }
export function withIdentityQueryBudget(db:D1Database,limit=50):D1Database {
 let used=0;const originals=new WeakMap<object,D1PreparedStatement>();
 const reserve=(count:number)=>{if(used+count>limit)throw new IdentityQueryBudgetError();used+=count;};
 const wrap=(statement:D1PreparedStatement):D1PreparedStatement=>{
  const proxy=new Proxy(statement,{get(target,key){
   if(key==='bind')return (...values:unknown[])=>wrap(target.bind(...values));
   const value=Reflect.get(target,key);
   if(['all','run','first','raw'].includes(String(key)))return (...args:unknown[])=>{reserve(1);return Reflect.apply(value,target,args);};
   return typeof value==='function'?value.bind(target):value;
  }});originals.set(proxy,statement);return proxy;
 };
 return new Proxy(db,{get(target,key){
  if(key==='prepare')return (sql:string)=>wrap(target.prepare(sql));
  if(key==='batch')return (statements:D1PreparedStatement[])=>{reserve(statements.length);return target.batch(statements.map(s=>originals.get(s)??s));};
  if(key==='exec')return ()=>{throw new IdentityQueryBudgetError();};
  const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
 }});
}
