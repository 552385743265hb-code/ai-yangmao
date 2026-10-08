# 平台抽取要点

管理员在审核中总结出的各平台福利特点。2026-10-07 已按后续决策消除旧口径冲突；带日期的模型/价格为当日快照，更新仍需读官方原文。通用收录规则优先：免费套餐名/付费档自带权益不因本文件列了价格而变成可收录羊毛。采集抽取某个平台时，把该平台的要点附给模型；社区线索提到哪个平台，也附上对应要点。
格式：`## 平台 id`（与白名单一致），下面每行 `- ` 开头一条要点。新增或修改直接编辑本文件，下一轮采集生效。

本次补充覆盖 73 个平台，完整待审字段核验及未解决事项见 [批量补字段记录](../docs/pending-field-review-2026-10-01.md)。有官方资料冲突时保留具体缺口，不把旧活动或订阅售价写成现行免费额度。

## kiro
- 免费版每月 50 credits，永久有效、每月重置不结转；按官方加购价 $0.04/credit 折算约 $2/月。
- 要写明免费版可用的模型（价格页脚注：Claude Sonnet 4.5 及开源模型 Qwen3 Coder Next、DeepSeek 3.2、MiniMax M2.1），并注明需用社交账号或 AWS Builder ID 登录。
- 学生认证后一年内每月给额度的，算常驻免费额度 standing（门槛 student，截止方式 standing，额度有效期写“学生认证后 12 个月，每月刷新”，美元按每月算）；若官方写法是“学生免费获得 Pro 一年”则算会员免费送 gift。（2026-10-01 管理员确认）
- “首次升级付费套餐送 $20”是充值赠送（topup），门槛 pay:首次升级付费套餐，不是注册即送。
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- td37原approved仅证据-only旧提案，官方首次付费升级20美元与绑卡条件未变；本轮保留已审核业务字段，只内部memo，不approve/reject/retest旧提案。
- 本批核验入口：https://kiro.dev/pricing/。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## cloudflare
- Workers AI 免费额度是每天 10,000 Neurons，按官方单价 $0.011/千 Neurons 折算约 $0.11/天、$3.3/月；不要只写 Neurons。

## hf
- 2026-10-07 官方定价表已写 Free Users 的 Monthly Credits 为 None；旧免费每月 $0.10 不能当当前承诺。PRO 每月 $2、Team / Enterprise 每席位每月 $2 是 Included Monthly Credits，官方明确为付费订阅内含通用算力额度，按 paid_bundle 不收；可用于 Inference Providers、Inference Endpoints、Spaces 升级硬件（含超出配额的 ZeroGPU）和 Jobs。来源：https://huggingface.co/docs/inference-providers/pricing
- 如有独立免费或额外赠送活动，再按领取资格、使用范围分条；不能把付费档内含额度包装成独立福利。

## replit
- Free Mode（GPT-5.6 Luna 不扣 credits）是 Core $20/月订阅附带的功能，按“付费套餐自带”不收录。
- 条款以 Replit 自己的博客和价格页为准，不要采信 OpenAI 等合作方新闻稿。

## opencode
- 独立免费渠道分两条，各自列模型：① 应用内免费模型（“Free models provided by OpenCode”，不用绑卡）；② Zen API 免费模型（要登录并绑定信用卡，免费模型按 $0 计费，不扣钱）。Go/Go Plus 是付费套餐，不构成第三条福利。
- Go / Go Plus 的套餐内含额度与不限量模型属于付费套餐自带，不收；只有独立限时额外加赠/重置活动才另核。2026-09-30 的“超值订阅”例外已撤销。
- 免费模型多数会收集使用数据；实测应用内免费模型常因限流报错。

## zhipu
- 免费模型要逐个列出并写明类型：文本 GLM-4.7-Flash、GLM-4.5-Flash、GLM-4-Flash-250414；视觉 GLM-4.6V-Flash、GLM-4.1V-Thinking-Flash、GLM-4V-Flash；图像生成 CogView-3-Flash；视频生成 CogVideoX-Flash。是常驻免费，不是限时。
- ZCode 的活动以 ZCode 公众号原文为准，媒体转述常把条件写错（如把“1 个月内回归的老用户”写成“1 个月内有效”）；有效期等细节可能只在公众号图片里。
- 重置卡按官方 Lite / Pro / Max 三档分别折算并列出（周积分 10,000 / 60,000 / 140,000，5 小时积分 2,000 / 12,000 / 28,000），下限用 Lite。

## deepseek
- 桌面端（DeepSeek Harness）赠金只在客户端里提示，官网和 API 文档没有文字公告；只能管理员实测。
- “首次登录桌面端送 6 元”新老用户都能领，类型是应用尝鲜（trial），不是注册新人礼。

## google
- Pixel 9a 送的是 Google One Basic 100 GB 3 个月，Pixel 9 送的是 Google One Premium 2 TB 6 个月，均为存储会员，按 not_ai 不收；不能与 Pixel Pro 系列的 Google AI Pro 试用混同。以官方帮助页各机型的完整 Offer 名称为准：https://support.google.com/gemini/answer/13529884 （2026-10-07）
- 学生和设备专享福利以 Google One / Gemini 帮助中心为准：美国大学生 AI Pro 12 个月（support.google.com/googleone/answer/17422238）、美国以外大学生 AI Plus 12 个月（2026-08-19 官方博客，2026-12-31 前领取）、Pixel 10 Pro 系列 12 个月 AI Pro（2025-08-20 至 2026-10-31 购买）、Pixel 11 Pro 系列 6 个月（2027-10-31 前领取），设备优惠表在 support.google.com/gemini/answer/13529884 。每年开学季会更新，届时复查。（2026-10-03）
- Google AI Studio 免费版按主力模型 Gemini 3.8 Flash 的官方单价和 AI Studio 显示的速率上限（RPM / TPM / RPD）折算；上限未公开时留空，不要假设次数。
- 要列出免费版可用和不可用的模型（价格页每个模型都写了 Free Tier 是否可用）。
- Gemini CLI 的领取方式是下载应用并登录（app）；写明每天 1000 次、每分钟 60 次，按 Gemini 3 模型计。

## minimax
- MiniMax Code 更新日志 https://agent.minimax.cn/docs/changelog 会写回馈积分的发放时间，建议作为信源。MiniMax Agent 2025-10 发布时的“免费到服务器撑不住”没有截止日，不收。（2026-10-03 批量审核）
- MiniMax Code 与 M Plan / Token Plan 的公告在开放平台升级公告页；只核独立额外赠额/重置。档位内含不限量与普通首月折扣不收；一篇公告同一优惠的多个模型合一条。
- 博客列表里的旧文章（如 MiniMax Agent，已改名 Mavis）不是现行福利，要看文章日期。
- 价格表里要分清模型类型：MiniMax-H3 / H3-Max 是视频生成模型，语音、音乐、图像各有模型。
- “视频生成-输入素材价格”里的“音频免费、参考图 N 张以内免费”是每次调用的计费规则，不是图像生成额度，也不是“首次”；生成的视频照常按秒收费。
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Lightning/Pro MiniMax Agent限时免费原文发布于2025-10-27的minimax-m2，而2026-04-27是Mavis升级公告；旧memo日期归因需纠正。
- 同篇的模型M2免费延长至11月6日不是Agent产品截止，不能跨权益套日期。已补历史开始，Agent截止仍未知，待管理员判断历史收录，未拒绝。
- 本批核验入口：https://www.minimax.cn/blog/minimax-m2。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## gmi
- 其他厂商宣传的“在 GMI Cloud 上免费用”的活动，平台归 GMI；要找 GMI 自己（官网、@gmi_cloud）的原文。

