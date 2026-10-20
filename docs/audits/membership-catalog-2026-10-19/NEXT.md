# 未完成事项与继续入口

目标仍在进行中。旧 pending 清零、单元测试通过或本轮数据写入都不足以宣布全量完成；必须继续当前 125 个厂商覆盖、旧资格映射、真实浏览器与上线验收。

## 已核实当前状态（2026-10-20）

- 生产会员目录 **revision 60**：242 产品、985 套餐；964 verified、21 retired、0 pending；125厂商索引。完整产品/套餐及根级别迁移元数据已与预备补丁逐项读回一致。
- 旧pending已清零，所有active计划billing明确；Cursor旧Teams保留一对多映射，不猜个人具体席位。
- 厂商研究覆盖：72 research_complete、53 partial、0 unreviewed。**这比 pending 数更接近剩余工作规模，不能只清四条就宣布完成。**
- PR105已合并部署：b35d782d4406，Worker 6b699622-9196-4228-923e-14939c913267，100%流量；app.js和membership-core.js与该提交构建SHA256完全一致。当前工作区 `/tmp/ym-hf-link-worktree`，新发现回放词序修复分支 `codex/fast-track-free-word-order`。
- 主 checkout 是其他任务的估值修复，勿覆盖。node_modules 为临时 symlink，不提交。
- 本地最近完整验证：类型检查、1479 Vitest + 11 CLI（合并main及模型目录投影后）、build:web、diff --check 通过。代码新增：按厂商套餐复选、个人选择去重、旧记录提示可单独清除、跨厂商资格默认显示实际会员厂商、退休产品不重新出现在厂商下拉、目录准备工具的归并/退休守卫与回归。

## 生产写入方法与快照

- **整份目录已超过 D1 单条 SQL 100KB 限制。不要再把 JSON 内联到 wrangler execute --file。** 第11批内联写入返回 SQLITE_TOOBIG，已确认没有生效；随后改为 SQL 绑定参数原子 CAS，成功从40写到41并完整读回。
- 后续预备补丁：`node scripts/prepare-membership-catalog.mjs <当前目录快照> docs/audits/membership-catalog-2026-10-19/official-findings.json <预备文件> docs/audits/membership-catalog-2026-10-19/coverage.json`。仅 verified+applyReady 的事实被采用；未显式处理的旧套餐会报错。
- 当前可复用私有绑定参数写入器：`node /tmp/ym-membership-apply-bound.mjs <预备文件> <私有凭证前缀>`。它使用现有 Wrangler OAuth（不输出令牌），固定只更新 membership_catalog id=1，检查 expectedRevision，保存前后快照并全量对照。API失败后先读状态，不盲目重放。若 OAuth 过期，用正常 Wrangler CLI 刷新，不输出凭据。
- 最新完整 D1 原件：`/tmp/ym-membership-wave30-bound-after.json`（revision + data_json）。原始基线：`/tmp/ym-membership-catalog-before.json` rev29；`/tmp/ym-membership-offers-before.json`（96条会员权益）；`/tmp/ym-membership-profiles-before.json`。
- 生产旧 API 目前只返回 revision/products/plans，**会省略根级别 productIdAliases/productReplacements**。准备工具会根据事实文件重建这些映射；最终部署新读取代码后需核验根元数据保留。完整 D1 快照优于只靠公开 API。
- `wave-1` 至 `wave-30` 记录已入审计目录。生产触发器自动保留每次目录修改前后原件。

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
- 浏览器membershipPreviewTab=IAB tab4，localhost:8769。私有预览服务器/tmp/ym-membership-preview.py，当前exec session92456（恢复时先查是否仍活跃），只读使用/tmp/ym-preview-{platforms,offers,meta,coverage}.json及wave26-bound-after.json；不会写生产或触发外部消息。当前本地选择已清空。

## rev49/50后续进展

- x-subscription共享目录10档已应用；grok独立存量7档（含Business两席位）和X独立Premium三档、Business Basic/Full Access、Organizations Full Access/政府定制已核。Grok Bot官方明确没有单独订阅；应用商店所谓Bot订阅仍归实际套餐。Grok旧Lite ID原名实际为排除Lite的占位，所以新真实Lite用了新ID。
- 已实时读生产确认三个退休占位没有已确认资格结构引用；原已批准needs_review记录保留不改。Cursor Teams仍有confirmed历史权益引用，禁止先退休后部署。cursor事实已备一对多retirePlans，applyReady=false；待新匹配代码上线后应用。更早request-based原文明确可延续到续费，但仍需核具体旧档位。
- 本地浏览器rev49复核：厂商入口124，无多余Grok/X。xAI24项全部可选可取消，共享订阅在xAI与Cursor间切换只计一项，无错误。凭证browser-sweep-rev49-followup.json。服务器当前session49186，预览仍固定rev49，需最终更新到最新数据再复测。
- rev50应用Pika创作五档、独立API Club Membership/Enterprise，Meshy六档（Studio可直接订阅，1X/3X/5X为容量不是独立会员），Free.ai九档+企业定制。三个厂商research_complete。

