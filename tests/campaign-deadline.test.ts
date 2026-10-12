import {describe,it,expect} from 'vitest';
import {fillCampaignDeadline} from '../src/shared/campaign-deadline';
import {collectedOfferIn,offerIn} from '../src/shared/ingest';
const base={id:'kilo-step5-week',platformId:'kilo',title:'Step 5 Preview 免费一周',type:'free',modalities:['text'],claimMethod:'auto',requirements:['net'],valueText:'限时免费',claimStart:'2026-10-09',claimEnd:null,endKind:'unknown',sourceTz:'UTC',publishedAt:'2026-10-09T13:55:42Z',evidence:{url:'https://x.com/kilocode/status/2108557014913691902',tier:'official',capturedAt:'2026-10-11',excerpts:{benefit:"Step 5 Preview is FREE in Kilo for a week:"}}};
describe('grounded one-week campaign deadlines',()=>{
 it('fills collector and intake deadlines with traceable precision',()=>{
  const o=collectedOfferIn.parse(base);expect(o.claimEnd).toBe('2026-10-16');expect(o.endKind).toBe('date');expect(o.evidence.claimEndDerivation).toMatchObject({durationDays:7,anchorField:'publishedAt',precision:'timestamp',estimatedEndAt:'2026-10-16T13:55:42.000Z'});expect(o.evidence.excerpts).toEqual(base.evidence.excerpts);
 });
 it('keeps date-only precision across month/year boundaries',()=>{
  const o=fillCampaignDeadline({...base,claimStart:'2026-12-28',publishedAt:'2026-12-28'});expect(o.claimEnd).toBe('2027-01-04');expect(o.evidence.claimEndDerivation).toMatchObject({precision:'date',estimatedEndAt:null});
 });
 it('uses an explicit campaign start over an earlier announcement',()=>{expect(fillCampaignDeadline({...base,claimStart:'2026-10-12'}).claimEnd).toBe('2026-10-19');});
 it.each(['Free for 7 days after activation','注册后免费使用一周','Free for a week for each user'])('does not convert personal validity: %s',quote=>{expect(fillCampaignDeadline({...base,evidence:{...base.evidence,excerpts:{benefit:quote}}}).claimEnd).toBeNull();});
 it('does not infer from a title, a month, an ungrounded excerpt, or a media lead',()=>{
  expect(fillCampaignDeadline({...base,evidence:{...base.evidence,excerpts:{benefit:'Free model'}}}).claimEnd).toBeNull();
  expect(fillCampaignDeadline({...base,claimStart:null,publishedAt:'2026-10'}).claimEnd).toBeNull();
  expect(fillCampaignDeadline({...base,sourceText:'unrelated source'}).claimEnd).toBeNull();
  expect(fillCampaignDeadline({...base,evidence:{...base.evidence,tier:'media'}}).claimEnd).toBeNull();
 });
 it('preserves an explicit end and leaves existing stored baselines untouched',()=>{
  expect(collectedOfferIn.parse({...base,claimEnd:'2026-10-20',endKind:'date'}).claimEnd).toBe('2026-10-20');expect(offerIn.parse(base).claimEnd).toBeNull();
 });
});

