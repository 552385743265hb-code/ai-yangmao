# PR 累计审计整改报告

> 本文为部署前审计快照。随后用户已授权并完成兼容发布，当前状态见 [发布凭证](../../dedupe-release-2026-10-10.md)；保留以下当时的提交/验证记录。

R01–R09 及独立复核发现的边界问题已修复并本地提交。最终代码/依赖提交：`f54650cdc7bda70f448d803a0eb63a8ccf3a420a`，分支 `codex/dedupe-p3-c`。本轮没有推送；远端 PR #13 仍是审核基线 `4371ea0b9e160519485943bb9e8a3c3996ff9cb6`，未合并、部署或访问生产。

## 基线与范围

输入为用户的 REPORT.md 和 `ai-yangmao-acceptance-audit-4371ea0.zip`；两个报告内容核对一致。附带最小诊断脚本仅用于理解，没有把其输出当产品验收。本轮使用实际 Worker、单候选 HTTP、管理 GET/POST、CLI、浏览器以及合成 SQLite/本地 workerd D1。

正式第一阶段 PR #6 仍 OPEN，head=`64db363b7dd4fd301d4872101d6ec313a0640d3d`。结束前远端 main 从 `7cea69d…` 前进到 `6a381f40d3a8a89c2ea4487416a41f1cd48e7f47`，新增审核规则和平台文档，迁移仍止于0015。修复树与新 main 的 `git merge-tree --write-tree --name-only HEAD origin/main` 无冲突；未实际合并或执行合并树的运行测试。旧 PR #2/#3/#4、旧压缩包均未作为入口。

原主工作区的 `docs/valuation-judgment-2026-10-10.md` 出现用户未提交修改，完整保留。本次修改只在现有隔离工作树完成。

## 逐项修复及失败到通过

日志根目录：`.superpowers/sdd/acceptance-audit-4371ea0/`。原始 RED/GREEN、每批完整测试/typecheck/build、D1 和复核日志保留本地；可提交的失败摘要及 hash 在 [audit-red-evidence.json](evidence/audit-red-evidence.json)。保护性反例首次即通过时不冒称 RED。

| 项目 | 最终行为与实测边界 | 首个修复提交 / RED 日志 |
|---|---|---|
| R01 | 同观察/摘录/机制的不同资格、独立池和事实更正保留独立候选；不继承另一候选终态。未知结构化事实但原始条件有实质差异也形成可处理歧义；标题翻译/集合顺序不新增。活动主键不使用事实hash。旧v2/NULL范围候选经人工修正后仍能回放原ID。 | `2b10445`；R01-red、review-followup-red、legacy-scope-red |
| R02 | 未形成offer的原拒绝通过有限范围主张对应关系跨来源复用；新轮次/机制/未知资格不盲目压制。管理员same_claim可审计；官方只补足点名缺项可重开并明确建待审活动。same_claim复用自身重开任务时保持可操作。 | `d22623a`；R02-red、R02-indirect-red、review-same-claim-red |
| R03 | 39/40/41/81实体边界、精确别名和41条有效拒绝均实测。自动召回不完整仍保守；人工指定目标/独立活动有受限出口，有效拒绝每40条持久续页并最终重查竞争，不把complete强改true。 | `d5935dd`；R03-red、R03-continuation-red |
| R04 | 分离visibilityVersion与草稿reviewVersion，SQL CAS使用实际updated_at。实际GET→unpublish/withdraw、旧token、合并generation、证据保留、回执重放和CLI显式版本均验证。 | `1ed2af2`；R04-red、R04-cli-red |
| R05 | 下架/撤回原子取消旧任务与租约、阻断提醒，保留草稿和历史；必须显式生成新恢复审核，再批准才恢复公开。新证据更新同一恢复任务；竞争人工草稿另列冲突。无关拒绝不得顺带覆盖。旧unknown提醒即使在预览后出现仍阻断新占位；撤回状态进入最终送达CAS。 | `351ea20`；R05-red、R05-other-refusal-red、review-followup-red |
| R06 | 人工same只确认身份；额度/周期已知变化及新增事实留在同活动提案，公开旧值不提前改。缺失旧版已知条件须补齐后批准；纯欠抽取只附证，独立池不强合。缺少公开字段的候选仍可拒绝结案。 | `9728dbe`；R06-red、reject-empty-red |
| R07 | fetchPage→toOffer→adapter→observation传递实际URL/方法/验证/截断/bodyHash；无可靠抓取元数据默认indirect。Jina、跨域/伪造嵌入、截断及正常官方/第一方嵌入均测试；每次fetch审计不可覆盖。shadow携带已有合法事实，不伪造unknown的证明。 | `7a75409`；R07-red、R07-integrity-red |
| R08 | 人工编辑字段有来源标记，批准保留其合法估值；未人工确认的模型估值仍使用原值。金额、未知价值、申请上限、初次批准、无效不一致估值、恢复提案批准/拒绝及合并来源草稿均验证。 | `d896300`；R08-red、restoration-price-red、restoration-price-reject-red |
| R09 | collect.yml显式注入vars，默认off/assist=false。缺配置、非法值、Worker模式/canary不符和超时均有未评估诊断。实际管线维护入口恢复真实Worker候选；off/dry无写入；assist经过既有预算预留，拒绝预算不调用provider。enforce不重复写shadow候选，任务list/claim/result受Worker canary约束。 | `f197790`；R09-red、R09-canary-red |

