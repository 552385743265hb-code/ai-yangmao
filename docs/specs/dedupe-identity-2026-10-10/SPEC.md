# AI 羊毛牧场：活动身份、拒绝记忆与历史去重 SPEC

版本：1.0 · 2026-10-10  
状态：供 Codex 实施的设计规格；第二、三阶段尚未实现。  
代码基线：`accesaver-byte/ai-yangmao@7cea69d95d2c27e2c1ebd7641a94bab2a696901d`，实施前须包含第一阶段 PR #2 的代码或等价修复，并重新检查最新 main。  
配套文件：`IMPLEMENTATION.md`（任务与文件接口）、`ACCEPTANCE.md`（验收、迁移、回滚）、`CODEX-HANDOFF.md`（执行入口）。

## 0. 目标、授权与决策

目标：同一个现实优惠可以被重复发现、增加证据，但同一待审事实转换不再重复创建 offer、审核任务或通知；真正改变条款、独立发放轮次或补足拒绝原因的新证据仍能进入正确流程。

第一阶段 PR 只修复三个明确缺陷：初抽将已识别 duplicateId 当失败回队；同数字发放周期变化被抹去；拒绝提案时记忆、审计与删除不原子。它不提供完整跨语言身份系统，不解决所有资格误合并或历史数据清理。

本 SPEC 授权边界：开发、测试、生成迁移与 dry-run 计划；不授权生产数据库读写、部署、主分支合并、外部消息发送、预算增加或历史自动合并。即使本地已有令牌，也不得扩权。生产导出和 staging/production 发布分别使用用户明确批准的环境；不能默认连接 `API_BASE` 的生产兜底地址。

技术决策：继续使用 TypeScript、Hono、Drizzle、Cloudflare Worker / D1、Node 24 与现有 Vitest / SQLite 集成测试。不先引入外部向量数据库、消息平台或新的付费模型。不重写网站。采用“来源观察—活动实体—条款版本—审核决定”的增量层；`offers` 保留为兼容公开展示的投影，`offer_proposals` 保留为人工更新编辑区。

方案比较：只增补正则或提示词不能统一状态与历史；只接向量检索不能保证资格、周期或并发正确；本方案先实现持久身份和事务状态机，词面召回＋受控模型判断解决跨表达问题。向量召回仅是后续可替换优化，不是本项目验收的前提。

## 1. 现状与必须兼容的入口

仓库事实以实现和现役合同为准：

| 入口 / 模块 | 当前职责 | 本阶段变化 |
|---|---|---|
| `pipeline/run.ts` | 官方抽取、初抽、sameAs、结果处理 | 收集 observation/candidate，消费逐候选终态；不直接决定业务身份 |
| `pipeline/lead-review.ts` | 搜索补证、受阻线索复核 | 新证据回到同一解析入口；不得凭同产品名关联其他活动 |
| `pipeline/official-review.ts` | 已有草稿或提案官方补全 | 使用实体、版本及任务令牌，不创建平行 offer |
| `src/worker/index.ts` | `/ingest/offers`、索引、核验、公开查询 | 兼容适配器＋身份服务；核验健康与内容版本分离 |
| `src/worker/admin.ts` | 审核、编辑、manual、通知任务 | 所有写入口调用同一决策服务；人工补来源≠重新审核 |
| `src/worker/lead-review.ts` | 复核 claim/result | 检查候选及版本关联；保留已完成候选 |
| `src/shared/dedupe.ts` / `lead-scope.ts` | 别名、来源范围、局部硬判 | 转为候选召回/证据特征；不能从旁路绕过统一冲突检查 |
| `src/shared/review-stability.ts` | 官方事实变化判断 | 结构化三态比较；旧证据保护保留，不放宽为任意 URL 可信 |
| `src/shared/spec.ts` / `valuation.ts` | 上架字段与估值合同 | 保留准入、人工估值、公开字段过滤，身份服务不得代替它们 |
| `leads` / `offers` / `reviews` / `offer_revisions` | 现有记录 | 不破坏旧 ID、历史审计和人工字段 |
| `notifications` / `deliveries` | 发送回执及结果不明占位 | 按 canonical identity/version 查重，保留实际发送历史 |

特别保留 main 的 `sameEvidenceBenefit`、Mistral 原文别名回归、`lead-scope` 发放方边界保护，以及重置不同轮次、不同设备代际、不同产品/模型/积分池的现有测试。不得用“同母公司”将不同产品合并。现役 `docs/data-contract.md`、`pipeline/learned-rules.md` 和 `AGENTS.md` 的收录口径保持有效。本 SPEC 只在明确列出的身份/审核机制上扩展，不修改什么叫“可收录羊毛”。

## 2. 必须始终成立的不变量

