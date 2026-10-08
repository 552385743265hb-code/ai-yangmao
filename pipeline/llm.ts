import { jsonrepair } from 'jsonrepair';
// 模型抽取：主用 Gemini Flash 免费档，GLM Flash、OpenRouter 免费模型备用。
// 模型只做"把官方文本抽成字段"，不做搜索；摘录必须能在原文里逐字找到，否则丢弃。
import { norm } from './lib';
import { BudgetExhaustedError, BudgetLedgerError, MODEL_OUTPUT_LIMIT, type ModelPrice, type ModelReservation } from './budget';

export interface Extracted {
  key: string;
  title: string;
  type: 'new' | 'free' | 'perk' | 'topup' | 'gift' | 'standing' | 'apply';
  modalities: string[];
  models?: string[];
  tags?: string[];
  publishedAt?: string | null;
  claimMethod: string;
  requirements: string[];
  audience: 'new' | 'old' | 'all' | 'unclear';
  valueText: string;
  usdEstimate: number | null;
  usdMax?: number | null;
  claimStart: string | null;
  claimEnd: string | null;
  endKind: 'date' | 'unknown' | 'standing';
  creditValidity: string | null;
  sourceTz: string;
  steps: string[];
  excerpts: { benefit?: string; eligibility?: string; claim?: string; validity?: string };
}