## tencent-hy
- 旧混元平台已停止新购，新人福利改看 TokenHub 新人免费体验包（cloud.tencent.com/document/product/1823/130053），可能漏抓；旧平台新人礼不再收。（2026-10-03 批量审核）
- 腾讯混元宣传自家模型在第三方平台（如 GMI Cloud）的免费试用，不算混元自己的福利，平台归第三方。
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 腾讯混元共享100万（8款）加embedding独立100万，按输入价共享池最廉价0.5元/百万+embedding0.7折$0.17，上限共享视觉3元/百万+embedding折$0.52；旧平台迁移TokenHub停止新购，须核当前领取或历史日期。
- 本批核验入口：https://cloud.tencent.com/document/product/1729/97731；https://cloud.tencent.com/document/product/1823/131382。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## siliconflow
- 实名认证礼（16 元代金券）和推荐官邀请奖励（每邀请 1 人 16 元）分成两条，不因同一平台合并。
- 以官网新闻页公告为准：代金券自获得之日起 180 天有效，活动至 2026-12-31，重复认证不再发放；活动中心页面需要登录。
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 国内站推荐官/认证专享礼公告发布2026-01-15，当日启动至2026-12-31；不能type/endKind standing吞掉真实截止。限时活动目前用free，资格仍在门槛和步骤里，最终分类让管理员决定。
- 认证新老账号/机构均可，手动领一次16元，重复认证不发；推荐人必须实名，手动成为推荐官，好友用专属链接注册并实名后双方各16元；180天有效，全平台API/批量/微调/Pro均可。
- 免费模型列表按国内价格中心零价版本而非国际站/Pro。2026-10-01共14款：Hunyuan-MT-7B、Xing4.0-29B、PaddleOCR-VL-1.5、4款bge、Kolors、XingChenGSR V1.0、XingChenASR V3.2-Ultra/ASR-Diarize-V3.0/ASR V3.2、Qwen3-ASR-1.7B、SenseVoiceSmall。无官方月上限不填估值。
- 本批核验入口：https://www.siliconflow.cn/pricing；https://www.siliconflow.cn/news/od7wj9rr23p95uhihmhrombp。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## suno
- 免费套餐每天补到 50 credits，不累计，仅限个人非商业用途；按最低费率 Premier 年付 $24/月含 10,000 credits 折算（约 $3.6/月），证据用帮助中心 9601601。
- 邀请奖励（好友创作满 10 首双方各 250 credits）只有 2024-06、2024-10 的旧推文，2026-10 产品里找不到入口，已按旧活动拒绝；除非官方重新公告，不再收录。
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Suno免费当前模型v6-mini，日50 UTC补充、非商业，下载另设限制；邀请250为旧活动，后续管理员已按历史失效拒绝；不能从旧截图沿用tested，只有管理员明确确认本人实测才可设置。
- 本批核验入口：https://suno.com/；https://suno.com/pricing；https://help.suno.com/en/articles/9601601；https://help.suno.com/en/articles/2418177。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## liblibtv
- LiblibAI 与 LibTV 是同一平台。每日登录积分只在登录后的会员页显示，只能管理员实测；首页的年卡折扣是付费活动。
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 原管理员截图20积分到账证据保留tested，网页读取429或登录才能见不等于撤回。跨日清零及具体免费可用模型仍未实测；未找到积分加购价时usd留null而不是0，免费models不加入Seedance等付费模型。
- 本批核验入口：https://www.liblib.art/?paywall=personal。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## kling
- 国内版（klingai.kuaishou.com）和国际版（klingai.com / kling.ai）规则不同，不要用国际站规则替代国内权益；国内版每月灵感值和体验包只在登录后可见。
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 本批保留原管理员已实测国内版128灵感值及到期样本，不新造tested证据、不改每月1日、不猜免费模型或美元。附加视频体验是否额外扣灵感值、同平台单价和免费模型需管理员登录确认；旧核验记录已保留并追加缺口。
- 本批核验入口：https://app.klingai.com/global/membership/membership-plans；https://klingai.kuaishou.com/。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## jimeng
- 国内版每日登录积分数量因账号而异（样本 20、66），当天 23:59 清零；免费计划不能用 Seedance 2.0 VIP。国际版是另一个平台 dreamina。
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 国内每日登录20/66仅管理员样本；保留现有tested记录，禁止从公开站未确认登录后数据就新增tested。免费计划不能用Seedance2.0 VIP是排除条件，不应将此型号放免费models。
- 双节年卡“最高加赠25条Seedance2.5 720P”横幅本轮没能再核实；没有分档保证量/片长/日期，不以首月0.28元/秒折算成总价值，也不把付费会员模型当免费models，保留待审及真实缺口。
- 本批核验入口：https://jimeng.jianying.com/ai-tool/home；https://jimeng.jianying.com/。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## dreamina
- CapCut 国际版即梦，和国内版即梦（jimeng）分开记录；活动常限定国家（中国大陆通常不在内）和付款方式。
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Dreamina免费120积分/日来自2026-09-10官方free credits FAQ；模型导航/介绍不是免费可用名单。9月Basic首月$1.50是用户支付价不是福利美元估值；官方90%OFF为按原价1折付，账号/国家/支付渠道限定，循环订阅续费必须写。
- 本批核验入口：https://dreamina.capcut.com/ai-video/free-image-to-video-generator-credits-faq；https://dreamina.capcut.com/resource/dreamina-september-offer-faq-2026。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## lovart
- 免费版每天重置为 70 积分（不是每天累加），同时写明“免费主流图像模型每天限 5 张”，不能只写较大的数字。
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Lovart公开SSR UI文案确认主流模型Nano Banana、Seedream、GPT-Image每天5张，但套餐页为动态骨架，70积分本轮未独立重新验证；不猜具体版本，不从订阅均价盲算免费额度。
- 本批核验入口：https://www.lovart.ai/pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## aliyun
- 百炼新人额度是每个模型独立 100 万 Token（90 天、仅北京地域、只抵扣实时推理）；价值按官方价格页逐个模型的免费额度 × 输入价加总，核心模型为下限、全部模型为上限。

## vercel
- AI Gateway 免费版每月 $5，只能用官方 Free Tier 列表里的模型（约 200 个，Claude 仅 Claude 3 Haiku），有速率限制；一旦购买额度就转为付费版，不再发每月免费额度。
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 本次官方定价重核每月$5、首次request激活、仅FreeTier模型子集、free不支持BYOK，买credits后取消每月免费。giac已经人工通过且有更新proposal，仅补核验memo，没有接受proposal或改已有正确字段。
- 本批核验入口：https://vercel.com/docs/ai-gateway/pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## poe
- 官网和帮助中心对爬虫不可读，每日积分只能管理员实测。
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Poe每日300积分只有第三方文本，本轮真正官方FAQs 403/Jina429。订阅帮助能读但不能证实每日积分数字；已补注册/登录核对步骤并删除未证300/日、24小时重置、不结转及daily标签，证据保持media；需要管理员登录实测，不造tested。
- 本批核验入口：https://help.poe.com/hc/en-us/articles/19944206309524；https://help.poe.com/hc/en-us/articles/19945140063636。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## adobe-firefly
- helpx.adobe.com 直接抓 403，走 Jina。首年指定模型无限量这类权益不按订阅价折美元。CC Pro / Firefly 各付费档每月积分和标准功能不限次是档位自带，不收。（2026-10-03 批量审核）
- CC Pro 与 Firefly 付费个人套餐的月积分以官方 FAQ 的 monthly-generative-credits 表为准：CC Pro 4,000；Firefly Standard 2,000、Pro 4,000、Pro Plus 10,000、Premium 50,000（2026-10-01 核验）。不要混入 CC Standard、单应用、团队、企业和教育档，它们的额度与标准功能权限不同。
- 仅独立于常规付费档的额外加赠/重置才用 perk、claimMethod=member，新老资格按活动原文；门槛写完整套餐名和地区价格，不能截成 member:Creative 或保留 unknown。积分在账单日按月重置、不结转；多订阅积分叠加，重置日以最早订阅为准。
- 标准生成功能不限次不等于全部模型不限次：伙伴模型、Firefly Image 4 Ultra、Image 5 属高级功能，通常扣积分；Firefly Graph 内标准功能仍计费。Premium 的视频特权、指定模型首年促销单独核实，不能泛化到所有档位；功能级权益没有具体模型版本依据时不猜 models。
- 美元价值仅按同额度官方加购包替代成本比较有限积分：2,000/$9.99、7,000/$29.99、10,000/$49.99、50,000/$199.99 每月（https://www.adobe.com/ai/overview/generative-credits.html，2026-10-01）。不限次部分不编造生成次数或美元估值；合并多档条目写清价值范围与对应档位。
- 免费账号在限定模型上有“每日免费生成次数”，官方不写具体数量；不要估算张数，也不要把所有下拉模型都当免费。
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 首年partner-model无限量以 https://helpx.adobe.com/firefly/web/get-started/learn-the-basics/current-firefly-promotions.html 为准，覆盖Firefly Pro/Pro Plus/Premium及指定credits个人订阅；Teams/Enterprise不包含。
- 首年从符合条件套餐开通日起连续12个月；升级扩模型但不延长原截止。仅firefly.adobe.com与Firefly移动应用，其他Adobe桌面产品不包含此首年partner无限量。
- 模型和分辨率逐档不同，Nano Banana2/Flux.2 Pro等Pro可用，更高档有Nano Banana Pro/Kling2.5 Turbo/Veo3.1 Fast等；不得把最高档的19模型整体写成Pro档。完整列表看官方打勾表。
- 2026-10-01官方报价Pro $19.99/mo；ProPlus与Premium有截至Oct21的首年30%价格优惠，不能把价格优惠截止当首年无限量权益的领取截止。
- fihl/izr2重复同一首年权益，仍留待审让管理员决定保留一个；两条均不能自动通过。
- 官方生成积分FAQ在Generative AI access for free users without a plan明确每日限定模型免费生成，免费次数、功能和模型会变化，未公布固定数量与具体完整名单。本轮免费daily条目证据改docs，不使用media/未经生成实测的tested，原付费ctu2是档位内含权益，后续收录规则不再保留这类条目；此处仅说明免费档证据，不执行数据库审核。
- 本批核验入口：https://helpx.adobe.com/firefly/web/get-started/learn-the-basics/current-firefly-promotions.html；https://www.adobe.com/products/firefly/plans.html；https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-faq.html。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## meituan
- 截至 2026-10-01，LongCat 现行模型是 LongCat-2.5-Preview，官网没有免费额度公告，现行文档只有按量付费和 Token 资源包。
- 更新日志里的旧内测额度（如 2026 年 3 月 LongCat-2.0-Preview 每天 500 万 Token）早已结束，不要输出；只有更新日志里新出现、写明当前模型和日期的免费活动才算。