I01 同实体、同一待审转换（base→target）只对应一个当前审核任务；增加来源不增加任务。  
I02 新网页、新抓取日期、新模型 ID、新语言、新措辞不构成新活动或政策变化。  
I03 同平台、同 URL、同金额、同标题均不足以单独硬合并。  
I04 同一页面可有多个独立优惠；每个候选单独归属、拒绝或重试。  
I05 识别重复是成功终态；没有明确归属的 skipped、技术失败、未知不是成功。  
I06 approved 投影仅在明确批准新版本时改变；模型不得静默覆盖人工编辑、估值、tested、adminNote。  
I07 rejected 决定有主体、版本、理由、作用范围和重开条件；来源改写不能清除决定。  
I08 抓取/搜索/预算故障不是“不存在历史”或“不符合收录”，不得 fail-open 新建上架。  
I09 审核决定、版本状态、投影/任务和通知事件在同一守卫事务提交；零行守卫不能继续删除。  
I10 并发相同请求返回相同处理回执；同事实不同请求不能突破已知身份唯一约束。  
I11 发现时间、抓取时间、条款生效时间、官方核验时间彼此独立。社区转述不刷新 lastVerifiedAt。  
I12 不确定身份不能靠提高相似度阈值伪装成确定；A≈B、B≈C 不推出 A=C。  
I13 历史合并不删除原始记录、不伪造通知成功、不自动重新发布被拒条目。  
I14 旧 URL/ID 可定位到主记录，但不能泄露拒绝、内部理由或未准入平台内容。  
I15 所有判定可回溯到证据、算法/规则版本和人工决定；缓存不能覆盖后来的人工操作。

## 3. 概念边界：身份不等于版本

### 3.1 Entity / occurrence / source

实体是一个独立可领取的优惠机制或一次独立发放。常驻计划跨日/月正常刷新仍是一个实体。官方额外重置、独立兑换码、下一年度申请批次等仅在证据明确独立时构成新的 occurrence 实体，并可用 `seriesId` 关联同系列。公告、预告、确认和进度帖都可以描述同一 occurrence。

平台使用实际发放产品的 `platformId`。必要的母公司/别名表只帮助解析产品，不代表权益共用。第三方提供某模型与模型厂商自己提供额度是不同实体。地区、客户端或资格有时区分同时存在的独立活动，有时是同一活动的条款变更：必须结合活动锚点及证据判断，不能一律放进不可变哈希或一律忽略。

服务端生成实体 ID。现有 offer ID 保持可用；模型的 `key` / `sameAs` / `sameOccurrenceAs` 只是待验证提示，不具有覆盖权。

### 3.2 强锚点与弱线索

可作为强锚点：已审核 legacy-offer 别名；发放方明示的 campaign/program/redeem ID＋实际产品＋独立领取子项；人工确认的活动对应关系。锚点必须保存出处和确认人/规则，不采纳模型空口生成的 campaign ID。

不可单独作为强锚点：普通价格页 URL、整页 hash、文章 ID、平台名称、同金额、发布日期、近似标题、向量高分、模型同义判断。一篇固定帖子也可能含多项福利，必须带领取机制/子项范围。

### 3.3 事实与展示分开

展示文字用于阅读，不能充当 canonical facts。条款最低结构如下；由 Zod 定义 schema，运行时严格验证。

```ts
type Fact<T> =
  | { state: 'known'; value: T; evidenceRefs: string[] }
  | { state: 'unknown' }
  | { state: 'not_applicable'; evidenceRefs: string[] };

type Cadence =
  | { kind: 'once' }
  | { kind: 'calendar'; unit: 'day' | 'week' | 'month'; count: number; timezone: string | null }
  | { kind: 'rolling'; seconds: number }
  | { kind: 'per_action'; action: 'signup' | 'login' | 'referral' | 'verification' | 'other' };

interface CanonicalTermsV1 {
  schemaVersion: 'terms-v1';
  issuerProductId: Fact<string>;
  mechanism: Fact<'signup_grant' | 'recurring_quota' | 'referral' | 'identity_grant' |
    'trial' | 'temporary_free_access' | 'extra_reset' | 'application_grant' | 'other'>;
  benefitPools: Array<{
    poolKey: string; // product-scoped, proof-backed; unknown pools not invented
    amount: Fact<{ value: string; unit: string; currency: string | null }>;
    cadence: Fact<Cadence>;
    models: Fact<string[]>;
    modalities: Fact<string[]>;
    creditValidity: Fact<{ kind: 'duration' | 'absolute' | 'no_expiry'; value: string | null }>;
  }>;
  eligibility: Fact<{ audience: 'new' | 'old' | 'all'; requirements: string[] }>;
  geography: Fact<string[]>;
  claimChannels: Fact<string[]>;
  costs: Fact<{ upfrontAmount: string; currency: string; subscriptionRequired: boolean;
    autoRenewal: boolean | null }>;
  claimWindow: Fact<{ startsAt: string | null; endsAt: string | null; timezone: string | null }>;
  occurrenceAnchor: Fact<string>;
}
```

