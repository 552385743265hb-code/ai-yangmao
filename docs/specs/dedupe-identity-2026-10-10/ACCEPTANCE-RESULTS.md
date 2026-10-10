# A01–A45 本次关联测试证据

这是当前带验收标签的合成工程测试结果，不是人工语料现场验收或线上验证。机器明细 [acceptance.json](evidence/acceptance.json) 保存每条实际执行的测试全名、文件、状态、命令、代码 SHA、原始报告 hash；[red-evidence.json](evidence/red-evidence.json) 保存实际历史失败行、错误和日志 hash。并未把旧测试数当成本次结果。

本次 47 个 Vitest 文件、562 项测试全部通过；完整 `npm test` 另含 8 项 CLI 通过。表中的计数是该编号关联断言数，一条测试可验证多个编号，因此不能相加当作总测试数。自动报告不推断合同子例完整通过；作者逐项对照中发现的 A24 并发服务、A45 外来 decision 子例已补直接断言。测试涉及的 pure comparison、状态服务、故障注入、入口、前端和历史流程互相补足。编号扫描只用于追踪，不能替代阅读断言。

本地保存目录 `.superpowers/sdd/IMPLEMENTATION/`，原始日志未提交。缺模块的失败是任务启动证据，不冒充每个后增断言都曾行为失败；保留原有保护、补充覆盖的测试可能首次即通过。Task 9 报告/指标工具先写测试，缺模块失败后实现通过。

| 场景 | 本次关联断言数 / 结果 | 实际失败前证据日志 |
|---|---|---|
| A01 | 3 / passed | task1-red-behavior.log |
| A02 | 1 / passed | 模块缺失：task1-red.log |
| A03 | 4 / passed | task1-red-behavior.log, task2-red.log |
| A04 | 6 / passed | p2a-ambiguous-red.log, p2a-review-red.log, task2-red.log, task2-shadow-red.log |
| A05 | 3 / passed | task2-red.log, task2-shadow-red.log |
| A06 | 8 / passed | p2a-review-red.log, task2-red.log, task5-client-red.log, task5-retry-red.log |
| A07 | 2 / passed | task5-adapters-red.log, task5-enrich-red.log |
| A08 | 6 / passed | p2c-review-red.log, p3c-review-boundary-red.log, task4-protection-red.log |
| A09 | 2 / passed | task3-compare-red.log, task5-manual-red.log |
| A10 | 4 / passed | p3c-review-boundary-red.log, task3-extra-red.log |
| A11 | 1 / passed | task3-compare-red.log |
| A12 | 5 / passed | p2b-review-red.log |
| A13 | 1 / passed | task3-compare-red.log |
| A14 | 4 / passed | task3-compare-red.log, task4-protection-red.log, task4-service-red.log, task5-edit-red.log |
| A15 | 2 / passed | task3-compare-red.log, task3-extra-red.log |
| A16 | 3 / passed | p2b-proof-red.log, p2b-review-red.log, task3-compare-red.log |
| A17 | 6 / passed | p2b-proof-red.log, p3b-review-red2.log, task3-compare-red.log, task4-decisions-red.log, task4-service-red.log, task6-notify-red.log, task6-urgent-red.log, task8-transition-red.log |
| A18 | 7 / passed | task3-fts-red.log, task3-model-red.log, task3-retrieval-red.log, task5-index-red.log |
| A19 | 10 / passed | p2b-review-red.log, task2-red.log, task3-model-red.log, task5-anchor-red.log, task5-lease-scope-red.log, task5-reference-red.log |
| A20 | 6 / passed | task1-schema-red.log, task4-lease-red.log, task4-service-red.log, task4-transaction-red.log, task5-adapters-red.log, task6-notify-red.log |
| A21 | 1 / passed | task4-transaction-red.log |
| A22 | 9 / passed | p2c-review-red.log, task4-protection-red.log, task4-service-red.log, task5-nonce-red.log |
| A23 | 7 / passed | task1-schema-red.log, task4-transaction-red.log |
| A24 | 4 / passed | task1-schema-red.log, task4-service-red.log |
| A25 | 1 / passed | task4-transaction-red.log |
| A26 | 15 / passed | p2c-review-red.log, p2c-scope-red.log, p3c-reopen-preservation-red.log, task3-retrieval-red.log, task4-decisions-red.log, task4-service-red.log, task5-index-red.log, task5-lead-refusal-red.log, task5-manual-red.log, task5-paid-scope-red.log, task5-reopen-revoke-red.log, task5-visibility-red.log |
| A27 | 11 / passed | p2a-review-red.log, p2d-review-red.log, task2-red.log, task2-routes-red.log, task2-shadow-red.log, task3-model-red.log, task4-service-red.log, task5-budget-red.log |
| A28 | 7 / passed | p2d-cli-red.log, p2d-review-red.log, task4-lease-red.log, task5-presentation-red.log, task6-notify-red.log, task6-ui-readable-red.log, task6-ui-red.log |
| A29 | 17 / passed | p2d-cli-red.log, p3b-review-red2.log, task3-compare-red.log, task3-model-red.log, task4-lease-red.log, task4-protection-red.log, task5-alias-cache-red.log, task5-edit-red.log, task5-legacy-approve-red.log, task5-manual-red.log, task5-official-red.log, task5-reopen-revoke-red.log, task6-legacy-red.log, task6-notify-red.log, task6-ui-red.log, task8-constraints-red.log, task8-live-version-red.log |
| A30 | 4 / passed | task2-routes-red.log, task4-service-red.log, task8-cli-red.log |
| A31 | 7 / passed | p2d-review-red.log, task6-public-red.log, task6-ui-red.log, task8-cache-red.log, task8-platform-red.log |
| A32 | 10 / passed | p3a-review-red.log, task7-proposal-red.log |
| A33 | 3 / passed | p3a-checkpoint-red.log |
| A34 | 8 / passed | p3a-manual-red.log, p3a-review-red.log |
| A35 | 6 / passed | task8-live-version-red.log, task8-platform-red.log |
| A36 | 5 / passed | 模块缺失：task7-red.log, task8-red.log |
| A37 | 8 / passed | p3b-review-red.log, p3b-review-red2.log, task8-integration-red.log, task8-lead-red.log, task8-new-link-red.log, task8-verify-route-red.log |
| A38 | 1 / passed | 模块缺失：task8-red.log |
| A39 | 5 / passed | p2d-review-red.log, p3a-review-red.log |
| A40 | 2 / passed | p3b-review-red2.log, task8-transition-red.log |
| A41 | 2 / passed | 模块缺失：task8-red.log |
| A42 | 5 / passed | task8-routing-red.log |
| A43 | 3 / passed | task6-public-red.log, task8-cache-red.log, task8-off-write-red.log |
| A44 | 3 / passed | p2c-review-red.log, task5-adapters-red.log, task6-public-red.log |
| A45 | 4 / passed | task1-schema-red.log, task4-transaction-red.log |

