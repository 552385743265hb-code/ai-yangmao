# P3-C 交付与验收记录

**源码和本地工程验证已交付；现场语料验收未完成，未合并或部署。** Task 9 中要求的至少 60 对人工标注脱敏 pair 尚未提供，因此不能宣布第二、第三阶段达到生产发布门槛。

## 基线与交付

原工作区 `/Volumes/AI/MyWorkspace/AI_Freebies` 保留，未修改或切换。独立工作区为 `dedupe-phase2-3/AI_Freebies`。开始及收尾实时核对：main 为 `7cea69d95d2c27e2c1ebd7641a94bab2a696901d`，PR #6 OPEN、未合并，head 精确为 `64db363b7dd4fd301d4872101d6ec313a0640d3d`，CI SUCCESS。第一阶段三个修复只做集成回归，未重打补丁；未用旧 PR 或压缩包实施。

| 增量 / 任务 | 独立 PR | 验证后的提交 |
|---|---|---|
| P2-A / 1–2 | [#7](https://github.com/accesaver-byte/ai-yangmao/pull/7) | `1d0aa0a7ed1450b500cbe631775d797ee4fe09ee` |
| P2-B / 3 | [#8](https://github.com/accesaver-byte/ai-yangmao/pull/8) | `056334106b078baa0acfbe19c388e0aeea783448` |
| P2-C / 4–5 | [#9](https://github.com/accesaver-byte/ai-yangmao/pull/9) | `0045ca7367885f563a9b4122615d245b5197f895` |
| P2-D / 6 | [#10](https://github.com/accesaver-byte/ai-yangmao/pull/10) | `27bc0bab907268f1679c989714b4b47ddc2d1f82` |
| P3-A / 7 | [#11](https://github.com/accesaver-byte/ai-yangmao/pull/11) | `c557eeff6a40b858ddb20090d469b7c6dca544a5` |
| P3-B / 8 | [#12](https://github.com/accesaver-byte/ai-yangmao/pull/12) | 代码 `c3c721e1bd64a54299f43826ee44a446f29f15a7`，证据 `a5cf2cf` |
| P3-C / 9 | 本 PR，基于 `codex/dedupe-p3-b` | 指标/报告 `9de8abb0b68786daac99f5aa283b5d2411aed288`；冻结示例 `00708ddbd43dc4a63f09eafbf2cef2420bec8293` |

P2-D 的本地工程门槛通过后才开始 P3-A。七个增量依次堆叠，尚未合并 main。各增量完整测试数仅在各自证据文件中作为当次快照，本次最新结果如下。

## 本次命令与结果

Node **24.21.0**；完整日志在忽略目录 `.superpowers/sdd/IMPLEMENTATION/`。

```sh
npm run typecheck
npm test
npm run build:web
git diff --check
npx vitest run tests src --reporter=json --outputFile=.superpowers/sdd/IMPLEMENTATION/task9-vitest.json
npx tsx scripts/identity/acceptance-report.ts --input .superpowers/sdd/IMPLEMENTATION/task9-vitest.json
WRANGLER_SEND_METRICS=false npx wrangler d1 migrations apply identity-local-test --local --config tests/fixtures/identity/wrangler.jsonc --persist-to .superpowers/sdd/IMPLEMENTATION/merge-d1-p3c-fullsha
IDENTITY_LOCAL_PERSIST=.superpowers/sdd/IMPLEMENTATION/merge-d1-p3c-fullsha IDENTITY_SOURCE_SHA=9de8abb0b68786daac99f5aa283b5d2411aed288 IDENTITY_METRICS_OUTPUT=.superpowers/sdd/IMPLEMENTATION/task9-metrics.json WRANGLER_SEND_METRICS=false npx tsx scripts/identity/verify-merge-local.mjs
```

- **554 Vitest / 47 文件 + 8 CLI 全部通过**，无 skipped；typecheck、build:web、diff-check 通过。日志 `p3c-candidate-{test,typecheck,build}.log`，JSON 报告另实跑，不从源文件中测试名的存在推断结果。
- [45 组矩阵](ACCEPTANCE-RESULTS.md)、[逐测试明细](evidence/acceptance.json)、[失败前证据](evidence/red-evidence.json) 保存测试全名、命令、实际结果及日志 hash。新增指标/报告工具先缺模块 RED 后 GREEN。最终覆盖检查补了五个首次即通过的已有保护断言，未声称它们曾失败。
- fresh local workerd D1 0000–0029 全迁移成功；十成员合并/撤销、重放、原行/发送 payload 保留、unknown 阻断、外键、提案承接、旧别名继续入库、新证据阻止撤销全部通过。日志 `task9-d1-fullsha.log`。
- 初次 Task 9 演练命令误传短 SHA，被严格 40 位 schema 拒绝（`task9-d1.log`）；更正完整 SHA 并新建库重跑成功。保留失败，不冒充第一次通过。更早 P3-B 的 D1 表达式深度失败已修复并重测。P2-C 曾有一次 Vitest fork SIGSEGV，独立及后续完整运行通过，根因未证实。

## 实测资源与质量边界

[local-d1-metrics.json](evidence/local-d1-metrics.json) 来自上述真实本地 D1；rows 是 D1 meta 的部分和，first/raw 缺少元数据的语句单独计数，不把缺失当零。

| 流程 | SQL 语句 | 有元数据 / 缺元数据 | 部分 rowsRead / rowsWritten |
|---|---:|---:|---:|
| 十成员 merge | 30 | 27 / 3 | 1155 / 154 |
| 十成员 rollback | 31 | 28 / 3 | 1188 / 109 |
| 非主提案承接 | 36 | 33 / 3 | 296 / 73 |
| 承接任务撤销 | 35 | 32 / 3 | 338 / 51 |
| 再合并 | 35 | 32 / 3 | 330 / 71 |
| 保留官方别名入库 | 21 | 12 / 9 | 38 / 7 |
| 新证据撤销冲突 | 18 | 16 / 2 | 94 / 0 |

所有请求低于代码保守上限 50 SQL（batch 按每条算），无错误；调用耗时约 16–88 ms，仅代表这个小型本地 fixture 的客户端 wall time。最终候选/抽取 deferred 积压为零；未保存排队起始时间，队龄未测。真实规模下的读行数、全表扫描影响、生产 CPU/延迟、账户配额均未验证，不能由此宣称预算上线验收通过。模型调用、tokens、费用以及外部消息均为 0，未调整预算。

已冻结 [四对合成示例](../../../../tests/fixtures/identity/evaluation-synthetic.json) 的 label 与事实，hash 为 `fbc6b163bf6272ee51806488ee736239e7f57af021210af99f3b0f7b9235ba82`。它只是 CLI 输入与分母示例；初稿共享对象误改旧事实被 RED 断言发现，修正为明确的旧 10→新 20、旧产品→另产品，标签未调整。实际结果见 [synthetic-evaluation.json](evidence/synthetic-evaluation.json)，样本不足，semanticGate=not_met、fieldAcceptance=not_evaluated。

[现场验收状态](evidence/field-acceptance.json) 把所有未测质量指标留为 null。至少 60 对人工语料的质量回放仍是 Task 9 的未完成外部输入，不能用这四对或数百个合成断言替代。工具记录精确冻结 hash、标签作者/依据与规则版本，拒绝改标签后复用旧 hash；纯比较器也不能测假拒绝或审核泄漏，这两项需服务流程回放。

## 审查、迁移与风险

P2-A、P2-B、P2-C、P2-D、P3-A、P3-B 各完成独立复核，发现的 Important 均以失败→通过测试修复；P3-C 独立复核待本次候选提交后执行，不以作者自检替代。

新增迁移 0017–0029，0016 保持原样。没有修改已提交历史迁移、依赖或模型预算；首次 npm ci 的既有 4 项 high 依赖提示未在此任务升级处理，不声称重新安全审计。未来发布必须先迁移后部署 Worker。兼容回滚固定到 P3-B `c3c721e...` 或后续经过相同验收的版本，off 模式保留 canonical/generation 读取；不能回到不认识别名的旧 Worker。详见 [RELEASE.md](RELEASE.md)。

原始记录、人工决定、通知 payload 保留；历史 CLI 默认计划/冲突/零写，pending/unknown 不自动释放。现有合并组嵌套、过大 manifest、复杂人工冲突须重新规划。语料、真实历史规模、生产 performance、真实模型及消息均未验证。生产迁移、历史 apply、主分支合并、部署和线上核验均未执行。
