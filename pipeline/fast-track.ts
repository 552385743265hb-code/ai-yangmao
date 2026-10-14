import { api, fetchPage } from './lib';
import { extract, modelAvailable, type Extracted } from './llm';
import { modelBudget } from './budget';

/**
 * ⚡ 快速上架：管理员已担保链接与主要权益，这里只用免费模型从链接正文补齐其余字段。
 * 抽取失败或正文不可读时把原因交回 Worker：自动重试，三次后转给管理员手填。
 */
interface Job { id: string; platformId: string; platformName: string; url: string; benefit: string; note: string | null }
export interface FastTrackOptions { deadlineAt: number; dry: boolean; account: (tokens: number, cost: number) => void; log: (...args: unknown[]) => void }

const FIELD_KEYS = ['title', 'type', 'modalities', 'models', 'tags', 'claimMethod', 'requirements', 'audience', 'valueText', 'claimStart', 'claimEnd', 'endKind', 'creditValidity', 'sourceTz', 'steps', 'excerpts'] as const;

const bigrams = (value: string) => { const s = value.toLowerCase().replace(/\s+/g, ''); return new Set(Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s.slice(i, i + 2))); };
/** Character-bigram overlap; works for mixed Chinese and English benefit lines. */
export function similarity(a: string, b: string) {
  const x = bigrams(a), y = bigrams(b);
  if (!x.size || !y.size) return 0;
  let shared = 0; for (const g of x) if (y.has(g)) shared++;
  return shared / Math.min(x.size, y.size);
}

/** The candidate closest to the owner's benefit line, reduced to the listing fields. */
export function fastTrackFields(offers: Extracted[], benefit: string): Record<string, unknown> | null {
  const best = [...offers].sort((a, b) => similarity(benefit, `${b.title} ${b.valueText}`) - similarity(benefit, `${a.title} ${a.valueText}`))[0];
  if (!best) return null;
  const fields: Record<string, unknown> = {};
  for (const key of FIELD_KEYS) if (best[key] !== undefined && best[key] !== null) fields[key] = best[key];
  if (typeof fields.title === 'string') fields.title = fields.title.slice(0, 120);
  if (fields.endKind === 'date' && !fields.claimEnd) fields.endKind = 'unknown';
  if (Array.isArray(fields.steps)) fields.steps = fields.steps.slice(0, 4).map(step => String(step).slice(0, 200));
  return fields;
}

export async function runFastTrack(options: FastTrackOptions) {
  const stats = { claimed: 0, published: 0, needsOwner: 0, requeued: 0 };
  if (options.dry) return stats;
  const { jobs } = await api<{ jobs: { id: string; publishing: boolean }[] }>('/fast-track/queue');
  const finish = async (id: string, state: string) => {
    // Each Worker request has a fixed D1 query budget; publishing resumes step by step.
    for (let i = 0; state === 'publishing' && i < 8; i++) state = (await api<{ state: string }>(`/fast-track/${id}/advance`, {})).state;
    if (state === 'published') stats.published++; else if (state === 'queued') stats.requeued++; else if (state !== 'publishing') stats.needsOwner++;
    return state;
  };
  for (const queued of jobs) {
    if (Date.now() >= options.deadlineAt) break;
    if (queued.publishing) { options.log('快速上架续传', queued.id, await finish(queued.id, 'publishing')); continue; }
    const claim = await fetch(`${(process.env.API_BASE ?? 'https://ai-yangmao.com').replace(/\/$/, '')}/api/ingest/fast-track/${queued.id}/claim`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.INGEST_TOKEN ?? ''}` }, signal: AbortSignal.timeout(30000) });
    if (claim.status === 409) continue;
    if (!claim.ok) throw new Error(`快速上架领取返回 ${claim.status}`);
    const { job } = await claim.json() as { job: Job };
    stats.claimed++;
    const ownerText = [`管理员提供的主要权益：${job.benefit}`, job.note ? `管理员备注：${job.note}` : ''].filter(Boolean).join('\n');
    let result: { fields?: Record<string, unknown>; sourceText?: string; error?: string; model?: string };
    try {
      if (!modelAvailable(false)) throw new Error('免费模型暂不可用');
      let pageText = '';
      try { pageText = (await fetchPage(job.url, { timeoutMs: 15000, tries: 2, minimumTextLength: 50 })).text; }
      catch (error) { options.log('快速上架：正文不可读，只按管理员描述抽取', job.url, (error as Error).message); }
      const text = [ownerText, pageText].filter(Boolean).join('\n');
      const extracted = await extract(job.platformName, job.url, text.slice(0, 22000), options.log, {
        allowPaid: false, budget: modelBudget, evidenceText: text, platformIds: [job.platformId], deadlineAt: Math.min(options.deadlineAt, Date.now() + 3 * 60_000),
        leadTarget: JSON.stringify({ title: job.benefit, originUrl: job.url, summary: `管理员已确认该权益真实有效，只补齐这条权益的字段。${job.note ?? ''}`.slice(0, 2500) }),
      });
      options.account(extracted.tokens, extracted.costCny);
      const fields = fastTrackFields(extracted.offers, job.benefit);
      result = fields ? { fields, sourceText: pageText, model: extracted.provider } : { error: '模型没有抽出这条权益', model: extracted.provider };
    } catch (error) { result = { error: (error as Error).message.slice(0, 500) }; }
    const receipt = await api<{ state: string }>(`/fast-track/${job.id}/result`, result);
    options.log('快速上架', job.id, job.platformId, await finish(job.id, receipt.state), result.error ?? '');
  }
  return stats;
}
