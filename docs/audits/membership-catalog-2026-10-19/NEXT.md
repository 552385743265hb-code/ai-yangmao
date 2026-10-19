# 未完成事项与继续入口

目标仍在进行中。旧 pending 清零、单元测试通过或本轮数据写入都不足以宣布全量完成；必须继续 124 个厂商覆盖、旧资格映射、真实浏览器与上线验收。

## 已核实当前状态（2026-10-19）

- 生产会员目录 **revision 50**：93 产品、495 套餐；475 verified、19 retired、1 pending。完整产品/套餐及根级别迁移元数据已与预备补丁逐项读回一致。
- 仅剩1个旧pending：`cursor-plan-1`。Grok/X三个占位项已退休并补官方具体套餐。
- 厂商研究覆盖：50 research_complete、31 partial、43 unreviewed。**这比 pending 数更接近剩余工作规模，不能只清四条就宣布完成。**
- 生产代码已更新为 PR106 / cc1f94632ef2（100%流量，2026-10-19实时读取）；新界面在草稿 PR105，未合并部署。当前工作区 `/tmp/ym-hf-link-worktree`，分支 `codex/membership-catalog-complete`。
- 主 checkout 是其他任务的估值修复，勿覆盖。node_modules 为临时 symlink，不提交。
- 本地最近完整验证：类型检查、1426 Vitest + 11 CLI、build:web、diff --check 通过。代码新增：按厂商套餐复选、个人选择去重、旧记录提示可单独清除、跨厂商资格默认显示实际会员厂商、退休产品不重新出现在厂商下拉、目录准备工具的归并/退休守卫与回归。

## 生产写入方法与快照

- **整份目录已超过 D1 单条 SQL 100KB 限制。不要再把 JSON 内联到 wrangler execute --file。** 第11批内联写入返回 SQLITE_TOOBIG，已确认没有生效；随后改为 SQL 绑定参数原子 CAS，成功从40写到41并完整读回。
- 后续预备补丁：`node scripts/prepare-membership-catalog.mjs <当前目录快照> docs/audits/membership-catalog-2026-10-19/official-findings.json <预备文件> docs/audits/membership-catalog-2026-10-19/coverage.json`。仅 verified+applyReady 的事实被采用；未显式处理的旧套餐会报错。
- 当前可复用私有绑定参数写入器：`node /tmp/ym-membership-apply-bound.mjs <预备文件> <私有凭证前缀>`。它使用现有 Wrangler OAuth（不输出令牌），固定只更新 membership_catalog id=1，检查 expectedRevision，保存前后快照并全量对照。API失败后先读状态，不盲目重放。若 OAuth 过期，用正常 Wrangler CLI 刷新，不输出凭据。
- 最新完整 D1 原件：`/tmp/ym-membership-wave20-bound-after.json`（revision + data_json）。原始基线：`/tmp/ym-membership-catalog-before.json` rev29；`/tmp/ym-membership-offers-before.json`（96条会员权益）；`/tmp/ym-membership-profiles-before.json`。
- 生产旧 API 目前只返回 revision/products/plans，**会省略根级别 productIdAliases/productReplacements**。准备工具会根据事实文件重建这些映射；最终部署新读取代码后需核验根元数据保留。完整 D1 快照优于只靠公开 API。
- `wave-1` 至 `wave-20` 记录已入审计目录。生产触发器自动保留每次目录修改前后原件。

## 官方研究证据与发现

