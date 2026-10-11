# 第二、三阶段实施计划

> 供 Codex 按任务执行。先读同目录 `SPEC.md` 与 `ACCEPTANCE.md`。使用独立分支、测试先行、小步提交；本文件不是生产部署或数据合并授权。

**目标：** 将现有去重规则收束为持久、可审计的活动身份和审核状态机，并提供可预览、可中断、可受约束回滚的历史清理。

**架构：** 继续以 D1 为事实源，Worker 负责身份决策和原子提交，pipeline 只负责抓取及预算内模型判断；offers/proposals/reviews 保持兼容投影。历史合并优先改变路由，不改写过去的审计。

**技术栈：** Node 24、TypeScript、Hono、Drizzle、D1、现有 Vitest/SQLite；不引入额外收费服务。SPEC：`./SPEC.md`。

## 全局约束

- 第一阶段 PR #2 必须已进入执行基线或等价集成，不从旧审查 SHA 覆盖最新代码。
- 执行开始记录 HEAD、工作区状态、测试结果、迁移编号；不得重置或覆盖用户未提交文件。
- 不运行生产 seed、db:migrate、deploy、采集、真实模型调用或通知；本地测试设置明确的 mock API_BASE，禁用真实密钥和发送器。
- 先新建本地迁移和代码，再在隔离环境演练。`0016` 已被第一阶段使用；新迁移按执行时最新编号继续。
- 所有新 JSON 和模型结果运行时校验；公开字段不泄露决定理由、内部 trace 或原始客户信息。
- 默认 shadow、model assist 关闭、历史 apply 关闭；每次模型处理最多4任务，每次候选写入最多10条，召回40、模型比较8。超额分批/延期，不静默截断。
- 未知不等于相同/不同；假阳性合并必须单独测，不能只证明重复率下降。
- 保留原有 Mistral、lead-scope、跨产品、不同重置轮次、估值和人工编辑保护回归。

## 交付切分与依赖

建议按七个可审查增量交付，而不是一次大 PR：

| 增量 | 任务 | 输出 | 可以开启什么 |
|---|---|---|---|
| P2-A | 1–2 | 事实合同、观察/候选存储 | shadow 收集，不改变审核 |
| P2-B | 3 | 统一候选检索与身份比较 | shadow 判定，不自动合并 |
| P2-C | 4–5 | 审核决定、任务、事务与旧入口适配 | 脱敏回放，可选择产品canary |
| P2-D | 6 | 管理界面、通知与完整兼容 | 经授权的canary验收 |
| P3-A | 7 | 回填和merge preview | 仅dry-run |
| P3-B | 8 | 幂等合并及受约束rollback | 隔离副本apply演练 |
| P3-C | 9 | 运行时、指标、发布/回滚证据 | 另行批准后才能生产发布 |

每个任务遵守：写失败测试→运行确认行为失败→最小实现→跑本任务测试＋全套→检查diff→提交。若基线已有失败，记录测试名、原因和与本变更关系；不能把未跑或失败写成通过。

## 文件与公共接口

新文件按职责拆分，不继续把全部逻辑堆入 `src/worker/index.ts` 和 `admin.ts`：

- `src/shared/identity/types.ts`：SPEC所有Zod schemas及其推导类型。
- `src/shared/identity/normalize.ts`：URL/事实规范、稳定JSON、hash。
- `src/shared/identity/compare.ts`：纯事实/关系判断，返回三态与证据。
- `src/shared/identity/decision-policy.ts`：拒绝作用范围、重开资格与任务键。
- `src/worker/identity/store.ts`：有界分页查询、别名和canonical解析。
- `src/worker/identity/commit.ts`：D1原子命令/幂等/版本保护。
- `src/worker/identity/service.ts`：统一入口，决定调用顺序和回执。
- `src/worker/identity/routes.ts`：新ingest/admin路由，复用现有权限。
- `src/worker/identity/notifications.ts`：outbox与旧回执兼容，不自己发外部请求。
- `src/worker/identity/merge.ts`：preview/apply/rollback与manifest。
- `pipeline/identity-review.ts`：已有预算内的有限模型比较工作者。
- `scripts/identity/backfill.ts`、`plan-merges.ts`、`apply-merges.ts`：明确环境的运维CLI，默认只读/演练。
- `web/src/app.js`：接入身份任务卡及旧hash路由；保持现有构建，不引入新前端框架。
- `tests/identity-*.test.ts`、`tests/fixtures/identity/`：所有新增回放和事务测试。

