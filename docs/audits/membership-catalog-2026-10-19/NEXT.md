# 会员目录继续入口

目标仍在进行中。界面已全量验收；官方目录仍有明确资料缺口，不能把 pending 清零或可选套餐全部测试通过写成“无遗漏”。

## 当前生产状态（2026-10-20）

- D1 / 公开 API：revision **61**，270 产品、1065 套餐，**1044 verified / 21 retired / 0 pending**，125 厂商。全量数据与预备补丁完全一致。
- 本批新增 80 套餐。保留全部旧 ID、原批准资格和根级别迁移映射。正式名称归一后无重复、verified 无未知收费属性、无孤立或缺厂商产品。
- 公开官方范围：102 research_complete、23 partial。research_complete 仅指记录的当前公开范围；具体旧档映射缺口另见 coverage.knownHistoricalGaps / source-closures，不能宣称未公开合同都不存在。
- 运行代码：PR105 + PR114 已合并并部署，当前 Worker **6e7b1cbc-7ce7-47f9-83e1-8a3bc5a62dbe**，tag **77c5818f9545**。本轮未重做已发布修复，未修改源码；只补目录数据与审计。
- 工作区 `/tmp/ym-hf-link-worktree`，分支 `codex/membership-catalog-live-acceptance`。主 checkout 属于其他工作，勿覆盖。node_modules 是临时 symlink，不提交。

## 已完成的真实验收

- `browser-rev60-proof.json`：生产浏览器逐个切换125厂商，对1005个显示控件逐个勾选/取消，覆盖全部964个不同verified套餐；无禁用或控制台错误。
- 同一X Subscription在xAI/ Cursor两个厂商下保持勾选，只保存一份。Copilot Pro + Qoder国际Pro刷新后保留，删除一个不影响另一个。
- 全部测试选择已清除，九项其他个人偏好与测试前完全一致。
- `browser-rev61-proof.json`：生产更新后重新遍历125厂商，逐厂商实际显示ID集合与公开API完全一致；80个新增套餐逐个勾选/取消通过。基线+增量覆盖全部1044个可选套餐，控制台零错误。
- 真实9条已批准结构化资格 × 965种持有情况 = **8685次匹配**，rev60→61结果零变化。旧需求仅缺映射不重审福利。
- 当前数据批针对性回归：2文件24测试通过。已发布代码上次完整验证：140文件1522 Vitest + 11 CLI，类型检查/构建通过，PR114 Node24 CI通过。本机Node26，勿声称本机Node24通过。
- `minimax-fresh-rebuild-2026-10-20.json`：真实MiniMax原请求重建，只输入原始请求与现行目录，不传保存/批准答案；模型补齐六档资格，分类free、模态text、对象all、截止日/时区正确。40588 tokens，¥0，业务写入0；原任务/已上架条目前后哈希不变。

## 本批官方研究

- `source-closures-2026-10-20.json` 收录九组来源结果与父任务修正；`official-findings.json` 是可应用事实；`coverage.json` 是厂商范围和实际缺口。
- 新增含Google安全软件、Meta Muse/Meta One/Code、政府M365、火山软件套件、腾讯ADP、Aidge、IMS、百度客服/创作/旧Coding/DuMate、Kiro GovCloud、国际WPS、Frontline、Adobe及Tripo Starter等；豆包工作个人三档复用同一订阅ID。
- IMS三档和功能体验月包有独立软件功能授权及有效期，节省计划只承载账单。依赖基准订阅、仅补充容量的加油包排除。体验月包20元，每账号每月一次，按调用耗尽/期满停服，不能写无限量。
- 未应用：Higgsfield Max仅旧活动/搜索索引，缺当前购买/续费证据；Luma旧Dream Machine与Agents有官方冲突；PixVerse API旧页面已404；Lark AI Meeting Notes按份购买不作为周期订阅；LibTV与LiblibAI同SKU尚不足以自动判共享许可。

## 必须继续的缺口

1. 优先用真实浏览器补公开动态页面：Seko团队、国内Vidu、魔粒/Civision、海螺国内、秒哒个人、Higgsfield当前购买卡、可灵国内API。HTTP空壳不等于无会员。
2. 实际登录/准入障碍：ChatGLM / AutoGLM、Qwen聊天、Reflection、Instinct、Odyssey、Mercury Chat、Browser Use旧订阅、Liblib团队。只能使用已有可用会话；不注册/购买，不猜Free/Pro。
3. 具体旧档映射：Adobe教育Single App及旧AI Assistant/Standard Enterprise/Stock、Leonardo旧Apprentice/Artisan/Maestro、Tripo Advanced/Pro命名、PixVerse API、PPIO旧DeepSeek等。保留已批准资格，不凭同名/金额猜等价。
4. 当前102家公开范围完成中仍有少量已具名历史gap（Google/VirusTotal/Looker、Microsoft PVA、Cursor旧请求合同）。有确定事实再补，不以私人合同无穷假设扩大范围。
5. 32条已批准旧会员needs_review只影响自动个人匹配，不是待重新审批的福利。需要确定等价原文才能做受控版本迁移；不能为清零而改批准历史。
6. 本轮数据/审计提交尚需推送、PR及合并读回。运行代码已经部署，不需要重复应用已发布修复。

## 私有快照与安全运维

- 最新D1完整原件 `/tmp/ym-membership-wave31-bound-after.json`；公开API `/tmp/ym-membership-api-rev61.json`；预备文件 `/tmp/ym-membership-wave31.json`。原件与内部业务快照不提交。
- 生产目录超过D1单条SQL100KB，不要内联JSON到Wrangler SQL。准备：`node scripts/prepare-membership-catalog.mjs <当前完整快照> <official-findings.json> <预备文件> <coverage.json>`。
- 写入：`node /tmp/ym-membership-apply-bound.mjs <预备文件> <私有凭证前缀>`。固定catalog id1，CAS检查revision，绑定参数写入并逐项读回；未知结果先读revision，不能盲目重放。OAuth过期时用正常只读Wrangler刷新，不输出凭据。
- wave1–31是对应批次快照；不能用旧波次推断今天线上。当前公开目录读取保留根级别别名、replacement及vendors元数据。
- 浏览器：CUA IAB tab10，句柄 `membershipLiveTab`，已标记handoff；后续回合按要求恢复文档。截图 `/tmp/ym-membership-rev61-live.png`；无测试选择残留。