数值用规范十进制字符串，禁止浮点金额错误；`10`、`10.00`统一为`10`。1M/100万等只能在原文单位与乘数明确时统一。币种不明的 `$` 不能自动认作 USD。平台 credits 保留 platform/pool 命名空间，不与 tokens 或其他平台积分互换。免费额度的周期与限制不可丢失；滚动30天不等同自然月。集合排序去重但保留模型版本、模式、地区和付费档位。明确 unlimited 用独立枚举扩展，不伪造数字0或Infinity。

未知不等于0、none、all或无期限；未出现资格不能默认人人可领。新证据未提及旧限制不代表限制取消。首次增加某字段事实是“补足”而非必然改变原政策；影响使用资格/风险时进入一次 evidence/terms 核对任务，不静默发布。

`termsHash = SHA256('terms-v1\n' + stableJson(规范事实，去除 evidenceRefs))`。仅用于完整一致版本的精确去重。部分字段缺失的新候选不得凭新 hash 自动生成新版本；先与原版本逐槽比较。`sourceHash`、`termsHash`、`entityId`与`valuation`不得混用。

同活动可能先100/日、后100/月、再恢复100/日；最后一步可复用旧事实version，但不是“当前条款未变”。与currentApprovedVersion比较，创建带base/target版本的变更任务；批准事件记录publicationRevision和对应decision，不能因历史出现过这个termsHash而吞掉恢复政策。版本state仅是索引摘要，完整生效/审核时间线以决定与发布修订为准。美元估值是已审数据，不纳入活动身份，不以重算估值重开收录审核。

## 4. 数据模型（新增层，避免破坏现有表）

下表字段为逻辑合同；所有 JSON 在入口校验，日期用 UTC ISO，修订号用递增整数。引用必须建立外键、索引和非空/枚举 CHECK。后续新迁移使用最新未占用序号，不覆盖第一阶段0016。

| 表 | 最小字段与约束 |
|---|---|
| `source_documents` | id；original_url；url_key UNIQUE；first_seen_at、last_seen_at；issuer_hint 可空。URL只是文档身份 |
| `source_observations` | id；document_id FK；content_hash；text；text_truncated；fetch_kind；final_url；observed_at；last_seen_at；trust_json；UNIQUE(document_id,content_hash,fetch_kind)。只更新重复观察的last_seen |
| `intake_candidates` | id；observation_id FK；extraction_version；span_key；candidate_key UNIQUE；raw_candidate_json；facts_json；facts_hash；state；entity_id/version_id/decision_id/task_id 可空；attempts、next_attempt_at、last_error、revision |
| `lead_candidate_links` | lead_id、candidate_id，联合主键；一条线索多个候选，一候选多个来源线索 |
| `benefit_entities` | id；platform_id FK；canonical_offer_id 可空且UNIQUE FK offers；series_id 可空；current_approved_version_id 可空；state(active/merged)；merged_into 可空；business_revision；publication_revision；first_seen_at、last_seen_at |
| `benefit_versions` | id；entity_id FK；terms_schema；terms_hash；facts_json；display_candidate_json；state(pending/approved/rejected/superseded)；base_version_id；revision；created_at；UNIQUE(entity_id,terms_schema,terms_hash) |
| `entity_observations` | entity_id、candidate_id联合主键；relation(same/changed/evidence_only)；resolver_version；reason_json；created_at |
| `identity_aliases` | id；namespace；alias_key；scope_key；entity_id FK；basis_json；status(active/revoked)；revision。对active(namespace,alias_key,scope_key)设部分唯一索引 |
| `review_decisions` | id；entity_id或candidate_id至少一个；version_id可空；action；reason_code；scope_json；reopen_policy_json；rules_version；evidence_refs_json；actor；base_version_id/target_version_id可空；idempotency_key UNIQUE；supersedes_id可空；created_at。追加式不可改旧结论 |
| `review_tasks` | id；task_key；kind(identity/initial/terms_change/evidence_reopen/merge_conflict)；entity_id可空；version_id可空；state(open/checking/manual/resolved/cancelled)；revision；lease_token、lease_until；decision_id可空。对未结束task_key设部分唯一索引 |
| `task_candidates` | task_id、candidate_id联合主键；保留全部来源，不把它们合并成一份不可追溯文本 |
| `identity_constraints` | entity_a、entity_b（按ID排序）或task/candidate pair；relation(same/different)；basis_json；actor；revision。人工different是硬否决，不能由相似度覆盖 |
| `identity_blocks` | block_key主键；revision整数。并发解析提交的乐观锁，不是语义身份 |
| `identity_commands` | request_id主键；payload_hash；state(staged/applied，CHECK)；result_json；created_at；entity/block expected revisions。回执与业务事务共同提交 |
| `identity_events` | id；event_key UNIQUE；entity_id、version_id、task_id可空；kind；payload_json；status(pending/delivered/blocked)；created_at。接现有通知基础设施，不新增外部发送服务 |

