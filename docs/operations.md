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

`DRY_RUN`不写权益/线索业务状态，真实模型请求仍记预算。`ONLY_SOURCES`限定信源抓取；官方补证由独立队列控制，诊断需要明确跳过时传`official_review_limit=0`。周度distill只提出纠错规则PR，不是发现扫描；邮件接收与Discord采集尚未实现。

## 模型、预算与回归

`pipeline/llm.ts`加载通用规则、相关平台要点及管理员纠正。GitHub采集读取远端文件；修改规则后只部署Worker不会更新管线，需推送。

模型链为Gemini免费层、OpenRouter、可选GLM、预算内DeepSeek付费兜底。免费供应商受限会本轮冷却；重要或积压超过2小时的线索可使用既有付费预算。默认`DAILY_TOKEN_CAP=0`、`MONTHLY_COST_CAP_CNY=10`，实际覆盖以部署变量和Actions配置为准。预算先原子预留再结算，用量不明保留预留；RSS单篇失败不阻断后续，FORCE可以重抽。

工作流`extraction-lessons.yml`用合成文本驱动真实模型，`only_cases`以[scripts/eval-extraction-lessons.ts](../scripts/eval-extraction-lessons.ts)的cases为准，留空全部；涵盖套餐/免费额度、账单模式、日期、重置、身份认证、资助与比赛及官方活动错配。禁止付费兜底，不写条目/线索，模型仍记预算，输出保留artifact。通过不等于官网事实全部核验；失败需查具体结果，不能降低验收标准。

## 证据拦截的处置

重复的evidence_missing核验失败不再推进条目reviewVersion，避免同一失败不断生成新提醒；官方正文恢复时仍正常刷新核验。X/status的第一方嵌入读取须绑定ID/作者，finalUrl为验证后的原帖地址，fetchedUrl记录实际cdn.syndication.twimg.com读取地址；失败或身份不符回退普通读取，不将导航或登录页当原帖。

“当前官方页面未能再次确认原条款”来自evidence_missing，和字段拦截数不同。先核对证据URL、跳转、默认页/弹窗及保存摘录；如WorkBuddy个人有效期藏在完整规则弹窗，普通抓取缺失不能直接判结束。人工读到当前官方规则后可修正摘录并用`retested`记录已核实仍有效；这不是接受更新，也不把site证据改成tested。只有管理员明确亲测过权益才用tested级别。

管理员亲测停止领取时，管理接口`POST /api/admin/offers/:ref/withdraw`可传`basis:"tested"`、reason及实测入口evidenceUrl；默认basis为official。withdrawnAt是确认时刻，实际截止未知仍留空。legacy条目结束会清除过时提案、退出可领和自动复核队列，历史approved记录保留；identity管理的活动保留草稿并取消旧任务/租约，显式重开后才可进入新的恢复审核。

## 展示、通知与健康

公开offers/platforms接口有5分钟缓存，后台no-store。内部memo、suggestion、officialReview及完整修订明细不公开；公开简介和步骤只写领取者需要的权益与条件，核验过程写内部记录。后台不定时重画输入表单；编辑延迟挂载并保留草稿，心得持续显示未保存/保存中/已保存/失败。待审链接`#admin-offer-ID`登录后定位；提交带reviewVersion，内容变化或竞争返回409。更新提案展示公开值与候选值的增删改对比，证据拆项，忽略单纯抓取元数据变化。

Telegram审核提醒按对象版本去重，每批最多10条，临期优先并保留积压名额。`digest`/`urgent`仅预览；`dispatch digest|urgent`经Hermes实际发送，须有授权。发送前占位，成功后ack；pending/unknown不能换批次重发，人工确认后用delivery-delivered或delivery-unsent结案。正常定时任务可能已送达新条目，手动推送前查台账。

飞书日报选常驻5、新星3、末班车3，跨榜去重。新星为近14天未通知，末班车为3天内截止；不含待审、独立变更或已结束榜。webhook未配置或未验证时不能声称送达。

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
