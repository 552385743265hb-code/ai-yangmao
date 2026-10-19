# 未完成事项与继续入口

本次目标仍在进行中，不能因为测试通过或两批数据写入就宣布全量完成。

## 当前状态

- 生产会员目录 revision 32：44 产品、159 套餐、103 个 verified 套餐；仍有 56 个 pending 套餐需要逐一替换/核实。
- 第一批 11 厂商更新 46 套餐；补千问办公企业两档到 rev31；第二批 Bolt、Suno、Lovable、World Labs Marble、Nous Portal 更新 20 套餐到 rev32。套餐 ID 保留，新增项使用确定 ID；生产 trigger 自动保存修改前后台账。
- 本地新版界面为厂商下拉＋套餐复选，去掉组合/排除/范围控件，支持已有选择与别名保留、去重；未部署。生产代码仍是 PR104 / 2f0f117。
- `coverage.json` 是 124 个厂商的完整清单；`research_complete` 只是该厂商已检索完的结论，不代表整个目标完成。`official-findings.json` 的 `partial` 不能直接批量批准。
- 只读抓取证据在 `/tmp/ym-membership-research/`：`vendors`（124 首页）、`pricing`（55 个页面内发现的定价页）、`search`（39 次官方搜索）、`discovered`（61 个搜索发现的页面）；原文请按具体厂商定向读取，避免重抓全部。
- 当前完整生产目录：`/tmp/ym-membership-wave2-live.json`。最早备份 `/tmp/ym-membership-catalog-before.json`（rev29）、会员权益 `/tmp/ym-membership-offers-before.json`、平台事实 `/tmp/ym-membership-profiles-before.json`。

## 下一步

1. 继续所有 partial/unreviewed 厂商。优先处理旧目录 pending 产品、动态报价页面、国内/国际版及企业页签。Exa 免费 MCP 部分请求限流，错误已保存在 search 文件，不能当无结果；可用官网直读、Jina 或 web 官方来源回退，不新购服务。
2. 官方发现特别注意：Cursor/Grok/X 新订阅合一且旧 Cursor 档位继续存在；OpenAI Codex/Work 使用 ChatGPT 会员，Pro 已有 $100/$200/$500，Business Premium 需单独核对；Google AI Ultra 分 5x/20x；Step Plan 与阶跃 AI/StepClaw 两个独立产品；Luma 老 FAQ 的 Plus/Pro 价格与当前页相反；MiniMax 国内/国际以及海螺不能混用。
3. 尚未使用的现成官方页：Step Plan /step-plan（Mini/Plus/Pro/Max）、阶跃 AI membership-benefits-explanation（入门/高级/进阶/专业及周卡）、MiMo 个人版 Lite/Standard/Pro/Max 及团队版链接、Poe 五种积分额度档、七牛 Enterprise S/M/B（不能用旧按价名称臆测）、扣子最新订阅文档与团队/企业资料。
4. `scripts/prepare-membership-catalog.mjs` 只生成预备补丁，不写生产。仅 `status=verified && applyReady` 条目会采用；未知旧套餐会报错，必须明确处理，不静默丢弃。需为中文新套餐填 newPlanIds，改名复用 existingPlanIds。生产用 expectedRevision CAS 单条更新，逐项读回。脚本尚需补自动回归与完整去重/覆盖验收。
5. 处理旧模糊/重复目录项的明确迁移：现有权益的实际资格保持、已批准状态保持；旧访客选择可确定映射时保留，歧义不猜。当前只做名称别名和已核实数据，尚未全量处理历史占位项。
6. 目录完成后填全 vendors 元数据和 products.platformIds（可多厂商共用同一个产品 ID），完整目录逐厂商/逐套餐测试。对无订阅厂商显示官方核对结论，不造套餐。
7. 实际浏览器测「我的条件」选择、取消、切换厂商、刷新后持久化和控制台错误；管理员普通编辑/快速上架同样多选；模型字段校验也读统一目录。
8. 整体代码 PR 完成后合并上线，核对远端 SHA、Worker 100% 部署标记、生产静态资源与完整运行行为。直到所有目标验收通过再 complete goal。

## 工作区

主 checkout 存在其他任务的估值修复，不能覆盖。当前工作区 `/tmp/ym-hf-link-worktree`，分支 `codex/membership-catalog-complete`。node_modules 是指向主 checkout 的临时 symlink，不提交。