索引至少包含：entities(platform_id,state)、versions(entity_id,state)、candidates(state,next_attempt_at,id)、decisions(entity_id,version_id,created_at)、tasks(state,kind,id)、observations(document_id,observed_at)、aliases(entity_id,status)。不在热路径加载全站 offers/reviews/deliveries；候选检索必须分页和有界。

新实体可以没有 offer，例如明确不收的线索；此时拒绝决定仍可永久检索，不能为了记住拒绝而创建公开羊毛。创建可展示草稿时，先插实体且canonical_offer_id=null，再建offer，最后关联；所有操作一事务完成，避免循环外键问题。approved_version指针同理在版本插入后设置。

现有 `reviews` 保留供旧准确率页面，作为新决定的兼容投影；添加nullable `decision_id`唯一引用以防重复投影。第一阶段`rejected_offer_updates`保留、回填为version级拒绝决定，不删除老拦截依据，双读直至验收。

## 5. 观察与候选入库

### 5.1 URL与原文

复用并收紧现有normUrl：只删除明确跟踪参数；保留id、lang、plan、code等内容参数；统一已知www和X/Twitter别名需测试。fragment只有在已验证不定位不同权益时才去掉；记录原URL和最终URL，跨域redirect不自动继承信任。规范算法带版本，不能改完直接覆盖旧url_key；通过别名迁移。

正文仅由抓取器输入；模型不能提供可信sourceText、测试等级或抓取元数据。储存可审计正文最大250,000字符，超长设truncated并保留完整内容hash及原URL；截断不能用来证明旧条款已消失。hash基于原始抓取正文，不因生成中文摘要变化。

保留原语言摘录和可定位span/quote ID。译文是展示/检索辅助，不冒充官方逐字证据。外部页面中的指令全部当数据，不允许它们设定sameAs、approve、删除记录或更改抓取白名单。

### 5.2 逐候选状态

状态：`received → resolving → resolved_same | resolved_rejected | pending_initial | pending_change | pending_identity | deferred`。故障保存原因、重试时间，不使用业务rejected代替。候选从一个可重试状态重入必须带revision/lease token，失效工作者写回返回409。

`candidate_key`对同一观察内的原文子项/跨度、mechanism和extraction_version去重，不含生成标题和随机ID；抽取策略变更可产生新候选，但必须重新经过实体解析，不能自动重建offer。该key只是重放幂等，不声称能识别所有跨语言活动。

线索完成条件：全部候选已关联到确定结果或持久任务，且抽取完整性已确认。零候选只有在原文可读、非截断且有合规非福利依据时才业务关闭；模型空结果/部分失败不把重要线索吞掉。关闭线索的审计包含所有candidateIds；`leads.offerId`继续仅作首个关联的兼容字段，不能代替多对多表。

## 6. 统一身份解析器

解析器输出与证据结论分开；输出不得含任意SQL、脚本或可执行工具请求。

```ts
type IdentityRelation = 'SAME' | 'DISTINCT' | 'UNRESOLVED';
type TermsRelation = 'EQUIVALENT' | 'CHANGED' | 'INSUFFICIENT';
interface ResolutionResult {
  relation: IdentityRelation;
  entityId: string | null;
  termsRelation: TermsRelation;
  matchingVersionId: string | null;
  evidenceRefs: string[];
  conflicts: Array<{ field: string; before: unknown; after: unknown; evidenceRefs: string[] }>;
  reasonCodes: string[];
  retrievalComplete: boolean;
  resolverVersion: string;
  rulesVersion: string;
}
```

### 6.1 检索顺序与范围

第一轮：已确认legacy/official alias精确查；然后实际产品与mechanism/pool的结构化候选；再平台内标题/历史别名/已知事实的FTS5＋中文规范分词或bigram召回。所有状态均纳入：approved、pending、rejected、ended、withdrawn、merged别名、只有lead的拒绝决定。

默认最多40个实体候选用于排序，模型最多比较8个；精确别名不受top-k挤出。超过上限置retrievalComplete=false并分页扩展/排任务，不得当作没有历史。产品不明先保留身份任务，不全库模糊合并。跨平台只查明确的产品别名/人工关联和实际发放方证据，不扫同母公司全部权益。

索引可由实体、规范版本、别名和拒绝决定构建；拒绝记录不能在第N天或最近10条窗口外消失。FTS未及时更新时，精确别名和结构化主表仍是可信路径；检索失败记deferred，不把异常转换为[]。热路径先按产品过滤，无LIKE超长输入、无超100绑定参数查询。

