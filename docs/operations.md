# 运维说明

校对日期：2026-10-07。本文描述本地源码与配置；线上状态见 [整理凭证](closeout-2026-10-07.md)。业务字段只在 [数据合同](data-contract.md) 维护。

## 命令与权限

所有命令从项目根目录执行。`scripts/ym.ts` 从 `.prod.secrets` 读取管理员令牌；审核脚本还支持环境变量 `ADMIN_TOKEN`。凭据文件保持忽略，不显示令牌。生产读取也需要相应角色。

```bash
npx tsx scripts/ym.ts queue
npx tsx scripts/ym.ts show <短码>
npx tsx scripts/ym.ts health --verbose
npx tsx scripts/ym.ts digest
npx tsx scripts/ym.ts urgent
npx tsx .claude/skills/yangmao-review/scripts/offer.ts plan <短码> patch.json
```

前五个命令查询或预览；`plan` 试算字段，不写入。完整修改、内部核验记录和建议用 [审核脚本](../.claude/skills/yangmao-review/scripts/offer.ts)。该脚本提供 `apply`、`memo`、`suggest`、`approve`、`reject`、`retest`、`unpublish`；默认补字段不通过，`--approve` 需要明确授权。`suggest` 支持 approve/history/reject/judge/clear，仅写建议。

`ym edit` 只覆盖其帮助列表中的字段，不含 models、tags、usdMax、steps、完整 evidence、publishedAt。不要用它宣称完成全字段审核。`ym add` 仅补录线索，下一轮采集才抽取。

| 动作 | 审核员 | 管理员 |
|---|---|---|
| whoami、队列、线索、条目详情 | 可 | 可 |
| 修改、通过/拒绝、核验记录、建议、retested | 可 | 可 |
| 忽略/重试线索、补录、提交信源/平台 | 可 | 可 |
| 下架、官方撤回、批准平台、启用自动上架 | 不可 | 可 |
| 健康/分析、通知发送与台账处理 | 不可 | 可 |

以 `src/worker/admin.ts` 的 `REVIEWER_ALLOWED` 为权限真值。`REVIEWER_TOKENS` 为逗号分隔的 name:token，每个令牌至少 16 字符；文档只记录变量名。角色权限与用户对本次动作的授权分别判断。

已上架条目的更新提案被 `reject` 后原条目仍上架；不该收录的已上架条目用管理员 `unpublish` 下架；官方明确撤回用 `withdraw`，并保留官方撤回链接和理由。

## 采集与复核

通用规则和平台要点由 `pipeline/llm.ts` 加入实际模型请求；官方抽取、社区线索研判都会收到通用规则，平台明确或能从文章识别时附相关要点。只改文档而不推送不会更新 GitHub 上的采集代码；Worker 部署也不能代替仓库推送。

经验回归可手动触发工作流“抽取经验回归”（`extraction-lessons.yml`）。`only_cases` 支持 workbuddy、xiaomi-mimo、aws、vidu、anthropic，留空全部。它用合成文本驱动真实 `extract` 和免费供应商，禁止付费兜底，不写权益/线索/审核状态；模型预算仍预留和结算，结果保留为 Actions artifact。失败须检查具体输出，不降低验收标准，也不把合成回归当成全站官网核验。已排除付费档不能连带删掉同页免费额度；已有条目索引也不代表准入。

Worker 的 UTC cron 为 `0 0 * * *` 日报、`7 * * * *` 加急、`17 */6 * * *` 触发全站采集，`27 * * * *` 触发快速线索通道。GitHub collect 工作流为 dispatch 入口；每周 distill 工作流生成纠错规则 PR，需要审核，不是社区发现扫描。邮件接收和 Discord 尚无实现。

采集模型链为 Gemini 免费层、OpenRouter、可选 GLM、受预算限制的付费 DeepSeek，额度不足可延期。仓库配置 `DAILY_TOKEN_CAP=0`、`MONTHLY_COST_CAP_CNY=10`；线上实际覆盖值另行核对。无需为文档整理调用模型或跑全量采集。

批准过的字段保护、必要字段差异与提案生成见数据合同。证据核对将空白合并为单空格并转小写匹配，不是删除全部空白；另有 processedChange、pageHash 与无提案条件的未变页面分支。每日复核不代表每日需要管理员审批。

