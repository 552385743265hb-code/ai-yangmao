import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {historyEnvironment} from '../../src/shared/identity/history-types';
/** No HTTP, credentials, API_BASE or production fallback. SQLite opens read-only. */
export function openHistoryInput(path:string|undefined,environment:string|undefined){
 if(!path||!environment)throw new Error('--input and --environment are required; no production defaults');historyEnvironment.parse(environment);
 const file=resolve(path);if(!/\.(?:sqlite|db)$/i.test(file))throw new Error('an explicit local SQLite snapshot is required');
 const sqlite=new DatabaseSync(file,{readOnly:true});
 const db={prepare(sql:string){let values:(string|number|null)[]=[];return {bind(...args:(string|number|null)[]){values=args;return this;},async all(){return {results:sqlite.prepare(sql).all(...values),success:true};},async first(){return sqlite.prepare(sql).get(...values)??null;}};}} as unknown as D1Database;
 return {db,close:()=>sqlite.close()};
}
export function readApprovedJson(path:string|undefined,environment:string|undefined){if(!path||!environment)throw new Error('--input and --environment are required');historyEnvironment.parse(environment);const text=readFileSync(resolve(path),'utf8');if(text.length>20_000_000)throw new Error('snapshot exceeds offline input budget');return JSON.parse(text);}
export function argument(args:string[],name:string){const index=args.indexOf(name);return index>=0?args[index+1]:undefined;}
