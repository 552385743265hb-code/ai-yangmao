// 模型抽取：主用 Gemini Flash 免费档，GLM Flash、OpenRouter 免费模型备用。
// 模型只做"把官方文本抽成字段"，不做搜索；摘录必须能在原文里逐字找到，否则丢弃。
import { norm } from './lib';
import { BudgetExhaustedError, BudgetLedgerError, MODEL_OUTPUT_LIMIT, type ModelPrice, type ModelReservation } from './budget';

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
- 同一页面列出多个同类免费模型或同类权益时，合并成一条（valueText 里列出模型名），不要每个模型各出一条
拿不准就不要输出。

每条输出字段：
- key：稳定的英文短标识，只描述"产品+权益"，不含日期，例如 gemini-api-free-tier
- title：中文标题，20 字以内，保留原始品牌和权益名称
- type：new 注册新人礼（只给新注册的账号）/ trial 应用尝鲜（首次使用某个应用、客户端或新功能就送，新老用户都能领，如“首次登录桌面端送 6 元”）/ free 限时免费开放 / perk 会员福利（重置、加赠）/ topup 充值赠送 / gift 会员免费送 / standing 常驻免费额度 / apply 申请制
- modalities：text / code / image / video / audio 的子集（3D 模型生成算 image）
- claimMethod：auto / signup / app（下载应用并登录，含 App、桌面端、命令行工具）/ form / topup / member / code。官方一般不专门写怎么领，按常识推断：应用的福利＝下载应用并登录（app）；云厂商或模型的福利＝开通并使用服务（signup 或 auto）；会员的福利＝充值开会员（member 或 topup）
- requirements：none / unknown（官方条件未明确）/ phone（海外手机号）/ card（海外信用卡）/ net（海外网络）/ realname / biz / student / invite / targeted / "pay:金额" / "member:会员名"
- audience：new / old / all / unclear（原文没写清楚就用 unclear）
- valueText：必须写出具体数量和单位（如"每天 1000 次请求""新用户 2000 万 tokens""6 元赠金""$5/月"），数字从原文来。原文没有给出任何具体数量时，写"官方未写明具体额度："加原文说法。原文写了能用哪些模型（包括脚注、常见问题里的说明），要把模型名写进 valueText，如"每月 50 credits，可用 Claude Sonnet 4.5 及开源模型 Qwen3 Coder Next、DeepSeek 3.2"；写了速率限制或只能在某个客户端使用，也一并写上
- usdEstimate：折合美元（常驻额度按每月）。平台自有单位（credits、Neurons、Token、次数等）必须用同一平台官方公布的单价折算成美元，人民币按 7.1 折算；valueText 里在原单位后面括号写出折算依据，如"每天 10,000 Neurons（官方单价 $0.011/千 Neurons，约 $3.3/月）"。按 Token 折算时用官方输入价保守估算。只限速率的免费模型：按主力模型（该额度里最好的那个，如 Gemini 3.8 Flash）的官方输入价，乘以官方速率上限推出的每月最多 Token：每天最多 Token = min（每天请求数 × 单次最多 Token，每分钟 Token 数 × 1440），再 × 30。官方没公开速率上限就填 null，不要自己假设次数或每次 Token 数。价值有明显区间时（如分套餐档位、订阅价到最高额度）usdEstimate 填保守下限，usdMax 填上限。实在找不到任何官方单价才用 null，不要编单价
- claimStart / claimEnd：官方时区下的日期 YYYY-MM-DD，没写就 null
- endKind：有明确截止日期用 date；没写截止日期的活动（包括长期有效的新人礼、充值赠送）用 unknown；只有 type 为 standing 或 apply 时才用 standing
- creditValidity：领取后额度多久失效，用中文写（如"30 天""每月重置，未用完不结转"），没写就 null
- sourceTz：官方使用的 IANA 时区（中国厂商一般 Asia/Shanghai，美国厂商 America/Los_Angeles），拿不准用 UTC
- steps：领取步骤，最多 4 条，用中文写
- 语言：除 excerpts 必须保留官方原文外，title、valueText、creditValidity、steps 一律用中文；产品名、模型名、计量单位（如 credits、Neurons、Token）、按钮和命令等必要的英文保留原样，不要整句照搬英文
- excerpts：从原文逐字复制的句子，分别支撑 benefit（赠送内容）/ eligibility（资格）/ claim（领取方式，可选，原文专门写了才填）/ validity（有效期或截止）。原文没有就留空字符串，绝对不要改写或编造。

