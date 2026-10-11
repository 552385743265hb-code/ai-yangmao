# P2-C 开发与验证记录

基线：`056334106b078baa0acfbe19c388e0aeea783448`（P2-B / PR #8）。分支：`codex/dedupe-p2-c`。核心提交 `adcbe11`、`3025275`、`c5f532b`，任务 5 集成检查点 `bee60f6f1b32ef854cbf12b6a8ee42dccc2c5119`。独立审查与修复已完成；不代表第二阶段全部完成。

## 已实现的边界

- `commitIdentityMutation` 统一 staged 命令、请求回执、entity/task/block CAS、每次执行独有 nonce、同批末尾 CHECK 断言。旧 staged 行不能使首守卫为零的本批写入生效。
- 决定、版本、人工审核任务、兼容 offer/review/proposal 投影和 outbox 同批提交；仅明确批准推进 publicationRevision。A→B→A 可以复用旧事实版本并产生新的批准事件。
- 有范围的拒绝、原始理由及证据 basis 保留；仅候选拒绝不制造 offer/entity。重开与撤销别名是有版本的追加决定。付费套餐拒绝不会仅因“同为周期额度”抑制独立免费权益。
- 任务租约为 20 分钟。claim 冻结候选集合/实体 revision，过期模型结果不能修改人工决定。模型结果只保存建议，不获得批准/合并权限。
- 三条 pipeline 写入路径共用分批客户端；检索失败不再当空历史；已持久化的 deferred 候选由确定性重试接手。默认 shadow、模型辅助关闭。
- 旧补链接入口保留原处理结论。已映射 offer 的通过/拒绝/编辑/下架入口使用身份版本和统一事务；只改文字/估值等元数据不另建实质审核提醒。人工草稿保留，候选新增来源不清理人工字段。
- 官方复核 jobId/inputVersion 与身份 revision 联合保护。原文始终来自观察记录，模型不能提供可信抓取元数据。

## SQL 与资源预算

执行时本地计数显示，初版单条 enforce 写入为 71 条 SQL；减少重复回执查询后为 59 条。官方当前文档给出免费档每 Worker 调用 50 次查询、每 SQL 100 个绑定参数；batch 的事务回滚与普通零行匹配含义也分别核对。[D1 限制](https://developers.cloudflare.com/d1/platform/limits/)、[D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/)。

本实现采取更保守的口径：逐条计算 batch 内 SQL，单请求最多 50 条；不足以执行整批时，在 batch 开始前延期。已持久化 intake 返回 pendingResolution，客户端在独立请求继续解析。enforce 写入和 shadow 候选传输默认每请求 1 条，仍在 SPEC 的“最多 10 条、按实际限制缩小”范围内；旧 off/shadow `/offers` 上限保留。身份任务列表每页最多 8 张卡。未提高套餐、限额或模型预算，也未假设真实账户属于 Paid。Cloudflare 对 batch 的实际计费/内部子请求口径未作生产实测。

## 本次验证

Node `v24.21.0`；完整日志在忽略目录 `.superpowers/sdd/IMPLEMENTATION/`：

- 事务、服务和适配器均保存 RED→GREEN 日志，包括孤立 staged 行、零行 CAS、SQL 中途失败、跨实体 version、旧审核卡、人工草稿、无 offer 拒绝、同日政策恢复、错误 alias/citation 和预算续跑。
- 检查点完整 `npm test`：465 Vitest + 8 CLI；`npm run typecheck`、`npm run build:web`、`git diff --check` 通过。最终 PR 以修复后最新命令/HEAD 为准，不沿用该数字。
- 真实本地 Wrangler/workerd D1：迁移到 0024；观察重放、并发原请求一 applied/一 replay、首守卫零行、末尾断言失败回滚、中途 CHECK 回滚、RETURNING、FK，以及 intake→task→批准→offer/outbox 通过。
- 曾有一轮 Vitest fork 在 `pipeline-workflow.test.ts` 中收到 SIGSEGV。那轮不是全套成功且未运行 CLI 测试；保留 `task5-refusal-test.log`。单文件 39 项复跑及随后多轮完整套件通过，根因未确定。

## 迁移、授权与后续

新增 0020–0024 分别保存建议、租约/线索上下文、决定理由/basis、执行 nonce，以及跨活动拒绝适用关系；0017–0019 来自前两个增量，0016 来自正式 PR #6。已有迁移未覆盖。未来发布必须先迁移，再部署兼容 Worker/更新采集客户端；未经完整产品回填核对不能开启 enforce。

任务 6 的前端、canonical 公开读取及发送器兼容尚待完成。真实人工标注语料尚未提供，本记录不能证明现场 precision/recall。实施计划将至少 60 对冻结回放列在任务 9；合成工程验证与真实现场验收分别报告。

本次未合并 main、未部署、未读写生产数据库、未执行生产迁移或实际历史数据合并、未实际采集福利来源/调用流水线模型/发送外部消息。所有 D1 运行数据均为隔离测试构造。

## 独立审查收尾

审查范围 `0563341..bee60f6`，发现 6 项 Important、0 项 Critical；8 个新增回归断言先失败后通过。修复了过期拒绝回执、部分事实复用待审版本、人工刷新草稿的批准/拒绝、补证任务的 proposal 收尾、跨活动机制拒绝适用关系，以及 rejected lead 对账门槛。未再次派独立复审，修复由回归与完整验证覆盖。

最终执行：`npm run typecheck`、`npm test`（473 Vitest + 8 CLI）、`npm run build:web`、`git diff --check` 全部通过；真实本地 D1 已迁移到 0024 并通过事务/服务验证。完整日志前缀 `p2c-final-*` 与 `p2c-review-*`。
