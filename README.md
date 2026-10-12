# AI 羊毛牧场

[ai-yangmao.com](https://ai-yangmao.com) 收录可核实的 AI 免费额度、额外加赠和特殊优惠。采集线索进入审核流程，平台白名单与条目审批分别管理。

## 文档入口

[完整文档索引](docs/README.md)区分现役说明、发布事故凭证和条目核验记录。当前入口：

| 文档 | 用途 |
|---|---|
| [数据合同](docs/data-contract.md) | 字段、展示影响、审核与提案边界 |
| [通用规则](pipeline/learned-rules.md) / [平台要点](pipeline/platform-notes.md) | 收录口径及带日期的平台事实 |
| [架构](docs/design.md) / [自动官方复核](docs/official-review-workflow.md) | 整体数据流及社区稿自动补证 |
| [去重第二、三阶段](docs/specs/dedupe-identity-2026-10-10/README.md) | 正式合同、独立 PR、本地验收与尚未通过的现场门槛 |
| [运维](docs/operations.md) | 命令、调度、通知、预算、发布与回滚 |
| [仓库审核技能](.claude/skills/yangmao-review/SKILL.md) / [Hermes接入](integrations/hermes/ai-yangmao/SKILL.md) | 实际操作与权限 |
| [2026-10-12整理凭证](docs/closeout-2026-10-12.md) | 本次代码、远端、运行态及未闭合项 |

历史报告的数量、审核状态、版本和活动事实只代表当次快照，使用前重新核对。

## 本地开发

Node.js 24，TypeScript、Cloudflare Workers / D1、Hono、Drizzle、静态前端。先 `npm ci`，再运行：

```bash
npm run dev
npm run typecheck
npm test
```

前端源在 `web/`，构建产物在 `public/`；Worker 在 `src/worker/`，共享字段和检查在 `src/shared/`，采集在 `pipeline/`，迁移在 `migrations/`。

公开 Agent 接入（Skill、只读 MCP、最新日报与条件筛选）见[规格](docs/specs/public-agent-access.md)和[运维说明](docs/operations.md)；技能源在 `integrations/agent/`，独立于本机 Hermes 管理工具。

已批准条目按审核过的截止日期自动进入历史；旧证据页文字变化不要求重新批准。详情页的“牧场心得”允许匿名访客和管理员在同一列表分享体验，留言不构成官方证据，规则见[数据合同](docs/data-contract.md)。

发布按[运维说明](docs/operations.md)执行。代码推送、Worker部署、D1数据写入与消息送达分别核验；文档整理不能代替这些动作。