完整12条本地代码/依赖提交见 [提交清单](evidence/audit-commits.json)。后续跨项修复提交：`40ca04c`（原始子权益范围/恢复与送达）、`d2dc5d7`（不完整展示候选可拒绝）。R06第一次测试中的周期fixture遗漏schema必填timezone，修正后纳入真实合同测试；该输入错误不冒称业务缺陷。

## 当前完整验证

固定 Node `v24.21.0`，npm锁文件重新 `npm ci`，Wrangler `4.149.0`。真实执行结果：

- `VITEST_MAX_WORKERS=1 npm test`：**56个Vitest文件、678项测试，另11项CLI全部通过**。
- `npm run typecheck`、`npm run build:web`、`git diff --check`：通过。
- 同源码再次以Vitest JSON reporter生成 [45组场景映射](ACCEPTANCE-RESULTS.md) 和 [机器明细](evidence/acceptance.json)，不是扫描源文件标签推断执行成功。
- 新增9个audit测试文件合计108项断言；其他现有前端、抓取运输和CLI文件也增加回归。
- 独立审查发现并推动修复了四项跨流程问题、旧v2升级回放和不完整展示拒绝问题；最终限定复核无剩余Critical/Important。最后一次独立验证3文件36测试；不是全仓库安全审计。

本机并行运行曾在既有 `llm.test.ts` 遇到Node/V8原生SIGSEGV（包含maxWorkers=4时的一次）；日志未删除，不能把该次运行算通过。macOS诊断指向V8 GC栈；串行完整运行通过，没有删测试或放宽断言。此次没有证明已修复运行时崩溃根因，后续CI仍应观察。

## 实际本地 D1 与历史工具

最终依赖提交上的合成运行摘要保存在 [audit-runtime.json](evidence/audit-runtime.json)。所有Wrangler命令显式 `--local`，使用 `tests/fixtures/identity/wrangler.jsonc` 和全新隔离persist目录。

| 演练 | 实际结果 |
|---|---|
| 空库迁移0000–0035、R01–R09关键API链路 | 57次实际Worker请求；最大44条SQL，小于50条保护线；包含分页续跑、fetch运输、关闭/重开/旧卡409、人工估值、raw空展示拒绝及canary队列；全部预期状态通过 |
| 0029旧schema→0035升级 | 原offers/reviews/deliveries/observations/candidates所有既有列逐行相等；旧ID回放、分离新原始资格、FK检查和unknown状态保留通过 |
| 十成员逻辑合并/回滚 | 原offer及payload保留、回执重放、不同request竞争、外来decision原子拒绝、合并草稿承接与回滚、旧alias解析、unknown阻断、后续新证据回滚冲突均通过 |
| 独立历史回填 | 回填重放幂等、原始行不变、FK通过；冲突计划只预览并输出planHash，无自动历史合并 |

最终API链路实测最大wall time约311ms，仅是本地合成数据观察值；D1 first/raw和失败语句不总是暴露行元数据，rows统计是部分值。`elapsedMs`仍为累计数据库调用耗时，不能冒充wall time、CPU或生产负载。真实队龄/规模/账户额度未测。

