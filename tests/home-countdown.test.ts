import * as YMMembership from '../src/shared/membership';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {parseHTML} from 'linkedom';
import {describe,it,expect} from 'vitest';
function fixture(){
 const {window,document}=parseHTML(`<html><body>${readFileSync('web/src/body.html','utf8')}</body></html>`);
 function Clock(...args:unknown[]){return Reflect.construct(Date,args.length?args:['2026-10-12T03:00:00Z']);}Object.setPrototypeOf(Clock,Date);Clock.prototype=Date.prototype;
 const context=createContext({YMMembership,structuredClone,window,document,console,Intl,Date:Clock,Map,Set,URL,URLSearchParams,matchMedia:()=>({matches:false,addEventListener(){}}),getComputedStyle:()=>({getPropertyValue:()=> '#123456'}),localStorage:{getItem:()=>null,setItem(){}},sessionStorage:{getItem:()=>null},MutationObserver:class{observe(){}},setTimeout,clearTimeout,setInterval(){},location:{hash:'#today'},navigator:{}});
 const app=readFileSync('web/src/app.js','utf8');runInContext(readFileSync('web/src/data.js','utf8')+'\n'+readFileSync('web/src/membership.js','utf8')+'\n'+app.slice(0,app.indexOf('(async function boot()')),context);
 const run=(s:string)=>runInContext(s,context);run("NOW=new Date('2026-10-12T03:00:00Z');T0=new Date(2026,9,12);");return {run,document};
}
const campaign=(id:string,extra={})=>({id,t:`${id} Step 5 Preview 免费一周`,ty:'free',ek:'unknown',s:-4,e:null,publishedAt:'2026-10-08T17:34:16Z',vf:-1,tz:'UTC',v:'平台限时免费使用',...extra});
describe('home deadline reminders',()=>{
 it('keeps all four Step 5 platform campaigns even when one needs verification and others lack exact cutoffs',()=>{
  const f=fixture();const rows=[campaign('OpenCode',{ek:'date',e:3,verify:'evidence_missing'}),campaign('Nous',{publishedAt:'2026-10-08'}),campaign('Cline'),campaign('Kilo',{publishedAt:'2026-10-09T13:55:42Z',s:-3})];
  f.run(`OFFERS=${JSON.stringify(rows)};`);expect(f.run('countdownCandidates(OFFERS).map(x=>x.o.id)')).toEqual(['Cline','OpenCode','Nous','Kilo']);
  expect(f.run('countdownCandidates(OFFERS).filter(x=>x.window.estimated).length')).toBe(3);
  expect(f.run('statusOf(OFFERS[0])')).toBe('stale');
 });
 it('does not truncate at five or include ended, future, personal-validity, or unanchored campaigns',()=>{
  const f=fixture();const good=Array.from({length:6},(_,i)=>campaign('p'+i));const bad=[campaign('ended',{ek:'date',e:-1}),campaign('future',{s:1}),campaign('personal',{v:'注册后免费使用一周'}),campaign('unanchored',{s:null,publishedAt:null}),campaign('long',{ek:'date',e:20})];
  f.run(`OFFERS=${JSON.stringify([...good,...bad])};`);expect(f.run('countdownCandidates(OFFERS).length')).toBe(6);
 });
 it('represents date-only anchors as an estimated range and leaves official unknown fields untouched',()=>{
  const f=fixture();f.run(`const item=${JSON.stringify(campaign('Nous',{publishedAt:'2026-10-08'}))};const before=JSON.stringify(item);const win=countdownWindow(item);`);
  expect(f.run('estimatedCountdown(win)')).toBe('约 3–4 天');expect(f.run('JSON.stringify(item)===before')).toBe(true);
 });
});
