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