## Google核对rev51/52

- Google AI个人四档Plus/Pro/Ultra5x/Ultra20x已写入；Gemini Enterprise五个edition、独立Gemini Notebook Enterprise、Code Assist Standard/Enterprise存量、GDP Standard+旧年付Premium+旧Enterprise、Workspace15档、Google AI Pro for Education独立许可、Colab三档和Workspace AI Expanded/Ultra旧固定期均已逐项来源核对。共新增36套餐，Google与gcloud仍partial。
- GDP Premium旧月付最晚2026-10-18结束，不能当现行；年付仍至2027-09-18。Code Assist 10月9日停止新购但既有合同继续，不误退休。Gemini Enterprise Agent Platform是API资源消费，不与Enterprise用户许可证混同。
- AI Ultra Access官方https://knowledge.workspace.google.com/admin/generative-ai/workspace-with-gemini/ai-ultra-access 明确5月5日前固定期可用到7月7日后下一次续费；别名Google AI Ultra for Business。个人Google AI Ultra不受影响。AI Expanded Access为现行独立加购。
- Colab个人页https://colab.research.google.com/signup 已真实浏览器读取Pro/Pro+，Workspace官方add-ons页也列同名许可；计算单元包明示不需要订阅，不造会员。Google AI套餐包含Colab能力不另建假订阅。
- Google剩余：Workspace Individual/Nonprofits、旧G Suite与旧Gemini附加包目前是否仍有效、Teaching and Learning旧附加包、可能的Gemini for Government具名许可、AppSheet AI相关订阅。避免从翻译旧页和一般资源SKU推断现行套餐；当前管理文档与营销页不一致时保留核查。缓存google-dev-faq.txt/google-enterprise-editions.txt/workspace-{education,enterprise,essentials}.txt可继续查链接。

## rev53/54创作平台与实验室

- Mistral Free/Pro/Team/Enterprise，Lovart Free/Starter/Basic/Pro/Ultimate/Team，SeaArt Free/Beginner/Standard/Professional/Master均研究完成并入库。Lovart团队弹窗的10+席是Team定制配置，不造第二个未命名Enterprise。SeaArt真实会员入口是https://www.seaart.ai/mall；不要用用户articleDetail内容或不存在的/vip路径。
- Vidu国际Free/Standard/Premium/Ultimate已浏览器读取动态卡片，Ultimate10k/20k积分滑块不造重复档位；仍须核对国内和企业/API渠道，保持partial。
- Physical Intelligence官网Pi API beta只有分批申请入口，未公开会员档位；Thinking Machines Tinker官网pricing覆盖训练/推理Inkling/Inkling-Small与存储，按量无固定会员；Nex官网Mini/Pro/Max是模型名，Try Now去OpenRouter，Weaver按token额度申请。三个厂商标research_complete/none。
- Reflection保持partial：已读官网和完整docs索引，Mirror代理+Beam API，无公开定价文档，仍需核平台计费入口。缓存reflection-index.txt/reflection-quickstart.md/reflection-docs.txt可复用，不要把模型或org权限称为会员。
- 第24批初次绑定参数写入因OAuth过期在读取之前失败（7403）；标准Wrangler读取确认仍rev53并自动刷新认证，之后重放成功到rev54且完整读回。没有重复写入。

## 2026-10-20 rev55/56

