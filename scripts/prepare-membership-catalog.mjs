/** Prepare an auditable catalog patch from reviewed official findings. Never writes production. */
import {readFileSync,writeFileSync} from 'node:fs';
const [snapshotPath,findingsPath,outputPath]=process.argv.slice(2);
if(!snapshotPath||!findingsPath||!outputPath)throw Error('Usage: node scripts/prepare-membership-catalog.mjs <snapshot.json> <findings.json> <output.json>');
const old=JSON.parse(readFileSync(snapshotPath,'utf8')),findings=JSON.parse(readFileSync(findingsPath,'utf8'));
const next=structuredClone(old),changes=[],unresolved=[];
const normal=s=>s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
const slug=s=>s.normalize('NFKC').toLowerCase().replace(/\+/g,'-plus').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
for(const f of findings.products.filter(f=>f.status==='verified'&&f.applyReady)){
 if(!f.sourceUrl?.startsWith('https://')||!f.quote||!f.platformIds?.length)throw Error('Missing source or vendor: '+f.productId);
 let product=next.products.find(p=>p.id===f.productId);
 if(!product){product={id:f.productId,name:f.name,aliases:[],status:'pending',sourceUrl:f.sourceUrl,verifiedAt:null,revision:0};next.products.push(product);}
 const previousName=product.name,productBefore=JSON.stringify(product),productRevision=product.revision;
 Object.assign(product,{name:f.name,platformIds:f.platformIds,status:'verified',sourceUrl:f.sourceUrl,verifiedAt:findings.checkedAt,revision:productRevision});
 if(previousName!==f.name)product.aliases=[...new Set([...product.aliases,previousName])];
 if(JSON.stringify(product)!==productBefore)product.revision++;
 const expectedIds=[];
 for(const name of f.plans){
  const full=normal(name).startsWith(normal(f.name)+' ')?name:f.name+' '+name;
  const exact=next.plans.filter(p=>p.productId===product.id&&[p.name,...p.aliases].some(n=>[name,full].some(x=>normal(x)===normal(n))));
  if(exact.length>1)throw Error('Ambiguous existing IDs: '+full);
  let plan=f.existingPlanIds?.[name]?next.plans.find(p=>p.id===f.existingPlanIds[name]):exact[0];
  if(plan&&plan.productId!==product.id)throw Error('Cross-product mapping: '+full);
  if(f.existingPlanIds?.[name]&&!plan)throw Error('Missing mapped existing plan: '+f.existingPlanIds[name]);
  if(!plan){const suffix=slug(name),newId=f.newPlanIds?.[name]||(suffix?product.id+'-'+suffix:null);if(!newId)throw Error('Explicit plan ID required: '+full);plan={id:newId,productId:product.id,name:full,aliases:[],status:'pending',sourceUrl:f.sourceUrl,verifiedAt:null,revision:0,billing:'unknown'};if(next.plans.some(p=>p.id===plan.id))throw Error('ID collision: '+plan.id);next.plans.push(plan);}
  const before=plan.name,planBefore=JSON.stringify(plan),planRevision=plan.revision;
  Object.assign(plan,{name:full,billing:f.freePlans.includes(name)?'free':'paid',status:'verified',sourceUrl:f.planSources?.[name]||f.sourceUrl,verifiedAt:findings.checkedAt,revision:planRevision,...(f.legacyPlans?.includes(name)?{legacy:true}:{})});
  plan.aliases=[...new Set([...plan.aliases,...(before!==full?[before]:[])])];expectedIds.push(plan.id);if(JSON.stringify(plan)!==planBefore){plan.revision++;changes.push({id:plan.id,oldName:before,name:full,productId:product.id});}
 }
 for(const p of next.plans.filter(p=>p.productId===product.id&&!expectedIds.includes(p.id)&&p.status!=='retired'))unresolved.push({id:p.id,name:p.name,reason:'Existing plan absent from reviewed official list; explicit mapping required'});
}
const ids=new Set();for(const p of [...next.products,...next.plans]){if(ids.has(p.id))throw Error('Duplicate ID: '+p.id);ids.add(p.id);}
for(const p of next.plans)if(!next.products.some(x=>x.id===p.productId))throw Error('Orphan plan: '+p.id);
if(unresolved.length)throw Error(JSON.stringify({unresolved},null,2));
next.revision=old.revision+1;
writeFileSync(outputPath,JSON.stringify({expectedRevision:old.revision,catalog:next,changes},null,2)+'\n');
console.log(JSON.stringify({expectedRevision:old.revision,products:next.products.length,plans:next.plans.length,changedPlans:changes.length,unresolved},null,2));