## nous
- Nous Portal Free 免费层需要注册登录；管理员在 2026-10-01 确认开户流程需要绑定信用卡或支付方式，不能写成零门槛。通用 Terms 的免费试用条款不能替代 Free 层实际开户流程。
- 免费模型以 https://portal.nousresearch.com/ 当前模型目录中整体标价 $0 的版本为准；同名付费版本不能算免费，仅输入零价而输出收费也不算。2026-10-01 快照为 Ling 3.0 Flash Fin、Ling 3.0 Flash Sante (free)、LongCat 2.0、LongCat 2.5 Preview、Laguna S 2.1、Laguna XS 2.1、Space Bunny Alpha、Step 3.7 Flash、Solar Pro 4；名单会调整，后续以当轮官方目录为准。
- Free 的“$0 monthly credits”是不赠现金余额，不是模型价值为零；没有公布可用于折算的速率上限时 usdEstimate 留空，不编造每月重置。付费工具与 Hermes Cloud 托管不属于免费模型权益。
- 只有管理员明确确认亲自使用或领取，才能标记 tested；可由官方公开目录证实的权益用 site，并把仅由管理员确认的登录后门槛写入内部核验记录。
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 付费 Plus/Super/Ultra 的“$20 得 $22”等多送 10% 是价目表常设档位设计，和“充值多送”一样不收（paid_bundle）（2026-10-03 批量审核）。
- 分别可结转余额上限$10/$50/$100，不能全写每月清零；官网未说赠金独立消耗顺序/失效，不猜。200+付费模型与托管工具不作为免费模型清单。
- 本批核验入口：https://portal.nousresearch.com/manage-subscription。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## higgsfield
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 官方 blog 有本平台权益说明也有跨平台比较。后者出现的 Adobe/Luma/Kling/Runway/Vidu/Magnific/Hailuo/Midjourney 福利必须归实际发放方并核发放方原文；不能把 Higgsfield 对比文当它们官方证据。
- All Unlimited 是23模型短期窗口（11图像/7视频/5音频），与365天基础模型集不同。365天基础集在本次官方年付对比中是6个图像模型（Seedream 5.0 Lite、Flux.2 Pro 1K、Seedream 4.5、Nano Banana、Kling O1 Image、GPT Image），不能写成23模型全年不限量。
- 新用户All Unlimited免费试用24小时须绑卡；未在24小时内取消会自动扣费续订Plus（月费$49），附加7天短期窗口。Manage Account → Subscription 取消后试用持续至原到期时间。
- Unlimited只适用网页生成；MCP、CLI、Supercomputer、Canvas、Plugins等仍扣credits。需要打开Unlimited toggle；标准队列及并发/分辨率按档位。
- 11天Seedance权益由升级付费套餐或顶档Marketplace购买触发：前4天2.0，后7天选择另一个Seedance模型，Plus月付不含4K。与免费专页（所有计划可Seedance2.0 4K/10秒、绑卡验证、1并发、作品促销期间公开）分开。
- Starter无365天基础集；年付7天Nano Banana Pro/Nano Banana2/Kling3.0窗口属于Ultra，不属于Starter。
- 8/14公告免费试用实际为Seedance2.5 1080p共5次/每次至多20秒/24小时；不是任意模型的5次通用生成。8/22 MCP 3天/100专享credits试用到期未取消自动续订Plus。
- 官方ai-video-credits-explained给23credits=$1.15等对应关系，可得到$0.05/credit；Basic120=$6、Plus1000=$50、Ultra3000=$150。seedance-2-5-pricing-2026对比用套餐成本$49/1000credits=$0.049/credit，是套餐费率而非统一credit面值；两种口径需注明，不能把套餐含额度当免费赠送。
- 更新日志 https://higgsfield.ai/creator-hub/changelog 很长，每条都有锚点（如 #free-mode-in-supercomputer-text-generation-at-zero-credits），证据用锚点链接；页面 ld+json 里的 datePublished 是 +05:00 时间，换算成 UTC 作发布时间。Jina 常被 Higgsfield 封，直接 curl 页面 HTML 可读。（2026-10-03）
- 领取截止未公布，不把个人激活后1/3/7/11/365天权益有效期当整个活动领取截止。
- 新用户 1 天 All Unlimited 免费试用（2026-07-21 起）只收一条；7/22、7/27 博客写的是它的不同阶段，不要每篇博客建一条。Seedance 无限量促销一波接一波（7/14 邀请、8/2 11 天、8/6 33 天），按波次各一条，过期的作为历史。Ox Alpha（8/24 起 Supercomputer 免费）、Activity Rewards（7/10，限 Pro/Plus 以上做任务送）尚未收录。（2026-10-03）旧公告仍需账户页面核现行可领取性。
- 本批核验入口：https://higgsfield.ai/blog/higgsfield-all-unlimited-explained；https://higgsfield.ai/blog/seedance-4k-unlimited-11-days；https://higgsfield.ai/blog/annual-unlimited-ai-video-plans；https://higgsfield.ai/blog/ai-video-credits-explained；https://higgsfield.ai/blog/seedance-2-5-pricing-2026；https://higgsfield.ai/blog/best-unlimited-ai-video-generators；https://higgsfield.ai/creator-hub/changelog。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## luma
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 以官方New Luma Agents FAQ为准：Pro $30/mo含10000credits、Plus $90含40000、Ultra $300含150000；credits每账单周期重置。Higgsfield比较文出现的Pro/Plus顺序及年付$25等不能不核实沿用。
- 这是正常付费套餐，不是新增免费赠送。models不把所有付费可调用模型填成免费模型。
- 本批核验入口：https://lumalabs.ai/learning-hub/frequently-asked-questions-about-the-new-luma-agents-app。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## runway
- 更新日志里“free in Explore Mode”是付费档自带的 relaxed 无限生成，按 paid_bundle 不收；免费版一次性 125 积分可收。独立额外赠送活动另核，不把付费档自带权益当赠送。（2026-10-03 批量审核；2026-10-07 补明确范围）
- 2026-10-07 “Enterprises get 2 months of usage free. Sign by 10/31.” 的完整条款是额外返赠积分：合同生效后的前 60 天或截至 2026-12-31（取较早者），按该期间消耗的 Annual Included Credits 等额发一次性 bonus credits；上限为合同所购年度积分，失效规则随年度积分。这是独立加赠，不能按普通年付折扣拒绝，也不能写成无需签约的 2 个月免费会员。来源：https://runway.com/enterprise-bonus-terms
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 当前官方 https://runway.com/pricing 表：Standard625、Pro2250、Max9500credits/mo；月付$15/$35/$95，年付折合$12/$28/$76。Pro和Max都含Unlimited4Kvideo upscaling，非Max独享。只有Max支持未用credits滚动1个月。
- Max不是无限视频生成；旧Unlimited订阅只针对符合资格的既有用户，官方支持公告已延长至2026-11-30，新用户不可领取。
- Runway免费125一次性且永不过期，不能按常驻每月刷新；Explore两条官方发布日期2026-07-21，当前付费权限仍须核对。
- 本批核验入口：https://runway.com/pricing；https://runway.com/changelog。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## midjourney
- Standard / Pro / Mega 自带的 Relax 无限量是档位权益，不收。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Standard/Pro/Mega含Relax不限量图像；Relax不限量SD视频只有Pro/Mega。Standard$30/mo或年付折合$24/mo；Pro$60/Mega$120月付。所有方案会自动续订。
- 不把品牌名或付费计划可用全部模型伪填models；是否收录普通会员附带功能仍由管理员判断。
- 本批核验入口：https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## hailuo
- Max 档 Relax 模式无限量是档位自带；新人注册与调研奖励在官网和协议里都找不到，不收。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 官方 https://hailuoai.video/doc/payment-policy.html 本次读取Max $199.99/mo、20000credits及Hailuo01/02 Relax不限量视频；membership credits1个月有效不结转。官方条款未证实Higgsfield比较文$184年付、Hailuo2.3及年度第三方图像无限量，已移除未经确认的说法。
- 官网条款可能滞后于产品结算页，当前价格和新模型覆盖应到登录结算页再核。
- 国内hailuoai.com未登录官网没有新用户积分公告；不能拿国际版hailuoai.video每日积分套国内。待新账号核对金额/有效期/模型，不填tested或推测每日100等额度。
- 本批核验入口：https://hailuoai.video/doc/payment-policy.html；https://hailuoai.com/。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## magnific
- 年付档自带的年度积分和全年不限量模型是档位权益，不收。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- https://www.magnific.com/pricing 是原Freepik Creative Suite；导航明确 magnific.ai 是 legacy service。平台登记需区别新creative-suite站与旧upscaler站，纳入magnific.com官方域名才可用新站证据通过。
- 2026-10-01现价页按地域显示A$（AUD），不能把A$45当USD45。年付Premium+600Kcredits/年，ProStarter1.5M/4M；credits1年有效、无月重置。无限量模型按档位/分辨率与配置，NanoBananaPro需相应高配置，明确Zero-credit模型包括NanoBanana2、Kling2.5、Hailuo2.3Fast等。原Seedream5Pro promo当前页未标不限量，不保留为全年承诺。
- 本批核验入口：https://www.magnific.com/pricing；https://www.magnific.com/ai/docs/plans-and-pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## openrouter
- 免费层只收一条：以 docs/api/reference/limits 为准（:free 模型每分钟 20、每天 50 次；累计购买满 10 credits 后每天 1,000 次），openrouter/free 路由并入同一条。价格页的“25+ free models / 4 free providers”是营销数字，官方没列名单，实际提供免费端点的服务商（2026-10-03 查 API 有英伟达、Google AI Studio、Novita、Cohere 等约 10 家）和模型数经常变，都不写具体数字。（2026-10-03 管理员确认）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- openrouter/free官方路由随机选择当前免费模型且按请求能力筛选，接受text/images，输出text。模型池动态变化，不能固定宣称24个。
- 本次2026-10-01公开models API核到16个零价:free变体，名单已写入dbbe；未来用官方API复核而非固定博客数字。
- models API的零价prompt/completion可判定变体免费，但动态路由不同模型/上下文/限速不适合随意算整月美元上限。官方limits文档数字表本次渲染缺失，不编20/50/1000限制。
- 本批核验入口：https://openrouter.ai/openrouter/free；https://openrouter.ai/api/v1/models；https://openrouter.ai/docs/api_reference/limits。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## devin
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Windsurf 2026-03-19 从 credits 改 usage quota，旧模型积分折扣公告不代表当前仍有效；0.25x/0.75x/2x 不是免费，清空免费模型列表并标折扣。self serve 不能直接解释为付费用户。Windsurf当前pricing重定向Devin，Free模型名单未写，SWE-2 Free写在Pro档，不能赋给Free。
- 本批核验入口：https://devin.ai/blog/gpt-5-2；https://devin.ai/blog/windsurf-pricing-plans；https://devin.ai/blog/gpt-5-2-codex；https://devin.ai/blog/opus-46；https://devin.ai/blog/glm-5-minimax-m25；https://devin.ai/blog/sonnet-46；https://devin.ai/blog/gemini-31-pro；https://windsurf.com/pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## n8n
- 新 Cloud 账号（含试用）带的 Gateway 赠金和 14 天试用是同一个领取动作，合成一条；Gateway 上线时发给付费用户的一次性赠金按 2026-09-17 作历史；自托管 Business 试用没有 AI 额度，不收。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- n8n Gateway credits只付工作流支持节点，和Assistant credits/旧OpenAI免费赠金分账。具体金额、免费有效期未公开。Business现行只可自托管，不是Cloud；自托管Assistant为BYOK。新Cloud试用14天、800Assistant+100AI，无卡；Gateway余额另计。
- 本批核验入口：https://blog.n8n.io/gateway-credits/；https://docs.n8n.io/deploy/use-n8n-cloud/gateway-credits/；https://n8n.io/pricing/；https://docs.n8n.io/manage-cloud/cloud-free-trial/。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## cursor
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Cursor Rollouts专页2026-09-23，原待审9月10日错误。10天窗口终止日期按发布日+10推算，确切时刻未公开。只能供Rollouts，大约50/500次变更，不是通用模型额度。
- 本批核验入口：https://cursor.com/pricing；https://cursor.com/changelog/rollouts-and-security-reviewer。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## nvidia
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- NVIDIA Build官方多数模型40RPM，但缺TPM/单次Token上限，不造美元；只把目录明确Free Endpoint的模型当免费，下载标签不够。完整目录用SSR筛选URL https://build.nvidia.com/models?filters=nimType%3Anim_type_preview 和 &page=2：24+15=39，resourceId去重后39，逐项PREVIEW=true（官方JS PREVIEW=Free Endpoint），已全部补models。注意page=1为零索引页0，page=2为索引页1。
- 本批核验入口：https://build.nvidia.com/explore/discover；https://build.nvidia.com/models?filters=nimType%3Anim_type_preview；https://build.nvidia.com/models?filters=nimType%3Anim_type_preview&page=2。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## niteshift
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Niteshift $10/月买活跃agent运行时间，不买模型Token；0.1credits/min对应100min；模型自带API key或订阅，不是零门槛模型免费。
- 本批核验入口：https://niteshift.dev/pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## pika
- 现行免费版每月 0 积分、只能购买积分包（packs only），没有免费生成额度，不收录；价格页 Free 档列的“All models / 并行数 / 无水印”是买积分包后的能力。（2026-10-03 管理员实测无法生成）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Pika旧FAQ Basic150/月与现行pricing Free0/月冲突；保留历史条目、标主站不适用，不把当前0替换成虚假零权益，也不伪造活动结束日。旧站/iOS需管理员核实。
- 本批核验入口：https://pika.art/faq；https://pika.art/pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## windsurf
- windsurf.com 现在 308 跳到 devin.ai（Windsurf 已更名 Devin Desktop），windsurf.com/pricing 和 devin.ai/pricing 是同一个 Free 档，只收一条（暂挂 windsurf）。新模型上线的积分倍率促销都早于 2026-03-19 积分制，官方没写结束日的按 2026-03-18 作历史；只有 opus-46-fast 原文写了截止 Feb 16。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 同devin：旧credits促销与2026-03-19后usage quota不可混用；self serve不直接解释为付费；旧促销须核结束日期，不零价的模型不可填免费models。
- 2026-03-18公告、3-19针对当时付费订阅用户一次性多赠一周，维持其原grandfathered价格；不能作为10月现行可领或每天重复。赠送时长一周不等于明确领取截止，不随意造3-26作为claimEnd；旧套餐不同价格，不能统一用新$20套餐估值$5。待管理员补历史截止。https://devin.ai/blog/windsurf-pricing-plans
- 本批核验入口：https://devin.ai/blog/windsurf-pricing-plans。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## aws
- 证据用各服务英文价格页的 Free Tier 段（如 aws.amazon.com/transcribe/pricing/），不要用中文汇总页 /cn/free/ai/（“付费计划”是链接，摘录必跨链接）。单价从 b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/<服务>/USD/current/<服务>.json 读。Comprehend 新老客户都能用；Q Developer Java 转换超额 $0.003/行；Translate Active Custom 前 2 个月每月 50 万字符免费；HealthLake 存储内含额度是付费自带。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 新版 Free Tier 新账号立即 $100，任务另送最多 $100，usdEstimate=100、usdMax=200；不是注册必得 $200。Free plan 最多6个月/余额先耗尽关闭；抵扣金最长开户12个月，续用需 Paid plan。通用抵扣金不是所有模型免费。
- AWS AI 汇总页的 Transcribe、Translate、Textract、Comprehend、Kendra、Personalize、DevOps Guru 明写 Paid plan 试用，门槛必须含支付方式与 Paid plan/超额收费。试用从首次用服务开始，是相对额度有效期，不能把注册日或发现日当活动统一起止。
- Amazon Q Developer 独立价格页比旧 AI 汇总表更新：Free 每月50次 agentic requests（聊天/编程）、1000行 Java转换；官方只说最新Claude模型，不猜精确版本。不能用Pro月费假装免费请求余额。
- Personalize分配方：旧配方100训练小时+18万推荐/月；v2为每配方500万训练交互+5万实时推荐/月。所有配方20GB/月、2个月试用；严禁把不同配方训练单位混加。20GB按$0.05/GB仅作保守存储部分估值。
- DevOps Guru A/B每月各7200资源小时+1万API，3个月；$0.0028和$0.0042/小时、$0.00004/调用折合$50.80/月。底层AWS资源照常收费。
- Kendra仅Basic Developer/GenAI Enterprise基础索引首次30天750小时免费，连接器不免费；$1.125/$0.32每小时，价值$240–843.75，不是所有版本或容量都免费。
- Textract每月1000页仅DetectDocumentText口径，3个月，按俄勒冈$0.0015/页=$4.50总试用价值；其他API免费配额另查。Translate普通文本/批文档每月200万字符12个月，$15/百万=$360总价值，实时文档及Active Custom不是免费。
- HealthLake汇总页“永久免费”与独立价格页冲突：datastore仍$0.27/小时，10GB+3500查询/小时是付费datastore内含额度。不可standing零门槛，应保留付费门槛且建议按paid_bundle由管理员决定不收录，不自动拒绝。
- 本批核验入口：https://aws.amazon.com/cn/free/ai/；https://aws.amazon.com/q/developer/pricing/；https://aws.amazon.com/free/free-tier-faqs/；https://aws.amazon.com/free/registration-faqs/；https://aws.amazon.com/devops-guru/pricing/；https://aws.amazon.com/personalize/pricing/；https://aws.amazon.com/kendra/pricing/；https://aws.amazon.com/comprehend/pricing/。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## genspark
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Free每天100积分有账号终身总上限（数字不公开），达到上限即停每日补充，剩余余额仍可使用。不得写永久每天送、每日余额一定清零或猜终身总数。
- Plus每月10000积分起、Pro125000起；Standard模式周免费额度Pro为Plus10倍，从首次消息开始7天窗口。核心模型限额内免积分，超限自动扣月积分；旗舰模型和视频/音频生成付费。不能“无限制（达到上限）”自相矛盾。
- 2026-09-18之前且持续订阅的会员原AI Chat/AI Image无限体验仅至2026-12-31，2027起按当时新规则；帮助页整体权益有效至2027-06-30。型号示例Sonnet/GPT Image不是完整精确版本名单。
- 没读到实时订阅价/官方单积分加购价时，不猜Plus $10或Pro $100额度等价。
- 本批核验入口：https://www.genspark.ai/helpcenter/membership-plans；https://www.genspark.ai/helpcenter/credits-guide。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## vidu
- 2026-10-08 管理员明确亲测新人注册获 20 积分，授权更新 ds4t；证据用 tested，截图保存于 [Free 套餐实测截图](../docs/evidence/vidu-2026-10-08/free-plan-admin-tested.png)。20 积分是一次性注册礼，不能写成每月 20 积分，也不能把亲测数量补进官方英文摘录冒充官网原文。
- 本次官网价格页与截图均确认 Free 为 $0/月，Q4 的 540P 使用费率为 4 credits/sec；20 积分按此费率只可算成 5 秒用量，实际可选视频时长以界面为准。截图只确认 Q4，不把产品导航中的 Q3 自动写入本条免费模型名单；这不是断言 Q3 不可用。
- “10 references/month” 在官网比较表归 Content Management → Number of My References，是每月 10 个参考素材管理配额，不是每月 10 条免费视频，不能与注册送积分相加或冒估美元价值。
- 2026-10-08 套餐卡年付 Standard $99/年、800/月；Premium $425/年、3,500/月；Ultimate $2,300/年、限时 20,000/月。同页比较表仍写 Ultimate 8,000/月，采用促销卡 20,000 得到最低单位费率 $2,300/(12×20,000)，20 积分约 $0.19，仅作积分单位单价比价，不表示 Free 用户能购买该档，也不是自由换现或视频实际支付价格。Free Q4 每秒 4 积分、付费档每秒 2 积分，不把相同积分数等同相同生成量。
- 官网 FAQ 注册礼原文只有“New users receive trial credits upon registering for Vidu.”，每日登录也确有积分奖励，但数量未公开；登录礼不是仅付费会员，rqbg 另按常驻 + daily 核实，本次不改。没有额外“1 free trial”的已核证据。
- 注册 trial 积分的到期时间仍须账户积分明细，不能套用订阅积分 30 天或 Purchased/Bonus Credits 两年。未公布注册礼的活动起止，不把管理员亲测日期或页面更新日期当领取开始。
- Ultimate 的 Off-Peak 每天 200 条和付费档内含功能是套餐自带，不作为额外赠送。此前 Ultimate $79 等价格已是旧快照，不能沿用为当前售价。
- 核验入口：https://www.vidu.com/pricing；本次完整记录见 [Vidu 注册礼核验](../docs/evidence/vidu-2026-10-08/verification.md)。

