import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
// Real SQLite statements and transactions; only the D1 transport surface is adapted.
export function identityDb() {
  const sqlite = new DatabaseSync(':memory:'); sqlite.exec('PRAGMA foreign_keys=ON');
  for (const name of readdirSync(new URL('../../../migrations/',import.meta.url)).filter(n=>/^\d+_.+\.sql$/.test(n)).sort()) sqlite.exec(readFileSync(new URL(`../../../migrations/${name}`,import.meta.url),'utf8'));
  let fault: ((sql:string)=>void) | undefined;
  const db = {
    prepare(sql:string) {
      let args: (string|number|null)[]=[];
      return {
        bind(...values:(string|number|null)[]) { if(values.length>100)throw new Error('D1 binding limit'); args=values; return this; },
        async all() { fault?.(sql); return { success:true, results:sqlite.prepare(sql).all(...args), meta:{changes:sqlite.prepare('SELECT changes() n').get()?.n} }; },
        async first(column?:string) { fault?.(sql); const row=sqlite.prepare(sql).get(...args); return (column?row?.[column]:row)??null; },
        async run() { fault?.(sql); const meta=sqlite.prepare(sql).run(...args); return {success:true, meta}; },
        async raw() { fault?.(sql); const q=sqlite.prepare(sql); q.setReturnArrays(true);return q.all(...args); },
      };
    },
    async batch(stmts:{all():Promise<unknown>}[]) {sqlite.exec('BEGIN');try {const result=[];for(const s of stmts)result.push(await s.all());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}},
  } as unknown as D1Database;
  sqlite.exec("INSERT INTO platforms(id,name,type,status,site) VALUES('vendor','Vendor','lab','approved','https://vendor.example'); INSERT INTO sources(id,platform_id,kind,url,tier) VALUES('vendor-source','vendor','web_list','https://vendor.example/rewards','site'); INSERT INTO leads(id,origin,url,status) VALUES(1,'manual','https://community.example/story','reviewing')");
  return { sqlite, db, inject: (fn?: (sql:string)=>void) => {fault=fn;} };
}
