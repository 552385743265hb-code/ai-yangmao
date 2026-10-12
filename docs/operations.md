# 运维说明

校对日期：2026-10-09。本文描述现役命令和源码机制；当次线上版本、任务和未完成项见[整理凭证](closeout-2026-10-09.md)。字段与业务口径由[数据合同](data-contract.md)维护，文档职责见[索引](README.md)。

## 身份改造发布状态

2026-10-10已按本次用户授权合并PR #6–#13，生产迁移到0035，并部署兼容代码 `32ccacc53d185c2754d881089077d438f2808e3f`。当前版本、线上检查和数据保留证据见 [发布凭证](dedupe-release-2026-10-10.md)；正式规格仍为 [dedupe-identity-2026-10-10](specs/dedupe-identity-2026-10-10/README.md)。

生产Worker及GitHub采集身份模式显式off，辅助模型关闭，历史apply关闭，预算未增加。第二/第三阶段代码与schema已就绪，enforce仍要求明确产品canary、全部状态对账以及冻结人工语料/资源验收；本次没有执行生产历史回填或合并。未来迁移编号以仓库和目标台账为准，不能覆盖已占用编号，始终先兼容迁移再部署Worker。

关闭写入仍须保留canonical、通知映射和缓存generation读取。兼容代码以本次部署或后续经同等验证的版本为准；保留全部新表和原记录，禁止为回滚删除人工决定或释放pending/unknown送达。数据恢复、历史apply及扩大canary须另有相应授权。

## 查询、审核与权限

从项目根目录运行。`scripts/ym.ts`读取忽略的`.prod.secrets`；审核脚本也支持环境变量`ADMIN_TOKEN`。凭据值不进入日志、文档或提交。

```bash
npx tsx scripts/ym.ts queue
npx tsx scripts/ym.ts show <短码>
npx tsx scripts/ym.ts health --verbose
npx tsx scripts/ym.ts digest
npx tsx scripts/ym.ts urgent
npx tsx .claude/skills/yangmao-review/scripts/offer.ts plan <短码> patch.json
```

以上为读取/预览。完整补字段、memo、suggest、approve、reject、retest、unpublish见[审核技能](../.claude/skills/yangmao-review/SKILL.md)。`apply`默认保持待审，`suggest`只写建议，`--approve`须有条目批准授权。`ym edit`不含models、tags、usdMax、steps、完整evidence、publishedAt；`ym add`只补线索，后续研判才形成条目。

| 权限 | 审核员 | 管理员 |
|---|---|---|
| 读取队列/线索/条目，编辑/审批/建议/核验记录/复测 | 可 | 可 |
| 线索忽略/重试/补录，提交信源或平台 | 可 | 可 |
| 下架/撤回、平台准入、启用自动上架 | 不可 | 可 |
| 健康/分析、发送通知、处理送达台账 | 不可 | 可 |

以`src/worker/admin.ts`的`REVIEWER_ALLOWED`为准。`REVIEWER_TOKENS`使用name:token列表，令牌至少16字符。角色能力不扩大本次任务授权。平台准入不等于条目批准；`reject`对已上架条目持久保存被拒证据后移除更新提案，误收条目用`unpublish`，官方明确撤回用`withdraw`并保存官方链接及理由。

## 调度与线索到审核

| 执行方 | 时间基准与调度 | 工作 |
|---|---|---|
| Worker | UTC 00:00每日 | 配置了webhook时发飞书日报 |
| Worker | UTC每小时第7分钟 | 飞书48小时临期检查 |
| Worker → GitHub Actions | UTC每6小时第17分钟 | 全量采集 |
| Worker → GitHub Actions | UTC每小时第27分钟 | 快速线索与官方补证 |
| Hermes | 调度器时区每日09:00 | Telegram日报 |
| Hermes | 调度器时区每小时第7分钟 | Telegram加急、审核提醒及健康检查 |

Worker UTC 00:00对应东京09:00、上海08:00。Hermes未设置独立任务时区时使用调度器时区，不能从脚本“东京时间”注释推断；2026-10-09实际安装为纽约时间09:00，详见整理凭证。安装脚本会重建定时任务，不能作为文档同步命令运行。

