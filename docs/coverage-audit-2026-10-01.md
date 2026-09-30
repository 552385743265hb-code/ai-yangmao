# 白名单信源覆盖核查（2026-10-01）

起因：Demo 福利核验交接里 10 条多模态福利此前全部漏抓。排查发现白名单 97 个平台里只有 16 个配了信源，且关键词表、抽取提示词和字段校验都会让福利被静默丢掉。

## 结论

- 已准入平台 102 个，**全部配有官方信源**（合计 191 个平台信源，另有 7 个社区线索源）；每个信源都至少成功抓取过一次。
- 抓到福利的平台 81 个；仍为零的 21 个，每个都逐页核对过原因，见下表。
- 官方页面读不到、只能登录后查看的福利（可灵国内版、即梦、LiblibAI、Lovart、Suno 邀请、Poe、Adobe Firefly 等）已建待审卡片，需要管理员实测；列入“人工巡检清单”。

## 为漏抓补上的规则

1. 每个白名单平台都必须有官方信源（价格页 + 博客/RSS/更新日志 + 帮助文档/活动页）。
2. 关键词表补上积分、灵感值、点数、每日登录送、邀请、实名认证、首月、折扣等（多模态平台的福利句子原先会在交给模型前被过滤）。
3. 抽取提示词从“拿不准就不要输出”改为“拿不准也输出、写明不确定之处，交给人工审核”，并写明每日积分、代金券、邀请、实名、免费层都要抽。
4. 模型输出字段不合规（额度超长、模态写“3D”、领取方式或类型写了不认识的值、日期格式不对）时规整为合法值，不再整条丢弃。
5. 模型 JSON 格式有误时用 jsonrepair 修复，不再推迟整个信源。
6. RSS 里的相对链接自动补全；RSS 地址返回网页时报明确错误。
7. 本地中继用 curl 抓 LINUX DO，避开 Cloudflare 对 Node 请求的人机验证。
8. 定时触发采集失败会重试一次，仍失败记入采集健康页。

## 逐平台明细