- `coverage.json`：全部124厂商。`official-findings.json`：具体套餐与来源。applyReady 表示已核实的这批事实可写入，不表示厂商全部产品都核完；看 remaining 及 coverage 状态。
- `/tmp/ym-membership-research/`：vendors（124首页）、pricing（55页面内定价入口）、search（39搜索，部分 Exa 限流）、discovered（61官方候选页）、新增 .txt 官方 Markdown。定向读取缓存，不重抓全部。限流/403/空壳不能当无会员。
- MiniMax：国内M Plan与国际M Plan分别Go/Explore/Build；两边旧Token Plan Plus/Max/Ultra仍可按官方规则续订。分别保留国内/国际产品。还需核对 MiniMax Design 独立会员、海螺国内版。
- ZCode不是独立订阅，官方明确使用BigModel国内或Z.ai国际GLM Coding Plan；已将旧ZCode占位产品退休，并记录**两个**候选产品，不能猜单一地区。当前个人Lite/Pro/Max、团队两档、V1/V2历史个人/历史团队及体验档已录入。相关Markdown在 bigmodel-plan/team/legacy、zai-team/usage-revision/legacy.txt。
- OpenAI：ChatGPT共用Codex/Work，旧两个占位产品已退休；Pro100/200/500、Business Standard/Premium、Edu/Enterprise/Teachers等已录入。Teachers官网现为免费至2028年6月，旧搜索片段2027已经过时；不要在本任务顺手改其他福利。
- Adobe：普通文本读取漏动态表格；已用浏览器读官方生成积分FAQ，录入Firefly个人/团队/积分附加订阅及CC个人/团队/企业共62个明确档位，退休2个模糊占位项。教育、Acrobat/Express/Substance/Stock及其他剩余官方表格仍需继续，**不能只核两产品就说Adobe全覆盖**。
- Higgsfield：当前Free/Starter/Plus/Ultra/Team/Scale/Enterprise，主站原文可确认历史Basic/Pro/B2B；已保留正式名称。geo.higgsfield.ai自述AI-generated，其Ultimate/Max/Creator不能直接认可，需主站依据。
- Magnific：个人Premium/Premium+/Pro Starter；点击4M credits选项会把Pro Starter变成正式Pro。Teams页签Business/Enterprise，共6档已核。不能漏动态选项。
- Runway：Free/Standard/Pro/Max、Team/Enterprise、仍有效至2026-11-30的旧Unlimited，已分别录入。官方明确Max不等于Unlimited。旧Explore Mode/MCP占位项已退休。
- Windsurf→Devin Desktop：官方明确旧计划、价格继续有效。新Devin五档与旧Windsurf Pro/Teams/Enterprise/Trial保留，双方厂商列表共用相应目录，避免丢失旧资格。
- TRAE：当前文档五档Free/Lite/Pro/Pro+/Ultra，Lite只在12个指定国家销售，IP在其他地区时价格页会隐藏它。当前月价8/20/60/200；早期3/10/30/100资料已过时。旧Pro+/Ultra年付可保留90/400美元月用量到当前周期结束，已单列。2026年2月前请求制Pro原件退休。企业版BytePlus和国内版仍需核对。
- 扣子：当前官方订阅目录**十档**（个人5、团队3、企业2），不能沿用1月公告的六档；旧团队/企业可续费安排单列。国际Coze仍待核。
- Step Plan是Mini/Plus/Pro/Max，已替换旧Flash前缀；阶跃AI/StepClaw另有四个月付档。尝鲜周卡也是正式会员档，收费属性仍待核，不能因为不是月付就遗漏。
- Qiniu：当前Enterprise S/M/B；不能只存2999/4999/9999价格。还需确认其他AI产品是否另有会员。
- 公共定价已发现但还未充分整理：Vercel（包括v0）、Microsoft/Copilot、Google Workspace/AI、Cloudflare、AWS/各云Coding Plan、Hume之外其他API厂商、Cline、Replicas、Manus、Gamma、Leonardo、Poe、Lovart、SeaArt、Tripo、Vidu、WPS、即梦、可灵、飞书、豆包工作、Qoder等。按coverage逐个推进。

## 必须继续的代码/迁移事项

1. Cursor/Grok/X：新The X Subscription与旧Cursor/Grok/X目录有明确迁移关系；先读官方链接，不能仅按同名Pro/Enterprise合并。当前事实文件中的cursor/x-subscription仍未applyReady。
2. Cursor已有已批准资格引用`cursor-teams`、`cursor-enterprise`（含Kilo的跨厂商资格）。把泛Teams拆成Standard/Premium时，必须支持明确的一对多资格映射或受控回填，不能直接退休旧ID造成原福利匹配失效。历史用户持有的泛Teams/Pro不得猜成某一档。
3. 32条已批准旧资格仍needs_review，9条confirmed（基线快照）。目录补齐之后，依据**已批准原文**完成可确认的结构化映射；保留地区、年付、截止、回归用户等实际约束与审批状态。仓库已有`scripts/membership-backfill.ts`及其测试，按现行身份服务处理，不直接改历史版本。
4. 新多选界面与快通约束覆盖缺口已在本地修复：membershipSelectionOnly区分勾选套餐与完整资格，模型输出必须覆盖相同产品/套餐集，完整限制沿用模型，受阻任务重新勾选后排队补全。API回归已验证年付/地区/日期/试用条件保留；仍须实际模型+真实条目上线前验证。旧完整资格API不带标记仍为明确覆盖。
5. 个人条件含歧义旧记录时，当前代码会移到unresolvedMembers；应检查不能因未映射旧记录误判为肯定不符合，必要时保守返回unknown。清除提示按钮已可单项删除，不重置其他条件。
6. 最终目录填全vendors元数据、所有active产品的platformIds；检查完整124厂商覆盖、无重复正式套餐、无pending/unknown收费属性、无孤立引用。不要用隐藏未核实项冒充清理完成。
7. 对完整生产目录逐厂商/逐套餐实测「我的条件」选择、取消、跨厂商切换、刷新持久化、无重复及控制台错误；普通编辑和快通同样验证。真实浏览器扫全量尚未完成。
8. 数据完整后再把PR105由草稿转正式、完成CI/审查、合并部署。用户已授权整个目标；无需重复要授权。核对远端SHA、Worker100%标记、静态文件、API及真实UI。检查目录版本变化是否留下受阻快通任务并恢复。

## 浏览器

CUA的IAB临时tab2当前在TRAE计费文档，可继续看企业版；`pvCatalogTab`是现有句柄。`adobeAx`缓存了官方Adobe FAQ完整AX，尚未整理的教育/Document Cloud表格可直接定向查看，不必重读全页。新回合先按工具要求恢复文档/确认句柄仍活跃。浏览器来源均只读，未购买或登录新服务。

## 继续检查点补充