两种collect任务共用并发组、不取消正在执行的任务，默认研判最多50条。快速通道采AIHOT与社区feed，之后研判并执行官方补证；全量再处理其他官方信源和已批准条目核验。初抽最多15分钟，并给后续补证留时间；整轮40分钟工作窗口，Actions45分钟限时。

人工补录优先；调度给自动发现留名额，并保留20%最老积压。排序只决定先后。成功入库后才标linked；部分失败、未知平台、重要福利漏抽等转reviewing，并自动进入受阻线索官方复核。取不到原文时可用备注/摘要形成媒体级稿；失效补录不无限占据new队首。后台支持状态筛选和游标分页，全部受阻线索在待审区有进度与处理入口；可筛选已关联/已结束追溯依据。详见自动官方复核文档的受阻线索环节。

社区稿的固定官方搜索、机制一致性检查、占位、输入版本、退避和恢复由[自动官方复核](official-review-workflow.md)维护。普通`/api/ingest/verify`须显式传`trustedDirect:true`才刷新核验；Jina正文不经普通核验路径升级。核验或提案写入检查读取时版本，旧结果不能覆盖人工修改。approved旧版保持公开，仅有同源官方正文证明条款改变才进入提案；采集器附完整sourceText，纯模型漂移或拒绝过的同版条款不入队，合并后重新校验。新ID查重是独立入口，须同时验收；完整行为见数据合同。

手动补跑会写线索和待审，只在任务授权范围执行：

```bash
gh workflow run collect.yml --ref main -f fast_leads=true -f lead_limit=50
```

`DRY_RUN`不写权益/线索业务状态，真实模型请求仍记预算。`ONLY_SOURCES`限定信源抓取；官方补证由独立队列控制，诊断需要明确跳过时传`official_review_limit=0`。周度distill只提出纠错规则PR，不是发现扫描；邮件接收尚未实现；Discord 公告采集已接入，配置与边界见下节。

## 模型、预算与回归

全局活动的明确周期（分钟/小时/天/周/自然月/自然年及复合周期）由`src/shared/campaign-deadline.ts`执行，采集`toOffer`与服务端`collectedOfferIn`均可补日期；原文周期、日期锚点及精度存入evidence.claimEndDerivation。原文已有明确截止不覆盖，媒体/无锚点/个人领取后有效期不推算。普通存量校验不自动回填已批准基线。修改须同时推送采集代码并部署Worker。

海外网络门槛由`src/shared/network-requirements.ts`统一执行：采集抽取保留/补上国际产品的net，入库共享schema再次执行，none不会与net并存，其他资格与官方identityFacts不改。国内WorkBuddy、火山引擎等保持独立口径；共用平台ID按产品入口/明确版本判定，版本未明且原为none时改为unknown，不能假定国内直领。新增平台准入时须同时登记该模块的国内/国际/混合分类；未登记ID不能凭域名猜厂商归属。修改此规则须推送GitHub采集代码并部署Worker入库校验。

`pipeline/llm.ts`加载通用规则、相关平台要点及管理员纠正。GitHub采集读取远端文件；修改规则后只部署Worker不会更新管线，需推送。

模型链为Gemini免费层、OpenRouter、可选GLM、预算内DeepSeek付费兜底。免费供应商受限会本轮冷却；重要或积压超过2小时的线索可使用既有付费预算。默认`DAILY_TOKEN_CAP=0`、`MONTHLY_COST_CAP_CNY=10`，实际覆盖以部署变量和Actions配置为准。预算先原子预留再结算，用量不明保留预留；RSS单篇失败不阻断后续，FORCE可以重抽。

工作流`extraction-lessons.yml`用合成文本驱动真实模型，`only_cases`以[scripts/eval-extraction-lessons.ts](../scripts/eval-extraction-lessons.ts)的cases为准，留空全部；涵盖套餐/免费额度、账单模式、日期、重置、身份认证、资助与比赛及官方活动错配。禁止付费兜底，不写条目/线索，模型仍记预算，输出保留artifact。通过不等于官网事实全部核验；失败需查具体结果，不能降低验收标准。

## 证据拦截的处置

重复的evidence_missing核验失败不再推进条目reviewVersion，避免同一失败不断生成新提醒；官方正文恢复时仍正常刷新核验。X/status的第一方嵌入读取须绑定ID/作者，finalUrl为验证后的原帖地址，fetchedUrl记录实际cdn.syndication.twimg.com读取地址；失败或身份不符回退普通读取，不将导航或登录页当原帖。