只输出 JSON：{"offers":[...]}，没有符合条件的就输出 {"offers":[]}。`;

/** 第二层：由每周纠正归纳、经管理员批准的规则（pipeline/learned-rules.md）。 */
import { readFileSync } from 'node:fs';
const LEARNED = (() => {
  try {
    const rules = readFileSync(new URL('./learned-rules.md', import.meta.url), 'utf8').split('\n').filter(l => /^\s*-\s+/.test(l)).join('\n');
    return rules ? `\n\n已确认的抽取规则（来自管理员的历次纠正）：\n${rules}` : '';
  } catch { return ''; }
})();

/** 线索研判：文章可能来自媒体或社区，需要先判断属于白名单里哪个平台。 */
const TRIAGE = `\n\n补充规则（本文可能是媒体报道、社区帖子或推文）：
- 每条再加一个字段 platformId：从下面的平台白名单里选最匹配的 id；都不匹配就用 "unknown"。
- 再加一个字段 officialUrl：文中出现的、指向该平台官网 / 官方公告 / 官方账号的链接，没有就 null。
- 中转站、号池、账号买卖、"公益站"、低价 API 转售、非 AI 的福利（打车、外卖、门票、云手机、代理、eSIM 等）一律不输出。
- 中文社区黑话：「鸡蛋」= 厂商送的免费额度 / token；「臭鸡蛋」通常指智谱（GLM / ZCode）送的 token；「蚊子腿」= 小额福利；「白嫖」= 免费用；「DSH」= DeepSeek Harness。这些都算 AI 羊毛，要按规则抽取。
- platformId 必须原样使用白名单里等号左边的 id（全小写），例如 deepseek、zhipu。
- 再加一个字段 sameAs：如果这条和下面"已收录条目"里的某条是同一个活动（同一平台、同一权益，只是说法不同），填那条的 id；否则 null。
平台白名单（id=名称）：`;

interface Provider { name: string; paid?: boolean; price?: ModelPrice; call: (sys: string, user: string) => Promise<{ text: string; tokens: number; costCny?: number; usageKnown: boolean }> }

function providers(): Provider[] {
  const list: Provider[] = [];
  if (process.env.GEMINI_API_KEY) list.push({
    name: 'gemini',
    call: async (sys, user) => {
      const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: MODEL_OUTPUT_LIMIT } }),
        signal: AbortSignal.timeout(90000),
      });
      if (!r.ok) throw Object.assign(new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`), { retryable: r.status >= 500 || r.status === 404 || r.status === 429, httpStatus: r.status });
      const j = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[]; usageMetadata?: { totalTokenCount?: number } };
      return { text: j.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '', tokens: j.usageMetadata?.totalTokenCount ?? 0, usageKnown: Number.isFinite(j.usageMetadata?.totalTokenCount) };
    },
  });
  const openaiLike = (name: string, url: string, key: string | undefined, model: string | undefined, price?: { in: number; out: number }) => {
    if (key && model) list.push({
      name, paid: !!price, price,
      call: async (sys, user) => {
        const r = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, temperature: 0.1, max_tokens: MODEL_OUTPUT_LIMIT, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }),
          signal: AbortSignal.timeout(90000),
        });
        if (!r.ok) throw Object.assign(new Error(`${name} ${r.status}: ${(await r.text()).slice(0, 200)}`), { httpStatus: r.status });
        const j = await r.json() as { choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number } };
        const costCny = price ? ((j.usage?.prompt_tokens ?? 0) * price.in + (j.usage?.completion_tokens ?? 0) * price.out) / 1e6 : 0;
        return { text: j.choices?.[0]?.message?.content ?? '', tokens: j.usage?.total_tokens ?? 0, costCny,
          usageKnown: Number.isFinite(j.usage?.total_tokens) && (!price || (Number.isFinite(j.usage?.prompt_tokens) && Number.isFinite(j.usage?.completion_tokens))) };
      },
    });
  };
  // 免费备用：OpenRouter 免费模型。GLM-4-Flash 质量不够，默认不用（设 USE_GLM=1 才启用）
  openaiLike('openrouter', 'https://openrouter.ai/api/v1/chat/completions', process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_MODEL);
  if (process.env.USE_GLM === '1') openaiLike('glm', 'https://open.bigmodel.cn/api/paas/v4/chat/completions', process.env.GLM_API_KEY, process.env.GLM_MODEL ?? 'glm-4-flash');
  // 最后一级：DeepSeek Flash 付费。按官方 2026-09-24 峰值美元价格保守折成人民币上界；可用变量覆盖。
  // https://api-docs.deepseek.com/quick_start/pricing
  openaiLike('deepseek', 'https://api.deepseek.com/chat/completions', process.env.DEEPSEEK_API_KEY, process.env.DEEPSEEK_MODEL || 'deepseek-flash',
    { in: Number(process.env.DEEPSEEK_PRICE_IN ?? 3), out: Number(process.env.DEEPSEEK_PRICE_OUT ?? 10) });
  return list;
}