## worldlabs
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Marble产品端Free7000 credits、最多4个世界，含文字/图像/多图/360输入。视频输入、商业许可、下载导出在付费档；不要把支持输入当生成视频模态。
- 网页产品积分与API积分独立；加购仅Standard以上，$5/5000、$20/22000、$50/63000。可按最低加购包$0.001/credit比价免费额度=$7，但不是现金，不宣称免费账号能购买或使用API。
- $0/month与7000 credits尚不能单独证明每月重新发放；免费账号周期与模型版本需登录确认，保留明确缺口。
- 本批核验入口：https://marble.worldlabs.ai/pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## tencent
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- “云产品免费馆”包含非AI云服务器、DNS、建站等，不混入AI福利价值；本条缩到智能体开发平台体验版1个月。
- “产品新用户”不等于整个腾讯云账号新注册，老账号未购/未试该产品仍可申请；实名认证、每日限量要写清。未公开Token与模型清单不猜$5。
- 本批核验入口：https://cloud.tencent.com/act/pro/free。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## moark
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Gitee登录后每日100次合计调用，官方getting-started明确DeepSeek-R1示例；其他免费模型完整目录未核实不能泛化“所有模型免费”。
- 按次额度无单次Token上限，不能用Token输入单价随意折成$1；美元留空。模态和API/在线体验以实际模型页资格为准。
- 本批核验入口：https://ai.gitee.com/docs/getting-started。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## trae
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 2026-02-13官方公告，2/24 02:00UTC新方案生效：新用户注册48小时内添加支付方式，14天Pro试用；结束自动订阅，可移除支付方式切Free。卡门槛和自动续费必须写。
- $3是Lite月费不是Pro试用价值。试用额度未独立公布时不估美元。周年活动2/14截止不能套到14天试用；今日仍开放需注册页复核。
- 本批核验入口：https://www.trae.ai/blog；https://www.trae.ai/blog/trae_membership_0213。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## baidu
- 千帆 ERNIE-Speed/Lite/Tiny 免费预置服务已随模型退役于 2026-06-09 结束（退役机制页 cloud.baidu.com/doc/qianfan/s/zmh4stou3），只作历史。BCC、直播云、点播等通用云产品不是 AI 额度；试用体验馆、企业满减券、量包折扣都不收。可能漏抓：千帆新用户每款模型 100 万 Token（17 款，3 个月）https://cloud.baidu.com/doc/qianfan/s/Imi2rpirg 。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 千帆2024-05-21公告属于长期免费预置服务（standing），不是限时免费；实名认证个人或企业按量调用适用。名单：ERNIE-Speed-8K、ERNIE-Speed-128K、ERNIE-Speed-AppBuilder专用版、ERNIE-Lite-8K、ERNIE-Lite-8K-0922、ERNIE-Lite-128K、ERNIE-Tiny；其中Lite-128K在公告时标即将上线，当前控制台可开通情况必须核实。TPM/RPM仅控制台可见，不造美元。https://cloud.baidu.com/news/notice_c7a145b9-5c99-4870-939f-e09ba506aab3
- 免费试用馆是产品新用户一次性试用：需个人/企业实名认证；以前试用或购买该产品、同人账号参加过均不能重复。账号新老不能替代“产品首次试用”资格；不得归为月度standing。https://cloud.baidu.com/campaign/event/free/index.html
- 企业券包系满减云产品券、不是AI免费额度；企业专享200满1000/1000满5000/2000满10000/6000满30000，券包有效至2026-10-20。不能用券面值充当无门槛AI赠金。https://cloud.baidu.com/campaign/event/enterprise/index.html
- cloud.baidu.com/news 页面可能跳404但仍有全站导航，采集容易误把云服务、折扣和广告当千帆权益；BCC“500次”及人脸“2000次”等首页原抽取数字本轮未复现，原值保留待审并memo缺口，不能认为核验成功。
- 本批核验入口：https://cloud.baidu.com/campaign/event/enterprise/index.html；https://cloud.baidu.com/；https://cloud.baidu.com/campaign/event/free/index.html；https://cloud.baidu.com/news/notice_c7a145b9-5c99-4870-939f-e09ba506aab3。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## volc
- Managed Agents 没有只限企业的说法，门槛 realname。web_fetch 只写“限时免费”无原价、额度、起止，不收。联网搜索每月固定次数不打 reset 标签。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 新注册赠免费在线推理属于new；注册即可得。仅抵扣按Token后付费在线推理，不抵扣插件、知识库、批量推理和缓存存储。各模型独立额度、主账号及基础/精调模型共享。公开文档没给逐模型数量/有效期，必须控制台补，不凭旧模型表造数。https://www.volcengine.com/docs/ark/free-inference-quota?lang=zh
- 联网内容插件仅“联网资源”每月2万次免费；超额4元/千次，按80元/7.1=11.27美元/月；不扩展到头条、抖音、天气和模型Token。https://www.volcengine.com/docs/82379/1544106
- Managed Agents首次开通一次赠30小时运行时+500次web_search，2年有效；不是只限新注册账号，应trial/all。价值按同平台0.5元/小时+0.02元/次算25元=3.52美元。模型Token不在赠送项目内；企业准入仍需开通指引确认。
- web_fetch只免工具调用费，运行时和模型仍计费；起止/原价未公开，不造美元或日期。
- 本批核验入口：https://www.volcengine.com/docs/ark/free-inference-quota?lang=zh；https://www.volcengine.com/docs/82379/1544106。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## qiniu
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- AI企业订阅2999/4999/9999元（月付），对应官方原价4284/8332/19998元；积分约10.7/20.8/50亿每月、24717/48067/115373万每周。每周刷新且不结转，积分按模型不同倍率扣减，不等于Token；不能直接用0.004元/K Tokens乘积分估值。2026-10-01 曾按超值订阅例外估值，该口径现已撤销；套餐本身按 paid_bundle 不收，不能把实付价与原价的区间记为赠送价值。付费套餐包含模型不能填免费models。https://www.qiniu.com/ai/plan
- Jina页HTTP Published Time出现2012年，是网站/响应时间元数据，不能当AI套餐官方发布日期。
- 本批核验入口：https://www.qiniu.com/ai/plan。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## huaweicloud
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 码道福利不是仅GLM：当前四款专属福利模型deepseek-v4.1-flash、glm-5.3-flash、deepseek-v4-flash-0731、deepseek-v4-pro-0813，共享每位用户每日1000万Token（不逐模型乘4）；所有用户登录自动领，24:00 UTC+8清零，与积分包不互通。IDE/插件2026-08-19 22:00、桌面/网页9-15、小程序9-17开始；截止另行通知。同平台输入价缺口时不能拿火山/智谱价格替代。https://support.huaweicloud.com/offers-codeartsagent/codeartsagent_offers_0001.html
- OfficeAce官网首次注册登录赠4000积分，与个人体验版基础500（一次发放、不失效）是不同来源；不把两者混称、直接相加或把500永不过期套到活动4000。积分用于推理、解析、工具；4000是否含500及注册奖励有效期需领取界面。没有加购单价时按最低套餐费率折算：个人标准版 ¥98 含 2,000 积分 ≈ ¥0.049/积分，并在额度里写明（2026-10-03 批量审核）。https://www.huaweicloud.com/product/officeace.html https://support.huaweicloud.com/price-officeace/officeace_05_0003.html
- 本批核验入口：https://support.huaweicloud.com/offers-codeartsagent/codeartsagent_offers_0001.html；https://www.huaweicloud.com/product/officeace.html；https://support.huaweicloud.com/price-officeace/officeace_05_0003.html。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## seaart
- 活力值美元按 Beginner 年付 $4.79 含 9,000 活力值的最低费率折算。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 免费130 Stamina每日有效不结转；FAQ“约21张”是常见6点模型示例，不能写按Z Image Turbo20点/张也21张（130/20仅6整张）。付费SVIP Free Creation不限量不属于免费账号福利。页面同一FAQ还出现“daily login 0 Stamina”冲突，应保留130多处证据并请求免费账号核实，不装作实测。原美元0.39无加购价依据已清空；正式可用免费模型完整名单需登录确认。https://www.seaart.ai/mall
- 本批核验入口：https://www.seaart.ai/mall。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## deepinfra
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- DeepSeek-V4-Flash-Vision-Exp 51% off是按量付费折扣，不是free。当前输入$0.2156/M、缓存输入$0.0069/M、输出$0.6468/M；没有额外赠送额度，建议paid_bundle拒绝但不自动拒绝。https://deepinfra.com/pricing
- 本批核验入口：https://deepinfra.com/pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## baichuan
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 海纳百川计划针对“为医务工作者提供服务的机构”，需准入审核，不是所有注册账号。官方称永久免费Baichuan-M3 Plus API，但未公开额度/速率；价格页医疗搜索独立收费，免费计划是否包含须准入协议，不能把模型免费扩展到全部搜索收费。https://www.baichuan-ai.com/?new_locale=zh-cn https://platform.baichuan-ai.com/prices
- 本批核验入口：https://www.baichuan-ai.com/?new_locale=zh-cn；https://platform.baichuan-ai.com/prices。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## stepfun
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Step Plan 当前官方档位 Flash Mini/Plus/Pro/Max 为 400M/1600M/8000M/40000M Credit，月费¥49/99/199/699。M=百万，1M Credit=¥1，人民币按7.1折美元。Flash Mini 400M不是$5.63，而是$56.34/月。
- 月池月末清零不结转、加油包独立30天；Step Plan专属Base URL与普通API余额相互独立，不应混用。
- Studio 额外40%专属创作池单独记录，勿与API套餐原额重复累计。付费套餐包含模型不放免费模型名单。
- yrlr 与 6mvu 当前均为 Flash Mini 400M，建议管理员合并重复条目；本批未拒绝/删除。
- 本批核验入口：https://platform.stepfun.com/docs/zh/step-plan/overview。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## lovable
- 每日聊天额度和这套聊天计价官方写明暂行到 2026-10-31，11 月复核。Monthly Cloud grant 只抵扣数据库、存储、网络等托管用量，不是 AI 额度，不收。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 现行 credits-and-usage 文档：Free 每日5 build credits但每月最多30；Pro/Business每日5无该月上限。每日00:00 UTC刷新当日失效。
- 现行文档的每月AI赠额4 credits、Cloud赠额20 credits覆盖Free/Pro/Business，Cloud只抵扣托管资源，不是AI模型调用。Free每月1日00:00 UTC刷新、月底失效；付费按账单周期，不结转，赠额为暂行政策。
- 公布Pro加购$15/50 credits=$0.30/credit，保守美元折算依据；Cloud仅托管是否收录交管理员，不自动拒绝。
- 网页邀请奖励：新好友通过链接注册获10 bonus credits；首次付费Pro/Business后邀请工作区获100；邀请人仅靠注册无奖励。有效12个月，Enterprise和移动App不支持，网页手机浏览器可操作；禁止临时或含+邮箱，每工作区注册总数上限100。
- 免费聊天额度每天刷新，但官方未公开次数，不编造消息数或价值；用尽后会扣build/general credits，不是无限聊天。
- 本批核验入口：https://docs.lovable.dev/introduction/credits-and-usage；https://docs.lovable.dev/introduction/dashboard-overview。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## otter
- 受邀人获得的 1 个月 Pro Lite、每月 300 分钟与 Basic 基础额度相同，不能仅据此认定有额外价值；学生八折仍不收。邀请人奖励须另读条款，不能用受邀人的 300 分钟否定所有邀请奖励。（2026-10-07 修正邀请人/受邀人边界）
- 2026-10-07 referral-terms 仍明确邀请人可获转写分钟或 Pro Lite，累计上限 10,000 分钟及 12 个月；每次实际奖励由邀请页面/材料决定，不能把累计上限当每次保证额度。Business 不适用，付费邀请须完成首个账单周期，奖励自兑换起 12 个月到期。5sj1 保留待审，需当前邀请页面确认单次奖励后再决定，不因旧 Pro Lite 名称直接拒绝。来源：https://otter.ai/referral-terms
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Basic免费每月300分钟、单次30分钟、文件导入账号累计3次、最近25条历史；Pro的1200分钟/10次月导入/高级模板不得混入Basic。
- 学生教师常规20%优惠需.edu邮箱，Pro月付$13.59/年付$79.99，不是免费赠额；折扣美元应记录节省而非套餐售价。2026-08-26另有50%返校促销，不混常规条目。
- Otter Pro Lite邀请新用户奖励为1个月、300分钟；条款自2019-03-21生效。没有独立Pro Lite单价，不能用Pro价强行折算。
- 本批核验入口：https://otter.ai/referral-terms；https://otter.ai/pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## mistral
- 只收免费计划每月 $10 API credits（价格页），Le Chat / Vibe 免费版的有限聊天、搜索、生图不收。Studio 文档原文“Free mode: API access is enabled by default with no credit card required”，门槛 none。学生 Pro 折扣不收。（2026-10-03 管理员确认）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 教育优惠$5.99/月（原$14.99），须认证高等教育学生且此前未用Vibe/Le Chat，最多12个月、未含税；折扣美元为节省$9而非费用$5.99。
- Free计划现行价格页含$10/月API credits。官方Free mode开通API无需信用卡，并以mistral-small-latest示例验证；其它免费模型需核对Studio权限，不能把整个模型目录当免费。
- 本批核验入口：https://mistral.ai/pricing/；https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## moonshot
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 官方免费测试帮助页确认国内手机号新用户实名认证获15元代金券，3个月到期，不能体验Kimi K3；未明确逐个可抵扣模型不能从导航菜单推定。
- 本批核验入口：https://www.kimi.com/help/kimi-api/api-free-trial。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## novita
- 价格页零价模型名单会变（2026-10-03 有三款，多了 Apodex 1.1 Mini），每次逐行重查；零余额能否调用零价模型官方没写，需管理员实测定门槛。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 当前价格页只有Ling 3.1 Flash与Ling 3.0 Flash Sante输入输出都Free，256K上下文；Fin/Flash/VL收费。零价价格无公开截止，不造活动日期/月上限。
- 未从模型价格页确认开户绑卡/充值要求，requirements保留unknown，需管理员核对后再通过。
- 本批核验入口：https://novita.ai/pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## fireworks
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 2026-10-03 价格页已撤下 $1 免费 credits，改为先绑卡购买，不再收；之前写法：官方定价原始HTML有$1免费Serverless credits（web抽取可能漏段）；Standard/Priority/Fast按Token服务。开户是否绑卡和到期条件未找到，门槛保留unknown。
- 本批核验入口：https://fireworks.ai/pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## pollo
- 价格页 Free 列 20 credits；美元按 Pro 年付 $14.50 / 800 credits ≈ $0.018/credit 折算。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 官方德语Hub指南2026-06-10明确新注册20 credits，非每月赠20；同时警告账号/地区/活动可变。具体可抵扣模型和现行新号到账仍需登录核对，不把全部目录当免费。
- 首页对GPT Image 2.5/MiniMax H3一面称any paid plan，一面Unlimited with Ultra，What's New又有Ultra10天；应查现行套餐限制，不泛化所有会员永远不限量，Seedance 2.5的60%折扣与免费不同。
- 本批核验入口：https://pollo.ai/home；https://pollo.ai/whats-new；https://pollo.ai/pricing；https://pollo.ai/de/hub/how-to-get-pollo-ai-free-credits。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## tripo
- 2026-10-07 官方价格页“年付 50% off 月付”是普通年付定价，按 other 不收；不是身份认证专享五折例外，也没有独立赠送。免费版每月 200 积分是另一项真实可量化额度，仍可收。来源：https://www.tripo3d.ai/zh/pricing
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Studio 与 API 为独立计费体系，Studio 月度订阅积分不结转，API 购买积分长期有效；不可用 API 的永不过期规则替代 Studio 充值有效期。来源：https://www.tripo3d.ai/help/api-plugins/tripo-studiotripo-api
- 充值赠送只估额外积分，不包括付款换得的本金积分，也不能把 credits 当模型个数。Studio 同页 $10/1,000 credits：$100+2,000 赠积分约 $20；$500+12,000 赠积分约 $120；$1,000+30,000 赠积分约 $300；中文版 ¥700+2,000 赠积分按 ¥70/1,000、7.1 汇率为 $19.72。来源：https://www.tripo3d.ai/pricing 、https://www.tripo3d.ai/zh/pricing
- 中文 ¥700 与英文 $100 为同档不同币种，疑似重复收录需管理员决定；未自行合并或删除。
- 免费 Studio 每月 200 credits、约 13 个3D模型，按加购价估 $2/月；公开模型且非商用。免费图像栏 Nano Banana；H2.5 only 是导出限制，不推断全部免费模型名单。
- New User 50% Off First Month coupon 与 Annually 50% off Monthly 是不同优惠，不能混用证据；首月优惠无公开起止日期。
- 本批核验入口：https://www.tripo3d.ai/pricing；https://www.tripo3d.ai/zh/pricing；https://www.tripo3d.ai/help/api-plugins/tripo-studiotripo-api。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## xiaomi-mimo
- 2026-10-07 年付 12% 与个人首购 12% 都是普通订阅折扣，无独立赠额，不收；Lite 首购实付 $5.28，超过首月不超过 $1 的近免费例外。Claw 免费时长及模型限免另核，不受折扣条目拒绝影响。来源：https://platform.xiaomimimo.com/
- Claw 免费时长以更新日志 mimo.mi.com/docs/zh-CN/updates/feature/claw 为准（每天 3 小时、单次有算力上限）。MiMo-V2.5-ASR 现按 $0.074/小时收费，旧“免费”线索不收。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Token Plan 首次个人月付购买优惠12%，每账号一次，适用于符合首购条件的新老账号；团队和年付不适用，不能叠加年付优惠。Lite/Standard/Pro/Max 正价$6/$16/$50/$100，首购减免$0.72/$1.92/$6/$12。付费套餐模型不放 models。来源：https://platform.xiaomimimo.com/
- 邀请页写好友10%折扣、首付返10%、最多返20%，Max/Standard年付会员返利倍率翻倍；未公布返还币种、基数、上限/有效期时不得编美元或永久有效。
- 2026-10-01 当前ASR为 MiMo-V2.5-ASR 每音频小时$0.074；限时免费是另一个 MiMo-V2.5-TTS Series，不能将旧ASR免费线索直接改模型冒充同一活动。原ASR免费历史日期待查，不凭当前收费写撤回时刻。来源：https://mimo.mi.com/
- Claw 官网明确 mimo-v2.6-pro、3h free daily；3小时不等于无限Token，未有调用上限时不得编月美元。Claw云端Agent与新Desktop产品入口需区分，原管理员体验记录保留但不擅增tested。
- 本批核验入口：https://platform.xiaomimimo.com/；https://mimo.mi.com/。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## manus
- 推荐奖励官方只提一句 referral bonuses，没写金额，不收（500 积分只见于第三方）。帮助文章的编辑日期不是活动发布时间，publishedAt 留空。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 免费用户Chat Mode及Agent Mode的Manus 2.0 Lite，每日刷新300积分、1并发、2定时任务；daily标签，每月按30天9,000积分。Pro官方$20/月含4,000积分比例估值$45/月，原$1.5仅一天价值不可作standing月价值。来源：https://help.manus.im/en/articles/11711111-what-is-the-current-membership-pricing-for-manus
- 注册一次赠1,000积分约$5（上述同平台套餐比例）；免费积分不失效，与每日积分分开。来源：https://help.manus.im/en/articles/11813668-are-there-any-discounts-or-special-offers 、https://manus.im/help/credits
- 推荐福利官方仅提referral bonuses，未写奖励数量/触发条件，不用第三方500积分当证据，不打开别人的邀请链接替管理员注册。邀奖用referral标签，未知门槛保留unknown供管理员补账号内截图。
- 帮助文章日期不是活动开始日期；套餐比例估值含其他功能不是独立积分加购单价，须在memo注明。
- 本批核验入口：https://help.manus.im/en/articles/11813668-are-there-any-discounts-or-special-offers；https://help.manus.im/en/articles/11711111-what-is-the-current-membership-pricing-for-manus；https://manus.im/help/credits。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## ppio
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 官方FAQ仅公布新用户代金券、邀请注册并完成任务代金券的种类及触发行为；未给统一金额、有效期和模型范围时以控制台券详情为准，不编金额、名单、永久有效。邀奖用referral标签，具体任务仍待账号内规则。来源：https://ppio.com/docs/model/FAQs
- FAQ模型调用范例（DeepSeek/Qwen等）不能当优惠券可免费模型清单。
- 本批核验入口：https://ppio.com/docs/model/FAQs。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## xai
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 个人Free官网写实时网页/X搜索、Voice mode和Connectors，没有明确免费模型版本与调用上限；$0/月是售价不等于福利价值0。SuperGrok标Grok4.6不能移植为Free模型。来源：https://x.ai/pricing
- Grok Bot企业两周活动官方发布2026-09-03，“next two weeks”按日期加两周为2026-09-17，截止精确时刻未公告；这是历史活动不是每个企业加入就从当天试用14天。限Grok Enterprise/Cursor Enterprise，管理员后台启用并下载应用，整个组织可用。来源：https://x.ai/news/grok-bot-for-enterprise
- 本批核验入口：https://x.ai/pricing；https://x.ai/news/grok-bot-for-enterprise。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## modelscope
- API-Inference 每天 200 魔粒只要登录就给；验证邮箱是一次性 50 长期魔粒奖励，不是前提；调用前提是绑定已实名的阿里云账号。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 当前API-Inference按魔粒而非旧2000次/日。每日登录200短期魔粒+绑定阿里云50=250/日；轻量0.5、主流1、旗舰2魔粒/次，仅全部用于该档时最多500/250/125调用；短期发放起24小时、长期90天。需验证个人邮箱、绑定已实名认证阿里云账号。来源：https://modelscope.cn/docs/model-service/API-Inference/limits 、https://modelscope.cn/docs/magicube/intro
- API-Inference不承诺高并发/SLA，官方建议商业化线上任务使用商业API。模型名单动态，可从官方匿名 https://api-inference.modelscope.cn/v1/models 读取目录，无需发送推理消耗用户配额；2026-10-01读得35模型，API列出代表目录可用而不保证无余额限制。
- SPA正文可从官方 https://www.modelscope.cn/api/v1/document/main_doc_CN_prod 获取Data.TargetPrefix，再读/dist/model-service/API-Inference/limits/limits_CN.md、intro/intro_CN.md、/dist/magicube/intro/intro_CN.md；本轮官方版本20260928155008。不能用旧社区公告或第三方列表替现行文档。
- 无同平台官方魔粒售价，不用别家Token价折算。
- 本批核验入口：https://modelscope.cn/docs/model-service/API-Inference/intro；https://modelscope.cn/docs/model-service/API-Inference/limits；https://modelscope.cn/docs/magicube/intro；https://api-inference.modelscope.cn/v1/models。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## krea
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Free每天100units需登录无需信用卡。免费表有Krea1、Krea2 Medium/Large/Turbo、Flux.1 Dev、Flux2、Flux Kontext Dev、Flux.1 Krea、Flux2 Klein、Qwen Image、Qwen Image2512、Wan2.2 Image、Z Image、LTX-2 19B；按Free列非空筛选，不把付费列全部模型当免费。Krea Agent是产品功能不是模型。来源：https://www.krea.ai/pricing
- 每款的日生成估计共享同一100units，不能相加算总额度。按最低年付Pro$21/月/20,000 units，30天3,000units比例$3.15/月；不估值“不限量”部分。
- 网站平面抓取会把付费权益混排；FAQ与Free卡片在商业许可/耗尽后可否继续生成存在措辞冲突，需账号权限进一步核对，不能承诺免费全部视频或商业许可。
- 本批核验入口：https://www.krea.ai/pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## copilot
- 2026-03-12 起学生改为 Copilot Student 计划（每月 200 AI Credits、补全无限），以 GitHub 官方社区公告 discussions/189268 为准；认证教师和热门开源维护者免费 Copilot Pro（docs 教师页）。免费层 Copilot Free 本身不单独收。（2026-10-03）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Free适用于符合资格的个人新老账号，不限新注册，Business/Enterprise已分配席位者不适用。官方Free列当前有36模型，不能只抽前两个Fable；可用模型按入口/功能不同。来源：https://github.com/features/copilot/plans
- Free每月2,000补全；FAQ仍写50聊天（含Edits），主表现在表述有限Chat/Agent用量和AI Credits，额度以账户最新显示为准，不因付费AI Credit单价自行假设Free金额。
- $0/月是套餐价格不是价值0；官方未明Free AI Credit数量，usdEstimate留空。
- 本批核验入口：https://github.com/features/copilot/plans。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## anthropic
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Claude API代码执行现每组织每月1,550小时免费，超额$0.05/小时/容器，最少5分钟；工具替代价值77.50美元/月。原“每日50小时、网页端运行Python”是错误。来源：https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool
- Claude API 文档里的“per organization”指 Console 计费账户：个人注册 API 也自动有一个组织，不需要企业版；但调用 API 必须绑信用卡并充值，门槛写 card + pay，不是零门槛。Claude.ai 的 Pro/Max 订阅不含 API。（2026-10-03 管理员确认）
- 请求包含web_search_20260209/web_fetch_20260209及后续版本时，code_execution本身不加收，标准输入输出Token仍收费；这是API工具执行权益不是免费Claude模型或网页会员，models保持空并注明收费门槛。
- 套餐权益调整、一次性赠送额度以 support.claude.com 帮助中心为准（金额、资格、领取期、失效日期写得最全），@claudeai 推文用来定发布时间；第三方汇总站（如 resetradar.com）只当线索。
- “某档位开始包含某模型”（如 Max / Team 高级席位内含 Fable 5）是套餐权益，不收；只收一次性赠送的 usage credits（如 2026-07 Fable 5 补偿 Pro $100，7-20~8-02 可领、9-17 失效，已作为历史）。（2026-10-02 管理员确认）
- 本批核验入口：https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## azure
- 美元用官方 Retail Prices API（prices.azure.com）查单价，产品页显示 $- 时不必留空。API Management、Bot Service 消息通道等不是模型推理额度，not_ai。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Azure 免费账户需 Microsoft/GitHub 账号、手机号、非预付信用卡/借记卡做验证；不能把常驻免费服务写成零门槛。$200 试用仅适格新用户且30天有效，用完或30天后继续使用须主动转按量付费。
- AI Bot 免费为每月1万高级频道消息与无限标准消息，仅通道；托管、模型推理等关联资源另计。Translator F0 每月200万字符由标准翻译和自定义翻译训练共用；Content Safety 免费层每月5000文本记录及5000图像，用完停止不收超额。
- API Management Consumption 每月100万免费调用是通用API网关，不是AI模型额度；建议按not_ai决定收录，不自动拒绝。官方产品价格页动态金额返回$-时不能用旧价填美元，待零售报价API或已登录计算器核定。
- 本批核验入口：https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account；https://azure.microsoft.com/en-us/pricing/details/bot-services/；https://azure.microsoft.com/en-us/pricing/details/content-safety/；https://azure.microsoft.com/en-us/pricing/details/translator/。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## pixverse
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 以 app.pixverse.ai/subscribe 完整 Plans Details 表为准：Basic每天30积分，付费Standard/Pro/Premium/Ultra每天60；月会员积分分别1200/6000/15000/25000，会员按订阅开始的准确时刻每30天刷新，不是UTC月初；日额度UTC00:00刷新，两者均不结转。
- 官方积分包$5/500、$20/2000、$50/5000、$100/10000，可按$0.01/积分作替代成本估值；免费30积分×30天=$9，付费月额度及付费档日领额度是套餐内含权益，不另收或计为赠送价值；无限生成也不编造美元。
- 只有 Unlimited Free Image Generations in Relax Mode (365 Days) 表的模型填免费模型。Standard没有；Pro为Qwen-image/Nano Banana 2 Lite；Premium再含Nano Banana 2/Nano Banana/Seedream4.0；Ultra14款依现行表。普通Access to Image/Video Models是可访问付费模型，不能都写免费。
- 旧$8/$24/$48/$149摘录有20%/40%折扣但没计费周期；本轮公开渲染正文没返回套餐卡价格，先去掉固定月费声明，门槛保留套餐名+结算价周期待确认。
- 本批核验入口：https://app.pixverse.ai/subscribe。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## thinking-machines
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 2025-10-29 Tinker research/teaching grants是申请制apply/endKind standing/claimMethod form，不是企业认证常驻自动赠额；研究面向研究与开源项目，起步$5000不是最高金额；教学由教师申请每学生$250、供课程使用，滚动审批，授予有效期以批准为准。
- 本批核验入口：https://thinkingmachines.ai/news/tinker-research-and-teaching-grants/。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## gamma
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 新Free用户一次性400 AI积分，不会自动刷新，归注册新人礼；不能只写每次10页功能上限当额度。Free可邀请，好友完成专属链接注册后邀请人200积分；余额同时上限2000，消费后继续赚，总累计不限，不限于付费会员。
- 官方 https://help.gamma.app/en/articles/12466653-how-do-i-purchase-more-credits 加购1500积分/$6；替代成本比较注册400约$1.60，每邀请200约$0.80。Free不能买积分，不能写成免费层能直接充值此价。
- 本批核验入口：https://help.gamma.app/en/articles/7834324-how-do-credits-work-in-gamma；https://help.gamma.app/en/articles/12466653-how-do-i-purchase-more-credits；https://gamma.app/pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## tapnow
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Terms新用户赠Tapies带条件：资格与额度依产品、安全、合规检查，不能许诺人人领，不编固定数量；官方Tapies validity文档2026-09-28起到账的新用户赠额30天，未用完自动清除，生效日不是领取活动开始日。
- 本批核验入口：https://www.tapnow.ai/terms-of-service；https://docs.tapnow.ai/en/docs/account/tapies-validity-and-expiration。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## meshy
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 免费每月100积分，UTC月初00:00刷新，未用不结转；每月可下载10个Meshy6Lite，CC BY4.0需署名，可商用，1并发低队列，不含API；不能把所有当前付费模型填进免费模型。
- 官方Pro$20/月含1000积分，可按套餐比例比较100积分约$2；写明套餐替代成本而非免费账号可购单价。加购文档未公布数字，不编加购价。
- 本批核验入口：https://www.meshy.ai/pricing；https://docs.meshy.ai/en/webapp/pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## ideogram
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- 当前价格页Free仅eligible accounts每周慢速积分，Google/Apple/Microsoft登录，数量可变化；无限Slow为Plus/Pro等付费权益，不能写在Free。当前页与旧FAQ固定10/周存在漂移，依现行表不沿用旧数量/固定重置时刻。
- 优先积分才能AI编辑/图像参考，免费生成默认公开；未写免费层具体模型版本，不把网站所有模型导航当免费模型。
- 本批核验入口：https://ideogram.ai/pricing/。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## github
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Copilot Free每月2000行内建议，另外Chat/Agent有限额度，补全与Agent模型范围不同，不能把所有Chat模型填进补全条目的免费模型，也无按次公开单价可折算。领取方式app，在支持IDE登录GitHub并启用插件。
- 本批核验入口：https://github.com/features/copilot/plans。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## gcloud
- 独立产品试用（GKE、Spanner、Cloud SQL、AlloyDB、Looker、Bigtable 等）不是 AI 额度，not_ai。Gemini Enterprise 试用以帮助中心 answer/16551831 为准：新用户、最多 5 席、需支付方式、到期自动转付费。$300 新人额度不能付 AI Studio 的 Gemini API，也不能用于第三方合作模型、GPU、Marketplace。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Google Cloud 独立数据库试用不得重复算公共$300新人额度。Bigtable10天仅Google账号、无billing；延长90天需启用结算。AlloyDB/SQL/Spanner均需有效结算，新客户验证支付方式。数据库/容器服务应交管理员判断非AI收录边界。
- Google AI startup最高35万分两年，第二年仅抵扣20%成本，第三方模型不由计划额度覆盖。资格融资/成立年限/既往额度均需原文。
- Looker总览30天与core技术文档90天矛盾，不能简单取最大值；精确区分入口后由管理员判断。
- Gemini Enterprise Business官网点名Gemini 3/Nano Banana，30天，工作邮箱，$21/席位/月起；标题为free trial的帮助页实际Buy Now购买操作，不能据此断言试用必须绑卡，保留requirements unknown直到登录入口确认。
- 本批核验入口：https://cloud.google.com/startup/ai；https://cloud.google.com/startup；https://docs.cloud.google.com/bigtable/docs/free-trial-instance；https://docs.cloud.google.com/free/docs/free-cloud-features；https://docs.cloud.google.com/looker/docs/looker-core-overview；https://docs.cloud.google.com/alloydb/docs/free-trial-cluster；https://docs.cloud.google.com/spanner/docs/free-trial-instance；https://docs.cloud.google.com/sql/docs/mysql/free-trial-instance。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## elevenlabs
- v4 页和 pricing 页内容不同，摘录要从证据链接那一页取。API 的 72% off 是折扣，不收。多档位按“套餐价 ÷ 积分”取最低费率折美元。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Eleven v4横幅3x实际为Creator及以上额外最高2倍月TTS用量不扣余额，仅web/mobile；API折价为另一条定价规则，不混用。
- 首月折扣按节省金额估值，不能把购买的完整套餐当额外免费赠金。
- 本批核验入口：https://elevenlabs.io/pricing；https://elevenlabs.io/v4；https://elevenlabs.io/startup-grants；https://elevenlabs.io/pricing/api。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## leonardo
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Leonardo日150=30天4500 tokens，旧0.45估值错误；官方Essential $12/8500估值$6.35。免费目录具体型号不全，不把付费不限速模型列表直接填free。
- 本批核验入口：https://leonardo.ai/pricing；https://intercom.help/leonardo-ai/en/articles/8044033-token-usage。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## groq
- 美元按主力免费模型（gpt-oss-120b）官方速率上限 × 输入价算：每天 200K Token × 30 × $0.15/百万 ≈ $0.9/月。（2026-10-03 批量审核）
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Groq和Cohere型号以各自Free/Trial limit表为准，不能用平台全部支持模型自动填免费。Cohere每月1000次不是固定Token数，不能假定每请求Token量折美元。
- 本批核验入口：https://console.groq.com/docs/rate-limits；https://console.groq.com/docs/billing-faqs。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## cohere
- 本节补充按 2026-10-01 官方资料核验；日期、型号、价格是当日快照，后续更新须重新读原文，未证实项继续保留缺口。
- Groq和Cohere型号以各自Free/Trial limit表为准，不能用平台全部支持模型自动填免费。Cohere每月1000次不是固定Token数，不能假定每请求Token量折美元。
- 本批核验入口：https://docs.cohere.com/docs/rate-limits；https://cohere.com/pricing。更多逐条来源见 `docs/pending-field-review-2026-10-01.md`。