以下签名应在相应任务产出的模块中定义，后续任务不得自行创造同名异义接口。所有 ID 是字符串、revision为非负整数；其余字段用SPEC schemas，不用 `Record<string, any>` 逃避合同。

```ts
// types.ts：Schema推导类型，定义其余公共接口前先实现。
// CanonicalTermsV1、ResolutionResult、IntakeReceipt与SPEC同义。
interface EvidenceContext {
  observationId: string;
  fullText: string;
  truncated: boolean;
  sourceVerified: boolean;
  quoteById: Record<string, string>;
}
interface VersionedEntity {
  id: string;
  platformId: string;
  revision: number;
  publicationRevision: number;
  approvedVersionId: string | null;
  terms: CanonicalTermsV1 | null;
}
interface RetrievalPage {
  entities: VersionedEntity[];
  nextCursor: string | null;
  complete: boolean;
}
interface MutationResult<T> {
  status: 'applied' | 'replayed' | 'conflict';
  value: T | null;
}
// commit.ts的MutationPlan仅为服务端内部对象，不接收任意客户端SQL。
interface MutationPlan<T> {
  requestId: string;
  payloadHash: string;
  expected: Array<{ kind: 'entity' | 'task' | 'block'; id: string; revision: number }>;
  statements: D1PreparedStatement[];
  // statements由受控构造器生成，均绑定本次command；末尾断言也为受控SQL。
  receipt: T;
}
```

`Revision`字段命名适配现有表时保留清楚的转换，不把updatedAt当新的业务revision。版本归属与引用所属实体必须验证；跨实体versionId不能仅因外键存在就通过。

## 审查重点

1. 同产品不同资格/模型/积分池的误合并：任务3测试A09–A13。
2. 真变化不改数字，或政策恢复成曾出现过的旧版本：任务3/4测试A14–A17。
3. 查重不可用、超过top-k、抽取不完整：任务2/3/5测试A06、A18、A27。
4. 零行CAS、并发重放、SQL中途失败：任务4测试A20–A25。
5. 历史合并以后新数据/通知导致不可逆回滚：任务8/9测试A35–A43。

---

## 任务1：规范事实、比较类型与数据库基础

**文件：** 新建types.ts、normalize.ts及`tests/identity-normalize.test.ts`；修改schema.ts；新增未占用编号的migration。

**消费：** 现有offer/evidence合同，SPEC §3–4。**产出：** `normalizeTerms(input: CanonicalTermsV1): CanonicalTermsV1`、`hashTerms(input: CanonicalTermsV1): Promise<string>`、新表schema和索引。

- [ ] 先写A01、A02、A08：`10 USD`等规范后相同；rolling30天≠calendar月；unknown≠0/none；model版本不能被抹掉。
- [ ] 运行 `npx vitest run tests/identity-normalize.test.ts`，确认缺失行为失败。
- [ ] 实现Zod、规范器、强弱事实标记。scope/规则仅受控枚举，不执行模型表达式。
- [ ] 新增基础表、部分唯一索引、外键；用实际migration创建测试库。当前表事实不足则unknown，不回填猜测。
- [ ] 验证空库、旧0016库升级、重复key约束和外键；跑全套及typecheck，提交P2-A第一部分。

## 任务2：观察/候选的重放幂等与部分完成

**文件：** store.ts、routes.ts；`tests/identity-observations.test.ts`；pipeline只加shadow适配，不替换旧发布路径。

**消费：** 任务1schemas。**产出：** `recordObservation(input: ObservationInput): Promise<ObservationReceipt>`、`recordCandidates(input: CandidateBatchInput): Promise<IntakeReceipt[]>`，其输入schemas包含SPEC路由字段和requestId。

- [ ] 测A03–A07：同一正文抓10次→1观察、lastSeen更新；一页两种奖励→2候选；模型随机ID/译文不改变原始观察身份。
- [ ] 测失败后重放只处理deferred候选；超过10条显式400或客户端拆分，不能悄悄扔掉第11条。
- [ ] 原文截断、不可达、空抽取保存错误/待判断，不伪造“无福利”。正文输入和模型输出分离。
- [ ] 保存多对多lead links；来源增加不刷新官方核验。shadow只写新层诊断，不创建额外legacy审核卡。
- [ ] 跑本任务、pipeline及全套测试，提交。

## 任务3：统一召回、事实冲突和语义仲裁

**文件：** compare.ts、store.ts、pipeline/identity-review.ts；`tests/identity-compare.test.ts`、`identity-retrieval.test.ts`。

