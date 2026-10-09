# 公开文案与内部审核分离（2026-10-09）

管理员指出TokenRhythm两条的公开简介混入查证过程及历史平台纠错。扫描395条记录和9份待审更新，仅整理文案，不执行上架、拒绝或其他状态变更。

## 已执行的数据修正

- 85条记录，共125个公开字段：39条已通过、14条待审、32条已拒绝的归档记录。
- 核验经过、历史纠错和估值取舍迁入仅管理员可见的reviewMemo；旧文案也保留在人工修订记录。
- 9份更新仍保留；海螺调研候选文案同步清理，Trae旧公开版本清理后重算与其既有候选的差异。
- 使用只允许title/valueText/steps/creditValidity的定向维护计划，逐行核对updated_at、原字段、review_memo、审批状态及现有候选，防止覆盖审核员并发修改。写入后85条125字段全部读回一致，其余业务字段、证据、日期、金额及审批状态保持原值。
- 完整数据库快照及带原文的维护计划保留本机/tmp，权限0600，不提交内部记录或密钥。

## 防止复发

- 数据合同、通用规则、审核技能与AGENTS明确公开字段的用户视角。
- 抽取提示词去掉“把不确定之处写进valueText”的旧指令；平台要点和历史纠正只能作判断依据，不复制到公开文案。未知信息仍由空值、unknown和证据门槛表达，真实领取限制保留。
- 公开详情接口不返回完整修订记录；已登录管理员从受鉴权的后台接口读取。权限回归验证公开结果不泄露旧审核文案、内部memo，管理员仍可查看完整历史。

## 修正清单（仅列公开标题与字段）

