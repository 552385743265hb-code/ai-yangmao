import {describe,it,expect} from 'vitest';
import {changedOfficialTerms,rejectedTermsStillPresent} from '../src/shared/review-stability';
import type {Evidence} from '../src/db/schema';
const ev=(url:string,excerpts:Evidence['excerpts']):Evidence=>({url,tier:'site',capturedAt:'2026-10-10',excerpts});
describe('review stability requires changed terms rather than missing wording',()=>{
 it('does not reopen U2-Flash when the same page is fetched in English',()=>{
  const before=ev('https://maas.unisound.com/model-hub/u2-flash',{benefit:'U2 Flash 全新上线！限时免费无限量调用（2026.09.30-2026.10.31）！立即查看',eligibility:'限时免费 · 活动期间新老用户均免费调用',validity:'2026.09.30-2026.10.31'});
  const after=ev(before.url,{benefit:'U2 Flash is now live! Unlimited free API calls for a limited time (2026.09.30–2026.10.31)!',eligibility:'Limited-time free · Free for new and existing users during the promotion',validity:'2026.09.30–2026.10.31'});
  expect(changedOfficialTerms(before,after,Object.values(after.excerpts).join('\n'))).toBe(false);
 });
 it('does not reopen a WorkBuddy status when the model expands a truncated excerpt',()=>{
  const before=ev('https://x.com/WorkBuddy_AI/status/2108082016860413973',{benefit:'Invite them in and earn 100 credits. They’ll start with 350 credits too, including 100 referral credits + 250 welcome credits.'});
  const after=ev(before.url,{benefit:'Invite them in and earn 100 credits once they sign up and submit their first query.\nThey’ll start with 350 credits too, including 100 referral credits + 250 welcome credits.',eligibility:'Got a friend who should be using WorkBuddy?'});
  expect(changedOfficialTerms(before,after,Object.values(after.excerpts).join('\n'))).toBe(false);
 });
 it('does not treat excerpt expansion, omission or numeric formatting as changed entitlements',()=>{
  const before=ev('https://vendor.example/credits',{benefit:'Every user receives 60,000 credits per 5 hours.'});
  for(const text of ['The free tier provides 6万积分 / 5小时.','Free users receive 60k credits every 5 hours.','The free plan grants 60000 credits.']){
   expect(changedOfficialTerms(before,ev(before.url,{benefit:text}),text)).toBe(false);
  }
 });
 it('still accepts a grounded quantity, deadline or eligibility replacement',()=>{
  for(const [oldText,newText,key] of [
   ['Free 100 tokens.','Free 200 tokens.','benefit'],
   ['Available until 2026-10-31.','Available until 2026-11-15.','validity'],
   ['Available to all users.','Available to students only.','eligibility'],
  ] as const){const before=ev('https://vendor.example/free',{[key]:oldText});const after=ev(before.url,{[key]:newText});expect(changedOfficialTerms(before,after,newText)).toBe(true);}
 });
 it('keeps an identical status URL frozen despite numeric extraction drift',()=>{
  const before=ev('https://x.com/vendor/status/1234567890123456789',{benefit:'Free 100 tokens.'});const after=ev(before.url,{benefit:'Free 200 tokens.'});expect(changedOfficialTerms(before,after,'Free 200 tokens.')).toBe(false);
 });
 it('remembers rejected terms across wording/language while allowing a new quantity',()=>{
  const before=ev('https://vendor.example/free',{benefit:'Free 200 tokens.',eligibility:'All users.'});
  const same=ev(before.url,{benefit:'免费赠送200 Token。',eligibility:'所有用户均可领取。'});
  expect(rejectedTermsStillPresent(before,same,Object.values(same.excerpts).join('\n'))).toBe(true);
  const changed=ev(before.url,{benefit:'免费赠送300 Token。',eligibility:'所有用户均可领取。'});
  expect(rejectedTermsStillPresent(before,changed,Object.values(changed.excerpts).join('\n'))).toBe(false);
 });
 it('requires actual full source and does not guess a change from unrecognized wording',()=>{
  const before=ev('https://vendor.example/free',{benefit:'Access is generally available.'});const after=ev(before.url,{benefit:'Access can now be requested.'});expect(changedOfficialTerms(before,after,'Access can now be requested.')).toBe(false);expect(changedOfficialTerms(before,after)).toBe(false);
 });
});