const PROMPT = `你是"AI 羊毛牧场"的信息抽取器。下面是某个 AI 平台官方页面里和额度、赠送相关的文字。
只抽取本文实际出现的"用户可以免费拿到的 AI 额度或权益"，包括：免费额度/免费层（包括只按速率限制、不按用量收费的免费调用）、注册赠送、新用户代金券（没写金额也要输出）、每日登录送积分、首次使用某个应用或客户端赠送、邀请奖励、实名认证礼、限时免费开放、AI 产品的免费试用、充值赠送、首月实付不超过 $1 的近免费体验、会员额外额度或额度重置、会员免费送、需要申请的 credits。平台要点用于约束和补充已出现的活动，不是活动池；不输出仅在要点中出现、本文未提到的其他福利。
不要抽取：
- 新模型发布、功能更新、单纯降价或打折（没有额外赠送；下述身份专享和首月实付不超过 $1 的例外除外）
- 免费套餐名称或只写 limited / generous limits 的有限聊天、搜索、生图功能，不等于可量化的免费额度，不输出
- 同页混有付费档和免费档时逐项判断：排除付费套餐不能连带丢掉免费档的量化额度。例如 WorkBuddy 体验版每月 500 积分应输出 standing，付费三档月度“加赠”不输出。
- 付费套餐本身包含的额度（例如 PRO 会员每月自带的 credits、订阅档内含的无限量或特权）：这是买套餐买到的，不是羊毛。可收的是免费档里可量化的 AI Token、积分、次数或 API 额度；订阅档额外的额度重置（reset）；常规套餐之外的加赠（如智谱加赠的重置卡、多送的 Token、限时翻倍）
- 例外（要输出）：学生、教师、特定设备持有人（如买 Pixel 送 AI Pro）等身份认证专享的免费会员或大幅折扣（五折及以下），算羊毛，门槛写 student 或 pay:购买设备
- 首月优惠（首月几折、新用户首月半价等订阅折扣）：很常见的拉新手段，不是免费额度，不输出；例外：首月实付不超过 $1（约 ¥7）、基本等于免费的保留，打 discount 标签（2026-10-03 管理员决定）
- 价格页逐个付费档位的每月配额，包括拆成“基础 + 加赠”或标了“限时”的每月实得积分，仍可能是套餐定价，不因这些字样自动输出。必须有区别于普通订阅配置的独立活动条件/赠送机制证据，才收套餐之外的赠额；缺截止日期本身不等于没有活动。WorkBuddy 标准/高级/旗舰每月加赠 2,000/5,000/30,000 属于已明确不收的套餐配置，不输出，也不合并成一条羊毛。真实独立活动的多档赠额才合成一条写范围。
- 普通年付折扣、API 单价折扣、年付“免 N 个月”不输出，即使五折也不是身份认证专享例外；真实另发 bonus credits 与折算省钱要区分。
- 一篇公告里多个模型的同一种优惠（如“A 模型 0.75x、B 模型 0.25x”）输出成一条，各模型的倍率或额度写进 valueText，不要按模型拆条（2026-10-03）
- 同一个福利已在“已有条目”里的，填 sameAs，不要因为措辞不同就新建；同一平台同一福利只输出一条；但不同日期的重置/重置卡发放是独立事件，不得沿用历史事件的 sameAs 或日期
- 已有条目只是去重索引，可能含待审或误收内容，不代表符合收录标准。已明确不收的套餐配置、普通折扣不能因为索引里已有就继续输出或填写 sameAs。
- 单独的协作功能、工作区、存储空间、席位数量不是 AI 额度；但免费赠送含 AI 使用权益的付费会员时长可收，席位数是赠送上限。例如经审核的创业资助送 Team 一年与 API 额度，不等于付费订阅本身。
- 不属于"平台："那一家的权益：原文里提到的其他公司产品（合作方、客户案例）不要算在这个平台头上
- 同一页面列出多个同类免费模型或同类权益时，合并成一条（valueText 里列出模型名），不要每个模型各出一条
拿不准的也要输出，在 valueText 里写清楚哪里不确定（如"官方未写明具体额度"）：每条都会经过人工审核，漏掉比多给更糟。只有明确属于上面"不要抽取"的才不输出。基础提示词与下方已确认规则/平台要点冲突时，以管理员确认的现役规则为准，不能用“拿不准也输出”绕过已明确不收的案例。

每条输出字段：
- key：稳定的英文短标识，只描述"产品+权益"，不含日期，例如 gemini-api-free-tier
- title：中文标题，20 字以内，保留原始品牌和权益名称
- type：new 注册新人礼（只给新注册的账号）/ trial 应用尝鲜（首次使用某个应用、客户端或新功能就送，新老用户都能领，如“首次登录桌面端送 6 元”）/ free 限时免费开放 / perk 会员福利（重置、加赠）/ topup 充值赠送 / gift 会员免费送 / standing 常驻免费额度 / apply 申请制
- 需要公司提交申请并审核获批的创业资助必须是 apply，即使长期接受申请、包含固定赠金或会员，也不是 standing。长期开放只是 endKind=standing，不能反过来改变 type。
- modalities：text / image / video / audio 的子集，按福利实际覆盖的AI服务填；文本和编程都算text、3D生成算image。参考素材和多模态输入不代表免费生成图片/视频；不能凭平台名或常识补全所有模态。Vidu Q4视频积分为video，Claude第一方API/Team创业权益此处为text。
- tags：从 reset（额度重置）/ referral（邀请奖励）/ discount（首月或限时折扣）/ daily（每日刷新或每日登录送）里选适用的，可多选，没有就空数组
- claimStart / claimEnd 务必尽量填：原文写了活动时间就照写；只写了“发布即开始”的，用发布日期当 claimStart。已经结束的活动也要写准起止日期（会作为历史数据进入时间线、日历和羊毛墓场）
- publishedAt：官方发布这条活动的时间，ISO 格式，能精确到时刻就精确到时刻（推文、公告时间），不知道就 null；额度重置一定要填
- models：这条福利里能免费用的具体模型名，按官方写法逐个列出（如 ["Gemini 3.8 Flash", "GLM-4.7-Flash", "Big Pickle"]）；只是平台通用额度、没点名具体模型就给空数组。不要写“等”“系列”这类泛称
- claimMethod：auto / signup / app（下载应用并登录，含 App、桌面端、命令行工具）/ form / topup / member / code。官方一般不专门写怎么领，按常识推断：应用的福利＝下载应用并登录（app）；云厂商或模型的福利＝开通并使用服务（signup 或 auto）；会员的福利＝充值开会员（member 或 topup）
- requirements：none / unknown（官方条件未明确）/ phone（海外手机号）/ card（海外信用卡）/ net（海外网络）/ realname / biz / student / invite / targeted / "pay:金额" / "member:会员名"
  - 门槛写法：原文说人人可用、注册即可、免费版直接用，就写 ["none"]；需要付费订阅写 member:套餐名；只有原文完全没提谁能领、也没法从产品形态判断时才写 unknown（unknown 的条目审核时会被拦下，必须人工补）
  - phone/card/net 要有相应资格证据；不凭英文页面、海外品牌或域名就推断需要海外网络。AWS这个按量计费案例保留card，不自动添net或pay。
- audience：new / old / all / unclear（原文没写清楚就用 unclear）
- valueText：必须写出具体数量和单位（如"每天 1000 次请求""新用户 2000 万 tokens""6 元赠金""$5/月"），数字从原文来。原文没有给出任何具体数量时，写"官方未写明具体额度："加原文说法。原文写了能用哪些模型（包括脚注、常见问题里的说明），要把模型名写进 valueText，如"每月 50 credits，可用 Claude Sonnet 4.5 及开源模型 Qwen3 Coder Next、DeepSeek 3.2"；写了速率限制或只能在某个客户端使用，也一并写上
- usdEstimate：折合美元（常驻额度按每月）。平台自有单位（credits、Neurons、Token、次数等）必须用同一平台官方公布的单价折算成美元，人民币按 7.1 折算；valueText 里在原单位后面括号写出折算依据，如"每天 10,000 Neurons（官方单价 $0.011/千 Neurons，约 $3.3/月）"。按 Token 折算时用官方输入价保守估算。只限速率的免费模型：按主力模型（该额度里最好的那个，如 Gemini 3.8 Flash）的官方输入价，乘以官方速率上限推出的每月最多 Token：每天最多 Token = min（每天请求数 × 单次最多 Token，每分钟 Token 数 × 1440），再 × 30。官方没公开速率上限就填 null，不要自己假设次数或每次 Token 数。价值有明显区间时（如分套餐档位、订阅价到最高额度）usdEstimate 填保守下限，usdMax 填上限。实在找不到任何官方单价才用 null，不要编单价
- claimStart / claimEnd：官方时区下的日期 YYYY-MM-DD，没写就 null
- 只有“2026年5月”时，不能输出2026-05-01；日精度不能补成00:00:00Z。原计划5月推出、本轮10月6日新增权益，抽当前扩展权益时claimStart=2026-10-06，publishedAt仅有日期就保留2026-10-06，不猜时刻。
- endKind：有明确截止日期用 date；没写截止日期的活动（包括长期有效的新人礼、充值赠送）用 unknown；只有 type 为 standing 或 apply 时才用 standing
- creditValidity：领取后额度多久失效，用中文写（如"30 天""每月重置，未用完不结转"），没写就 null
- sourceTz：官方使用的 IANA 时区（中国厂商一般 Asia/Shanghai，美国厂商 America/Los_Angeles），拿不准用 UTC
- steps：领取步骤，最多 4 条，用中文写
- 语言：除 excerpts 必须保留官方原文外，title、valueText、creditValidity、steps 一律用中文；产品名、模型名、计量单位（如 credits、Neurons、Token）、按钮和命令等必要的英文保留原样，不要整句照搬英文
- excerpts：从原文逐字复制的句子，分别支撑 benefit（赠送内容）/ eligibility（资格）/ claim（领取方式，可选，原文专门写了才填）/ validity（有效期或截止）。原文没有就留空字符串，绝对不要改写或编造。

只输出 JSON：{"offers":[...]}，没有符合条件的就输出 {"offers":[]}。`;

