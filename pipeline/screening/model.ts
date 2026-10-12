import { DeferError, pace, providerCall } from '../llm';
import type { Calibration } from '../../src/shared/screening/types';

let nextScreeningCall = 0;
async function screeningPace() {
  const gap = Number(process.env.SCREENING_PACE_MS ?? 4000);
  const start = Math.max(Date.now(), nextScreeningCall);
  nextScreeningCall = start + Math.max(0, gap);
  const wait = start - Date.now();
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  await pace();
}

function retryable(error: unknown): boolean {
  const status = (error as { httpStatus?: number }).httpStatus;
  return status === 429 || (status != null && status >= 500);
}

async function openRouter(model: string, system: string, user: string, timeoutMs: number) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ''}` },
    body: JSON.stringify({ model, temperature: 0.1, max_tokens: 1024, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw Object.assign(new Error(`openrouter ${response.status}`), { httpStatus: response.status });
  const body = await response.json() as { model?: string; choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number } };
  return { text: body.choices?.[0]?.message?.content ?? '', model: body.model || model, tokens: body.usage?.total_tokens ?? 0, prompt: body.usage?.prompt_tokens ?? 0, completion: body.usage?.completion_tokens ?? 0 };
}

export async function callScreeningModel(i: { system: string; user: string; purpose: 'urgent' | 'normal' | 'backfill'; deadlineAt: number; calibrations: Calibration[] }): Promise<{ text: string; model: string; calibrated: boolean; paid: boolean; tokens: number; costCny: number }> {
  const active = i.calibrations.filter(item => item.status === 'active').sort((a, b) => b.closePrecision - a.closePrecision);
  const pinned = (process.env.SCREENING_MODELS ?? '').split(',').map(item => item.trim()).filter(Boolean);
  const models = [...new Set([...active.map(item => item.model), ...pinned, 'openrouter/free'])];
  const timeout = Math.max(1000, i.deadlineAt - Date.now());
  await screeningPace();
  for (const model of models) {
    try {
      const result = await openRouter(model, i.system, i.user, timeout);
      return { text: result.text, model: result.model, calibrated: active.some(item => item.model === result.model), paid: false, tokens: result.tokens, costCny: 0 };
    } catch (error) {
      if (!retryable(error)) throw error;
    }
  }
  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await providerCall('gemini', i.system, i.user, timeout);
      const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
      return { text: result.text, model, calibrated: active.some(item => item.model === model), paid: false, tokens: result.tokens, costCny: 0 };
    } catch (error) {
      if (!retryable(error)) throw error;
    }
  }
  if (i.purpose === 'urgent' && process.env.SCREENING_PAID_MODEL) {
    const result = await openRouter(process.env.SCREENING_PAID_MODEL, i.system, i.user, timeout);
    const priceIn = Number(process.env.SCREENING_PAID_PRICE_IN ?? 0);
    const priceOut = Number(process.env.SCREENING_PAID_PRICE_OUT ?? 0);
    return { text: result.text, model: result.model, calibrated: active.some(item => item.model === result.model), paid: true, tokens: result.tokens, costCny: (result.prompt * priceIn + result.completion * priceOut) / 1e6 };
  }
  throw new DeferError('screening model unavailable');
}