- 第12/13批已写入并全量读回；新增Cline、Vercel/v0、Poe、Manus/Cue、Replit、AWS Q/Quick/Quick Sight、Meta Muse Code、华为码道。新研究条目保持逐产品证据；部分完成厂商仍为partial。
- 华为尊享版未上线，不录入active；百度Token Plan存在积分/Token双轨，仍需阅读动态卡和迁移文档。火山同时有Agent Plan和Coding Plan，不可按同名档位合并。腾讯抓取缓存可能未成功，需重新读当前主文档。
- planReplacements及旧歧义会员匹配代码在本地已新增，尚未上线；不得提前把cursor-teams退休导致生产不认识映射。

- 第14批已写入rev44：百度个人Mini/Lite/Pro/Max各分积分制与Token制（单向可选迁移，权益不同），企业轻享/标准/高级/尊享；火山Coding Lite/Pro与Agent Small/Medium/Large/Max分别建档。百度旧Coding于7月13日停售，未到期可继续使用；仍须补历史资格和其他百度产品。官方原件缓存baidu-legacy-end.json、volc-agent-overview.json；百度个人/企业文档路径Dmrabu8b6、ymq8wwch2。

- 第15批rev45已全量读回：Gamma六档（浏览器实际切Business核对），Ideogram当前Free/Plus/Pro/Team/Enterprise，Leonardo个人Free/Essential/Premium/Ultimate与团队Starter/Growth/Custom，Tripo Studio四档。旧Ideogram Basic、Leonardo旧命名是否续用和Tripo API/企业仍待核；只有Gamma标研究完成。
- Groq已读官方Billing FAQ确认为按量API账户级别；DeepSeek官网三产品入口、价格文档及帮助中心均未发现公开会员订阅，分别标研究完成/none。Inception API无固定订阅，但Mercury Chat仍需核对，保持partial。
- 无套餐的界面文案改为“已核对官方资料，暂无公开会员套餐”，避免把公开资料范围扩大成所有私有合同不存在。

- 第16-18批rev48已全量读回：Copilot七现行档+两存量年付请求制；Qoder国际/国内全家桶/原灵码单品/存量合同分开，试用不是付费Pro；SambaNova Enterprise明示订阅，Cohere North/Compass定制企业方案和NVIDIA AI Enterprise软件许可入目录。Cohere/NVIDIA仍partial。GitHub Models官网明确7月30日退役且独立于Copilot，平台github标none，不误挂Copilot目录。
- 目录新增124厂商完整索引（生产D1已保存，旧公开API仍需新版Worker才能返回）。准备脚本第四个参数传coverage.json，每次重建索引；有已核套餐=available，已核无套餐=none，其他=unverified。拒绝矛盾无套餐声明、重复厂商、产品引用未知厂商。Cursor/Grok两个旧verified产品仍缺platformIds，待迁移补齐。

## 本地浏览器验收 rev48

- 本地前端+生产公开数据快照，真实浏览器逐个切换126个入口，438个已启用套餐控件全部勾选/取消/检查去重。生产目录429个唯一verified计划，Devin/Windsurf九个共享ID重复展示所以控件数438。跨厂商Copilot Pro/Qoder国际Pro选择刷新保留、单独移除互不影响，清理后为空，无控制台错误。详细凭证browser-sweep-rev48.json。
- 验收未通过项：Cursor旧占位、Grok两个旧占位、X旧占位共四个disabled，额外Grok/X厂商入口导致126不是124。需迁移完再最终重测。资料不全的空厂商只测切换不算研究完成。
- 浏览器membershipPreviewTab=IAB tab4，localhost:8769。私有预览服务器/tmp/ym-membership-preview.py，当前exec session92456（恢复时先查是否仍活跃），只读使用/tmp/ym-preview-{platforms,offers,meta,coverage}.json及wave20-bound-after.json；不会写生产或触发外部消息。当前本地选择已清空。

## rev49/50后续进展

- x-subscription共享目录10档已应用；grok独立存量7档（含Business两席位）和X独立Premium三档、Business Basic/Full Access、Organizations Full Access/政府定制已核。Grok Bot官方明确没有单独订阅；应用商店所谓Bot订阅仍归实际套餐。Grok旧Lite ID原名实际为排除Lite的占位，所以新真实Lite用了新ID。
- 已实时读生产确认三个退休占位没有已确认资格结构引用；原已批准needs_review记录保留不改。Cursor Teams仍有confirmed历史权益引用，禁止先退休后部署。cursor事实已备一对多retirePlans，applyReady=false；待新匹配代码上线后应用。更早request-based原文明确可延续到续费，但仍需核具体旧档位。
- 本地浏览器rev49复核：厂商入口124，无多余Grok/X。xAI24项全部可选可取消，共享订阅在xAI与Cursor间切换只计一项，无错误。凭证browser-sweep-rev49-followup.json。服务器当前session49186，预览仍固定rev49，需最终更新到最新数据再复测。
- rev50应用Pika创作五档、独立API Club Membership/Enterprise，Meshy六档（Studio可直接订阅，1X/3X/5X为容量不是独立会员），Free.ai九档+企业定制。三个厂商research_complete。
