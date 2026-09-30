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
不要抽取：
- 新模型发布、功能更新、单纯降价或打折（没有额外赠送）
- 付费套餐本身包含的额度（例如 PRO 会员每月自带的 credits）；但会员的"额外"加赠、额度重置、限时翻倍要抽
- 不是 AI 使用额度的权益（协作功能、工作区、存储空间、席位等）；只收 token、请求次数、生成积分、会员时长、API 余额
- 不属于"平台："那一家的权益：原文里提到的其他公司产品（合作方、客户案例）不要算在这个平台头上
拿不准就不要输出。

每条输出字段：
- key：稳定的英文短标识，只描述"产品+权益"，不含日期，例如 gemini-api-free-tier
- title：中文标题，20 字以内，保留原始品牌和权益名称
- type：new 注册新人礼 / free 限时免费开放 / perk 会员福利（重置、加赠）/ topup 充值赠送 / gift 会员免费送 / standing 常驻免费额度 / apply 申请制
- modalities：text / code / image / video / audio 的子集
- claimMethod：auto / signup / app / form / topup / member / code
- requirements：none / phone（海外手机号）/ card（海外信用卡）/ net（海外网络）/ realname / biz / student / invite / targeted / "pay:金额" / "member:会员名"
- audience：new / old / all / unclear（原文没写清楚就用 unclear）
- valueText：必须写出具体数量和单位（如"每天 1000 次请求""新用户 2000 万 tokens""6 元赠金""$5/月"），数字从原文来。原文没有给出任何具体数量时，写"官方未写明具体额度："加原文说法
- usdEstimate：折合美元的粗估（常驻额度按每月），估不出就 null
- claimStart / claimEnd：官方时区下的日期 YYYY-MM-DD，没写就 null
- endKind：有明确截止日期用 date；没写截止日期的活动（包括长期有效的新人礼、充值赠送）用 unknown；只有 type 为 standing 或 apply 时才用 standing
- creditValidity：领取后额度多久失效，没写就 null
- sourceTz：官方使用的 IANA 时区（中国厂商一般 Asia/Shanghai，美国厂商 America/Los_Angeles），拿不准用 UTC
- steps：领取步骤，最多 4 条
- excerpts：从原文逐字复制的句子，分别支撑 benefit（赠送内容）/ eligibility（资格）/ claim（领取方式）/ validity（有效期或截止）。原文没有就留空字符串，绝对不要改写或编造。

只输出 JSON：{"offers":[...]}，没有符合条件的就输出 {"offers":[]}。`;

/** 线索研判：文章可能来自媒体或社区，需要先判断属于白名单里哪个平台。 */
const TRIAGE = `\n\n补充规则（本文可能是媒体报道、社区帖子或推文）：
- 每条再加一个字段 platformId：从下面的平台白名单里选最匹配的 id；都不匹配就用 "unknown"。
- 再加一个字段 officialUrl：文中出现的、指向该平台官网 / 官方公告 / 官方账号的链接，没有就 null。
- 中转站、号池、账号买卖、非 AI 的福利（打车、外卖、云手机、代理等）一律不输出。
平台白名单（id=名称）：`;

interface Provider { name: string; paid?: boolean; call: (sys: string, user: string) => Promise<{ text: string; tokens: number; costCny?: number }> }

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
      if (!r.ok) throw Object.assign(new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`), { retryable: r.status >= 500 || r.status === 404 || r.status === 429 });
      const j = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[]; usageMetadata?: { totalTokenCount?: number } };
      return { text: j.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '', tokens: j.usageMetadata?.totalTokenCount ?? 0 };
    },
  });
  const openaiLike = (name: string, url: string, key: string | undefined, model: string | undefined, price?: { in: number; out: number }) => {
    if (key && model) list.push({
      name, paid: !!price,
      call: async (sys, user) => {
        const r = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, temperature: 0.1, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }),
          signal: AbortSignal.timeout(90000),
        });
        if (!r.ok) throw new Error(`${name} ${r.status}: ${(await r.text()).slice(0, 200)}`);
        const j = await r.json() as { choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number } };
        const costCny = price ? ((j.usage?.prompt_tokens ?? 0) * price.in + (j.usage?.completion_tokens ?? 0) * price.out) / 1e6 : 0;
        return { text: j.choices?.[0]?.message?.content ?? '', tokens: j.usage?.total_tokens ?? 0, costCny };
      },
    });
  };
  // 免费备用：OpenRouter 免费模型。GLM-4-Flash 质量不够，默认不用（设 USE_GLM=1 才启用）
  openaiLike('openrouter', 'https://openrouter.ai/api/v1/chat/completions', process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_MODEL);
  if (process.env.USE_GLM === '1') openaiLike('glm', 'https://open.bigmodel.cn/api/paas/v4/chat/completions', process.env.GLM_API_KEY, process.env.GLM_MODEL ?? 'glm-4-flash');
  // 最后一级：DeepSeek 付费。价格按元 / 百万 tokens，可用变量覆盖
  openaiLike('deepseek', 'https://api.deepseek.com/chat/completions', process.env.DEEPSEEK_API_KEY, process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
    { in: Number(process.env.DEEPSEEK_PRICE_IN ?? 2), out: Number(process.env.DEEPSEEK_PRICE_OUT ?? 3) });
  return list;
}

