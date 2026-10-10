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
