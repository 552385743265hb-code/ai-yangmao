import {expect,it} from 'vitest';
import {fastTrackCatalogBlock,fastTrackCatalogChoices,fastTrackCatalogPrompt} from '../src/shared/fast-track-membership';
import type {MembershipCatalog} from '../src/shared/membership';
const entry=(id:string,status:'pending'|'verified'|'retired')=>({id,name:id,aliases:[],status,sourceUrl:'https://example.com',verifiedAt:null,revision:1});
const catalog:MembershipCatalog={revision:2,products:[entry('MiniMax','pending'),entry('MiniMax Code','verified'),entry('retired','retired')],plans:[{...entry('Go','verified'),productId:'MiniMax Code',billing:'paid'},{...entry('old','pending'),productId:'MiniMax',billing:'paid'},{...entry('removed','retired'),productId:'MiniMax Code',billing:'paid'}]};
const fields=(id:string,planIds:string[]=[])=>({requirements:['member:'+id],membershipRequirement:{schemaVersion:'membership-v1',status:'confirmed',catalogRevision:1,anyOf:[{allOf:[{productId:id,scope:planIds.length?'plans':'any_paid',planIds,excludePlanIds:[]}]}],evidenceUrls:['https://example.com']}});
it('only supplies verified products and verified child plans to the model',()=>{
 const choices=fastTrackCatalogChoices(catalog);
 expect(choices.products.map(p=>p.id)).toEqual(['MiniMax Code']);expect(choices.plans.map(p=>p.id)).toEqual(['Go']);
});
it('groups every verified cross-vendor identity with its names, aliases and billing, without audit metadata',()=>{
 const full:MembershipCatalog={...catalog,vendors:[{id:'other-vendor',name:'Other',status:'available'}],products:[...catalog.products,{...entry('Other Product','verified'),aliases:['Other Alias'],platformIds:['other-vendor','shared-vendor'],retiredReason:'old-audit-note',retiredAt:'2026-01-01'}],plans:[...catalog.plans,{...entry('orphan','verified'),productId:'retired',billing:'paid'},{...entry('other-free','verified'),name:'Other Free',aliases:['Community'],productId:'Other Product',billing:'free'}]};
 const prompt=fastTrackCatalogPrompt(full),choices=fastTrackCatalogChoices(full);
 expect(prompt.revision).toBe(full.revision);
 expect(prompt.products.map(p=>p.id)).toEqual(choices.products.map(p=>p.id));
 expect(prompt.products.flatMap(p=>p.plans.map(plan=>[p.id,plan.id]))).toEqual(choices.plans.map(p=>[p.productId,p.id]));
 expect(prompt.products.find(p=>p.id==='Other Product')).toEqual({id:'Other Product',name:'Other Product',aliases:['Other Alias'],platformIds:['other-vendor','shared-vendor'],plans:[{id:'other-free',name:'Other Free',aliases:['Community'],billing:'free'}]});
 expect(prompt.products.find(p=>p.id==='MiniMax Code')?.plans[0].billing).toBe('paid');
 const json=JSON.stringify(prompt);
 for(const field of ['sourceUrl','verifiedAt','status','vendors','productId','retiredReason','retiredAt'])expect(json).not.toContain(`"${field}":`);
 expect(json).not.toContain('old-audit-note');expect(json).not.toContain('https://example.com');
 expect(json.match(/"revision":/g)).toHaveLength(1);
});
it('substantially reduces a full directory prompt without truncating its verified IDs',()=>{
 const full:MembershipCatalog={revision:99,products:Array.from({length:40},(_,i)=>({...entry(`product-${i}`,'verified'),platformIds:[`vendor-${i}`],sourceUrl:'https://official.example/pricing/'+i,verifiedAt:'2026-10-20',revision:99})),plans:[]};
 full.plans=full.products.flatMap(product=>Array.from({length:8},(_,i)=>({...entry(`${product.id}-plan-${i}`,'verified'),productId:product.id,billing:'paid' as const,sourceUrl:product.sourceUrl,verifiedAt:'2026-10-20',revision:99})));
 const prompt=fastTrackCatalogPrompt(full);
 expect(prompt.products).toHaveLength(40);expect(prompt.products.flatMap(p=>p.plans)).toHaveLength(320);
 expect(Buffer.byteLength(JSON.stringify(prompt))).toBeLessThan(Buffer.byteLength(JSON.stringify(fastTrackCatalogChoices(full)))*0.5);
});
it('keeps legacy product and plan semantics even when current and legacy plans share a name',()=>{
 const full:MembershipCatalog={revision:3,products:[{...entry('same-product','verified'),legacy:true}],plans:[{...entry('current-pro','verified'),name:'Pro',productId:'same-product',billing:'paid',legacy:false},{...entry('legacy-pro','verified'),name:'Pro',productId:'same-product',billing:'paid',legacy:true}]};
 const [product]=fastTrackCatalogPrompt(full).products;
 expect(product.legacy).toBe(true);
 expect(product.plans).toEqual([{id:'current-pro',name:'Pro',billing:'paid'},{id:'legacy-pro',name:'Pro',billing:'paid',legacy:true}]);
 expect(fastTrackCatalogPrompt(catalog).products.every(p=>!Object.hasOwn(p,'legacy'))).toBe(true);
});
it('allows a fresh model choice when a specific verified product replaces the old pending directory reference',()=>{
 expect(fastTrackCatalogBlock(fields('MiniMax'),catalog,'MiniMax Code 所有订阅用户免费使用')).toBeNull();
 expect(fastTrackCatalogBlock(fields('MiniMax'),catalog,'MiniMax 订阅用户免费使用')).toMatchObject({catalogRevision:2,entries:[{id:'MiniMax',status:'pending'}]});
});
it('does not hide a selected retired plan behind another verified product',()=>{
 expect(fastTrackCatalogBlock(fields('MiniMax Code',['removed']),catalog,'MiniMax Code 免费使用')).toMatchObject({entries:[{id:'removed',kind:'plan',status:'retired'}]});
});
it('keeps model-invented identifiers in ordinary validation instead of pretending the catalog can verify them',()=>{
 expect(fastTrackCatalogBlock(fields('invented'),catalog,'公开体验')).toBeNull();
});
