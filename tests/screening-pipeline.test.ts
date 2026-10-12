import { afterEach, describe, expect, it, vi } from 'vitest';
import { rec, snapshot } from './fixtures/screening';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

const posted: Record<string, unknown[]> = {};
function mockApi(options: { queue: unknown[]; memory?: ReturnType<typeof snapshot> }) {
  for (const key of Object.keys(posted)) delete posted[key];
  vi.stubEnv('API_BASE', 'https://screening.test');
  vi.stubEnv('INGEST_TOKEN', 'ingest-test-token');
  vi.stubEnv('SCREENING_MODE', 'shadow');
  vi.stubEnv('SCREENING_PACE_MS', '0');
  vi.stubEnv('LLM_MIN_GAP_MS', '0');
  const memory = options.memory ?? snapshot([]);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const path = String(url).replace('https://screening.test/api/ingest/', '').split('?')[0];
    if (init?.body) { posted[path] ??= []; posted[path].push(JSON.parse(String(init.body))); }
    if (path === 'screening/queue') return Response.json({ items: options.queue });
    if (path === 'screening/memory') return Response.json({ ...memory, nextCursor: null });
    return Response.json({ decisionId: 'd', mode: 'shadow', applied: false });
  }));
  return { posted: (path: string) => posted[path] ?? [] };
}
const leadItem = (title: string, origin: string) => ({ itemId: 'lead:1', tier: 'P2', discoveredAt: '2026-10-12T00:00:00.000Z', subject: { kind: 'lead', id: '1', title, origin, url: 'https://linux.do/t/x/1', text: title } });
const item = (tier: string) => ({ itemId: `lead:${tier}`, tier, discoveredAt: '2026-10-12T00:00:00.000Z', subject: { kind: 'lead', id: tier, title: tier, origin: 'linuxdo', url: 'https://linux.do/t/x/2', text: tier } });
const snapshotWithRule = (pattern: string) => snapshot([], { rules: [{ id: 'r1', kind: 'title_pattern' as const, scopeKind: 'global' as const, scopeValue: null, category: 'relay_station' as const, description: pattern, pattern, status: 'active' as const }] });
const newCandidate = () => ({ verdict: { verdict: 'new_candidate', matchId: null, ruleId: null, reasonCategory: null, occurrenceCheck: null, confidence: 0.4, evidenceQuote: 'P2', explanation: '新的', urgency: { tier: 'P2', deadline: null, signals: [], quote: null } }, model: 'm', calibrated: false, contextHash: 'h', downgradeReasons: [] });

describe('screening pipeline', () => {
  it('lets Gate 0 decide without calling the model', async () => {
    const api = mockApi({ queue: [leadItem('【富可敌国】X API 送余额', 'linuxdo')], memory: snapshotWithRule('【富可敌国】') });
    const modelModule = await import('../pipeline/screening/model');
    const model = vi.spyOn(modelModule, 'callScreeningModel');
    const { runScreening } = await import('../pipeline/screening/run');
    const s = await runScreening({ deadlineAt: Date.now() + 6e5, dry: false, log() {} });
    expect(model).not.toHaveBeenCalled(); expect(s.gate0).toBe(1);
    expect(api.posted('screening/verdicts')[0]).toMatchObject({ model: 'gate0', verdict: { verdict: 'rejected_by_rule' } });
  });
  it('screens P0 even after the normal slice ends', async () => {
    mockApi({ queue: [item('P3'), item('P0')] });
    vi.doMock('../pipeline/screening/screener', () => ({ screenSubject: vi.fn(async () => newCandidate()), SCREENING_PROMPT_VERSION: 'screening-v1' }));
    const { runScreening } = await import('../pipeline/screening/run');
    const s = await runScreening({ deadlineAt: Date.now() - 1, dry: false, log() {} });
    expect(s.urgent).toBe(1); expect(s.deferred).toBe(1);
  });
  it('posts verdicts with the prompt version', async () => {
    const api = mockApi({ queue: [item('P2')] });
    vi.doMock('../pipeline/screening/screener', () => ({ screenSubject: vi.fn(async () => newCandidate()), SCREENING_PROMPT_VERSION: 'screening-v1' }));
    const { runScreening } = await import('../pipeline/screening/run');
    await runScreening({ deadlineAt: Date.now() + 6e5, dry: false, log() {} });
    expect(api.posted('screening/verdicts')[0]).toMatchObject({ promptVersion: 'screening-v1' });
  });
});
void rec;