### 6.2 判定规则

按顺序执行：人工different约束→产品/发放方边界→锚点和轮次→事实/证据比较→必要的模型仲裁。冲突检查必须位于所有词面和特例规则之前，不能在某个特例返回false后又被标题分支合并。

已知产品、独立积分池、同时存在的资格活动或不同轮次冲突，不能自动SAME。相同可信活动锚点下金额、周期、截止或资格发生明确替换，应是SAME+CHANGED，而不是DISTINCT。只有字符串不同但没有证据区分时，UNRESOLVED，不当作已知冲突或已知相同。

EQUIVALENT：身份已确定；已知关键事实没有冲突；新候选的范围能映射到现有权益；省略字段不抹除现有事实。仅有“免费额度”这种过短候选不能证明完整范围一致。模型遗漏了某个池时可以关联来源但不能据此缩减主记录。

CHANGED：身份已确定且有可信对应原文证明实质变化。金额、单位、周期、有效期、适用对象、费用/自动续费、模型和实际领取渠道都可为重要变化。旧句仍存在但官方明确宣布新版本并注明生效日时也可判变；不能仅靠“旧句消失”或“两个数字不同”。新官方URL须通过发放方校验并证明它更新同一活动；不是自动可信。

INSUFFICIENT：原文不可用/截断、证据矛盾、旧事实缺基线或只有措辞漂移。不要恢复“全部变化直接重审”，也不要用false静默吞掉有新依据但关系不明的案例。进入一次有条件的identity或evidence任务。

### 6.3 模型使用约束

用现有pipeline LLM与预算预留接口；不额外创建不限额模型调用。输入为脱敏的候选、有限历史实体、拒绝理由范围和原文证据。输出必须通过schema、entityId存在检查、来源范围及引用逐字核验；`sameAs`只能从服务器提供的候选集合选择。

自动合并需要强锚点或独立证据＋结构化无冲突，不能只靠LLM自报0.99。无法达到要求时创建/复用一张identity任务，让人第一次确认；确认后固化别名、约束与决定，下次不再花同样成本。长官文/提示词注入/无预算时降级到持久任务，而非自动批准或永久拒绝。

决策缓存键至少包含候选factsHash、entity业务revision、证据basisHash、resolverVersion和rulesVersion；人工edit/reject/split/alias revoke必须使旧缓存失效。不能缓存“预算超限因此NEW”。

## 7. 审核决定、拒绝范围与重开

| reason / scope | 必须记住 | 允许重开的证据 | 禁止的重开理由 |
|---|---|---|---|
| duplicate / entity_alias | canonical entity以及已确认关联 | 人工撤销错误关联或独立轮次证明 | 换来源/标题/ID |
| paid_bundle、ordinary_discount、not_ai / scoped_mechanism | 产品＋被排除机制＋规则版本，不扩大到全平台 | 真正独立免费grant或用户修改收录政策 | 多语言转述、相同套餐“加赠”修辞 |
| insufficient_evidence / version_or_claim | 当时缺的具体证据槽位 | 能补足该槽位的可信官方原文/管理员实测 | 新的社区重复报道 |
| vague / version_or_claim | 缺失额度/资格等字段，不把未知变成0 | 对缺项提供可核实数值或适用条件 | 抽取模型换措辞 |
| expired / occurrence | 对应独立轮次的截止 | 新轮次锚点和时间条件 | 新抓取日期、重发旧公告 |
| wrong_platform / claim | 错误归属及正确产品（已确定时） | 纠正归属后复核，不复制旧活动 | 为避拒绝而改随机platformId |
| other / observation_only默认 | 原始理由和具体候选 | 人工确认扩大或重新打开 | 自动推导全平台黑名单 |

拒绝范围以受控结构保存，不让LLM写任意条件表达式执行。默认`exact_version/claim`；扩大到mechanism须管理员确认，预览可能受影响记录。不允许自动永久屏蔽某个平台。多个active决定冲突时，遵循显式supersedes；没有明确覆盖关系则建一次manual任务，不自行选择最近文字最相似者。

重开创建新的任务/决定版本，旧拒绝记录不删。证据补足但事实未变时，任务键含`entityId + refusedDecisionId + missingFactSet + basisHash`；相同已审证据重复出现不重开。basisHash由对应缺项的可信原文＋事实生成，不由整页hash/抓取时间生成。重开获得批准前，已批准公开版本不变；原来完全拒绝的实体仍不公开。

## 8. 任务、事务、幂等与并发

### 8.1 稳定任务与通知键

