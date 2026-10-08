import { describe,it,expect } from 'vitest';
import { resetEventDay } from '../src/shared/reset-event';
const reset={platformId:'openai',tags:['reset'],sourceTz:'America/Los_Angeles'};
describe('reset occurrence dates',()=>{
  it('joins an explicit scheduled occurrence across announcement and confirmation days',()=>{
    const announce=resetEventDay({...reset,claimStart:'2026-10-08',publishedAt:'2026-10-07T19:00:00Z'});
    const confirmed=resetEventDay({...reset,claimStart:'2026-10-08',publishedAt:'2026-10-08T19:00:00Z'});
    expect(announce).toBe('2026-10-08');expect(confirmed).toBe(announce);
  });
  it('does not let the model reuse an old July start date for a fresh October reset',()=>{
    expect(resetEventDay({...reset,claimStart:'2026-07-13',evidence:{url:'https://x.com/thsottiaux/status/2107913738791596286'}})).toBe('2026-10-07');
  });
  it('does not manufacture a reset event for a recurring allowance',()=>{
    expect(resetEventDay({...reset,tags:['daily'],claimStart:'2026-10-08'})).toBeNull();
  });
});
