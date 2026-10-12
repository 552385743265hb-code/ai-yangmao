import { describe, expect, it } from 'vitest';
import { findNearDuplicate, urlKey } from '../src/shared/screening/gate0';
import type { GateSubject } from '../src/shared/screening/gate0';
import { rec, snapshot } from './fixtures/screening';

const now = new Date('2026-10-12T00:00:00Z');
const leadSubject = (title: string): GateSubject => ({ kind: 'lead', url: 'https://linux.do/t/x/1', origin: 'linuxdo', platformId: null, title, openingText: '' });

describe('gate 0', () => {
  it('normalizes community and X URLs', () => {
    expect(urlKey('https://linux.do/t/topic/123456/7?u=x')).toBe(urlKey('https://linux.do/t/another-slug/123456'));
    expect(urlKey('https://twitter.com/OpenAI/status/1?s=20')).toBe(urlKey('https://x.com/openai/status/1'));
  });
  it('never treats a recurring offer as a Gate 0 copy', () => {
    const memory = snapshot([rec('offer:a', { platformId: 'openai', title: 'Codex 额度重置', recurring: true, decision: 'approved' })]);
    expect(findNearDuplicate({ kind: 'candidate', url: 'https://x.com/a/status/2', origin: null, platformId: 'openai', title: 'Codex 额度重置', openingText: '' }, memory, now)).toBeNull();
  });
  it('only owner rejections close a repost', () => {
    const record = { ref: 'lead:1', kind: 'lead' as const, origin: 'linuxdo', title: '送点 workbuddy 自建站的额度', decision: 'rejected' as const, decidedAt: '2026-10-10T00:00:00Z' };
    expect(findNearDuplicate(leadSubject('送点workbuddy自建站的额度！'), snapshot([rec('lead:1', { ...record, actorKind: 'model' })]), now)).toBeNull();
    expect(findNearDuplicate(leadSubject('送点workbuddy自建站的额度！'), snapshot([rec('lead:1', { ...record, actorKind: 'owner' })]), now)?.matchKind).toBe('rejected_lead');
  });
});
