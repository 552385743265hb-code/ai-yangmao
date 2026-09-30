/* ============================================================
 * AI 羊毛牧场 · 原型示例数据
 * 所有活动、额度、日期均为示例，用来演示页面效果，不是真实活动。
 * 日期一律写成"相对今天的天数"，所以原型任何一天打开都有进行中的内容。
 * ============================================================ */

const TYPES = {
  new:      { l: '注册新人礼',   slot: 1 },
  free:     { l: '限时免费开放', slot: 2 },
  perk:     { l: '会员福利',     slot: 3 },
  topup:    { l: '充值赠送',     slot: 4 },
  gift:     { l: '会员免费送',   slot: 5 },
  standing: { l: '常驻免费额度', slot: 6 },
  apply:    { l: '申请制',       slot: 7 },
};
const MODAL = { text: '文本', code: '编程', image: '图像', video: '视频', audio: '音乐·语音' };
const CLAIM = { auto: '自动到账', signup: '注册即送', app: '下载 App', form: '邮件或表单申请', topup: '充值触发', member: '会员自动生效', code: '兑换码' };
const REQ = {
  none: '零门槛', pay: '需充值', member: '需会员', phone: '需海外手机号', card: '需海外信用卡', net: '需海外网络',
  realname: '需实名', biz: '需企业认证', student: '需学生认证', invite: '需邀请码', targeted: '定向发放',
};
const SRC = { site: '官网公告', docs: '帮助文档', official: '官方账号', staff: '员工账号' };
const PTYPE = { lab: { l: '模型厂商', slot: 1 }, cloud: { l: '云厂商', slot: 2 }, infra: { l: '推理平台', slot: 3 }, tool: { l: 'AI 工具', slot: 4 }, new: { l: '新玩家', slot: 5 } };
const TZ = { 'Asia/Shanghai': '北京时间', 'America/Los_Angeles': '美西时间（PT）', 'America/New_York': '美东时间（ET）', 'UTC': 'UTC' };
const AUD = { new: '新用户', old: '老用户', all: '全部用户', unclear: '资格未明确' };

// id, 名称, 类型, 官网, 官方 X, 已准入
const PLATFORMS = [
  ['openai', 'OpenAI', 'lab', 'https://openai.com', '@OpenAI · @OpenAIDevs · 员工 @thsottiaux'],
  ['anthropic', 'Anthropic', 'lab', 'https://www.anthropic.com', '@AnthropicAI · @claudeai'],
  ['google', 'Google AI', 'lab', 'https://aistudio.google.com', '@GoogleAIStudio · @GeminiApp'],
  ['deepseek', 'DeepSeek', 'lab', 'https://platform.deepseek.com', '@deepseek_ai'],
  ['moonshot', 'Kimi 开放平台', 'lab', 'https://platform.moonshot.cn', '@Kimi_Moonshot'],
  ['zhipu', '智谱 Z.ai', 'lab', 'https://bigmodel.cn', '@Zai_org'],
  ['minimax', 'MiniMax', 'lab', 'https://www.minimaxi.com', '@MiniMax_AI'],
  ['xai', 'xAI', 'lab', 'https://x.ai', '@xai'],
  ['mistral', 'Mistral', 'lab', 'https://mistral.ai', '@MistralAI'],
  ['aliyun', '阿里云百炼', 'cloud', 'https://bailian.console.aliyun.com', '@Alibaba_Qwen'],
  ['volc', '火山方舟', 'cloud', 'https://www.volcengine.com/product/ark', ''],
  ['tencent', '腾讯混元', 'cloud', 'https://cloud.tencent.com/product/hunyuan', '@TencentHunyuan'],
  ['aws', 'AWS', 'cloud', 'https://aws.amazon.com/activate/', ''],
  ['gcloud', 'Google Cloud', 'cloud', 'https://cloud.google.com/startup', ''],
  ['azure', 'Microsoft Azure', 'cloud', 'https://www.microsoft.com/en-us/startups', ''],
  ['openrouter', 'OpenRouter', 'infra', 'https://openrouter.ai', '@OpenRouter'],
  ['opencode', 'OpenCode Zen', 'infra', 'https://opencode.ai', '@opencode'],
  ['siliconflow', '硅基流动', 'infra', 'https://siliconflow.cn', '@SiliconFlowAI'],
  ['groq', 'Groq', 'infra', 'https://groq.com', ''],
  ['cerebras', 'Cerebras', 'infra', 'https://cerebras.ai', ''],
  ['github', 'GitHub Models', 'infra', 'https://github.com/marketplace/models', ''],
  ['cloudflare', 'Cloudflare Workers AI', 'infra', 'https://developers.cloudflare.com/workers-ai/', ''],
  ['vercel', 'Vercel AI Gateway', 'infra', 'https://vercel.com/ai-gateway', ''],
  ['hf', 'Hugging Face', 'infra', 'https://huggingface.co', ''],
  ['cursor', 'Cursor', 'tool', 'https://cursor.com', ''],
  ['kiro', 'Kiro', 'tool', 'https://kiro.dev', ''],
  ['trae', 'Trae', 'tool', 'https://www.trae.ai', ''],
  ['perplexity', 'Perplexity', 'tool', 'https://www.perplexity.ai', ''],
  ['kling', '可灵 AI', 'tool', 'https://klingai.com', '@Kling_ai'],
  ['jimeng', '即梦', 'tool', 'https://jimeng.jianying.com', ''],
  ['suno', 'Suno', 'tool', 'https://suno.com', '@suno'],
  ['eleven', 'ElevenLabs', 'tool', 'https://elevenlabs.io', ''],
  ['runway', 'Runway', 'tool', 'https://runwayml.com', '@runwayml'],
  ['krea', 'Krea', 'tool', 'https://www.krea.ai', '@krea_ai'],
  ['pixverse', 'PixVerse', 'tool', 'https://pixverse.ai', '@PixVerse'],
  ['higgsfield', 'Higgsfield', 'tool', 'https://higgsfield.ai', ''],
  ['typesafe', 'TypeSafe · Jev', 'new', '', '@typesafeai'],
].map(([id, name, type, site, x]) => ({ id, name, type, site, x }));

