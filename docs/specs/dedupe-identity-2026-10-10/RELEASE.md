# 发布准备与兼容回滚

本次用户已单独授权兼容发布，PR合并、必要生产迁移和部署已完成，见 [发布凭证](../../dedupe-release-2026-10-10.md)。以下扩大canary、历史apply与恢复步骤仍是未来操作说明，不自动扩大授权；本次没有真实采集、模型调用或消息发送，预算未增加。

## 交付基线与发布门槛

正式第一阶段为 PR #6 / `64db363b7dd4fd301d4872101d6ec313a0640d3d`。PR #7–#13 是依次堆叠的七个增量，不能单独拿最后一个 PR 的差异发布。每次合并或发布前重新核对 main、PR head、CI、迁移台账和用户未提交文件；本次8个PR均已合并。

本地工程验收与现场效果分开。A01–A45 的合成测试、SQLite 和真实本地 workerd D1 已有证据；尚缺至少 60 个经人工标注和授权的脱敏 pair、真实工作负载指标和生产 canary 验收。缺样本时不报告现场 precision/recall 为 0 或 100%，不扩大 canary，不启用生产历史合并。

未来发布须依次取得明确授权并完成：

1. 保存目标环境可恢复快照及脱敏副本，记录 snapshotHash、sourceCodeSha、rulesVersion、所有状态计数及 high-water marks。
2. 核对已应用迁移。先补 `0016_rejection_decision_key.sql`，再按本仓库顺序应用 0017–0035；已存在迁移不可重写。新编号如有并行占用必须重新编号并重测。先在批准环境迁移，再部署对应 Worker，保留旧列和表。
3. 采集 workflow 的仓库变量默认 `IDENTITY_MODE=off`、`IDENTITY_MODEL_ASSIST=false`；若经授权启用 shadow，Worker 与采集配置须显式对齐。产品 canary 以 Worker 的 `IDENTITY_CANARY_PLATFORMS` 为准；Worker enforce 缺 canary 会报告未评估。保持 `HISTORICAL_MERGE_ENABLED=false`，不设置生产 `IDENTITY_HISTORY_ENVIRONMENT`。模型辅助仍受原预算约束，本次不增加额度。
4. 每个旧 offer 独立回填、100 条 checkpoint；核对 offers、全部拒绝、leads、proposals、审计及通知映射。某产品未完成全状态对账不得进入 `IDENTITY_CANARY_PLATFORMS` 的 enforce；未回填产品旧 approved 继续可见。
5. 用冻结人工语料完成比较与流程验收，达到 ACCEPTANCE §3 门槛。人工确认明确产品范围后开启 canary，检查误合并、误拒、重复审核，而不只看队列减少。
6. 合并只先预览、核对 conflicts 和精确 planHash。先在批准的隔离副本演练 apply/rollback；生产操作须另批环境及具体计划。当前工具只支持 synthetic/redacted_local，不能改环境标签冒充生产授权。
7. 每组保存独立 receipt，出现冲突停止后续组。重新读取公开集合、原始行、外键、审核/送达历史；pending/unknown 始终保留人工核查，不能释放重发。
8. 另行核验真正运行的代码版本、迁移、D1 行数、查询、时延、重试积压及预算。CI 或本地 green 不代表已上线。

## 只读历史工具

以下路径均是管理员事先批准的本地脱敏文件占位符，不会自动导出或连接生产。

```sh
npx tsx scripts/identity/preview-backfill.ts --input /approved/redacted-snapshot.json --environment redacted_local
npx tsx scripts/identity/plan-merges.ts --input /approved/redacted.sqlite --environment redacted_local --groups /approved/groups.json
npx tsx scripts/identity/apply-merges.ts --input /approved/redacted.sqlite --environment redacted_local --plan /approved/plan.json
```

第三条默认 dry-run，输出 planHash、冲突和零写入。CLI 不读取 API_BASE 或管理员凭据。实际隔离副本 apply 要另加 `--apply --approve-plan <exact hash> --actor <author> --request-id <stable id>`；这份文档并未授权执行。rollback 预览需 `--rollback <operationId> --revision <revision>`，实际反向操作还需 `--apply --approve-operation <same operationId> --actor ... --request-id ...`。manifest 或后续数据变化会冲突；不可强行清除新数据使它通过。

十成员/十组是离线预览上限，Worker 每请求只预览一组；更大集合显式 oversized，不静默截断。已有合并组再嵌套、manifest 过大或未解决任务须重新规划，不自动选最高金额为主记录。