确定实体任务：`initial:{entityId}`、`terms:{entityId}:{baseApprovedVersionId}:{targetVersionId}`、`evidence:{entityId}:{refusalDecisionId}:{basisHash}`。未确定身份任务使用稳定clusterId；候选通过已确认锚点或有证据的等价关系加入，不按标题生成新key。不能证明同簇时允许多张待核对任务，但不能宣称任意语义输入已全局唯一。人工合并任务后永久保留关联；不得无约束传递相似度。

任务business revision只在所审事实/决定发生变化时递增；抓取last_seen、排名、健康刷新、reviewMemo变化不产生新任务身份或重复提醒。任务租约20分钟，使用随机token＋revision；失败/超时可重试，但同token结果重放幂等。

通知事件：`review:{taskId}:{reviewRevision}:{channel}`和`offer:{entityId}:{publicationRevision}:{stage}:{channel}`。source观察不产生“新上架”；首次实际批准产生new；同实体后续实质变更批准产生changed。publicationRevision仅在一次有效批准事务中递增，重复提交或补来源不能递增。发送前再次检查当前canonical、版本、权限和占位。沿用deliveries的pending/unknown不自动重发规则，不能承诺外部系统exactly-once。

### 8.2 事务合同

每次mutation携带客户端requestId和payloadHash，同key同内容返回原回执，同key异内容409。不是把D1多个await当事务。使用D1 prepared `batch()`完成：

1. 首条在预期entity/task/block revision仍一致时插入唯一`identity_commands` staged行；若已applied直接读旧回执，若版本不符则后续全部no-op。
2. 本批所有UPDATE/INSERT/DELETE均WHERE EXISTS本次staged command，并保持同一expected主体/版本。
3. 同批写决定、版本、投影、task关闭/创建、关系、legacy review投影、outbox。
4. 最后一条验证所需行数/关联不变量，并将command状态变applied、保存result_json。首守卫未插入时，本条也必须零行，不写入新的command；首守卫已插入而不变量未满足时写入不合法state，使CHECK失败回滚整批；不能批结束后发现零行但已经部分提交。
5. 只在applied回执存在时返回成功。零行首守卫返回409；SQL/资源错误返回可重试错误，不业务关闭候选。

模型调用/网络抓取在事务外完成；事务内只做短SQL。代码要有统一`commitIdentityMutation`，业务入口不得各复制一套半事务。用SQLite注入失败验证rollback，再用实际D1运行时验证batch、RETURNING和CHECK行为。第一阶段decisionKey可以兼容保留，但不能当跨请求幂等key。

### 8.3 并发语义解析

强锚点通过数据库唯一alias约束；相同观察通过observation/candidate key约束。没有强锚点时，按`actualProductId + mechanism`建立identity_block revision；机制不明使用product-wide block。模型分析记录block revision，提交前必须重新读取完整候选集合并验证同一revision；一个新实体提交递增block，另一个请求必须重新召回/解析，而不是直接换ID插入。

若产品纠正或涉及多个block，按字典序检查所有block并在同一事务更新；任一revision变动整批重试。基于错误抽取分到不同block的语义重复不能被锁神奇消除；存在疑义时只创建身份任务，不自动发布。V1不引入跨平台全局模型锁或额外Durable Object；对未知产品使用待分类任务。

## 9. API与兼容契约

新路由名称是待实现合同，不代表当前可调用。

| 路由 | 角色 | 契约 |
|---|---|---|
| POST `/api/ingest/observations` | ingest | 有限正文、URL、可信抓取元数据；返回observationId与去重回执，不创建offer |
| POST `/api/ingest/candidates` | ingest | requestId、observationId、每候选inputId与原文引用；每次最多10候选，返回逐条结果 |
| GET `/api/ingest/identity-candidates` | ingest | product/机制过滤＋cursor；包含所有历史状态和scope，受限字段，无内部客户数据 |
| POST `/api/ingest/identity-tasks/:id/claim` | ingest | lease＋revision；不授予approve/merge权限 |
| POST `/api/ingest/identity-tasks/:id/result` | ingest | schema结果、证据、expected revision；只能建议或关联已证实对象 |
| GET `/api/admin/identity/tasks` | reviewer/admin | cursor分页；每任务一张卡，显示事实冲突与决定 |
| POST `/api/admin/identity/tasks/:id/resolve` | reviewer/admin | same/distinct/new/reopen建议处理，强版本检查；历史实体合并另需admin |
| POST `/api/admin/identity/decisions/:id/reopen` | admin | 显式理由、新basis、expected revision、requestId |
| POST `/api/admin/identity/aliases/:id/revoke` | admin | 撤销错误别名，保持历史审计；不自动拆已合并数据 |
| POST `/api/admin/identity/merges/preview`、`/apply`、`/rollback` | admin | 第三阶段计划合同；禁止ingest调用 |

逐候选回执：

