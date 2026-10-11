# P3-B 开发与验证记录

基线 `c557eeff6a40b858ddb20090d469b7c6dca544a5`（P3-A / PR #11），分支 `codex/dedupe-p3-b`。实现提交 `85f1772008938537ae9ba379b710242ffe565014`、`af253771edbed982613a3f6f025a17a83c09d0d6`；独立复核修复提交 `c3c721e1bd64a54299f43826ee44a446f29f15a7`。

## 行为与边界

精确 planHash 和完整前置状态保护逐组合并。任一成员变化整组冲突，各组保留独立回执。原 offers、reviews、revisions、拒绝、通知及发送 payload 不移动、不改写；canonical 路由、任务来源、版本对应关系和审计另行保存。相同提案归一任务；只有非主实体有提案时建立主实体拥有的新任务与草稿，保留原草稿。不同提案仍须人工处理。

送达继承要求事实版本、轮次、各自 publication revision 对应明确；pending/unknown 保持阻断。合并后的新增证据、审核、发送等使 rollback 返回冲突。符合 manifest 的撤销只恢复路由和原任务，追加审计，清理本次衍生投影；不删除原历史。公开缓存由 routing generation 失效；旧 ID、线索来源、官方别名和通知读取均解析 canonical。identity off/shadow 仍保留合并过滤；已合并产品的旧写入入口暂停，待受控 enforce 接续。

CLI 默认只读 dry-run，显式要求本地输入和 synthetic/redacted_local 环境；apply 另要求精确 hash、actor、request。Worker 历史路由须管理员及可信非生产环境，写入另须历史开关。所有实际 apply/rollback 均为虚构 fixture。

## 失败到通过

- 初始缺失 merge/rollback 实现：`task8-red.log`。
- 首次真实本地 D1 十成员合并暴露 `Expression tree too large (maximum depth 100)`，`task8-d1-core.log` 失败。改为平衡 AND 树，保留所有守卫；新建本地库验证通过。
- 独立复核 `c557eef..af25377` 发现 3 项 Important：保留的官方 alias 入库断言错误、只有非主记录有任务时不能承接、旧已发送变更错误阻断当前事件。均先复现失败后修复；附加 alias 撤销与草稿来源回归。无 Critical；未再次独立复核，不以自查冒充第二次审查。

最终 Node 24.21.0 命令：

```sh
npm run typecheck
npm test
npm run build:web
git diff --check
WRANGLER_SEND_METRICS=false npx wrangler d1 migrations apply identity-local-test --local --config tests/fixtures/identity/wrangler.jsonc --persist-to .superpowers/sdd/IMPLEMENTATION/merge-d1-final
IDENTITY_LOCAL_PERSIST=.superpowers/sdd/IMPLEMENTATION/merge-d1-final IDENTITY_SOURCE_SHA=c3c721e1bd64a54299f43826ee44a446f29f15a7 WRANGLER_SEND_METRICS=false npx tsx scripts/identity/verify-merge-local.mjs
```

最终完整运行：**543 Vitest + 8 CLI 通过**；typecheck、build:web、diff-check 通过。日志 `p3b-fixed-{test,typecheck,build}.log`。真实 fresh local workerd D1 迁移至 0029，十成员 merge/replay、原行和 payload 不变、unknown 阻断、rollback/replay、外键、每请求不超过 50 条 SQL 通过。另测 source-only proposal 承接/撤销、保留 alias 正常入库，以及新增证据后撤销冲突，全部符合预期；日志 `p3b-final-d1.log`。

## 迁移、风险与下一步

本增量新增 0027（版本/任务路由）、0028（通知转换边界）、0029（公开缓存 generation）；0016 和已提交迁移不覆盖。未来须先迁移再部署兼容 Worker；不能回退到不识别 canonical/alias 的旧 Worker。

嵌套已有合并组、超十成员、过大 manifest 显式冲突，需要单独规划；未用真实历史数据验证。至少 60 个经人工标注的脱敏 pair 仍未提供，现场质量门槛未验收。生产行数/时延/CPU 及实际预算未验证，本地测试不能替代。真实模型调用、外部发送、生产读写、部署、合并 main 均为 0。

下一增量 P3-C 负责 45 组实际验收映射、指标、质量回放入口和发布/兼容回滚证据。
