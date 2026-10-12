import { describe, expect, it } from 'vitest';
import { agentSearchSchema, searchAgentOffers } from '../src/shared/agent-query';

const now = new Date('2026-10-11T12:00:00Z');
const catalog = { revision: 0, products: [], plans: [] };
const offer = (id: string, extra = {}) => ({ id, platformId:'vendor', platform:'Vendor', title:id, type:'free', modalities:['text'], models:['Model A'], tags:[], claimMethod:'signup', requirements:['none'], audience:'all', valueText:'免费额度', usdEstimate:null, usdMax:null, valuation:null, claimStart:null, claimEnd:null, endKind:'unknown', creditValidity:null, sourceTz:'UTC', discoveredAt:now.toISOString(), lastVerifiedAt:now.toISOString(), verifyResult:'ok', withdrawnAt:null, evidence:{tier:'site',url:'https://vendor.example',excerpts:{benefit:'Free credits'}}, steps:[], ...extra });

describe('public agent filtering and qualification', () => {
  it('keeps approved legacy membership visible as unmatched without requesting a new offer approval', () => {
    const requirement = {schemaVersion:'membership-v1',status:'needs_review',catalogRevision:1,anyOf:[],evidenceUrls:[],legacyText:['OpenCode Go 或 Go Plus']};
    const result = searchAgentOffers([offer('legacy',{reviewState:'approved',requirements:['member:OpenCode Go 或 Go Plus'],membershipRequirement:requirement})] as any,
      catalog,agentSearchSchema.parse({profile:{subscriptions:[{planId:'opencode-go'}]}}),now);
    expect(result.groups.unknown[0].eligibility.reasons.join(' ')).toContain('已批准');
    expect(result.groups.eligible).toHaveLength(0);
  });
  it('keeps absent user conditions unknown and distinguishes explicit false', () => {
    const offers = [offer('free'),offer('student',{requirements:['student']}),offer('card',{requirements:['card']})];
    const result = searchAgentOffers(offers as any,catalog,agentSearchSchema.parse({profile:{student:false}}),now);
    expect(result.groups.eligible.map(o=>o.id)).toEqual(['free']);
    expect(result.groups.ineligible.map(o=>o.id)).toEqual(['student']);
    expect(result.groups.unknown.map(o=>o.id)).toEqual(['card']);
  });
  it('uses inclusive limits, deterministic pagination, and does not treat unknown prices as zero', () => {
    const result = searchAgentOffers([offer('b'),offer('a'),offer('ended',{claimEnd:'2026-10-10',endKind:'date'})] as any,catalog,agentSearchSchema.parse({model:'model a',sort:'value',limit:1}),now);
    expect(result.total).toBe(2); expect(result.offers[0].id).toBe('a'); expect(result.nextOffset).toBe(1);
    expect(searchAgentOffers([offer('b'),offer('a')] as any,catalog,agentSearchSchema.parse({limit:1,offset:1,sort:'value'}),now).offers[0].id).toBe('b');
  });
  it('filters requirements conservatively and never calls unknown eligibility zero threshold', () => {
    const offers=[offer('yes'),offer('unknown',{requirements:['unknown']}),offer('member',{requirements:['member:Example Pro']})];
    expect(searchAgentOffers(offers as any,catalog,agentSearchSchema.parse({requirement:'zero'}),now).offers.map(o=>o.id)).toEqual(['yes']);
    expect(searchAgentOffers(offers as any,catalog,agentSearchSchema.parse({requirement:'nopay'}),now).offers.map(o=>o.id)).toEqual(['yes']);
  });
  it('does not default omitted subscription ownership to no membership', () => {
    const members={revision:1,products:[{id:'p',name:'P',aliases:[],status:'verified',sourceUrl:'https://p.example',verifiedAt:null,revision:1}],plans:[{id:'pro',productId:'p',name:'Pro',aliases:[],status:'verified',billing:'paid',sourceUrl:'https://p.example',verifiedAt:null,revision:1}]};
    const o=offer('member',{requirements:['member:P Pro'],membershipRequirement:{schemaVersion:'membership-v1',status:'confirmed',catalogRevision:1,anyOf:[{allOf:[{productId:'p',scope:'plans',planIds:['pro'],excludePlanIds:[]}]}],evidenceUrls:['https://p.example']}});
    expect(searchAgentOffers([o] as any,members as any,agentSearchSchema.parse({profile:{}}),now).groups.unknown).toHaveLength(1);
    expect(searchAgentOffers([o] as any,members as any,agentSearchSchema.parse({profile:{subscriptions:[]}}),now).groups.ineligible).toHaveLength(1);
    expect(searchAgentOffers([o] as any,members as any,agentSearchSchema.parse({profile:{subscriptions:[{planId:'pro'}]}}),now).groups.eligible).toHaveLength(1);
    members.plans.push({...members.plans[0],id:'basic',name:'Basic'});
    expect(searchAgentOffers([o] as any,members as any,agentSearchSchema.parse({profile:{subscriptions:[{planId:'basic'}]}}),now).groups.unknown).toHaveLength(1);
    expect(searchAgentOffers([o] as any,members as any,agentSearchSchema.parse({profile:{subscriptions:[{planId:'basic'}],subscriptionsComplete:true}}),now).groups.ineligible).toHaveLength(1);
  });
  it('rejects unsupported filters and oversized pages instead of silently ignoring them',()=>{
    expect(agentSearchSchema.safeParse({admin:true}).success).toBe(false);
    expect(agentSearchSchema.safeParse({limit:51}).success).toBe(false);
    expect(agentSearchSchema.safeParse({profile:{subscriptions:[{planId:'pro',startedOn:'2026-02-30'}]}}).success).toBe(false);
  });
  it('does not call a future verification timestamp a confirmed match',()=>{
    const result=searchAgentOffers([offer('future',{lastVerifiedAt:'2099-01-01T00:00:00Z'})] as any,catalog,agentSearchSchema.parse({}),now);
    expect(result.groups.eligible).toHaveLength(0);
    expect(result.groups.unknown[0].eligibility.reasons.join(' ')).toContain('核验时间');
  });
});
