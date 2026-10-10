# Codex 实施规格：第二、第三阶段

本目录是本次交付的统一实施入口；第二、第三阶段已在七个独立增量中实现；当前交付限于源码和本地工程验证，未合并或部署。现场语料验收见 [交付证据](P3-C-EVIDENCE.md)，未来发布与兼容回滚见 [RELEASE.md](RELEASE.md)。目录外同主题旧草稿仅供追溯，不能据此另建一套subject/entity表。

按顺序阅读：本 README、[主规格](SPEC.md)、[九项实施任务](IMPLEMENTATION.md)、[验收矩阵](ACCEPTANCE.md)、[执行提示](CODEX-HANDOFF.md)。以下补充是主规格的组成部分，编码时并入对应schema和测试。

## 必须保留的细化合同

**任务修订。** `review_tasks`增加`material_revision INTEGER NOT NULL DEFAULT 1`。`revision`用于CAS/租约/编辑竞争；`material_revision`只因可影响审核的新实质事实或有效重开推进。SPEC中的reviewRevision指material_revision。抓取lastSeen、增加重复来源、健康刷新、内部备注不推进material_revision，不产生新提醒。凡影响身份判断的变更仍须推进entity/block修订，不能以“无新通知”跳过竞争保护。

**线索聚合。** 全部候选已解决且有真实offer可标linked；全部被既存拒绝决定抑制而无offer可标rejected，但只关联旧决定，不捏造新的业务拒绝。仍有identity/evidence任务时线索保留reviewing并关联task，不再重跑已经被任务接手的候选。只有deferred/待修正候选继续抽取或补证，leads.offerId不得造假。

**定期栏目不是重复提醒。** 飞书常驻榜按日重复展示属于现有产品行为，应保留；“同活动只发送一次new”不能变成“禁止每日榜重复出现”。增加测试：连续两日可正常生成常驻榜，同日的new/审核提醒仍幂等，pending/unknown消息不能自动重发。

**引用与保留。** legacy_offer_id映射全局唯一，不因产品更正形成两个根；其他强别名按产品与scope唯一。version/decision/task不仅要存在，还必须属于声明的实体；部分唯一索引与FK不足以表达的归属由同批守卫验证。被有效审核/拒绝决定引用的证据不得按普通缓存TTL清掉；保留脱敏原文、出处和hash，不把密钥/客户隐私持久写入证据。

**变化与通知。** 实体身份、事实版本和批准事件分开。政策A→B→A必须允许恢复政策再审并生成新的publicationRevision；不同旧offer的revision数字不能用来判断同一版本。回滚后和IDENTITY_MODE=off仍必须保留canonical读过滤。

## 第一阶段状态

当前合并对象为PR #6（#2为已关闭的工作稿）。本目录其余PR #2引用仅为原始修复溯源，实施以PR #6或等价集成为准。第一阶段只实现三个代码修复及12项回归保护测试；已验证343个Vitest和8个CLI、typecheck、web构建。`0016_rejection_decision_key.sql`必须先迁移再部署新Worker。当前没有生产部署、生产迁移或历史apply。详细证据见PR及`docs/phase1-dedupe-fix-2026-10-10.md`。
