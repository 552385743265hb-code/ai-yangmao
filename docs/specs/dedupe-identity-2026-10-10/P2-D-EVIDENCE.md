# P2-D 开发与验证记录

基线 `0045ca7`（P2-C / PR #9），分支 `codex/dedupe-p2-d`。任务 6 检查点 `7bd998b`，后续修复提交见 git log。本文件记录本地工程验收，不代表生产 canary 或真实样本质量验收。

## 范围

- 所有公开 offer 列表、平台页、RSS、详情共用 canonical 资格。未回填旧行继续显示；merged 行不重复计数；旧 ID 路由到主记录，隐藏主记录仍 404。`IDENTITY_MODE=off` 保留读过滤。浏览器旧 fragment 用 replaceState 归一，缓存 schema 已更新。
- 一身份任务一张审核卡，汇总原文与来源、已批准/候选事实、旧决定及人工保留字段。每次操作先预览，确认携带 revision；未知产品/机制可明确补充，判断依据进入内部追加审计。
- 发布通知绑定 publicationRevision，审核提醒绑定 materialRevision。纯来源/租约变化不重发提醒；claim 以当前 canonical generation/版本和任务实质修订再次校验。确认送达时，兼容 marks、outbox 和 delivery 在同一事务提交。pending/unknown 不自动释放。
- 保留飞书每日常驻榜。旧 CLI 同时读取身份任务；show 提供身份审核版本，approve/reject/edit 使用显式版本，旧卡失败不刷新重放。
- 新增 0025 routing_generation 与 merged_into 索引；不改写 0016–0024。

## 失败与通过证据

本次均使用 Node 24.21.0。忽略目录 `.superpowers/sdd/IMPLEMENTATION/` 保存 RED/完整验证日志及浏览器截图。

初始 RED 覆盖：公共集合与旧 ID、任务预览/fragment、通知版本/claim、旧 CLI、事实可读性、urgent/new 重复。独立审查 `0045ca7..7bd998b` 发现 4 项 Important：重复拼接提醒、固定事件窗口饥饿、未知事实无 UI 入口、旧 CLI 漏掉身份任务；全部补回归并修复。另有 A04/A06 三权益回放发现已证实独立 occurrence 被机制冲突提前挡住，已调整硬分离次序，同锚点不同机制仍保留不确定。未进行第二次独立复审。

最终命令：

```sh
npm run typecheck
npm test
npm run build:web
git diff --check
WRANGLER_SEND_METRICS=false npx wrangler d1 migrations apply identity-local-test --local --config tests/fixtures/identity/wrangler.jsonc --persist-to .superpowers/sdd/IMPLEMENTATION/d1
WRANGLER_SEND_METRICS=false npx tsx scripts/identity/verify-local.mjs
```

最新完整套件：491 Vitest + 8 CLI 通过（`p2d-verified-test.log`）；typecheck/build/diff 通过。先前失败日志保留：旧飞书测试 facade 缺 batch、UI 测试的 linkedom select 语义、审查回归。没有把这些失败轮算作通过。

真实本地 workerd D1 已应用至 0025，验证并发命令重放、零行守卫、批中/末尾回滚、RETURNING/FK、批准/outbox、canonical read、通知 claim/ack。输出记录在 `p2d-verified-d1.log`。

本地 Playwright 验证：桌面及 390×844 手机视口；一个任务两个来源；预览不发布，确认后合成公开数为 1，公开响应没有 reviewMemo。未知事实卡的受控选择及确认也作本地浏览器验证。页面唯一 console 错误是合成服务器未提供 favicon 404。截图和测试服务不包含真实凭据或生产数据。

## 第二阶段门槛与下一步

A01–A31、A44–A45 均有自动场景，覆盖点分别位于 identity-normalize/observations/compare/retrieval/model/transaction/decisions/service/adapters/public/notifications、frontend-workflow 和 identity-cli。补充冻结合成流程 `identity-phase2-replay.test.ts`：同页 3 权益，拒绝/独立待审/存储故障保持独立，重试后仍不自动批准。

这些结果只证明合成工程场景。至少 60 对人工标注真实脱敏 pair 未提供，现场 precision/recall/uncertain rate 未验证；IMPLEMENTATION 将其列在任务 9。生产 canary、真实账户 D1 指标、真实模型语义质量均未验证。

开关仍默认 shadow、model assist false、历史 apply 禁用；未执行生产采集、消息、数据库访问、迁移或部署。只有第二阶段本地工程门槛通过后，才进入第三阶段代码和合成隔离测试。生产发布须先迁移再 Worker，并另行批准。