/* 羊毛字段：
 * p 平台 · t 标题 · ty 类型 · m 模态 · c 领取方式 · r 门槛 · v 官方原文额度 · usd 折合美元（常驻为每月）
 * s 开始（相对今天天数）· e 截止 · ek 截止类型 date/unknown/standing · vf 最近核验（负数=几天前）
 * st 信源级别 · tz 原始时区 · val 额度有效期 · aud 适用对象 · cn 国内可直接领 · fs 系统发现（相对天数）
 */
const OFFERS = [
  // ---------- 进行中 / 即将开始的限时羊毛 ----------
  { id: 'codex-reset', p: 'openai', t: 'Codex 付费用户额度全员重置', ty: 'perk', m: ['code'], c: 'member', r: ['member:ChatGPT Plus', 'net'], v: '5 小时与每周用量全部清零', usd: 20, s: -4, e: 3, ek: 'date', vf: -0.2, st: 'staff', tz: 'America/Los_Angeles', val: '本用量周期内', aud: 'all', cn: false, fs: -4, early: 'X 员工账号' },
  { id: 'zcode-comp', p: 'zhipu', t: 'ZCode 补偿：重置卡 + 1 亿 Tokens', ty: 'perk', m: ['code', 'text'], c: 'auto', r: ['targeted'], v: '1 张额度重置卡 + 1 亿 Tokens', usd: 60, s: -2, e: 28, ek: 'date', vf: -0.3, st: 'official', tz: 'Asia/Shanghai', val: '到账后 30 天', aud: 'old', cn: true, fs: -2, early: '公众号' },
  { id: 'minimax-reset', p: 'minimax', t: '新模型上线，Coding Plan 额度重置卡', ty: 'perk', m: ['code'], c: 'member', r: ['member:MiniMax Coding Plan'], v: '每位订阅用户 1 张重置卡', usd: 15, s: -3, e: 11, ek: 'date', vf: -0.5, st: 'official', tz: 'Asia/Shanghai', val: '领取后 7 天', aud: 'old', cn: true, fs: -3, early: '媒体报道' },
  { id: 'longcat-free', p: 'opencode', t: 'LongCat-2.5 限时免费两周', ty: 'free', m: ['text', 'code'], c: 'auto', r: ['net'], v: '活动期内调用该模型不计费', usd: 30, s: -4, e: 10, ek: 'date', vf: -0.25, st: 'official', tz: 'UTC', val: '活动期内', aud: 'all', cn: false, fs: -4, early: 'X 官方账号' },
  { id: 'deepseek-national', p: 'deepseek', t: '国庆充值加赠：充 ¥100 送 ¥20', ty: 'topup', m: ['text', 'code'], c: 'topup', r: ['pay:¥100', 'realname'], v: '单笔充值满 ¥100 赠送 ¥20 余额', usd: 3, s: 1, e: 7, ek: 'date', vf: -0.4, st: 'site', tz: 'Asia/Shanghai', val: '赠送余额 90 天内有效', aud: 'all', cn: true, fs: -1, early: '官网公告' },
  { id: 'kimi-newbie', p: 'moonshot', t: '新用户注册送 ¥15 体验金', ty: 'new', m: ['text', 'code'], c: 'signup', r: ['realname'], v: '¥15 体验金', usd: 2, s: -60, e: 31, ek: 'date', vf: -1, st: 'site', tz: 'Asia/Shanghai', val: '到账后 30 天', aud: 'new', cn: true, fs: -58, early: '官网公告',
    rev: [{ at: -10, from: '¥10 体验金', to: '¥15 体验金' }] },
  { id: 'silicon-newbie', p: 'siliconflow', t: '注册送 2000 万 Tokens', ty: 'new', m: ['text', 'image'], c: 'signup', r: ['realname'], v: '2000 万 Tokens', usd: 5, s: -120, e: null, ek: 'unknown', vf: -0.6, st: 'site', tz: 'Asia/Shanghai', val: '长期有效', aud: 'new', cn: true, fs: -118, early: '官网公告',
    rev: [{ at: -60, from: '仅文本模型可用', to: '文本和图像模型均可用' }] },
  { id: 'gemini-students', p: 'google', t: '学生免费用一年 Google AI Pro', ty: 'gift', m: ['text', 'image', 'video'], c: 'form', r: ['student', 'net'], v: '12 个月 AI Pro 会员', usd: 240, s: -30, e: 45, ek: 'date', vf: -1, st: 'site', tz: 'America/Los_Angeles', val: '12 个月', aud: 'new', cn: false, fs: -29, early: '官网公告' },
  { id: 'perplexity-paypal', p: 'perplexity', t: 'PayPal 用户送 12 个月 Pro', ty: 'gift', m: ['text'], c: 'signup', r: ['card', 'net'], v: '12 个月 Pro 会员', usd: 240, s: -20, e: 60, ek: 'date', vf: -2, st: 'site', tz: 'America/New_York', val: '12 个月', aud: 'new', cn: false, fs: -19, early: '媒体报道' },
  { id: 'cursor-trial', p: 'cursor', t: '新用户 Pro 试用延长到 14 天', ty: 'new', m: ['code'], c: 'signup', r: ['net'], v: '14 天 Pro 试用', usd: 20, s: -5, e: 9, ek: 'date', vf: -0.5, st: 'docs', tz: 'America/Los_Angeles', val: '14 天', aud: 'new', cn: false, fs: -5, early: 'X 官方账号' },
  { id: 'kiro-launch', p: 'kiro', t: '新用户首月 Pro+ 免费', ty: 'new', m: ['code'], c: 'signup', r: ['net'], v: '30 天 Pro+ 额度', usd: 40, s: -10, e: 2, ek: 'date', vf: -0.7, st: 'site', tz: 'America/Los_Angeles', val: '30 天', aud: 'new', cn: false, fs: -9, early: '官网公告' },
  { id: 'trae-solo', p: 'trae', t: 'SOLO 模式限时免费', ty: 'free', m: ['code'], c: 'auto', r: ['none'], v: '活动期内 SOLO 模式不限次', usd: 10, s: -8, e: 0, ek: 'date', vf: -0.3, st: 'official', tz: 'Asia/Shanghai', val: '活动期内', aud: 'all', cn: true, fs: -8, early: '公众号' },
  { id: 'kling-national', p: 'kling', t: '国庆每日签到 +66 灵感值', ty: 'free', m: ['video', 'image'], c: 'app', r: ['realname'], v: '每日签到 66 灵感值', usd: 8, s: 1, e: 8, ek: 'date', vf: -0.4, st: 'official', tz: 'Asia/Shanghai', val: '当月有效', aud: 'all', cn: true, fs: -1, early: '订阅邮件' },
  { id: 'runway-weekend', p: 'runway', t: '周末 Gen-4 不限量生成', ty: 'perk', m: ['video'], c: 'member', r: ['member:Runway Unlimited', 'net'], v: '周末两天不限量', usd: 25, s: 3, e: 4, ek: 'date', vf: -0.6, st: 'official', tz: 'America/New_York', val: '活动期内', aud: 'old', cn: false, fs: -1, early: 'X 官方账号' },
  { id: 'higgsfield-week', p: 'higgsfield', t: '新模型上线 7 天不限量生成', ty: 'perk', m: ['video', 'image'], c: 'member', r: ['member:Higgsfield Pro', 'card', 'net'], v: '7 天不限量', usd: 50, s: -6, e: 1, ek: 'date', vf: -0.2, st: 'official', tz: 'America/Los_Angeles', val: '活动期内', aud: 'old', cn: false, fs: -6, early: '周六扫描' },
  { id: 'xai-share', p: 'xai', t: '开启数据共享，每月送 $150 API 额度', ty: 'topup', m: ['text', 'code'], c: 'topup', r: ['pay:$5', 'card', 'net'], v: '每月 $150 API 额度', usd: 150, s: -200, e: null, ek: 'unknown', vf: -1.5, st: 'docs', tz: 'UTC', val: '当月有效', aud: 'all', cn: false, fs: -190, early: '帮助文档' },
  { id: 'aliyun-newbie', p: 'aliyun', t: '新用户每个模型送 100 万 Tokens', ty: 'new', m: ['text', 'image', 'video', 'audio'], c: 'signup', r: ['realname'], v: '每个模型 100 万 Tokens', usd: 25, s: -300, e: null, ek: 'unknown', vf: -0.8, st: 'docs', tz: 'Asia/Shanghai', val: '领取后 90 天', aud: 'new', cn: true, fs: -290, early: '帮助文档' },
  { id: 'volc-newbie', p: 'volc', t: '新用户每个模型送 50 万 Tokens', ty: 'new', m: ['text', 'image', 'video'], c: 'signup', r: ['realname'], v: '每个模型 50 万 Tokens', usd: 20, s: -200, e: null, ek: 'unknown', vf: -2, st: 'docs', tz: 'Asia/Shanghai', val: '领取后 90 天', aud: 'new', cn: true, fs: -196, early: '帮助文档' },
  { id: 'claude-invite', p: 'anthropic', t: '邀请好友：双方各得一周会员', ty: 'gift', m: ['text', 'code'], c: 'code', r: ['invite', 'card', 'net'], v: '邀请人与被邀请人各 7 天', usd: 25, s: -12, e: null, ek: 'unknown', vf: -3, st: 'docs', tz: 'America/Los_Angeles', val: '7 天', aud: 'unclear', cn: false, fs: -12, early: 'X 员工账号' },

  // ---------- 常驻免费额度（usd = 每月折合） ----------
  { id: 'openrouter-free', p: 'openrouter', t: '免费模型每天 50 次（充 $10 后 1000 次）', ty: 'standing', m: ['text', 'code'], c: 'signup', r: ['net'], v: '每天 50 次请求', usd: 15, vf: -2, st: 'docs', tz: 'UTC', val: '每日刷新', aud: 'all', cn: false, fs: -400, early: '帮助文档',
    rev: [{ at: -40, from: '每天 20 次请求', to: '每天 50 次请求' }] },
  { id: 'groq-free', p: 'groq', t: '免费层 API（按模型限速）', ty: 'standing', m: ['text', 'audio'], c: 'signup', r: ['net'], v: '按模型每分钟/每日限额', usd: 30, vf: -4, st: 'docs', tz: 'UTC', val: '每日刷新', aud: 'all', cn: false, fs: -380, early: '帮助文档' },
  { id: 'cerebras-free', p: 'cerebras', t: '免费层每日 100 万 Tokens', ty: 'standing', m: ['text', 'code'], c: 'signup', r: ['net'], v: '每日 100 万 Tokens', usd: 20, vf: -6, st: 'docs', tz: 'UTC', val: '每日刷新', aud: 'all', cn: false, fs: -300, early: '帮助文档' },
  { id: 'gemini-api', p: 'google', t: 'Gemini API 免费层', ty: 'standing', m: ['text', 'image'], c: 'signup', r: ['net'], v: '按模型每日请求上限', usd: 45, vf: -16, st: 'docs', tz: 'America/Los_Angeles', val: '每日刷新', aud: 'all', cn: false, fs: -500, early: '帮助文档',
    rev: [{ at: -16, from: 'Flash 每日 1500 次请求', to: 'Flash 每日 1000 次请求' }] },
  { id: 'gemini-cli', p: 'google', t: 'Gemini CLI 每日免费请求', ty: 'standing', m: ['code'], c: 'signup', r: ['net'], v: '个人账号每日请求额度', usd: 60, vf: -3, st: 'docs', tz: 'America/Los_Angeles', val: '每日刷新', aud: 'all', cn: false, fs: -450, early: '帮助文档' },
  { id: 'qwen-code', p: 'aliyun', t: 'Qwen Code 每日免费请求', ty: 'standing', m: ['code'], c: 'signup', r: ['none'], v: '每日免费请求额度', usd: 30, vf: -2, st: 'docs', tz: 'Asia/Shanghai', val: '每日刷新', aud: 'all', cn: true, fs: -420, early: '帮助文档' },
  { id: 'gh-models', p: 'github', t: 'GitHub Models 免费试用额度', ty: 'standing', m: ['text', 'code'], c: 'signup', r: ['none'], v: '按模型每日请求上限', usd: 10, vf: -5, st: 'docs', tz: 'UTC', val: '每日刷新', aud: 'all', cn: true, fs: -520, early: '帮助文档' },
  { id: 'cf-workers-ai', p: 'cloudflare', t: 'Workers AI 每日 1 万 Neurons', ty: 'standing', m: ['text', 'image', 'audio'], c: 'signup', r: ['none'], v: '每日 10,000 Neurons', usd: 3, vf: -9, st: 'docs', tz: 'UTC', val: '每日刷新', aud: 'all', cn: true, fs: -600, early: '帮助文档' },
  { id: 'vercel-gw', p: 'vercel', t: 'AI Gateway 每月 $5 免费额度', ty: 'standing', m: ['text', 'image'], c: 'signup', r: ['net'], v: '每月 $5', usd: 5, vf: -11, st: 'docs', tz: 'UTC', val: '当月有效', aud: 'all', cn: false, fs: -330, early: '帮助文档' },
  { id: 'hf-credits', p: 'hf', t: 'Inference Providers 每月免费额度', ty: 'standing', m: ['text', 'image', 'audio'], c: 'signup', r: ['net'], v: '免费用户每月 $0.10', usd: 0.1, vf: -12, st: 'docs', tz: 'UTC', val: '当月有效', aud: 'all', cn: false, fs: -350, early: '帮助文档' },
  { id: 'tencent-lite', p: 'tencent', t: '混元 lite 模型免费调用', ty: 'standing', m: ['text'], c: 'signup', r: ['realname'], v: 'lite 模型不计费', usd: 5, vf: -4, st: 'docs', tz: 'Asia/Shanghai', val: '长期', aud: 'all', cn: true, fs: -560, early: '帮助文档' },
  { id: 'zhipu-flash', p: 'zhipu', t: 'Flash 系列模型免费调用', ty: 'standing', m: ['text', 'image', 'video'], c: 'signup', r: ['realname'], v: 'Flash 系列不计费', usd: 10, vf: -1, st: 'docs', tz: 'Asia/Shanghai', val: '长期', aud: 'all', cn: true, fs: -540, early: '帮助文档' },
  { id: 'jimeng-daily', p: 'jimeng', t: '每日登录送积分', ty: 'standing', m: ['image', 'video'], c: 'app', r: ['realname'], v: '每日 80 积分', usd: 15, vf: -3, st: 'site', tz: 'Asia/Shanghai', val: '当日有效', aud: 'all', cn: true, fs: -310, early: '官网公告' },
  { id: 'kling-daily', p: 'kling', t: '每日登录送灵感值', ty: 'standing', m: ['video', 'image'], c: 'app', r: ['realname'], v: '每日 66 灵感值', usd: 12, vf: -2, st: 'site', tz: 'Asia/Shanghai', val: '当月有效', aud: 'all', cn: true, fs: -300, early: '官网公告' },
  { id: 'suno-free', p: 'suno', t: '免费版每日 50 credits', ty: 'standing', m: ['audio'], c: 'signup', r: ['net'], v: '每日 50 credits（约 10 首）', usd: 10, vf: -8, st: 'site', tz: 'America/New_York', val: '每日刷新', aud: 'all', cn: false, fs: -480, early: '官网公告' },
  { id: 'mistral-free', p: 'mistral', t: 'La Plateforme 免费实验层', ty: 'standing', m: ['text', 'code'], c: 'signup', r: ['phone', 'net'], v: '实验层限速免费', usd: 10, vf: -20, st: 'docs', tz: 'UTC', val: '每月刷新', aud: 'all', cn: false, fs: -410, early: '帮助文档' },

  // ---------- 申请制（usd = 最高额度） ----------
  { id: 'aws-activate', p: 'aws', t: 'AWS Activate：最高 $100,000 credits', ty: 'apply', m: ['text', 'image'], c: 'form', r: ['biz', 'card'], v: '最高 $100,000', usd: 100000, vf: -10, st: 'site', tz: 'UTC', val: '2 年', aud: 'new', cn: false, fs: -700, early: '官网公告' },
  { id: 'gcp-startups', p: 'gcloud', t: 'Google for Startups：AI 初创最高 $350,000', ty: 'apply', m: ['text', 'image', 'video'], c: 'form', r: ['biz', 'card'], v: '最高 $350,000', usd: 350000, vf: -9, st: 'site', tz: 'UTC', val: '2 年', aud: 'new', cn: false, fs: -690, early: '官网公告' },
  { id: 'azure-founders', p: 'azure', t: 'Microsoft for Startups：最高 $150,000', ty: 'apply', m: ['text', 'image'], c: 'form', r: ['biz', 'card'], v: '最高 $150,000 Azure 额度', usd: 150000, vf: -12, st: 'site', tz: 'UTC', val: '最长 2 年', aud: 'new', cn: false, fs: -650, early: '官网公告' },
  { id: 'anthropic-startups', p: 'anthropic', t: 'Claude 初创计划 API 额度', ty: 'apply', m: ['text', 'code'], c: 'form', r: ['biz'], v: '最高 $25,000', usd: 25000, vf: -6, st: 'site', tz: 'America/Los_Angeles', val: '1 年', aud: 'new', cn: false, fs: -400, early: '官网公告' },
  { id: 'eleven-grants', p: 'eleven', t: 'ElevenLabs Grants：初创 3 个月免费', ty: 'apply', m: ['audio'], c: 'form', r: ['biz'], v: '3 个月付费档', usd: 990, vf: -7, st: 'site', tz: 'UTC', val: '3 个月', aud: 'new', cn: false, fs: -380, early: '官网公告' },
  { id: 'volc-startup', p: 'volc', t: '创业扶持计划：最高 ¥10 万代金券', ty: 'apply', m: ['text', 'image', 'video'], c: 'form', r: ['biz', 'realname'], v: '最高 ¥100,000 代金券', usd: 14000, vf: -5, st: 'site', tz: 'Asia/Shanghai', val: '1 年', aud: 'new', cn: true, fs: -360, early: '官网公告' },

  // ---------- 已结束（进墓地） ----------
  { id: 'jev-free', p: 'typesafe', t: 'Jev 注册送免费额度', ty: 'new', m: ['text'], c: 'signup', r: ['none'], v: '注册即送免费调用额度', usd: 10, s: -40, e: -3, ek: 'date', vf: -3, st: 'official', tz: 'America/Los_Angeles', val: '30 天', aud: 'new', cn: false, fs: -38, early: 'X 官方账号', why: '官方暂停免费额度' },
  { id: 'claude-code-reset', p: 'anthropic', t: 'Claude Code 周额度一次性重置', ty: 'perk', m: ['code'], c: 'member', r: ['member:Claude Pro/Max'], v: '周额度清零一次', usd: 30, s: -38, e: -35, ek: 'date', vf: -35, st: 'staff', tz: 'America/Los_Angeles', val: '本周期内', aud: 'old', cn: false, fs: -38, early: 'X 员工账号' },
  { id: 'openrouter-stealth', p: 'openrouter', t: '隐身模型限时免费', ty: 'free', m: ['text', 'code'], c: 'auto', r: ['none'], v: '测试期不计费', usd: 20, s: -26, e: -12, ek: 'date', vf: -12, st: 'official', tz: 'UTC', val: '活动期内', aud: 'all', cn: false, fs: -26, early: 'AIHOT' },
  { id: 'pixverse-3day', p: 'pixverse', t: '新版本上线三天免费生成', ty: 'free', m: ['video'], c: 'auto', r: ['none'], v: '三天不计积分', usd: 15, s: -11, e: -8, ek: 'date', vf: -8, st: 'official', tz: 'UTC', val: '活动期内', aud: 'all', cn: false, fs: -11, early: 'AIHOT' },
  { id: 'deepseek-v4', p: 'deepseek', t: '新模型发布：新用户送 ¥10', ty: 'new', m: ['text'], c: 'signup', r: ['realname'], v: '¥10 余额', usd: 1.4, s: -70, e: -45, ek: 'date', vf: -45, st: 'site', tz: 'Asia/Shanghai', val: '30 天', aud: 'new', cn: true, fs: -70, early: '官网公告' },
  { id: 'krea-weekend', p: 'krea', t: '周末不限量生成', ty: 'free', m: ['image', 'video'], c: 'auto', r: ['net'], v: '周末不限量', usd: 12, s: -5, e: -3, ek: 'date', vf: -3, st: 'official', tz: 'America/Los_Angeles', val: '活动期内', aud: 'all', cn: false, fs: -5, early: 'X 官方账号' },
  { id: 'kimi-launch', p: 'moonshot', t: '新模型发布周：充值送代金券', ty: 'topup', m: ['text', 'code'], c: 'topup', r: ['pay:¥50', 'realname'], v: '充 ¥50 送 ¥10 代金券', usd: 5, s: -27, e: -20, ek: 'date', vf: -20, st: 'official', tz: 'Asia/Shanghai', val: '30 天', aud: 'all', cn: true, fs: -27, early: '公众号' },
];