| 平台 | 类型 | 信源 | 抓取成功 | 福利条数（待审） | 结论 |
|---|---|---|---|---|---|
| 阿里云百炼（`aliyun`） | 云厂商 | 1 | 1/1 | 1（0） | 已抓到 1 条 |
| AWS（`aws`） | 云厂商 | 3 | 3/3 | 10（10） | 已抓到 10 条 |
| Microsoft Azure（`azure`） | 云厂商 | 2 | 2/2 | 1（1） | 已抓到 1 条 |
| 百度千帆（`baidu`） | 云厂商 | 3 | 3/3 | 9（9） | 已抓到 9 条 |
| Google Cloud（`gcloud`） | 云厂商 | 2 | 2/2 | 9（9） | 已抓到 9 条 |
| 华为云（`huaweicloud`） | 云厂商 | 2 | 2/2 | 2（2） | 已抓到 2 条 |
| 腾讯云（`tencent`） | 云厂商 | 1 | 1/1 | 1（1） | 已抓到 1 条 |
| 火山方舟（`volc`） | 云厂商 | 3 | 3/3 | 4（4） | 已抓到 4 条 |
| Cerebras（`cerebras`） | 推理平台 | 1 | 1/1 | 1（0） | 已抓到 1 条 |
| Cloudflare Workers AI（`cloudflare`） | 推理平台 | 1 | 1/1 | 2（0） | 已抓到 2 条 |
| DeepInfra（`deepinfra`） | 推理平台 | 2 | 2/2 | 1（1） | 已抓到 1 条 |
| Fireworks AI（`fireworks`） | 推理平台 | 2 | 2/2 | 1（1） | 已抓到 1 条 |
| GitHub Models（`github`） | 推理平台 | 2 | 2/2 | 1（1） | 已抓到 1 条 |
| GMI Cloud（`gmi`） | 推理平台 | 2 | 2/2 | 1（0） | 已抓到 1 条 |
| Groq（`groq`） | 推理平台 | 1 | 1/1 | 1（1） | 已抓到 1 条 |
| Hugging Face（`hf`） | 推理平台 | 1 | 1/1 | 5（0） | 已抓到 5 条 |
| 模力方舟（`moark`） | 推理平台 | 1 | 1/1 | 1（1） | 已抓到 1 条 |
| 魔搭 ModelScope（`modelscope`） | 推理平台 | 2 | 2/2 | 1（1） | 已抓到 1 条 |
| Novita AI（`novita`） | 推理平台 | 2 | 2/2 | 1（1） | 已抓到 1 条 |
| NVIDIA NIM（`nvidia`） | 推理平台 | 1 | 1/1 | 1（1） | 已抓到 1 条 |
| OpenCode（Zen / Go）（`opencode`） | 推理平台 | 1 | 1/1 | 6（0） | 已抓到 6 条 |
| OpenRouter（`openrouter`） | 推理平台 | 2 | 2/2 | 1（1） | 已抓到 1 条 |
| PPIO 派欧云（`ppio`） | 推理平台 | 3 | 3/3 | 2（2） | 已抓到 2 条 |
| 七牛云 AI（`qiniu`） | 推理平台 | 3 | 3/3 | 3（3） | 已抓到 3 条 |
| SambaNova（`sambanova`） | 推理平台 | 3 | 3/3 | 0（0） | 没有福利：官方套餐页写明免费版要先添加付款方式并购买额度才能调用，没有赠送 |
| 硅基流动（`siliconflow`） | 推理平台 | 3 | 3/3 | 3（3） | 已抓到 3 条 |
| Together AI（`together`） | 推理平台 | 2 | 2/2 | 1（1） | 已抓到 1 条 |
| UCloud 星图（`ucloud`） | 推理平台 | 2 | 2/2 | 0（0） | 没有福利：官方文档写明 2026-07-03 起不再向新用户赠送免费 token，存量额度清空 |
| Vercel AI Gateway（`vercel`） | 推理平台 | 1 | 1/1 | 1（0） | 已抓到 1 条 |
| Anthropic（`anthropic`） | 模型厂商 | 2 | 2/2 | 1（1） | 已抓到 1 条 |
| 百川智能（`baichuan`） | 模型厂商 | 2 | 2/2 | 1（1） | 已抓到 1 条 |
| Cohere（`cohere`） | 模型厂商 | 2 | 2/2 | 1（1） | 已抓到 1 条 |
| DeepSeek（`deepseek`） | 模型厂商 | 1 | 1/1 | 2（0） | 已抓到 2 条 |
| 字节跳动 豆包 Doubao（`doubao`） | 模型厂商 | 1 | 1/1 | 0（0） | 没有福利：豆包 App 免费对话不是额度类福利；豆包模型的 API 免费额度归在火山方舟（已收录 50 万 Token） |
| Google AI（Gemini / AI Studio）（`google`） | 模型厂商 | 3 | 3/3 | 3（0） | 已抓到 3 条 |
| 美团 LongCat（`meituan`） | 模型厂商 | 3 | 3/3 | 1（1） | 已抓到 1 条 |
| Meta Llama（`meta`） | 模型厂商 | 1 | 1/1 | 0（0） | 没有福利：Llama API 页面没有免费或赠送说明；Meta AI 应用免费但不是额度类福利 |
| Microsoft AI（Copilot）（`microsoft-ai`） | 模型厂商 | 1 | 1/1 | 0（0） | 没有福利：官方博客只有模型和产品发布，没有额度或赠送 |
| MiniMax（`minimax`） | 模型厂商 | 3 | 3/3 | 2（2） | 已抓到 2 条 |
| Mistral AI（`mistral`） | 模型厂商 | 2 | 2/2 | 2（2） | 已抓到 2 条 |
| Kimi 开放平台（月之暗面）（`moonshot`） | 模型厂商 | 3 | 3/3 | 1（1） | 已抓到 1 条 |
| Nex AGI（`nex-agi`） | 模型厂商 | 1 | 1/1 | 0（0） | 没有福利：开源模型联盟，官网没有托管服务或赠送额度 |
| OpenAI（`openai`） | 模型厂商 | 1 | 1/1 | 11（0） | 已抓到 11 条 |
| 阿里 Qwen（通义千问 App / Qwen Code）（`qwen`） | 模型厂商 | 2 | 2/2 | 0（0） | 没有福利：官方文档写明 Qwen Code 的免费 OAuth 套餐已于 2026-04-15 停止服务 |
| Sakana AI（Fugu）（`sakana`） | 模型厂商 | 1 | 1/1 | 0（0） | 没有福利：官方 RSS 全部文章里没有额度或赠送 |
| 阶跃星辰（`stepfun`） | 模型厂商 | 3 | 3/3 | 2（2） | 已抓到 2 条 |
| 腾讯混元 HY（含 WorkBuddy）（`tencent-hy`） | 模型厂商 | 1 | 1/1 | 2（1） | 已抓到 2 条 |
| xAI（`xai`） | 模型厂商 | 2 | 2/2 | 2（2） | 已抓到 2 条 |
| 小米 MiMo（`xiaomi-mimo`） | 模型厂商 | 2 | 2/2 | 2（2） | 已抓到 2 条 |
| 智谱 Z.ai（`zhipu`） | 模型厂商 | 1 | 1/1 | 12（0） | 已抓到 12 条 |
| AMI Labs（Yann LeCun）（`ami-labs`） | 新玩家 | 1 | 1/1 | 0（0） | 没有福利：研究公司，没有公开产品和额度 |
| Nous Research（`nous`） | 新玩家 | 3 | 3/3 | 3（3） | 已抓到 3 条 |
| Periodic Labs（`periodic`） | 新玩家 | 1 | 1/1 | 0（0） | 没有福利：研究公司，没有公开产品和额度 |
| Physical Intelligence（`physical-intelligence`） | 新玩家 | 1 | 1/1 | 0（0） | 没有福利：机器人研究公司，没有公开产品和额度 |
| Prime Intellect（`prime-intellect`） | 新玩家 | 1 | 1/1 | 0（0） | 没有福利：官方博客只有研究和算力产品介绍，没有赠送额度 |
| Reflection AI（`reflection`） | 新玩家 | 1 | 1/1 | 0（0） | 没有福利：研究公司，没有公开产品和额度 |
| Safe Superintelligence（SSI，Ilya Sutskever）（`ssi`） | 新玩家 | 1 | 1/1 | 0（0） | 没有福利：研究公司，没有公开产品和额度 |
| Thinking Machines Lab（Mira Murati）（`thinking-machines`） | 新玩家 | 4 | 4/4 | 2（2） | 已抓到 2 条 |
| TypeSafe · Jev（`typesafe`） | 新玩家 | 1 | 1/1 | 0（0） | 没有福利：Jev 处于限量早期访问；它的免费版本通过 OpenCode Zen 提供，已在 OpenCode 条目里收录 |
| World Labs（李飞飞）（`worldlabs`） | 新玩家 | 2 | 2/2 | 1（1） | 已抓到 1 条 |
| Adobe Firefly（`adobe-firefly`） | AI 工具 | 3 | 3/3 | 1（1） | 已抓到 1 条 |
| GitHub Copilot（`copilot`） | AI 工具 | 1 | 1/1 | 1（1） | 已抓到 1 条 |
| Cursor（Anysphere）（`cursor`） | AI 工具 | 2 | 2/2 | 2（2） | 已抓到 2 条 |
| Devin（Cognition）（`devin`） | AI 工具 | 2 | 2/2 | 8（8） | 已抓到 8 条 |
| Dreamina（CapCut 国际版即梦）（`dreamina`） | AI 工具 | 2 | 2/2 | 2（2） | 已抓到 2 条 |
| ElevenLabs（`elevenlabs`） | AI 工具 | 3 | 3/3 | 4（4） | 已抓到 4 条 |
| Gamma（`gamma`） | AI 工具 | 1 | 1/1 | 2（2） | 已抓到 2 条 |
| Genspark（`genspark`） | AI 工具 | 3 | 3/3 | 3（3） | 已抓到 3 条 |
| 海螺 AI（MiniMax）（`hailuo`） | AI 工具 | 1 | 1/1 | 1（1） | 已抓到 1 条 |
| Higgsfield（`higgsfield`） | AI 工具 | 2 | 2/2 | 23（23） | 已抓到 23 条 |
| Ideogram（`ideogram`） | AI 工具 | 2 | 2/2 | 1（1） | 已抓到 1 条 |
| 即梦（`jimeng`） | AI 工具 | 1 | 1/1 | 1（1） | 已抓到 1 条 |
| Kiro（`kiro`） | AI 工具 | 1 | 1/1 | 2（0） | 已抓到 2 条 |
| 可灵 AI（`kling`） | AI 工具 | 1 | 1/1 | 1（1） | 已抓到 1 条 |
| Krea（`krea`） | AI 工具 | 2 | 2/2 | 2（2） | 已抓到 2 条 |
| Leonardo.Ai（`leonardo`） | AI 工具 | 3 | 3/3 | 1（1） | 已抓到 1 条 |
| LiblibAI（哩布哩布）（`liblib`） | AI 工具 | 1 | 1/1 | 1（1） | 已抓到 1 条 |
| LibTV（LiblibAI 视频）（`liblibtv`） | AI 工具 | 1 | 1/1 | 0（0） | 没有福利：首页只有年卡折扣（付费）；LiblibAI 每日登录积分已在 liblib 平台下收录 |
| Lovable（`lovable`） | AI 工具 | 3 | 3/3 | 6（6） | 已抓到 6 条 |
| Lovart（`lovart`） | AI 工具 | 1 | 1/1 | 1（1） | 已抓到 1 条 |
| Luma AI（`luma`） | AI 工具 | 2 | 2/2 | 0（0） | 没有福利：官方价格页只列 Plus / Pro / Ultra 付费套餐，已不再提供免费版 |
| Magnific（`magnific`） | AI 工具 | 1 | 1/1 | 0（0） | 没有福利：官方价格页只有付费套餐（credits 按年发放），没有免费额度 |
| Manus（`manus`） | AI 工具 | 3 | 3/3 | 3（3） | 已抓到 3 条 |
| Meshy（`meshy`） | AI 工具 | 2 | 2/2 | 1（1） | 已抓到 1 条 |
| Midjourney（`midjourney`） | AI 工具 | 1 | 1/1 | 0（0） | 没有福利：只有付费订阅（Basic / Standard / Pro / Mega），没有免费额度 |
| n8n（`n8n`） | AI 工具 | 2 | 2/2 | 4（4） | 已抓到 4 条 |
| Niteshift（`niteshift`） | AI 工具 | 1 | 1/1 | 1（1） | 已抓到 1 条 |
| Otter.ai（`otter`） | AI 工具 | 2 | 2/2 | 3（3） | 已抓到 3 条 |
| Perplexity（`perplexity`） | AI 工具 | 1 | 1/1 | 0（0） | 没有福利：API 只有按量计费；消费端 Pro 的促销在帮助中心，对爬虫返回 403，列入人工巡检 |
| Pika（`pika`） | AI 工具 | 3 | 3/3 | 1（1） | 已抓到 1 条 |
| PixVerse（`pixverse`） | AI 工具 | 3 | 3/3 | 5（5） | 已抓到 5 条 |
| Poe（`poe`） | AI 工具 | 1 | 1/1 | 1（1） | 已抓到 1 条 |
| Pollo AI（`pollo`） | AI 工具 | 2 | 2/2 | 2（2） | 已抓到 2 条 |
| Replit（`replit`） | AI 工具 | 2 | 2/2 | 0（0） | 没有福利：Free Mode 是 Core（$20/月）订阅附带功能，管理员 2026-09-30 已按“付费套餐自带”拒绝 |
| Runway（`runway`） | AI 工具 | 2 | 2/2 | 3（3） | 已抓到 3 条 |
| SeaArt（`seaart`） | AI 工具 | 3 | 3/3 | 1（1） | 已抓到 1 条 |
| Suno（`suno`） | AI 工具 | 4 | 4/4 | 2（2） | 已抓到 2 条 |
| TapNow（`tapnow`） | AI 工具 | 1 | 1/1 | 1（1） | 已抓到 1 条 |
| Trae（`trae`） | AI 工具 | 3 | 3/3 | 1（1） | 已抓到 1 条 |
| Tripo（`tripo`） | AI 工具 | 3 | 3/3 | 2（2） | 已抓到 2 条 |
| Vidu（`vidu`） | AI 工具 | 2 | 2/2 | 2（2） | 已抓到 2 条 |
| Windsurf（`windsurf`） | AI 工具 | 2 | 2/2 | 1（1） | 已抓到 1 条 |

## 人工巡检清单（官方页面读不到，每周登录核对一次）

- 可灵国内版（klingai.kuaishou.com）：每月灵感值和体验包
- 即梦国内版：每日登录积分
- LiblibAI：每日登录积分（会员页需登录）
- Lovart：每日积分（定价页靠脚本渲染）
- Suno：邀请奖励规则（登录后可见）
- Poe：每日积分（帮助中心对爬虫返回 403）
- Adobe Firefly：每日免费生成次数（界面才显示）
- 硅基流动：活动中心（cloud.siliconflow.cn/me/campaigns，需登录；公开新闻页已配为信源）
- Perplexity：消费端 Pro 促销（帮助中心 403）