入库有硬性去重；待审新条目按 discoveredAt 正序、ID 次序排列，更新提案在后，提案按新近顺序。审核 helper 的 queue 为定位字段问题，会另按拦截项排序；不要把 helper 顺序当后台顺序。社区信源默认不自动上架；白名单不等于可信到可以跳过官方核验。启停现状以 D1 为准。

## 展示与通知

`GET /api/offers` 和 `GET /api/platforms` 有 5 分钟边缘缓存，后台禁止缓存；后台填表不定时重画。内部 reviewMemo、reviewSuggestion 不公开。

飞书日报按薅度分选常驻 5、新星 3、末班车 3，跨榜去重。新星为近 14 天且未通知，末班车截止在 3 天内；日报不含独立的变更/结束榜。UTC 00:00 对应东京 09:00、上海 08:00。

Telegram 通过 Hermes 与送达台账；`digest`/`urgent` 仅预览，`dispatch digest|urgent` 实际发送，必须有明确授权。送达不明时先查记录，人工确认后用 delivery-delivered / delivery-unsent，不盲目重发。

健康页依赖 `CF_ANALYTICS_TOKEN` 查询 UTC 当日账号 D1 读写量；代码门槛是读取 500 万、写入 10 万行/日，读取超过 70% 会按 UTC 日去重提醒。令牌需账户分析只读权限；没有令牌时覆盖降级，不宣称用量为零。实际套餐限制以 Cloudflare 当前账户为准。

## 发布与回滚

先核对 `git status --short`、`git log origin/main..HEAD` 和 `git ls-remote origin refs/heads/main`，将本地、远端、生产分别记录。远端落后时，文档整理不自动发布功能提交。

```bash
npm ci
npm run typecheck
npm test
npm run build:web
npx wrangler deployments list
```

明确授权发布后，按需要应用迁移 `npm run db:migrate`，再 `npm run deploy`。迁移和生产 seed 都是生产写入，不能当作验证命令；`npm run seed` 不能用于刷新全部现有记录。

发布凭证应包含 Git SHA、部署版本、时间、迁移范围和线上页面/API 验证。旧部署缺 Git marker，单凭时间不能断言提交对应关系；2026-10-07 起用 `wrangler deploy --keep-vars --tag <Git短SHA> --message <说明>` 标记版本。发布前保留上一可用 Worker version ID；Worker 回滚使用 Wrangler 的 rollback 能力，数据库迁移不会自动回滚，需单独准备恢复方案。回滚后重新核对读取、后台和通知台账，未经授权不发送测试消息。

## 采集任务失败排查

若日志在 `/verification-queue` 返回 500，应先检查 Worker 查询错误，而不是重试所有模型。2026-10-07 已修复超过 100 条已审核记录时，逐 ID 绑定参数超过 D1 限制的问题；核验、后台提案原条目查询及通知修订查询均改用 SQL 子查询。回归测试以 120 条记录并模拟 100 参数上限覆盖这些路径。

OpenRouter 免费备用配置使用 `OPENROUTER_MODEL=openrouter/free`（2026-10-07 已检查模型目录并实测零费用请求）。固定免费模型若下线会返回 404，应核对可用性，不能把付费版本直接当免费兜底。

数据库迁移列表与实际字段都需核对。若字段曾被手工添加而台账漏记，先检查类型、默认值和完整迁移效果，确认匹配后仅补迁移台账；不要重复 ALTER、删除字段或覆盖业务数据。详见 [2026-10-07 采集失败记录](incident-2026-10-07-collect.md)。

## 新线索到审核（2026-10-08 修复）

每小时快速通道只采集 AIHOT 与社区 feed，并研判最多 50 条；每 6 小时的全量采集先采线索和研判，再抽取官方页面、复核已上架条目。两类 Actions 共用并发组，避免同时抽取同一线索；Actions 排队、页面不可达或模型故障会延迟，不能保证固定到审时间。

人工补录优先，其次含 AI 福利信号的重置、赠额、限时活动，再到 AIHOT，普通社区线索随后；每轮 20% 名额处理最早积压，避免旧线索饿死。排序信号不代表福利属实。条目成功入库后才确认 linked；字段不合规、部分写入失败、重要线索漏抽保留为 reviewing，后台“待审”顶部同步展示重要未研判/受阻线索。模型额度不足保留 new 并记录降级，下一轮重试。

