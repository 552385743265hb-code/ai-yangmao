# 会员目录继续入口

目标仍在进行中。目录和界面已逐批生产验收，但仍有具体官方资料缺口，不能把 pending 清零写成“无遗漏”。此前已发布的 AIHOT 修复不再处理。

## 当前生产状态（2026-10-20）

- D1 与公开 API：revision **64**，286 产品、1112 套餐，**1091 verified / 21 retired / 0 pending**，125 厂商。全量读回与预备补丁一致。
- 前批revision63新增37套餐及5个LibTV完整别名。本批新增ChatGLM三档，为原Leonardo API四档添加存量标记，并给Tripo Pro添加完整Professional别名；1109条旧套餐的ID、名称、状态、所属产品和收费属性不变，根级迁移映射保留。
- 公开范围：111 research_complete、14 partial。范围定义和具名历史问题见coverage与research-gaps；research_complete不表示已审计全部私人合同。
- PR116已合并，代码提交 **40223ac0e0a6a10074a1f952875dcd386a3dfecd**。Worker **96ca4415-bcd2-4287-a6c5-06303a9ccaba**，tag **40223ac0e0a6**，Cloudflare读回100%流量；app.js与membership-core.js线上和构建哈希一致。
- PR117已保存revision63凭证。本批来源与revision64凭证仅修改docs，运行代码没有变，不需重复部署；以`catalog-rev64-release.json`核对当次状态。
- 工作区`/tmp/ym-hf-link-worktree`。主checkout属于其他工作，勿覆盖。临时node_modules symlink不提交。

## 已完成的验收

- `browser-rev60-proof.json`逐个遍历125厂商，勾选/取消1005个显示控件，覆盖964个不同套餐；rev61/62分别增量验收80/7个。X跨厂商共享订阅去重，多厂商保存/刷新/单独删除均已实测。
- `browser-rev63-proof.json`：9个受影响厂商全部实际ID集合与API一致，37个新增套餐逐个勾选/取消且仅一个选中卡片；累计覆盖全部1088个verified套餐。125厂商选项均在，控制台零错误，测试选择清除，九项其他偏好保持原样。
- 真实9条已批准结构化资格×1052种原持有情况＝9468次匹配，rev62→63零变化。未重新批准或修改福利条款。
- `browser-rev64-proof.json`：ChatGLM三档、Leonardo API四个存量标签、Tripo原Pro共8项均实际勾选/取消通过，三家完整目录与API一致。累计覆盖全部1091个不同verified套餐，125厂商选项保留，测试选择清除，其他偏好恢复，控制台零错误。
- 本次重新读取公开approved-contract API，9条真实已确认资格×1089种原持有情况＝9801次匹配，rev63→64零变化；精确Tripo全名去重，裸Professional不解析，旧福利仍needs_review。
- 全套141文件1529 Vitest + 11 CLI、类型检查、前端构建通过；PR116 Node24 CI通过。完整别名识别的三项回归先红再绿，独立复查无P1/P2。本机Node26，不能声称本机Node24通过。
- PR115已发布的初次加载竞态回归与6000ms延迟真实数据预览见`membership-loading-preview-proof.json`。本批没有重做该修复。
- `minimax-fresh-rebuild-2026-10-20.json`：真实原请求重建，未输入保存/批准答案；模型补齐六档资格及分类/模态/对象/日期，40588 tokens，¥0，业务写入0。

## 本批明确边界