// 节日与购物节（叠加在日历上）；past 为往年同一节点发过羊毛的平台（示例）
const HOLIDAYS = [
  { d: '2026-09-25', n: '中秋', past: '智谱、可灵' },
  { d: '2026-10-01', n: '国庆', past: 'DeepSeek、Kimi、可灵、即梦' },
  { d: '2026-11-11', n: '双 11', past: '阿里云百炼、火山方舟、腾讯混元' },
  { d: '2026-11-27', n: '黑五', past: 'Cursor、Perplexity、ElevenLabs、Runway' },
  { d: '2026-12-12', n: '双 12', past: '阿里云百炼、硅基流动' },
  { d: '2026-12-25', n: '圣诞', past: 'OpenRouter、Suno、Krea' },
  { d: '2027-01-01', n: '元旦', past: 'Kimi、MiniMax' },
  { d: '2027-02-06', n: '春节', past: 'DeepSeek、智谱、Kimi、MiniMax、可灵' },
];

// 按模型找：模型 → 提供免费额度的平台
const MODELS = [
  { id: 'dsv41', n: 'DeepSeek V4.1 Flash', on: [['opencode', '额度永久有效'], ['openrouter', ':free 版本每天 50 次'], ['siliconflow', '新人 Tokens 可用'], ['volc', '新用户 50 万 Tokens']] },
  { id: 'longcat', n: 'LongCat-2.5', on: [['opencode', '限时免费两周'], ['openrouter', ':free 版本']] },
  { id: 'qwen3', n: 'Qwen3 系列', on: [['aliyun', '新用户 100 万 Tokens'], ['siliconflow', '部分尺寸免费'], ['openrouter', ':free 版本'], ['cloudflare', 'Neurons 额度内']] },
  { id: 'glmflash', n: 'GLM Flash', on: [['zhipu', 'Flash 系列不计费'], ['siliconflow', '免费调用']] },
  { id: 'geminiflash', n: 'Gemini Flash', on: [['google', 'API 免费层'], ['vercel', '每月 $5 额度内']] },
  { id: 'gptoss', n: 'gpt-oss-120b', on: [['groq', '免费层'], ['cerebras', '每日 100 万 Tokens'], ['openrouter', ':free 版本'], ['github', '免费试用'], ['cloudflare', 'Neurons 额度内']] },
  { id: 'llama4', n: 'Llama 4', on: [['groq', '免费层'], ['cerebras', '免费层'], ['github', '免费试用'], ['cloudflare', 'Neurons 额度内']] },
  { id: 'minimax31', n: 'MiniMax M3.1', on: [['openrouter', ':free 版本'], ['siliconflow', '新人 Tokens 可用']] },
];

