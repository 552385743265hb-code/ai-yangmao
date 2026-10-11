# A01–A45 修复后验证

代码 `f54650cdc7bda70f448d803a0eb63a8ccf3a420a`，Node 24.21.0，Wrangler 4.149.0。当前完整 `VITEST_MAX_WORKERS=1 npm test`：56 个 Vitest 文件、678 项断言和11项 CLI 全部通过；typecheck、build:web、diff检查通过。

[机器明细](evidence/acceptance.json)来自本轮实际 Vitest JSON，每项保留文件、测试全名与状态、源码SHA和报告hash；[本轮失败证据](evidence/audit-red-evidence.json)记录 R01–R09 与复核补丁的真实失败日志。历史启动失败保留在[旧记录](evidence/red-evidence.json)，不沿用旧测试数量或将首次即通过的保护断言冒称 RED。

下表仅是45组场景的已执行标签映射，一项断言可关联多个编号，计数不能相加。映射通过不代表所有无限输入或现场效果通过。报告中的运输、分页、恢复和人工估值缺口已经用真实 Worker/单候选HTTP/CLI和状态序列另补回归，详见[整改报告](AUDIT-REMEDIATION.md)。

| 场景 | 当前关联断言数 | 执行结果 |
|---|---:|---|
| A01 | 3 | passed |
| A02 | 1 | passed |
| A03 | 4 | passed |
| A04 | 6 | passed |
| A05 | 3 | passed |
| A06 | 8 | passed |
| A07 | 2 | passed |
| A08 | 6 | passed |
| A09 | 2 | passed |
| A10 | 4 | passed |
| A11 | 1 | passed |
| A12 | 5 | passed |
| A13 | 1 | passed |
| A14 | 4 | passed |
| A15 | 2 | passed |
| A16 | 3 | passed |
| A17 | 6 | passed |
| A18 | 7 | passed |
| A19 | 10 | passed |
| A20 | 6 | passed |
| A21 | 1 | passed |
| A22 | 9 | passed |
| A23 | 7 | passed |
| A24 | 4 | passed |
| A25 | 1 | passed |
| A26 | 15 | passed |
| A27 | 11 | passed |
| A28 | 7 | passed |
| A29 | 17 | passed |
| A30 | 4 | passed |
| A31 | 7 | passed |
| A32 | 10 | passed |
| A33 | 3 | passed |
| A34 | 8 | passed |
| A35 | 6 | passed |
| A36 | 5 | passed |
| A37 | 8 | passed |
| A38 | 1 | passed |
| A39 | 5 | passed |
| A40 | 2 | passed |
| A41 | 2 | passed |
| A42 | 5 | passed |
| A43 | 3 | passed |
| A44 | 3 | passed |
| A45 | 4 | passed |

至少60对授权、脱敏、人工标注语料尚未提供；全流程真实语料 precision/recall、误拒、重复审核泄漏及生产资源验收仍未评估。不能将合成断言映射或本地D1结果宣传为生产验收。
