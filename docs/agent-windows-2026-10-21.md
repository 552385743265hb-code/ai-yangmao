# Windows 与 Agent 接入复查（本地）

2026-10-21，在 `huaxiaoyu/dev`、同事主线 `df32f52` 上复查当前未提交实现。两项基础兼容修复和接入页实现见 [2026-10-20 记录](agent-windows-2026-10-20.md)。

## 本轮发现与修复

| 问题 | 影响与处理 |
|---|---|
| Windows 下载安装命令在请求失败后继续执行 | 原命令复用固定临时文件，HTTP 503 后仍可能运行旧文件。改为局部停止错误、独立随机文件、下载成功后才执行，传播安装器失败并清理临时文件；同时通过 .NET 写入响应原始字节，兼容中文、空格、方括号临时目录。中英文 README 与页面保持一致。 |
| 安装器可能误认其他 Skill | 其他 Skill 正文中出现 `name: ai-yangmao-public` 示例时，原检查会误认为自己的旧版。现仅检查开头 YAML 元数据内唯一且大小写一致的名称；同时检查旧目录和下载包。 |
| 连续复制的按钮反馈与并发 | 原标签可能被“已复制”覆盖而无法恢复，等待剪贴板时也可重复提交。改为保留初始标签、等待期间禁用、重置反馈计时；离开或切换内容后不显示过期反馈。 |
| 自动刷新清空选择 | 通用五分钟刷新会重绘接入页，导致系统、客户端与展开状态回到默认。接入说明不依赖活动数据，现保留该页操作状态。 |

另修正一处原有前端测试的时间依赖：UTC 截止时间与本地相对天数混用，凌晨运行时断言失败。该测试现固定时钟，并让来源时区与相对日期一致；活动截止与批准规则的实现未修改。

## 验证结果

- `npm.cmd run typecheck`、`npm.cmd run build:web`、`git diff --check` 通过。
- 最终全量 Vitest：144 个文件、1539 项测试通过；另有 11 项审核 CLI 测试通过。最终日志为 `.wrangler/agent-windows-2026-10-21/vitest-complete.log`。
- 真实 Windows PowerShell 5.1.26100.9711 与 PowerShell 7.6.5 执行安装相关测试；覆盖 HTTP 失败、安装器非零退出、临时文件清理、错误 / 不完整清单、校验不符、身份不符、并发、旧锁、junction 和旧版保留。
- 本地 Worker 的 `install.ps1` 返回 200，下载字节与源码一致；从页面生成的命令安装到独立临时目录成功，安装后 Skill 与源码一致。临时安装和引导文件已清理。
- 两种 PowerShell 对本地 Worker 发送 UTF-8 中文条件查询均成功。MCP SDK 实测四个只读工具可用、命中 242 条本地活动、8 个并发查询通过，没有内部字段泄露。本地日报仍为 `available=false`，未生成或导入日报。
- Chrome 实际操作确认系统、Skill / MCP 客户端选择和复制反馈；桌面与 390px 视口没有页面或代码块横向溢出，控制台没有警告或错误。临时视口设置已还原。

本机证据保存在被 Git 忽略的 `.wrangler/agent-windows-2026-10-21/`：`worker-check.json`、最终测试日志、`agent-desktop.png` 与 `agent-mobile.png`。自动刷新保留选择由直接调用真实页面刷新函数的回归测试验证；未以等待五分钟作为浏览器验收依据。

## Windows 真实客户端验收（后续）

同日按用户要求继续做客户端验收。使用本机已安装的可执行程序、现有登录和模型配置；Skill 装入独立测试项目，MCP 注册命令写入隔离的客户端配置目录。新 Windows 安装器及包从本地 Worker 下载；未向日常用户技能目录安装。

| 客户端 | Skill 安装与加载 | 不配 MCP 的实际查询 | MCP 实际查询 |
|---|---|---|---|
| Codex `0.163.0-alpha.10.2` | 原生安装成功，客户端自动发现且启用，中文元数据正常 | 模型读取已安装 Skill，通过 PowerShell 依次读取能力说明、搜索和详情，全部成功 | 隔离配置注册成功；本机客户端内核对本地及官网各调用四个工具成功，CLI 模型也完成本地搜索与详情调用 |
| Claude Code `2.1.233` | 原生安装成功，真实会话的技能列表包含 `ai-yangmao-public` | 模型通过原生 `PowerShell` 工具依次读取能力说明、搜索和详情，全部成功 | 用户级注册命令在隔离目录成功，官网及本地均显示 Connected；模型实际完成本地搜索与详情调用 |
| Cursor `3.17.8` | 本次未验收 | 本次未验收 | 已确认编辑器版本；未发现可用 Agent CLI，当前工具无法操作 Windows 桌面界面，未完成 GUI 内加载与调用 |

四次模型实际使用验收均查询同一条权益 `moark-gitee-ai-daily-free-tier`。每次记录真实工具调用、执行结果和最终回答；没有用模拟结果代替客户端调用。Codex 使用临时不持久化会话及只读沙箱；Claude Code 使用不持久化会话，只开放当次所需工具。Claude Code 沿用本机现有 `deepseek-v4-pro` 模型配置，未切换模型或登录方式。

Claude Code HTTP 验收最初的工具白名单误选了 `Bash`，该原生 Windows 会话仅暴露 `Read`，模型如实报告无法查询；按[官方工具文档](https://code.claude.com/docs/en/tools-reference#powershell-tool)改为 `PowerShell` 后实际查询通过。这是验收启动参数的修正，未改动客户端全局设置或项目 Skill。

本地安装后的六个文件（两客户端各三份负载文件）均与当前源码逐字节一致。Codex 原生客户端对官网四个工具的实际调用全部成功，官网日报 `available=true`；本地日报仍为 `available=false`，没有生成日报。

官网 `https://ai-yangmao.com/ai-yangmao-public/install.ps1` 实测 HTTP 200、`Content-Type: text/html`，内容不是 PowerShell 脚本。因此新的一键安装入口仍需随本次构建产物发布后再验证；本轮通过的是本地当前安装包和现有官网 MCP。

本机证据在 `.wrangler/windows-client-acceptance-2026-10-21/`：`acceptance.json`、`codex-runtime.json`、`codex-model.json`、`codex-http-model.json`、`claude-model.json`、`claude-http-model.json` 和 `installed-files.json`。保留验收脚本与结果，临时安装、客户端配置目录和协议生成文件已清理。

客户端接口依据：[OpenAI 官方 App Server 文档](https://learn.chatgpt.com/docs/app-server)、[Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)、[Claude Code Skills](https://code.claude.com/docs/en/skills)、[Claude Code MCP](https://code.claude.com/docs/en/mcp)。Codex RPC 请求字段同时以本机可执行程序生成的协议 schema 核对。

## 交付边界

代码及验收记录仅保存在个人分支 `huaxiaoyu/dev` 本地；用户已授权本地提交，未推送、部署或修改生产数据库。测试 MCP 注册仅写入隔离目录；日常 Codex、Claude Code 的全局配置中均未新增 `ai-yangmao`，Cursor 配置未修改。Codex / Cursor 桌面 GUI 内的操作及官网新 Windows 安装资产发布后验收尚未完成。
