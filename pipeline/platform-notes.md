# 平台抽取要点

管理员在审核中总结出的各平台福利特点。采集抽取某个平台时，把该平台的要点附给模型；社区线索提到哪个平台，也附上对应要点。
格式：`## 平台 id`（与白名单一致），下面每行 `- ` 开头一条要点。新增或修改直接编辑本文件，下一轮采集生效。

## kiro
- 免费版每月 50 credits，永久有效、每月重置不结转；按官方加购价 $0.04/credit 折算约 $2/月。
- 要写明免费版可用的模型（价格页脚注：Claude Sonnet 4.5 及开源模型 Qwen3 Coder Next、DeepSeek 3.2、MiniMax M2.1），并注明需用社交账号或 AWS Builder ID 登录。
- “首次升级付费套餐送 $20”是充值赠送（topup），门槛 pay:首次升级付费套餐，不是注册即送。

## cloudflare
- Workers AI 免费额度是每天 10,000 Neurons，按官方单价 $0.011/千 Neurons 折算约 $0.11/天、$3.3/月；不要只写 Neurons。

## hf
- 不同身份的额度用途不同，必须写明：免费用户每月 $0.10（官方注明可能调整）只能用于 Inference Providers；PRO / Team / Enterprise 每月 $2 是通用算力额度，可用于 Inference Providers、Inference Endpoints、Spaces 升级硬件（含超出配额的 ZeroGPU）和 Jobs。
- 范围窄的写进标题（如“仅限 Inference Providers”）；免费和 PRO 分两条。

## replit
- Free Mode（GPT-5.6 Luna 不扣 credits）是 Core $20/月订阅附带的功能，按“付费套餐自带”不收录。
- 条款以 Replit 自己的博客和价格页为准，不要采信 OpenAI 等合作方新闻稿。

## opencode
- 分三条，各自列模型：① 应用内免费模型（“Free models provided by OpenCode”，不用绑卡）；② Zen API 免费模型（要登录并绑定信用卡，免费模型按 $0 计费，不扣钱）；③ OpenCode Go 订阅（$10/月，Go Plus $40/月）。
- Go 是以额度为卖点的超值订阅，收录为会员福利：按官方额度档位（每月 $60 / $30 / $15 / 限时不限量）列全模型，写明 5 小时 20%、每周 50% 的限速，价值记为范围 $10–60/月。
- 免费模型多数会收集使用数据；实测应用内免费模型常因限流报错。

## zhipu
- 免费模型要逐个列出并写明类型：文本 GLM-4.7-Flash、GLM-4.5-Flash、GLM-4-Flash-250414；视觉 GLM-4.6V-Flash、GLM-4.1V-Thinking-Flash、GLM-4V-Flash；图像生成 CogView-3-Flash；视频生成 CogVideoX-Flash。是常驻免费，不是限时。
- ZCode 的活动以 ZCode 公众号原文为准，媒体转述常把条件写错（如把“1 个月内回归的老用户”写成“1 个月内有效”）；有效期等细节可能只在公众号图片里。
- 重置卡按官方 Lite / Pro / Max 三档分别折算并列出（周积分 10,000 / 60,000 / 140,000，5 小时积分 2,000 / 12,000 / 28,000），下限用 Lite。

## deepseek
- 桌面端（DeepSeek Harness）赠金只在客户端里提示，官网和 API 文档没有文字公告；只能管理员实测。
- “首次登录桌面端送 6 元”新老用户都能领，类型是应用尝鲜（trial），不是注册新人礼。

## google
- Google AI Studio 免费版按主力模型 Gemini 3.8 Flash 的官方单价和 AI Studio 显示的速率上限（RPM / TPM / RPD）折算；上限未公开时留空，不要假设次数。
- 要列出免费版可用和不可用的模型（价格页每个模型都写了 Free Tier 是否可用）。
- Gemini CLI 的领取方式是下载应用并登录（app）；写明每天 1000 次、每分钟 60 次，按 Gemini 3 模型计。

## minimax
- MiniMax Code（编程客户端）和 M Plan / Token Plan 订阅的福利写在开放平台“订阅套餐产品升级公告”（platform.minimax.cn/docs/token-plan/announcements），常有限时活动：订阅用户不限量、首月折扣、老用户回馈积分、客户端签到双倍积分；每项分开记一条。
- 博客列表里的旧文章（如 MiniMax Agent，已改名 Mavis）不是现行福利，要看文章日期。
- 价格表里要分清模型类型：MiniMax-H3 / H3-Max 是视频生成模型，语音、音乐、图像各有模型。
- “视频生成-输入素材价格”里的“音频免费、参考图 N 张以内免费”是每次调用的计费规则，不是图像生成额度，也不是“首次”；生成的视频照常按秒收费。

## gmi
- 其他厂商宣传的“在 GMI Cloud 上免费用”的活动，平台归 GMI；要找 GMI 自己（官网、@gmi_cloud）的原文。

## tencent-hy
- 腾讯混元宣传自家模型在第三方平台（如 GMI Cloud）的免费试用，不算混元自己的福利，平台归第三方。

