import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {historyEnvironment} from '../../src/shared/identity/history-types';
/** No HTTP, credentials, API_BASE or production fallback. SQLite opens read-only. */
export function openHistoryInput(path:string|undefined,environment:string|undefined,options:{writable?:boolean}={}){
 if(!path||!environment)throw new Error('--input and --environment are required; no production defaults');if(!['synthetic','redacted_local'].includes(environment))throw new Error('local snapshot environment required; production is Worker-only');historyEnvironment.parse(environment);
 const file=resolve(path);if(!/\.(?:sqlite|db)$/i.test(file))throw new Error('an explicit local SQLite snapshot is required');
 const sqlite=new DatabaseSync(file,{readOnly:!options.writable});
 sqlite.exec('PRAGMA foreign_keys=ON');
 const db={async batch(statements:{all():Promise<unknown>}[]){if(!options.writable)throw new Error('read-only snapshot');sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.all());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}},prepare(sql:string){let values:(string|number|null)[]=[];return {bind(...args:(string|number|null)[]){values=args;return this;},async all(){return {results:sqlite.prepare(sql).all(...values),success:true};},async first(column?:string){const row=sqlite.prepare(sql).get(...values);return (column?row?.[column]:row)??null;},async raw(){const statement=sqlite.prepare(sql);statement.setReturnArrays(true);return statement.all(...values);},async run(){if(!options.writable)throw new Error('read-only snapshot');return {success:true,meta:sqlite.prepare(sql).run(...values)};}};}} as unknown as D1Database;
 return {db,close:()=>sqlite.close()};
}
export function readApprovedJson(path:string|undefined,environment:string|undefined){if(!path||!environment)throw new Error('--input and --environment are required');if(!['synthetic','redacted_local'].includes(environment))throw new Error('local snapshot environment required; production is Worker-only');historyEnvironment.parse(environment);const text=readFileSync(resolve(path),'utf8');if(text.length>20_000_000)throw new Error('snapshot exceeds offline input budget');return JSON.parse(text);}
export function argument(args:string[],name:string){const index=args.indexOf(name);return index>=0?args[index+1]:undefined;}
