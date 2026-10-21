# Windows 开发兼容与公开 Agent 接入（本地）

2026-10-20，在 `huaxiaoyu/dev` 上基于同事主线 `df32f52` 实施。此次只恢复两项已确认的 Windows 适配，并优化公开 Agent 接入；未恢复此前的其他业务修改。

## 实现

- `pipeline/llm.ts` 同时解析 LF / CRLF，避免 Windows 检出后的旧平台要点漏读。现行 D1 平台画像及其优先级不变。
- `tests/screening-seed-profiles.test.ts` 使用当前 Node 的 `--import tsx` 入口，不依赖 Windows 无法直接启动的 `npx` 命令。
- Agent 接入页按设备识别 Windows，并提供手动系统切换；Skill 可选择 Codex 通用目录或 Claude Code 目录。命令复制读取当前选择的实际内容。
- 新增 [PowerShell 安装器](../integrations/agent/install.ps1)，与 Bash 安装器使用同一份 Skill、元数据、许可证和 SHA-256 清单。安装前校验、更新前备份，拒绝覆盖其他技能和符号链接 / junction，已有安装锁不抢占。
- MCP 分别展示 Codex CLI / TOML、Claude Code CLI、Cursor JSON 和其他远程客户端的地址填写方式。连接使用已有匿名只读 Streamable HTTP 服务，没有新增本地 MCP 服务或改变查询合同。
- 公开 Skill 增加 PowerShell 原生 GET、UTF-8 JSON POST 示例；中英文 README 同步安装入口。Skill 名称、触发描述与 frontmatter 保持原样。

## 验证

| 层次 | 结果 |
|---|---|
| 类型与构建 | `npm.cmd run typecheck`、`npm.cmd run build:web` 通过 |
| 全量测试 | 143 个测试文件、1534 项 Vitest 测试通过；11 项审核 CLI 测试通过 |
| 回归范围 | Windows / Unix 换行、Node 脚本入口、系统切换、Skill 目录、各 MCP 配置、动态命令复制及复制失败反馈 |
| Windows 安装 | PowerShell 5.1 和 PowerShell 7 实际运行；中文、空格、方括号路径通过；校验失败、重复 / 越界清单、异名技能、junction、并发和旧锁保护通过 |
| 发布资产 | 本地 Worker 返回 `install.ps1` HTTP 200，下载字节与源码 SHA-256 相同；从本地 Worker 安装包成功，安装后 Skill 与源码一致，测试安装已清理 |
| 浏览器 | Chrome 真实页面切换与复制；Cursor JSON 实际粘贴结果与页面的 97 字符配置一致；390px 视口检查无页面或代码块横向溢出 |
| 本地 MCP | SDK 连接实际本地 Worker，四个只读工具可用；查询命中 242 条本地公开活动，HTTP 与 MCP 一致，8 个并发查询通过，无内部字段泄露 |

本地日报当前返回 `available=false`，符合未导入日报的本地环境状态；没有伪造当天内容。没有修改用户的 Codex、Claude Code、Cursor 配置，也没有向用户真实技能目录安装。真实客户端的注册与跨系统安装仍由使用者按页面说明完成。

测试使用 `node node_modules/vitest/vitest.mjs run tests src --maxWorkers=2 --testTimeout=15000 --reporter=dot` 及仓库审核 CLI 测试；构建与 Shell 安装器测试仅在当前进程临时加入 Git for Windows 的 `bin`，未修改全局环境。

系统 Skill 验证脚本因当前 Python 缺少 PyYAML 未执行完成；另行确认 frontmatter 与主线逐字一致，并通过实际打包、清单校验及 Windows / Bash 安装测试验证产物，没有据此声称系统验证脚本通过。

本机证据在被 Git 忽略的 `.wrangler/agent-windows-2026-10-20/`：`vitest.log`、`installer-worker-check.json`、`agent-desktop.png`、`agent-mobile.png`、`agent-preview.png`、`agent-windows.png`。这些证据不随代码提交传播。

## 官方配置依据

- [OpenAI：Codex MCP](https://developers.openai.com/codex/mcp)
- [OpenAI：Skill 目录](https://developers.openai.com/codex/skills)
- [Claude Code：MCP 与用户级配置](https://code.claude.com/docs/en/mcp)
- [Cursor：远程 MCP 与 mcp.json](https://cursor.com/docs/mcp)

## 交付状态

本地修改和验证完成，尚未提交、推送、部署或操作生产数据库。官网现有页面和安装资产尚未更新；新的 `/ai-yangmao-public/install.ps1` 需随前端构建产物发布后才可通过官网安装。
