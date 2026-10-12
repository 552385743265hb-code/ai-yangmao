// Bounded real-agent acceptance: synthetic source passages, production read-only calculator,
// and the same extraction/draft path as collection. No offers, leads or approvals are written.
import { writeFileSync } from 'node:fs';
import { extract } from '../pipeline/llm';
import { toOffer } from '../pipeline/offer-draft';
import { modelBudget } from '../pipeline/budget';
import { api } from '../pipeline/lib';

const cases = [
  { id: 'direct-gift', platformId: 'valuation-fixture', name: 'Example AI', expected: 12,
    text: 'Example AI 官方新用户活动：所有新账号注册即可一次性获赠 USD 12 API credits，无需支付或绑卡。额度领取后7天有效。这是独立赠金，不是付费套餐基础额度。活动未公布领取截止日期。' },
  { id: 'chatgpt-reset', platformId: 'openai', name: 'OpenAI', expected: 5,
    text: 'OpenAI 官方额外福利：向现有 ChatGPT Plus 用户发放1次额外额度重置。用户登录后自动获得；这是独立额外重置，不是每月套餐基础用量，也不是之前发放的执行进度。没有公布活动截止日。' },
  { id: 'elevenlabs-free', platformId: 'elevenlabs', name: 'ElevenLabs', expected: 2,
    text: 'ElevenLabs 官方 Free plan：所有注册用户每月获赠10,000 credits，可用于语音合成。无需信用卡，无需购买订阅；每月刷新，未用完不结转。这是常驻免费版。' },
  { id: 'fixed-token-grant', platformId: 'devin', name: 'Devin', expected: 81.818182,
    text: 'Devin 官方独立新用户活动：注册后一次性获赠20M tokens，仅用于 SWE-2 编程模型。无需付费或绑卡。赠额领取后7天有效，用完即止，不会刷新。活动没有公布领取截止日期。' },
  { id: 'swe-unlimited', platformId: 'devin', name: 'Devin', expected: 45,
    text: 'Devin 官方 SWE-2 Free 独立免费活动：任何用户登录桌面应用或 CLI 即可免费使用 SWE-2 编程模型，不限Token额度。每个用户激活后可免费使用30天，无需支付或信用卡。活动没有公布领取截止日期。' },
];
const selected = (process.env.VALUATION_CASES ?? '').split(',').map(s => s.trim()).filter(Boolean);
if (selected.some(id => !cases.some(c => c.id === id))) throw Error('Unknown VALUATION_CASES');
const results: object[] = [];
const deadline = Date.now() + 12 * 60_000;
for (const fixture of cases.filter(c => !selected.length || selected.includes(c.id))) {
  const diagnostics:string[]=[];
  try {
    const url = `https://fixture.invalid/valuation-v2/${fixture.id}`;
    const page = { text: fixture.text, via: 'direct' as const, originalUrl: url, finalUrl: url,
      fetchedUrl: url, fetchMethod: 'direct' as const, sourceVerified: true, truncated: false };
    const r = await extract(fixture.name, url, fixture.text, (...args) => { if(diagnostics.length<30)diagnostics.push(args.map(String).join(' ').slice(0,500)); },
      { platformIds: [fixture.platformId], allowPaid: false, budget: modelBudget,
        corrections: ['本次是只读程序验收：fixture.invalid承载合成的官方原文，不因测试域名或现实中没有这场活动而丢弃。仍逐字抽取并严格执行正常收录、价格及单位规则，不新增原文没有的数量或价格；结果不写条目或审批。'],
        deadlineAt: Math.min(deadline, Date.now() + 180_000) });
    if (r.offers.length !== 1) throw Error(`Expected one offer, got ${r.offers.length}`);
    const offer = toOffer({ id: 'valuation-v2-fixture', platformId: fixture.platformId } as Parameters<typeof toOffer>[0], r.offers[0], url, fixture.text, page);
    const preview = await api<{ valuation: { version: string; status: string; usdEstimate: number | null; usdMax: number | null } | null; errors: string[] }>('/valuation-preview', {
      platformId: fixture.platformId, type: offer.type, models: offer.models, tags: offer.tags,
      sourceUrl: url, sourceText: offer.sourceText, sourceFetch: offer.sourceFetch,
      valuationFactors: offer.valuationFactors, valuationSources: offer.valuationSources, evidence: offer.evidence,
    });
    const value = preview.valuation;
    const passed = !!value && value.version === 'v2' && value.usdEstimate === fixture.expected && value.usdMax === null
      && preview.errors.length === 0;
    results.push({ id: fixture.id, passed, expected: fixture.expected, provider: r.provider, tokens: r.tokens,
      costCny: r.costCny, diagnostics, valuation: value, errors: preview.errors, factors: offer.valuationFactors });
    console.log(JSON.stringify({ id: fixture.id, passed, expected: fixture.expected, actual: value?.usdEstimate ?? null,
      provider: r.provider, tokens: r.tokens, errors: preview.errors }));
  } catch (error) {
    results.push({ id: fixture.id, passed: false, diagnostics, error: (error as Error).message });
    console.log(JSON.stringify({ id: fixture.id, passed: false, error: (error as Error).message }));
  }
}
writeFileSync('valuation-v2-workflow-results.json', JSON.stringify({ at: new Date().toISOString(), synthetic: true,
  businessWrites: 0, calculationEndpoint: '/api/ingest/valuation-preview', results }, null, 2));
if (results.some(r => !(r as { passed: boolean }).passed)) process.exitCode = 1;