## 人工语料回放

`evaluate.ts` 接受 `identity-corpus-v1`：显式 synthetic/redacted_local、datasetVersion、approvedBy、frozenAt；每个 pair 有唯一 id、label、labelAuthor、labelEvidence、crossLanguageOrSource、candidate、entity、evidence。事实/实体/证据使用主 SPEC 的严格 schema。标注必须由人根据原文和收录规则提供，不能把待评估模型的输出当真值。

```sh
npx tsx scripts/identity/evaluate.ts --input /approved/pairs.json --environment redacted_local
npx tsx scripts/identity/evaluate.ts --input /approved/pairs.json --environment redacted_local --hash <first-output-corpusHash>
```

先冻结并人工确认 hash；任何标签、证据或事实改变使旧 hash 失效。报告各类分母、automatic precision（预测 SAME 且细分关系正确 / 所有原始 SAME，包括 INSUFFICIENT）与 identity precision（身份关系正确 / 所有原始 SAME）、duplicate recall、changed recall、uncertain rate 和 false merge/falseSame。原始 relation、termsRelation、entityId 均保留，条款不足不能藏掉已作出的 SAME 判断。样本至少 20/20/10/10，重复类至少 8 个跨语言/来源。这个工具只跑纯比较器，不会发模型请求或写数据库；false reject / duplicate review leak 为 null，须另用该批语料的服务流程回放补齐，故即使语义门槛通过也不会自动把 fieldAcceptance 改成通过。

## 兼容回滚包

本次已部署的兼容代码：`32ccacc53d185c2754d881089077d438f2808e3f`，需要迁移 0016–0035。较旧 P3-B 只证明历史 canonical 读取保护，不能替代包含本轮关闭审核/拒绝/估值修复的回滚代码。A31/A43/A44 和实际本地 D1 证明关闭身份写入仍只公开 canonical、旧 ID 解析、通知映射和缓存 generation 有效，未映射记录保持可见。

写入回滚是在经授权环境部署这个兼容版本并设置 `IDENTITY_MODE=off`、`IDENTITY_MODEL_ASSIST=false`、`HISTORICAL_MERGE_ENABLED=false`，保留 identity 表及 alias-aware 读取。已合并产品旧采集写入会 retryable 暂停，避免在关闭解析后重新制造重复；未合并产品按原路径工作。暂停不等于丢弃线索，应监控重试积压。当前生产已使用本轮兼容代码并关闭上述开关；没有执行历史数据撤销。

禁止直接回退 PR #6 或其它不认识 canonical/alias/generation 的旧 Worker；禁止为回滚 drop 表、删除原记录或重写 sent payload。单组数据撤销按 post-manifest 与 revision 检查；后续审核、证据、发送或人工修改无法归属时输出 rollback_conflict。全库恢复/Time Travel 需要独立灾难恢复授权。

停止扩大 canary/后续组的条件：任一控制样本误合并、拒绝记忆丢失、公开版本未经批准变化、unknown 被重发、记录数量无解释减少、行数/预算超批准范围。

## 本地复现

使用 Node 24.21.0。最新完整命令和结果见 [AUDIT-REMEDIATION.md](AUDIT-REMEDIATION.md)；P3-C-EVIDENCE 是修复前快照。`tests/fixtures/identity/wrangler.jsonc` 是隔离配置；每次真实 D1 演练使用新的 `.superpowers/sdd/IMPLEMENTATION/merge-d1-*` 目录。只运行 `--local`，不加载项目真实凭据或发送器。

`metrics.ts` 记录逐条 SQL（batch 内每条单独计数）、D1 暴露的 rows_read/rows_written、累计数据库调用耗时和错误；first/raw 不提供元数据的语句计为 metadataMissing，部分和不冒充全量。返回 raw 数组保持重复列，不能为采集指标改变 SQL 的行为。重试数量和最早计划时间另行输出；当前候选没有排队起始时间，队龄明确未测。`elapsedMs` 累计数据库调用时长，并行调用会重复计时，不能当作整个操作 wall time 或生产 CPU/延迟；字段名更改列为延期 Minor。

resolver identity-v2 对自动锚点下的缺失/新增事实保持身份待判；这可能增加人工任务，但防止模型欠抽取的独立子权益被当成重复吞掉。人工明确 same、或既有拒绝规则点名且只补齐该缺项，仍可进入受控待审；普通官方 alias 不是人工确认。
