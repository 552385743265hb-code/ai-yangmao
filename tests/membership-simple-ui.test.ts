import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import * as core from '../src/shared/membership';
const entry=(id:string,name:string)=>({id,name,aliases:[],status:'verified' as const,sourceUrl:'https://official.example/plans',verifiedAt:'2026-10-19',revision:1});
const catalog={revision:1,vendors:[{id:'alpha',name:'Alpha',status:'available'},{id:'beta',name:'Beta',status:'available'},{id:'api',name:'API Vendor',status:'none',sourceUrl:'https://official.example/pricing'}],products:[{...entry('a','Alpha'),platformIds:['alpha']},{...entry('b','Beta'),platformIds:['beta']}],plans:[{...entry('a-pro','Alpha Pro'),productId:'a',billing:'paid' as const},{...entry('a-max','Alpha Max'),productId:'a',billing:'paid' as const},{...entry('b-pro','Beta Pro'),productId:'b',billing:'paid' as const}]};
function fixture(){
 const {document,window}=parseHTML('<form><div data-membership-editor></div></form><div id="owned"></div>');
 const ctx=vm.createContext({document,window,structuredClone,YMMembership:core,MEMBERSHIP_CATALOG:catalog,MEMBERSHIP_CATALOG_OK:true,adm:async()=>catalog,esc:(s:unknown)=>String(s),C:{subscriptions:[]},LS:{set(){}},computeRace(){},computeTrend(){},RACE:null,TREND:null,drawCondBtn(){},render(){}});
 vm.runInContext(readFileSync('web/src/membership.js','utf8'),ctx);
 const change=(selector:string,value?:string,checked?:boolean)=>{const i=document.querySelector(selector)!;expect(i).not.toBeNull();if(value!==undefined)Object.defineProperty(i,'value',{configurable:true,value});if(checked!==undefined){Object.defineProperty(i,'checked',{configurable:true,value:checked});i.toggleAttribute('checked',checked);}i.dispatchEvent(new window.Event('change',{bubbles:true}));};
 return {document,ctx,change};
}
it('offers vendor-scoped multi-select without group, scope, exclusion, or limits controls',async()=>{
 const {ctx,document,change}=fixture();await vm.runInContext(`mountMembershipEditor(document.querySelector('form'),{platformId:'alpha',requirements:[]})`,ctx);
 expect(document.querySelector('[data-member-vendor]')).not.toBeNull();
 expect(document.querySelector('[data-clause], [data-limit], [data-membership-add-group]')).toBeNull();
 change('[data-member-plan="a-pro"]',undefined,true);change('[data-member-plan="a-max"]',undefined,true);
 const r=vm.runInContext(`membershipEditFields({},document.querySelector('form').membershipEditor,[],false,'https://official.example/perk')`,ctx);
 expect(r.membershipRequirement.anyOf).toEqual([{allOf:[{productId:'a',scope:'plans',planIds:['a-pro','a-max'],excludePlanIds:[]}]}]);
 expect(core.matchMembership(r.membershipRequirement,[{planId:'a-max'}],catalog)).toBe('yes');
 expect(core.matchMembership(r.membershipRequirement,[{planId:'b-pro'}],catalog)).toBe('no');
});
it('lets visitors select every vendor and toggles plans without duplicates while preserving other preferences',()=>{
 const {ctx,document,change}=fixture();vm.runInContext(`C.phone=true;document.querySelector('#owned').innerHTML=subscriptionControls();bindSubscriptionEvents()`,ctx);
 expect([...document.querySelectorAll('[data-owned-vendor] option')].map(o=>o.getAttribute('value'))).toEqual(['alpha','beta','api']);
 change('[data-owned-plan="a-pro"]',undefined,true);change('[data-owned-plan="a-pro"]',undefined,true);
 expect(vm.runInContext('C.subscriptions',ctx)).toEqual([{planId:'a-pro'}]);
 change('[data-owned-vendor]','beta');change('[data-owned-plan="b-pro"]',undefined,true);
 expect(vm.runInContext('C.subscriptions',ctx)).toEqual([{planId:'a-pro'},{planId:'b-pro'}]);
 change('[data-owned-vendor]','api');expect(document.querySelector('[data-owned-subscriptions]')!.textContent).toContain('没有会员订阅');
 expect(vm.runInContext('C.phone',ctx)).toBe(true);
});
it('migrates saved exact plan IDs once, removes duplicate selections and preserves nonmembership settings',()=>{
 const {ctx}=fixture();vm.runInContext(`MEMBERSHIP_CATALOG={...MEMBERSHIP_CATALOG,revision:2,planIdAliases:{'old-alpha-pro':'a-pro'}}`,ctx);
 const result=vm.runInContext(`migrateMembershipPreferences({membershipStorageVersion:1,phone:true,subscriptions:[{planId:'old-alpha-pro'},{planId:'a-pro'},{planId:'unknown-old'}]})`,ctx);
 expect(result.subscriptions).toEqual([{planId:'a-pro'}]);expect(result.phone).toBe(true);expect(result.unresolvedMembers).toContain('unknown-old');expect(result.membershipStorageVersion).toBe(2);
});