export const llmAvailable = () => providers().length > 0;
// 免费档有每分钟请求数限制：两次调用至少间隔 MIN_GAP 毫秒
const MIN_GAP = Number(process.env.LLM_MIN_GAP_MS ?? 4500);
let nextCall = 0;
async function pace() { const start = Math.max(Date.now(), nextCall); nextCall = start + MIN_GAP; const wait = start - Date.now(); if (wait > 0) await new Promise(r => setTimeout(r, wait)); }
export const paidAvailable = () => providers().some(p => p.paid);

/**
 * 宽容地解析模型输出的 JSON：去掉代码块标记，只取第一个完整的 {...}（模型偶尔在后面多吐内容），
 * 仍解析不了再去掉对象和数组末尾多余的逗号。2026-10-01 批量抓取时 Gemini 多次因此失败，整个信源被推迟。
 */
export function parseModelJson(out: string): unknown {
  const s = out.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(s); } catch { /* 继续尝试 */ }
  const start = s.indexOf('{');
  if (start < 0) throw new Error('模型输出里没有 JSON 对象');
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) { end = i; break; }
  }
  const body = end > 0 ? s.slice(start, end + 1) : s.slice(start);
  try { return JSON.parse(body); } catch { return JSON.parse(body.replace(/,\s*([}\]])/g, '$1')); }
}

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
function normalizeRequirements(value: unknown): string[] {
  const accepted = /^(none|unknown|phone|card|net|realname|biz|student|invite|targeted|pay:.+|member:.+)$/;
  const requirements = toList(value).map(x => x.includes(':') ? x : x.toLowerCase())
    .map(x => x === 'member' ? 'member:付费会员' : x === 'pay' ? 'pay:金额未写明' : x)
    .map(x => accepted.test(x) ? x : 'unknown');
  const unique = [...new Set(requirements)];
  return unique.length > 1 ? unique.filter(x => x !== 'none') : unique.length ? unique : ['unknown'];
}
function tidy(o: Extracted): Extracted {
  const low = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
  return {
    ...o,
    type: low(o.type) as Extracted['type'], claimMethod: low(o.claimMethod) as string, audience: (low(o.audience) || 'unclear') as Extracted['audience'],
    // 类型和截止方式要配套：常驻/申请制一定是 standing；其他类型没截止日期时算"截止未知"
    endKind: (['standing', 'apply'].includes(String(low(o.type))) ? 'standing' : low(o.endKind) === 'standing' ? 'unknown' : low(o.endKind)) as Extracted['endKind'],
    // 模态只认五种；3D 生成归到图像，其他不认识的去掉，全去掉了按文本。之前模型写了“3d”整条被丢（2026-10-01 Meshy）
    modalities: (() => { const m = [...new Set(toList(o.modalities).map(x => x.toLowerCase()).map(x => (/^3d|3d$|mesh|model3d/.test(x) ? 'image' : x)).filter(x => ['text', 'code', 'image', 'video', 'audio'].includes(x)))]; return m.length ? m : ['text']; })(),
    // 模型偶尔只写 member / pay 不带内容，补成可读的占位，交给审核时修正
    requirements: normalizeRequirements(o.requirements),
    steps: toList(o.steps).length && Array.isArray(o.steps) ? o.steps : typeof o.steps === 'string' ? [o.steps] : [],
    usdEstimate: typeof o.usdEstimate === 'number' ? o.usdEstimate : Number(o.usdEstimate) || null,
    claimStart: o.claimStart || null, claimEnd: o.claimEnd || null, creditValidity: o.creditValidity || null,
  };
}

