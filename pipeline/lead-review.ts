import {api,fetchPage,relevantText} from './lib';
import {extract,modelAvailable,DeferError} from './llm';
import {modelBudget,BudgetExhaustedError,BudgetLedgerError} from './budget';
import {searchOfficial} from './official-review';
import {officialTier,officialActivityMismatch,type OfficialPlatform,type OfficialSource} from '../src/shared/official-review';
import {platformMentioned,leadScopeMismatch} from '../src/shared/lead-scope';
import {normUrl} from '../src/shared/dedupe';
import {offerIn} from '../src/shared/ingest';
import {toOffer} from './offer-draft';
import type {Source} from './collectors';
interface Existing {id:string;platformId:string;title:string;valueText:string;claimStart:string|null;publishedAt:string|null;evidenceUrl:string;reviewState:string}
interface Job {claimed:boolean;jobId:string;lead:{id:number;title:string|null;url:string;raw:string|null;origin:string};platforms:OfficialPlatform[];sources:OfficialSource[];existing:Existing[];previousCandidates?:string[]}
export interface LeadReviewOptions {limit:number;ids?:number[];deadlineAt:number;dry:boolean;allowPaid:boolean;canContinue:()=>boolean;account:(tokens:number,cost:number)=>void;log:(...args:unknown[])=>void}
export async function runLeadReviews(options:LeadReviewOptions){
  const stats={checked:0,linked:0,closed:0,retry:0,manual:0,deferred:0};
  if(options.dry||options.limit<=0)return stats;
  const {jobs}=await api<{jobs:{id:number}[]}>(`/lead-reviews/queue?limit=${options.limit}${options.ids?.length?'&ids='+options.ids.join(','):''}`);
  let searchPaused=false;
  for(const [index,q] of jobs.entries()){
    if(!options.canContinue()||!modelAvailable(options.allowPaid)||Date.now()>=options.deadlineAt){stats.deferred+=jobs.length-index;break;}
    const job=await api<Job>(`/lead-reviews/${q.id}/claim`,{});if(!job.claimed)continue;
    stats.checked++;
    const deadlineAt=Math.min(options.deadlineAt,Date.now()+3*60_000),queries:string[]=[],candidates:string[]=[],reasons:string[]=[],offerIds:string[]=[];
    let outcome:'linked'|'closed'|'retry'|'manual'='manual',reason='',evidenceUrl:string|undefined,quote:string|undefined,sourceText:string|undefined;
    let stop=false,technical=false,readable=0,hadInvalid=false;
    try{
      const {lead,platforms,sources}=job;
      const targetText=`${lead.title??''}\n${(lead.raw??'').split('[研判]')[0]}`;
      const authority=(url:string)=>platforms.filter(p=>officialTier(url,p,sources.filter(s=>s.platformId===p.id)));
      const primaryOwners=authority(lead.url);
      const identified=primaryOwners.length?primaryOwners:platforms.filter(p=>platformMentioned(targetText,p)).slice(0,4);
      const {corrections}=await api<{corrections:string[]}>('/corrections?limit=10');
      const urls=[lead.url,...(targetText.match(/https?:\/\/[^\s<>"）)]+/g)??[])];
      const processed=new Set<string>();
      const previous=new Set((job.previousCandidates??[]).map(normUrl));
      // 首先读原文，再按目标搜索，避免只靠转述标题或搜索摘要下结论。
      for(let phase=0;phase<2&&outcome!=='linked'&&outcome!=='closed';phase++){
        if(phase===1){
          if(!searchPaused){
            const domains=identified.flatMap(p=>[p.site,...sources.filter(s=>s.platformId===p.id&&['docs','site','official'].includes(s.tier)).map(s=>s.url)])
              .filter((v):v is string=>!!v).flatMap(v=>{try{return [new URL(v).hostname];}catch{return [];}});
            const query=`${lead.title??targetText.slice(0,160)} 官方 原文 ${[...new Set(domains)].slice(0,3).map(d=>'site:'+d).join(' OR ')}`.slice(0,350);
            const originHandle=/^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([^/]+)\/status/.exec(lead.url)?.[1];
            const knownHandles=identified.flatMap(p=>[...p.staffHandles,...p.xHandles]);
            const handles=[...new Set([...(originHandle&&knownHandles.some(h=>h.toLowerCase()==='@'+originHandle.toLowerCase())?['@'+originHandle]:[]),...knownHandles])].slice(0,3);
            const planned=[query,...(handles.length?[`${lead.title??''} ${handles.map(h=>'site:x.com/'+h.replace(/^@/,'')+'/status').join(' OR ')}`.slice(0,350)]:[])];
            for(const search of planned){
              queries.push(search);
              try{urls.push(...await searchOfficial(search,deadlineAt));}catch(e){technical=true;searchPaused=true;reasons.push('搜索受限：'+(e as Error).message.slice(0,120));break;}
            }
          }else{technical=true;reasons.push('搜索服务本轮冷却，保留已知来源核验');}
          urls.push(...identified.flatMap(p=>sources.filter(s=>s.platformId===p.id&&['docs','site','official'].includes(s.tier)).map(s=>s.url)));
        }
        const ordered=phase===0?[lead.url]:[...urls.filter(u=>!previous.has(normUrl(u))),...urls.filter(u=>previous.has(normUrl(u)))];
        for(const url of ordered){
          if(processed.has(normUrl(url))||candidates.length>=3)continue;
          const owners=authority(url);
          if(!owners.length)continue;
          if(!options.canContinue()||Date.now()>=deadlineAt)throw new DeferError('本轮复核时间或模型预算不足');
          processed.add(normUrl(url));candidates.push(url);
          let page;
          try{page=await fetchPage(url,{timeoutMs:10000,tries:1,minimumTextLength:100});}
          catch{technical=true;reasons.push('官方正文暂不可读：'+url);continue;}
          const owner=owners.find(p=>officialTier(page.finalUrl,p,sources.filter(s=>s.platformId===p.id)));
          if(!owner||(page.via==='jina'&&!page.sourceVerified)){technical=true;reasons.push('正文来源无法确认：'+url);continue;}
          readable++;
          const result=await extract(owner.name,page.finalUrl,page.text.slice(0,22000),options.log,{allowPaid:options.allowPaid,deadlineAt,budget:modelBudget,
            evidenceText:page.text,platformIds:[owner.id],platformList:platforms.map(p=>p.id+'='+p.name).join('；'),existing:job.existing.filter(o=>o.platformId===owner.id).map(o=>`${o.id}｜${o.title}｜${o.valueText}｜证据:${o.evidenceUrl}`).join('\n'),corrections,leadTarget:JSON.stringify({title:lead.title,originUrl:lead.url,summary:targetText.slice(0,2500)})});
          options.account(result.tokens,result.costCny);
          if(result.offers.length){
            if(result.offers.length>50){hadInvalid=true;reasons.push('候选超过单轮上限，需人工拆分核对');continue;}
            for(const next of result.offers){
              if(Date.now()>=deadlineAt){hadInvalid=true;technical=true;reasons.push('本轮只完成部分候选，剩余权益下轮继续');break;}
              const signal=lead.title??'';
              const hintedTags=/重置|reset/i.test(signal)?['reset']:/每日|每天|签到|daily/i.test(signal)?['daily']:/邀请|referral/i.test(signal)?['referral']:[];
              if(hintedTags.length&&officialActivityMismatch({title:signal,valueText:'',type:'perk',tags:hintedTags},next)){
                hadInvalid=true;reasons.push('候选福利机制与线索不符，保留原线索供核对');continue;
              }
              const issuer=platforms.find(p=>p.id===next.platformId)||(!next.platformId?owner:undefined);
              if(!issuer){hadInvalid=true;reasons.push('发放平台尚未准入');continue;}
              const mismatch=leadScopeMismatch(lead,issuer,sources.filter(s=>s.platformId===issuer.id),{...next,evidence:{url:page.finalUrl,excerpts:next.excerpts}});
              if(mismatch){hadInvalid=true;reasons.push(mismatch);continue;}
              const tier=officialTier(page.finalUrl,issuer,sources.filter(s=>s.platformId===issuer.id));
              if(!tier||!next.excerpts.benefit?.trim()){hadInvalid=true;reasons.push('未获得发放方权益原文');continue;}
              const prior=next.sameAs?job.existing.find(o=>o.id===next.sameAs&&o.platformId===issuer.id):undefined;
              const draft=offerIn.safeParse({...toOffer({id:'',kind:lead.origin,platformId:issuer.id,tier} as Source,{...next,...(prior?{fixedId:prior.id}:{})},page.finalUrl,relevantText(page.text)),leadId:lead.id,leadReviewJobId:job.jobId,sourceText:page.text.length<=250000?page.text:undefined});
              if(!draft.success){hadInvalid=true;reasons.push('抽取字段不完整，需补字段');continue;}
              const saved=await api<{results:{id:string;error?:string;skipped?:string;duplicateId?:string}[]}>('/offers',[draft.data]);
              const record=saved.results[0];
              if(record?.duplicateId){offerIds.push(record.duplicateId);continue;}
              if(!record||record.error||record.skipped){hadInvalid=true;reasons.push(record?.error??record?.skipped??'入库未确认');continue;}
              offerIds.push(record.id);
            }
            if(offerIds.length&&!hadInvalid){outcome='linked';reason='官方复核已形成待审条目或关联已有活动；未自动批准';break;}
          }else if(result.leadAssessment){
            const a=result.leadAssessment;
            const matched=job.existing.find(o=>o.id===a.offerId&&o.platformId===owner.id);
            const mismatch=matched?leadScopeMismatch(lead,owner,sources.filter(s=>s.platformId===owner.id),{...matched,type:'',evidence:{url:matched.evidenceUrl}}):null;
            if(mismatch){hadInvalid=true;reasons.push(mismatch);continue;}
            if(!hadInvalid&&a.outcome==='existing'&&matched){
              offerIds.push(a.offerId!);outcome='linked';reason=a.reason;evidenceUrl=page.finalUrl;quote=a.quote;sourceText=page.text;break;
            }
            // 仅原始官方帖可直接认定“无独立福利”，相关搜索页没有提及不能证明原线索无效。
            if(!hadInvalid&&!offerIds.length&&a.outcome==='not_benefit'&&normUrl(page.finalUrl)===normUrl(lead.url)){
              outcome='closed';reason=a.reason;evidenceUrl=page.finalUrl;quote=a.quote;sourceText=page.text.slice(0,250000);break;
            }
            reasons.push(a.reason);
          }else reasons.push('官方正文未形成可应用条目，需核对是否预告、进度或已有活动');
        }
      }
      if(outcome!=='linked'&&outcome!=='closed'){
        outcome=technical?'retry':'manual';
        reason=(reasons.join('；')||(!identified.length?'未能确认发放平台，请补充官方出处或平台准入':'尚未找到支持独立福利的官方证据')).slice(0,1000);
        if(!readable&&candidates.length)outcome='retry';
      }
    }catch(e){outcome='retry';reason='复核受阻：'+(e as Error).message.slice(0,800);stop=e instanceof BudgetExhaustedError||e instanceof BudgetLedgerError||e instanceof DeferError;}
    const receipt=await api<{status:keyof typeof stats}>(`/lead-reviews/${q.id}/result`,{jobId:job.jobId,outcome,reason,offerIds:[...new Set(offerIds)],queries,candidates:[...new Set([...(job.previousCandidates??[]),...candidates])].slice(-12),evidenceUrl,quote,sourceText});
    if(receipt.status in stats)stats[receipt.status]++;
    options.log(`  受阻线索 #${q.id}：${receipt.status} ${reason.slice(0,100)}`);
    if(stop){stats.deferred+=jobs.length-index-1;break;}
  }
  return stats;
}