describe('general announced campaign periods',()=>{
 it.each([
  ['免费14天','2026-10-09','2026-10-23'],['Free for 30 days','2026-10-09','2026-11-08'],['免费一月','2026-10-09','2026-11-09'],['限免一个月','2026-01-31','2026-02-28'],['Free for three months','2026-11-30','2027-02-28'],['Free for a year','2024-02-29','2025-02-28'],['免费两周','2026-10-09','2026-10-23'],['Free for fourteen days','2026-10-09','2026-10-23'],['Free for one month and fourteen days','2026-01-31','2026-03-14']
 ])('%s from %s ends %s',(quote,start,end)=>{const o=fillCampaignDeadline({...base,publishedAt:start,claimStart:start,evidence:{...base.evidence,excerpts:{benefit:quote}}});expect(o.claimEnd).toBe(end);expect(o.evidence.claimEndDerivation?.components?.length).toBeGreaterThan(0);});
 it('supports hours without pretending a date-only start supplies an exact time',()=>{
  const o=fillCampaignDeadline({...base,evidence:{...base.evidence,excerpts:{benefit:'Free for 48 hours'}}});expect(o.evidence.claimEndDerivation?.estimatedEndAt).toBe('2026-10-11T13:55:42.000Z');
  const d=fillCampaignDeadline({...base,publishedAt:'2026-10-09',evidence:{...base.evidence,excerpts:{benefit:'限免14小时'}}});expect(d.evidence.claimEndDerivation?.estimatedEndAt).toBeNull();expect(d.evidence.claimEndDerivation?.latestEndAt).toBe('2026-10-10T14:00:00.000Z');
 });
 it('preserves local wall time for calendar months across daylight-saving changes',()=>{const o=fillCampaignDeadline({...base,claimStart:'2026-10-09',publishedAt:'2026-10-09T16:00:00Z',sourceTz:'America/New_York',evidence:{...base.evidence,excerpts:{benefit:'Free for a month'}}});expect(o.evidence.claimEndDerivation?.estimatedEndAt).toBe('2026-11-09T17:00:00.000Z');});
 it.each(['免费14天或30天','Free for 14 days; credits valid for 30 days','每月免费30天','注册后免费一个月','Free for half a month'])('keeps ambiguous/recurring/personal periods unresolved: %s',quote=>{expect(fillCampaignDeadline({...base,evidence:{...base.evidence,excerpts:{benefit:quote}}}).claimEnd).toBeNull();});
});

describe('campaign scope across offer types',()=>{
 it('supports declared promotion windows beyond the free type',()=>{const o=fillCampaignDeadline({...base,type:'gift',evidence:{...base.evidence,excerpts:{validity:'活动持续14天'}}});expect(o.claimEnd).toBe('2026-10-23');});
 it('does not mistake membership entitlement for the campaign deadline',()=>{expect(fillCampaignDeadline({...base,type:'gift',evidence:{...base.evidence,excerpts:{benefit:'Get free membership for three months'}}}).claimEnd).toBeNull();});
 it('handles explicit fractional hours without treating half a month as 15 days',()=>{const o=fillCampaignDeadline({...base,evidence:{...base.evidence,excerpts:{validity:'Free for one and a half hours'}}});expect(o.evidence.claimEndDerivation?.estimatedEndAt).toBe('2026-10-09T15:25:42.000Z');});
});

describe('other explicit calendar periods',()=>{
 it.each([['Free for two quarters','2026-10-09','2027-04-09'],['限免一个季度','2026-10-09','2027-01-09'],['Free for a fortnight','2026-10-09','2026-10-23'],['Free for one month and one month','2026-01-31','2026-03-31']])('%s',(quote,start,end)=>{expect(fillCampaignDeadline({...base,claimStart:start,publishedAt:start,evidence:{...base.evidence,excerpts:{benefit:quote}}}).claimEnd).toBe(end);});
});

describe('explicit natural-unit wording',()=>{
 it.each([['限免一个自然月','2026-11-09'],['免费30个自然日','2026-11-08'],['Free for one calendar month','2026-11-09']])('%s',(quote,end)=>{expect(fillCampaignDeadline({...base,publishedAt:'2026-10-09',evidence:{...base.evidence,excerpts:{validity:quote}}}).claimEnd).toBe(end);});
});

describe('duration versus absolute date syntax',()=>{
 it.each(['2026年活动限免至年末','限免截止30日','免费至十四日'])('does not reinterpret absolute date wording as a duration: %s',quote=>{expect(fillCampaignDeadline({...base,evidence:{...base.evidence,excerpts:{validity:quote}}}).claimEnd).toBeNull();});
 it.each(['14-day free access','Free for 14days'])('handles explicit compact period wording: %s',quote=>{expect(fillCampaignDeadline({...base,evidence:{...base.evidence,excerpts:{validity:quote}}}).claimEnd).toBe('2026-10-23');});
});
