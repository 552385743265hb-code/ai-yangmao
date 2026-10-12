# 53 条管理员研判落实结果 V2

日期：2026-10-11（America/New_York）。[计算方案 V2](plans/benefit-valuation-and-field-completion-v2.md)。每条均保留原决定，40 条数值参考、13 条金额留空结案；没有跳过。

**录入状态：53 条价格及 V2 元数据已写入生产。** 通过正式管理接口执行，逐条 D1 回读与冻结清单精确一致：40 条数值参考、13 条无价结论。HF、Codex 进度条目已撤下；Lovart 已转历史。c232→510k 已通过精确版本协调计划完成逻辑合并，原条目与审核历史不变，旧链接指向 510k。最终回执见[完成记录](valuation-completion-2026-10-12.md)。下表和逐条计算保留当时的研判依据，操作执行状态以本文末尾回执为准。

| 序号 | 短码与条目 | V2 参考值 | 处理 | 计算依据 |
|---:|---|---:|---|---|
| 1 | 81p6 Adobe Photoshop 印度学生首年免费12个月 | $1.72 | 数值参考（暂定） | first30 = (1999 INR/year ÷ 12) × 0.010337972166998012 USD/INR = 1.7221338634857522 USD → 1.72 USD; fullValue = 1999 × 0.010337972166998012 = 20.665606361829026 USD → 20.67 USD |
| 2 | hacu 阿里云百炼新人免费额度 | $6.664546 | 数值参考（暂定） | 文本 (833,333×¥2.4/M +166,667×¥9.6/M)=¥3.6000024；图像 min(100,50)×¥0.2=¥10；视频 min(600,50)×¥0.6=¥30；音频合成 10,000计费字符×¥1/10,000=¥1；四个独立模态各计一次：¥44.6000024×0.14942927245572862=$6.664546 |
| 3 | yf7p 海纳百川计划：医疗机构可申请免费 Baichuan-M3 Plus API | $30.483572 | 数值参考（暂定） | 30,000,000输入Token÷1,000×¥0.005 +6,000,000输出Token÷1,000×¥0.009 =¥204；¥204×0.14942927245572862=$30.483572 |
| 4 | 248m Hogee 数字员工免费体验 | $0.215178 | 数值参考（暂定） | 1,000,000输入÷1,000×¥0.0008 +200,000输出÷1,000×¥0.0032 =¥1.44；¥1.44×0.14942927245572862=$0.215178 |
| 5 | 626n SWE-2 Free 桌面端与命令行限时免费 | $45 | 数值参考（暂定） | SWE-2编程标准用量：10,000,000输入Token÷1,000,000×$3 + 1,000,000输出Token÷1,000,000×$15 = $45；本次采用完整30天覆盖。 |
| 6 | c232 Windsurf 平台 Claude Opus 4.6 (fast mode) 积分倍率优惠 | 留空 | 重复合并（已完成） | 用户明确同事件合并并按无法估值。当前官方公告确认2026-02-07 Windsurf Claude Opus 4.6 (fast mode)同一促销，No thinking 10x、With thinking 12x，至Feb 16；两条同URL、模式、倍率、资格和窗口。仅公告优惠扣积分倍率，缺同服务正常倍率/历史购买单价与覆盖预算，所有金额留空。建议保留更早已批准且管理员已纠归Windsurf的510k；需走保留原行/审核/送达的逻辑合并，不以删除或普通reject替代。 |
| 7 | mdaj 豆包工作客户端下载 30 天订阅体验 | $10.16 | 数值参考（暂定） | first30 = 1 standard-plan month × 68 CNY/month × 0.14942927245572862 USD/CNY = 10.161190526989547 USD → 10.16 USD; full 30-day trial benchmark = 10.16 USD |
| 8 | gvew Dreamina 每日免费额度 | $30 | 数值参考（暂定） | 2 selected Basic monthly purchase benchmarks × USD 15/normal-renewal month = USD 30 |
| 9 | v51t ElevenLabs 创业扶持计划 | 留空 | 无价结案 | 本次人工决定闭合美元待判断；保留3300万字符/12个月资助事实。各模型、扣池及首30天释放安排未核得，美元值均留空。 |
| 10 | 7tpm ElevenLabs 免费版 | $2 | 数值参考（暂定） | 10,000 Free credits/month × ($6 Starter monthly price ÷ 30,000 Starter credits/month) = $2.00/month |
| 11 | qm8n ElevenLabs Creator 及以上：Eleven v4 限时额外 2 倍 TTS 用量（至 10/12） | $44 | 数值参考（暂定） | $22 Creator regular monthly price × 2 incremental quota equivalents = $44.00 |
| 12 | echh Gemini Enterprise Plus 版 30 天免费试用 | $21 | 数值参考（暂定） | 1 recipient × user-selected 21 USD/subscription-month × (30 trial days / 30 reference days) = 21 USD |
| 13 | 0vec Gemini Enterprise 商业版 30 天免费试用 | $21 | 数值参考（暂定） | 1 eligible trial seat × user-selected published starting rate 21 USD/seat/month = 21 USD for 30 days |
| 14 | t3qi Genspark 免费账号每日额度 | $4.8 | 数值参考（暂定） | 100 credits/day × 30 days × min(24.99/10000, (239.99/12)/10000, 249.99/125000, (2399.99/12)/125000) USD/credit = 4.79998 USD → 4.80 USD |
| 15 | niro Hugging Face 免费用户每月 $0.10（仅限 Inference Providers） | 留空 | 撤下（待执行） | 完整复核当前官方Inference Providers pricing：Included Monthly Credits明确Free Users=None，免费用户需购买credits或升级PRO；路由本身不产生免费额度，付费订阅含$2不是本条免费权益。现条标题、旧摘录和自动领取步骤仍宣称$0.10，批准valueText却已写None。用户“如果属实就拒掉”的条件已确认满足；此条目前approved，使用unpublish撤下，保留旧证据、修订与历史。不能用needs_judgment或$0继续作为现役羊毛。 |
| 16 | df8o Higgsfield 付费会员积分补足（9月29–30日历史活动） | 留空 | 无价结案 | 本次管理员明确确认无法估值；三个美元金额为null，关闭美元催补；原历史窗口和审批状态保持原记录。 |
| 17 | asus Higgsfield Seedance 2.5 新用户24小时免费试用 | $5.94 | 数值参考（暂定） | coveredSeconds = min(600 seconds/30 days × 1 day, 5 generations × 20 seconds) = 20 seconds; 20 ÷ 8 × 72 credits × (USD 99 ÷ 3000 credits) = USD 5.94 |
| 18 | c93n Scale 团队方案无限模型升级 | $2.1 | 数值参考（暂定） | 100 images/30 days × 7 days × lowerMedian([USD 0.09/Seedream 5.0 Pro 2K image, USD 0.1344/Nano Banana Pro 2K image]) = USD 2.10 |
| 19 | yn2q Higgsfield 免费 Seedance 2.0 4K 生成 | 留空 | 无价结案 | 同版本原生4K、音频及参考输入模式的精确付费规格无法可靠匹配，按本次管理员决定结案，所有美元值null。 |
| 20 | iaqq 华为云码道限时每日领取1000万Tokens（4款福利模型） | $1.613836 | 数值参考（暂定） | 四款模型编程-v1成本排序：DS4Flash0731(DeepInfra FP8) $0.78、GLM5.3Flash¥10.8、DS4.1Flash峰时¥28、DS4Pro0813峰时¥117；偶数中位取较低GLM；10M输入×¥0.8/M+1M输出×¥2.8/M=¥10.8；¥10.8 × 0.14942927245572862 USD/CNY = $1.613836 |
| 21 | ti6o 果办OfficeAce 首次注册登录赠送4000积分 | $29.288137 | 数值参考（暂定） | 4,000 积分 × (¥98 /2,000 积分) = ¥196；¥196.0 × 0.14942927245572862 USD/CNY = $29.288137 |
| 22 | dh9i 即梦国内版每日登录送积分 | $20.800555 | 数值参考（暂定） | 管理员亲测20免费积分/日×30日=600积分（未获得积分→秒数兑换率）；模型成本场景另取标准600秒：120条×5秒×火山官方480p16:9无输入视频示例价¥1.16/条=¥139.2；¥139.2×0.14942927245572862=$20.800555 |
| 23 | mec1 可灵国内版每月 128 灵感值 + 视频体验包 | $1.91 | 数值参考（暂定） | 128 inspiration credits × CNY 10/100 same-product inspiration credits × 0.14942927245572862 USD/CNY = USD 1.9126946874333263 ≈ USD 1.91 |
| 24 | 291d Lovable 每日构建积分（Free每月最多30） | $7.5 | 数值参考（暂定） | 30 Free build credits/month × ($25 Pro entry monthly price ÷ 100 credits/month) = $7.50/month |
| 25 | da07 Lovable 免费版每月 AI 服务额度 | $1.2 | 数值参考（暂定） | 4 Free AI gateway credits/month × ($15 Pro top-up ÷ 50 credits) = $1.20/month |
| 26 | l93u Lovable 邀请奖励：好友注册10积分、首次付费后邀请人100积分 | $2.5 | 数值参考（暂定） | 10 invitee signup bonus credits × ($25 Pro entry monthly price ÷ 100 credits) = $2.50 per eligible invited newcomer |
| 27 | de7w Lovart 免费版每天 70 积分 | $8.48 | 历史化并估值（待执行） | historical 70 credits/day × 30 days × USD 109/month-equivalent billed annually ÷ 27000 fast-generation credits/month = USD 8.477777777777778 ≈ USD 8.48 |
| 28 | gpgi Magnific Seedream 5.0 Pro 限时不限量生成 | $3.96 | 数值参考（暂定） | 100 images/30 days × lowerMedian([50,60,75] credits/1K image) × (USD 82.50/month × 12 months ÷ 1500000 annual credits) = USD 3.96 |
| 29 | 42lv MiniMax Code 签到双倍积分（9/28–10/7） | $5.187131 | 数值参考（暂定） | 首次连续10天普通签到(8×400+2×1000)=5,200积分；双倍共10,400；额外增量5,200×(¥500/74,900积分)=¥34.71295；¥34.712950600801065 × 0.14942927245572862 USD/CNY = $5.187131 |
| 30 | 85nn MiniMax Token Plan 老用户回馈积分（数额未公布） | 留空 | 无价结案 | 管理员已裁定按无法估值结案。官方只承诺额外积分福利，数量未公布，所有美元金额保留null，不把套餐基础额当作奖励。 |
| 31 | 93yq Mistral 免费计划每月 $10 API 额度（无需信用卡） | $10 | 数值参考（暂定） | user-confirmed historical 10 USD/month reference × 1 comparison month = 10 USD |
| 32 | hqgl 模力方舟每日免费调用额度 | 留空 | 无价结案 | 按管理员本次明确决定以无法估值结案。已读官方证据确认每日100次体验，但免费通道、真实免费型号、context/maxOutput与API购买资源包计费关系未获得同规格可复算证明；不以次数补造Token，也不拿付费API或原厂大context替代免费规格。 |
| 33 | 7z3x n8n Cloud 共享网关额度与充值 | 留空 | 无价结案 | 按管理员本次明确决定以无法估值结案。此条是共享预付余额和充值机制，未给独立赠送金额；新账户和旧客户的赠额另有条目，不能把购买余额本金或其余额共享机制作为额外美元权益。此次仅关闭估值待核，不扩大为撤下授权。 |
| 34 | f58l OiiOii 邀请好友注册登录奖励200积分 | $3.4 | 数值参考（暂定） | 200 inviter credits × ($17 BASE entry monthly price ÷ 1,000 guaranteed subscription credits) = $3.40 per successful invitation |
| 35 | wnpx Codex 和 ChatGPT Work 额度重置 | $5 | 数值参考（暂定） | ChatGPT Plus 常规月价 20 USD ÷ 4 = 5 USD/本次额度重置参考 |
| 36 | ew88 Codex 10月2日全球额度重置执行进度 | 留空 | 撤下（待执行） | 管理员明确要求直接拒绝。原证据仅说明10月2日全球重置未按10am完全传播及后续改善，是同一事件的执行进度/道歉回复，未给出新的独立额外重置。对已上架条目应unpublish撤下；本文件只返回操作建议，不执行生产写入或获取新版本。 |
| 37 | ex2n OpenCode Go 订阅：$10/月用 $15–60/月的模型额度 | $10 | 数值参考（暂定） | user-approved buy-one-get-one comparison: 1 benchmark month × official Go fee 10 USD/month = 10 USD/month reference; the published model usage limits are not summed |
| 38 | wgce 基元律动 认证赠18额度 | $2.689727 | 数值参考（暂定） | 认证奖励 ¥18 ×1名符合条件领取者 = ¥18；¥18 × 0.14942927245572862 USD/CNY = $2.689727 |
| 39 | bcot Poe 免费用户每天积分（待实测） | $0.1497 | 数值参考（暂定） | 300 user-adopted free compute points/day × 30 days × [$4.99 entry monthly price ÷ (10,000 paid points/day × 30 days)] = $0.1497 |
| 40 | ayl0 SeaArt 免费账号每日 130 活力值 | $2.08 | 数值参考（暂定） | min(candidateA: 130 Stamina/day × 30 days × USD 104.99/month ÷ 135000 purchased Credits/month; candidateB: 130 Stamina/day × 30 days × USD 4.79/month ÷ (300 Stamina/day × 30 days)) = candidateB USD 2.0756666666666668 ≈ USD 2.08 |
| 41 | 7f85 阶跃星辰 Studio 额外专属创作额度 | 留空 | 无价结案 | 按管理员本次明确决定以无法估值结案。Studio赠送池是套餐40%的专属创作额度；API加油包与1M Credit=¥1的模型用量口径尚不能证明Studio专属池可按同价购买替代。旧$22.54–2,253.52为名义用量推算，不能充当真实权益购买价值。 |
| 42 | 0622 TapNow 新用户免费 Tapies 额度 | $2.105263 | 数值参考（暂定） | 200 Tapies ÷ (95 Tapies/USD) = $2.105263 |
| 43 | 81st 腾讯云智能体开发平台体验版免费试用 1 个月 | $0.089658 | 数值参考（暂定） | 1,000,000输入Token×¥0.2/M +200,000输出Token×¥2/M =¥0.6；¥0.6×0.14942927245572862=$0.089658 |
| 44 | 3nb4 Tinker 研究与开源免费额度 | 留空 | 无价结案 | 按管理员本次明确决定以无法估值结案。官方grants starting at $5,000是获批资助起步金额，并非每个申请者保证可得或最高申请额；个人审批金额与首30天释放未知，不把$5,000设为usdEstimate或usdMax。 |
| 45 | zud3 Trae Pro 会员 14 天免费试用 | $5 | 数值参考（暂定） | user-approved half-month convention: historical first-subscription benchmark 10 USD/month × 0.5 = 5 USD for the up-to-14-day Pro trial |
| 46 | ds4t Vidu 注册新人试用 20 积分 | $0.19 | 数值参考（暂定） | 20 signup trial credits × USD 2300/year ÷ (12 months/year × 20000 credits/month) = USD 0.19166666666666668 ≈ USD 0.19 |
| 47 | ibur 火山方舟新用户免费推理额度 | 留空 | 无价结案 | 按管理员本次明确决定以无法估值结案。官方公开文档确认新账号免费推理试用额度，但当前每模型赠额仅在控制台按账号查询，缺真实模型名单与数量；不能补造固定100万Token或由示例数量推出每人权益。 |
| 48 | usw3 MiMo-V2.5-ASR 语音识别 | $1.48 | 数值参考（暂定） | 20 adopted reference audio hours × $0.074/audio hour (mimo-v2.5-asr official overseas PAYG) = $1.48 |
| 49 | uyua 小米 MiMo 闲时 0.8 倍算力优惠 | 留空 | 无价结案 | 按管理员本次明确决定以无法估值结案。官方确认Token Plan闲时0.8倍Credits消耗，但API现金余额与Token Plan额度不互通，缺同版本每模型Token到Credits映射和适用购买费率，不将按量API费用的20%冒充真实套餐节省。 |
| 50 | sx99 智谱 GLM Coding Plan 7 天体验卡 | $4.408164 | 数值参考（暂定） | 1张7天体验卡，按管理员最低个人套餐月订阅÷4：Lite ¥118/月÷4=¥29.5；¥29.5×0.14942927245572862 USD/CNY=$4.408164。 |
| 51 | crw5 GLM Coding Plan 7天体验卡（已领完） | $4.408164 | 数值参考（暂定） | 1张7天体验卡，按管理员最低个人套餐月订阅÷4：Lite ¥118/月÷4=¥29.5；¥29.5×0.14942927245572862 USD/CNY=$4.408164。 |
| 52 | upa4 ZCode 全体用户领 1 亿 Token（Trust.patch，共 10 万份） | $11.954342 | 数值参考（暂定） | 管理员指定1亿Token权益人民币参考值¥80；¥80×0.14942927245572862 USD/CNY=$11.954342。 |
| 53 | 0n2u ZCode 付费用户赠送重置卡（Trust.patch） | $160.785897 | 数值参考（暂定） | 管理员逐卡基准：Pro ¥538/月÷4=¥134.5/张≈$20.098237/张；4张周重置卡+4张5小时重置卡=8张，8×¥134.5=¥1,076；¥1,076×0.14942927245572862 USD/CNY=$160.785897。 |