/** 第二层：由每周纠正归纳、经管理员批准的规则（pipeline/learned-rules.md）。 */
import { readFileSync } from 'node:fs';
/** 平台抽取要点（pipeline/platform-notes.md）：`## 平台 id` 下每行 `- ` 一条，抽取该平台时附给模型。 */
export function parsePlatformNotes(md: string): Map<string, string[]> {
  const notes = new Map<string, string[]>();
  let cur: string | null = null;
  for (const line of md.split('\n')) {
    const h = line.match(/^##\s+([a-z0-9][a-z0-9-]*)\s*$/);
    if (h) { cur = h[1]; notes.set(cur, []); continue; }
    const b = line.match(/^\s*-\s+(.+)$/);
    if (cur && b) notes.get(cur)!.push(b[1].trim());
  }
  return notes;
}
const PLATFORM_NOTES = (() => { try { return parsePlatformNotes(readFileSync(new URL('./platform-notes.md', import.meta.url), 'utf8')); } catch { return new Map<string, string[]>(); } })();
/** 取若干平台的要点，拼成提示词片段；没有就返回空串。 */
export function platformNotesFor(ids: (string | null | undefined)[], notes = PLATFORM_NOTES): string {
  const parts = [...new Set(ids.filter((x): x is string => !!x))].filter(id => notes.get(id)?.length).map(id => `【${id}】\n${notes.get(id)!.map(n => '- ' + n).join('\n')}`);
  return parts.length ? `\n\n这些平台的抽取要点（管理员审核总结，务必照做）：\n${parts.join('\n')}` : '';
}

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

interface Provider { name: string; paid?: boolean; price?: ModelPrice; call: (sys: string, user: string, timeoutMs: number) => Promise<{ text: string; tokens: number; costCny?: number; usageKnown: boolean }> }

function providers(): Provider[] {
  const list: Provider[] = [];
  if (process.env.GEMINI_API_KEY) list.push({
    name: 'gemini',
    call: async (sys, user, timeoutMs) => {
      const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: MODEL_OUTPUT_LIMIT } }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!r.ok) throw Object.assign(new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`), { retryable: r.status >= 500 || r.status === 404 || r.status === 429, httpStatus: r.status });
      const j = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[]; usageMetadata?: { totalTokenCount?: number } };
      return { text: j.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '', tokens: j.usageMetadata?.totalTokenCount ?? 0, usageKnown: Number.isFinite(j.usageMetadata?.totalTokenCount) };
    },
  });
  const openaiLike = (name: string, url: string, key: string | undefined, model: string | undefined, price?: { in: number; out: number }) => {
    if (key && model) list.push({
      name, paid: !!price, price,
      call: async (sys, user, timeoutMs) => {
        const r = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, temperature: 0.1, max_tokens: MODEL_OUTPUT_LIMIT, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }),
          signal: AbortSignal.timeout(timeoutMs),
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
// 每次采集是独立进程。额度/鉴权故障或连续网络故障后，本轮不再逐条重复撞同一个供应商。
const unavailableProviders = new Set<string>();
export const modelAvailable = (allowPaid = false) => providers().some(p => !unavailableProviders.has(p.name) && (!p.paid || allowPaid));
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
  // jsonrepair 会把被截断的 {"offers":[ 修补成空数组；这不是“确认没有福利”。
  if (end < 0) throw new Error('模型 JSON 对象被截断，不能确认抽取结果');
  const body = s.slice(start, end + 1);
  try { return JSON.parse(body); } catch { /* 继续尝试 */ }
  try { return JSON.parse(body.replace(/,\s*([}\]])/g, '$1')); } catch { /* 继续尝试 */ }
  // 最后用 jsonrepair 兜底：完整对象内的注释、单引号、缺引号等格式错误
  return JSON.parse(jsonrepair(body));
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
/**
 * 枚举字段遇到不认识的值：映射到最接近的合法值，或退回“待确认”的默认值，绝不让整条羊毛因校验失败被丢弃。
 * 2026-10-01 批量抓取时先后因模态写“3d”、额度超长、领取方式写了不认识的值丢掉了 Meshy、AWS、硅基流动、百川各一条。
 */
const TYPE_OK = ['new', 'trial', 'free', 'perk', 'topup', 'gift', 'standing', 'apply'];
const TYPE_ALIAS: [RegExp, string][] = [[/sign.?up|new.?user|新人|注册/, 'new'], [/first.?use|app.?trial|尝鲜/, 'trial'], [/member|subscri|会员/, 'perk'], [/top.?up|recharge|充值|discount|折扣/, 'topup'], [/permanent|always|standing|常驻|free.?tier/, 'standing'], [/apply|application|grant|program|申请/, 'apply']];
const CLAIM_OK = ['auto', 'signup', 'app', 'form', 'topup', 'member', 'code'];
const CLAIM_ALIAS: [RegExp, string][] = [[/apply|application|form|waitlist|申请|表单|邮件/, 'form'], [/download|app|client|desktop|cli|客户端|下载/, 'app'], [/sign.?up|register|login|log.?in|注册|登录/, 'signup'], [/subscri|member|会员|订阅/, 'member'], [/top.?up|recharge|pay|purchase|upgrade|充值|购买|升级/, 'topup'], [/code|coupon|invite|referral|兑换|邀请/, 'code']];
const pick = (v: unknown, ok: string[], alias: [RegExp, string][], fallback: string) => {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (ok.includes(s)) return s;
  return alias.find(([re]) => re.test(s))?.[1] ?? fallback;
};
const validTz = (tz: unknown) => { try { if (typeof tz === 'string' && tz) { new Intl.DateTimeFormat('en', { timeZone: tz }); return tz; } } catch { /* 无效时区 */ } return 'UTC'; };
const isoOrNull = (d: unknown) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim()) ? d.trim() : null);
const numberOrNull = (value: unknown) => {
  if (value == null || (typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export function tidy(o: Extracted): Extracted {
  const low = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
  const type = pick(o.type, TYPE_OK, TYPE_ALIAS, 'free');
  const claimEnd = isoOrNull(o.claimEnd);
  return {
    ...o,
    type: type as Extracted['type'], claimMethod: pick(o.claimMethod, CLAIM_OK, CLAIM_ALIAS, 'auto'),
    audience: (['new', 'old', 'all', 'unclear'].includes(String(low(o.audience))) ? low(o.audience) : 'unclear') as Extracted['audience'],
    sourceTz: validTz(o.sourceTz),
    // 类型和截止方式要配套：常驻/申请制一定是 standing；其他类型没截止日期时算"截止未知"
    endKind: (['standing', 'apply'].includes(type) ? 'standing' : low(o.endKind) === 'date' && claimEnd ? 'date' : 'unknown') as Extracted['endKind'],
    // 模态只认五种；3D 生成归到图像，其他不认识的去掉，全去掉了按文本。之前模型写了“3d”整条被丢（2026-10-01 Meshy）
    modalities: (() => { const m = [...new Set(toList(o.modalities).map(x => x.toLowerCase()).map(x => (/^3d|3d$|mesh|model3d/.test(x) ? 'image' : x === 'code' ? 'text' : x)).filter(x => ['text', 'image', 'video', 'audio'].includes(x)))]; return m.length ? m : ['text']; })(),
    // 模型偶尔只写 member / pay 不带内容，补成可读的占位，交给审核时修正
    requirements: normalizeRequirements(o.requirements),
    // 模型名里有空格（如 Gemini 3.8 Flash），字符串只按逗号、顿号、分号拆
    tags: [...new Set(toList(o.tags ?? []).map(x => x.toLowerCase()).filter(x => ['reset', 'referral', 'discount', 'daily'].includes(x)))],
    publishedAt: typeof o.publishedAt === 'string' && !Number.isNaN(Date.parse(o.publishedAt))
      ? /^\d{4}-\d{2}-\d{2}$/.test(o.publishedAt.trim()) ? o.publishedAt.trim() : new Date(o.publishedAt).toISOString() : null,
    models: [...new Set((Array.isArray(o.models) ? o.models.map(String) : typeof o.models === 'string' ? (o.models as string).split(/[,，、;；]+/) : []).map(x => x.trim()).filter(x => x && x.length <= 80 && !/^(等|系列|and more|etc\.?)$/i.test(x)))].slice(0, 80),
    steps: toList(o.steps).length && Array.isArray(o.steps) ? o.steps : typeof o.steps === 'string' ? [o.steps] : [],
    usdEstimate: numberOrNull(o.usdEstimate), usdMax: numberOrNull(o.usdMax),
    claimStart: isoOrNull(o.claimStart), claimEnd, creditValidity: o.creditValidity || null,
  };
}

/** 免费模型都不可用时抛出，调用方把这个页面推迟到下一轮。 */
export class DeferError extends Error {}
export class ModelOutputError extends Error {}

function parseOffers(out: string): Extracted[] {
  try {
    const json = parseModelJson(out);
    if (!json || typeof json !== 'object' || Array.isArray(json) || Object.keys(json).some(key => key !== 'offers')
      || !('offers' in json) || !Array.isArray(json.offers)
      || json.offers.some(o => !o || typeof o !== 'object' || Array.isArray(o)
        || typeof o.key !== 'string' || !o.key.trim() || typeof o.title !== 'string' || typeof o.valueText !== 'string')) {
      throw new Error('模型输出必须是 {"offers":[...]}，条目必须包含 key、title 和 valueText');
    }
    return json.offers as Extracted[];
  } catch (error) { throw new ModelOutputError((error as Error).message); }
}

export async function extract(platformName: string, url: string, text: string, log: (...a: unknown[]) => void = () => undefined, opts: { allowPaid?: boolean; evidenceText?: string; deadlineAt?: number; platformList?: string; existing?: string; corrections?: string[]; platformIds?: (string | null | undefined)[]; budget?: { reserve: (provider: string, system: string, user: string, price?: ModelPrice) => Promise<ModelReservation>; settle: (reservation: ModelReservation, provider: string, tokens: number, costCny: number) => Promise<void> } } = {}): Promise<{ offers: (Extracted & { platformId?: string; officialUrl?: string | null; sameAs?: string | null })[]; tokens: number; costCny: number; provider: string }> {
  const user = `平台：${platformName}\n来源：${url}\n\n---- 原文 ----\n${text}`;
  const base = PROMPT + LEARNED + platformNotesFor(opts.platformIds ?? []) + (opts.corrections?.length ? `\n\n管理员最近的纠正（照这些改正方向抽取，同类错误不要再犯）：\n${opts.corrections.map(x => '- ' + x).join('\n')}` : '');
  const known = opts.existing ? `\n已收录条目（id｜标题｜额度）：\n${opts.existing}` : '';
  const same = opts.existing && !opts.platformList ? `\n\n每条再加一个字段 sameAs：如果和下面"已收录条目"里的某条是同一个权益（说法不同也算），填那条的 id，否则 null。` : '';
  const sys = opts.platformList ? base + TRIAGE + opts.platformList + known : base + same + known;
  let lastErr: unknown;
  const all = providers().filter(p => !unavailableProviders.has(p.name));
  const free = all.filter(p => !p.paid), paid = all.filter(p => p.paid);
  const chain = opts.allowPaid ? [...free, ...paid] : free;
  for (const p of chain) {
    try {
      let res: { text: string; tokens: number; costCny?: number; usageKnown: boolean } | null = null;
      for (let i = 0; i < 3 && !res; i++) {
        if (Date.now() >= (opts.deadlineAt ?? Infinity)) throw new DeferError('本轮即将结束，留到下一轮抽取');
        const reservation = opts.budget ? await opts.budget.reserve(p.name, sys, user, p.price) : null;
        try {
          await pace();
          const remaining = (opts.deadlineAt ?? Infinity) - Date.now();
          if (remaining <= 0) {
            if (reservation) await opts.budget!.settle(reservation, p.name, 0, 0);
            throw new DeferError('本轮即将结束，留到下一轮抽取');
          }
          res = await p.call(sys, user, Math.max(1, Math.min(90000, remaining)));
          if (reservation) {
            if (res.usageKnown) await opts.budget!.settle(reservation, p.name, res.tokens, res.costCny ?? 0);
            else { log(`  ${p.name} 未返回可靠用量，保留预算预留`); res.tokens = reservation.tokens; res.costCny = reservation.costCny; }
          }
        }
        catch (e) {
          if (e instanceof BudgetExhaustedError || e instanceof BudgetLedgerError || e instanceof DeferError) throw e;
          const status = (e as { httpStatus?: number }).httpStatus;
          if (reservation && status) await opts.budget!.settle(reservation, p.name, 0, 0);
          if (status && [401, 403, 404, 429].includes(status)) {
            unavailableProviders.add(p.name);
            log(`  ${p.name} 返回 ${status}，本轮冷却，下一轮再试`);
            throw e;
          }
          if (!(e as { retryable?: boolean }).retryable || i === 2) {
            unavailableProviders.add(p.name);
            throw e;
          }
          const wait = 3000 * (i + 1);
          if (Date.now() + wait >= (opts.deadlineAt ?? Infinity)) throw new DeferError('本轮即将结束，留到下一轮重试');
          log(`  ${p.name} 临时出错，${wait / 1000} 秒后重试：${(e as Error).message.slice(0, 80)}`);
          await new Promise(r => setTimeout(r, wait));
        }
      }
      const { text: out, tokens, costCny = 0 } = res!;
      const offers = parseOffers(out).map(o => ({ ...tidy(o), excerpts: keepVerbatim(o.excerpts, opts.evidenceText ?? text) }));
      return { offers, tokens, costCny, provider: p.name };
    } catch (e) {
      if (e instanceof BudgetExhaustedError || e instanceof BudgetLedgerError || e instanceof DeferError) throw e;
      lastErr = e; log(`  ${p.name} 失败，换下一个模型：${(e as Error).message.slice(0, 120)}`);
    }
  }
  if (lastErr instanceof ModelOutputError) throw lastErr;
  throw new DeferError(`本轮可用模型已耗尽，推迟到下一轮：${(lastErr as Error)?.message?.slice(0, 80) ?? ''}`);
}
