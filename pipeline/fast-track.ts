import { api, fetchPage } from './lib';
import { completeFreePrompt, modelAvailable, parseModelJson, type Extracted } from './llm';

/**
 * ⚡ 快速上架：管理员已担保链接与主要权益，这里只用免费模型从链接正文补齐其余字段。
 * 抽取失败或正文不可读时把原因交回 Worker：自动重试，三次后转给管理员手填。
 */
interface Job { id: string; platformId: string; platformName: string; url: string; benefit: string; note: string | null }
export interface FastTrackOptions { deadlineAt: number; dry: boolean; account: (tokens: number, cost: number) => void; log: (...args: unknown[]) => void }

const PROMPT = `你是"AI 羊毛牧场"的字段整理助手。管理员已经确认下面这条权益真实有效并决定上架，你不判断是否收录，只根据管理员描述和官方页面正文填写上架字段。
只输出一个 JSON 对象：{"offers":[{"title":"中文标题，不超过 40 字","type":"new|trial|free|perk|topup|gift|standing|apply","modalities":["text|image|video|audio" 至少一个],"models":["官方写法的模型名"],"tags":["reset|referral|discount|daily" 可空],"claimMethod":"auto|signup|app|form|topup|member|code","requirements":["none|pay|member|phone|card|net|realname|biz|student|invite|targeted"],"audience":"new|old|all|unclear","valueText":"一句中文额度描述","claimStart":"YYYY-MM-DD 或 null","claimEnd":"YYYY-MM-DD 或 null","endKind":"date|unknown|standing","creditValidity":"额度有效期或 null","sourceTz":"IANA 时区，未写明填 UTC","steps":["中文领取步骤，最多 4 步"],"excerpts":{"benefit":"正文中支持该权益的连续原文","eligibility":"…或省略","claim":"…或省略","validity":"…或省略"}}]}
类型含义：new 注册新人礼；trial 应用尝鲜/免费试用；free 限时免费开放（公开预览、免费 Demo 等）；perk 会员福利；topup 充值赠送；gift 会员免费送；standing 常驻免费额度；apply 申请制。standing 与 apply 的 endKind 必须是 standing，其他类型不能是 standing；有截止日期才用 date。
门槛只写原文或常识能确定的；完全无门槛填 ["none"]，确实拿不准填 ["unknown"]。原文摘录必须逐字取自正文，保留原语言。只输出 JSON。`;

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
      const reply = await completeFreePrompt(PROMPT, `厂商：${job.platformName}\n官方链接：${job.url}\n${text.slice(0, 22000)}`, Math.min(options.deadlineAt, Date.now() + 3 * 60_000));
      options.account(reply.tokens, 0);
      const parsed = parseModelJson(reply.text) as { offers?: Extracted[] } | Extracted[] | null;
      const offers = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.offers) ? parsed.offers : parsed && typeof parsed === 'object' && 'title' in parsed ? [parsed as Extracted] : [];
      const fields = fastTrackFields(offers, job.benefit);
      result = fields ? { fields, sourceText: pageText, model: reply.provider } : { error: '模型没有返回可用字段', model: reply.provider };
    } catch (error) { result = { error: (error as Error).message.slice(0, 500) }; }
    const receipt = await api<{ state: string }>(`/fast-track/${job.id}/result`, result);
    options.log('快速上架', job.id, job.platformId, await finish(job.id, receipt.state), result.error ?? '');
  }
  return stats;
}