| ID | 标题 | 字段 |
|---|---|---|
| periodic-periodic-verification-18-bonus | 基元律动 认证赠18额度 | title, valueText, steps |
| periodic-periodic-topup-19-minus-18 | 基元律动 充19减18优惠 | title, valueText, steps |
| pollo-pollo-ai-social-media-rewards | Pollo AI 社交任务积分奖励 | title, valueText |
| pollo-pollo-ai-referral-program | Pollo AI 邀请好友：注册使用双方各得30积分 | valueText |
| anthropic-anthropic-claude-startups-100-credits | Founder House API额度申请（入口不可用） | title, valueText, steps |
| xai-xai-grok-bot-twitter-rate-limit-daily-1000 | 个人 Grok Bot 推特信息采集限额 | title, valueText, steps |
| openai-openai-codex-auto-review-free | Codex Auto-review 免费且不消耗套餐额度 | valueText |
| qwen-qoder-qwen-3-8-flash-free-extended | Qoder CN Qwen3.8-Flash 免费期延长 | valueText |
| oiioii-new-user-bonus | OiiOii 新用户注册赠盒饭积分 | title, valueText, creditValidity |
| oiioii-daily-check-in | OiiOii 免费档每日积分／签到奖励 | title, valueText, creditValidity |
| oiioii-referral-bonus | OiiOii 邀请好友注册登录奖励 | title, valueText, creditValidity |
| anthropic-anthropic-oss-scanner-free-security-audits | Anthropic OSS Scanner 开源项目免费安全扫描 | valueText |
| higgsfield-firefly-unlimited-generations-offer | Adobe Firefly 个人套餐首年指定模型无限量 | valueText |
| anthropic-anthropic-claude-250-credits-bonus-and-weekly-reset | Claude 定向赠额 | title, valueText, steps |
| vidu-vidu-signup-bonus | Vidu 注册新人试用 20 积分 | valueText |
| workbuddy-workbuddy-invite-friends-bonus | WorkBuddy 国际版邀请奖励：邀请人100、好友350积分 | valueText, steps, creditValidity |
| stepfun-stepfun-nous-portal-step-5-preview-one-week-free | Nous Portal Step 5 Preview 免费一周 | valueText, steps |
| stepfun-stepfun-step-5-preview-one-week-free-in-cline | Cline Step 5 Preview 免费一周 | valueText, steps |
| adobe-firefly-adobe-photoshop-india-student-free-year | Adobe Photoshop 印度学生首年免费12个月 | valueText, steps, creditValidity |
| zhipu-zhipu-glm-coding-plan-7-trial-cards-expired | GLM Coding Plan 7天体验卡（已领完） | valueText, steps |
| anthropic-anthropic-claude-opus-5-5-reset-card | Claude Opus 5.5 发布赠送可保存重置次数 | valueText, steps, creditValidity |
| anthropic-anthropic-claude-startups-free-year-team-credits | Claude 创业计划扩展：$1,000 API 额度＋最多5席 Team 免费一年 | valueText, steps |
| mistral-mistral-free-tier | Mistral 免费计划每月 $10 API 额度（无需信用卡） | valueText, creditValidity |
| jimeng-jimeng-cn-daily-login-points | 即梦国内版每日登录送积分 | valueText |
| deepseek-deepseek-harness-desktop-bonus | DeepSeek Harness 桌面端登录送 6 元赠金 | steps |
| zhipu-zhipu-zcode-100m-tokens-bonus | ZCode 全体用户领 1 亿 Token（Trust.patch，共 10 万份） | valueText, steps |
| trae-trae-pro-trial | Trae Pro 会员 14 天免费试用 | valueText |
| higgsfield-adobe-firefly-unlimited-promo | Adobe Firefly 个人套餐首年指定模型无限量 | steps |
| krea-krea-free-tier | Krea 免费层额度 | valueText |
| xiaomi-mimo-mimo-asr-limited-free | MiMo-V2.5-ASR 语音识别 | title, valueText |
| hailuo-hailuoai-signup-free-tier | 海螺AI新用户注册赠积分 | valueText |
| poe-poe-free-daily-points | Poe 免费用户每天积分（待实测） | valueText |
| tencent-tencent-cloud-free-trial-products | 腾讯云智能体开发平台体验版免费试用 1 个月 | valueText |
| workbuddy-free-monthly-500 | WorkBuddy 体验版每月基础 500 积分 | creditValidity |
| anthropic-anthropic-fable-5-max-team-permanent-pro-credits | Claude Pro / Team 标准席位一次性赠送 $100 使用额度（Fable 5 改为按量计费补偿） | valueText |
| trae-trae-migration-bonus | Trae 旧 Pro 手动迁移赠 $20 用量（历史） | valueText, steps, creditValidity |
| gmi-gmi-cloud-qwen-wan-7-days-free | GMI Cloud 指定Qwen与Wan模型7天免费窗口 | valueText, steps, creditValidity |
| devin-devin-windsurf-gpt-52-codex-promotional-pricing | Windsurf 平台 GPT-5.2-Codex 额度限时优惠 | valueText |
| devin-devin-windsurf-claude-opus-46-fast-promotional-pricing | Windsurf 平台 Claude Opus 4.6 (fast mode) 额度限时优惠 | valueText |
| minimax-minimax-agent-free-access | MiniMax Agent 发布期间限时免费（历史） | title, valueText |
| xai-xai-grok-free-tier | xAI Grok 个人免费层 | valueText |
| aws-aws-always-free-services | AWS HealthLake 付费数据存储内含额度（非独立永久免费） | valueText |
| gcloud-gke-free-trial | GKE Enterprise 功能90天免费试用 | valueText |
| github-github-copilot-free-completions | GitHub Copilot 免费补全额度 | valueText |
| fireworks-fireworks-ai-serverless-free-credits | Fireworks AI $1 免费 credits | valueText |
| vidu-vidu-daily-login | Vidu 每日登录赠送积分 | valueText, steps |
| pika-pika-basic-plan | Pika 旧版Basic每月150积分（FAQ历史条款，现行主站不适用） | valueText |
| higgsfield-hailuo-max-video-annual-image | Hailuo Max订阅Relax模式指定视频模型无限量 | valueText |
| tripo-tripo-topup-bonus | Tripo 中档充值赠送积分 | valueText |
| tripo-tripo-tripo-topup-bonus-2 | Tripo 中档充值赠送积分（CNY） | valueText |
| tripo-tripo-tripo-topup-bonus-3 | Tripo 高档充值赠送积分 | valueText |
| tripo-tripo-tripo-topup-bonus-4 | Tripo 顶配充值赠送积分 | valueText |
| tripo-tripo-topup-bonus-3500-cny | Tripo 高档充值赠送积分（CNY） | valueText |
| tripo-tripo-topup-bonus-7000-cny | Tripo 顶配充值赠送积分（CNY） | valueText |
| pollo-pollo-ai-subscriber-perk | Pollo AI 付费会员指定模型不限量 | title, creditValidity |
| openai-openai-codex-global-reset-oct-3-2026 | Codex 10月2日全球额度重置执行进度 | title, valueText |
| zhipu-zhipu-glm-4-7-flash | GLM-4.7-Flash 免费文本模型 | valueText |
| zhipu-zhipu-glm-4-5-flash | GLM-4.5-Flash 免费文本模型 | valueText |
| zhipu-zhipu-glm-4-flash | GLM-4-Flash 免费文本模型 | valueText |
| zhipu-zhipu-glm-4-6v-flash | GLM-4.6V-Flash 免费模型 | valueText |
| zhipu-zhipu-glm-4-1v-thinking-flash | GLM-4.1V-Thinking-Flash 免费模型 | valueText |
| zhipu-zhipu-glm-4v-flash | GLM-4V-Flash 免费模型 | valueText |
| zhipu-zhipu-cogview-3-flash | CogView-3-Flash 免费模型 | valueText |
| zhipu-zhipu-cogvideox-flash | CogVideoX-Flash 免费视频生成模型 | valueText |
| zhipu-zhipu-zcode-free-tokens | 智谱 Zcode 免费发放 Token 额度 | valueText |
| adobe-firefly-free-daily-generations | Adobe Firefly 免费版每日生成额度 | valueText, title |
| minimax-minimax-token-plan-loyalty-points | MiniMax Token Plan 老用户回馈积分（数额未公布） | valueText |
| minimax-minimax-code-signin-double-points | MiniMax Code 签到双倍积分（9/28–10/7） | valueText |
| pixverse-pixverse-plugin-free | PixVerse 营销提示词 ChatGPT 插件免费获取 | valueText |
| xiaomi-mimo-mimo-desktop-3h-free-daily | 小米 MiMo Claw 每天 3 小时免费 | valueText |
| copilot-github-copilot-free-tier | GitHub Copilot 免费层 | valueText |
| higgsfield-higgsfield-new-user-trial | Higgsfield Seedance 2.5 新用户24小时免费试用 | valueText |
| otter-otter-ai-referral-referred | Otter.ai 邀请好友奖励（受邀者） | valueText |
| otter-otter-ai-referral-referrer | Otter.ai 邀请好友奖励（邀请人） | valueText |
| hailuo-hailuo-survey-shell-reward | 海螺 AI 参与调研赢贝壳奖励 | valueText |
| gcloud-cloud-sql-free-trial | Cloud SQL 30 天免费试用实例 | valueText |
| gcloud-spanner-free-trial | Spanner 90 天免费试用实例 | valueText |
| gcloud-alloydb-postgresql-free-trial | AlloyDB 30 天免费试用实例 | valueText |
| gcloud-bigtable-free-trial | Bigtable 10 天免费试用 | valueText |
| gcloud-gcloud-gemini-enterprise-plus-free-trial | Gemini Enterprise Plus 版 30 天免费试用 | valueText |
| azure-azure-azure-machine-learning-free-tier | Azure Machine Learning 免费服务 | valueText |
| kling-kling-cn-monthly-free-pack | 可灵国内版每月 128 灵感值 + 视频体验包 | steps, creditValidity |
| huaweicloud-huawei-cloud-officeace-free-points | 果办OfficeAce 首次注册登录赠送4000积分 | valueText |
| lingxi-first-purchase-double | WPS 灵犀首次购买加赠同档智点 | creditValidity |
| higgsfield-higgsfield-credit-reset | Higgsfield 付费会员积分补足（9月29–30日历史活动） | steps |
