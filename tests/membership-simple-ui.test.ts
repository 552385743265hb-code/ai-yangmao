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
 change('[data-owned-vendor]','api');expect(document.querySelector('[data-owned-subscriptions]')!.textContent).toContain('暂无公开会员套餐');
 expect(vm.runInContext('C.phone',ctx)).toBe(true);
});
it('migrates saved exact plan IDs once, removes duplicate selections and preserves nonmembership settings',()=>{
 const {ctx}=fixture();vm.runInContext(`MEMBERSHIP_CATALOG={...MEMBERSHIP_CATALOG,revision:2,planIdAliases:{'old-alpha-pro':'a-pro'}}`,ctx);
 const result=vm.runInContext(`migrateMembershipPreferences({membershipStorageVersion:1,phone:true,subscriptions:[{planId:'old-alpha-pro'},{planId:'a-pro'},{planId:'unknown-old'}]})`,ctx);
 expect(result.subscriptions).toEqual([{planId:'a-pro'}]);expect(result.phone).toBe(true);expect(result.unresolvedMembers).toContain('unknown-old');expect(result.membershipStorageVersion).toBe(2);
});
it('does not recreate retired duplicate products as extra vendors',()=>{
 const {ctx}=fixture();vm.runInContext(`MEMBERSHIP_CATALOG={...MEMBERSHIP_CATALOG,products:[...MEMBERSHIP_CATALOG.products,{id:'old-app',name:'Old App',status:'retired',aliases:[]}],plans:[...MEMBERSHIP_CATALOG.plans,{id:'old-stub',name:'未知套餐',productId:'old-app',status:'retired'}]}`,ctx);
 expect(vm.runInContext('membershipVendors().map(v=>v.id)',ctx)).toEqual(['alpha','beta','api']);
});
it('opens a cross-vendor benefit at the vendor of its selected membership, rather than hiding the selection under the issuer',async()=>{
 const {ctx,document}=fixture();vm.runInContext(`offer={platformId:'alpha',membershipRequirement:{schemaVersion:'membership-v1',status:'confirmed',catalogRevision:1,evidenceUrls:['https://official.example/perk'],anyOf:[{allOf:[{productId:'b',scope:'plans',planIds:['b-pro'],excludePlanIds:[]}]}]}}`,ctx);
 await vm.runInContext(`mountMembershipEditor(document.querySelector('form'),offer)`,ctx);
 expect(document.querySelector('[data-member-plan="b-pro"]')).not.toBeNull();expect(document.querySelector('[data-member-plan="b-pro"]')!.hasAttribute('checked')).toBe(true);
});
it('lets users remove an ambiguous old membership notice without clearing valid memberships or other preferences',()=>{
 const {ctx,document,change}=fixture();vm.runInContext(`C={phone:true,subscriptions:[{planId:'a-pro'}],unresolvedMembers:['Pro']};document.querySelector('#owned').innerHTML=subscriptionControls();bindSubscriptionEvents()`,ctx);
 const remove=document.querySelector('[data-remove-unresolved-member]');expect(remove).not.toBeNull();remove!.dispatchEvent(new (ctx.window as any).Event('click',{bubbles:true}));
 expect(vm.runInContext('C.unresolvedMembers',ctx)).toEqual([]);expect(vm.runInContext('C.subscriptions',ctx)).toEqual([{planId:'a-pro'}]);expect(vm.runInContext('C.phone',ctx)).toBe(true);
});
it('does not turn an unresolved old membership into a definite negative qualification',()=>{
 const {ctx}=fixture();vm.runInContext(`C.unresolvedMembers=['旧版 Pro'];offer={membershipRequirement:{schemaVersion:'membership-v1',status:'confirmed',catalogRevision:1,evidenceUrls:['https://official.example/perk'],anyOf:[{allOf:[{productId:'a',scope:'plans',planIds:['a-pro'],excludePlanIds:[]}]}]}}`,ctx);
 expect(vm.runInContext('membershipResult(offer,[])',ctx)).toBe('unknown');
});
it('keeps existing limits when editing concrete seats expanded from a retired aggregate',async()=>{
 const {ctx,document,change}=fixture();vm.runInContext(`MEMBERSHIP_CATALOG={...MEMBERSHIP_CATALOG,planReplacements:{'a-pro':['a-standard','a-premium']},plans:[...MEMBERSHIP_CATALOG.plans.map(p=>p.id==='a-pro'?{...p,status:'retired'}:p),...['standard','premium'].map(n=>({...MEMBERSHIP_CATALOG.plans[0],id:'a-'+n,name:'Alpha Teams '+n,status:'verified'}))]};offer={platformId:'alpha',membershipRequirement:{schemaVersion:'membership-v1',status:'confirmed',catalogRevision:1,evidenceUrls:['https://official.example/perk'],anyOf:[{allOf:[{productId:'a',scope:'plans',planIds:['a-pro'],excludePlanIds:[],limits:{billingCycles:['annual']}}]}]}}`,ctx);
 const r=vm.runInContext(`membershipSelectionRequirement(['a-premium'],offer.membershipRequirement,1)`,ctx);
 expect(r.anyOf[0].allOf[0].limits).toEqual({billingCycles:['annual']});
});
const clause=(productId:string,planIds:string[],limits?:object)=>({productId,scope:'plans',planIds,excludePlanIds:[],...(limits?{limits}:{})});
const requirement=(anyOf:any[])=>({schemaVersion:'membership-v1',status:'confirmed',catalogRevision:1,evidenceUrls:['https://official.example/perk'],anyOf});
it('narrows a seat choice while retaining its required usage product and original restrictions',async()=>{
 const {ctx,document,change}=fixture();
 const seat=clause('a',['a-pro','a-max'],{billingCycles:['annual']});
 const original=requirement([{allOf:[seat,clause('b',['b-pro'])]}]);
 (ctx as any).offer={platformId:'alpha',membershipRequirement:original};
 await vm.runInContext(`mountMembershipEditor(document.querySelector('form'),offer)`,ctx);
 change('[data-member-plan="a-pro"]',undefined,false);
 const saved=vm.runInContext(`membershipEditFields(offer,document.querySelector('form').membershipEditor,[],false,'')`,ctx).membershipRequirement;
 expect(saved?.anyOf).toEqual([{allOf:[clause('a',['a-max'],{billingCycles:['annual']}),clause('b',['b-pro'])]}]);
 expect(core.matchMembership(saved,[{planId:'a-max',billingCycle:'annual'}],catalog)).toBe('no');
});
it('retains every restriction branch for a plan occurring more than once',()=>{
 const {ctx}=fixture();(ctx as any).original=requirement([{allOf:[clause('a',['a-pro','a-max'],{billingCycles:['annual']})]},{allOf:[clause('a',['a-pro'],{regions:['US']})]}]);
 const saved=vm.runInContext(`membershipSelectionRequirement(['a-pro'],original,1)`,ctx);
 expect(saved.anyOf).toEqual([{allOf:[clause('a',['a-pro'],{billingCycles:['annual']})]},{allOf:[clause('a',['a-pro'],{regions:['US']})]}]);
});
it('blocks removal of an entire required product rather than accepting the other product alone',async()=>{
 const {ctx,document,change}=fixture();const original=requirement([{allOf:[clause('a',['a-pro']),clause('b',['b-pro'])]}]);(ctx as any).offer={platformId:'alpha',membershipRequirement:original};
 expect(()=>vm.runInContext(`membershipSelectionRequirement(['b-pro'],offer.membershipRequirement,1)`,ctx)).toThrow();
 await vm.runInContext(`mountMembershipEditor(document.querySelector('form'),offer)`,ctx);
 change('[data-member-plan="a-pro"]',undefined,false);
 expect(vm.runInContext(`document.querySelector('form').membershipEditor.requirement`,ctx)).toEqual(original);
 expect(document.querySelector('[data-member-plan="a-pro"]')!.hasAttribute('checked')).toBe(true);
 expect(document.querySelector('.warn-note')).not.toBeNull();
});
it('preserves excluded plans when narrowing an existing clause',()=>{
 const {ctx}=fixture();(ctx as any).original=requirement([{allOf:[{...clause('a',['a-pro','a-max']),excludePlanIds:['a-pro']}]}]);
 expect(vm.runInContext(`membershipSelectionRequirement(['a-max'],original,1).anyOf[0].allOf[0].excludePlanIds`,ctx)).toEqual(['a-pro']);
});
it('blocks ambiguous additions to restriction branches rather than choosing the first restriction',()=>{
 const {ctx}=fixture();(ctx as any).original=requirement([{allOf:[clause('a',['a-pro'],{billingCycles:['annual']})]},{allOf:[clause('a',['a-pro'],{regions:['US']})]}]);
 expect(()=>vm.runInContext(`membershipSelectionRequirement(['a-pro','a-max'],original,1)`,ctx)).toThrow();
});
it('does not confirm an unresolved requirement just because a plan was selected',()=>{
 const {ctx}=fixture();(ctx as any).original={...requirement([{allOf:[clause('a',['a-pro','a-max'])]}]),status:'needs_review'};
 expect(vm.runInContext(`membershipSelectionRequirement(['a-pro'],original,1).status`,ctx)).toBe('needs_review');
});
