# 美元估值 V1 管理员研判清单

日期：2026-10-10（America/New_York）。范围只包含本轮核查过的已上架记录。本清单的候选算式不能直接作为生产美元值；不确定条目的美元字段留空，原始权益与审批状态保留。

共有 53 条需要研判。答复可用短码或完整 ID；同意保留未知、补充同规格价格/账号权益证据、确认主条目与适用期限，分别记录。没有价格证据时，选择一个候选数字本身不能替代核价依据。

## 待研判条目

### 1 81p6 Adobe Photoshop 印度学生首年免费12个月

完整 ID：`adobe-firefly-adobe-photoshop-india-student-free-year`。 [网站详情](https://ai-yangmao.com/#offer-adobe-firefly-adobe-photoshop-india-student-free-year)

**现存疑问：** 保留批准权益，不用现行CC Pro不同产品价格覆盖；需原GEN_IN_PSSTUDENT官方结账条款或对应Photoshop购买原价。；即使后续确认₹1999年价，首30天只能按对应月段，不把完整年价值直接写首30天。

**核查结论：** 权益估值V1逐条复核；实时官方专用URL正文是₹398.99/月的20+应用CC Pro学生付费方案，未显示一年免费Photoshop和₹1999年度购买价。人工历史显示所谓官方摘录沿用了媒体文字，不能把₹1999续费价当作已核实官方赠送价值。；研判：保留批准权益，不用现行CC Pro不同产品价格覆盖；需原GEN_IN_PSSTUDENT官方结账条款或对应Photoshop购买原价。；即使后续确认₹1999年价，首30天只能按对应月段，不把完整年价值直接写首30天。

**候选算式仅供研判：** first30SubscriptionValue = verifiedEquivalentPhotoshopPriceFor30Days; fullValue = verifiedEquivalentAnnualPrice; dedicated promotional price evidence not found

**核查入口：** [来源 1](https://www.adobe.com/in/education/students/photoshop.html)

**你的结论或补充证据：** 待填写。

### 2 hacu 阿里云百炼新人免费额度

完整 ID：`aliyun-aliyun-bailian-new-user-free-tier`。 [网站详情](https://ai-yangmao.com/#offer-aliyun-aliyun-bailian-new-user-free-tier)

**现存疑问：** 需要保留旧权益并确定批准时/本次比较采用的完整免费模型与逐模型quota清单。；独立赠额可完整核算，但首30天场景总量仍不能在所有模型分别重复计算。；当前官方表同时含无免费额度模型与快照别名；需要明确候选清单后再算中位，不能旧63/所有导航模型都算免费。；旧usdMax=89不是确定权益最高档，建议估值结果置空，保留旧金额在approvedBaseline。

**核查结论：** 权益估值V1逐条复核；原$26/$89是不同模型/模态累加的旧估值，不是真实赠送金额范围，必须清除范围语义。批准models为空且额度只有“通常100万”，历史63模型逐项额度清单、别名/快照归组和IO用量未保留；当前多模态价格表不能证明旧批准清单。虽能核到精确例价，仍不能选少数新型号冒充完整中位基准或据此填整包金额。；研判：需要保留旧权益并确定批准时/本次比较采用的完整免费模型与逐模型quota清单。；独立赠额可完整核算，但首30天场景总量仍不能在所有模型分别重复计算。；当前官方表同时含无免费额度模型与快照别名；需要明确候选清单后再算中位，不能旧63/所有导航模型都算免费。；旧usdMax=89不是确定权益最高档，建议估值结果置空，保留旧金额在approvedBaseline。

**候选算式仅供研判：** 无可复算的美元金额

**核查入口：** [来源 1](https://help.aliyun.com/zh/model-studio/new-free-quota)；[来源 2](https://help.aliyun.com/zh/model-studio/model-pricing)

**你的结论或补充证据：** 待填写。

### 3 yf7p 海纳百川计划：医疗机构可申请免费 Baichuan-M3 Plus API

完整 ID：`baichuan-baichuan-m3plus-api-free`。 [网站详情](https://ai-yangmao.com/#offer-baichuan-baichuan-m3plus-api-free)

**现存疑问：** 仅有获准后的标准医疗文本场景成本，未公布实际申请赠额或上限，不能将场景成本当最高资助额。；免费计划是否覆盖完整标准用量及医疗搜索需准入协议；无公开固定保底/申请最高额。；获批额度只作为申请参考上限，不表示保证可领。；仅有获准后的标准医疗文本场景成本，未公布实际申请赠额或上限，不能将场景成本当最高资助额。

**核查结论：** 权益估值V1逐条复核；同版本M3-Plus有官方付费价，采用标准文本用量；永久免费不换算永久总值。该数是通过准入后的模型用量参考，不是确定现金资助或全部医疗服务价值。；研判：免费计划是否覆盖完整标准用量及医疗搜索需准入协议；无公开固定保底/申请最高额。；获批额度只作为申请参考上限，不表示保证可领。

**候选算式仅供研判：** 标准文本(1,000,000输入÷1,000×¥0.005)+(200,000输出÷1,000×¥0.009)=¥6.8/30天；¥6.8 × 0.14942927245572862 USD/CNY = $1.016119

**未采纳的候选金额：** $1.016119。

**核查入口：** [来源 1](https://www.baichuan-ai.com/?new_locale=zh-cn)；[来源 2](https://platform.baichuan-ai.com/prices)；[来源 3](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**你的结论或补充证据：** 待填写。

### 4 248m Hogee 数字员工免费体验

完整 ID：`baidu-baidu-hogee-digital-employees-free-trial`。 [网站详情](https://ai-yangmao.com/#offer-baidu-baidu-hogee-digital-employees-free-trial)

**现存疑问：** 需可读积分购买页或账户只读价格，不能把GEO套餐或千帆模型单价充当Hogee积分价。；当前发放200积分原文尚未在本轮渲染页复现，不认定已停止。

**核查结论：** 权益估值V1逐条复核；保留批准的每日200积分原单位，并记录30天6,000；当前官网Jina与直抓只有脚本壳，官方资产重试连接超时，检索到的GEO优化套餐与数字员工积分并不相同。未取得对应积分官方售价，继续待查。；研判：需可读积分购买页或账户只读价格，不能把GEO套餐或千帆模型单价充当Hogee积分价。；当前发放200积分原文尚未在本轮渲染页复现，不认定已停止。

**候选算式仅供研判：** 200 积分/日×30日=6,000积分；Hogee同积分购买单价未知，不能从数字员工收费或其他百度产品套价

**核查入口：** [来源 1](https://hogee.baidu.com/hogee/employee/explore)；[来源 2](https://hogee-web.cdn.bcebos.com/hogee/static/js/index.5f8aa87b.js)

**你的结论或补充证据：** 待填写。

### 5 626n SWE-2 Free 桌面端与命令行限时免费

完整 ID：`devin-devin-swe2-desktop-cli-free`。 [网站详情](https://ai-yangmao.com/#offer-devin-devin-swe2-desktop-cli-free)

**现存疑问：** 两份官方页面免费截止相差一天；确切活动起始及SWE-2 Free与SWE-2模型标识需确认。；45美元仅是完整30天参考工作量成本，未作为本条赠额；剩余或历史覆盖时长没有擅猜。

**核查结论：** 权益估值V1逐条复核；SWE-2原厂已公布限免结束后的输入3美元/M、输出15美元/M，因此不是未定价；但当前模型文档写through October15，价格页与已批准记录写through October16，并且活动起始未给。无法在冲突未解决时确定短期覆盖天数，保留金额空值并交裁定。；研判：两份官方页面免费截止相差一天；确切活动起始及SWE-2 Free与SWE-2模型标识需确认。；45美元仅是完整30天参考工作量成本，未作为本条赠额；剩余或历史覆盖时长没有擅猜。

**核查入口：** [来源 1](https://devin.ai/pricing)；[来源 2](https://docs.devin.ai/desktop/models)

**你的结论或补充证据：** 待填写。

### 6 c232 Windsurf 平台 Claude Opus 4.6 (fast mode) 积分倍率优惠

完整 ID：`devin-devin-windsurf-claude-opus-46-fast`。 [网站详情](https://ai-yangmao.com/#offer-devin-devin-windsurf-claude-opus-46-fast)

**现存疑问：** 缺同版正常扣积分倍率/适用积分美元购买单价与可覆盖用量；现行usage-quota价格不可反推历史积分优惠。；同一发放事件已有另一条approved记录，需要管理员判断是否合并；本轮保持状态。

**核查结论：** 权益估值V1逐条复核；Claude Opus 4.6 fast mode的历史优惠是扣积分倍率，仍需消费原有积分。官方公告给促销倍率，未给同服务正常倍率、赠送积分或固定请求预算；所以不能从现行模型Token单价计算这次实际节省。 此条与devin-devin-windsurf-claude-opus-46-fast-promotional-pricing共享相同公告、倍率及窗口，疑似同一权益重复入库。；研判：缺同版正常扣积分倍率/适用积分美元购买单价与可覆盖用量；现行usage-quota价格不可反推历史积分优惠。；同一发放事件已有另一条approved记录，需要管理员判断是否合并；本轮保持状态。

**核查入口：** [来源 1](https://devin.ai/blog/opus-46-fast)

**你的结论或补充证据：** 待填写。

### 7 mdaj 豆包工作客户端下载 30 天订阅体验

完整 ID：`doubao-work-30-day-trial`。 [网站详情](https://ai-yangmao.com/#offer-doubao-work-30-day-trial)

**现存疑问：** 来源渲染未获取订阅条款；需账号/可读官方页面提供体验套餐对应档位、领取对象和批次。

**核查结论：** 权益估值V1逐条复核；保留批准的30天订阅事实；当前官方主页直抓、Jina与pricing路径均只返回脚本壳，不能确认对应套餐档位。；研判：来源渲染未获取订阅条款；需账号/可读官方页面提供体验套餐对应档位、领取对象和批次。

**候选算式仅供研判：** 30天订阅体验×同档会员月价；领取权益对应套餐档位未确认，不能用任意付费档顶替

**核查入口：** [来源 1](https://www.doubao.com/work)

**你的结论或补充证据：** 待填写。

### 8 gvew Dreamina 每日免费额度

完整 ID：`dreamina-dreamina-daily-free-credits`。 [网站详情](https://ai-yangmao.com/#offer-dreamina-dreamina-daily-free-credits)

**现存疑问：** 地区页面价格币种和积分单位不同，尚未证实免费积分与所用付费费率同单位，暂不填。；Jina返回USD，web同URL返回MYR且积分数量约4倍；地区计费单位需账户核对，不跨地区换算积分。；公开价表未给可核加购价或完整年付组合；本值仅按已抓到的正常续费月档最低费率，保留暂定。；官方九月促销窗口截至2026-10-09 23:59 UTC+8，抓取已过该时点；不沿用首月促销费率。

**核查结论：** 权益估值V1逐条复核；按官方120/日固定积分，而非图片或视频场景叠加；当前可核美元常规续费月档最低单位价为Ultra $520/59000，30天3600积分比价约$31.73。过期的Basic首月$1.50活动不用于当前基准。；研判：地区页面价格币种和积分单位不同，尚未证实免费积分与所用付费费率同单位，暂不填。；Jina返回USD，web同URL返回MYR且积分数量约4倍；地区计费单位需账户核对，不跨地区换算积分。；公开价表未给可核加购价或完整年付组合；本值仅按已抓到的正常续费月档最低费率，保留暂定。；官方九月促销窗口截至2026-10-09 23:59 UTC+8，抓取已过该时点；不沿用首月促销费率。

**候选算式仅供研判：** 120 credits/day × 30 days × USD 520/renewal month ÷ 59000 credits/month

**未采纳的候选金额：** $31.73。

**核查入口：** [来源 1](https://dreamina.capcut.com/ai-video/free-image-to-video-generator-credits-faq)；[来源 2](https://dreamina.capcut.com/pricing/dreamina-price)

**你的结论或补充证据：** 待填写。

### 9 v51t ElevenLabs 创业扶持计划

完整 ID：`elevenlabs-elevenlabs-api-startup-grants`。 [网站详情](https://ai-yangmao.com/#offer-elevenlabs-elevenlabs-api-startup-grants)

**现存疑问：** 需获批计划的具体模型名单和版本、API/UI或Agents使用方式；需确认3300万字符是否为TTS直接字符池、以credits统一折算还是多Voice AI能力的等效宣传单位；需各适用模型同规格现行付费价及池扣费规则，才能建立去重候选集和默认成本中位；首30天可获得额度/分期释放未确认，不能将3300万除12或视为全部首月释放；不同模型价格范围不等于申请赠额美元上下限；申请状态不自动产生USD上限

**核查结论：** 官方页确认申请制12个月3300万字符权益，并描述full platform，但未给本资助的明确授权模型版本及各模态扣池规则。API价0.04与0.08美元/千字符是不同模型购买价，不能构造本资助真实获批美元范围；2640不是官方承诺的美元申请上限。共池必须只选择已确认适用、同规格模型的成本中位基准，当前候选集不具备，原1320/2640及完整美元值均撤回。

**候选算式仅供研判：** No valid USD formula: eligible models, shared-pool conversion and first30 release are not matched

**核查入口：** [来源 1](https://elevenlabs.io/startup-grants)；[来源 2](https://elevenlabs.io/pricing/api)；[来源 3](https://elevenlabs.io/docs/overview/administration/pay-as-you-go)

**你的结论或补充证据：** 待填写。

### 10 7tpm ElevenLabs 免费版

完整 ID：`elevenlabs-elevenlabs-free-tier`。 [网站详情](https://ai-yangmao.com/#offer-elevenlabs-elevenlabs-free-tier)

**现存疑问：** 需要Free层当前PAYG兑换率和UI/API使用方式；需要实际免费可用模型、版本及每次消耗的精确规则，不能用approximate通用TTS消耗推定全部模型；若采用Business购买参照，必须证明同模型同版本同模式单位权益一致及价格适用，当前缺证明

**核查结论：** Free每月10000共享积分是已批准事实，但官方新PAYG按套餐各有积分兑美元率、API与UI价不同，尚未证实Free赠额与Business年付600万积分能按同资源同规格互换。Business套餐含其他功能，825/600万也不是已匹配的Free赠额购买价；先前1.38美元不得继续保留为暂定。

**候选算式仅供研判：** No valid USD formula: Free credits lack an applicable matched credit/USD or model/usage price

**核查入口：** [来源 1](https://elevenlabs.io/v4)；[来源 2](https://elevenlabs.io/docs/overview/administration/pay-as-you-go)；[来源 3](https://elevenlabs.io/pricing)；[来源 4](https://help.elevenlabs.io/hc/en-us/articles/24351324241937-What-is-the-price-for-usage-based-billing)

**你的结论或补充证据：** 待填写。

### 11 qm8n ElevenLabs Creator 及以上：Eleven v4 限时额外 2 倍 TTS 用量（至 10/12）

完整 ID：`elevenlabs-elevenlabs-v4-creator-plus-triple-credits`。 [网站详情](https://ai-yangmao.com/#offer-elevenlabs-elevenlabs-v4-creator-plus-triple-credits)

**现存疑问：** 需要各会员档位实际monthly TTS quota，不能自动等同全模态共享积分余额；需要Eleven v4 web/mobile同版本计费规格和积分消耗规则；需要各适用档位UI购买/加购价格，或明确证明可以使用同规格替代购买价格；API rate不适用；不能以整套餐售价倍数代替特定额外TTS权益

**核查结论：** 活动只覆盖Creator及以上在web/mobile使用v4的额外最多2倍TTS用量，不含API。Creator242000积分跨套Business率33.28缺同单位证明；Business1650也由完整多功能年套餐价格分摊，未证明为当前UI TTS配额对应购买价。不同档位兑换率与channel未匹配，先前两端数字全部撤回，不构造金额区间。

**候选算式仅供研判：** No valid USD formula: match each eligible tier and v4 web/mobile TTS consumption to its applicable price first

**核查入口：** [来源 1](https://elevenlabs.io/pricing)；[来源 2](https://elevenlabs.io/docs/overview/administration/pay-as-you-go)；[来源 3](https://help.elevenlabs.io/hc/en-us/articles/24351324241937-What-is-the-price-for-usage-based-billing)

**你的结论或补充证据：** 待填写。

### 12 echh Gemini Enterprise Plus 版 30 天免费试用

完整 ID：`gcloud-gcloud-gemini-enterprise-plus-free-trial`。 [网站详情](https://ai-yangmao.com/#offer-gcloud-gcloud-gemini-enterprise-plus-free-trial)

**现存疑问：** 两个猜测pricing路径分别404/无价格正文；主产品页与官方FAQ无可复算Plus单独价格；需官方销售报价或账户价格

**核查结论：** 权益估值V1逐条复核；Plus30天试用事实可确认；本轮未取得Plus版本单独、对应计费周期的官方月价，搜索索引Standard/Plus起价无法确认属于Plus。继续留空，不以其他企业会员或API模型成本代替该会员权益。；研判：两个猜测pricing路径分别404/无价格正文；主产品页与官方FAQ无可复算Plus单独价格；需官方销售报价或账户价格

**候选算式仅供研判：** 30 days of Gemini Enterprise Plus; exact Plus per-seat monthly reference price not obtained

**核查入口：** [来源 1](https://cloud.google.com/free)；[来源 2](https://cloud.google.com/gemini-enterprise)

**你的结论或补充证据：** 待填写。

### 13 0vec Gemini Enterprise 商业版 30 天免费试用

完整 ID：`gcloud-gemini-enterprise-business-free-trial`。 [网站详情](https://ai-yangmao.com/#offer-gcloud-gemini-enterprise-business-free-trial)

**现存疑问：** 官网starting每席价未确认是否适用于试用要求的月付档，暂不以年付或起步价代替。；试用要求月付，官网21起未显示明确计费期限；实际monthly price需结账核实

**核查结论：** 权益估值V1逐条复核；按Business官方公开每席位月价21美元起作单席首月参考，5席团队上限105分开记录；不同模型不叠加，不把团队上限算作个人价值。；研判：官网starting每席价未确认是否适用于试用要求的月付档，暂不以年付或起步价代替。；试用要求月付，官网21起未显示明确计费期限；实际monthly price需结账核实

**候选算式仅供研判：** 1 seat × 21 USD/seat/month = 21 USD; team trial up to 5 seats × 21 = 105 USD reference

**未采纳的候选金额：** $21。

**核查入口：** [来源 1](https://cloud.google.com/gemini-enterprise/business)；[来源 2](https://support.google.com/g/answer/16551831?hl=en)

**你的结论或补充证据：** 待填写。

### 14 t3qi Genspark 免费账号每日额度

完整 ID：`genspark-genspark-free-tier`。 [网站详情](https://ai-yangmao.com/#offer-genspark-genspark-free-tier)

**现存疑问：** 存在未公布的终身积分上限，无法确认首30天能得到3000积分，暂不填。；lifetime_free_credit_cap_undisclosed；package_ratio_includes_other_features；all_credit_tiers_not_publicly_priced

**核查结论：** 权益估值V1逐条复核；当前公开套餐最低可核单位率是年付Pro $2399.99/12/125000，每30天3000免费积分条件参考值约$4.80。Free终身上限未公开，已用完上限则停发，不能承诺所有账号实际拿满或永久每月发放。；研判：存在未公布的终身积分上限，无法确认首30天能得到3000积分，暂不填。；lifetime_free_credit_cap_undisclosed；package_ratio_includes_other_features；all_credit_tiers_not_publicly_priced

**候选算式仅供研判：** 100 credits/day ×30 days × min((239.99 USD/year /12)/10000 credits,(2399.99 USD/year/12)/125000 credits,24.99/10000,249.99/125000) USD/credit = 4.79998 USD (conditional on 3000 remaining lifetime credits)

**未采纳的候选金额：** $4.8。

**核查入口：** [来源 1](https://www.genspark.ai/helpcenter/membership-plans)；[来源 2](https://www.genspark.ai/helpcenter/credits-guide)

**你的结论或补充证据：** 待填写。

### 15 niro Hugging Face 免费用户每月 $0.10（仅限 Inference Providers）

完整 ID：`hf-huggingface-free-user-monthly-credits`。 [网站详情](https://ai-yangmao.com/#offer-hf-huggingface-free-user-monthly-credits)

**现存疑问：** 旧evidence与已批准valueText冲突；2026-10-09 pipeline已把金额改为0。；现行免费用户无月赠额，历史$0.10适用期间未确认。

**核查结论：** 权益估值V1逐条复核；已批准公开值已写Free Users None，现官网亦确认无免费用户月赠额；旧证据摘录仍为$0.10。没有现行赠送权益可估，需裁定历史条目如何展示而非将未知当$0。；研判：旧evidence与已批准valueText冲突；2026-10-09 pipeline已把金额改为0。；现行免费用户无月赠额，历史$0.10适用期间未确认。

**候选算式仅供研判：** 无可复算的美元金额

**核查入口：** [来源 1](https://huggingface.co/docs/inference-providers/pricing)

**你的结论或补充证据：** 待填写。

### 16 df8o Higgsfield 付费会员积分补足（9月29–30日历史活动）

完整 ID：`higgsfield-higgsfield-credit-reset`。 [网站详情](https://ai-yangmao.com/#offer-higgsfield-higgsfield-credit-reset)

**现存疑问：** 个人可领金额取决于原余额和套餐月额，缺少统一非零下限。；统一比较金额不得仅填个人非保底最大可能额；100美元只为内部可能上限，不计价排行。

**核查结论：** 权益估值V1逐条复核；历史补足权益数量依套餐与原余额变化。可核价真实额外上限100美元，但没有保底个人下限，不能把整个月额或2000当人人赠额。；研判：个人可领金额取决于原余额和套餐月额，缺少统一非零下限。；统一比较金额不得仅填个人非保底最大可能额；100美元只为内部可能上限，不计价排行。

**候选算式仅供研判：** incrementalBonus = min(max(planMonthlyCredits-currentBalance,0),2000 credits); upperValue = 2000/20 = 100 USD; recipient lowerValue unknown

**核查入口：** [来源 1](https://higgsfield.ai/creator-hub/changelog)；[来源 2](https://higgsfield.ai/blog/new-ai-influencer)

**你的结论或补充证据：** 待填写。

### 17 asus Higgsfield Seedance 2.5 新用户24小时免费试用

完整 ID：`higgsfield-higgsfield-new-user-trial`。 [网站详情](https://ai-yangmao.com/#offer-higgsfield-higgsfield-new-user-trial)

**现存疑问：** 8秒与15秒视频档扣点及日期不同，20秒试用规格缺精确匹配价，不能线性延长不同档报价。；8月14日ChatGPT教程举例1080p/15秒270积分，与9月11日72/8秒价格有差异，暂定并记录日期。；完整5×20秒最大权益缺同档20秒当前扣点，fullValue留空。

**核查结论：** 权益估值V1逐条复核；24小时仅覆盖标准20秒生成量；按较新9月11日官方1080p8秒72积分及现行最低年付积分费率，暂定5.94美元，低于100秒免费上限；完整最大价值仍缺20秒当前扣点。；研判：8秒与15秒视频档扣点及日期不同，20秒试用规格缺精确匹配价，不能线性延长不同档报价。；8月14日ChatGPT教程举例1080p/15秒270积分，与9月11日72/8秒价格有差异，暂定并记录日期。；完整5×20秒最大权益缺同档20秒当前扣点，fullValue留空。

**候选算式仅供研判：** min(600sec×1/30,5×20sec)=20sec;20/8×72credits×(99/3000 USD/credit)=5.94USD

**未采纳的候选金额：** $5.94。

**核查入口：** [来源 1](https://higgsfield.ai/creator-hub/changelog)；[来源 2](https://higgsfield.ai/blog/credits-vs-unlimited-ai-video-generation)；[来源 3](https://higgsfield.ai/blog/new-ai-influencer)

**你的结论或补充证据：** 待填写。

### 18 c93n Scale 团队方案无限模型升级

完整 ID：`higgsfield-higgsfield-scale-plan-unlimited`。 [网站详情](https://ai-yangmao.com/#offer-higgsfield-higgsfield-scale-plan-unlimited)

**现存疑问：** 不能把All Unlimited个人档图像2K上限未经证据嫁接到Scale团队公告。；按单个符合条件领取者或团队共享窗的归属也需明确，不把5–15人乘成个人权益。

**核查结论：** 权益估值V1逐条复核；现行Scale官方公告确认7天和两个图像模型，但没有该团队福利的免费分辨率/质量上限。同模型原厂2K价已查到，可给条件算式2.10美元；缺实际免费规格时不写入比较值。；研判：不能把All Unlimited个人档图像2K上限未经证据嫁接到Scale团队公告。；按单个符合条件领取者或团队共享窗的归属也需明确，不把5–15人乘成个人权益。

**候选算式仅供研判：** conditional2KimageScenario:100×7/30×lowerMedian([Seedream5Pro:.09,NanoBananaPro:.1344])=2.10 USD; Scale free output/quality ceiling not stated in official Scale release

**核查入口：** [来源 1](https://higgsfield.ai/creator-hub/changelog)；[来源 2](https://docs.byteplus.com/en/docs/ModelArk/1544106)；[来源 3](https://ai.google.dev/gemini-api/docs/pricing)

**你的结论或补充证据：** 待填写。

### 19 yn2q Higgsfield 免费 Seedance 2.0 4K 生成

完整 ID：`higgsfield-higgsfield-seedance-2-0-free-4k`。 [网站详情](https://ai-yangmao.com/#offer-higgsfield-higgsfield-seedance-2-0-free-4k)

**现存疑问：** 需Seedance2.0 Standard原生4K、带/不带音频及参考输入的精确收费档。；免费专页活动整体截止与原11天套餐活动不同，不能自动将11天覆盖套免费专页。

**核查结论：** 权益估值V1逐条复核；已查同平台API目录和Seedance2.0定价文。API目录虽写模型可4K，但单价未标分辨率，页面请求示例为720p；定价文又明确分辨率影响费用，不能把通用0.1407/秒或720p扣点当确证4K售价。；研判：需Seedance2.0 Standard原生4K、带/不带音频及参考输入的精确收费档。；免费专页活动整体截止与原11天套餐活动不同，不能自动将11天覆盖套免费专页。

**候选算式仅供研判：** 600 generated seconds/30 days × exactSeedance2Standard4KPricePerSecond; exact 4K price not confirmed

**核查入口：** [来源 1](https://higgsfield.ai/blog/seedance-4k-unlimited-11-days)；[来源 2](https://higgsfield.ai/higgsfield-api)

**你的结论或补充证据：** 待填写。

### 20 iaqq 华为云码道限时每日领取1000万Tokens（4款福利模型）

完整 ID：`huaweicloud-huawei-cloud-madao-glm-5-3-flash-free-tokens`。 [网站详情](https://ai-yangmao.com/#offer-huaweicloud-huawei-cloud-madao-glm-5-3-flash-free-tokens)

**现存疑问：** 其中0731候选的FP8服务规格未与免费服务确认匹配，会影响成本中位数；先保留全部候选供研判，不把不匹配价格纳入正式金额。；四款虽均有同版价，但华为0731服务量化规格未公布，对默认中位数候选的可比性仍有条件，暂定。

**核查结论：** 权益估值V1逐条复核；所有四款共享每日10M Token，首30天额度足以覆盖标准编程11M Token。只计算选定成本中位模型GLM5.3Flash，不把300M按全部输入价或四个模型全算。；研判：其中0731候选的FP8服务规格未与免费服务确认匹配，会影响成本中位数；先保留全部候选供研判，不把不匹配价格纳入正式金额。；四款虽均有同版价，但华为0731服务量化规格未公布，对默认中位数候选的可比性仍有条件，暂定。

**候选算式仅供研判：** 四款模型编程-v1成本排序：DS4Flash0731(DeepInfra FP8) $0.78、GLM5.3Flash¥10.8、DS4.1Flash峰时¥28、DS4Pro0813峰时¥117；偶数中位取较低GLM；10M输入×¥0.8/M+1M输出×¥2.8/M=¥10.8；¥10.8 × 0.14942927245572862 USD/CNY = $1.613836

**未采纳的候选金额：** $1.613836。

**核查入口：** [来源 1](https://support.huaweicloud.com/offers-codeartsagent/codeartsagent_offers_0001.html)；[来源 2](https://bigmodel.cn/pricing)；[来源 3](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)；[来源 4](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-flash-0731/endpoints)；[来源 5](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**你的结论或补充证据：** 待填写。

### 21 ti6o 果办OfficeAce 首次注册登录赠送4000积分

完整 ID：`huaweicloud-huawei-cloud-officeace-free-points`。 [网站详情](https://ai-yangmao.com/#offer-huaweicloud-huawei-cloud-officeace-free-points)

**现存疑问：** 本条4000注册礼与另条4000注册+500体验奖励重叠；为避免统计重复，保留完整4500条估值，本条暂待合并裁定。；与另一OfficeAce记录共享同一4,000注册奖励，合计不得重复；建议保留主活动，另条仅500增量或合并由主代理处理。

**核查结论：** 权益估值V1逐条复核；无公开积分加购价，取个人各套餐最低单位费率标准版¥98/2,000。保留批准的原始权益，500基础积分不过期不扩展到4,000注册礼。；研判：本条4000注册礼与另条4000注册+500体验奖励重叠；为避免统计重复，保留完整4500条估值，本条暂待合并裁定。；与另一OfficeAce记录共享同一4,000注册奖励，合计不得重复；建议保留主活动，另条仅500增量或合并由主代理处理。

**候选算式仅供研判：** 4,000 积分 × (¥98 /2,000 积分) = ¥196；¥196.0 × 0.14942927245572862 USD/CNY = $29.288137

**未采纳的候选金额：** $29.288137。

**核查入口：** [来源 1](https://www.huaweicloud.com/product/officeace.html)；[来源 2](https://support.huaweicloud.com/price-officeace/officeace_05_0003.html)；[来源 3](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**你的结论或补充证据：** 待填写。

### 22 dh9i 即梦国内版每日登录送积分

完整 ID：`jimeng-jimeng-cn-daily-login-points`。 [网站详情](https://ai-yangmao.com/#offer-jimeng-jimeng-cn-daily-login-points)

**现存疑问：** 每日赠送量随账号变化，现条目没有可普遍保证数量。；免费模型不能用Seedance2.0 VIP，不按付费模型输出成本补估。

**核查结论：** 权益估值V1逐条复核；当前官方国内套餐有单价，但赠送数量只知管理员20与66两个账号样本，不是所有领取者的保证范围；不能伪造单人下限或上限。；研判：每日赠送量随账号变化，现条目没有可普遍保证数量。；免费模型不能用Seedance2.0 VIP，不按付费模型输出成本补估。

**核查入口：** [来源 1](https://jimeng.jianying.com/)；[来源 2](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**你的结论或补充证据：** 待填写。

### 23 mec1 可灵国内版每月 128 灵感值 + 视频体验包

完整 ID：`kling-kling-cn-monthly-free-pack`。 [网站详情](https://ai-yangmao.com/#offer-kling-kling-cn-monthly-free-pack)

**现存疑问：** 当前国内会员价未公开渲染；不采用国际站、API或2024旧会员价格。；附加体验和积分可能共享，未确定规格/耗用不得相加。

**核查结论：** 权益估值V1逐条复核；每月128灵感值已由管理员确认，但国内产品当前单价与附加3次生成/2次延长是否共享同一池尚未核定；2024原厂会员价格不能充当2026现价。；研判：当前国内会员价未公开渲染；不采用国际站、API或2024旧会员价格。；附加体验和积分可能共享，未确定规格/耗用不得相加。

**核查入口：** [来源 1](https://klingai.kuaishou.com/)

**你的结论或补充证据：** 待填写。

### 24 291d Lovable 每日构建积分（Free每月最多30）

完整 ID：`lovable-lovable-free-daily-build-credits`。 [网站详情](https://ai-yangmao.com/#offer-lovable-lovable-free-daily-build-credits)

**现存疑问：** Free 积分美元费率未公布或未核得。；需证明赠额与参照购买积分覆盖同一模型、模式及相同资源量，不能仅凭同名 credit 跨套餐套价。

**核查结论：** 官方明确不同套餐的 credit 代表不同美元价值；同一工作区的统一账本不能证明 Free 与 Pro/Business 的积分面值相同。Free 构建/邀请赠额未核得适用的美元费率或同规格兑换关系，撤回跨用 Pro 单价的候选金额，保留真实赠额与审批。

**核查入口：** [来源 1](https://docs.lovable.dev/introduction/credits-and-usage)

**你的结论或补充证据：** 待填写。

### 25 da07 Lovable 免费版每月 AI 服务额度

完整 ID：`lovable-lovable-free-monthly-ai-credits`。 [网站详情](https://ai-yangmao.com/#offer-lovable-lovable-free-monthly-ai-credits)

**现存疑问：** Free_plan_USD_per_credit_not_published_in_reviewed_sources；cross_plan_credit_value_not_uniform；AI_gateway_only_grant_cannot_be_spent_on_build_or_Cloud；no_separate_USD_face_value_or_Free_AI_topup_price_found

**核查结论：** 官方确认当前使用统一credit账本：AI赠额先用于AI gateway，耗尽后由通用credits承担；Pro加购积分也可支付AI，并非build-only。但官方明确Pro与Business的credit代表不同美元价值，只有付费套餐美元换算表，未公布Free的credit美元率或Free 4 AI credits与Pro 4 credits覆盖同等底层AI成本的明确对应。原$1.20跨用了Pro加购单价，故本次作为Free默认条目最终金额留空等待单位对应核实，不把同账本等同于跨套餐同美元单位。

**核查入口：** [来源 1](https://docs.lovable.dev/introduction/credits-and-usage)

**你的结论或补充证据：** 待填写。

### 26 l93u Lovable 邀请奖励：好友注册10积分、首次付费后邀请人100积分

完整 ID：`lovable-lovable-referral-free-credits`。 [网站详情](https://ai-yangmao.com/#offer-lovable-lovable-referral-free-credits)

**现存疑问：** Free 积分美元费率未公布或未核得。；需证明赠额与参照购买积分覆盖同一模型、模式及相同资源量，不能仅凭同名 credit 跨套餐套价。

**核查结论：** 官方明确不同套餐的 credit 代表不同美元价值；同一工作区的统一账本不能证明 Free 与 Pro/Business 的积分面值相同。Free 构建/邀请赠额未核得适用的美元费率或同规格兑换关系，撤回跨用 Pro 单价的候选金额，保留真实赠额与审批。

**核查入口：** [来源 1](https://docs.lovable.dev/introduction/credits-and-usage)

**你的结论或补充证据：** 待填写。

### 27 de7w Lovart 免费版每天 70 积分

完整 ID：`lovart-lovart-free-daily-70-credits`。 [网站详情](https://ai-yangmao.com/#offer-lovart-lovart-free-daily-70-credits)

**现存疑问：** 历史70/日与当前30/日冲突，尚待确定该已上架常驻记录的适用额度及时间，不强填。；当前Free表30/d，历史已批准70/d；需管理员裁定当前权益是否实际变更。；加购存在但未公布数值；按已知套餐最低可核费率比价。

**核查结论：** 权益估值V1逐条复核；重新按当前Ultimate年付首年积分比价计算已批准历史70/日，仍为$8.48；当前官网Free比较表为30/d，与70/日历史基线有差异，不可在本估值任务中自动替换权益事实。；研判：历史70/日与当前30/日冲突，尚待确定该已上架常驻记录的适用额度及时间，不强填。；当前Free表30/d，历史已批准70/d；需管理员裁定当前权益是否实际变更。；加购存在但未公布数值；按已知套餐最低可核费率比价。

**候选算式仅供研判：** historical 70 credits/day × 30 days × USD 109/month ÷ 27000 credits/month

**未采纳的候选金额：** $8.48。

**核查入口：** [来源 1](https://www.lovart.ai/pricing)

**你的结论或补充证据：** 待填写。

### 28 gpgi Magnific Seedream 5.0 Pro 限时不限量生成

完整 ID：`magnific-magnific-seedream-5-pro-limited-time-unlimited`。 [网站详情](https://ai-yangmao.com/#offer-magnific-magnific-seedream-5-pro-limited-time-unlimited)

**现存疑问：** 需确定该已批准ID实际权益为旧Seedream5Pro促销还是年度模型集合，及其活动覆盖时长。；4M配置价格、当前$币种与实际适用年付档仍待确认；不改审批或自行拆条。

**核查结论：** 权益估值V1逐条复核；批准记录标题指Seedream5.0Pro限时活动，但模型/权益正文是年度会员内含积分和多模型不限量；当前官网也未给Seedream5Pro该活动的免费规格。旧33.75美元是套餐月费，不能当额外限免价值。可计算正文三个1K免费候选条件值3.96美元，但不能未经裁定替换标题指向的历史活动。；研判：需确定该已批准ID实际权益为旧Seedream5Pro促销还是年度模型集合，及其活动覆盖时长。；4M配置价格、当前$币种与实际适用年付档仍待确认；不改审批或自行拆条。

**候选算式仅供研判：** if approved annual-model-list is the intended benefit:100 images×lowerMedian([Flux.2 Pro1K:50,Nano Banana2 Lite1K:60,Nano Banana2 1K:75] credits/image)×(82.50×12/1500000)=3.96 conditional USD; cannot apply to Seedream5Pro promo without its free specs/term

**核查入口：** [来源 1](https://www.magnific.com/pricing)

**你的结论或补充证据：** 待填写。

### 29 42lv MiniMax Code 签到双倍积分（9/28–10/7）

完整 ID：`minimax-minimax-code-signin-double-points`。 [网站详情](https://ai-yangmao.com/#offer-minimax-minimax-code-signin-double-points)

**现存疑问：** Code签到积分与Token Plan加购积分是否通用未证明，额外增量算式保留但金额暂不填。；当前官方说明加购积分覆盖Token Plan资源，但Code签到积分是否与此等价未明确，故暂定。；若按活动总发放价值展示则为10,400积分，需与日常签到分开防止重复。

**核查结论：** 权益估值V1逐条复核；官方实际读取签到活动与基数，额外奖励只算较普通签到增量；当前积分加购取最低单位价¥500/74,900。；研判：Code签到积分与Token Plan加购积分是否通用未证明，额外增量算式保留但金额暂不填。；当前官方说明加购积分覆盖Token Plan资源，但Code签到积分是否与此等价未明确，故暂定。；若按活动总发放价值展示则为10,400积分，需与日常签到分开防止重复。

**候选算式仅供研判：** 首次连续10天普通签到(8×400+2×1000)=5,200积分；双倍共10,400；额外增量5,200×(¥500/74,900积分)=¥34.71295；¥34.712950600801065 × 0.14942927245572862 USD/CNY = $5.187131

**未采纳的候选金额：** $5.187131。

**核查入口：** [来源 1](https://agent.minimax.cn/docs/changelog)；[来源 2](https://platform.minimaxi.com/docs/guides/pricing-token-plan.md)；[来源 3](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**你的结论或补充证据：** 待填写。

### 30 85nn MiniMax Token Plan 老用户回馈积分（数额未公布）

完整 ID：`minimax-minimax-token-plan-loyalty-points`。 [网站详情](https://ai-yangmao.com/#offer-minimax-minimax-token-plan-loyalty-points)

**现存疑问：** 需账号到账明细或后续官方数量公告。

**核查结论：** 权益估值V1逐条复核；读到官方9/30日志将发放时间明确为更新后24小时，但仍没给积分数量。单价存在不能弥补未知赠额，不把套餐基础额当奖励。；研判：需账号到账明细或后续官方数量公告。

**候选算式仅供研判：** 额外发放积分数×同平台积分加购价；赠送数量未公布无法计算

**核查入口：** [来源 1](https://agent.minimax.cn/docs/changelog)；[来源 2](https://platform.minimaxi.com/docs/guides/pricing-token-plan.md)

**你的结论或补充证据：** 待填写。

### 31 93yq Mistral 免费计划每月 $10 API 额度（无需信用卡）

完整 ID：`mistral-mistral-free-tier`。 [网站详情](https://ai-yangmao.com/#offer-mistral-mistral-free-tier)

**现存疑问：** 现行官方页没有原每月10美元权益，缺历史适用期间及当前状态证据，金额暂不填。；historical_10_usd_free_credit_not_found_on_current_page

**核查结论：** 权益估值V1逐条复核；保留已批准官方历史摘录的每月$10面额，不按模型另算；本轮当前价格页仅确认Free可访问Studio，没有找到原$10免费面额，当前领取状态须核实。；研判：现行官方页没有原每月10美元权益，缺历史适用期间及当前状态证据，金额暂不填。；historical_10_usd_free_credit_not_found_on_current_page

**候选算式仅供研判：** approved historical monthly face value = 10 USD

**未采纳的候选金额：** $10。

**核查入口：** [来源 1](https://mistral.ai/pricing/)

**你的结论或补充证据：** 待填写。

### 32 hqgl 模力方舟每日免费调用额度

完整 ID：`moark-gitee-ai-daily-free-tier`。 [网站详情](https://ai-yangmao.com/#offer-moark-gitee-ai-daily-free-tier)

**现存疑问：** 确认100/day只覆盖网页在线体验，还是也覆盖某免费API通道；当前产品文档对普通API要求购买资源包。；确认批准DeepSeek-R1的实际版本、免费资格及免费通道context/maxOutput；目前只见示例，没有免费标识/规格。；若应以Qwen3-8B/4B作为本活动默认模型，需明确其是否在同一100/day配额里，再计算成本中位；免费API本身的0价不能当价值0。；不同服务可按次或Token计费；不能假定所有调用都以相同免费计次规则扣减。

**核查结论：** 本次纠正了原先“纯计次=永远不能估”的推断：1000个小请求可在100/day的理论总容量内覆盖V1标准量。但模力方舟把免费在线体验与付费资源包API分开，API文本文档明确免费例为Qwen3-8B/4B；批准模型栏R1只有新手体验示例，管理员又亲测多数好模型不支持免费。现有证据不足以确认每日100次通道中R1或Qwen免费版本的context/maxOutput及准确收费计量。须先确认通道/型号，再使用同版价与固定预算，不借付费API或原厂大context替代免费规格。

**候选算式仅供研判：** 可行性待验证：固定1M输入+0.2M输出；若有同版免费chat规格满足≥1000输入/200输出，可用1000次安排在100/day中覆盖标准量。当前未确认每日100次所在免费通道及其对应模型/上下文/输出规则，故不产生数字；不是因为缺真实平均Token/次而永久无法估值。

**核查入口：** [来源 1](https://ai.gitee.com/docs/getting-started)；[来源 2](https://ai.gitee.com/docs/products/apis/)；[来源 3](https://ai.gitee.com/docs/products/apis/texts/text-generation)；[来源 4](https://ai.gitee.com/serverless-api?model=DeepSeek-R1&tab=info)；[来源 5](https://help.aliyun.com/zh/model-studio/model-pricing)

**你的结论或补充证据：** 待填写。

### 33 7z3x n8n Cloud 共享网关额度与充值

完整 ID：`n8n-n8n-gateway-credits-shared-balance`。 [网站详情](https://ai-yangmao.com/#offer-n8n-n8n-gateway-credits-shared-balance)

**现存疑问：** 已批准事实未包含独立赠额；新用户/老客户赠金已在其他条目。

**核查结论：** 权益估值V1逐条复核；该条描述共享预付余额与充值机制，未说明一个独立免费赠送。官方明确共享余额是买入后用于模型/工具的资金，不可把充值本金作为羊毛价值；保持当前批准状态并交管理员裁定。；研判：已批准事实未包含独立赠额；新用户/老客户赠金已在其他条目。

**核查入口：** [来源 1](https://blog.n8n.io/gateway-credits/)；[来源 2](https://docs.n8n.io/deploy/use-n8n-cloud/gateway-credits)

**你的结论或补充证据：** 待填写。

### 34 f58l OiiOii 邀请好友注册登录奖励200积分

完整 ID：`oiioii-referral-bonus`。 [网站详情](https://ai-yangmao.com/#offer-oiioii-referral-bonus)

**现存疑问：** 官方付费订阅触发与现行消费促销排除冲突；不自动撤下。；当前价格页只写当期奖励；未提供当前免费注册必得200的明确原文。

**核查结论：** 权益估值V1逐条复核；审批历史摘录要求好友registers and subscribes to membership，而已批准公开文案仅register/log in；赠额可能为付费升级触发，需业务裁定后才决定是否计价200，不把邀请双方200+100相加。；研判：官方付费订阅触发与现行消费促销排除冲突；不自动撤下。；当前价格页只写当期奖励；未提供当前免费注册必得200的明确原文。

**核查入口：** [来源 1](https://www.oiioii.ai/price)

**你的结论或补充证据：** 待填写。

### 35 wnpx Codex 和 ChatGPT Work 额度重置

完整 ID：`openai-openai-codex-chatgpt-work-quota-reset`。 [网站详情](https://ai-yangmao.com/#offer-openai-openai-codex-chatgpt-work-quota-reset)

**现存疑问：** reset_increment_not_denominated；announcement_is_context_dependent_reply

**核查结论：** 权益估值V1逐条复核；原帖实际仅“And now 100%”回复，未完整定义对象、重置池或新增余额；已批准历史描述保留供管理员判读。 缺少可复算的新增额度，不以套餐月价代替。；研判：reset_increment_not_denominated；announcement_is_context_dependent_reply

**核查入口：** [来源 1](https://x.com/thsottiaux/status/2078328592308818117)；[来源 2](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)

**你的结论或补充证据：** 待填写。

### 36 ew88 Codex 10月2日全球额度重置执行进度

完整 ID：`openai-openai-codex-global-reset-oct-3-2026`。 [网站详情](https://ai-yangmao.com/#offer-openai-openai-codex-global-reset-oct-3-2026)

**现存疑问：** same_oct2_event_propagation_reply_not_new_award

**核查结论：** 权益估值V1逐条复核；此回复是10月2日重置传播延迟的道歉，并未承诺新的独立重置；本条仍保留，但不能重复计入额度价值。 缺少可复算的新增额度，不以套餐月价代替。；研判：same_oct2_event_propagation_reply_not_new_award

**核查入口：** [来源 1](https://x.com/thsottiaux/status/2106239912932692085)；[来源 2](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)

**你的结论或补充证据：** 待填写。

### 37 ex2n OpenCode Go 订阅：$10/月用 $15–60/月的模型额度

完整 ID：`opencode-opencode-go-subscription`。 [网站详情](https://ai-yangmao.com/#offer-opencode-opencode-go-subscription)

**现存疑问：** 已有批准状态与现行paid_bundle规则冲突；本轮不改批准状态。；需要独立额外发放证明；按每模型套餐额度相加或把订阅费当福利均不适用。

**核查结论：** 权益估值V1逐条复核；Go/Go Plus的每模型月限额是正常付费套餐组成；原10–60美元并不是一个用户免费赠送区间。官方未说明独立bonus，本次不把15/30/60美元多模型订阅余额当作额外羊毛价值，交管理员裁定并保持状态。；研判：已有批准状态与现行paid_bundle规则冲突；本轮不改批准状态。；需要独立额外发放证明；按每模型套餐额度相加或把订阅费当福利均不适用。

**核查入口：** [来源 1](https://opencode.ai/docs/go/)

**你的结论或补充证据：** 待填写。

### 38 wgce 基元律动 认证赠18额度

完整 ID：`periodic-periodic-verification-18-bonus`。 [网站详情](https://ai-yangmao.com/#offer-periodic-periodic-verification-18-bonus)

**现存疑问：** 领取入口、金额单位和认证权益未由可访问官方条款确认，金额暂不填。；认证奖励领取入口与新老资格由账号活动配置决定，当前渲染首页与已批准摘录未完全复现。

**核查结论：** 权益估值V1逐条复核；当前官网公开部署资源明确18元Token额度，支持人民币面额；首页静态正文未直接显示认证入口，账号活动配置仍需确认。；研判：领取入口、金额单位和认证权益未由可访问官方条款确认，金额暂不填。；认证奖励领取入口与新老资格由账号活动配置决定，当前渲染首页与已批准摘录未完全复现。

**候选算式仅供研判：** 认证奖励 ¥18 ×1名符合条件领取者 = ¥18；¥18 × 0.14942927245572862 USD/CNY = $2.689727

**未采纳的候选金额：** $2.689727。

**核查入口：** [来源 1](https://tokenrhythm.studio/_releases/base/4657068efe670e23d67d63e4e8ef9ecfc5ba48e1/assets/index-CSY7iifb.js)；[来源 2](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)

**你的结论或补充证据：** 待填写。

### 39 bcot Poe 免费用户每天积分（待实测）

完整 ID：`poe-poe-free-daily-points`。 [网站详情](https://ai-yangmao.com/#offer-poe-poe-free-daily-points)

**现存疑问：** free_faq_403_challenge；free_points_quantity_requires_account_evidence；do_not_replace_admin_tested_tier

**核查结论：** 权益估值V1逐条复核；免费账号存在，但已批准条目没有每日compute points数量。官方订阅帮助可读，免费FAQ本轮仍403挑战，无法建立免费积分总量和各bot消耗对应关系。保留管理员亲测证据级别，不补未经核实的300/日，也不把付费订阅点数当免费点数。；研判：free_faq_403_challenge；free_points_quantity_requires_account_evidence；do_not_replace_admin_tested_tier

**核查入口：** [来源 1](https://www.usagepricing.com/blueprint/poe)；[来源 2](https://help.poe.com/hc/en-us/articles/19945140063636)；[来源 3](https://help.poe.com/hc/en-us/articles/19944206309524)

**你的结论或补充证据：** 待填写。

### 40 ayl0 SeaArt 免费账号每日 130 活力值

完整 ID：`seaart-seaart-free-tier`。 [网站详情](https://ai-yangmao.com/#offer-seaart-seaart-free-tier)

**现存疑问：** 候选A只按月度购买Credits：3900×104.99/135000≈$3.03；候选B按Beginner日发Stamina：3900×4.79/(300×30)≈$2.08。；将月度Credits与日发Stamina合并计算可进一步降低单位价，但需确认相同模型适用/是否独立共享、避免同权益重复分母。；web当前Free表54,900 Stamina/year与FAQ130/day有冲突；不覆盖已批准130/day事实。；FAQ另写daily login 0 Stamina，与同页130多处文本冲突；既有事实需登录裁定。

**核查结论：** 权益估值V1逐条复核；已重新核对旧$2.08：旧分母9000其实是Beginner每日300×30的Stamina，而当前套餐另含4000购买Credits，不能把两种权益悄然当一个购买包。官网购买Credits最低已抓比例、按每日Stamina比较、以及混合额度池得到不同金额，先留研判确定计价分母和适用边界。；研判：候选A只按月度购买Credits：3900×104.99/135000≈$3.03；候选B按Beginner日发Stamina：3900×4.79/(300×30)≈$2.08。；将月度Credits与日发Stamina合并计算可进一步降低单位价，但需确认相同模型适用/是否独立共享、避免同权益重复分母。；web当前Free表54,900 Stamina/year与FAQ130/day有冲突；不覆盖已批准130/day事实。；FAQ另写daily login 0 Stamina，与同页130多处文本冲突；既有事实需登录裁定。

**核查入口：** [来源 1](https://www.seaart.ai/mall)

**你的结论或补充证据：** 待填写。

### 41 7f85 阶跃星辰 Studio 额外专属创作额度

完整 ID：`stepfun-stepfun-studio-exclusive-credits`。 [网站详情](https://ai-yangmao.com/#offer-stepfun-stepfun-studio-exclusive-credits)

**现存疑问：** 需确认Studio专属池是否可用API加油包购买，或取得Studio本身官方售价。；各档套餐均包含Studio40%权益，现役是否属普通付费套餐自带另需判断；本轮不改批准状态。

**核查结论：** 权益估值V1逐条复核；读到当前官方API加油包价格与模型用量换算，但Studio为专属池；按1M=¥1给出的旧$22.54–2,253.52只是名义模型用量，不能证明Studio购买替代成本。；研判：需确认Studio专属池是否可用API加油包购买，或取得Studio本身官方售价。；各档套餐均包含Studio40%权益，现役是否属普通付费套餐自带另需判断；本轮不改批准状态。

**候选算式仅供研判：** Studio专属Credit须有适用购买参照；API加油包与Studio专属池可替代性未证实，不计算金额

**核查入口：** [来源 1](https://platform.stepfun.com/docs/zh/step-plan/overview)

**你的结论或补充证据：** 待填写。

### 42 0622 TapNow 新用户免费 Tapies 额度

完整 ID：`tapnow-tapnow-new-user-tapies`。 [网站详情](https://ai-yangmao.com/#offer-tapnow-tapnow-new-user-tapies)

**现存疑问：** 默认配置200÷95=$2.105263仅为条件演算，未写入usdEstimate。；公开页面渲染未展示价表，站点配置只能作为补充参考；30天有效期不证明人人取得200。

**核查结论：** 权益估值V1逐条复核；生产已批准条目仅承诺符合检查的新用户可能获得Tapies，未批准固定数量。官方当前页面配置含200 Free Tapies和95 Tapies/$1，但正文条款仍规定资格与金额因产品/安全/合规检查变化；不能把配置默认值当每个领取者确定赠额。；研判：默认配置200÷95=$2.105263仅为条件演算，未写入usdEstimate。；公开页面渲染未展示价表，站点配置只能作为补充参考；30天有效期不证明人人取得200。

**核查入口：** [来源 1](https://www.tapnow.ai/terms-of-service)

**你的结论或补充证据：** 待填写。

### 43 81st 腾讯云智能体开发平台体验版免费试用 1 个月

完整 ID：`tencent-tencent-cloud-free-trial-products`。 [网站详情](https://ai-yangmao.com/#offer-tencent-tencent-cloud-free-trial-products)

**现存疑问：** 需只读领取详情或体验版商品说明，不能把同页非AI云资源加入价值。

**核查结论：** 权益估值V1逐条复核；官方体验馆存在对应AI产品，但未公开体验版具体Token、模型与同版售价；不能用标准/专业版月费顶替体验版。；研判：需只读领取详情或体验版商品说明，不能把同页非AI云资源加入价值。

**候选算式仅供研判：** 1个月智能体平台体验版权益需匹配同版官方购买价或明确定量资源；当前体验版资源组成未知

**核查入口：** [来源 1](https://cloud.tencent.com/act/pro/free)

**你的结论或补充证据：** 待填写。

### 44 3nb4 Tinker 研究与开源免费额度

完整 ID：`thinking-machines-tinker-research-grants`。 [网站详情](https://ai-yangmao.com/#offer-thinking-machines-tinker-research-grants)

**现存疑问：** 缺实际获批金额与首30天释放安排；不能把5000当所有申请人的确定额。；申请完整上限与首30参考值独立分列。

**核查结论：** 权益估值V1逐条复核；官方是获批资助starting at $5,000，不是最高申请额，也不是任意申请者保证可得；保留起步额inputs，尚未获批个人不能生成美元下限或usdMax。；研判：缺实际获批金额与首30天释放安排；不能把5000当所有申请人的确定额。

**候选算式仅供研判：** 无可复算的美元金额

**核查入口：** [来源 1](https://thinkingmachines.ai/news/tinker-research-and-teaching-grants/)

**你的结论或补充证据：** 待填写。

### 45 zud3 Trae Pro 会员 14 天免费试用

完整 ID：`trae-trae-pro-trial`。 [网站详情](https://ai-yangmao.com/#offer-trae-trae-pro-trial)

**现存疑问：** 试用美元额度未公开；旧新Pro同名但计费及权益变化，需确认是否可等价完整会员。

**核查结论：** 权益估值V1逐条复核；官方称14天Pro试用，但用量先耗尽即提前结束，未公布试用美元余额。公告当时Pro月费10美元，现价20美元且套餐权益变化；没有同版试用购买价，不能将14/30整包订阅费冒充赠額。；研判：试用美元额度未公开；旧新Pro同名但计费及权益变化，需确认是否可等价完整会员。

**核查入口：** [来源 1](https://www.trae.ai/blog/trae_membership_0213)；[来源 2](https://www.trae.ai/pricing)

**你的结论或补充证据：** 待填写。

### 46 ds4t Vidu 注册新人试用 20 积分

完整 ID：`vidu-vidu-signup-bonus`。 [网站详情](https://ai-yangmao.com/#offer-vidu-vidu-signup-bonus)

**现存疑问：** 官方同一价页赠额分母20000/月与比较表8000/月冲突，无法确认适用套餐，候选金额仅供研判。；官网促销卡20000/月与Compare Plans 8000/月冲突，采用更低单位成本；加购现价未返回。；20积分来自管理员历史亲测，不改tested证据。

**核查结论：** 权益估值V1逐条复核；管理员亲测一次注册20积分，采用官网Ultimate促销卡20000/月的最低已知套餐单位费率，约$0.19；不为参考素材配额叠加价值。；研判：官方同一价页赠额分母20000/月与比较表8000/月冲突，无法确认适用套餐，候选金额仅供研判。；官网促销卡20000/月与Compare Plans 8000/月冲突，采用更低单位成本；加购现价未返回。；20积分来自管理员历史亲测，不改tested证据。

**候选算式仅供研判：** 20 credits × USD 2300/year ÷ (12 months/year × 20000 credits/month)

**未采纳的候选金额：** $0.19。

**核查入口：** [来源 1](https://www.vidu.com/pricing)

**你的结论或补充证据：** 待填写。

### 47 ibur 火山方舟新用户免费推理额度

完整 ID：`volc-volcengine-ark-free-inference-quota`。 [网站详情](https://ai-yangmao.com/#offer-volc-volcengine-ark-free-inference-quota)

**现存疑问：** 需管理员只读控制台取得实际免费模型和每模型赠额。

**核查结论：** 权益估值V1逐条复核；公开官方全文只指向控制台，不给当前每模型额度。已核实范围但无法用假定1百万Token补全。；研判：需管理员只读控制台取得实际免费模型和每模型赠额。

**候选算式仅供研判：** 各模型赠送Token数 ×适用输入/输出单价；模型名单与数量需控制台，当前无法计算

**核查入口：** [来源 1](https://www.volcengine.com/docs/ark/free-inference-quota?lang=zh)

**你的结论或补充证据：** 待填写。

### 48 usw3 MiMo-V2.5-ASR 语音识别

完整 ID：`xiaomi-mimo-mimo-asr-limited-free`。 [网站详情](https://ai-yangmao.com/#offer-xiaomi-mimo-mimo-asr-limited-free)

**现存疑问：** 原ASR免费事件与起止仍缺原文；需判断历史条目事实，估值不擅自撤下。

**核查结论：** 权益估值V1逐条复核；本轮官方价目确认ASR收费，限时免费属于TTS另一模型。保留已批准记录，但现文案是付费信息，不能凭现价制造免费价值。；研判：原ASR免费事件与起止仍缺原文；需判断历史条目事实，估值不擅自撤下。

**候选算式仅供研判：** 目前MiMo-V2.5-ASR价格为$0.074/音频小时，但该已批准记录没有确认免费赠送时长，不能乘20小时冒充权益

**核查入口：** [来源 1](https://mimo.mi.com/docs/price/pay-as-you-go)

**你的结论或补充证据：** 待填写。

### 49 uyua 小米 MiMo 闲时 0.8 倍算力优惠

完整 ID：`xiaomi-mimo-xiaomi-mimo-off-peak-discount`。 [网站详情](https://ai-yangmao.com/#offer-xiaomi-mimo-xiaomi-mimo-off-peak-discount)

**现存疑问：** 这是普通付费套餐的错峰计费规则；现役是否满足活动收录需判断，本轮不改变已批准状态。；需官方每模型Credits抵扣表才能计算标准编程量的积分节省。

**核查结论：** 权益估值V1逐条复核；官方TokenPlan页确认0.8倍积分消耗，但按量API普通余额与套餐额度不互通，缺实际Credits抵扣系数时不可直接用API价20%计算真实套餐节省。；研判：这是普通付费套餐的错峰计费规则；现役是否满足活动收录需判断，本轮不改变已批准状态。；需官方每模型Credits抵扣表才能计算标准编程量的积分节省。

**候选算式仅供研判：** 实际TokenPlan Credits消耗×20%×适用积分购买单位费率；未取得每模型Token→Credits系数，不能将API现金费率直接打八折

**核查入口：** [来源 1](https://platform.xiaomimimo.com/token-plan)；[来源 2](https://mimo.mi.com/docs/price/pay-as-you-go)

**你的结论或补充证据：** 待填写。

### 50 sx99 智谱 GLM Coding Plan 7 天体验卡

完整 ID：`zhipu-zhipu-glm-coding-plan-7-day-trial-card`。 [网站详情](https://ai-yangmao.com/#offer-zhipu-zhipu-glm-coding-plan-7-day-trial-card)

**现存疑问：** 需已取得卡片的详细套餐与生效说明，不能从当前新套餐反推7月历史卡模型或档位。

**核查结论：** 权益估值V1逐条复核；本轮已实际读取官方卡页，入口分别失效/领完；七天不是七张，不从用户评价提到Pro推卡片档位。保留历史已批准权益，等待卡片具体档位。；研判：需已取得卡片的详细套餐与生效说明，不能从当前新套餐反推7月历史卡模型或档位。

**候选算式仅供研判：** 1张7天Coding Plan体验卡：同档月价×7/30；卡片具体套餐档位和对应可用模型未公开，无法定价

**核查入口：** [来源 1](https://bigmodel.cn/activity/trial-card/MIIKCBCNJG)；[来源 2](https://docs.bigmodel.cn/cn/coding-plan/overview)

**你的结论或补充证据：** 待填写。

### 51 crw5 GLM Coding Plan 7天体验卡（已领完）

完整 ID：`zhipu-zhipu-glm-coding-plan-7-trial-cards-expired`。 [网站详情](https://ai-yangmao.com/#offer-zhipu-zhipu-glm-coding-plan-7-trial-cards-expired)

**现存疑问：** 需已取得卡片的详细套餐与生效说明，不能从当前新套餐反推7月历史卡模型或档位。

**核查结论：** 权益估值V1逐条复核；本轮已实际读取官方卡页，入口分别失效/领完；七天不是七张，不从用户评价提到Pro推卡片档位。保留历史已批准权益，等待卡片具体档位。；研判：需已取得卡片的详细套餐与生效说明，不能从当前新套餐反推7月历史卡模型或档位。

**候选算式仅供研判：** 1张7天Coding Plan体验卡：同档月价×7/30；卡片具体套餐档位和对应可用模型未公开，无法定价

**核查入口：** [来源 1](https://bigmodel.cn/activity/trial-card/EEGA0AKYV5)；[来源 2](https://docs.bigmodel.cn/cn/coding-plan/overview)

**你的结论或补充证据：** 待填写。

### 52 upa4 ZCode 全体用户领 1 亿 Token（Trust.patch，共 10 万份）

完整 ID：`zhipu-zhipu-zcode-100m-tokens-bonus`。 [网站详情](https://ai-yangmao.com/#offer-zhipu-zhipu-zcode-100m-tokens-bonus)

**现存疑问：** 官方公众号CAPTCHA，未能重读配图与卡片可用模型。；需确认具体模型版本及输入/输出抵扣；不能直接按全部输入计价。

**核查结论：** 权益估值V1逐条复核；已批准的是1亿Token，但模型用途仍以领取卡片为准，旧金额按全部输入与社区模型假设计。重新估值授权不使该假设成为官方事实。；研判：官方公众号CAPTCHA，未能重读配图与卡片可用模型。；需确认具体模型版本及输入/输出抵扣；不能直接按全部输入计价。

**候选算式仅供研判：** 100,000,000 Token按确认可用模型与输入/输出分布折价；当前官方活动原文未确认GLM-5.3-Flash用途，无法采用旧¥80

**核查入口：** [来源 1](https://mp.weixin.qq.com/s/Zia38bgBIcNlAXkA2I9pxw)；[来源 2](https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash)

**你的结论或补充证据：** 待填写。

### 53 0n2u ZCode 付费用户赠送重置卡（Trust.patch）

完整 ID：`zhipu-zhipu-zcode-reset-cards-benefit`。 [网站详情](https://ai-yangmao.com/#offer-zhipu-zhipu-zcode-reset-cards-benefit)

**现存疑问：** 公众号本轮直抓及Jina均CAPTCHA，保留已批准四张+四张事实。；需确认周卡/5h卡是否共同重置、兑换时余额及最大可新增额度，不能用整份套餐售价代替卡。

**核查结论：** 权益估值V1逐条复核；官方额度是双重限制与按模型抵扣的积分，积分不是Token。旧值用输入单价乘积分对应Token未体现输出及共享约束。每次重置不保证新增整池额度，缺实际余额与卡规则无法可靠定额。；研判：公众号本轮直抓及Jina均CAPTCHA，保留已批准四张+四张事实。；需确认周卡/5h卡是否共同重置、兑换时余额及最大可新增额度，不能用整份套餐售价代替卡。

**候选算式仅供研判：** 每次重置的净增量 = 重置后可用积分 − 重置前可用积分；5小时与周限制约束同一消费，不能将两池额度相加

**核查入口：** [来源 1](https://mp.weixin.qq.com/s/Zia38bgBIcNlAXkA2I9pxw)；[来源 2](https://docs.bigmodel.cn/cn/coding-plan/overview)

**你的结论或补充证据：** 待填写。

## 已确认无法折算和公测未定价

这些也已逐条核查，金额留空。V1 允许有明确依据的无价结论结案；如果管理员能提供实际免费模型、可兑换积分价格、单次调用单位或账号定价，可以继续补算。

| 短码 | 条目 | 结论 | 具体缺口 |
|---|---|---|---|
| 11pn | Adobe Firefly 免费版每日生成额度 | 无法可靠折算 | 权益估值V1逐条复核；官方确认限定模型集合和每日限额，但既没数量也没确切免费版本；已另查扣积分FAQ和付费模型价格，仍无法给免费配额应用同规格价格。；研判：须免费账号实际每日次数、模态共享规则和免费模型版本，不能用全部付费模型目录补。；须免费账号实际每日次数、模态共享规则和免费模型版本，不能用全部付费模型目录补。 |
| 9hi0 | Claude Opus 5.5 发布赠送可保存重置次数 | 无法可靠折算 | 权益估值V1逐条复核；官方确认可保存后择时使用一次重置。不同账号未使用余额及模型用量不同，未公布新增Token/credits及可购买单价；不能按$20–200订阅售价替代。；研判：reset_increment_not_denominated；card_expiry_account_specific；reset_increment_not_denominated；card_expiry_account_specific |
| e5oo | Anthropic OSS Scanner 开源项目免费安全扫描 | 无法可靠折算 | 权益估值V1逐条复核；项目获接入后由最强模型周期性安全扫描，无固定次数、Token数量、持续服务时长或单次官方购买价。不能拿其他审计服务价格、Claude Max月价或一整套模型调用量替代。；研判：scan_frequency_and_volume_not_published；no_equivalent_official_purchase_price；scan_frequency_and_volume_not_published；no_equivalent_official_purchase_price；申请完整上限与首30参考值独立分列。 |
| ww1n | 千帆 ERNIE-Speed / Lite / Tiny 系列预置服务免费调用（已结束） | 无法可靠折算 | 权益估值V1逐条复核；原长期免费公告已读，保留批准的退役历史；当前目录无这些同版本有效付费参照，亦无OpenRouter同版价格。旧TPM上限不能当实际Token量。；研判：已退役模型不能继承当前ERNIE新型号价格；历史消费参考价需另有可追溯官方档案。；已退役模型不能继承当前ERNIE新型号价格；历史消费参考价需另有可追溯官方档案。 |
| adr4 | GitHub Copilot 免费层 | 无法可靠折算 | 权益估值V1逐条复核；Free 的2000补全与50聊天请求不是可兑价的Token余额；当前主表只写有限Chat/Agent用量，没有可量化Free AI Credit额度，不能以付费Pro包价或每请求虚构Token量折算。；研判：免费请求和Token消耗不一一对应；未公布可用于比较的Token量或独立补全购买单价。；免费请求和Token消耗不一一对应；未公布可用于比较的Token量或独立补全购买单价。 |
| 97oa | 扣子 AI 编程功能 7 天免费体验 | 无法可靠折算 | 权益估值V1逐条复核；官方确认历史七天功能限免，但任务消耗包含模型、工具、托管等多项，没有固定任务数与精确模型。不能将积分单价或完整会员售价直接当七天该功能价值。；研判：计价对象不是一个可匹配的模型；不得编每任务Token或把最多上下文当每次用量。；计价对象不是一个可匹配的模型；不得编每任务Token或把最多上下文当每次用量。 |
| r2v7 | 扣子对话任务 7 天免费体验 | 无法可靠折算 | 权益估值V1逐条复核；官方确认历史七天功能限免，但任务消耗包含模型、工具、托管等多项，没有固定任务数与精确模型。不能将积分单价或完整会员售价直接当七天该功能价值。；研判：计价对象不是一个可匹配的模型；不得编每任务Token或把最多上下文当每次用量。；计价对象不是一个可匹配的模型；不得编每任务Token或把最多上下文当每次用量。 |
| 9k1k | Cursor 免费版 | 无法可靠折算 | 权益估值V1逐条复核；Hobby免费档只有有限Agent请求及Composer入口，没有公开请求额度或用量预算；没有数量，不能按标准10M+1M推定可被免费额度覆盖。；研判：免费用量没有明确Token或美元数量；Composer模型版本未指定。；免费用量没有明确Token或美元数量；Composer模型版本未指定。 |
| u2p3 | Cursor 团队版与企业版 Rollouts 限时免费额度 | 无法可靠折算 | 权益估值V1逐条复核；Rollouts赠的是约50/500次变更监控用量，官方没有单次变更固定售价、实际tokens或美元额度；Teams/Enterprise整包月费不代表这份限定用途赠额。；研判：变更监控每次资源消耗不定；缺限定赠金面额或同单位价。；变更监控每次资源消耗不定；缺限定赠金面额或同单位价。 |
| ezsz | Grok Bot 首次免费试用额度（最长 7 天） | 无法可靠折算 | 权益估值V1逐条复核；最长7天只是使用窗口；Grok Bot给usage credit且按agent步骤及tokens扣减、可一任务耗尽。官方未公开赠额，既非完整7天会员也非不限量模型，不使用Pro价或标准Tokens补造价值。；研判：赠金面额、可覆盖Token/步骤量及独立试用售价均未公布。；赠金面额、可覆盖Token/步骤量及独立试用售价均未公布。 |
| gpgv | Codeium Live 网页端聊天永久免费 | 无法可靠折算 | 权益估值V1逐条复核；历史Codeium Live称网页聊天free forever，未列具体模型版本或可购买的相同网页服务价格。免费产品价格0不能代表购买参考价值，也不能套当前Devin20美元套餐或任意代码模型API单价。；研判：旧工具背后模型版本与用量未公开，未读到同权益付费售价。；旧工具背后模型版本与用量未公开，未读到同权益付费售价。 |
| 510k | Windsurf 平台 Claude Opus 4.6 (fast mode) 额度限时优惠 | 无法可靠折算 | 权益估值V1逐条复核；Claude Opus 4.6 fast mode的历史优惠是扣积分倍率，仍需消费原有积分。官方公告给促销倍率，未给同服务正常倍率、赠送积分或固定请求预算；所以不能从现行模型Token单价计算这次实际节省。；研判：缺同版正常扣积分倍率/适用积分美元购买单价与可覆盖用量；现行usage-quota价格不可反推历史积分优惠。；缺同版正常扣积分倍率/适用积分美元购买单价与可覆盖用量；现行usage-quota价格不可反推历史积分优惠。 |
| trgf | Windsurf 平台 Claude Opus 4.6 额度限时优惠 | 无法可靠折算 | 权益估值V1逐条复核；Claude Opus 4.6的历史优惠是扣积分倍率，仍需消费原有积分。官方公告给促销倍率，未给同服务正常倍率、赠送积分或固定请求预算；所以不能从现行模型Token单价计算这次实际节省。；研判：缺同版正常扣积分倍率/适用积分美元购买单价与可覆盖用量；现行usage-quota价格不可反推历史积分优惠。；缺同版正常扣积分倍率/适用积分美元购买单价与可覆盖用量；现行usage-quota价格不可反推历史积分优惠。 |
| jzfw | Windsurf 平台 GLM-5 与 MiniMax M2.5 上线限时积分优惠（0.75x / 0.25x） | 无法可靠折算 | 权益估值V1逐条复核；GLM-5 / MiniMax M2.5的历史优惠是扣积分倍率，仍需消费原有积分。官方公告给促销倍率，未给同服务正常倍率、赠送积分或固定请求预算；所以不能从现行模型Token单价计算这次实际节省。；研判：缺同版正常扣积分倍率/适用积分美元购买单价与可覆盖用量；现行usage-quota价格不可反推历史积分优惠。；缺同版正常扣积分倍率/适用积分美元购买单价与可覆盖用量；现行usage-quota价格不可反推历史积分优惠。 |
| my6p | Windsurf 平台 GPT-5.2-Codex 额度限时优惠 | 无法可靠折算 | 权益估值V1逐条复核；GPT-5.2-Codex的历史优惠是扣积分倍率，仍需消费原有积分。官方公告给促销倍率，未给同服务正常倍率、赠送积分或固定请求预算；所以不能从现行模型Token单价计算这次实际节省。；研判：缺同版正常扣积分倍率/适用积分美元购买单价与可覆盖用量；现行usage-quota价格不可反推历史积分优惠。；缺同版正常扣积分倍率/适用积分美元购买单价与可覆盖用量；现行usage-quota价格不可反推历史积分优惠。 |
| j981 | Windsurf 平台 SWE-1.5 Free 模型限时免费 | 无法可靠折算 | 权益估值V1逐条复核；已核实SWE-1.5 Free供全用户免费3个月，但其标准吞吐速度与付费Cerebras高速版本不同；没有读到标准吞吐Free版本的适用付费API价，不能借高速版或后续SWE模型价格替代。；研判：同模型不同吞吐规格无匹配购买价；不能按当前SWE-2价格套旧SWE-1.5 Free。；同模型不同吞吐规格无匹配购买价；不能按当前SWE-2价格套旧SWE-1.5 Free。 |
| ipzi | Windsurf 平台 Claude Sonnet 4.6 限时积分优惠 | 无法可靠折算 | 权益估值V1逐条复核；Claude Sonnet 4.6的历史优惠是扣积分倍率，仍需消费原有积分。官方公告给促销倍率，未给同服务正常倍率、赠送积分或固定请求预算；所以不能从现行模型Token单价计算这次实际节省。；研判：缺同版正常扣积分倍率/适用积分美元购买单价与可覆盖用量；现行usage-quota价格不可反推历史积分优惠。；缺同版正常扣积分倍率/适用积分美元购买单价与可覆盖用量；现行usage-quota价格不可反推历史积分优惠。 |
| dn2b | Windsurf 平台 Gemini 3.1 Pro 额度限时优惠 | 无法可靠折算 | 权益估值V1逐条复核；Gemini 3.1 Pro的历史优惠是扣积分倍率，仍需消费原有积分。官方公告给促销倍率，未给同服务正常倍率、赠送积分或固定请求预算；所以不能从现行模型Token单价计算这次实际节省。；研判：缺同版正常扣积分倍率/适用积分美元购买单价与可覆盖用量；现行usage-quota价格不可反推历史积分优惠。；缺同版正常扣积分倍率/适用积分美元购买单价与可覆盖用量；现行usage-quota价格不可反推历史积分优惠。 |
| tui8 | Google AI Studio 免费额度 | 无法可靠折算 | 权益估值V1逐条复核；免费输入输出及受限模型权限已确认；额度由账号和模型决定，官方当前要求登录查看实际限制，未公开统一Token赠量或可复算请求消耗。无法确定标准1M输入+0.2M输出能覆盖多少，不能把速率乘整月或最大上下文当免费Token。；研判：account_specific_token_capacity_not_public；current_models_need_exact_free_tier_match；account_specific_token_capacity_not_public；current_models_need_exact_free_tier_match |
| ruc3 | Gemini CLI 免费额度 | 无法可靠折算 | 权益估值V1逐条复核；Google登录免费1000请求/天已确认；路由到Gemini模型家族的版本和每次Token消耗不固定，不能以1M上下文乘请求数。编程标准10M输入+1M输出也无法证明全部落在免费模型配额内，不拿AI Pro整份月价当CLI额外价值。；研判：request_quota_not_token_quantity；model_routing_and_native_token_mapping_not_fixed；request_quota_not_token_quantity；model_routing_and_native_token_mapping_not_fixed |
| q1k2 | 海螺 AI 参与调研赢贝壳奖励 | 无法可靠折算 | 权益估值V1逐条复核；调研奖励贝壳数量未公布，当前国内官网未得到独立活动价目；即使有单价也缺奖励数量，不能折算美元。；研判：调研奖励数量、发放条件及适用模型未核定。；调研奖励数量、发放条件及适用模型未核定。 |
| tw5h | 海螺AI新用户注册赠积分 | 无法可靠折算 | 权益估值V1逐条复核；国内海螺注册礼当前权益未给固定数量，官方首页本次返回错误界面且没有对应积分加购价；国际Hailuo不能替代国内贝壳计费。；研判：数量/资格依账号活动页；来源不可访问未等同福利取消。；数量/资格依账号活动页；来源不可访问未等同福利取消。 |
| hcnu | Higgsfield 学院课程内置免费生成 | 无法可靠折算 | 权益估值V1逐条复核；官方课程明确8次和50+次嵌入式免费生成，未给各练习实际模型、图像/视频份额、时长或分辨率；Cinema Studio是课程工具，不是单一可按5秒通用价格折算的固定权益。；研判：需课程练习实际各次模型、时长/尺寸与扣点；50+没有确定上限。；需课程练习实际各次模型、时长/尺寸与扣点；50+没有确定上限。 |
| 28go | Supercomputer 文本生成免费模式 | 无法可靠折算 | 权益估值V1逐条复核；官方当前Free LLM未披露模型与版本。已查平台公告和模型目录，无从匹配原厂或OpenRouter付费版本；不能把Smart/Manual列出的GLM、DeepSeek等当Free模型。；研判：缺实际免费LLM名称、版本和对应输入/输出计费档。；缺实际免费LLM名称、版本和对应输入/输出计费档。 |
| wp5o | Ideogram 免费账号每周慢速额度 | 无法可靠折算 | 权益估值V1逐条复核；现行官方每周赠慢速积分数量随账号变化，未列免费档模型规格与慢速积分售价；100张场景仍受实际赠额限制，不能拿旧10积分/周或付费Unlimited Slow补造。；研判：缺账号每周实际积分数量、可用模型版本及输出规格。；缺账号每周实际积分数量、可用模型版本及输出规格。 |
| 9a3e | Lovable 每日免费聊天额度 | 无法可靠折算 | 权益估值V1逐条复核；官方只确认每日聊天免额及Free/Pro/Business差异，没有公开免额次数或credits数量。聊天并非无限；不能用构建积分或套餐月价代替。；研判：daily_chat_allowance_quantity_not_published；do_not_double_count_build_credits；daily_chat_allowance_quantity_not_published；do_not_double_count_build_credits |
| aeiq | Lovable 联合 Google Gemini 限时免费 AI 用量 | 无法可靠折算 | 权益估值V1逐条复核；历史活动为2025年9月29日至10月6日的已部署应用Gemini AI用量限免，构建积分照常计费。公告只写Google Gemini default model，没有确切版本或各免费模型名单；不能以2026年的现行默认模型继承历史价格，也不能把整个Lovable会员或多模态生成上限相加。；研判：historical_default_gemini_version_unspecified；exact_input_output_price_and_workload_coverage_unresolved；historical_default_gemini_version_unspecified；exact_input_output_price_and_workload_coverage_unresolved |
| msth | LongCat-2.0-Preview 内测每天 500 万免费 Token（已于 6/30 转为收费） | 公测未定价 | 权益估值V1逐条复核；官方日志将4/20内测Preview与6/30正式2.0商用分开，不能用后者价格覆盖历史内测。基础赠額150M按原单位保留，反馈最高120M/天不是人人保底，也不写usdMax。；研判：已批准记录开始日期若为3月，与官方本轮读到4/20发布不同，交主代理判断但不改字段。；已批准记录开始日期若为3月，与官方本轮读到4/20发布不同，交主代理判断但不改字段。 |
| 93fh | MiniMax Code 国庆七天畅蹬：订阅用户 M3.1-Flash-Preview 不限量 | 公测未定价 | 权益估值V1逐条复核；官方客户端日志确认七天额外限免，但公开按量价格只有M3等其他型号；M Plan有可用模型不意味着可用整个会员售价估额外不限量模型。公测同版未定价。； |
| tr9h | 魔搭 ModelScope API-Inference 每日 250 魔粒免费调用 | 无法可靠折算 | 权益估值V1逐条复核；每天250魔粒，平台只有每调用0.5/1/2魔粒，没有魔粒人民币/美元购买价；每次调用不等于固定Token量，不用第三方模型Token价制造魔粒货币单价。；研判：仅请求次数或平台不可购买积分，无法可靠映射标准场景的Token覆盖量。；仅请求次数或平台不可购买积分，无法可靠映射标准场景的Token覆盖量。 |
| nc7e | n8n Cloud 免费试用 | 无法可靠折算 | 权益估值V1逐条复核；800 Assistant credits与100 AI credits是试用期内两类额度；已读官方独立充值说明，但公开页只让在账号中选credit package，未展示价格/数量。不能把Pro工作流套餐价、模型API价或100 AI credits当作100美元。；研判：公开充值说明无套餐金额和所含积分；100 AI credits与Gateway小额赠金对应关系仍需确认。；公开充值说明无套餐金额和所含积分；100 AI credits与Gateway小额赠金对应关系仍需确认。 |
| ddlc | n8n Cloud 付费用户 Gateway credits 上线一次性赠金（2026-09 历史） | 无法可靠折算 | 权益估值V1逐条复核；2026年9月上线时已有Starter/Pro付费客户收到一次性共享Gateway allowance，官方没有数量或金额；不能使用当前每个模型价格估出统一赠金。；研判：历史一次性发放金额未公开；需要当时账户到账记录才能按面额定价。；历史一次性发放金额未公开；需要当时账户到账记录才能按面额定价。 |
| y4zw | n8n Cloud 新用户与试用账号网关额度 | 无法可靠折算 | 权益估值V1逐条复核；新Cloud账户与试用账户都有一笔small amount免费Gateway余额，但官方未公布金额。模型与工具共享同一实例余额，不能逐模型赠额相加；与同一新账号试用条可能重复，保留待判。；研判：赠金面额未公开；与n8n-cloud-free-trial领取动作重叠，不能重复计总值。；赠金面额未公开；与n8n-cloud-free-trial领取动作重叠，不能重复计总值。 |
| d3v7 | OpenAI Dots 上线首月提高深度工作额度 | 无法可靠折算 | 权益估值V1逐条复核；上线首月增加深度工作额度，但新增次数、Token/credits数量、涨幅和对应购买价均未公开；只计额外量，不能用Pro或Business Premium整月会员价。；研判：additional_deeper_work_allowance_not_denominated；launch_month_not_per_user_firstmonth；additional_deeper_work_allowance_not_denominated；launch_month_not_per_user_firstmonth |
| 2s4e | Codex Auto-review 免费且不消耗套餐额度 | 无法可靠折算 | 权益估值V1逐条复核；Auto-review免费且不消耗套餐用量已确认；没有独立公开售价、固定调用量或准确底层模型/Token计量。不能以主Agent/API价格或整份套餐估出安全审核服务价值。；研判：no_separate_auto_review_price；no_token_or_call_quantity；no_separate_auto_review_price；no_token_or_call_quantity |
| qpvw | Codex 周额度重置卡发放 | 无法可靠折算 | 权益估值V1逐条复核；一次banked reset补充周额度；周额度不是独立美元赠金，原帖没有充值/Token对应数量。 缺少可复算的新增额度，不以套餐月价代替。；研判：reset_increment_not_denominated；reset_increment_not_denominated |
| 04je | Codex 与 ChatGPT Work 额度重置 | 无法可靠折算 | 权益估值V1逐条复核；原帖确认一次已重置及当天稍后另一次；额外可用额度没有统一数字。 缺少可复算的新增额度，不以套餐月价代替。；研判：reset_increment_not_denominated；reset_increment_not_denominated |
| an23 | Codex 额度重置与额外加赠 | 无法可靠折算 | 权益估值V1逐条复核；一次自动全量重置加一次banked reset，卡可在24小时内按需使用；两次新增可用量都随账号原套餐和已消耗量变化，未公开美元额度。 缺少可复算的新增额度，不以套餐月价代替。；研判：reset_increment_not_denominated；reset_increment_not_denominated |
| b5r4 | Codex 全球付费用户额度重置 | 无法可靠折算 | 权益估值V1逐条复核；预告10月2日全量恢复付费账号，未给各档新增Token/credits，不能按GPT-6.1 Sol套餐全价计值。 缺少可复算的新增额度，不以套餐月价代替。；研判：reset_increment_not_denominated；reset_increment_not_denominated |
| gyju | Codex 与 ChatGPT Work 付费用户额度重置 | 无法可靠折算 | 权益估值V1逐条复核；paid users全员恢复用量，未公布新增用量和已使用比例。 缺少可复算的新增额度，不以套餐月价代替。；研判：reset_increment_not_denominated；reset_increment_not_denominated |
| qwpd | Codex 付费订阅额度重置 | 无法可靠折算 | 权益估值V1逐条复核；tomorrow对所有付费订阅全量恢复，未公开各档实际增加的Token/credits。 缺少可复算的新增额度，不以套餐月价代替。；研判：reset_increment_not_denominated；reset_increment_not_denominated |
| na4l | Codex 额度重置 | 无法可靠折算 | 权益估值V1逐条复核；原帖仅预告this afternoon执行，没有新增Token或credits数量。 缺少可复算的新增额度，不以套餐月价代替。；研判：reset_increment_not_denominated；reset_increment_not_denominated |
| rsn4 | Codex 额度重置 | 无法可靠折算 | 权益估值V1逐条复核；hard reset是本次发放；“some users had stacked up to three”描述原先已存卡，不能当本次额外送三次。 缺少可复算的新增额度，不以套餐月价代替。；研判：reset_increment_not_denominated；preexisting_three_cards_not_new_award；reset_increment_not_denominated；preexisting_three_cards_not_new_award |
| kia6 | Codex 额度重置 | 无法可靠折算 | 权益估值V1逐条复核；单次自动重置，原公告未公开每个账号新增Token、credits或可购买余额。 缺少可复算的新增额度，不以套餐月价代替。；研判：reset_increment_not_denominated；reset_increment_not_denominated |
| 75yz | GPT-5.6 Sol 发布限时额度重置 | 无法可靠折算 | 权益估值V1逐条复核；未来24小时两次重置已经确认，但每次增加的可用Token或credits未公开。 缺少可复算的新增额度，不以套餐月价代替。；研判：reset_increment_not_denominated；reset_increment_not_denominated |
| fb02 | Codex 周额度重置卡发放 | 无法可靠折算 | 权益估值V1逐条复核；付费账号发放一张banked reset；原文未给卡可恢复的统一Token/credits或独立售价。 缺少可复算的新增额度，不以套餐月价代替。；研判：reset_increment_not_denominated；reset_increment_not_denominated |
| s8y9 | OpenCode Ling-3.1-Flash 模型免费开放 | 公测未定价 | 权益估值V1逐条复核；OpenCode原帖明确Ling-3.1-flash免费，Zen也列Free。已读OpenRouter同版端点只有Novita零价，未读到原厂可引用的付费单价；零价路由是促销价，不能记为0美元或套Ling3.0价格。；研判：原厂InclusionAI官网当前访问403，可靠正式售价暂未查到；OpenRouter同版只展示$0促销价。；第三方声称未来价格不能替代原厂或同版实际付费路由。；原厂InclusionAI官网当前访问403，可靠正式售价暂未查到；OpenRouter同版只展示$0促销价。；第三方声称未来价格不能替代原厂或同版实际付费路由。 |
| bh9l | OpenCode Space Bunny 模型免费期延长数日 | 公测未定价 | 权益估值V1逐条复核；Space Bunny是尚未揭晓身份的模型，OpenCode只承诺继续赞助few more days。模型正在调校且没有匹配的正式模型ID及购买价，延长具体天数也没写，不套别的模型或30天预算作数字。；研判：隐名模型尚未揭晓，无法匹配原厂或OpenRouter付费模型。；延长天数与Token配额没有公布；与Zen/app综合条重叠，不能重复计价。；隐名模型尚未揭晓，无法匹配原厂或OpenRouter付费模型。；延长天数与Token配额没有公布；与Zen/app综合条重叠，不能重复计价。 |
| enoz | Otter AI Basic 每月300分钟免费转写 | 无法可靠折算 | 权益估值V1逐条复核；免费300分钟已核实，但Otter公开价为含多种功能的会员价格，未查得同规格单独分钟单价；整包Pro会员价不等于免费Basic300分钟价值，不拆套餐总价伪造分钟购买价。；研判：无同规格单独分钟售价；免费Basic与付费Pro功能和导入/单次时长不同；无同规格单独分钟售价；免费Basic与付费Pro功能和导入/单次时长不同 |
| ej9n | Otter.ai 邀请好友奖励（受邀者） | 无法可靠折算 | 权益估值V1逐条复核；官方邀请条款明确赠1月旧档Pro Lite300分钟；现行定价只展示Basic/Pro/Business/Enterprise，未查得Pro Lite对应售价，不能把现行Pro会员或免费Basic的价格套上。；研判：Pro Lite同档售价缺失；原审批确认的奖励事实不变；Pro Lite同档售价缺失；原审批确认的奖励事实不变 |
| 5sj1 | Otter.ai 邀请好友奖励（邀请人） | 无法可靠折算 | 权益估值V1逐条复核；邀请人具体奖励由邀请页面各Qualifying Action决定，10000分钟和12月只是账户累计上限；Pro Lite无对应售价，分钟亦无可匹配单价，不把累计上限视为一次可领。；研判：单次奖励未固定；Pro Lite同档售价缺失；分钟无独立购买价；单次奖励未固定；Pro Lite同档售价缺失；分钟无独立购买价 |
| a9g4 | PixVerse x OpenAI 研讨会参会送积分 | 无法可靠折算 | 权益估值V1逐条复核；官方研讨会确认参会赠PixVerse积分，但未公布数量；已有$0.01/credit价格仍不足以给总美元，不把ChatGPT Pro随机抽奖计入。；研判：缺奖励数量，不属于beta_unpriced。；缺奖励数量，不属于beta_unpriced。 |
| domh | 千问办公上线福利：付费用户经济版模型文本推理不扣积分（已结束） | 无法可靠折算 | 权益估值V1逐条复核；已读官方全文，历史文本推理免积分范围明确，但经济版不是具体模型版本。会员还含多模态/工具收费项，不能用完整会员月费代替这项免积分模型价值。；研判：需经济版模型实际型号或对应输入/输出积分消耗表；不扩展到联网、网页总结和多模态。；需经济版模型实际型号或对应输入/输出积分消耗表；不扩展到联网、网页总结和多模态。 |
| vqam | Runway 企业版 2 个月免费 | 无法可靠折算 | 权益估值V1逐条复核；完整条款是前60天消耗等额返赠、上限合同年度积分；没有公开固定积分数或企业合同单价，不能拿个人两个月订阅价替代。；研判：已批准文案与完整条款有差异；此处保留审批，仅报缺口。；返赠在Onboarding结束后发放，不能假定首30天取得。；已批准文案与完整条款有差异；此处保留审批，仅报缺口。；返赠在Onboarding结束后发放，不能假定首30天取得。 |
| erdi | 商汤 SenseNova 无水印图片生成限时免费 | 公测未定价 | 权益估值V1逐条复核；免费的是无水印附加功能，已读原文明确免费公测后续付费但无售价；不能将底层图片生成价格冒充无水印赠额。； |
| h6mu | 商汤 SenseNova TokenPlan 公测免费：每 5 小时 6 万积分 | 公测未定价 | 权益估值V1逐条复核；已读取商汤官方公测积分全文及订阅Free公测档，后续付费档未上线；OpenRouter无同版付费模型，结案公测未定价，美元保持空。；研判：当前免费档仍写U1 Fast，而模型文档更新为U1.5 Lite/Fast，不能无证自动替换已批准免费名单。；当前免费档仍写U1 Fast，而模型文档更新为U1.5 Lite/Fast，不能无证自动替换已批准免费名单。 |
| zld9 | web_fetch 限时免费 | 无法可靠折算 | 权益估值V1逐条复核；已实际读取完整计费页，web_fetch只有限时免费，没有正式单价或次数；V1没有工具调用标准用量，不编次数。运行时和模型收费不能当赠送。；研判：领取与限免持续时间未公布。；领取与限免持续时间未公布。 |
| ai6g | Windsurf 现有付费订阅用户免费加赠一周（2026-03 历史） | 无法可靠折算 | 权益估值V1逐条复核；已有付费用户在3月19日获得其当前grandfathered套餐一周。历史Pro/Teams及企业合同原价不一，公告没有每位领取者对应价格；不能统一采用新Pro20美元套餐价，也不能采用新Max档当赠额上限。；研判：需历史套餐档位及锁价；新价与旧价不能混用。；需历史套餐档位及锁价；新价与旧价不能混用。 |
| 6nkr | Grok Bot 企业版两周免费试用 | 无法可靠折算 | 权益估值V1逐条复核；14天组织试用权益属实，但官方未给对应组织/席位独立购买价、固定用量或底层模型配额；当前个人会员包含Bot不能估算历史整个组织权益。；研判：历史活动2026-09-03至推算2026-09-17；不以今日个人套餐价替代组织试用价。；历史活动2026-09-03至推算2026-09-17；不以今日个人套餐价替代组织试用价。 |
| 3hhy | 小米 MiMo Claw 每天 3 小时免费 | 无法可靠折算 | V1已有固定编程月用量，缺Token上限本身不再构成留空理由；同版mimo-v2.6-pro也已有真实原厂价。复核仍留空的具体原因是免费3h的计费范围未查明：官方给云端免费体验、全部核心功能和免费版生成示例，但没有明确默认模型调用由免费额度承担、不扣已有TokenPlan/按量API余额。Claw独立服务与TokenPlan费用分别核算，API Key接入亦受支持；不能仅凭模型搭载或免费runtime就估整份模型Tokens。7×24h付费Claw服务比每日单次3h体验范围更广，也不是同规格按小时购买价。；尚未查明免费模式是否使用独立模型免费池、是否扣已有TokenPlan Credits/按量余额、或是否要求用户填自己的API Key。未查明不等于确认模型Tokens收费。；单次免费算力上限与模型Token计量的关系、实际配额和触达限额后的收费/停止规则未公开读到。；当前Claw登录入口本轮只返回Xiaomi Account错误页，未读取到免费模式计费界面；既有管理员记录只证明开始体验，未证明任务完成或Token费用。；原厂¥14.9/月为Claw服务首次优惠，¥19.9/月/¥233.8年为付费服务参考；付费专属7×24h、多任务及办公权益不等于免费3h/day同规格runtime，不直接整包替代或3/24折算。；活动完整有效期未公布；本次未将新MiMo Desktop会员、付费TokenPlan额度或历史V2.5模型价套用云Claw。 |
| hd47 | 小米 MiMo-V2.5-TTS 系列语音合成 API 限时免费 | 公测未定价 | 权益估值V1逐条复核；本轮实际读取小米API价格页，TTS三款仍只显示限时免费，没有正式单价；OpenRouter也无同版付费匹配，价值待定。；研判：限免截止未公布，不能当永久免费。；限免截止未公布，不能当永久免费。 |

## 条件估值说明

以下金额已使用明确价格和可复算公式，但仍有 V1 允许的场景假设、部分模型覆盖或历史价格参照。详情显示暂定标识；如发现价格或单位实际上不适用，应改为留空并继续核查。

| 短码 | 条目 | 比较值或申请上限 | 条件与限制 |
|---|---|---:|---|
| hvld | Amazon Q 开发者版永久免费服务 | $3 | 使用Pro付费超额价作为同功能购买参考，免费账户不能直接买单行加量；50次智能体请求无单独购买价，本次未估 |
| coxm | Amazon Comprehend 12 个月免费试用 | $5 | 采用NLP Sentiment Analysis首1000万单位价；每请求至少3单位；包含多个独立API，本值仅覆盖原批准基准API |
| da7a | Cohere 免费试用 API Key 额度 | $0.6 | text-v1，全部1000月调用预算用于Chat，不与Embed/Rerank/音频调用叠加。；可行性例1000次，各1000输入/200输出；20天每天34次、10天每天32次，每天分2分钟，每分钟≤20次。该安排只是V1预算覆盖证明，不是用户平均或赠送Token定义。；所有Token价格均普通实时无缓存；R/R+采用官方当前Live08-2024版，A+由OR endpoint name明确映射05-2026版。；无实际发起推理或消耗用户配额。；价格覆盖5/7；Command A Reasoning/Command A Vision官方免费至限速、生产须联系销售，OR无同版正价。；Trial仅用于评估、测试与proof of concept，不能从本估值推定免费生产/商业权利。；Cohere当前A+专文只公布free至rate limit；价格页隐藏RSC旧卡片仍有2.5/10而当前文档不支持该价，未采用隐藏旧值，采用实际同版Cohere OR付费端点0.3/1.5。 |
| 60ys | GitHub Copilot 学生计划免费：每月 200 AI Credits + 无限代码补全 | $2 | 无限代码补全未独立计价；美元仅为固定AI余额的部分权益值。 |
| pi7g | 扣子免费版每日登录 1500 积分 | $6.724317 | 首30天每日登录。；企业超额费率作为同一扣子积分参照，免费账户本身不能超额扣款。；当前积分获取表仅列新人一次性1,500、未再列每日1,500；旧公告仍保留，实际持续发放需账户确认，不能当已核实当前30天保障。 |
| j43a | Devin 桌面端 Kimi K2.7 和 GLM 5.2 限时免费 | $6.75 | 标准V1编程10M输入+1M输出/30天，按11天线性缩放、全部非缓存。；官方未列模型免费调用量上限，条件估值假设期间限流允许覆盖按时长缩放的用量。；Kimi K2.7底层版本及是否Code/highspeed未明确，不能纳入已计价成本中位。；按日期差计算11天，没有推造日内开始/截止时刻；最后一日覆盖精度未公开。 |
| 0un1 | Windsurf 平台 GPT-5.2 限时免积分 | $31.5 | 沿用已批准2025-12-11至2026-02-04历史窗口，首30天覆盖不放大。；标准V1编程30天10M输入+1M输出，全部非缓存，输出含所有计费推理Tokens。；官方原公告只说limited time，已批准截止来自历史审核，不能改成当前可领。；非积分限制和实际吞吐未明确，标准用量覆盖仅为条件假设。 |
| 95p0 | GMI Cloud 指定Qwen与Wan模型7天免费窗口 | $0.046722 | text-v1，7天活动覆盖7/30标准量；不保证加入时仍剩完整7天。；使用原厂人民币即期参考价而非GMI登录后实际账单价；无缓存、无Batch。；实际全球窗口起止未知，且未量化速率；假设标准用量不被限速阻断。；活动统一起止未公开；默认7天为完整活动窗口，不是每个账号激活后7天。；GMI同平台付费模型价格未核得；价格原厂地域与GMI国际服务存在参考差异，故暂定。 |
| 3fwc | GMI Cloud 混元 Hy Image 3.5 7天免费体验 | $0.56 | image-v1 base100 images/30days; 2K generation; campaign covers7days; fractional image quantity is a normalized comparison cost.；已批准tested权益保留；未重新领取或修改证据级别。；全局活动具体起止未确认。；Exa出现另一个hy-week页面称14天，但页面当前404；不能以该搜索摘录改变批准7天。；同平台$0.024价证据是9月23日官方测试报告；当前是否价格变更未由登录后账单复核。 |
| fihl | Adobe Firefly 个人套餐首年指定模型无限量 | $4 | Firefly Pro及4000/7000档默认；高档更多模型与分辨率另算，模型成本差异不是赠额区间。；保留首年不限量原始权益，但完整无限量价值没有确定上限，fullValue空。；批准基线最低档6个图像模型中，Firefly Image4Ultra与5的1K输出规格本次官方页面未明确，暂从同规格候选排除；价格覆盖4/6，估值暂定。；促销表Markdown勾叉丢失，采用已批准人工矩阵作为资格基线；实时页面确认矩阵名称与活动年限，未改审批。 |
| b5t0 | Higgsfield 新用户 1 天 All Unlimited 免费试用 | $1.32 | 主要用途选择视频；每30天600秒生成素材、24小时缩放20秒。；同模型同平台5秒720p标准扣点，最低可读套餐等效积分费率.033。；$99 Bundle至15秒，免费试用至8秒，规格不同不冒充同权益购买价。；同场景视频价格覆盖3/5，缺Fast与Mini同规格价；Gemini Omni Flash仅标standard、分辨率未明确，整体真实中位仍暂定。；Motion Control需参考运动工作流，与普通text-to-video场景不同，不混入中位。；平台公开通用积分价.05与最低适用套餐.033不同，无可读加购包当前价格；本轮按V1最低套餐等效价。 |
| ehis | Higgsfield 电影人资助计划：入选送 100,000 credits | $3,300 | 估值对象为一名已入选领取者；当前积分换价作历史参考。；官方通用$0.05/credit与现行最低适用个人年付套餐$0.033/credit不同；无可读公开加购包单价，采用最低套餐等效价，暂定。；获批额度只作为申请参考上限，不表示保证可领。；申请完整上限与首30参考值独立分列。 |
| tm4h | Higgsfield AI Influencer 5次角色生成体验（历史） | $0.18 | 当前角色价格作历史参考，不恢复领取状态。；官方通用$0.05/credit与现行最低适用个人年付套餐$0.033/credit不同；无可读公开加购包单价，采用最低套餐等效价，暂定。 |
| n0ow | Higgsfield MCP新人3天试用与100专享credits | $3.3 | 当前官方积分兑换关系用于购买参考价值。；官方通用$0.05/credit与现行最低适用个人年付套餐$0.033/credit不同；无可读公开加购包单价，采用最低套餐等效价，暂定。 |
| kni0 | Higgsfield 11 天 Seedance 无限量生成 | $41.91 | 采用现行可读个人套餐最低年付99/3000费率；不加前4天4K高档与其他7天模型重复满量。；后7天Mini/Fast未取得同规格购买价，暂定值不能视为三个模型完整中位。；当前通用20积分每美元与套餐单位费率不同，本次按V1最低适用套餐比价规则采用.033。 |
| 043l | Higgsfield 邀请好友送 Seedance 2.0 无限量 | $8.91 | 官方720p报价文章$49/1000套餐费率与20积分每美元通用价不同，本轮用公开通用积分价，未取得当前积分加购包单价。 |
| kh1a | Higgsfield 33 天 Seedance 2.5 无限量生成 | $94.38 | 选择720p、8秒同规格；只计批准主权益Seedance2.5，不把另外2.0权益共享叠加。；当前官方套餐费率与通用20积分每美元不同，积分加购单价尚无可读公开页，暂定。 |
| v5d9 | Kilo Code Step 5 Preview 限免一周 | $2.96 | 以一周活动开始时参与者为基准；标准V1编程30天10M输入+1M输出等比例覆盖7天。；全部非缓存，输出包括推理Tokens；假设限流允许覆盖约2.333M输入+0.233M输出。；没有公布具体免费Token/request上限；金额仅是已批准一周窗口可覆盖标准用量的条件估值。；全局一周窗口不代表晚参加者也获得7天；具体结束时刻未公开。 |
| th5h | Leonardo.Ai 免费版每日 150 Tokens | $4.5 | 假设30天每天用完，不结转；只折固定Token池。；页面提供年付最高20%折扣但本次抓取未给各个人档精确年付成交价，不能直接套20%。；已实际读Top-up Tokens官方文档，只有包购买条件、没有公开单价；当前最低适用套餐费率覆盖仍暂定。 |
| rdd8 | LiblibAI 登录领积分 | $1.52 | 每30天均登录并使用当天额度；FX采用ECB2026-10-09。；按当前官方套餐明确列出的最低单位费率比价；积分超市加购表未返回价目。；当前套餐首年金额使用动画字符，采用官网直接公布的单位价0.017元；该单价已四舍五入。 |
| bxqf | Magnific One 付费会员桌面端限时不限量 | $2.77 | 捕获页面当前$按USD作条件参考，地区结账币种仍需确认。；日期窗10月8至15未公布精确时刻，以7个完整24小时保守缩放。；4M年付配置的对应价格没有展开，无法确认该配置最低单位费率；已给1.5M、600k、240k三种可复算费率。；页面价格随地区变化，官方原页本次直接403，Jina当前只显示$而没有ISO币种；状态暂定。 |
| l501 | Manus 每日免费 300 积分 | $37.58 | 套餐比例购买参考成本；年度Pro月度积分费率，需年付；未获得全部更高credit tiers各档价格，覆盖仅限官网公开可核档位；package_ratio_includes_other_features；unpublished_higher_tier_rates_not_verified |
| gu0r | Manus 注册送 1,000 积分 | $4.18 | 套餐比例购买参考成本；年度Pro月度积分费率，需年付；未获得全部更高credit tiers各档价格，覆盖仅限官网公开可核档位；package_ratio_includes_other_features；unpublished_higher_tier_rates_not_verified |
| t1fm | Meshy 免费层每月 100 积分 | $1.25 | 按明确可核套餐单位价比价，不承诺Free账号具有付费档功能或购买资格。；加购有购买入口与折扣但本次公开正文未返回包价；不能声称已核得全平台最低加购费率。 |
| 96vi | n8n 初创公司计划：Business 套餐五折（仅自托管，员工少于 20 人、融资少于 500 万欧元） | $373.72 | 假设符合企业资格并购买一年Business；EUR标价月均有整数四舍五入，全年值是参考成本。；官方优惠页333欧元/月与667×50%=333.5欧元有显示舍入差异，结算以实际订单为准。；整体为工作流会员折扣，并非单独AI推理赠金；不能用于API赠额总计。；月均显示舍入导致精确全年金额待订单确认。 |
| g2qo | Nous Portal 免费模型层（需绑定支付方式） | $0.126 | text-v1; uncached real-time; input 1M + output 0.2M per30days；假设已批准免费层可持续首30天。；公开未给量化配额；这里是能完成标准用量时的条件参考成本，非保证赠金。；无价模型不按0进入中位数；覆盖7/9，暂定。；官方仅Standard rate limits，未量化总Token/月量；假设标准1.2M文本用量未被限制阻断。；Solar Pro4与SpaceBunny当前目录可能变化，保留已批准权益，不把今日目录漂移当新批准。 |
| 65px | Novita AI 三款模型零价调用（Apodex 1.1 Mini、Ling 3.1 Flash、Ling 3.0 Flash Sante） | $0.119 | text-v1; uncached real-time; input 1M + output 0.2M per30days；按旧批准的Sante免费可用30天且满足标准量时估值。；当前Novita价目Sante已收费，与旧免费基线存在时点变化；未改变已批准valueText/models。；原厂/OR同版Apodex1.1Mini与Ling3.1Flash未核得实际付费价格，不能把free route价格当价值。；免费用量上限与零价可持续30天均未明确，估值为条件值。 |
| k9ul | NVIDIA NIM 免费 Serverless API 额度 | $0.25 | text-v1，无缓存命中，DeepSeek采用峰时标准国际价。；假设免费端点可持续30天并可在既有速率规则内完成标准1.2M Token；40RPM不转换为每月Token总额。；覆盖11/17，缺价模型不按0，结果暂定。；官方仅Most models40RPM，无量化Token月总额；标准用量可完成为条件估计。；当前FreeEndpoint目录为38款，批准模型栏39款；不以当前变动改变已批准清单。；legacy型号同版服务是否继续免费应逐端点复核；本结果只为批准权益价格参考。；Kimi原厂价格含默认cache写入，标准工作量的可缓存前缀数量未定；不假设全部input都写入缓存，排除该候选计价。 |
| v6r6 | OiiOii 免费档每日积分／签到奖励 | $14.89 | 免费领取者30天均签到并使用；参考付费套餐完成其全部签到。；公开价页仅保证当期活动金额，以管理员已核60作为固定基线。；加购包价未渲染；奖励积分有效期仍依活动及账号明细。 |
| d6wy | OiiOii 新用户注册赠盒饭积分 | $0.5 | 参考购买者每个会员周期完成全部签到，因此分母包含8000即发与1550签到积分。；不把套餐内积分作为额外赠送。；加购标题有Buy Credits但没有渲染包价，使用可核套餐最低单位费率。 |
| uqli | OpenCode 应用内 8 个限时免费模型（不用绑卡） | $1.68 | 标准V1编程30天10M输入+1M输出，均非缓存；没有可核实固定月预算时，金额仅是免费路由在有效期内覆盖该工作量的条件参考成本。；默认MiMo限免未公告截止，假设能持续30天且限流允许完成基准用量；不保证可实际消耗这些Tokens。；原厂MiMo公开页只展示订阅价格，未读到API单价，因此该模型使用同版本OpenRouter付费API价；NVIDIA无此模型原厂公开按Token购买价，使用OpenRouter匹配付费路由。；计价覆盖不足，未知价模型不按0计价；Space Bunny、Big Pickle等无公开模型身份/同版价格。；应用内批准模型写Muse Spark1.3但Zen当前免费服务为Contributor；未将两个服务档位视为同价。；管理员既有实测说明多模型限流，标准用量能否被实际覆盖未证实。；主页只泛称Free models included；具体应用模型名单沿用已批准快照，未扩成当前全部Zen目录。 |
| 004f | OpenCode Zen API 13 个限时免费模型（需绑卡） | $1.68 | 标准V1编程30天10M输入+1M输出，均非缓存；没有可核实固定月预算时，金额仅是免费路由在有效期内覆盖该工作量的条件参考成本。；默认MiMo限免未公告截止，假设能持续30天且限流允许完成基准用量；不保证可实际消耗这些Tokens。；原厂MiMo公开页只展示订阅价格，未读到API单价，因此该模型使用同版本OpenRouter付费API价；NVIDIA无此模型原厂公开按Token购买价，使用OpenRouter匹配付费路由。；计价覆盖不足，未知价模型不按0计价；Space Bunny、Big Pickle等无公开模型身份/同版价格。；Step 5 Preview候选按已批准一周窗口缩放成本；与独立活动条重叠，不可把两条加入金额总和。 |
| wofy | OpenCode Step 5 Preview 免费一周 | $2.96 | 以一周活动开始时参与者为基准；标准V1编程30天10M输入+1M输出等比例覆盖7天。；全部非缓存，输出包括推理Tokens；假设限流允许覆盖约2.333M输入+0.233M输出。；没有公布具体免费Token/request上限；金额仅是已批准一周窗口可覆盖标准用量的条件估值。；全局一周窗口不代表晚参加者也获得7天；具体结束时刻未公开。 |
| 9v26 | OpenRouter 免费模型：每天 50 次（累计充值满 $10 升到每天 1,000 次） | $0.158 | text-v1，普通实时无缓存/无Batch。；月预算安排为20天每天34次+10天每天32次=1000；每天分2分钟，每分钟≤20次；每个例请求1000输入200输出。仅是标准总量的可行性证明，非实际平均Token/次或赠送1.2M Token。；默认选可直接调用的Gemma4-31B:free；这是批准steps中允许的免费变体方式，随机openrouter/free实际选择不固定，不能保证每次都选同一模型。；模型池变化、provider可用性、免费层策略可改变，首30天参考暂定；9/13缺价不以0进入中位数。；四个同场景免费模型没有同版正价候选；LFM2.5原厂只公布本地部署规格、其余Apodex/DotsPreview/NanoOmni未核可靠购买价。；免费与付费同模型服务context可能不同，但本例1200总context、200output均低于免费变体和付费参考约束，未利用大context溢价或路由规格差异。；升到1000/day须累计购买credits，默认未充值者仅50/day；上档次数不作为额外赠金计价。 |
| 6ifq | Pollo MCP 连接赠20积分 | $0.36 | 积分数量沿用已批准事实与管理员2026-10-09实测。；官方加购数量价格未公开渲染，采用已知套餐单位费率比价。；价页动态促销卡金额部分空白且与摘要栏不完全一致；采用明确成对列出的$14.50/800，不推断隐藏的更低促销价。 |
| y8w7 | Pollo AI 连续7天签到奖励25积分 | $0.45 | 积分数量沿用已批准事实与管理员2026-10-09实测。；官方加购数量价格未公开渲染，采用已知套餐单位费率比价。；价页动态促销卡金额部分空白且与摘要栏不完全一致；采用明确成对列出的$14.50/800，不推断隐藏的更低促销价。 |
| 7p7r | Pollo AI 新用户注册20积分 | $0.36 | 积分数量沿用已批准事实与管理员2026-10-09实测。；官方加购数量价格未公开渲染，采用已知套餐单位费率比价。；价页动态促销卡金额部分空白且与摘要栏不完全一致；采用明确成对列出的$14.50/800，不推断隐藏的更低促销价。 |
| d4bm | Pollo AI 邀请奖励：注册双方各50、升级各200积分 | $0.91 | 积分数量沿用已批准事实与管理员2026-10-09实测。；官方加购数量价格未公开渲染，采用已知套餐单位费率比价。；付费升级200积分不属于本站收录范围；旧usdMax $4.53需清空，不能将邀请双方积分归到同一人。；价页动态促销卡金额部分空白且与摘要栏不完全一致；采用明确成对列出的$14.50/800，不推断隐藏的更低促销价。 |
| svv5 | Pollo AI 社交任务送40积分 | $0.73 | 积分数量沿用已批准事实与管理员2026-10-09实测。；官方加购数量价格未公开渲染，采用已知套餐单位费率比价。；价页动态促销卡金额部分空白且与摘要栏不完全一致；采用明确成对列出的$14.50/800，不推断隐藏的更低促销价。 |
| ksye | Qoder 国际版 Qwen3.8-Flash 免费期延长 | $1.97 | 标准用量V1：30天10M输入+1M输出；默认全部非缓存，不计批处理折扣。；活动截止未公布，条件性假设可持续30天并覆盖所需用量；原厂国际API价格仅作同模型成本参照，不是Qoder工具整体价值。；免费延长的最终截止未公布，高峰时可能较慢；没有保证30天可用或吞吐。 |
| 8vk3 | 阿里 Qoder CN Qwen3.8-Flash 免费期延长 | $1.6 | 标准用量V1：30天10M输入+1M输出；默认全部非缓存，不计批处理折扣。；活动截止未公布，条件性假设可持续30天并覆盖所需用量；原厂中国地域API价仅作同模型成本参照。；免费延长的最终截止未公布，高峰时可能较慢；没有保证30天可用或吞吐。 |
| xad0 | 硅基流动国内站多款模型免费使用 | $0.134486 | text-v1，Qwen3非思考模式、无缓存；30天持续可用并可完成标准1.2M Token时的条件值。；未公开量化免费总Token/限速；不从未知RPM或请求数推导每次Token。；模型栏19款与公开valueText14款不一致；保留人工已批准models，不在估值中改写公开字段。；当前verifyResult=evidence_missing、状态stale；数字不代表已重新验证领取可用。；计价覆盖2/6，不以缺价当0；免费可持续30天未经保证。；原厂未核得GLM9B精确版本正价，OR没有这些精确型号；不替代32B/9B不同版。 |
| yn9a | Nous Portal Step 5 Preview 免费一周 | $0.359333 | text-v1; uncached real-time; input 1M + output 0.2M per30days；覆盖7/30标准文本量；不保证任何时间加入都能获得完整7天。；一周活动为全局窗口；精确结束时刻及领用时剩余天数未确认。；未公开Token/请求总额度；标准用量未受限为条件假设。 |
| glj5 | Cline Step 5 Preview 免费一周 | $2.96 | 以一周活动开始时参与者为基准；标准V1编程30天10M输入+1M输出等比例覆盖7天。；全部非缓存，输出包括推理Tokens；假设限流允许覆盖约2.333M输入+0.233M输出。；没有公布具体免费Token/request上限；金额仅是已批准一周窗口可覆盖标准用量的条件估值。；全局一周窗口不代表晚参加者也获得7天；具体结束时刻未公开。；Cline原帖本身只明确免费，一周期限由原厂约10分钟后的同事件转述确认，沿用已批准事实。 |
| g6q3 | 腾讯混元生文新人免费额度 | $0.537945 | 共享Token按V1标准文本5:1分配，真实I/O比例会变。；候选8款均按纯文本工作量比较；翻译/角色/视觉用途的质量差异不由成本中位表达。；完整参考值¥4.3另假设独立embedding1M用完，不代表标准文本场景需求。；旧平台停止支持新购，当前首开是否仍领取需入口确认；本轮保留批准历史，不借TokenHub当前礼替换旧权益。 |
| k7vv | 腾讯 WorkBuddy：Hy3 限免与 Hy4 preview 夜间限免延期至 10 月 31 日 | $0.268973 | 按已批准9/30起至10/31的活动历史事实比较前30天。；假设Hy3限免配额可覆盖1.2M文本Token，不将限免理解为保证任意用量。；官方公众号本轮双路径都需CAPTCHA，原活动事实依据已批准快照，未声称当前重新验证成功。；Hy4每日免费额度未给量，不能与Hy3构成同工作量中位候选。 |
| p7yb | 智谱 8 个 Flash 模型免费调用 | $0.1405 | 标准文本用量可在免费调用限流内完成，未把速率上限乘整月。；六个文本/视觉理解免费模型只匹配到1个同版本付费价，覆盖不足暂定；不是全八模型总价值。 |