// 后台：待审队列（示例）
const QUEUE = [
  { id: 'q1', t: 'Instinct：公测期间免费使用', src: '周六发现扫描', tier: '新平台', note: '平台不在白名单，需你决定是否准入', kind: 'platform' },
  { id: 'q2', t: 'Kimi 开放平台：国庆充值加赠', src: 'Telegram 转发补录（公众号文章）', tier: '官方账号', note: '四项证据齐全；该信源已连续通过 3/5 条', kind: 'offer' },
  { id: 'q3', t: 'Gemini API 免费层额度调整', src: '帮助文档内容变化', tier: '帮助文档', note: '条款修订：Flash 每日请求上限下调', kind: 'change' },
  { id: 'q4', t: 'Claude Max 用户额度重置', src: '员工账号推文（AIHOT 线索）', tier: '员工账号', note: '员工账号来源，永远人工审核', kind: 'offer' },
  { id: 'q5', t: '某中转站：注册送 $50', src: 'LINUX DO 线索', tier: '社区线索', note: '预判拒绝：平台属于分销中转站', kind: 'reject' },
];

// 后台：信源健康（最近 30 次抓取，1 成功 0 失败）
const SOURCES = [
  ['OpenAI 官方博客 RSS', 'rss', '111111111111111111111111111111'],
  ['AIHOT · Codex 重置接口', 'aihot', '111111111111111111111111111111'],
  ['AIHOT · 全部动态', 'aihot', '111111111111101111111111111111'],
  ['DeepSeek 公告页', 'web_list', '111111111111111111111111111111'],
  ['Kimi 开放平台公告', 'web_list', '111111111110111111111111111111'],
  ['Gemini API 定价与限额', 'web_list', '111111111111111111111111100011'],
  ['火山方舟活动页', 'web_list', '111111111111111111111111111000'],
  ['OpenRouter 免费模型 JSON', 'json', '111111111111111111111111111111'],
  ['订阅邮箱', 'email', '111111111111111111111111111111'],
  ['硅基流动权益页', 'web_list', '111111111111111110111111111111'],
  ['Hacker News 搜索接口', 'json', '111111111111111111111111111111'],
  ['Reddit r/LocalLLaMA RSS', 'rss', '111111111111111111110111111111'],
].map(([n, kind, h]) => ({ n, kind, h: h.split('').map(Number) }));

// 后台：自动上架放权（平台 × 信源）
const AUTOPUB = [
  ['DeepSeek', '官网公告', 5, true], ['OpenRouter', '帮助文档', 5, true], ['硅基流动', '权益页', 5, false],
  ['Kimi 开放平台', '官方公众号', 3, false], ['阿里云百炼', '帮助文档', 4, false], ['OpenAI', '员工账号', 0, false],
].map(([pl, src, n, on]) => ({ pl, src, n, on, never: src === '员工账号' }));