- Qwen通过官方下载安装链、应用商店及同一法律主体核实8个具体套餐，国内创作/工作助理与国际Chat/Studio分开，不混作API Token Plan。
- Liblib团队真实页面有入门、标准、进阶、高级、豪华、至尊6档。LibTV与Liblib核心会员通过同一所有者/会员读取与购买SKU链核实，共用原有身份；只添加已实际销售的5档完整别名，不新增重复产品。
- 核心身份共享不等于跨产品余额、活动、加赠额度互通。LibTV没有证实入门档，不能合成该别名。星流与Lovart官方明确两套独立体系，星流停服/退款不自动开通Lovart会员。
- Kling当前FAQ明确Ultra已停售但原订阅者保留权益；独立记录存量Ultra，不能合并为Ultra+。
- 飞书旧企业两档有当前支持文档；不擅自标停售或映射到商业版。Google四项旧AI附加权益、Looker原Standard、PVA旧会话许可、Browser Use旧两档、客悦旧合同及BML本地软件授权分别有具体依据。
- 研究原件及父任务决定见`specific-legacy-closures-2026-10-20.json`；当前可应用事实见`official-findings.json`。历史报告内的旧提议不覆盖父任务最终决定。
- `authenticated-source-closures-2026-10-20.json`：改用Chrome已有会话后，ChatGLM直接读到免费/VIP/SVIP三档；月/季/年不重复建档，积分包排除。AutoGLM没有现成会话，验证码和协议未提交，登录问题已向用户更新。
- Leonardo沿当前官网文档导航实读V2 `/docs/pricing-and-plans-faq` 与PAYG Guide，原API订阅主动迁移前不变、Custom旧合同保留；旧`/me/docs`实时404，不能把搜索摘要当当前正文。新PAYG无月费，不另造会员，当前API CUSTOM商务入口也不能说已停售。
- Tripo实际Chrome月/年卡均Free/Pro/Max/Team，同页选档FAQ逐项Professional/Max/Team，确认唯一Pro/Professional对应；只补现有ID的完整别名，不推断Advanced/Starter。

## 剩余具体缺口

1. 登录/准入障碍：秒哒个人、AutoGLM、Reflection、Instinct、Odyssey、海螺国内。ChatGLM已由Chrome既有会话解决；AutoGLM仍需手机号验证码及未勾选协议，海螺价目入口只弹注册，秒哒Chrome渲染失败不能据此判断登录态。未注册、购买、接受新协议。已请用户本人登录AutoGLM，等待答复。
2. 明确旧档映射/保留条款：PPIO旧DeepSeek包、Adobe若干教育/AI Assistant/Stock旧档、Higgsfield Max/B2B、Leonardo消费者旧三档、Luma Dream Machine旧五档、PixVerse旧API档、Tripo Advanced及Starter存续。不要凭同价、同额度、第三方报道或重定向猜映射。
3. Leonardo API存量与Tripo Pro/Professional问题已经由当前原文闭合。Luma完整现行条款没有旧五档迁移或并存关系，Chrome官方Sign In实际到注册表单，没有可读原订单；需已有账号Order/View Plans或迁移通知。不得重做已经解决的404/403路径问题，也不能继续泛搜无新证据的旧合同。
4. Google/VirusTotal Professional Plus、Unleashed与现Bundle/GTI的精确映射仍未证实。PVA当前协议后续购政策、Cursor更早合同的未来迁移不应扩张成猜测的新套餐。
5. 32条已批准旧会员needs_review只影响自动个人匹配，不是待重新审批的福利；保留原批准原文，只有确定等价依据才做受控迁移。

## 私有快照与安全运维

- D1完整原件`/tmp/ym-membership-wave34-bound-after.json`，公开API`/tmp/ym-membership-api-rev64.json`，预备文件`/tmp/ym-membership-wave34.json`。内部原件不提交。
- 准备：`node scripts/prepare-membership-catalog.mjs <当前完整快照> <official-findings.json> <预备文件> <coverage.json>`。所有新增事实先预演、查重、检查旧ID与迁移根、真实规则对照。
- 超过100KB的目录不能内联进Wrangler SQL；使用参数绑定与revision CAS，只写membership_catalog id=1，写前/后备份、全量读回。版本变化必须重做预演，不能强制覆盖。
- 不动主checkout、不带node_modules、凭据或内部业务快照入Git。PR仅docs时先比较运行树，不为资料提交重复部署。