## siliconflow
- 实名认证礼（16 元代金券）和推荐官邀请奖励（每邀请 1 人 16 元）分成两条，不因同一平台合并。
- 以官网新闻页公告为准：代金券自获得之日起 180 天有效，活动至 2026-12-31，重复认证不再发放；活动中心页面需要登录。

## suno
- 免费套餐每天补到 50 credits，不累计，仅限个人非商业用途；按 Pro 套餐 $8/月含 2,500 credits 折算（约 $4.8/月）。
- 邀请奖励单独一条：好友注册并创作满 10 首歌后双方各得 250 credits，不能写成注册即送。

## liblibtv
- LiblibAI 与 LibTV 是同一平台。每日登录积分只在登录后的会员页显示，只能管理员实测；首页的年卡折扣是付费活动。

## kling
- 国内版（klingai.kuaishou.com）和国际版（klingai.com / kling.ai）规则不同，不要用国际站规则替代国内权益；国内版每月灵感值和体验包只在登录后可见。

## jimeng
- 国内版每日登录积分数量因账号而异（样本 20、66），当天 23:59 清零；免费计划不能用 Seedance 2.0 VIP。国际版是另一个平台 dreamina。

## dreamina
- CapCut 国际版即梦，和国内版即梦（jimeng）分开记录；活动常限定国家（中国大陆通常不在内）和付款方式。

## lovart
- 免费版每天重置为 70 积分（不是每天累加），同时写明“免费主流图像模型每天限 5 张”，不能只写较大的数字。

## aliyun
- 百炼新人额度是每个模型独立 100 万 Token（90 天、仅北京地域、只抵扣实时推理）；价值按官方价格页逐个模型的免费额度 × 输入价加总，核心模型为下限、全部模型为上限。

## vercel
- AI Gateway 免费版每月 $5，只能用官方 Free Tier 列表里的模型（约 200 个，Claude 仅 Claude 3 Haiku），有速率限制；一旦购买额度就转为付费版，不再发每月免费额度。

## poe
- 官网和帮助中心对爬虫不可读，每日积分只能管理员实测。

## adobe-firefly
- CC Pro 与 Firefly 付费个人套餐的月积分以官方 FAQ 的 monthly-generative-credits 表为准：CC Pro 4,000；Firefly Standard 2,000、Pro 4,000、Pro Plus 10,000、Premium 50,000（2026-10-01 核验）。不要混入 CC Standard、单应用、团队、企业和教育档，它们的额度与标准功能权限不同。
- 会员权益用 perk、claimMethod=member，新老订阅用户均可；门槛写完整套餐名和地区价格，不能截成 member:Creative 或保留 unknown。积分在账单日按月重置、不结转；多订阅积分叠加，重置日以最早订阅为准。
- 标准生成功能不限次不等于全部模型不限次：伙伴模型、Firefly Image 4 Ultra、Image 5 属高级功能，通常扣积分；Firefly Graph 内标准功能仍计费。Premium 的视频特权、指定模型首年促销单独核实，不能泛化到所有档位；功能级权益没有具体模型版本依据时不猜 models。
- 美元价值仅按同额度官方加购包替代成本比较有限积分：2,000/$9.99、7,000/$29.99、10,000/$49.99、50,000/$199.99 每月（https://www.adobe.com/ai/overview/generative-credits.html，2026-10-01）。不限次部分不编造生成次数或美元估值；合并多档条目写清价值范围与对应档位。
- 免费账号在限定模型上有“每日免费生成次数”，官方不写具体数量；不要估算张数，也不要把所有下拉模型都当免费。

## meituan
- 截至 2026-10-01，LongCat 现行模型是 LongCat-2.5-Preview，官网没有免费额度公告，现行文档只有按量付费和 Token 资源包。
- 更新日志里的旧内测额度（如 2026 年 3 月 LongCat-2.0-Preview 每天 500 万 Token）早已结束，不要输出；只有更新日志里新出现、写明当前模型和日期的免费活动才算。

## nous
- Nous Portal Free 免费层需要注册登录；管理员在 2026-10-01 确认开户流程需要绑定信用卡或支付方式，不能写成零门槛。通用 Terms 的免费试用条款不能替代 Free 层实际开户流程。
- 免费模型以 https://portal.nousresearch.com/ 当前模型目录中整体标价 $0 的版本为准；同名付费版本不能算免费，仅输入零价而输出收费也不算。2026-10-01 快照为 Ling 3.0 Flash Fin、Ling 3.0 Flash Sante (free)、LongCat 2.0、LongCat 2.5 Preview、Laguna S 2.1、Laguna XS 2.1、Space Bunny Alpha、Step 3.7 Flash、Solar Pro 4；名单会调整，后续以当轮官方目录为准。
- Free 的“$0 monthly credits”是不赠现金余额，不是模型价值为零；没有公布可用于折算的速率上限时 usdEstimate 留空，不编造每月重置。付费工具与 Hermes Cloud 托管不属于免费模型权益。
- 只有管理员明确确认亲自使用或领取，才能标记 tested；可由官方公开目录证实的权益用 site，并把仅由管理员确认的登录后门槛写入内部核验记录。