## 1 81p6 Adobe Photoshop 印度学生首年免费12个月

完整 ID：`adobe-firefly-adobe-photoshop-india-student-free-year`。

**管理员决定：** 就按₹1999 年价 处理。

**V2：** first30 = (1999 INR/year ÷ 12) × 0.010337972166998012 USD/INR = 1.7221338634857522 USD → 1.72 USD; fullValue = 1999 × 0.010337972166998012 = 20.665606361829026 USD → 20.67 USD

完整权益参考值：$20.67，单列，不与月度值叠加。

**参照条件：** ₹1999 是用户本轮选定的全年参考价，并未重新核实为该专用 Photoshop 权益的官方售价。；以一年 12 个相等月段分摊；首 30 天参照一个月，完整 12 个月价值另存 fullValue。；现行 CC Pro 学生全应用价不替换该 Photoshop 专项参考价；这不改领取资格、到期或审批状态。

**价格入口：** [来源 1](https://www.adobe.com/in/education/students/photoshop.html)；[来源 2](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** revalue；等待生产可写与版本复核后执行。

## 2 hacu 阿里云百炼新人免费额度

完整 ID：`aliyun-aliyun-bailian-new-user-free-tier`。

**管理员决定：** 这个新人免费额度就按每个模态的参考额度累加即可。

**V2：** 文本 (833,333×¥2.4/M +166,667×¥9.6/M)=¥3.6000024；图像 min(100,50)×¥0.2=¥10；视频 min(600,50)×¥0.6=¥30；音频合成 10,000计费字符×¥1/10,000=¥1；四个独立模态各计一次：¥44.6000024×0.14942927245572862=$6.664546

**参照条件：** 按本轮授权，四个实际独立免费模态的参考用量成本可相加；每个模态只计一个中位基准，不将所有模型赠额相加。；按今日官方北京地域价表重估；已批准历史63模型清单不完整，当前可比候选池不冒称该历史清单或完整赠送总额。；文本采用总量100万共享输入/输出Token封顶；保持约5:1输入输出比例，整数Token为833,333输入、166,667输出，逐次输入处于首价格档。；图像基准只生成图像，输入图像0张；图像50张、视频50秒及音频10,000计费字符分别受选定免费模型额度封顶，不消耗同一份Omni预算两次。；音频仅采用语音合成主要用途；语音识别、音乐、声音复刻不另加一份音频价值。计费字符按官方规则，一个汉字计2字符。；模型别名、latest和日期快照在中位统计时归组一次；不同实质版本保留。非思考/短上下文/未缓存基准，DeepSeek采用峰时价格，不将不确定持续期间的折扣推广为保证首30天价。；未定价图像beta、无字符换算的音频Token模型不当零价；因此整体仍为provisional。首30天能使用这些场景是假设，不表示保证全部领到。

**价格入口：** [来源 1](https://help.aliyun.com/zh/model-studio/new-free-quota)；[来源 2](https://help.aliyun.com/zh/model-studio/model-pricing)；[来源 3](https://help.aliyun.com/zh/model-studio/model-pricing)；[来源 4](https://help.aliyun.com/zh/model-studio/model-pricing)；[来源 5](https://help.aliyun.com/zh/model-studio/model-pricing)；[来源 6](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** revalue；等待生产可写与版本复核后执行。

## 3 yf7p 海纳百川计划：医疗机构可申请免费 Baichuan-M3 Plus API

完整 ID：`baichuan-baichuan-m3plus-api-free`。

**管理员决定：** 医疗场景使用的token量大，现在这个量可能只相当于一天的量，所以扩大到现在的值的30倍

**V2：** 30,000,000输入Token÷1,000×¥0.005 +6,000,000输出Token÷1,000×¥0.009 =¥204；¥204×0.14942927245572862=$30.483572

**参照条件：** 本轮管理员指定医疗场景为普通文本用量30倍；这是30天模型使用假设，不是官方保证赠送36M Token或申请资助额度。；假设机构获准且免费协议允许该工作量；真实免费额度、速率和完整资助上限尚未公布。；只估Baichuan-M3-Plus模型Token；自动触发医疗搜索另收¥0.03/次，是否纳入免费计划未知，不并入。

**价格入口：** [来源 1](https://www.baichuan-ai.com/?new_locale=zh-cn)；[来源 2](https://platform.baichuan-ai.com/prices)；[来源 3](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** revalue；等待生产可写与版本复核后执行。

## 4 248m Hogee 数字员工免费体验

完整 ID：`baidu-baidu-hogee-digital-employees-free-trial`。

**管理员决定：** 一般这种积分都是用成本最低的模型，找一下Baidu官方的成本最低的收费模型，按照默认使用量估算即可

**V2：** 1,000,000输入÷1,000×¥0.0008 +200,000输出÷1,000×¥0.0032 =¥1.44；¥1.44×0.14942927245572862=$0.215178

**参照条件：** 按管理员要求采用百度自研最低正价通用文本API成本代理，并采用默认30天100万输入+20万输出；排除免费模型、embedding、rerank、缓存命中价、需预付的资源包和批量价。；Hogee实际底层模型、200积分能调用多少Token和工具费用均未公开确认；此金额只是假设工作量的模型成本，不表示6,000积分实际等价该Token量。；采用短上下文未缓存在线推理；不计搜索/Agent工具/数字员工服务价值。

**价格入口：** [来源 1](https://hogee.baidu.com/hogee/employee/explore)；[来源 2](https://cloud.baidu.com/doc/qianfan/s/wmh4sv6ya)；[来源 3](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** revalue；等待生产可写与版本复核后执行。

## 5 626n SWE-2 Free 桌面端与命令行限时免费

完整 ID：`devin-devin-swe2-desktop-cli-free`。

**管理员决定：** 9月10日发布的，到10月15日已经满一个月了，就按45美元

**V2：** SWE-2编程标准用量：10,000,000输入Token÷1,000,000×$3 + 1,000,000输出Token÷1,000,000×$15 = $45；本次采用完整30天覆盖。

完整权益参考值：$45，单列，不与月度值叠加。

**参照条件：** 管理员确认9月10日发布至10月15日已覆盖一个月，采用完整30天编程标准用量。；$45是同模型标准用量的购买参照，不是平台赠送的现金面额，也不是保证无限Token。；官方文档10月15日与价格页10月16日的差异留作证据备注；本次估值采用管理员窗口，不据此盲改原官方日期字段。

**价格入口：** [来源 1](https://devin.ai/pricing)；[来源 2](https://docs.devin.ai/desktop/models)

**操作：** patch；等待生产可写与版本复核后执行。

## 6 c232 Windsurf 平台 Claude Opus 4.6 (fast mode) 积分倍率优惠

完整 ID：`devin-devin-windsurf-claude-opus-46-fast`。

**管理员决定：** 合并同样的事件。 估值就按照无法估值。

**V2：** 无法可靠折算，所有金额留空，不写零。

**价格入口：** [来源 1](https://devin.ai/blog/opus-46-fast)；[来源 2](https://devin.ai/blog/opus-46-fast)

**操作：** merge；等待生产可写与版本复核后执行。

## 7 mdaj 豆包工作客户端下载 30 天订阅体验

完整 ID：`doubao-work-30-day-trial`。

**管理员决定：** 按照最低档位套餐定

**V2：** first30 = 1 standard-plan month × 68 CNY/month × 0.14942927245572862 USD/CNY = 10.161190526989547 USD → 10.16 USD; full 30-day trial benchmark = 10.16 USD

完整权益参考值：$10.16，单列，不与月度值叠加。

**参照条件：** 按用户“最低档位套餐”采用公开最低个人付费档标准套餐及其连续包月 ¥68，体验期视作一个月。；官方工作页/工作定价页本轮只返回空正文，尚未证明赠送套餐与该标准会员完整权益逐项等同；按用户指定最低档位作暂定参照。；年付 ¥688 折月 ¥57.3333（约 $8.57）要求支付完整年费；本轮选择月付基准，备选价保留在 inputs。；学生 ¥38 需要额外学生资格，不替换一般用户月费。

**价格入口：** [来源 1](https://www.doubao.com/work)；[来源 2](https://lf9-cdn-tos.draftstatic.com/obj/ies-hotsoon-draft/grace_legal/doubao_member_copywrite_for_ai.html)；[来源 3](https://apps.apple.com/cn/app/id6459478672)；[来源 4](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** revalue；等待生产可写与版本复核后执行。

## 8 gvew Dreamina 每日免费额度

完整 ID：`dreamina-dreamina-daily-free-credits`。

**管理员决定：** 可以，3600相当于Basic的两倍，就按照basic的月费×2

**V2：** 2 selected Basic monthly purchase benchmarks × USD 15/normal-renewal month = USD 30

**参照条件：** 按管理员明确选择“Basic 月费×2”作为购买参考基准；1,800/月是管理员所选归一化假设，不是当前官网已证实的 Basic 额度。；当前官方卡片为1,575积分/月；不将3,600/1,575的严格积分比价伪写成两倍等值。；使用正常续费$15/月，不用首月$1.50促销，不沿用旧Ultra $31.73算法。；假设30天每天领取并使用120免费积分；地区、生成模式和积分可用范围不保证与付费套餐全权益相同。

**价格入口：** [来源 1](https://dreamina.capcut.com/ai-video/free-image-to-video-generator-credits-faq)；[来源 2](https://dreamina.capcut.com/pricing/dreamina-price)；[来源 3](https://dreamina.capcut.com/pricing/dreamina-price)

**操作：** valuation_only；等待生产可写与版本复核后执行。

## 9 v51t ElevenLabs 创业扶持计划

完整 ID：`elevenlabs-elevenlabs-api-startup-grants`。

**管理员决定：** 按照不可估值处理

**V2：** 无法可靠折算，所有金额留空，不写零。

**价格入口：** [来源 1](https://elevenlabs.io/pricing)

**操作：** close_unpriceable；等待生产可写与版本复核后执行。

## 10 7tpm ElevenLabs 免费版

完整 ID：`elevenlabs-elevenlabs-free-tier`。

**管理员决定：** 按照starter套餐的费率来定，不能算business的费率

**V2：** 10,000 Free credits/month × ($6 Starter monthly price ÷ 30,000 Starter credits/month) = $2.00/month

**参照条件：** 按管理员决定以Starter常规月付单价作为Free积分比较基准；不使用Business费率。；Free与付费套餐使用范围、许可和美元兑换率未证明完全等值，因此此数为暂定参考池估值，不是免费积分官方美元面额。；不采用首月$1促销或年付$5等效月价；共享额度只计一次。

**价格入口：** [来源 1](https://elevenlabs.io/pricing)

**操作：** revalue；等待生产可写与版本复核后执行。

## 11 qm8n ElevenLabs Creator 及以上：Eleven v4 限时额外 2 倍 TTS 用量（至 10/12）

完整 ID：`elevenlabs-elevenlabs-v4-creator-plus-triple-credits`。

**管理员决定：** 就按照creator的套餐×2

**V2：** $22 Creator regular monthly price × 2 incremental quota equivalents = $44.00

**参照条件：** 严格执行管理员Creator套餐×2的参考口径，计算的是额外最多2倍，不把原付费套餐本金计入。；$22为常规月价；$11首月优惠与年付等效价不作此基准。；v4仅web/mobile活动；活动最多额外2倍TTS使用，实际领取价值取决于本周期可用量，$44是指定套餐参考值，不是现金或人人固定赠额。；不把Business最高档作为默认值或美元真实上限。

**价格入口：** [来源 1](https://elevenlabs.io/pricing)；[来源 2](https://elevenlabs.io/v4)

**操作：** revalue；等待生产可写与版本复核后执行。

## 12 echh Gemini Enterprise Plus 版 30 天免费试用

完整 ID：`gcloud-gcloud-gemini-enterprise-plus-free-trial`。

**管理员决定：** $21

**V2：** 1 recipient × user-selected 21 USD/subscription-month × (30 trial days / 30 reference days) = 21 USD

完整权益参考值：$21，单列，不与月度值叠加。

**参照条件：** 用户明确选择 $21 为本条 30 天权益的参考价；Plus 同版同计费周期月价未取得。；$21 来源为 Business 官方起价，向 Plus 的对应使用属于本轮用户批准的基准假设。；按一个领取人/席位比较，不乘可扩展席位或包含模型数；没有已核最高赠额。

**价格入口：** [来源 1](https://cloud.google.com/free)；[来源 2](https://cloud.google.com/gemini-enterprise/business)

**操作：** revalue；等待生产可写与版本复核后执行。

## 13 0vec Gemini Enterprise 商业版 30 天免费试用

完整 ID：`gcloud-gemini-enterprise-business-free-trial`。

**管理员决定：** $21

**V2：** 1 eligible trial seat × user-selected published starting rate 21 USD/seat/month = 21 USD for 30 days

完整权益参考值：$21，单列，不与月度值叠加。

**参照条件：** 采用用户指定的官网每席每月 $21 起价，不声称它就是所有地区/计费周期结账价。；单个领取人的比较金额为一席 $21；最多五席属于团队容量，旧 $105 仅在 inputs 中保留团队参照，usdMax 留空。

**价格入口：** [来源 1](https://cloud.google.com/gemini-enterprise/business)；[来源 2](https://support.google.com/g/answer/16551831?hl=en)

**操作：** revalue；等待生产可写与版本复核后执行。

## 14 t3qi Genspark 免费账号每日额度

完整 ID：`genspark-genspark-free-tier`。

**管理员决定：** $4.8

**V2：** 100 credits/day × 30 days × min(24.99/10000, (239.99/12)/10000, 249.99/125000, (2399.99/12)/125000) USD/credit = 4.79998 USD → 4.80 USD

**参照条件：** 账号须有至少 3000 剩余终身免费积分并覆盖完整 30 天；终身上限未公开，不能保证每个账号每月都收到 $4.80 对应积分。；采用公开成对可复算套餐中的最低单位费率：Pro 年付 $2399.99 ÷ 12 ÷ 125000；需年付且套餐含其他会员功能。；未公开价格的更多 Pro credit tiers 无法验证；$4.80 是积分购买比例参考，不是可提现面额。

**价格入口：** [来源 1](https://www.genspark.ai/helpcenter/membership-plans)；[来源 2](https://www.genspark.ai/helpcenter/membership-plans)；[来源 3](https://www.genspark.ai/helpcenter/credits-guide)

**操作：** revalue；等待生产可写与版本复核后执行。

## 15 niro Hugging Face 免费用户每月 $0.10（仅限 Inference Providers）

完整 ID：`hf-huggingface-free-user-monthly-credits`。

**管理员决定：** 整个条目重新复核，如果属实就拒掉

**V2：** 无法可靠折算，所有金额留空，不写零。

**价格入口：** [来源 1](https://huggingface.co/docs/inference-providers/pricing)；[来源 2](https://huggingface.co/docs/inference-providers/pricing)

**操作：** unpublish；等待生产可写与版本复核后执行。

## 16 df8o Higgsfield 付费会员积分补足（9月29–30日历史活动）

完整 ID：`higgsfield-higgsfield-credit-reset`。

**管理员决定：** 按无法估值计算

**V2：** 无法可靠折算，所有金额留空，不写零。

**价格入口：** [来源 1](https://higgsfield.ai/creator-hub/changelog)；[来源 2](https://higgsfield.ai/blog/new-ai-influencer)

**操作：** valuation_only；等待生产可写与版本复核后执行。

## 17 asus Higgsfield Seedance 2.5 新用户24小时免费试用

完整 ID：`higgsfield-higgsfield-new-user-trial`。

**管理员决定：** $5.94 注意这个不要算整个月的了

**V2：** coveredSeconds = min(600 seconds/30 days × 1 day, 5 generations × 20 seconds) = 20 seconds; 20 ÷ 8 × 72 credits × (USD 99 ÷ 3000 credits) = USD 5.94

**参照条件：** 本条是一次24小时新人试用，只计1天覆盖后的20秒标准量；不外推30天、600秒或150次生成。；官方上限为5次、每次最长20秒；完整100秒最大权益不等于本条标准量，也不填fullValue。；按已接受的8秒/72积分参考率比例比较20秒标准素材，不承诺一个20秒片段实际扣180积分。；Ultra年付月均$99/3,000积分作为已接受的购买单位参考；规格和日期差异保留暂定。

**价格入口：** [来源 1](https://higgsfield.ai/creator-hub/changelog)；[来源 2](https://higgsfield.ai/blog/credits-vs-unlimited-ai-video-generation)；[来源 3](https://higgsfield.ai/blog/new-ai-influencer)；[来源 4](https://higgsfield.ai/blog/credits-vs-unlimited-ai-video-generation)

**操作：** valuation_only；等待生产可写与版本复核后执行。

## 18 c93n Scale 团队方案无限模型升级

完整 ID：`higgsfield-higgsfield-scale-plan-unlimited`。

**管理员决定：** 2.10 USD

**V2：** 100 images/30 days × 7 days × lowerMedian([USD 0.09/Seedream 5.0 Pro 2K image, USD 0.1344/Nano Banana Pro 2K image]) = USD 2.10

**参照条件：** 管理员接受2K条件候选；Scale官方公告未独立确认免费输出2K/质量上限，此规格必须保持为估值假设。；只算首次购买后7天窗口；团队5至15人不乘倍，按一个符合资格的领取者或一次共享权益窗口比较。；按两种图像模型成本的中间较低者$0.09，不将多个模型或图像/视频用途相加。；参考价只含匹配图像输出；不保证Scale免费模式和原厂API模式完全等值。

**价格入口：** [来源 1](https://higgsfield.ai/creator-hub/changelog)；[来源 2](https://higgsfield.ai/creator-hub/changelog)；[来源 3](https://docs.byteplus.com/en/docs/ModelArk/1544106)；[来源 4](https://ai.google.dev/gemini-api/docs/pricing)；[来源 5](https://ai.google.dev/gemini-api/docs/pricing)

**操作：** valuation_only；等待生产可写与版本复核后执行。

## 19 yn2q Higgsfield 免费 Seedance 2.0 4K 生成

完整 ID：`higgsfield-higgsfield-seedance-2-0-free-4k`。

**管理员决定：** 按无法估值计算

**V2：** 无法可靠折算，所有金额留空，不写零。

**价格入口：** [来源 1](https://higgsfield.ai/blog/seedance-4k-unlimited-11-days)；[来源 2](https://higgsfield.ai/higgsfield-api)；[来源 3](https://higgsfield.ai/higgsfield-api)

**操作：** valuation_only；等待生产可写与版本复核后执行。

## 20 iaqq 华为云码道限时每日领取1000万Tokens（4款福利模型）

完整 ID：`huaweicloud-huawei-cloud-madao-glm-5-3-flash-free-tokens`。

**管理员决定：** $1.613836

**V2：** 四款模型编程-v1成本排序：DS4Flash0731(DeepInfra FP8) $0.78、GLM5.3Flash¥10.8、DS4.1Flash峰时¥28、DS4Pro0813峰时¥117；偶数中位取较低GLM；10M输入×¥0.8/M+1M输出×¥2.8/M=¥10.8；¥10.8 × 0.14942927245572862 USD/CNY = $1.613836

**参照条件：** 标准工作量分配至30天，每天总Token不超过10M。；闲时优惠不保证用户全部请求适用，DeepSeek原厂候选用峰时未缓存标准价。；GLM使用标准0.8/2.8价；FAQ限时五折无完整适用期间，未套优惠价。；同精确0731版的OpenRouter DeepInfra FP8为付费成本参照，其精度未获华为免费服务保证。；假设活动能持续覆盖领取后30天；截止另行通知不代表保证30天。

**价格入口：** [来源 1](https://support.huaweicloud.com/offers-codeartsagent/codeartsagent_offers_0001.html)；[来源 2](https://bigmodel.cn/pricing)；[来源 3](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)；[来源 4](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-flash-0731/endpoints)；[来源 5](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** revalue；等待生产可写与版本复核后执行。

## 21 ti6o 果办OfficeAce 首次注册登录赠送4000积分

完整 ID：`huaweicloud-huawei-cloud-officeace-free-points`。

**管理员决定：** $29.288137

**V2：** 4,000 积分 × (¥98 /2,000 积分) = ¥196；¥196.0 × 0.14942927245572862 USD/CNY = $29.288137

完整权益参考值：$29.288137，单列，不与月度值叠加。

**价格入口：** [来源 1](https://www.huaweicloud.com/product/officeace.html)；[来源 2](https://support.huaweicloud.com/price-officeace/officeace_05_0003.html)；[来源 3](https://www.huaweicloud.com/product/officeace.html)；[来源 4](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** revalue；等待生产可写与版本复核后执行。

## 22 dh9i 即梦国内版每日登录送积分

完整 ID：`jimeng-jimeng-cn-daily-login-points`。

**管理员决定：** 实测按照每日20免费积分计算，去火山引擎看最便宜的seedance mini的价格折算

**V2：** 管理员亲测20免费积分/日×30日=600积分（未获得积分→秒数兑换率）；模型成本场景另取标准600秒：120条×5秒×火山官方480p16:9无输入视频示例价¥1.16/条=¥139.2；¥139.2×0.14942927245572862=$20.800555

**参照条件：** 20积分/日是管理员本轮亲测口径；按每天登录30天计算原始600积分。不得将原先20/66样本范围保留为当前保证档位。；本轮授权以最低Seedance mini规格估模型成本，默认600秒素材为独立工作量假设；未证实600积分能完成600秒，也未证实免费积分支持这个具体模型或480p规格。；按官方480p、16:9、5秒、输入不含视频价格示例1.16元乘120条；示例已四舍五入，美元小数6位仅表示复算精度，实际API账单由usage.completion_tokens决定。；不借较低14元/Mtoken的视频输入档计无视频输入场景，也不套已结束的促销折扣。；免费每日积分有效期、累计规则与模型可用范围仍按账号实际规则；不编造积分到Token/视频秒数的兑换率。

**价格入口：** [来源 1](https://jimeng.jianying.com/)；[来源 2](https://www.volcengine.com/docs/82379/1544106)；[来源 3](https://docs.volcengine.com/docs/ark/seedance-2-5?lang=zh)；[来源 4](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** revalue；等待生产可写与版本复核后执行。

## 23 mec1 可灵国内版每月 128 灵感值 + 视频体验包

完整 ID：`kling-kling-cn-monthly-free-pack`。

**管理员决定：** 按照国内最低一级套餐单价计算灵感值价值

**V2：** 128 inspiration credits × CNY 10/100 same-product inspiration credits × 0.14942927245572862 USD/CNY = USD 1.9126946874333263 ≈ USD 1.91

**参照条件：** 128月度灵感值来自既有管理员亲测，不重写tested证据或改成每月1日发放。；当前黄金入门月费¥66已证，但月度积分配额未证实；主公式只用官网及中国IAP明确的¥10/100同一灵感值率，不编660分母。；采用国内产品灵感值购买参考；不是国际Credits、API价或2024会员旧价。；附加3次视频生成与2次延长不叠加美元，是否共享积分和具体规格未明。；汇率为2026-10-09 ECB交叉汇率，不保证支付结汇价格。

**价格入口：** [来源 1](https://klingai.com/docs/point-policy)；[来源 2](https://apps.apple.com/cn/app/id6670396916)；[来源 3](https://apps.apple.com/cn/app/id6670396916)；[来源 4](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)；[来源 5](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** valuation_only；等待生产可写与版本复核后执行。

## 24 291d Lovable 每日构建积分（Free每月最多30）

完整 ID：`lovable-lovable-free-daily-build-credits`。

**管理员决定：** 按照pro的价值来计算

**V2：** 30 Free build credits/month × ($25 Pro entry monthly price ÷ 100 credits/month) = $7.50/month

**参照条件：** 按管理员指定Pro入门月付包作为Free build积分代理基准；不采用Pro加购$0.30。；Free积分与Pro美元单位完全等值未由官方确认；统一账本不证明跨套餐同面值。；30为自然月上限，日额度失效不结转；不按5×30计算150，也不把每月4 AI积分叠加到本条。

**价格入口：** [来源 1](https://docs.lovable.dev/introduction/subscription-plans)；[来源 2](https://docs.lovable.dev/introduction/credits-and-usage)

**操作：** revalue；等待生产可写与版本复核后执行。

## 25 da07 Lovable 免费版每月 AI 服务额度

完整 ID：`lovable-lovable-free-monthly-ai-credits`。

**管理员决定：** 按照pro的加购积分来计算，$1.20

**V2：** 4 Free AI gateway credits/month × ($15 Pro top-up ÷ 50 credits) = $1.20/month

**参照条件：** 管理员已接受4×$0.30=$1.20；官方未给Free积分独立美元兑换率，此为Pro加购代理参考。；每月4积分仅用于已部署应用AI gateway；不含20 Cloud托管积分，也不与构建赠额重复。

**价格入口：** [来源 1](https://docs.lovable.dev/introduction/credits-and-usage)

**操作：** revalue；等待生产可写与版本复核后执行。

## 26 l93u Lovable 邀请奖励：好友注册10积分、首次付费后邀请人100积分

完整 ID：`lovable-lovable-referral-free-credits`。

**管理员决定：** 按照最低一级套餐估值

**V2：** 10 invitee signup bonus credits × ($25 Pro entry monthly price ÷ 100 credits) = $2.50 per eligible invited newcomer

完整权益参考值：$2.5，单列，不与月度值叠加。

**参照条件：** 默认参与者为通过有效邀请链接首次注册的受邀新人，每人固定10积分；不假定邀请人仅凭注册获得积分。；邀请人100积分由好友首次付费触发，保留原条款但不计无需消费默认值或美元上限；不把双方额度相加。；入门Pro月付单价$0.25仅作跨套餐参考，不是Free官方面额。

**价格入口：** [来源 1](https://docs.lovable.dev/introduction/dashboard-overview)；[来源 2](https://docs.lovable.dev/introduction/subscription-plans)

**操作：** revalue；等待生产可写与版本复核后执行。

## 27 de7w Lovart 免费版每天 70 积分

完整 ID：`lovart-lovart-free-daily-70-credits`。

**管理员决定：** $8.48 并且应该修改为历史条目

**V2：** historical 70 credits/day × 30 days × USD 109/month-equivalent billed annually ÷ 27000 fast-generation credits/month = USD 8.477777777777778 ≈ USD 8.48

**参照条件：** $8.48用于旧70/日权益的历史购买参考；不对当前Free 30/日重新估值或新建条目。；采用管理员已接受的Ultimate首年年付月均$109/27,000积分；翌年$166续费不是本次选定候选价。；假设历史30天每天使用70积分；免费主流模型5张/日限制保留，不把付费其他功能或每日refresh Credits混入分母。；当前官方Free表改为30/d；真实70/d停止时刻未知，确认停止时刻与实际活动截止分开，不补造claimEnd。

**价格入口：** [来源 1](https://www.lovart.ai/pricing)；[来源 2](https://www.lovart.ai/pricing)；[来源 3](https://www.lovart.ai/pricing)；[来源 4](https://www.lovart.ai/pricing)

**操作：** valuation_and_withdraw；等待生产可写与版本复核后执行。

## 28 gpgi Magnific Seedream 5.0 Pro 限时不限量生成

完整 ID：`magnific-magnific-seedream-5-pro-limited-time-unlimited`。

**管理员决定：** 可以按照你的算法，$3.96

**V2：** 100 images/30 days × lowerMedian([50,60,75] credits/1K image) × (USD 82.50/month × 12 months ÷ 1500000 annual credits) = USD 3.96

**参照条件：** 管理员接受本算法的年度模型集合条件候选；估值对象按已批准正文中的模型集合，未自行重写原标题或审批。；三个候选均按1K规格；取50、60、75的中间较低者60，不混2K/4K或不同更高档配置。；使用已核验页面Pro Starter 1.5M年积分与$82.50/月年付USD候选；地域币种或4M档不据此定价。；30天用于标准图像比较；原条目标题仍指Seedream 5.0 Pro限时活动，相关scope/term差异在内部保留，不宣称已证实Seedream 5 Pro本项限免的正式价值。；fullValue与usdMax留空，不把年度套餐费当额外免费权益。

**价格入口：** [来源 1](https://www.magnific.com/pricing)；[来源 2](https://www.magnific.com/pricing)；[来源 3](https://www.magnific.com/pricing)；[来源 4](https://www.magnific.com/pricing)

**操作：** valuation_only；等待生产可写与版本复核后执行。

## 29 42lv MiniMax Code 签到双倍积分（9/28–10/7）

完整 ID：`minimax-minimax-code-signin-double-points`。

**管理员决定：** $5.187131

**V2：** 首次连续10天普通签到(8×400+2×1000)=5,200积分；双倍共10,400；额外增量5,200×(¥500/74,900积分)=¥34.71295；¥34.712950600801065 × 0.14942927245572862 USD/CNY = $5.187131

完整权益参考值：$5.187131，单列，不与月度值叠加。

**参照条件：** 从9/28连续签到Day1开始，完成十天；Day4、Day7加码各一次。；假设Code任务签到积分与官方Token Plan加购积分同资源池可替代。；管理员已采纳候选值$5.187131；保留跨Code签到积分与Token Plan加购积分的替代性假设，暂定而不宣称现金。

**价格入口：** [来源 1](https://agent.minimax.cn/docs/changelog)；[来源 2](https://agent.minimax.cn/docs/changelog)；[来源 3](https://platform.minimaxi.com/docs/guides/pricing-token-plan.md)；[来源 4](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** patch；等待生产可写与版本复核后执行。

## 30 85nn MiniMax Token Plan 老用户回馈积分（数额未公布）

完整 ID：`minimax-minimax-token-plan-loyalty-points`。

**管理员决定：** 按无法估值处理

**V2：** 无法可靠折算，所有金额留空，不写零。

**价格入口：** [来源 1](https://agent.minimax.cn/docs/changelog)；[来源 2](https://platform.minimaxi.com/docs/guides/pricing-token-plan.md)

**操作：** patch；等待生产可写与版本复核后执行。

## 31 93yq Mistral 免费计划每月 $10 API 额度（无需信用卡）

完整 ID：`mistral-mistral-free-tier`。

**管理员决定：** $10

**V2：** user-confirmed historical 10 USD/month reference × 1 comparison month = 10 USD

**参照条件：** 用户本轮接受 $10，继续使用已批准旧官方摘录的月度参考口径。；本轮当前官方价格页仅确认 Free 可访问 Studio，未再确认免费计划每月 $10 API 额度的现行发放；因此保持 provisional。；方法使用参考定价而不标为当前已证明官方面额；不按模型数量倍增，不生成长期完整值。

**价格入口：** [来源 1](https://mistral.ai/pricing/)；[来源 2](https://mistral.ai/pricing/)

**操作：** revalue；等待生产可写与版本复核后执行。

## 32 hqgl 模力方舟每日免费调用额度

完整 ID：`moark-gitee-ai-daily-free-tier`。

**管理员决定：** 按无法估值处理

**V2：** 无法可靠折算，所有金额留空，不写零。

**价格入口：** [来源 1](https://ai.gitee.com/docs/getting-started)；[来源 2](https://ai.gitee.com/docs/products/apis/)；[来源 3](https://ai.gitee.com/docs/products/apis/texts/text-generation)

**操作：** value；等待生产可写与版本复核后执行。

## 33 7z3x n8n Cloud 共享网关额度与充值

完整 ID：`n8n-n8n-gateway-credits-shared-balance`。

**管理员决定：** 按无法估值处理

**V2：** 无法可靠折算，所有金额留空，不写零。

**价格入口：** [来源 1](https://blog.n8n.io/gateway-credits/)；[来源 2](https://docs.n8n.io/deploy/use-n8n-cloud/gateway-credits)

**操作：** value；等待生产可写与版本复核后执行。

## 34 f58l OiiOii 邀请好友注册登录奖励200积分

完整 ID：`oiioii-referral-bonus`。

**管理员决定：** 200是指好友注册之后，你的奖励。就按200积分 处理。看官方的最低套餐折算积分的价值

**V2：** 200 inviter credits × ($17 BASE entry monthly price ÷ 1,000 guaranteed subscription credits) = $3.40 per successful invitation

完整权益参考值：$3.4，单列，不与月度值叠加。

**参照条件：** 管理员本次确认邀请人200积分，以其人工决定为权益数量依据；不是模型自行确认官方或亲测。；200只属于邀请人；好友100不相加。已批准基线已经这样表述，无需改who/quantity。；使用最低入门档BASE常规月付$17含保证到账1000积分；附加310签到积分需要额外每日签到，不计套餐保证额度分母。；免费与付费扣费模式可能不同，官方表存在会员/非会员不同积分消耗；此值为跨套餐暂定比较基准，非同等生成量或官方现金面额。；旧权益摘录曾包含好友订阅触发；本次人工作为注册后邀请人奖励处理，未改审批或擅自升级证据。

**价格入口：** [来源 1](https://www.oiioii.ai/price)

**操作：** revalue；等待生产可写与版本复核后执行。

## 35 wnpx Codex 和 ChatGPT Work 额度重置

完整 ID：`openai-openai-codex-chatgpt-work-quota-reset`。

**管理员决定：** 按照GPT的中等订阅套餐（月）➗4 折算

**V2：** ChatGPT Plus 常规月价 20 USD ÷ 4 = 5 USD/本次额度重置参考

完整权益参考值：$5，单列，不与月度值叠加。

**参照条件：** 按 Go、Plus、Pro 三个个人产品系列选择中档 Plus；不把 Pro 的不同用量价档拆成独立套餐后取价格中位。；季度月费基准由管理员指定，不表示本次重置保证能用到对应 Token 数量。

**价格入口：** [来源 1](https://x.com/thsottiaux/status/2078328592308818117)；[来源 2](https://learn.chatgpt.com/docs/pricing)；[来源 3](https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers)

**操作：** revalue；等待生产可写与版本复核后执行。

## 36 ew88 Codex 10月2日全球额度重置执行进度

完整 ID：`openai-openai-codex-global-reset-oct-3-2026`。

**管理员决定：** 这条直接拒掉

**V2：** 无法可靠折算，所有金额留空，不写零。

**价格入口：** [来源 1](https://x.com/thsottiaux/status/2106239912932692085)；[来源 2](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)

**操作：** unpublish；等待生产可写与版本复核后执行。

## 37 ex2n OpenCode Go 订阅：$10/月用 $15–60/月的模型额度

完整 ID：`opencode-opencode-go-subscription`。

**管理员决定：** $10 ，就按它实际支付的月费，买一赠一处理

**V2：** user-approved buy-one-get-one comparison: 1 benchmark month × official Go fee 10 USD/month = 10 USD/month reference; the published model usage limits are not summed

**参照条件：** 按用户本轮“实际支付月费、买一赠一”的选择，以 Go $10/月为一个新增权益的比较基准。；官方文档证明的是正常付费订阅价与每模型用量限制，尚未证明独立额外赠送 $10；估值不改写为该赠额已官方确认。；不把每模型 $15/$30/$60 限额相加，不把旧 $60 区间当真实个人上限；usdMax=null。

**价格入口：** [来源 1](https://opencode.ai/docs/go/)；[来源 2](https://opencode.ai/docs/go/)

**操作：** revalue；等待生产可写与版本复核后执行。

## 38 wgce 基元律动 认证赠18额度

完整 ID：`periodic-periodic-verification-18-bonus`。

**管理员决定：** $2.689727

**V2：** 认证奖励 ¥18 ×1名符合条件领取者 = ¥18；¥18 × 0.14942927245572862 USD/CNY = $2.689727

完整权益参考值：$2.689727，单列，不与月度值叠加。

**参照条件：** 只计18元赠送余额，不计充值本金与满减券。

**价格入口：** [来源 1](https://tokenrhythm.studio/_releases/base/4657068efe670e23d67d63e4e8ef9ecfc5ba48e1/assets/index-CSY7iifb.js)；[来源 2](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** revalue；等待生产可写与版本复核后执行。

## 39 bcot Poe 免费用户每天积分（待实测）

完整 ID：`poe-poe-free-daily-points`。

**管理员决定：** Free — ~300 compute points per day (about 15-30 short messages), lighter models only — cut roughly 90% from ~3,000/day since around March 2026 (Poe’s own help center no longer states an exact figure; the current number is independently corroborated by third-party trackers). ——官网（https://www.usagepricing.com/blueprint/poe ） 所以按照300计算

**V2：** 300 user-adopted free compute points/day × 30 days × [$4.99 entry monthly price ÷ (10,000 paid points/day × 30 days)] = $0.1497

**参照条件：** 300/日来自UsagePricing第三方追踪页，由用户明确接受；不是Poe官方公告或管理员实测，不更新为tested。；以30天按日完全使用为比较窗口，不能把9000点视作一次到账或可结转余额。；官方入门套餐10,000/日，官方FAQ显示月付起价$4.99；本次以此保守入门包费率作为代理。；Free可用机器人范围、逐bot消耗及免费/付费积分等值未完全确认，保持provisional；付费总模型权限不能反推免费权限。

**价格入口：** [来源 1](https://www.usagepricing.com/blueprint/poe)；[来源 2](https://help.poe.com/hc/en-us/articles/19945140063636)；[来源 3](https://poe.com/subscription_plans)

**操作：** revalue；等待生产可写与版本复核后执行。

## 40 ayl0 SeaArt 免费账号每日 130 活力值

完整 ID：`seaart-seaart-free-tier`。

**管理员决定：** 按候选B处理。如果有两种算法，取较低的值 保守计算即可

**V2：** min(candidateA: 130 Stamina/day × 30 days × USD 104.99/month ÷ 135000 purchased Credits/month; candidateB: 130 Stamina/day × 30 days × USD 4.79/month ÷ (300 Stamina/day × 30 days)) = candidateB USD 2.0756666666666668 ≈ USD 2.08

**参照条件：** 管理员指定候选B，并对既有候选A/B取较低值；A约$3.03，B约$2.08，因此选B。；仅使用Beginner每日300 Stamina×30作参照分母；另含4,000月度购买Credits不合并进分母。；Stamina当日有效、不结转；30天每日领取并使用130的历史批准基线不改。；官网表格/FAQ数量及daily login 0的冲突仍保留；本次人工作价不代表改写已批准130/day权益。；同模型可用范围及免费/付费限制可能不同，属于购买参照而非现金或保证省下金额。

**价格入口：** [来源 1](https://www.seaart.ai/mall)；[来源 2](https://www.seaart.ai/mall)；[来源 3](https://www.seaart.ai/mall)；[来源 4](https://www.seaart.ai/mall)；[来源 5](https://www.seaart.ai/mall)

**操作：** valuation_only；等待生产可写与版本复核后执行。

## 41 7f85 阶跃星辰 Studio 额外专属创作额度

完整 ID：`stepfun-stepfun-studio-exclusive-credits`。

**管理员决定：** 按无法估值处理

**V2：** 无法可靠折算，所有金额留空，不写零。

**价格入口：** [来源 1](https://platform.stepfun.com/docs/zh/step-plan/overview)

**操作：** value；等待生产可写与版本复核后执行。

## 42 0622 TapNow 新用户免费 Tapies 额度

完整 ID：`tapnow-tapnow-new-user-tapies`。

**管理员决定：** 就按200÷95=$2.105263

**V2：** 200 Tapies ÷ (95 Tapies/USD) = $2.105263

**参照条件：** 按管理员本轮明确选择官网显示200 Tapies作参考数量；官方条款仍允许按产品、安全和合规检查改变是否发放及数量，不改写为人人保证领取。；使用同站充值汇率95 Tapies/$1，不换用订阅套餐积分单价。

**价格入口：** [来源 1](https://www.tapnow.ai/terms-of-service)；[来源 2](https://www.tapnow.ai/terms-of-service)；[来源 3](https://www.tapnow.ai/terms-of-service)

**操作：** revalue；等待生产可写与版本复核后执行。

## 43 81st 腾讯云智能体开发平台体验版免费试用 1 个月

完整 ID：`tencent-tencent-cloud-free-trial-products`。

**管理员决定：** 按腾讯平台最便宜的文本/编程模型API单价，乘以默认每个月使用量

**V2：** 1,000,000输入Token×¥0.2/M +200,000输出Token×¥2/M =¥0.6；¥0.6×0.14942927245572862=$0.089658

**参照条件：** 按管理员要求以腾讯平台最低正价通用文本/编程模型代理，采用默认30天文本100万输入+20万输出；文本/编程属于同一公开模态，不再叠加一份编程工作量。；排除翻译专用Hy-MT2、embedding、rerank、安全、免费模型、缓存命中与预付资源包；标准量按多次短上下文请求，单次输入≤128K。；官方体验版实际可用模型和配额尚未确认；假定获领体验版可覆盖参考工作量，金额不是试用赠金或该产品订阅价。；采用广州在线未缓存价格，区域/套餐差异不当作同一种权益。

**价格入口：** [来源 1](https://cloud.tencent.com/act/pro/free)；[来源 2](https://cloud.tencent.com/document/product/1823/130055)；[来源 3](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** revalue；等待生产可写与版本复核后执行。

## 44 3nb4 Tinker 研究与开源免费额度

完整 ID：`thinking-machines-tinker-research-grants`。

**管理员决定：** 按无法估值处理

**V2：** 无法可靠折算，所有金额留空，不写零。

**价格入口：** [来源 1](https://thinkingmachines.ai/news/tinker-research-and-teaching-grants/)

**操作：** value；等待生产可写与版本复核后执行。

## 45 zud3 Trae Pro 会员 14 天免费试用

完整 ID：`trae-trae-pro-trial`。

**管理员决定：** 按照首次订阅的$10的一半，即$5处理

**V2：** user-approved half-month convention: historical first-subscription benchmark 10 USD/month × 0.5 = 5 USD for the up-to-14-day Pro trial

完整权益参考值：$5，单列，不与月度值叠加。

**参照条件：** 用户明确选定“首次订阅 $10 的一半即 $5”；采用 0.5 月约定，不改成 $10 × 14/30。；最长 14 天且用量耗尽可提前结束；$5 为所选订阅时间基准，试用美元余额未公开。；旧 Pro $10 与当前 $20 及其用量权益有变化，本轮保留用户选择的历史首次订阅参考价，不声称同版试用余额 $5 已核实。

**价格入口：** [来源 1](https://www.trae.ai/blog/trae_membership_0213)；[来源 2](https://www.trae.ai/blog/trae_membership_0213)

**操作：** revalue；等待生产可写与版本复核后执行。

## 46 ds4t Vidu 注册新人试用 20 积分

完整 ID：`vidu-vidu-signup-bonus`。

**管理员决定：** $0.19

**V2：** 20 signup trial credits × USD 2300/year ÷ (12 months/year × 20000 credits/month) = USD 0.19166666666666668 ≈ USD 0.19

完整权益参考值：$0.19，单列，不与月度值叠加。

**参照条件：** 管理员亲测一次新人注册20积分；不把其当作每月赠额，不另加1次免费生成。；管理员接受Ultimate促销卡20,000/月分母与年付$2,300的较低单位成本候选；同页比较表8,000/月冲突不抹掉。；Free Q4 540p为4积分/秒，付费档2积分/秒，不能将相同积分单位比价宣称为同生成量现金支付价值。；My References每月10个只是素材管理配额，不额外计美元；积分有效期未确认，不套订阅或加购期限。

**价格入口：** [来源 1](https://www.vidu.com/pricing)

**操作：** valuation_only；等待生产可写与版本复核后执行。

## 47 ibur 火山方舟新用户免费推理额度

完整 ID：`volc-volcengine-ark-free-inference-quota`。

**管理员决定：** 按无法估值处理

**V2：** 无法可靠折算，所有金额留空，不写零。

**价格入口：** [来源 1](https://www.volcengine.com/docs/ark/free-inference-quota?lang=zh)；[来源 2](https://www.volcengine.com/docs/ark/free-inference-quota?lang=zh)

**操作：** value；等待生产可写与版本复核后执行。

## 48 usw3 MiMo-V2.5-ASR 语音识别

完整 ID：`xiaomi-mimo-mimo-asr-limited-free`。

**管理员决定：** $0.074/音频小时 × 20小时

**V2：** 20 adopted reference audio hours × $0.074/audio hour (mimo-v2.5-asr official overseas PAYG) = $1.48

**参照条件：** 管理员采用20小时×$0.074=$1.48场景口径；20小时是标准参考用量，不是已确认免费赠送时长。；本轮可读中文官方价页明确mimo-v2.5-asr海外价格$0.074/小时；当前免费的是TTS系列，原ASR免费线索仍无完整免费窗口证据。；该付费价作为人工接受的参考，不据此宣称本条现行免费、官方送20小时或变更tested；原免费版定价/事件缺口仍保留。

**价格入口：** [来源 1](https://mimo.mi.com/docs/zh-CN/price/pay-as-you-go)

**操作：** revalue；等待生产可写与版本复核后执行。

## 49 uyua 小米 MiMo 闲时 0.8 倍算力优惠

完整 ID：`xiaomi-mimo-xiaomi-mimo-off-peak-discount`。

**管理员决定：** 按无法估值处理

**V2：** 无法可靠折算，所有金额留空，不写零。

**价格入口：** [来源 1](https://platform.xiaomimimo.com/token-plan)；[来源 2](https://mimo.mi.com/docs/price/pay-as-you-go)

**操作：** value；等待生产可写与版本复核后执行。

## 50 sx99 智谱 GLM Coding Plan 7 天体验卡

完整 ID：`zhipu-zhipu-glm-coding-plan-7-day-trial-card`。

**管理员决定：** 按照智谱最低套餐的月订阅/4

**V2：** 1张7天体验卡，按管理员最低个人套餐月订阅÷4：Lite ¥118/月÷4=¥29.5；¥29.5×0.14942927245572862 USD/CNY=$4.408164。

完整权益参考值：$4.408164，单列，不与月度值叠加。

**参照条件：** 管理员选择Lite最低个人档常规月价¥118作为参考，使用月价÷4，不采用7/30。；本卡实际套餐档位及历史模型范围仍按原权益/卡片说明；Lite只是估值基准，不反推卡片就是现行Lite。；采用未折扣常规月价，排除包季/包年折扣与首月优惠。；参考价格核验于2026-10-11，汇率取2026-10-09ECB；不是现金赠金或承诺完全等价的套餐。

**价格入口：** [来源 1](https://bigmodel.cn/activity/trial-card/MIIKCBCNJG)；[来源 2](https://bigmodel.cn/glm-coding)；[来源 3](https://www.bigmodel.cn/glm-coding)；[来源 4](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** patch；等待生产可写与版本复核后执行。

## 51 crw5 GLM Coding Plan 7天体验卡（已领完）

完整 ID：`zhipu-zhipu-glm-coding-plan-7-trial-cards-expired`。

**管理员决定：** 按照智谱最低套餐的月订阅/4

**V2：** 1张7天体验卡，按管理员最低个人套餐月订阅÷4：Lite ¥118/月÷4=¥29.5；¥29.5×0.14942927245572862 USD/CNY=$4.408164。

完整权益参考值：$4.408164，单列，不与月度值叠加。

**参照条件：** 管理员选择Lite最低个人档常规月价¥118作为参考，使用月价÷4，不采用7/30。；本卡实际套餐档位及历史模型范围仍按原权益/卡片说明；Lite只是估值基准，不反推卡片就是现行Lite。；采用未折扣常规月价，排除包季/包年折扣与首月优惠。；参考价格核验于2026-10-11，汇率取2026-10-09ECB；不是现金赠金或承诺完全等价的套餐。

**价格入口：** [来源 1](https://bigmodel.cn/activity/trial-card/EEGA0AKYV5)；[来源 2](https://bigmodel.cn/glm-coding)；[来源 3](https://www.bigmodel.cn/glm-coding)；[来源 4](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** patch；等待生产可写与版本复核后执行。

## 52 upa4 ZCode 全体用户领 1 亿 Token（Trust.patch，共 10 万份）

完整 ID：`zhipu-zhipu-zcode-100m-tokens-bonus`。

**管理员决定：** 就按照¥80

**V2：** 管理员指定1亿Token权益人民币参考值¥80；¥80×0.14942927245572862 USD/CNY=$11.954342。

完整权益参考值：$11.954342，单列，不与月度值叠加。

**参照条件：** ¥80是管理员本次直接指定的比较基准，不是官方卡片现金面额。；不把全部Token视为输入Token，不据参考价断言卡片实际模型/输入输出抵扣。；适用模型、使用范围和额度有效期继续以原权益及卡片规则为准。

**价格入口：** [来源 1](https://mp.weixin.qq.com/s/Zia38bgBIcNlAXkA2I9pxw)；[来源 2](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** patch；等待生产可写与版本复核后执行。

## 53 0n2u ZCode 付费用户赠送重置卡（Trust.patch）

完整 ID：`zhipu-zhipu-zcode-reset-cards-benefit`。

**管理员决定：** 按照智谱的中等套餐订阅价格/4 =一张重置卡的价值

**V2：** 管理员逐卡基准：Pro ¥538/月÷4=¥134.5/张≈$20.098237/张；4张周重置卡+4张5小时重置卡=8张，8×¥134.5=¥1,076；¥1,076×0.14942927245572862 USD/CNY=$160.785897。

完整权益参考值：$160.785897，单列，不与月度值叠加。

**参照条件：** 管理员明确指定月价÷4为一张重置卡价值，因此4张周卡与4张5小时卡分别按同一逐卡基准，共计8张。；采用当前Lite/Pro/Max三个个人档的中档Pro常规月价¥538，排除包季/包年及首月折扣。；这里相加的是管理员给8张卡选择的参考价格，不是把周额度池与5小时额度池相加或保证恢复8份独立完整套餐额度。；实际净增额度仍受重置前余额、共享周/5小时限额及卡片生效规则约束；实际Token价值未知，因此暂定，不填usdMax真实上限。；若管理员意图每张卡之外只对一次整组发卡计月价÷4，则整组会是$20.098237；本结果按原话“一张重置卡”推荐逐张总计$160.785897，供主任务确认。

**价格入口：** [来源 1](https://mp.weixin.qq.com/s/Zia38bgBIcNlAXkA2I9pxw)；[来源 2](https://docs.bigmodel.cn/cn/coding-plan/overview)；[来源 3](https://bigmodel.cn/glm-coding)；[来源 4](https://www.bigmodel.cn/glm-coding)；[来源 5](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**操作：** patch；等待生产可写与版本复核后执行。

## 自动录入安排

2026-10-11纽约时间20:10（2026-10-12 00:10 UTC）一次性自动执行。本地53条清单、价格证据、版本基线、相关表备份和可恢复写入脚本保存在 `.wrangler/valuation-v2-20261011/`。脚本已实测：只读保护仍在时返回等待，生产写入0；恢复后核对版本并保存进度，冲突不覆盖。全部完成后通知，未完成项逐条记录。

准备阶段校验：53条唯一ID、40条数值及13条空值全部通过V2合同与公开字段投影；799项测试、11项审核脚本测试、TypeScript检查及网页构建通过。受影响表备份6,623,145字节，未提交私有数据库快照。当时正式API处于只读保护，写入0；之后的实际执行见下方回执。GPT重置的Plus $20/4=$5已获得本聊天明确确认。

## 额度恢复后的生产回执

2026-10-11纽约时间20:10开始核对恢复任务。必要迁移0036–0038完成后，部署V2兼容代码（Worker `0f984c1f-7308-45b8-be6a-4a6bbbf40dfa`），通过正式管理接口执行冻结清单；没有重算已确认基准或批准无关待审。

| 核对项 | 结果 |
|---|---|
| 价格与完整元数据 | 53/53与冻结清单精确一致，D1逐条回读 |
| 数值与空值 | 40条数值参照，13条无价结论；空值未当零 |
| 公开接口 | 51条仍公开的记录与公开投影一致；两条撤下不再公开 |
| Hugging Face旧免费赠额 | 已unpublish，reviewState=rejected |
| Codex执行进度条目 | 已unpublish，reviewState=rejected |
| Lovart每天70积分 | 已withdraw并保留approved历史，withdrawnAt=2026-10-12T00:25:29.581Z；未猜实际截止日 |
| c232→510k | 价格null已保存；逻辑合并尚未执行，不能以删除、强制改表或撤下副本代替 |

公开接口的4条智谱记录受缓存延迟影响，后续读回已全部一致。实际网页核验确认医疗申请显示月度使用方案参考约$30.48，和完整申请上限分开；无价申请保留卡片。只读快照已从当前批准的公开接口刷新，未将私有备份上传。

合并阻塞是现有受控流程缺少历史产品校正及字段裁决能力：c232仍归Devin，510k已归Windsurf；现有接口不接受跨产品校正，也不能表达保留主条目字段和限定历史被拒更新的作用域。用户已决定同事件、保留510k、金额null，不需要重复询问这些决定。保留了精确预览及两边历史，没有绕过拒绝。

完整逐条写入进度与核验凭证保存在忽略目录 `.wrangler/valuation-v2-20261011/` 的 `apply-progress.json`、`auto-d1-validation.json` 和 `public-latest.json`。线上自动计算的部署与真实agent验收另记回执。