```ts
interface IntakeReceipt {
  inputId: string;
  candidateId: string;
  canonicalOfferId: string | null;
  entityId: string | null;
  versionId: string | null;
  decisionId: string | null;
  taskId: string | null;
  outcome: 'duplicate_approved' | 'duplicate_pending' | 'duplicate_rejected' |
    'created_pending' | 'proposed_update' | 'needs_identity_review' | 'evidence_reopen' | 'deferred';
  retryable: boolean;
  reasonCodes: string[];
}
```

request成功不代表全部候选解决；网络失败重放同requestId；部分成功仅重试deferred的candidateId。未知skipped不再作为协议。旧`/ingest/offers`在过渡期作为adapter，仍返回旧id/duplicateId等兼容字段，但内部必须走统一服务；不能旧入口绕过新拒绝记忆。manual补来源只add observation/link，除非明确reopen且权限/版本合规，否则不把linked/rejected置new、不清resolution。

公开列表只输出canonical且approved且平台准入的offer；详情访问旧ID返回canonical公开offer并带`requestedOfferId/canonicalOfferId`。前端hash路由自行replaceState；URL的#fragment不会自动变成服务端301请求。公开响应仍过滤reviewMemo、内部reason、模型trace等。使用响应schema版本更新缓存键；重复数量下降不应留下旧缓存重复卡片。

## 10. 第三阶段：历史回填与合并

### 10.1 先回填，后合并

第2阶段通过后先为每条现有offer建立独立entity（不猜重复），为当前已批准事实建立legacy版本并记录证据缺失程度。仅lead的reject建立claim/candidate决定；缺少结构化理由的历史决定默认observation_only并待分类，不能扩成全平台排除。现有rejected updates转换为特定版本/claim拒绝，保留原始行。

离线输入使用用户批准的脱敏快照；记录snapshotHash、来源数据库标识、代码SHA、rules/resolver版本和high-water marks。不提交数据库、私钥、raw客户数据到Git。回填100条一页，按稳定ID cursor、lastProcessedId、输入hash持久checkpoint；中断后幂等续跑。快照之后的增量通过双写和最后对账处理，不假定线上数据冻结。

### 10.2 生成可审阅合并计划

候选只用于提议，不自动merge。每组计划必须列出：所有offer/entity ID、选择的canonical及理由、same/distinct证据、已知冲突、拒绝范围、各自待审提案、别名、关联lead、公开变化、通知sent/pending/unknown、估值/人工字段差异、expected revisions、执行顺序、回滚影响。

canonical建议：已明确人工确认的主记录优先；其次有可信已批准版本且能维持原公开链接的记录；再以人工质量和原发现时间确定稳定选择。不能仅按最新updatedAt、最高usd或approved优先掩盖冲突。两条approved的实质条款不同、有不同独立轮次、互斥资格、不同模型/池，或同版本有相反人工决定，进入merge_conflict，不自动采用多数/最新。

计划内容stableJSON hash为planHash；管理员批准具体planHash及snapshot/revision，不批准“以后发现的所有相似记录”。默认每次预览最多10个组，每组最多10实体；超过上限显式返回oversized，不静默截断或把大事务拆成半可见合并。

### 10.3 逻辑合并优先，不删历史

新增`merge_plans`（plan JSON/hash、批准人、状态、快照、revision）、`merge_operations`（幂等命令、before/after manifest、回滚状态）和`merge_members`（旧entity、canonical、操作id、expected/post revisions）。

合并事务只改变canonical路由/active关系，保留原offer行、原始offerId和审计内容。历史reviews、offer_revisions、rejected_offer_updates及已发delivery payload不改写；读取历史时通过canonical等价集合汇总，同时明确原offerId。这样避免大批历史FK搬迁与旧证据被“改成看似属于主记录”。

对需要路由的可变对象统一加`resolveCanonicalOffer()`：leads.offerId及resolution.offerIds在读取时归一、在新写时保存canonical，同时保留origin字段；legacy值逐批物化不是合并成功前提。所有公开列表和统计必须排除merged实体，不能只改详情页。尚未回填entity的旧offer在过渡期仍按旧准入/approved条件显示，不能INNER JOIN后整批消失；开启某产品enforce前，必须完成其全状态回填与对账。canonical不存在、形成环、跨产品未经批准、触及人工different约束、任一版本变化都拒绝整组。

多个proposal不得直接覆盖：等价候选合一张task并保留每个来源草稿；不同候选进入merge_conflict，保留主记录公开版本。legacy proposal可留原offerId，只有canonical task承载审核入口；批准时需知道其base版本，旧基线变了必须重新比较，不直接apply旧diff。

### 10.4 通知与旧链接

通知回执按合并等价集合取并集，不伪造sent。任一等价活动同版本已发new则合并后不得再次发new；terms changed按规范version/hash对应，不使用不同offer的revision数字强行对齐。pending/unknown实际发送未确认时继续阻止相关事件重发，并建运维任务；不自动release。

