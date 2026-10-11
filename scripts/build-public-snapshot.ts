/** Generate sanitized PUBLIC assets from an owner-only approved database backup. Never copy raw rows. */
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,writeFileSync} from 'node:fs';
import {publicSafeValuation,valuationMatchesAmounts} from '../src/shared/valuation';
const [input,capturedAt,output='public/public-snapshot.json']=process.argv.slice(2);
if(!input||!capturedAt||!Number.isFinite(Date.parse(capturedAt)))throw Error('Usage: backup.sqlite capturedAt output.json');
const db=new DatabaseSync(input,{readOnly:true});
const fields=['id','platform_id','title','type','tags','models','modalities','claim_method','requirements','audience','value_text','usd_estimate','usd_max','valuation','claim_start','claim_end','end_kind','credit_validity','source_tz','published_at','discovered_at','last_verified_at','verify_result','withdrawn_at','withdrawn_reason','admin_note','review_state','evidence','steps','first_channel','created_at','updated_at'];
const jsonFields=new Set(['tags','models','modalities','requirements','valuation','evidence','steps']);
const camel=(s:string)=>s.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());
const offers=db.prepare(`SELECT o.* FROM offers o JOIN platforms p ON p.id=o.platform_id WHERE o.review_state='approved' AND p.status='approved' AND NOT EXISTS(SELECT 1 FROM benefit_entities e WHERE e.canonical_offer_id=o.id AND e.state<>'active')`).all().map(row=>{
 const pub=Object.fromEntries(fields.map(k=>[camel(k),jsonFields.has(k)&&row[k]!=null?JSON.parse(String(row[k])):row[k]]));
 const value=publicSafeValuation(pub.valuation);pub.valuation=value&&valuationMatchesAmounts(value,pub as never)?value:null;return pub;
});
const platforms=db.prepare("SELECT id,name,type,status,site,x_handles,wechat FROM platforms WHERE status='approved'").all().map(row=>({id:row.id,name:row.name,type:row.type,status:row.status,site:row.site,xHandles:JSON.parse(String(row.x_handles)),wechat:row.wechat}));
const sources=db.prepare('SELECT kind,enabled,fail_streak,last_ok_at,platform_id,url FROM sources').all();
const byKind:Record<string,{total:number;enabled:number;failing:number}>={};
for(const source of sources){const item=byKind[String(source.kind)]??={total:0,enabled:0,failing:0};item.total++;if(source.enabled){item.enabled++;if(Number(source.fail_streak)>=3||!source.last_ok_at)item.failing++;}}
const coverage={sources:sources.filter(s=>s.enabled).length,byKind,officialPages:sources.filter(s=>s.enabled&&s.platform_id).map(s=>({platformId:s.platform_id,url:s.url,kind:s.kind,healthy:Number(s.fail_streak)<3&&!!s.last_ok_at}))};
mkdirSync('public',{recursive:true});writeFileSync(output,JSON.stringify({capturedAt,offers,platforms,coverage}));db.close();
console.log(JSON.stringify({offers:offers.length,platforms:platforms.length,capturedAt,output}));