Telegram 小时检查和日报均携带按对象去重的审核提醒，每批最多 10 条，余下下轮继续；未研判的重要线索、需人工核验、待审条目和更新提案都可提醒。提醒不是批准，公共列表仍只显示已批准条目。提醒使用现有 delivery claim/ack 协议，送达不明不重发；线索转入人工处理后可以再次提醒。快速运行记录为 runs(kind=sweep)，不冒充全量采集成功；health 返回 leadWorkflow，重要新线索积压超过两小时或快速运行失败会告警。

人工补跑：`gh workflow run collect.yml -f fast_leads=true -f lead_limit=50`。补跑会写线索和待审，不自动批准、不配置自动上架。

本机 Telegram 管理脚本使用 curl，通过 stdin 传入凭据，避免 Node TLS 偶发断连中止日报。只允许重试尚未发出 HTTP 的 DNS、连接和 TLS 握手失败；超时或空响应的写请求不重试。仍以 delivery 台账核对不明投递。

重置事件入库按发放日期区分：同名且同额度的新一次发放不能合并到几个月前的历史条目；即使模型沿用历史 ID，服务器也拆成新待审事件。推文事件日按发放方时区由推文 ID 确定，同一次事件的转述仍可合并。

线索页面直接抓取与 Jina 各最多 10 秒，单个无法打开的页面不能长时间阻塞整批；取不到原文时仍用已采集摘要研判，待审证据不足必须人工核验。更新提案提醒按业务差异去重，不因重复抽取刷新时间戳就再次提醒。

具体待审提醒优先 48 小时内截止的条目，其次重置、赠额等重要福利，随后普通待审积压，避免重要线索抽取成功后又卡在提醒队尾。

## 后台输入性能（2026-10-08）

修改表单放在 inert template 中，点击“修改”才挂载并绑定一次；“已上架、字段待补”折叠区第一次展开时才生成卡片。关闭再打开保留表单节点和未保存内容，后台输入期间不更新计时 DOM，自动刷新返回后也再次检查编辑状态。心得保存旁持续显示未保存、保存中、已保存或失败原因；保存过程中继续编辑不会把当前草稿误报为已保存。

以生产数据本地副本（48 待审、143 待补）在用户 Chrome 测量：初始 live DOM 从约 60,600 个元素减至 3,704 个；同样的中文/英文输入，观测最大 input-to-frame 延迟从约 1,643 ms 减至 22 ms，修复后平均约 5 ms。这是该次本机样本，不是所有设备的延迟保证。测试副本的保存为本地模拟，未写生产心得。回归测试覆盖延迟挂载、重复打开保留草稿、输入不发送请求和正确保存状态。


## 全工作流审查补强（2026-10-08）

完整问题、修复和数据快照见 [全工作流审查报告](workflow-audit-2026-10-08.md)。线索列表支持状态筛选及游标分页；审核链接 `#admin-offer-ID` 登录后定位卡片。新后台提交所见版本，内容变动或并发处理返回409，需要重新核对，不会继续按旧卡片报告成功。

免费模型限流会在本轮冷却；重要或积压超过2小时的线索可在既有月预算内调用付费兜底。RSS单篇失败不会阻塞整个信源，FORCE可重抽；核验失败/延期进入覆盖降级。采集在45分钟任务超时前预留收尾窗口。演练只保证不写权益/线索业务状态，真实模型请求仍作预算记账。

通知占位除消息指纹外，使用单条D1语句检查同频道对象重叠，覆盖并发日报/加急及飞书榜单；pending/unknown 条目不会换个批次重新发送。公开页面统计与核验标签统一使用业务状态，未知截止不推算结束，撤回记录按实际撤回时间显示。


## 社区线索自动官方复核

每小时与全量采集已加入独立的官方搜索复核队列，默认每轮8条，包含现有媒体级待审及更新提案。不是在聊天中逐条搜索。流程、边界、退避、配置与入口见 [自动官方复核](official-review-workflow.md)。发布时先应用0012迁移，再部署Worker，最后推送含新调用的采集管线，避免任务调用不存在的接口。

第二轮复查修复了转读核验旁路、人工竞争写入、官方补全重复、同日重置误合并和重试堵点，并增加健康页队列状态；详见 [恢复能力复查](workflow-resilience-2026-10-08.md)。普通 `/api/ingest/verify` 调用必须显式传 `trustedDirect: true` 才能刷新核验，间接正文留给有完整来源校验的官方补证阶段。
