# 给 Codex 的执行入口

## 当前成果

第一阶段PR：https://github.com/accesaver-byte/ai-yangmao/pull/6  
分支：`fix/dedupe-phase1-final-20261010`  
基线：`7cea69d95d2c27e2c1ebd7641a94bab2a696901d`  
已验证修复代码：`ba9724f5a39bff1b0640c4a1f4618ef0a9fdf5b4`。

第一阶段只实现：duplicateId终态处理、同数字真实周期变化保留为提案、拒绝记忆/audit/提案删除原子性。包含0016增量迁移；没有部署或生产迁移。343个Vitest＋8个CLI测试、typecheck和web构建通过；还需真实D1运行时/生产验收。依赖audit另报告4个high package entries，未在此PR修依赖。

第二、三阶段文件是规格，不是已实现代码。按下列入口交接，不重复第一阶段工作。

## 可直接复制的任务

```text
请先读 docs/specs/dedupe-identity-2026-10-10/README.md 的合同补充，再在 ai-yangmao 仓库按以下文件实施第二、第三阶段：
1. docs/specs/dedupe-identity-2026-10-10/SPEC.md
2. docs/specs/dedupe-identity-2026-10-10/IMPLEMENTATION.md
3. docs/specs/dedupe-identity-2026-10-10/ACCEPTANCE.md

开始前读取 AGENTS.md、现役数据合同、最新 main 和 PR #6。检查第一阶段修复是否已集成；不要覆盖用户未提交修改，不要重复实现已完成代码。使用独立分支，先做P2-A，按IMPLEMENTATION的七个增量和九个任务依序交付。

目标是同活动同版本不重复审核；真正的新活动/条款变化/补足拒绝原因的新官方证据仍可进入正确流程。不得用标题相似度、同URL、同金额或模型sameAs直接静默合并；未知要保留为可追溯任务。保留全部拒绝历史、人工编辑、旧ID和实际通知回执。

每个任务先写并运行失败测试，再实现，运行全套测试/typecheck，涉及前端加build:web。使用本地SQLite与实际本地D1验证事务。保存进度、命令和实际结果，未验证项明确列出。

当前只允许本地开发、测试、生成迁移和脱敏数据dry-run。生产读取/写入、部署、消息发送、预算增加、主分支合并、历史apply均未授权；持有密钥不扩大权限。历史清理先生成planHash预览，保留原记录并实现受约束回滚，不能直接删除重复行。

完成每个增量后输出代码diff、测试证据、风险、迁移顺序与下一任务输入；生产执行留待独立授权。
```

## 文件职责

SPEC决定业务语义和不变量；IMPLEMENTATION决定分步文件/接口；ACCEPTANCE决定如何证明没有误合、漏更新或丢审计。与现役代码冲突时先记录具体差异并更新计划，不以“已有一个特例”跳过全局合同，也不任意推翻收录政策。
