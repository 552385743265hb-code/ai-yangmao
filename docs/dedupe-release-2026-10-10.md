# 去重修复兼容发布凭证 · 2026-10-10

用户已在本次会话单独授权同步、合并和部署。正式 PR #6–#13 全部合并，生产已部署；这份凭证取代旧交付文档中的“尚未推送/部署”状态，不改变之前审计快照的事实。

## Git 与运行版本

- Worker代码提交：`32ccacc53d185c2754d881089077d438f2808e3f`，tag=`32ccacc`。
- Worker version：`7f75d629-9dc9-4567-b9ef-e3b4e808b9e0`，部署ID：`1279bce9-a361-444b-aaac-eccdbb3f0fcf`，流量100%。
- 部署时间：`2026-10-11T01:46:35.381002Z`（UTC；纽约2026-10-10）。
- 验证过的仓库tree：`622d46a33fcdb98c4d95721e7d46e3bc4cf9bc2a`。先把最新main整合到修复分支，运行完整验证；随后从#13向#6逐级合并，每次检查最新head的CI与tree，最后进入main，避免main短暂运行缺少后续修复的中间阶段。
- [main检查](https://github.com/accesaver-byte/ai-yangmao/actions/runs/38102938116)成功；本地与GitHub均实跑678项Vitest和11项CLI，typecheck、前端构建通过。原本地目录已快进同步并重新npm ci/build:web；用户未提交的估值文档内容保持不变，未纳入此次提交。
- 本凭证是部署后的文档收尾；后续文档提交不改变此Worker代码或静态资源。

| PR | 实际合入目标 | 合并提交 |
|---|---|---|
| [#13](https://github.com/accesaver-byte/ai-yangmao/pull/13) | codex/dedupe-p3-b | `296fcaf` |
| [#12](https://github.com/accesaver-byte/ai-yangmao/pull/12) | codex/dedupe-p3-a | `3896cba` |
| [#11](https://github.com/accesaver-byte/ai-yangmao/pull/11) | codex/dedupe-p2-d | `3f850f5` |
| [#10](https://github.com/accesaver-byte/ai-yangmao/pull/10) | codex/dedupe-p2-c | `c881e3a` |
| [#9](https://github.com/accesaver-byte/ai-yangmao/pull/9) | codex/dedupe-p2-b | `5adb1eb` |
| [#8](https://github.com/accesaver-byte/ai-yangmao/pull/8) | codex/dedupe-p2-a | `7e597ac` |
| [#7](https://github.com/accesaver-byte/ai-yangmao/pull/7) | fix/dedupe-phase1-final-20261010 | `9468e22` |
| [#6](https://github.com/accesaver-byte/ai-yangmao/pull/6) | main | `32ccacc` |

## 生产迁移与数据保护

生产迁移前台账为0000–0015，核对没有0016列或身份表的编号冲突。先导出私有SQL备份；备份SHA256为 `efd67593dcf24c39c524afc9a4bac6ebe8c5f20b15aae3c2dc10d2d2528ee140`。备份成功恢复到本地数据库，再对副本执行全部20条新增迁移；13张原业务表既有列逐行hash一致，FK基线保留。备份另存本机管理工作树之外的私有目录，权限限制为当前用户，未提交到Git。

随后执行 `wrangler d1 migrations apply ai-yangmao --remote`，生产台账现为0000–0035，共36条，待执行迁移为空，`PRAGMA foreign_key_check`无异常。0016及0017–0035均在部署Worker之前完成，没有覆盖已有迁移文件或修改旧台账。

迁移与部署前后，offers、reviews、leads、deliveries各状态数量完全一致：公开approved241条、pending条目2条、rejected条目180条；deliveries原有pending1条、sent51条保持不变。身份实体和历史merge_operations仍为0。本次没有生产历史回填、逻辑合并、原记录删除、人工决定覆盖、待发消息释放或发送。

## 实际开关与预算

Cloudflare版本元数据和GitHub仓库变量分别回读确认：

- Worker `IDENTITY_MODE=off`、`IDENTITY_MODEL_ASSIST=false`、`HISTORICAL_MERGE_ENABLED=false`。
- GitHub collect：`IDENTITY_MODE=off`、`IDENTITY_MODEL_ASSIST=false`。
- 原预算保持 `DAILY_TOKEN_CAP=0`、`MONTHLY_COST_CAP_CNY=10`；现有secret绑定与D1绑定保持一致。

这是全部修复代码的兼容发布。第一阶段旧路径修复正常上线，第二/第三阶段代码与schema已就绪；未开启强制身份解析、辅助模型、canary或历史自动合并。至少60对冻结人工语料与真实规模资源验收仍未完成，不能从本次发布推出这些功能已获现场验收。

## 线上核验

部署后12项只读检查全部通过：health/meta/coverage、claimable/all offers、RSS、首页、认证管理队列、身份任务与暂停列表；未认证管理队列和身份任务返回401。公开all集合241条，claimable143条，RSS63项，认证后台pending2条、待复核线索78条；新身份任务/暂停列表为空，符合未回填且off的发布方式。

HTML、app.js和图表库的线上SHA256与隔离发布构建及主目录构建一致。初次Python urllib附带临时查询串探针得到403；随后按实际资源URL使用与线上API检查相同的Node HTTP栈获取200并逐字节hash比对通过，没有把失败探针算成功。

| 资源 | SHA256 |
|---|---|
| `/` | `502e250e4e39be27065f1b1b228e0a36de40094fe06028c72fcc53343720b719` |
| `/app.js` | `43d7e44e41bda29b5dbe89c0bf4b3331b4b2b200e8d1163c20b4c7dedb21d1f7` |
| `/vendor/echarts.min.js` | `b66b25aeb4df84e33199dc21694014d336d222cbd9deb0e5a7c14bd6aa0d0fd0` |

全程未手动触发真实采集、模型评测或消息发送，没有提高预算。这里的只读线上功能检查不是生产写入对抗测试、真实语料准确率或生产规模压力测试。

## 回滚与凭证位置

生产新schema保持追加兼容。关闭身份写入必须继续保留canonical/alias读取、拒绝历史及pending/unknown保护；不能通过drop表或回退到缺少这些能力的旧Worker恢复。当前已部署提交可作为兼容代码基线；数据恢复/历史apply仍需针对具体对象和planHash独立授权。

本机完整执行凭证在隔离工作树的 `.superpowers/sdd/release-2026-10-10/`，生产备份不在公开仓库。此前修复细节、RED/GREEN和人工语料缺口见 [整改报告](specs/dedupe-identity-2026-10-10/AUDIT-REMEDIATION.md)，后续启用要求见 [发布说明](specs/dedupe-identity-2026-10-10/RELEASE.md)。
