import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Calibration } from '../src/shared/screening/types';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

const cal = (model: string): Calibration => ({ model, closeThreshold: 0.9, newThreshold: 0.9, sampleSize: 30, closePrecision: 0.99, wrongNewRate: 0, recurringFalseCloses: 0, status: 'active' });
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const status = (code: number) => new Response('no', { status: code });

describe('screening model client', () => {
  it('falls through models and reports calibration of the model that answered', async () => {
    vi.stubEnv('SCREENING_PACE_MS', '0');
    vi.stubEnv('LLM_MIN_GAP_MS', '0');
    vi.stubEnv('OPENROUTER_API_KEY', 'fake');
    const responses = [status(429), json({ model: 'openrouter/auto-picked:free', choices: [{ message: { content: '{}' } }], usage: { total_tokens: 1, prompt_tokens: 1, completion_tokens: 0 } })];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('/model-budget/reserve')) return json({ id: 1 });
      if (String(url).includes('/settle')) return json({ ok: true });
      return responses.shift() ?? status(500);
    }));
    const { callScreeningModel } = await import('../pipeline/screening/model');
    const r = await callScreeningModel({ system: 's', user: 'u', purpose: 'normal', deadlineAt: Date.now() + 6e4, calibrations: [cal('pinned/a:free')] });
    expect(r).toMatchObject({ model: 'openrouter/auto-picked:free', calibrated: false, paid: false });
  });
  it('uses the paid fallback only for urgent work (Review Focus: quota exhausted with P0 waiting)', async () => {
    vi.stubEnv('SCREENING_PACE_MS', '0');
    vi.stubEnv('LLM_MIN_GAP_MS', '0');
    vi.stubEnv('OPENROUTER_API_KEY', 'fake');
    vi.stubEnv('SCREENING_PAID_MODEL', 'paid/model');
    vi.stubEnv('SCREENING_PAID_PRICE_IN', '1');
    vi.stubEnv('SCREENING_PAID_PRICE_OUT', '2');
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/model-budget/reserve')) return json({ id: 1 });
      if (String(url).includes('/settle')) return json({ ok: true });
      const model = JSON.parse(String(init?.body ?? '{}')).model;
      return model === 'paid/model' ? json({ model, choices: [{ message: { content: '{}' } }], usage: { total_tokens: 3, prompt_tokens: 1, completion_tokens: 2 } }) : status(429);
    }));
    const { callScreeningModel } = await import('../pipeline/screening/model');
    const { DeferError } = await import('../pipeline/llm');
    const base = { system: 's', user: 'u', deadlineAt: Date.now() + 6e4, calibrations: [cal('pinned/a:free')] };
    await expect(callScreeningModel({ ...base, purpose: 'normal' })).rejects.toBeInstanceOf(DeferError);
    expect((await callScreeningModel({ ...base, purpose: 'urgent' })).paid).toBe(true);
  });
});