- 上一轮被打断的session91338已确认成功退出，wave25-live.json为rev54，未重启重复读取。第25批CAS从54写到55全量读回：腾讯通用/Hy/国际个人/国内企业/国际企业/Coding Plan共18档，阿里国内国际Pro各1，小米个人四档团队三档，商汤Token Free公测与小浣熊四档，共32新套餐。两批均未改任何已有套餐字段。
- 小米已浏览器切Team页签，只有Standard/Pro/Max；腾讯通用与Hy虽共用Key但两个独立订阅；当前Tencent Coding Plan官方仍列独立两档和购买入口，不能凭旧印象合并Token Plan。阿里Lite已停售续费，不当作当前新购档位；SenseNova Lite/Pro仍即将上线。商汤仍需Seko与行业订阅目录。
- 准备工具现在支持每条finding.checkedAt和vendor.checkedAt；新增20日事实不会刷新19日的旧产品/套餐核验时间。先失败后修复的日期回归8项已通过；发布前仍需全部检查。
- 第26批rev56新增Cloudflare Workers Free/Paid/Enterprise（Workers AI官方明确依赖Workers方案），Standard/Unbound/Bundled只是计费模型。TypeSafe Jev API帮助中心明确购买积分/自动充值，Prime训练/推理/Traces计费均按量，无公开固定软件会员档，标研究完成none。Instinct与Odyssey保留partial：实际入口需账号但未取得套餐，不能推断无会员。
- 研究缓存typesafe-home-current.txt、typesafe-enterprise-current.txt、prime-docs-index.txt、prime-training-billing.txt、prime-traces-pricing.txt、prime-inference-current.txt、instinct-home-current.txt、odyssey-developer-current.txt。

## rev57与真实限制保留（2026-10-20）

- 第27批增加32产品96套餐，Kimi国内/国际/企业、千问国内/国际个人/团队、云知声现行与存量、豆包/飞书共享个人与独立组织席位/用量、灵犀、微软当前九类软件以及Sakana/Replicas/Hermes企业；所有旧plan逐项零变化。官方对子产品是否共享有明确证据才复用ID。
- 已修复普通编辑不能收窄AND联合资格、以及同plan多OR限制丢失：保留原结构和每个limits/exclusions；取消必需产品全部plan或歧义新增会安全回显，不自动弱化资格。未核实旧规则不因勾选自动confirmed。
- 快通selectionOnly的needs_review身份仍可交模型补完整资格；旧实现只接受confirmed身份会永久覆盖模型，这个联动已一并修复。135测试文件1434项和11 CLI、typecheck、build:web、diff-check已通过，未部署。
- 实时单SELECT一致只读快照 `/tmp/ym-membership-live-snapshot.json`：41条approved会员、32needs_review/9confirmed、0提案/0活跃审核、目录57，完整已批准事实/证据均保留，未写任何历史。候选报告 `/tmp/ym-membership-backfill-candidates.json`，名称等价6条但完整结构迁移尚未批准执行；原facts eligibility=unknown本身不能替代逐条证据评估。
- 新研究私有产物：`/tmp/ym-research-{cn-creative,cn-remaining,cn-consumer,microsoft-supplement,google-supplement,adobe-supplement,creative-supplement,api-followup,cloud-supplement}.json`。仍需父任务逐项核实/归并后写入，不能批量盲导。
- 浏览器已实读即梦四付费周期：基础/标准/高级/超级，超级只在自动续订页签，积分滑杆不新增档。可灵国际当前Basic免费+Standard/Pro/Premier/Ultra+，Business为独立Team Plan（月/年同档），各workspace不共享资格；尚未应用。国内从快手IR官方链接进入，重定向klingai.com/app，继续读当前价格。

## rev58及第二轮联动修复

- 新增国内/国际MiniMaxDesign、TapNow、Liblib创作、TRAE国内/企业/BytePlus、Coze国际、Seko、WPS个人/365、即梦、可灵国际个人/团队、Leonardo API、OiiOii完整九档和Ideogram旧Basic。新增19产品73套餐；已有5个Ideogram只更新实际复核日期，没有改福利资格。
- 独立复查发现并修复3项：普通编辑与快通mode分离（普通确认、快通只选身份）；退休排除plan解析当前ID；快通队列返回完整已有会员结构且表单预选保留。又补marker+空选服务端保护：让模型补，不能覆盖成无需会员。全套1442+11、类型/构建检查通过。
- 当前main已到7462a7e（PR110后台卡片工作区），本分支尚未合并这批main提交；发布前须合并解决app.js并重新验证，不能覆盖别的任务。

## rev59与发布前检查（2026-10-20）

