import {expect,it} from 'vitest';
import {platformMentioned,leadScopeMismatch} from '../src/shared/lead-scope';
const p={id:'mistral',name:'Mistral AI',site:'https://mistral.ai',xHandles:[],staffHandles:[]};
const c={title:'Mistral Pro 学生价',valueText:'学生认证后5.99美元每月',type:'topup',requirements:['student'],evidence:{url:'https://mistral.ai/pricing'}};
it.each(['PQH AI 充值优惠','API Code Studio cloud','pqh.ai','notmistraltest','https://mistral.ai.attacker.example'])('does not identify a brand from generic or embedded text: %s',text=>{
 expect(platformMentioned(text,p)).toBe(false);
});
it.each(['Mistral Pro学生价','试用Mistral的服务','MISTRAL AI','mistral'])('recognizes real brand references: %s',text=>expect(platformMentioned(text,p)).toBe(true));
it('refuses unrelated offers, invented qualification, and reseller laundering',()=>{
 for(const title of ['PQH AI 号池促销','Mistral API注册额度','Mistral 号池学生优惠']){
  expect(leadScopeMismatch({url:'https://community.example/post',title,raw:''},p,[],c)).toBeTruthy();
 }
});
it('accepts a matching student lead and an exact official landing page',()=>{
 for(const lead of [{url:'https://community.example/post',title:'Mistral学生折扣',raw:''},{url:c.evidence.url,title:'全新方案',raw:''}])expect(leadScopeMismatch(lead,p,[],c)).toBeNull();
});
it('does not trust a matching domain substring or prior model annotation',()=>{
 for(const raw of ['https://mistral.ai.attacker.example/pricing','[研判] Mistral 学生价'])expect(leadScopeMismatch({url:'https://community.example/post',title:'AI优惠',raw},p,[],c)).toBeTruthy();
});
it('detects a wrong mechanism hidden in evidence or omitted from candidate prose',()=>{
 const lead={url:'https://community.example/post',title:'Mistral每日签到送积分',raw:''};
 const hidden={...c,title:'Mistral福利',valueText:'5.99美元',requirements:[],evidence:{url:c.evidence.url,excerpts:{eligibility:'Verified students only.'}}};
 expect(leadScopeMismatch(lead,p,[],hidden)).toBeTruthy();
 expect(leadScopeMismatch(lead,p,[],{...hidden,evidence:{url:c.evidence.url}})).toBeTruthy();
});
it('keeps actual changed official policies eligible for review at their original source',()=>{
 const lead={url:c.evidence.url,title:'Mistral学生计划调整',raw:''};
 expect(leadScopeMismatch(lead,p,[],{...c,valueText:'学生改为每月4.99美元'})).toBeNull();
});

import {leadOccurrenceMismatch,xPostTime} from '../src/shared/lead-scope';
// 2026-10-15：Day 10 重置的回复被模型判为“已收录”，并入 10 月 12 日 Day 8 和 10 月 10 日条目。
const day8={title:'Tibo Day 8 全局使用额度重置',valueText:'全局使用额度重置',tags:['reset'],claimStart:'2026-10-12',claimEnd:'2026-10-12',sourceTz:'America/Los_Angeles',publishedAt:'2026-10-13T01:03:25.000Z'};
const day10Reply={url:'https://x.com/thsottiaux/status/2110595554036400151',createdAt:'2026-10-15T05:28:23.038Z'};
it('reads the post time from an X status id',()=>{
 expect(new Date(xPostTime('https://x.com/thsottiaux/status/2110595484180214059')!).toISOString()).toBe('2026-10-15T04:55:51.053Z');
 expect(xPostTime('https://linux.do/t/topic/1')).toBeNull();
});
it('refuses to fold a later reset round into an earlier reset offer',()=>{
 expect(leadOccurrenceMismatch(day10Reply,day8)).toMatch(/不同日期的重置/);
 // 去重索引只有开始日和发布时间、没有时区时同样拦截
 expect(leadOccurrenceMismatch(day10Reply,{title:day8.title,valueText:day8.valueText,tags:['reset'],claimStart:'2026-10-12',publishedAt:day8.publishedAt})).toBeTruthy();
 expect(leadOccurrenceMismatch({url:'https://x.com/thsottiaux/status/2110618732666257557'},{title:'Codex 额度全球重置',valueText:'',claimStart:'2026-10-10',claimEnd:'2026-10-10',sourceTz:'America/Los_Angeles',publishedAt:'2026-10-10T22:16:20.000Z'})).toBeTruthy();
});
it('keeps confirmations and previews of the same round linkable',()=>{
 expect(leadOccurrenceMismatch({url:'https://x.com/thsottiaux/status/2109873287853707513'},day8)).toBeNull(); // “It's done.” 同一轮到账确认
 expect(leadOccurrenceMismatch({url:'https://community.example/p',createdAt:'2026-10-12T02:00:00Z'},day8)).toBeNull(); // 当天预告/转述
});
it('does not judge non-reset offers or offers without dates',()=>{
 expect(leadOccurrenceMismatch(day10Reply,{title:'Mistral 学生价',valueText:'5.99美元',claimStart:'2026-01-01'})).toBeNull();
 expect(leadOccurrenceMismatch(day10Reply,{title:'Codex 重置',valueText:'',tags:['reset']})).toBeNull();
});
