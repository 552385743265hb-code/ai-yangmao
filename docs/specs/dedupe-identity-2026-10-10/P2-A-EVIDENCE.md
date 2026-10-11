# P2-A 开发与验证记录

2026-10-10，独立分支 `codex/dedupe-p2-a`，依赖 PR #6 的 `64db363b7dd4fd301d4872101d6ec313a0640d3d`。执行时 `origin/main=7cea69d95d2c27e2c1ebd7641a94bab2a696901d`；PR #6 尚未合并，原工作区干净且未改动。没有使用其他 PR 或压缩包。

## 范围与提交

- `a3c7641`：任务 1，三态事实、精确十进制/集合/URL 规范与 hash；身份基础表、部分唯一索引、外键、JSON/state CHECK、追加式决定。
- `6189021`：任务 2，观察/候选 shadow 存储、逐候选回执、请求 payload 冲突保护、原文引用检查、来源信任验证、lead 多对多关联，以及只加诊断的 pipeline 适配。
- 新迁移 `0017_identity_foundation.sql`；第一阶段 `0016_rejection_decision_key.sql` 原样保留。未来发布先执行迁移，再部署消费新表的 Worker。

这是 P2-A 增量证据，不代表第二阶段验收完成。完整身份判定、业务拒绝继承、审核事务和通知/前端仍属于 P2-B/C/D；历史回填与合并尚未开始。

## 实际命令与结果

所有命令使用 Node `v24.21.0`，验证日志放在本工作区忽略目录 `.superpowers/sdd/IMPLEMENTATION/`，不提交数据库。

| 命令/证据 | 实际结果 |
|---|---|
| `npm ci` | 成功；依赖警告见本地日志，未自动升级依赖 |
| 基线 `npm run typecheck && npm test && npm run build:web` | 通过；343 Vitest、8 CLI；由本次运行确认 |
| 任务 1 RED | 5 个规范行为断言失败、3 个迁移断言失败；2 个保留语义控制测试原本通过 |
| 任务 1 GREEN | 新测试 10/10；全套 353 Vitest + 8 CLI；typecheck 通过 |
| 任务 2 RED | 9 个存储、2 个路由、2 个 shadow 适配测试失败 |
| 任务 2 GREEN | 全套 366 Vitest + 8 CLI；typecheck 通过 |
| `git diff --check` | 通过 |
| 下列 Wrangler 本地迁移 | 0000–0017 全部成功 |
| 下列本地运行时脚本 | 观察重放、RETURNING、中途 CHECK 失败整批回滚、外键检查通过 |

```sh
WRANGLER_SEND_METRICS=false npx wrangler d1 migrations apply identity-local-test --local \
  --config tests/fixtures/identity/wrangler.jsonc \
  --persist-to .superpowers/sdd/IMPLEMENTATION/d1
WRANGLER_SEND_METRICS=false npx tsx scripts/identity/verify-local.mjs
```

运行时首次失败原因：Wrangler CLI 在 persist-to 下追加 `v3`，getPlatformProxy 的自定义 path 不追加。检查安装版源码和两个本地 SQLite 路径后，将脚本显式对齐到 `d1/v3`，上述检查通过。未绕过运行时检查，也未读取生产库。

## 验收对应与保留边界

- A01/A02/A08：金额、NFKC、集合、证据与 hash 分离；周期、单位、unknown、模型版本保留区别。
- A03–A05：多次抓取、独立子项、随机展示 ID/翻译和抽取版本的存储幂等。
- A06：局部写失败保留已有回执，重放补未落库候选；完整业务终态需 P2-C 再验。
- A07、A09–A45：未声明整组通过。局部 A19/A20/A21/A23/A24/A27/A30/A45 保护测试不能替代完整场景。
- 原 pipeline 未携带可证明的最终 redirect URL，shadow 捕获一律按 indirect 存储；不能把原 source tier 升级成可信直抓。
- 旧展示字段不能当 canonical facts，shadow 适配保存原候选但事实先为 unknown，留给后续统一解析器。
- source/candidate 增加不写 legacy 审核状态、offer、review task 或通知；没有自动批准。
- 60 对人工标注的真实脱敏语料尚未提供，当前合成测试不证明现场 precision/recall。

## 授权状态

只开发、测试和本地合成数据验证。未合并 main、未部署、未读写生产数据库、未执行生产迁移/历史合并、未采集真实来源、未调用真实模型或发送消息、未增加预算。新路由默认 shadow，模型辅助与历史 apply 尚未开放。

## 独立审查与修复

独立审查针对 `64db363..6189021`，发现 3 项重要问题，无严重项。已分别先运行失败测试再修复：

1. 共用一句原文的独立奖励：加入受控 mechanismHint 分区，hint 不当作 canonical 事实；仍不能区分的同跨度输入返回 `ambiguous_subitems`，完整原输入保存在抽取记录中，不静默丢第二条。
2. 非法金额使整批中断：入口 schema 对规范后的十进制、币种与重复池先验证，返回 400，写入任何 batch 标记之前失败。
3. 空抽取无法恢复：新增 `0018_identity_extraction_retries.sql`，持久保存 observation、leadIds、抽取版本、原输入和重试时间；候选存储失败不会变成无关联的成功记录。

修复新增 5 个失败→通过测试。最终全套、构建和 D1 结果以 PR 描述中的最终运行及本地 `p2a-final-*.log` 为准。审查后的修复由回归测试验证，未宣称已做第二轮独立审查。

本次 `npm ci` 报告 4 个 high severity 依赖漏洞；未在本增量中升级或修改 lockfile。后续发布仍需独立处理依赖风险。
