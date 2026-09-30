// 模型抽取：主用 Gemini Flash 免费档，GLM Flash、OpenRouter 免费模型备用。
// 模型只做"把官方文本抽成字段"，不做搜索；摘录必须能在原文里逐字找到，否则丢弃。
import { norm } from './lib';

export interface Extracted {
  key: string;
  title: string;
  type: 'new' | 'free' | 'perk' | 'topup' | 'gift' | 'standing' | 'apply';
  modalities: string[];
  claimMethod: string;
  requirements: string[];
  audience: 'new' | 'old' | 'all' | 'unclear';
  valueText: string;
  usdEstimate: number | null;
  claimStart: string | null;
  claimEnd: string | null;
  endKind: 'date' | 'unknown' | 'standing';
  creditValidity: string | null;
  sourceTz: string;
  steps: string[];
  excerpts: { benefit?: string; eligibility?: string; claim?: string; validity?: string };
}

const PROMPT = `你是"AI 羊毛牧场"的信息抽取器。下面是某个 AI 平台官方页面里和额度、赠送相关的文字。
只抽取"用户可以免费拿到的 AI 额度或权益"，包括：免费额度/免费层、注册赠送、限时免费开放、充值赠送、会员额外额度或额度重置、会员免费送、需要申请的 credits。
不要抽取：新模型发布、功能更新、单纯降价或打折（没有额外赠送）、付费套餐本身的额度。拿不准就不要输出。

每条输出字段：
- key：稳定的英文短标识，只描述"产品+权益"，不含日期，例如 gemini-api-free-tier
- title：中文标题，20 字以内，保留原始品牌和权益名称
- type：new 注册新人礼 / free 限时免费开放 / perk 会员福利（重置、加赠）/ topup 充值赠送 / gift 会员免费送 / standing 常驻免费额度 / apply 申请制
- modalities：text / code / image / video / audio 的子集
- claimMethod：auto / signup / app / form / topup / member / code
- requirements：none / phone（海外手机号）/ card（海外信用卡）/ net（海外网络）/ realname / biz / student / invite / targeted / "pay:金额" / "member:会员名"
- audience：new / old / all / unclear（原文没写清楚就用 unclear）
- valueText：原文里的额度说法（如"每天 1000 次请求"）
- usdEstimate：折合美元的粗估（常驻额度按每月），估不出就 null
- claimStart / claimEnd：官方时区下的日期 YYYY-MM-DD，没写就 null
- endKind：有明确截止日期用 date；限时但没写截止用 unknown；常驻额度和申请制用 standing
- creditValidity：领取后额度多久失效，没写就 null
- sourceTz：官方使用的 IANA 时区（中国厂商一般 Asia/Shanghai，美国厂商 America/Los_Angeles），拿不准用 UTC
- steps：领取步骤，最多 4 条
- excerpts：从原文逐字复制的句子，分别支撑 benefit（赠送内容）/ eligibility（资格）/ claim（领取方式）/ validity（有效期或截止）。原文没有就留空字符串，绝对不要改写或编造。

只输出 JSON：{"offers":[...]}，没有符合条件的就输出 {"offers":[]}。`;

interface Provider { name: string; call: (sys: string, user: string) => Promise<{ text: string; tokens: number }> }

function providers(): Provider[] {
  const list: Provider[] = [];
  if (process.env.GEMINI_API_KEY) list.push({
    name: 'gemini',
    call: async (sys, user) => {
      const model = process.env.GEMINI_MODEL ?? 'gemini-flash-latest';
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } }),
        signal: AbortSignal.timeout(90000),
      });
      if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const j = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[]; usageMetadata?: { totalTokenCount?: number } };
      return { text: j.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '', tokens: j.usageMetadata?.totalTokenCount ?? 0 };
    },
  });
  const openaiLike = (name: string, url: string, key: string | undefined, model: string | undefined) => {
    if (key && model) list.push({
      name,
      call: async (sys, user) => {
        const r = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, temperature: 0.1, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }),
          signal: AbortSignal.timeout(90000),
        });
        if (!r.ok) throw new Error(`${name} ${r.status}: ${(await r.text()).slice(0, 200)}`);
        const j = await r.json() as { choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number } };
        return { text: j.choices?.[0]?.message?.content ?? '', tokens: j.usage?.total_tokens ?? 0 };
      },
    });
  };
  openaiLike('glm', 'https://open.bigmodel.cn/api/paas/v4/chat/completions', process.env.GLM_API_KEY, process.env.GLM_MODEL ?? 'glm-4-flash');
  openaiLike('openrouter', 'https://openrouter.ai/api/v1/chat/completions', process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_MODEL);
  return list;
}

export const llmAvailable = () => providers().length > 0;

/** 摘录必须能在原文里逐字找到（忽略空白和大小写），找不到的清空。 */
export function keepVerbatim(ex: Extracted['excerpts'], source: string): Extracted['excerpts'] {
  const hay = norm(source);
  const out: Extracted['excerpts'] = {};
  for (const k of ['benefit', 'eligibility', 'claim', 'validity'] as const) {
    const v = ex?.[k]?.trim();
    if (v && v.length >= 4 && hay.includes(norm(v))) out[k] = v;
  }
  return out;
}

export async function extract(platformName: string, url: string, text: string): Promise<{ offers: Extracted[]; tokens: number; provider: string }> {
  const user = `平台：${platformName}\n来源：${url}\n\n---- 原文 ----\n${text}`;
  let lastErr: unknown;
  for (const p of providers()) {
    try {
      const { text: out, tokens } = await p.call(PROMPT, user);
      const json = JSON.parse(out.replace(/^```(json)?|```$/g, '').trim()) as { offers?: Extracted[] };
      const offers = (json.offers ?? []).map(o => ({ ...o, excerpts: keepVerbatim(o.excerpts, text) }));
      return { offers, tokens, provider: p.name };
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error('没有可用的模型（未配置任何 API key）');
}
