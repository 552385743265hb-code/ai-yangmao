# AI 羊毛牧场

[ai-yangmao.com](https://ai-yangmao.com) 收录可核实的 AI 免费额度、额外加赠和特殊优惠。采集线索进入审核流程，平台白名单与条目审批分别管理。

## 文档入口

| 文档 | 用途 |
|---|---|
| [数据合同](docs/data-contract.md) | 字段、展示影响、复核触发条件和现行收录口径 |
| [通用规则](pipeline/learned-rules.md) | 管理员纠正后的抽取与审核规则 |
| [平台要点](pipeline/platform-notes.md) | 官方渠道、额度换算、拆条和平台限制；数值带核验日期 |
| [架构](docs/design.md) | 数据流、系统设计；历史决策已标注 |
| [运维说明](docs/operations.md) | 命令、角色、定时采集、通知、发布与回滚 |
| [2026-10-07 整理凭证](docs/closeout-2026-10-07.md) | 本地、远端、生产差异与本次覆盖范围 |
| [仓库审核 skill](.claude/skills/yangmao-review/SKILL.md) | 单条和批量预审流程 |
| [Hermes 接入](integrations/hermes/ai-yangmao/SKILL.md) | 查询和管理命令；发消息需要明确授权 |

[覆盖审计](docs/coverage-audit-2026-10-01.md)、[字段审核](docs/pending-field-review-2026-10-01.md)、[社区入库](docs/community-intake-2026-10-01.md) 是 2026-10-01 历史快照，不能用它们推断当前数量、审批状态或活动有效性。

## 本地开发

Node.js 24，TypeScript、Cloudflare Workers / D1、Hono、Drizzle、静态前端。先 `npm ci`，再运行：

```bash
npm run dev
npm run typecheck
npm test
```

前端源在 `web/`，构建产物在 `public/`；Worker 在 `src/worker/`，共享字段和检查在 `src/shared/`，采集在 `pipeline/`，迁移在 `migrations/`。

发布按运维说明执行。文档描述本地源码能力；生产是否包含这些能力必须核对部署版本。2026-10-07 整理时发现的 40 个功能/规则提交及后续文档修正已纳入本次远端同步范围；Git 推送不等于 Worker 部署。后续采集修复已部署并带 Git tag，对应版本与验证记录见 [采集失败修复记录](docs/incident-2026-10-07-collect.md)。
