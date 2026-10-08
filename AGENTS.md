# 项目协作规则

- 项目：AI 羊毛牧场，Cloudflare Worker / D1，TypeScript + Hono + Drizzle；Node.js 24。
- 入口：[README.md](README.md)；字段与收录口径以 [数据合同](docs/data-contract.md) 和 [通用规则](pipeline/learned-rules.md) 为准。
- 平台事实维护到 [平台要点](pipeline/platform-notes.md)，保留核验日期；历史报告不能覆盖现行规则。
- 审核使用仓库 [.claude/skills/yangmao-review](.claude/skills/yangmao-review/SKILL.md)，不要以外部旧副本替代。
- 官方发放方证据优先，媒体只提供线索；不收账号池、不透明中转站、付费套餐自带权益。
- 用户要求预审或补字段时保持待审；审核建议不是通过。平台准入不是条目批准。
- 修改前逐项检查字段；`tested` 只能由管理员亲测确认。原文摘录保留原语言。
- 不输出或提交 `.prod.secrets`、`.dev.vars`、令牌和客户数据；不要把真实密钥复制进文档。
- 生产写入、消息发送、推送和部署按本次任务授权执行；本地命令持有管理员令牌不扩大授权。
- 目录：`src/worker` 后端，`src/shared` 合同/检查，`pipeline` 采集，`web` 前端，`migrations` 数据库迁移。
- 开发 `npm run dev`；验证 `npm run typecheck`、`npm test`，前端改动加 `npm run build:web`。
- 检索优先用 `rg`；具体运维命令见 [operations.md](docs/operations.md)。
- 收尾区分本地提交、远端推送、部署和线上核验；不要从测试通过推断已上线。
- 最新抽取规则发布见 [经验发布凭证](docs/extraction-lessons-release-2026-10-08.md)，全链路实现见 [工作流审查](docs/workflow-audit-2026-10-08.md)；发布前实时核对，勿重复使用快照数量。
- 本项目 Codex/Grok 的 yangmao-review 链接统一指向仓库副本；外部全局技能库不自动同步。