可重现命令（必须选择**新的**本地目录；示例路径不能覆盖已有演练数据库）：

```sh
export PATH="$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH"
export WRANGLER_SEND_METRICS=false
npm ci
VITEST_MAX_WORKERS=1 npm test
npm run typecheck
npm run build:web
git diff --check
npm audit --json
# 以下为最终实际使用的路径；再次复现须换新的后缀。
npx wrangler d1 migrations apply identity-local-test --local --config tests/fixtures/identity/wrangler.jsonc --persist-to .superpowers/sdd/acceptance-audit-4371ea0/d1-release-f54650c
IDENTITY_AUDIT_PERSIST=.superpowers/sdd/acceptance-audit-4371ea0/d1-release-f54650c npx tsx scripts/identity/verify-audit-local.mjs
IDENTITY_LOCAL_PERSIST=.superpowers/sdd/IMPLEMENTATION/merge-d1-audit-f54650c IDENTITY_SOURCE_SHA=f54650cdc7bda70f448d803a0eb63a8ccf3a420a npx tsx scripts/identity/verify-merge-local.mjs
IDENTITY_LOCAL_PERSIST=.superpowers/sdd/IMPLEMENTATION/history-d1-audit-f54650c IDENTITY_SOURCE_SHA=f54650cdc7bda70f448d803a0eb63a8ccf3a420a npx tsx scripts/identity/verify-history-local.mjs
```

merge/history同样先对各自新persist目录执行上述本地迁移。旧库验证先用仅含0000–0029的隔离迁移目录应用，再运行 `verify-upgrade-local.mjs seed`；切回正式迁移目录应用0030–0035，然后运行 `verify-upgrade-local.mjs verify`。`IDENTITY_UPGRADE_PERSIST`必须以 `.superpowers/sdd/acceptance-audit-4371ea0/d1-upgrade-` 开头。实际命令与配置保存在本地证据目录，工具不读取生产凭据。

## 浏览器与依赖复核

Playwright连接只绑定127.0.0.1的合成Worker预览；浏览器及服务端阻断外部网络。实际完成登录→暂停活动→填写依据→预览→重开待审→预览批准→确认批准，随后公开API及页面只有1条批准记录。重开阶段仍显示“恢复发布待审”；移动端390×844也实际渲染。保留desktop/mobile截图、页面快照和公开回读。唯一浏览器网络错误是被刻意阻断的Google字体请求，没有产品脚本错误。模型/采集/发送器未调用。

依赖审计最初为4个high条目，根因是两个开发依赖漏洞，经主要来源核实：[sharp公告](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)、[source-map-js公告](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)。`f54650c` 将Wrangler升级至4.149.0、其Miniflare/sharp更新至修复链（sharp0.35.5），source-map-js升至1.2.2；相关workerd/types/可选二进制随链更新，去掉冗余esbuild副本。生产依赖版本未变。重新npm ci、全部测试和D1演练通过，**npm audit当前全部级别为0**；不将此结果宣称为整个应用没有未知安全风险。

## 迁移、回滚及未验证门槛

新增迁移0030–0035：候选family/原事实hash、拒绝对应关系、观察scope索引、不可变fetch审计、恢复任务来源桥、原始范围判别。未改写已有0000–0029迁移。执行时再次核对编号；先确保0016及后续兼容schema全部迁移，再部署对应Worker。不能直接降回不含本轮审核与送达保护的旧版本；兼容回滚代码固定为本报告代码SHA，关闭解析/辅助/合并，保留canonical读取及全部新表。详见 [RELEASE.md](RELEASE.md)。

至少60对经人工标注、授权脱敏且冻结hash的语料仍未提供，比较器及观察→候选→拒绝/批准→任务/通知的真实语料回放指标保持 `not_evaluated/null`。未进行生产规模读写行数、CPU/延迟、生产canary、真实模型或送达验证。本地合成通过不替代这些门槛。

本轮已完成代码、补丁、本地工程验证与提交；**没有推送、更新远端PR、合并main、部署、生产迁移/读写、真实采集、发送消息或增加模型预算**。历史apply/rollback只在新建合成库执行，原始记录及人工决定未删除/覆盖，pending/unknown未自动当作可重发。
