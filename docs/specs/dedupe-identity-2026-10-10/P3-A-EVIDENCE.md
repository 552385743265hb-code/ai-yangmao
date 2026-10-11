# P3-A 开发与验证记录

基线 `27bc0bab907268f1679c989714b4b47ddc2d1f82`（P2-D / PR #10），分支 `codex/dedupe-p3-a`。检查点 `9095f11c0a80c5f4eca4dbf2128fe7cf6f9e935f`，独立复核及修复已完成。

## 行为

每条旧 offer 独立映射一个 entity，不根据标题或金额自动合并。原 offers、leads、reviews、revisions、proposals、rejected updates、notifications、deliveries 均保留原行。缺少事实的字段保留 unknown。旧拒绝线索与被拒更新建立窄范围 candidate/observation 决定；人工 proposal 保留并关联身份审核任务。

离线快照包含显式环境、来源标识、代码 SHA、批准输入人、各表计数和 snapshotHash。回填按稳定对象键 100 条分页，checkpoint 绑定快照，单对象事务和 request 回执支持中断重放。CLI 默认只读预览；合成测试调用独立 apply 函数，不对实际历史数据执行。

合并预览逐组输出 canonical 选择理由、身份依据、旧/新公开集合、实体/版本/任务/别名/决定/提案/线索/通知原状态、预期版本与 stateHash、before/after manifest、执行顺序、回滚影响、冲突和 planHash。不同已批准条款、独立轮次、人工 different、估值/心得差异、不同 proposal、未撤销拒绝等保留冲突。超过十组/十实体显式 oversized，不静默截断。

## 本地命令与证据

```sh
npm run typecheck
npm test
git diff --check
WRANGLER_SEND_METRICS=false npx wrangler d1 migrations apply identity-local-test --local --config tests/fixtures/identity/wrangler.jsonc --persist-to .superpowers/sdd/IMPLEMENTATION/history-d1-p3a
IDENTITY_LOCAL_PERSIST=.superpowers/sdd/IMPLEMENTATION/history-d1-p3a IDENTITY_SOURCE_SHA=27bc0bab907268f1679c989714b4b47ddc2d1f82 WRANGLER_SEND_METRICS=false npx tsx scripts/identity/verify-history-local.mjs
```

检查点 503 Vitest +8 CLI、typecheck/diff-check 通过。RED 记录保留未实现模块和缺失旧提案 candidate/task；开发时暴露并修复了 immediate FK 插入顺序和 Node/Worker 类型边界。105 个合成 offer 的测试在第 101 条中断，重放后无重复或跳行，别的 snapshotHash 不接受旧 cursor。

真实 fresh local workerd D1 已迁移至 0026，回填/重放/旧表字节不变/FK/冲突预览通过，输出 planHash 与 conflictPlanHash 存在 `task7-d1.log`。不包含任何真实数据库、凭据、外部发送或模型调用。

## 工具入口与限制

```sh
npx tsx scripts/identity/preview-backfill.ts --input /absolute/approved-snapshot.json --environment redacted_local
npx tsx scripts/identity/plan-merges.ts --input /absolute/approved-copy.sqlite --environment redacted_local --groups /absolute/review-groups.json
```

这些仅为未来经批准的本地输入示例，本次没有实际脱敏快照路径，未执行上述真实输入命令。输入/环境缺失或 `--apply` 会退出。合并 apply/通知继承/rollback 属于下一增量，尚未实现；不能拿当前 planHash 当作生产授权。迁移新增 0026，保留此前所有迁移；未来先迁移再部署。

## 独立复核收尾

5 项 Important 已逐一复现并修复：超过十条的关联线索完整写入（超过 1000 条显式冲突）；proposal 使用自己的 URL/原文；被拒更新只关联唯一对应的拒绝记录，未知理由不借用后续批准；审核通知按 taskId 纳入 manifest/hash；空与非空人工心得比较。另增加通用人工业务字段冲突、新快照增量对账、无前置 checkpoint 不能跳页的回归。对象幂等绑定原行/事实，checkpoint 单独绑定 snapshotHash，重复对象可安全用于新的对账快照。

最终 512 Vitest +8 CLI、typecheck/diff-check 通过，日志 `p3a-final-*`。新建隔离 workerd D1 重跑回填、回执重放、原行不变、FK、冲突预览通过，持久目录为 `history-d1-p3a-final`。未再次独立复审；未使用或修改真实历史数据。