“当前官方页面未能再次确认原条款”来自evidence_missing，和字段拦截数不同。先核对证据URL、跳转、默认页/弹窗及保存摘录；如WorkBuddy个人有效期藏在完整规则弹窗，普通抓取缺失不能直接判结束。人工读到当前官方规则后可修正摘录并用`retested`记录已核实仍有效；这不是接受更新，也不把site证据改成tested。只有管理员明确亲测过权益才用tested级别。

管理员亲测停止领取时，管理接口`POST /api/admin/offers/:ref/withdraw`可传`basis:"tested"`、reason及实测入口evidenceUrl；默认basis为official。withdrawnAt是确认时刻，实际截止未知仍留空。legacy条目结束会清除过时提案、退出可领和自动复核队列，历史approved记录保留；identity管理的活动保留草稿并取消旧任务/租约，显式重开后才可进入新的恢复审核。

## 展示、通知与健康

页眉“最近一次抓取”使用meta.lastCollectedAt：最近已完成collect/sweep中fetchedSources>0（兼容旧stats.ok>0或旧ok=true）的时间。仅全失败批次不更新。抓取成功与抽取/核验/入库完整成功分开，后者仍保留lastSuccessfulCollect用于后台完整性告警；页面覆盖不完整提示取最近完成批次，不因存在部分成功就假报全覆盖。meta/coverage缓存使用partial-fetch-v1版本。

公开offers/platforms接口有5分钟缓存，后台no-store。内部memo、suggestion、officialReview及完整修订明细不公开；公开简介和步骤只写领取者需要的权益与条件，核验过程写内部记录。后台不定时重画输入表单；编辑延迟挂载并保留草稿，心得持续显示未保存/保存中/已保存/失败。待审链接`#admin-offer-ID`登录后定位；提交带reviewVersion，内容变化或竞争返回409。更新提案展示公开值与候选值的增删改对比，证据拆项，忽略单纯抓取元数据变化。

Telegram审核提醒按对象版本去重，每批最多10条，临期优先并保留积压名额。`digest`/`urgent`仅预览；`dispatch digest|urgent`经Hermes实际发送，须有授权。发送前占位，成功后ack；pending/unknown不能换批次重发，人工确认后用delivery-delivered或delivery-unsent结案。正常定时任务可能已送达新条目，手动推送前查台账。

飞书日报选常驻5、新星3、末班车3，跨榜去重。新星为近14天未通知，末班车为3天内截止；不含待审、独立变更或已结束榜。webhook未配置或未验证时不能声称送达。

公开 Agent 接入源在 `integrations/agent/`，与本机 Hermes 管理技能分开。官网 `#agent` 提供安装说明，`/ai-yangmao-public/SKILL.md` 与安装脚本由 `npm run build:web` 打包；`/llms.txt` 指向服务端能力说明。匿名只读 HTTP：`GET /api/agent`、`GET|POST /api/agent/search`、`GET /api/agent/offers/:id`、`GET /api/agent/catalog`、`GET /api/agent/daily`；可选 `format=markdown`。个人条件使用查询 POST，只在当前请求计算，不保存个人档案。远程 MCP `/api/mcp` 使用无会话 Streamable HTTP，工具为 `yangmao_search_offers`、`yangmao_get_offer`、`yangmao_get_daily`、`yangmao_get_catalog`，不提供管理员操作。

发布前须应用 `0039_public_daily_digest.sql`。原飞书每日调度会生成单例固定日报，即使未配置 webhook 也生成；飞书发送与公开读取使用同一份条目和卡片。公开读取不会生成、翻译、占位或发消息。只返回最新一期，无历史查询；尚无日报明确返回 unavailable，当天尚未生成则标记最近一期日期。原语言摘录与译文分开展示。生产迁移、正式部署与飞书发送仍按该次授权分别执行，不能用查询触发或用本地演示声称线上完成。

首次上线可由管理员 `POST /api/admin/feishu/digest/prepare`，JSON `{"refreshUnsent":false}` 准备公开版，**不发消息**；若当天已有确认送达的飞书日报，优先沿用该次条目，并避免重发。冻结后身份版本失效会返回明确冲突；管理员可用 `{"refreshUnsent":true}` 重建确认未送达的版本，修订号公开展示。存在 sent/pending/unknown 记录时禁止重建，不释放待核对消息。新生成日报保存各条 lastVerifiedAt；旧发送快照未保存的时间保持未知。