## together
- 本节按 2026-10-01 官方资料核验；额度和申请资格后续更新须重新读取官方全文。
- Together AI Startup Accelerator 为申请审核制，面向构建 AI 原生应用的初创企业，不是注册即得；新老平台账号不决定资格，按企业融资阶段及审核结果决定。
- 官方三个档位：Build（融资不超过 $5M）最高 $15,000；Scale（融资 $5M–$10M）最高 $30,000；Grow（融资超过 $10M）最高 $50,000。最低档名称是 Build，不是 Start；各数字是可获批上限，不保证每家企业足额领取。
- 可用于 Serverless Inference、Fine-Tuning、Dedicated Endpoints、Instant Clusters；不适用于 Reserved GPU Clusters。不要把整个平台的 GPU 产品都写成免费。
- 额度有效期、具体获批金额及到期规则在所核官方文章未公布，保留未知，以申请批准通知为准；不得编造领取结束日期或期限。
- 可消费的模型目录动态变化，官方计划没有锁定具体免费型号；不要将官网导航里全部模型或付费套餐模型直接当该计划免费模型列表。
- 美元档位范围口径：现条目 usdEstimate=15000、usdMax=50000，表示最低档与最高档的最高可申请额度区间，不是最低保证额度。申请制图表需明确“最高可申请”，不得把 $15K 宣称必获最低。
- 官方来源：https://www.together.ai/blog/announcing-together-ai-startup-accelerator