sent历史payload原封保留；未发的任务可取消旧路由并创建唯一canonical事件，但同一事务保存取消原因/新事件对应，发送器claim时再校验当前canonical generation。已发结束/临期只有确定同一轮次/窗口才继承，未知映射保守阻止并人工确认。

旧#offer-ID、API详情与人工短码都能解析到canonical；短码碰撞仍要求完整ID。公开canonical不可见时旧ID也返回404，不能绕过拒绝/平台准入。source观察本身不进入RSS。统计按canonical实体去重，保留原活动时间，不把历史合并日期当新优惠发布日期。

### 10.5 执行与回滚

每组执行前从主库核对planHash与所有expected revisions，检查在途任务/通知和权限。用统一command batch写merge操作、所有alias/member状态、任务路由、审计和通知事件，最后断言没有环/孤儿/重复active键；失败整组回滚。多组之间可独立完成，每组有回执，重跑不重复执行。默认dry-run，无apply/环境明确参数不写数据库。

回滚是反向业务操作，不是删除新表或全库restore。仅当组内相关实体/任务/通知尚未产生不兼容后续修改时，可按manifest与post revision恢复active路由；history不曾改写，因此无需反造审计。合并后新证据、审核、发送无法无损自动分配到原实体时，返回rollback_conflict，输出影响清单，由管理员决定split/补偿方案。不要强制覆盖后续人工编辑。

迁移回滚与代码回滚分开：新增列/表先保留。关闭新候选决策写入时，已经合并过的数据仍必须经过alias-aware读取层，否则会重新出现重复公开条目。完成第三阶段后不能直接回滚到完全不认识merged实体的旧Worker；必须准备保留路由过滤的兼容回滚版本。全库Time Travel只作灾难恢复手段，且需额外授权，它会影响合并以外的新数据。

## 11. 观测、预算、发布顺序

标志：`IDENTITY_MODE=off|shadow|enforce`，默认shadow；`IDENTITY_CANARY_PLATFORMS`显式列表；`IDENTITY_MODEL_ASSIST`默认false直至模型schema测试通过；`HISTORICAL_MERGE_ENABLED`默认false。读canonical能力一旦历史合并开始，不能随IDENTITY_MODE=off关掉。

shadow仅追加诊断候选/trace，不改变旧审核、公开条目或发送；比较新旧decision与管理员标签。enforce先用于明确选择的少数产品；新entity初始仍pending，不因强别名/高置信度自动通过。历史apply在生产验证授权之后单独开启。

指标：observation_received、candidate_count、duplicate_approved/pending/rejected、identity_unresolved、retrieval_incomplete、real_terms_change、reopen_by_reason、rejected_repeat_leak、false_merge_undone、tasks_created、notifications_suppressed、model_calls/tokens/cost、rows_read/written、retry_age。必须分别统计模型调用减少与人工负担减少，不能用“新offer少了”证明正确。抽样检查被压制项，不只看放行项。

沿用现有总预算及reserve/settle机制，不硬编码额外人民币额度。精确重复与缓存命中不得再调用模型。默认每次Worker候选写入最多10、后台解析最多4个模型任务、检索top40/模型top8；按实测D1查询/CPU约束再缩小，不扩大账户套餐。超过时间预算返回deferred并持久checkpoint。

## 12. 完成定义与外部约束

完成定义详见ACCEPTANCE，必须同时通过：回放已审重复不增任务；拒绝变体继承范围；独立资格/产品/轮次不误合；真实变化生成一次提案；并发与部分故障不丢记录；历史清理可预览、停止和受约束回滚；公开统计与通知无重复。

不得宣称“任意语义100%准确”。自动判定与人工不确定分流同时是产品要求；真实环境效果需标注数据集、样本量、误合并与漏判率。

官方实现约束（2026-10-10核验，实施时复查）：D1 batch具有事务回滚语义，但零行匹配不是报错；D1支持FTS5/JSON；绑定参数每SQL最多100，SQL文本与调用查询预算有上限。D1 Sessions的一致性不等于多请求事务。生产账户套餐未知，不能按Paid预算设计无限全表扫描。

参考：
- https://developers.cloudflare.com/d1/worker-api/d1-database/
- https://developers.cloudflare.com/d1/sql-api/sql-statements/
- https://developers.cloudflare.com/d1/platform/limits/
- 本仓库 `AGENTS.md`、`docs/data-contract.md`、`src/db/schema.ts`、`src/shared/dedupe.ts`、`src/worker/index.ts`、`src/worker/admin.ts`、`pipeline/run.ts`、`pipeline/lead-review.ts`、`tests/verification.test.ts`；按文首固定基线和第一阶段PR读，不从本SPEC推断已上线。