发送占位同时核对固定日报的 day/revision；若管理员修订先完成，发送方重新读取最新版本（最多一次）；若发送先占位，修订被拒绝。部署后可运行 `node scripts/smoke-public-agent.mjs https://ai-yangmao.com` 做公开只读验收，安装器验收使用临时 --dir，不更改本机管理技能。安装中断遗留锁时先核对锁内 PID，确认进程已退出后再人工清理；安装器不自动争抢/清除现存锁。

Agent 数据缓存按公开 generation 失效，同实例冷并发合并读取；边缘缓存故障可回退数据库，额度失败使用网站共用熔断，后续跳过 D1。搜索只输出有体积预算的摘要与详情地址，groups 引用 ID，客户端按 nextOffset 翻页。会员非空清单默认不完整，只有显式 subscriptionsComplete 才作闭合匹配。安装器校验全部独立文件、使用互斥锁，最终替换失败时恢复原技能。

健康页展示最近全量尝试与coverageDegraded、快速任务、重要线索积压，以及官方补证的待处理/退避/耗尽/超时。抓取成功不等于核验成功，sweep不冒充完整collect成功。D1用量依赖`CF_ANALYTICS_TOKEN`；代码门槛读500万、写10万行/UTC日，读取超过70%按日去重提醒。未配置/读取失败不报零，实际配额以账户为准。

本机管理HTTP凭据经curl stdin传入；只重试尚未发出HTTP的DNS、连接、TLS握手失败。写请求超时或空响应不能盲目重试，须读回业务状态或投递台账。

## 发布与故障排查

发布前核对local、remote、当前生产版本及回滚边界：

```bash
git status --short
git log origin/main..HEAD --oneline
git ls-remote origin refs/heads/main
npm run typecheck
npm test
npm run build:web
npx wrangler deployments list
```

按授权范围先处理必要迁移，再部署Worker、推送管线。文档同步不自动批准、发送、迁移或部署。生产seed不能用于刷新全部已有记录；新厂商使用定向新增并读回准入、信源和活动状态。

部署用`wrangler deploy --keep-vars --tag <Git短SHA> --message <说明>`标记，凭证区分推送、部署及线上读回。旧部署缺marker时不能只凭时间认定代码对应。Worker回滚不回滚D1迁移，需单独恢复方案；回滚后核对页面/API/后台/台账。

`verification-queue`500先查Worker/D1查询，不重复调用所有模型。已修复逐ID绑定超过100参数的问题；历史根因和迁移台账修复见[采集事故](incident-2026-10-07-collect.md)。迁移字段若已存在但台账漏记，先验证完整效果，仅补缺失台账，不重复ALTER。

OpenRouter默认备用为`openrouter/free`；404须检查模型可用性，不能把付费模型当免费兜底。登录墙、页面不可读、额度不明、未准入平台和人工字段保护会保留待审/人工处理，具体事实须核实后裁决。

拒绝记忆迁移为0013_rejected_offer_updates.sql；首次启用须迁移后部署Worker，再推送采集器完整正文协议。文档同步本身无需重新部署。回归同时覆盖旧ID改字段、新ID重复插入、拒绝后重放、人工候选保留及真实新轮次不误合并。

`ym leads`同时输出reviewVersion；`ym dismiss <线索ID> --version <reviewVersion>`使用查看时版本，避免旧指令覆盖已完成结果。线索页面的关联/结束/重试也检查版本。

## Discord 官方公告采集

2026-10-10接入：自建服务器关注厂商官方公告，再由读取Bot通过Discord REST API读取自己的接收文字频道，不访问其他服务器的消息API。Discord follow只同步厂商选择发布的公告，不等于完整时间线。

当前接收频道：official-announcements（1558646770689384560），自建服务器1558646769938735136。GitHub Secret为DISCORD_BOT_TOKEN，Variables为DISCORD_CHANNEL_ID及DISCORD_GUILD_ID；本机配置在忽略的.codex/discord.env，Token不得进文档、日志或提交。

