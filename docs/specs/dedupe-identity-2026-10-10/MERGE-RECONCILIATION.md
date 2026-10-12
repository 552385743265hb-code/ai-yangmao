# 历史合并的精确协调合同

现有普通合并仍要求产品、条款、估值及人工字段一致。`groups[].reconciliation` 是管理员在预览时提交的可选协调证明；它不提供通用的忽略冲突开关。预览与执行使用同一个校验函数，执行仍要求精确 `planHash`、环境、部署版本和原始状态快照。

## 支持范围

初版 `kind: legacy_exact_versions_v1` 只支持各成员均有已批准公开行、当前版本身份事实全部 unknown 的历史组。主记录的 offer 与 entity 必须已经属于证明中的真实产品。补充事实必须包含产品、机制、独立轮次和权益池，每个 known 事实均引用随计划提交的原文，轮次锚点须出现于引用中。这是可追溯的管理员事实确认；接口本身不联网核验原文真实性。

协调不能改变已有 known 事实，不能绕过人工 different、实际条款差异、独立轮次、非活动成员、已有合并后代、超大历史等保护。存在活动审核任务、待审提案、通知或 delivery 历史时，初版协调拒绝执行。修正产品的成员若有非 legacy_offer_id 的身份别名，同样拒绝，防止静默改变产品别名含义。

## 输入

`reconciliation` 的字段全部进入 `planHash`：

- `members`：每个实体恰好一次，包含 `entityId`、当前 `versionId`、原始 `stateHash`。
- `productId`、`facts`、`quotes[{id,url,quote}]`、`reason`：所选版本属于同一真实产品及事件的具体证明。
- `fieldChoices`：每个冲突字段显式指向 canonical offer ID。只允许保留主记录的现有值，不允许借合并写入任意新值。估值冲突必须同时选择 `valuation`、`usdEstimate`、`usdMax`；未列出的选择或遗漏均拒绝。
- `retainedClaims`：每条仍有效的拒绝分别提交 `decisionId`、`candidateId`、`decisionHash`、`rejectedUpdateId`、`rejectedUpdateHash`、`distinguishingFields`、`reason`。hash 使用仓库 `sha256(stableJson(row))`。

拒绝必须严格属于特定 claim，不能带 version 范围；decision 的原始来源必须是对应 offer 的 `rejected_offer_updates` 行。每个区分字段必须在原 rejected diff 中恰好出现一次，`from != to`，且所有保留版本的公开 offer 当前仍是 `from`。例如被拒提案将 `type: perk` 改成 `trial`，而两个原批准记录仍是 `perk`。这只证明保留版本不采用被拒提案，不撤销拒绝、不创建重开、不扩大其范围。指向已批准 subject 的拒绝仍阻挡。

预览保留 `expected` 中全部原始行，另列 `resolvedConflicts` 与尚未解决的 `conflicts`，并保存 `reconciliationProofs` 原始拒绝来源行。任何未解决项都禁止 apply。

## 原子写入与回滚

合并不改写 offers、benefit_versions、拒绝、原审计、别名或已发内容。只在现有合并事务内修正成员 entity 的可变路由产品并建立 canonical 路由，同时递增业务 revision 和 routing generation、更新公开缓存 generation。完整协调证明追加在 merge decision 的 basis，并保存在计划及 operation manifests 中。

原始实体、offer、审计、任务、平台等由现有快照保护；拒绝来源行额外在同一 D1 batch 内逐列比对原值，包含 JSON TEXT 原字节；每类证明只绑定一个 JSON 数组，20 条证明也不会随列数增长参数数量。执行前重新预览，执行事务内再次验证，任一竞争变化整体失败。

回滚恢复原 entity 产品和 active/merged 路由，revision 单调递增；保留所有追加审计。拒绝来源或被恢复产品资料变动，或原有审核/证据/发送状态发生不兼容变化，返回 rollback conflict。未知历史事实不生成伪造的版本等价通知映射；初版没有通知历史可迁移。

本地 `apply-merges.ts` 的默认 dry-run 传递协调证明；真正执行仍以服务端完整守卫为准。生产 apply 仍只走管理员历史接口，受历史环境、部署 SHA、功能标志与精确计划 hash 约束。

## 验证

- `tests/identity-merge-reconciliation.test.ts`：普通合并严格默认、缺字段选择、事实已有值、人工 different、stale snapshot、事务竞争、保留 claim、错误拒绝范围、拒绝内容差异、产品恢复、管理员 HTTP 全流程。
- 本地真实 D1：先为全新目录运行 `wrangler d1 migrations apply identity-local-test --local --config tests/fixtures/identity/wrangler.jsonc --persist-to .wrangler/merge-reconciliation-<unique>`，再以相同 `IDENTITY_LOCAL_PERSIST` 和当前 `IDENTITY_SOURCE_SHA` 执行 `node --import tsx scripts/identity/verify-reconciliation-local.mjs`。
- 运行器只接受 `.wrangler/merge-reconciliation-` 下的本地 synthetic 持久化目录；每次需新目录。以合同上限 20 条拒绝证明验证 routing、拒绝和原始行不变、回放幂等、产品回滚、过期计划拒绝、外键以及每请求 50 条语句预算，不触及生产。
