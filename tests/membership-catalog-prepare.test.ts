import {expect,it} from 'vitest';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const meta={aliases:[],status:'pending',sourceUrl:'https://vendor.example/old',verifiedAt:null,revision:1};
const snapshot={revision:7,products:[{...meta,id:'vendor',name:'Vendor'}],plans:[{...meta,id:'vendor-pro',productId:'vendor',name:'Pro',billing:'unknown'},{...meta,id:'placeholder',productId:'vendor',name:'付费套餐（档位待核实）',billing:'unknown'}]};
const finding={productId:'vendor',platformIds:['vendor'],name:'Vendor',sourceUrl:'https://vendor.example/pricing',plans:['Pro','Max'],freePlans:[],status:'verified',applyReady:true,quote:'Pro and Max subscriptions'};
function prepare(old:any,products:any[]){const dir=mkdtempSync(join(tmpdir(),'ym-catalog-test-'));try{writeFileSync(join(dir,'old.json'),JSON.stringify(old));writeFileSync(join(dir,'findings.json'),JSON.stringify({checkedAt:'2026-10-19',products}));const r=spawnSync(process.execPath,['scripts/prepare-membership-catalog.mjs',join(dir,'old.json'),join(dir,'findings.json'),join(dir,'out.json')],{encoding:'utf8'});return {status:r.status,error:r.stderr,output:r.status===0?JSON.parse(readFileSync(join(dir,'out.json'),'utf8')):null};}finally{rmSync(dir,{recursive:true,force:true});}}
it('refuses to silently discard an old catalog placeholder',()=>{const r=prepare(snapshot,[finding]);expect(r.status).not.toBe(0);expect(r.error).toContain('placeholder');});
it('archives an explicitly superseded placeholder and preserves real plan IDs and aliases',()=>{
 const r=prepare(snapshot,[{...finding,retirePlans:[{id:'placeholder',reason:'旧抽取占位项，不是官方套餐',sourceUrl:'https://vendor.example/pricing'}]}]);expect(r.status).toBe(0);
 expect(r.output.catalog.plans.find((p:any)=>p.id==='vendor-pro')).toMatchObject({name:'Vendor Pro',aliases:['Pro'],status:'verified'});
 expect(r.output.catalog.plans.find((p:any)=>p.id==='placeholder')).toMatchObject({status:'retired',retiredReason:'旧抽取占位项，不是官方套餐'});
 expect(r.output.catalog.plans.filter((p:any)=>p.status==='verified').map((p:any)=>p.name)).toEqual(['Vendor Pro','Vendor Max']);
 const again=prepare(r.output.catalog,[{...finding,retirePlans:[{id:'placeholder',reason:'旧抽取占位项，不是官方套餐',sourceUrl:'https://vendor.example/pricing'}]}]);expect(again.output.changes).toEqual([]);expect(again.output.catalog.plans).toEqual(r.output.catalog.plans);
});
it('rejects cross-product mappings instead of moving another vendor membership',()=>{const bad=structuredClone(snapshot);bad.plans[0].productId='other';const r=prepare(bad,[{...finding,existingPlanIds:{Pro:'vendor-pro'}}]);expect(r.status).not.toBe(0);expect(r.error).toContain('Cross-product');});
it('requires a verified destination before retiring duplicate products and does not silently move verified child plans',()=>{
 const old=structuredClone(snapshot);old.products.push({...meta,id:'duplicate',name:'Vendor Client'});old.plans.push({...meta,id:'duplicate-stub',productId:'duplicate',name:'付费订阅待核实',billing:'unknown'});
 const good={...finding,retirePlans:[{id:'placeholder',reason:'占位项',sourceUrl:'https://vendor.example/pricing'}],retireProducts:[{id:'duplicate',reason:'同一订阅产品的应用入口',sourceUrl:'https://vendor.example/pricing'}]};
 const r=prepare(old,[good]);expect(r.status).toBe(0);expect(r.output.catalog.products.find((p:any)=>p.id==='duplicate').status).toBe('retired');expect(r.output.catalog.productIdAliases.duplicate).toBe('vendor');expect(r.output.catalog.products.find((p:any)=>p.id==='vendor').aliases).toContain('Vendor Client');
 old.plans[2].status='verified';expect(prepare(old,[good]).status).not.toBe(0);
});
it('records multi-product replacements without guessing a single destination for an app shared across regions',()=>{
 const old=structuredClone(snapshot);old.products.push({...meta,id:'global',name:'Global',status:'verified'},{...meta,id:'duplicate',name:'Vendor App'});old.plans.push({...meta,id:'duplicate-stub',productId:'duplicate',name:'待核实订阅',billing:'unknown'});
 const r=prepare(old,[{...finding,retirePlans:[{id:'placeholder',reason:'占位项',sourceUrl:'https://vendor.example/pricing'}],retireProducts:[{id:'duplicate',replacementIds:['vendor','global'],reason:'应用使用国内或国际订阅',sourceUrl:'https://vendor.example/plans'}]}]);expect(r.status).toBe(0);expect(r.output.catalog.productReplacements.duplicate).toEqual(['vendor','global']);expect(r.output.catalog.productIdAliases?.duplicate).toBeUndefined();
});
it('records explicit aggregate replacements and refuses foreign plan targets',()=>{
 const f={...finding,retirePlans:[{id:'placeholder',replacementIds:['vendor-pro','vendor-max'],reason:'聚合目录拆成明确档位',sourceUrl:'https://vendor.example/pricing'}]};
 const r=prepare(snapshot,[f]);expect(r.status).toBe(0);expect(r.output.catalog.planReplacements.placeholder).toEqual(['vendor-pro','vendor-max']);expect(r.output.catalog.planIdAliases?.placeholder).toBeUndefined();
 const old=structuredClone(snapshot);old.products.push({...meta,id:'other',name:'Other',status:'verified'});old.plans.push({...meta,id:'foreign',productId:'other',name:'Other Pro',status:'verified',billing:'paid'});
 expect(prepare(old,[{...f,retirePlans:[{...f.retirePlans[0],replacementIds:['foreign']}]}]).status).not.toBe(0);
});