export const llmAvailable = () => providers().length > 0;
export const paidAvailable = () => providers().some(p => p.paid);

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

/** 模型偶尔把数组写成逗号分隔的字符串、把枚举写成大写，这里统一整理。 */
function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(/[,，、/|\s]+/).map(x => x.trim()).filter(Boolean);
  return [];
}
function tidy(o: Extracted): Extracted {
  const low = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
  return {
    ...o,
    type: low(o.type) as Extracted['type'], claimMethod: low(o.claimMethod) as string, audience: (low(o.audience) || 'unclear') as Extracted['audience'],
    // 类型和截止方式要配套：常驻/申请制一定是 standing；其他类型没截止日期时算"截止未知"
    endKind: (['standing', 'apply'].includes(String(low(o.type))) ? 'standing' : low(o.endKind) === 'standing' ? 'unknown' : low(o.endKind)) as Extracted['endKind'],
    modalities: toList(o.modalities).map(x => x.toLowerCase()),
    requirements: toList(o.requirements).map(x => (x.includes(':') ? x : x.toLowerCase())),
    steps: toList(o.steps).length && Array.isArray(o.steps) ? o.steps : typeof o.steps === 'string' ? [o.steps] : [],
    usdEstimate: typeof o.usdEstimate === 'number' ? o.usdEstimate : Number(o.usdEstimate) || null,
    claimStart: o.claimStart || null, claimEnd: o.claimEnd || null, creditValidity: o.creditValidity || null,
  };
}

/** 免费模型都不可用时抛出，调用方把这个页面推迟到下一轮。 */
export class DeferError extends Error {}

export async function extract(platformName: string, url: string, text: string, log: (...a: unknown[]) => void = () => undefined, opts: { allowPaid?: boolean; platformList?: string } = {}): Promise<{ offers: (Extracted & { platformId?: string; officialUrl?: string | null })[]; tokens: number; costCny: number; provider: string }> {
  const user = `平台：${platformName}\n来源：${url}\n\n---- 原文 ----\n${text}`;
  const sys = opts.platformList ? PROMPT + TRIAGE + opts.platformList : PROMPT;
  let lastErr: unknown;
  const all = providers();
  const free = all.filter(p => !p.paid), paid = all.filter(p => p.paid);
  const chain = opts.allowPaid ? [...free, ...paid] : free;
  for (const p of chain) {
    try {
      let res: { text: string; tokens: number; costCny?: number } | null = null;
      for (let i = 0; i < 3 && !res; i++) {
        try { res = await p.call(sys, user); }
        catch (e) {
          if (!(e as { retryable?: boolean }).retryable || i === 2) throw e;
          log(`  ${p.name} 临时出错，${3 * (i + 1)} 秒后重试：${(e as Error).message.slice(0, 80)}`);
          await new Promise(r => setTimeout(r, 3000 * (i + 1)));
        }
      }
      const { text: out, tokens, costCny = 0 } = res!;
      const json = JSON.parse(out.replace(/^```(json)?|```$/g, '').trim()) as { offers?: Extracted[] };
      const offers = (Array.isArray(json.offers) ? json.offers : []).map(o => ({ ...tidy(o), excerpts: keepVerbatim(o.excerpts, text) }));
      return { offers, tokens, costCny, provider: p.name };
    } catch (e) { lastErr = e; log(`  ${p.name} 失败，换下一个模型：${(e as Error).message.slice(0, 120)}`); }
  }
  if (!opts.allowPaid && paid.length) throw new DeferError(`免费模型都不可用，推迟到下一轮：${(lastErr as Error)?.message?.slice(0, 80) ?? ''}`);
  throw lastErr ?? new Error('没有可用的模型（未配置任何 API key）');
}