- 生产新增71产品216计划：微软软件许可/普通M365和真实nonprofit归并目标、Google Workspace补项/AppSheet/Looker/安全软件、Adobe具体教育/Acrobat/Express/Stock/Experience、火山企业/Comate/AgentArts体验及可灵国内。已有30项只更新实际复核日期。全量verified正式名称无重复，唯一未知billing/缺platformIds均在待迁移Cursor。
- main的PR106/110与估值变更已合入ca6934d，冲突仅fasttrack提示词，保留会员selectionOnly和valuationPrompt两者。合并后1475+11/typecheck/build全绿。独立复查无P1/P2。新增prompt按产品嵌套全部verified套餐、保留aliases/billing/legacy，去审计重复，旧快照字节-64.9%，未过滤跨厂商身份。
- 本机Node26；尝试npm exec Node24未提供实际24二进制，嵌套npm exec污染子进程参数导致seed-profiles调用EUSAGE，非业务测试失败。后续以GitHub check的setup-node24为权威CI，不宣称本地24已验收。
- 最新30快速上架记录全为published（包括MiniMax M3.1 Flash b521745f、Perplexity 5bcf9a33），不能用空队列代替真实模型重放。完整实时资格快照仍41会员approved；32原始needs_review需逐条等价判断，不允许仅因目录缺项重审/撤下。
- research-gaps.json保留已发现未闭环子产品；9 unreviewed厂商实际上已有私有研究资料，可按来源更新partial，但不能伪造成全量完成或无会员。
- 待执行：提交/推送PR105、Node24 CI、合并部署、核对marker/SHA/static/API，再应用Cursor一对多退休补丁，然后全量真实浏览器验收。

## 发布分支最终补充

- 已将main PR111导航更新合入61e7c82，仅文档冲突保留新导航与会员选择语义。生产另有已发布5852b6d AIHOT修复；用户明确不再重做它，发布分支4fde2f5仅保留其既有代码作基线，未重写AIHOT。
- 5d1eb03用真实Microsoft 39产品/105套餐复现并修复anyOf最多20导致完整多选保存失败；新有界500，allOf20及其他请求限制不变，1502+11/typecheck/build通过。
- 新增默认关闭的fast_track_rebuild只读诊断：只给同一fillFields原始job/catalog，清空ownerFields，不传保存/批准答案，返回真实完整字段与会员并在模型后对比。共享月预算仍受控，业务写为0。待main合并后对真实MiniMax b521745f执行。
- Cursor官方现行与Enterprise已于10-20再核：新旧不等价不能合并；Teams旧总称对应Standard/Premium一对多。cursor-migration-plan.json仅准备，不是已应用；必须在新Worker部署验证之后将D1 59写到60。
- 9个旧unreviewed厂商的已读资料已归入partial和sources，所有124厂商均有研究，但53家仍有具体子产品/存量/登录资料缺口，不能宣布无遗漏。

## 实时第125家厂商

- 实时/api/platforms新增Command Code（10-20注册），原124目录索引遗漏了它。选择器现与PLATFORMS按ID并集，保留已核状态，未来新增厂商也可选择，不自动伪造套餐。真实回归验证新厂商切换、无重复及不改变已有订阅。
- 官网commandcode.ai与登记@commandcodeai互链，当前Go/GOAT/Pro/Max10x/Max20x/Provider/Teams/Enterprise八档已核，Provider是月订阅+按量，不能排成纯充值。Teams与文档TeamPro同档别名；未确认正式Free或有效Ultra旧合同不猜。已与Cursor合入revision60准备补丁，尚未写入。
- 生产revision59仍241产品970计划/124目录索引；准备补丁将为242产品985计划/125索引，964verified、21retired、无pending/活跃unknown billing。只能部署新Worker后应用。

## PR105线上与实际模型回放

- PR105已发布且public API完整等于revision60准备目标。125厂商、964可选计划、无待核占位/活跃unknown billing、无重复正式名称。9条当前已批准结构对950个旧owned方案+空集共8559例前后无匹配变化；未改批准业务行。
- 真实MiniMax只读重建：run39396086094，Gemini40877tokens/0元，ownerFields={}，会员自动补国际6档且与批准资格等价；network/text/all均正确。失败不是目录或会员，而是独立review把初稿正确free改perk；validationIssues为空却与批准free不同。报告私有 `/tmp/ym-membership-minimax-rebuild.json`，公开已批准记录未改。
- 根因：globalAccess只认“使用…限时免费”，漏“无限量免费使用”；globalWindow漏纯中文“活动持续至日期”，初始PROMPT的perk定义也不一致。最小补丁1da0d8e，加实际中英回归及赠积分/个人首次trial负例，1522+11/typecheck/build通过。必须通过PR合并部署后重跑**同一原任务**，不得放宽诊断或换基线掩盖失败。
- CUA线上验收进行中：membershipLiveTab tab10，liveSweep变量及sweepLiveBatch(25)，已完成20/125厂商、123控件、均勾选/取消/去重，起始owned为空，其他偏好保留。继续逐批，最终验证刷新/跨厂商共享/无控制台错误并保存证据。