**消费：** VersionedEntity、EvidenceContext。**产出：**
`retrieveCandidates(productId: string, facts: CanonicalTermsV1, cursor?: string): Promise<RetrievalPage>`；
`compareCandidate(candidate: CanonicalTermsV1, entity: VersionedEntity, evidence: EvidenceContext): ResolutionResult`。

- [ ] A09–A19：跨语言同活动、资格/产品/模型/轮次冲突、同锚点改资格、周期变化、跨页官方变更依据不足均有明确预期。
- [ ] 人工different及产品边界在全部特例前执行。现有dedupe规则作为特征/候选，不作为能绕过统一门槛的OR短路。
- [ ] 索引包括全部状态和lead-only拒绝；校验top40分页和精确别名不可被挤掉；FTS未命中不等于全无历史。
- [ ] 加受控模型输出schema、引用核验、候选ID白名单、预算和失效缓存测试。无额度或假sameAs→持久任务/deferred。
- [ ] A17政策恢复必须比较当前版本，不因旧termsHash曾批准就自动忽略。
- [ ] `npm run typecheck && npm test`；记录召回样本及false-merge控制；P2-B交付仍shadow。

## 任务4：拒绝作用范围、任务和原子状态转换

**文件：** decision-policy.ts、commit.ts、service.ts；`tests/identity-decisions.test.ts`、`identity-transaction.test.ts`。

**消费：** ResolutionResult和所有数据库schemas。**产出：**
`commitIdentityMutation<T>(db: D1Database, plan: MutationPlan<T>): Promise<MutationResult<T>>`；
`applyResolution(candidateId: string, result: ResolutionResult, requestId: string): Promise<IntakeReceipt>`；
`evaluateReopen(decision: ReviewDecision, incoming: CanonicalTermsV1, evidence: EvidenceContext): ReopenEvaluation`。
`ReviewDecision`及`ReopenEvaluation={allowed:boolean,reasonCodes:string[],basisHash:string|null}`在types.ts严格定义。

- [ ] A20–A26先复现：相同request不同payload409；task版本竞争409；第三条SQL失败零残留；初守卫0行后audit/delete也0行。
- [ ] 实现command guard、受控batch、末尾CHECK断言回滚及applied receipt；不在数据库事务中做网络调用。
- [ ] 任务键、manualFields保护、businessRevision与lastSeen分离；发布只在明确approve后前进，outbox同事务写入。
- [ ] 拒绝paid_bundle不排除独立grant；insufficient_evidence补齐指定缺项才允许一次重开；oldother默认窄范围。
- [ ] 跨request并发同强锚点只有一个entity/task；block变化强制重新检索；不同block疑义不自动发布。
- [ ] SQLite与实际本地D1运行时都测batch行为。第二种环境不能运行时明确未验证，不声称可上线。
- [ ] 全套测试、P2-C核心提交。

## 任务5：把旧入口全部接入同一服务

**文件：** pipeline/run.ts、lead-review.ts、official-review.ts；src/worker/index.ts、admin.ts、lead-review.ts、official-review.ts；`tests/identity-adapters.test.ts`。

**消费：** IntakeReceipt、applyResolution。**产出：** 新旧API等价行为与可撤销的canary适配。

- [ ] 枚举并测试所有写入口，不能只改常规采集。旧offers批次50需按新上限10拆分，保持逐候选request映射和部分成功。
- [ ] `/manual`补链接不清resolution；显式reopen要求当前revision和理由。人工批准也必须查canonical和当前决定，不能绕过。
- [ ] offers-index检索失败不catch成[]；检索返回拒绝scope和产品边界，不泄露公开端。
- [ ] 自动/官方复核的jobId、inputVersion和新revision共存，旧token不能覆盖更新。已有审核建议不等于批准。
- [ ] 确保相同duplicate明确终态且所有未解决候选保留，重跑不重新搜索已完成项。
- [ ] 对P1和现有lead-scope/估值用例全回归；shadow/enforce=off旧行为受控保持，提交。

## 任务6：身份任务界面、公开投影、通知兼容

**文件：** routes.ts、notifications.ts、admin.ts、worker/index.ts、web/src/app.js；`tests/identity-ui.test.ts`、`identity-notifications.test.ts`。

**消费：** review_tasks/decisions/events、canonical路由。**产出：** `resolveCanonicalOffer(offerId: string): Promise<{offerId:string,entityId:string|null,generation:number}>`以及统一界面/发送前校验。