## 交叉核对

- A01–A19：事实规范/强冲突由纯函数测试验证；观察存储、来源关联与重复公开保护由服务/回放测试验证。A04/A06 的三候选混合页有拒绝、待审、故障和只重试未完成项的完整流程 fixture。A17 在当前 B 版本恢复 A 后产生新的批准边界。
- A20–A30：A24 现在实际并发不同 request/模型 ID，冲突者重新检索后指向同一实体；真实 SQLite 迁移、零行 CAS、中途/末尾 SQL 失败、命令重放、任务/模型过期和权限测试。实际 local D1 的 batch/RETURNING/CHECK/竞争另见各增量记录，不能由 mock 冒充。
- A31/A43/A44：API、RSS、平台集合、非公开详情、旧 hash 与 off 模式别名过滤；浏览器桌面/移动端合成 UI 验证在 P2-D 记录。已有 cache 命中遇合并后 generation 失效由 Worker 集成测试验证。
- A32–A34：独立回填、原行保留、105 条数据在 101 中断、跨快照 checkpoint 拒绝、人工提案/估值/心得冲突均有断言。
- A35–A42：十成员合并、逐组 receipt、循环/缺主记录/跨产品拒绝、sent 的事实/轮次映射、pending/unknown 阻断、提案承接、manifest 撤销及新增审核/发送/证据冲突。新增的五项最终覆盖断言首次通过，记为已有保护验证。
- A45：跨实体 version 与候选误引用外来 decision 的事务回滚、数据库引用约束，以及无权限/ingest 凭据不能读取管理员证据卡。公开字段剥离另由 A31 覆盖。

## 未验收

未收到授权的真实脱敏人工 60-pair 集合。automatic precision、recall、uncertain、false reject 和 duplicate review leak 的现场统计均未测，不能从这些合成断言推断。没有生产 canary、生产查询/行数/CPU 测量、真实模型或发送验证。详细限制见 [P3-C-EVIDENCE.md](P3-C-EVIDENCE.md)。