/** 免费模型都不可用时抛出，调用方把这个页面推迟到下一轮。 */
export class DeferError extends Error {}

export async function extract(platformName: string, url: string, text: string, log: (...a: unknown[]) => void = () => undefined, opts: { allowPaid?: boolean; platformList?: string; existing?: string; corrections?: string[]; budget?: { reserve: (provider: string, system: string, user: string, price?: ModelPrice) => Promise<ModelReservation>; settle: (reservation: ModelReservation, provider: string, tokens: number, costCny: number) => Promise<void> } } = {}): Promise<{ offers: (Extracted & { platformId?: string; officialUrl?: string | null; sameAs?: string | null })[]; tokens: number; costCny: number; provider: string }> {
  const user = `平台：${platformName}\n来源：${url}\n\n---- 原文 ----\n${text}`;
  const base = PROMPT + LEARNED + (opts.corrections?.length ? `\n\n管理员最近的纠正（照这些改正方向抽取，同类错误不要再犯）：\n${opts.corrections.map(x => '- ' + x).join('\n')}` : '');
  const known = opts.existing ? `\n已收录条目（id｜标题｜额度）：\n${opts.existing}` : '';
  const same = opts.existing && !opts.platformList ? `\n\n每条再加一个字段 sameAs：如果和下面"已收录条目"里的某条是同一个权益（说法不同也算），填那条的 id，否则 null。` : '';
  const sys = opts.platformList ? base + TRIAGE + opts.platformList + known : base + same + known;
  let lastErr: unknown;
  const all = providers();
  const free = all.filter(p => !p.paid), paid = all.filter(p => p.paid);
  const chain = opts.allowPaid ? [...free, ...paid] : free;
  for (const p of chain) {
    try {
      let res: { text: string; tokens: number; costCny?: number; usageKnown: boolean } | null = null;
      for (let i = 0; i < 3 && !res; i++) {
        const reservation = opts.budget ? await opts.budget.reserve(p.name, sys, user, p.price) : null;
        try {
          await pace();
          res = await p.call(sys, user);
          if (reservation) {
            if (res.usageKnown) await opts.budget!.settle(reservation, p.name, res.tokens, res.costCny ?? 0);
            else { log(`  ${p.name} 未返回可靠用量，保留预算预留`); res.tokens = reservation.tokens; res.costCny = reservation.costCny; }
          }
        }
        catch (e) {
          if (e instanceof BudgetExhaustedError || e instanceof BudgetLedgerError) throw e;
          if (reservation && (e as { httpStatus?: number }).httpStatus) await opts.budget!.settle(reservation, p.name, 0, 0);
          if (!(e as { retryable?: boolean }).retryable || i === 2) throw e;
          const wait = /429/.test((e as Error).message) ? 20000 * (i + 1) : 3000 * (i + 1);
          log(`  ${p.name} 临时出错，${wait / 1000} 秒后重试：${(e as Error).message.slice(0, 80)}`);
          await new Promise(r => setTimeout(r, wait));
        }
      }
      const { text: out, tokens, costCny = 0 } = res!;
      const json = parseModelJson(out) as { offers?: Extracted[] };
      const offers = (Array.isArray(json.offers) ? json.offers : []).map(o => ({ ...tidy(o), excerpts: keepVerbatim(o.excerpts, text) }));
      return { offers, tokens, costCny, provider: p.name };
    } catch (e) {
      if (e instanceof BudgetExhaustedError || e instanceof BudgetLedgerError) throw e;
      lastErr = e; log(`  ${p.name} 失败，换下一个模型：${(e as Error).message.slice(0, 120)}`);
    }
  }
  if (!opts.allowPaid && paid.length) throw new DeferError(`免费模型都不可用，推迟到下一轮：${(lastErr as Error)?.message?.slice(0, 80) ?? ''}`);
  throw lastErr ?? new Error('没有可用的模型（未配置任何 API key）');
}