## inception
- 同一页面写了 1000 万和 1 亿，以 Free 档的 1 亿为准，一次性赠送，类型 new。（2026-10-03 批量审核）
- 官方Free档1亿API Token体验；Mercury2.5发布页再次明确100million，不能按每月刷新或继承聚合站未证实的有效期；开户细则未读到就保留待核。
## browser-use
- 合资格Google/GitHub/Microsoft注册赠$15云端额度，浏览器时间、代理流量、模型费用和20%服务费都消耗余额；不当成原模型厂商赠金，赠额有效期以账户条款为准。
## hume
- 官方billing写新账号免费档含$20额度，TTS/EVI/Voice权限与余额有效期须核具体账户；不凭付费模型导航填完整免费模型。
## free-ai
- 创业资助1500万Token需公司不满3年、融资少于$5M、有产品且未付费，经审核；仅自托管开源模型，外部GPT/Claude/Gemini不在赠额范围，不允许收录号池转售版本。
## qwenwork
- 活动以帮助中心《千问办公正式上线，多重惊喜福利！》https://help.aliyun.com/zh/qwenwork/qwenwork-is-live 为准，每个活动标题会标注“已结束”；上线日 2026-08-03（阿里巴巴集团新闻稿）。
- 积分没有公开单价，按个人标准版套餐费率折算：78 元/月约 8,000 积分（基础 2,000 + 每天 200 登录），约 0.01 元/积分。付费档每日登录积分是套餐自带，不收。（2026-10-03 管理员确认）
- 与千问AI平台/百炼API是独立权益：注册2000积分90天，免费每天登录100当日有效；标准/高级每天200/300。8月五倍登录和经济模型免积分已结束，不套旧促销。
## doubao-work
- 官网首页现行宣传下载领30天订阅体验，批次、新老资格、截止需账户核验；个人、团队、企业套餐分开。团队2000加赠存在9/30旧细则，未核延期不当现在可领。
## coze
- docs.coze.cn 要用浏览器 UA 才能抓（否则 UA Forbidden）。积分折美元用 coze_pro_credits 企业版“1000 积分 = 1 元”（比个人进阶版 39.9 元/3 万更保守）。积分页现在只写“新用户注册一次性 1500（30 天）”，免费版每日 1500 需登录核对；新用户 1500 可能是一条漏收的新人礼。（2026-10-03 批量审核）
- 国内扣子个人免费版官方升级规则每日登录1500积分、1天有效，不能套旧500档或已结束的9.9元优惠；新套餐实际领取仍需当前账户核对。
## lingxi
- 文档里的“快速模式不消耗智点”“自定义模型下搜索、生图等工具限时免费”都不收：前者只是基础模式、没有额度，后者要自带 API Key 付模型费。只收有具体智点数的（体验 800/月、签到、首购加赠）。（2026-10-03 管理员确认）
- WPS灵犀体验800智点/月；签到100/200，连续Day7起200/天；首次购买标准/进阶/旗舰额外5000/14000/48000只一次。本金不记赠金；加量2000智点25元，仅付费用户，可作同平台替代成本比较。
## workbuddy
- 积分单价用官方加量包 50 元 / 1,000 积分。（2026-10-03 批量审核）
- 官网活动都在 https://www.workbuddy.cn/events/<名称>/ 下（invite、campus-freshman），活动页是 site 级证据；Jina 抓取会被降级成 media，审核时改回 site。
- 与CodeBuddy同账号积分共享，免费定价列500基础积分/月，不重复加计。学生认证一次1000到2026-10-31，领取后3月，限大陆高校在读+二代身份证+微信小程序验证。
- 模型限免的延期、调整只发在公众号「腾讯WorkBuddy」（已登记为平台公众号），官网价格页、更新日志和客户端都不写；以公众号原文为准，媒体转述只当线索。例：2026-09-30 21:32《Hy4 preview 夜间限免、Hy3 限免延期公告》https://mp.weixin.qq.com/s/G_v9I1jO-cfJFsH4CGhX6A 。WorkBuddy 是客户端，领取方式写“下载应用并登录”。（2026-10-02 管理员确认）
- 2026-10 起新一波邀请活动（至 10-31）：受邀新用户注册 2,000 积分、邀请人 50+100、付费双方各 500，官网活动页 https://www.workbuddy.cn/events/invite/（页面靠脚本渲染，直接 curl 读不到正文，用 Jina）（xkt7）。没有每日签到领 100 积分，社区说法不收。（2026-10-03 管理员确认）
- 邀请2000、教师礼和企业双倍积分9/30已结束；社区4000万Token是换算，不能写成官方固定Token赠额。

