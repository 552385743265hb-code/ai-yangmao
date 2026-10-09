# 文档索引

当前文档校对：2026-10-09。按下面的职责找现役答案；带日期的记录仅证明当次操作与快照，不能据此批准活动或推断当前数量。

## 现役文档

| 要解决的问题 | 权威入口 |
|---|---|
| 字段含义、展示影响、审核与提案边界 | [数据合同](data-contract.md) |
| 收不收、如何分类、如何估值 | [通用规则](../pipeline/learned-rules.md)；由实际抽取请求加载 |
| 某个平台的官方渠道、资格、特殊口径 | [平台要点](../pipeline/platform-notes.md)；保留核验日期，变化后重新核实 |
| 系统组件、状态和整体数据流 | [架构](design.md) |
| 社区稿如何自动寻找官方出处 | [自动官方复核](official-review-workflow.md) |
| 命令、调度、故障、发布与回滚 | [运维说明](operations.md) |
| 逐条审核的操作流程 | [仓库审核技能](../.claude/skills/yangmao-review/SKILL.md) |
| Hermes 的查询和管理操作 | [Hermes 接入模板](../integrations/hermes/ai-yangmao/SKILL.md)；安装副本需单独核对 |
| 最近一次知识与运行态核对 | [2026-10-09 整理凭证](closeout-2026-10-09.md) |

## 发布、事故与工作流查证

以下保留为有明确用途的历史凭证。实现机制在上表维护，旧版本号、测试数和状态不作为现役答案。

- [2026-10-07 整理凭证](closeout-2026-10-07.md)：早期本地、远端及生产差异。
- [2026-10-07 采集故障](incident-2026-10-07-collect.md)：D1绑定参数限制、迁移台账与采集失败。
- [抽取经验发布](extraction-lessons-release-2026-10-08.md)：规则加载和真实模型回归凭证。
- [第一轮工作流审查](workflow-audit-2026-10-08.md)：来源、通知、审核与输入性能修复。
- [第二轮恢复能力复查](workflow-resilience-2026-10-08.md)：活动错配、重试、人工竞争及数据恢复；真实回归分批验证记录。
- [已审核字段漂移修复](review-drift-fix-2026-10-09.md)：同源条款变更门槛、拒绝记忆、候选校验及16条噪声清理。
- [新建入口去重修复](new-offer-dedupe-fix-2026-10-09.md)：跨ID、来源、平台误归及四个真实案例重放；与字段漂移是不同入口。
- [WorkBuddy邀请审核](workbuddy-invite-review-2026-10-09.md)：邀请门槛、人工提案及最新审核元数据读取。
- [Higgsfield试用停止领取](higgsfield-ai-influencer-end-2026-10-09.md)：管理员实测结束与未知实际截止日期。

## 条目审核与厂商接入记录

这些文件是核验与操作记录，不能覆盖通用规则、平台要点或后台当前状态。

| 记录 | 查证用途 |
|---|---|
| [OiiOii 接入](oiioii-onboarding-2026-10-09.md) | 官方账号、语言入口、五个信源、三条待审和送达凭证 |
| [公开文案与内部审核分离](public-copy-cleanup-2026-10-09.md) | 公开字段边界、历史核验记录迁移与权限验证 |
| [Qoder 自营产品归属](qoder-owned-product-review-2026-10-09.md) | 公司、旗下产品与第三方领取渠道的区别 |
| [StepFun 发放归属](stepfun-provider-audit-2026-10-09.md) | 实际领取渠道与厂商转述的区别 |
| [Firefly 去重](firefly-dedupe-review-2026-10-09.md) | 既有条目、提案及重复处理 |
| [Codex 重置时间](codex-reset-time-audit-2026-10-08.md) | 独立发放与传播回复、事件日与公告时间 |
| [社区条目官方复核](community-official-review-2026-10-08.md) | 当次逐条核验与未解决证据缺口 |
| [Comprehend / Claude Startups](review-comprehend-claude-startups-2026-10-08.md) | 账单模式、资助与日期精度 |
| [Vidu 核验](evidence/vidu-2026-10-08/verification.md) | 管理员亲测与官网文字的边界 |
| [收录范围预审](pending-scope-review-2026-10-07.md) | 当次待审与建议，建议不等于批准 |
| [字段预审](pending-field-review-2026-10-01.md) | 早期字段补全情况 |
| [覆盖审计](coverage-audit-2026-10-01.md) | 早期信源覆盖与人工巡检缺口 |
| [社区入库](community-intake-2026-10-01.md) | 早期社区采集实现与快照 |

## 更新约定

现役机制就地更新，不追加一份平行说明。字段改变同步数据合同，调度/接口改变同步运维及架构；平台事实写平台要点，具体审核过程留在带日期记录。发布和生产读回分别留证；日期、审核状态、源启停和数量变动时重新读取，不能改写历史记录冒充新验证。