信源discord-official-announcements加入每小时快速通道和每6小时全量通道。只接收IS_CROSSPOST且原始guild/channel匹配sources.config.publishers的公告；系统提示、普通成员发言、测试消息、原文已删除公告不产线索。当前已核实Midjourney guild662267976984297473 / announcements952771221915840552，依据为Midjourney官方文档直链。新增厂商需先核实官方入口与原始频道，再定向扩展映射；不能只凭Webhook名称、头像或正文自称官方。

正文、embed字段及附件链接保留，原始Discord消息URL用于去重。文本命中福利关键词或附有待核实附件的官方公告先产线索，沿现有研判/官方补证进入待审；身份可靠不等于活动批准，autoPublish保持false。

检查点为snapshots.hash的discord:<最后接收消息ID>，沿新到旧分页完整补回，先成功写线索才更新检查点。限流、权限错误、未知来源、正文不可读、超过分页上限或入库失败均保留原检查点并进入信源健康失败。默认20页（2,000消息），maxPages最大100；初次读取同样分页，适合本次新建接收频道。重放由原始消息URL去重；本版本不自动重抽旧消息的后续编辑，条款变更可人工补录/重新核验。

只读验证可运行python3 .codex/discord-probe.py .codex/discord.env；只输出身份、频道和计数，不输出Token或消息全文。频道暂无官方公告时，仅证明读取链路可用，不能声称真实福利已入库。

诊断补跑用collect.yml的only_sources=discord-official-announcements、fast_leads=true、lead_limit=0、lead_review_limit=0、official_review_limit=0，跳过模型与其他业务队列；正常定时运行沿既有预算和审核规则执行。


## 选择式会员资格运维

`GET /api/memberships`返回已核实/历史目录，`GET /api/admin/memberships`包含待核实项。管理员通过POST同路径创建pending产品/套餐；`/:id/impact?kind=product|plan`预览影响，`/:id/verify`带目录和条目修订及影响确认独立核实。目录核实不批准福利。目录缺项不准按品牌或档位相似度猜测。

0036新增会员目录、目录审计与offers.membership_requirement；0037以保留行的方式扩展benefit_versions到terms-v2并增加版本迁移映射。发布前备份所涉表与当前版本；D1有FTS虚拟表时整库export不支持，使用明确的`--table`导出相关表并保存只读JSON快照。

`scripts/membership-backfill.ts --snapshot <snapshot.json> --out <plan.json>`仅生成本地预演。快照包含offers、当前approvedVersions和proposals；与`--sql-out`同用时必须提供`--expected-catalog`，可用`--rollback-out`生成保护性兼容回滚。快照与生成SQL含内部数据，保存在权限受限目录，不提交Git。整批原子执行SQL，任何目录/行/身份版本不匹配停止；不拆批绕过断言。迁移仅为确定等价条目创建新V2基线，其余保留needs_review；原V1不可变。

先在备份副本验证DDL迁移、数据迁移、FK完整性及回滚，再在生产迁移、部署、推送并读回公开目录/API/后台与浏览器筛选。新响应schema=membership-v1，更新identity_public_state.generation失效公开缓存。代码回滚必须先用兼容回滚恢复V1公开指针并核查所有新V2变更；保留新增字段、目录和不可变V2历史，禁止直接回到不识别V2的旧Worker处理新写入。


## D1配额熔断与公开快照

公开快照必须只含已批准字段，由`scripts/build-public-snapshot.ts <受限备份.sqlite> <快照ISO时间> public/public-snapshot.json`生成并随静态资源部署；每次部署保留或更新该资产，原始数据库备份不得上传。`D1_PUBLIC_SNAPSHOT_UNTIL`设置未来时间时，公开启动接口走快照，后台和采集返回只读503，定时任务暂停；期限后重试数据库。明确的D1额度错误也会触发快照退路。

`D1_REPAIR_RELATED_INDEXES=1`使恢复后的调度先幂等创建reviews(offer_id)、leads(offer_id)索引，再执行原任务；0038迁移登记相同索引。不得为节省读取消除身份回填的快照并发保护。判断额度异常先用Cloudflare分析接口取得日/小时/查询热点，避免继续消耗D1；不同adaptive数据集不能算精确占比。当前应急部署与尚待验证事项见[D1恢复凭证](d1-quota-recovery-2026-10-11.md)。