## sensenova
- 商汤 SenseNova TokenPlan 由商汤自己发放，不要挂到火山方舟等其他平台；社区帖只当线索，以 https://platform.sensenova.cn/docs “积分”一节和 https://www.sensenova.cn/token-plan 为准。
- 2026-08-28 起为积分制：通用积分池与 Flash-Lite 专属积分池各滚动 5 小时 60,000、每周 600,000 积分；Flash-Lite 消费 1:1 返赠通用积分，30 天有效。公测期 ¥0/月，无截止日期；条目按常驻处理（type standing、endKind standing），规则变化看文档“积分”一节（2026-10-03 批量审核）。
- 免费模型只列订阅页 Free 档点名的（目前 SenseNova 6.8 Flash Lite、SenseNova U1 Fast）；模型总览里的第三方模型未写入免费档，不列。积分无官方换算，美元留空。规则改动看文档“积分”一节，旧的“每 5 小时 N 次”是 7 月规则。（2026-10-02 管理员确认）

## windsurf
- Windsurf 是 Cognition 旗下产品，但它的福利归 windsurf 平台，不要挂到 devin；Windsurf 的公告现在发在 devin.ai/blog（以及 windsurf.com），两处都算官方出处。
- Windsurf 博客里“新模型上线限时 N 倍积分优惠”多数是旧文的发布价，先看文章日期：已过期的作为历史，打折不是免费的按 discount 标签处理。（2026-10-02）

## cerebras
- 新人 $5 免费额度可用于所有公开模型，30 天有效，以 inference-docs.cerebras.ai/support/rate-limits 为准（2026-10-03 批量审核）。