- [ ] A28–A31：一任务多来源；新来源不改变reviewRevision；过期卡片409；未授权不能merge/reopen。
- [ ] 卡片展示“新活动/条款变更/补足证据/身份不明”，对照旧决定、关键事实、原文、来源和只读人工字段；每次决定有预览和revision。
- [ ] 旧#offer-ID用前端replaceState转canonical；所有列表/统计/RSS/详情按同一公开资格过滤，非公开返回404。
- [ ] outbox事件按publicationRevision，不按抓取日期；结果不明继续阻止发送，不从未知状态自动release。
- [ ] 无真实webhook做UI/通知回归；`npm run typecheck && npm test && npm run build:web`。
- [ ] P2-D交付提供影子回放报告和canary开关说明，不自行开启生产。

## 任务7：历史独立回填与合并预览

**文件：** scripts/identity/backfill.ts、plan-merges.ts、store.ts；`tests/identity-backfill.test.ts`、`identity-merge-plan.test.ts`；新增merge表迁移。

**消费：** Phase2服务及批准的离线snapshot。**产出：** `buildMergePlan(input: MergePreviewInput): Promise<MergePlan>`；MergePlan必须包含SPEC §10.2全部字段和planHash。

- [ ] A32–A34：每oldoffer先独立entity，不猜合并；lead拒绝不丢；缺证据保留unknown。100行分页中断/续跑两次完全一致。
- [ ] 导出manifest包含snapshotHash、代码/规则版本、high-water marks、counts。无环境/无批准输入必须退出而非连接默认生产。
- [ ] 预览最多10组×10实体，超额显式oversized；管理员对精确planHash批准。
- [ ] 复杂人工决定/估值/两个proposal差异均进冲突清单；不能只按approved或最高金额选主。
- [ ] 尚未回填offer公开行为不消失；canary前要求该产品所有状态对账成功。
- [ ] P3-A仅预览，交付脱敏示例和证据，不能执行生产apply。

## 任务8：逻辑合并、通知继承和反向操作

**文件：** merge.ts、apply-merges.ts、notifications.ts；`tests/identity-merge.test.ts`、`identity-rollback.test.ts`。

**消费：** 已确认MergePlan、commitIdentityMutation。**产出：**
`applyMerge(plan: MergePlan, requestId: string): Promise<MergeReceipt>`；
`rollbackMerge(operationId: string, expectedRevision: number, requestId: string): Promise<RollbackReceipt>`。
Receipt使用applied/replayed/conflict，附operationId、before/after版本和冲突项；定义于types.ts。

- [ ] A35–A43：完整计划原子、任意revision变更整组409、主记录不可见不泄露、环/人工different禁止。
- [ ] 保存manifest和原offerId审计；不移动/删除历史reviews/revisions/deliveries。所有热读使用canonical等价关系。
- [ ] 相同proposal归一task，不同proposal保留冲突；approval基线变化不能强行套旧diff。
- [ ] 通知继承只在同实体/轮次/版本映射确定时去重，unknown不伪sent；原发送payload字节不变。
- [ ] 合并后无新业务写入可受版本保护rollback；新审核/发送/证据无法归属时rollback_conflict，绝不覆盖新数据。
- [ ] dry-run默认；apply要明确非生产环境、精确planHash与授权。P3-B只在隔离数据副本演练。

## 任务9：验收、运行预算和兼容回滚包

**文件：** ACCEPTANCE要求的回放fixture、metrics输出、operations/data-contract/docs索引；必要的CI测试配置只读权限。

- [ ] 为所有A01–A45保存自动测试名、命令、结果、失败前证据；用真实本地D1验证SQLite模拟器之外的行为。
- [ ] 按至少60个标注pair做冻结语义回放，公开precision/recall/uncertain，不调测试标签迎合实现。
- [ ] 记录rowsRead、rowsWritten、查询数、模型tokens/cost和重试积压；无预算扩张、无全表热路径。
- [ ] 保存兼容回滚版本：identity写入off仍保留canonical读过滤。merge启用后不得直接回退不认识alias的旧Worker。
- [ ] 输出最终代码diff、测试摘要、未验证项、迁移顺序和生产操作清单。到此停止，不代替管理员发布或执行数据计划。

## 每个增量的完成记录模板

```
任务 / PR：
基线 / HEAD：
修改文件：
失败测试（命令、实际断言）：
修复后本任务 / 全套 / typecheck / build结果：
D1运行时核验：已验证 / 未验证及原因
迁移和兼容影响：
未解决项 / 风险：
生产操作：未执行
下一任务输入：
```

事实源永远是仓库和实际运行结果。继续工作前读该记录及git log，已经完成的第一阶段修复不得重复实现。
