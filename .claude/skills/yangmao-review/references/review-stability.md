# 审核稳定性与跨 ID 查重

本清单保护已经完成的人工审核。它约束 review 的写入决策，不替代服务器去重或证明所有语义重复已被程序识别。字段合同、通用规则与平台要点仍以项目当前文件为准。

## 取到真实基线和历史

`offer.ts show` 展示的是管理接口的审核目标：存在 `pendingUpdate` 时是候选，并非公开原版。先保存 `GET /api/admin/offers/:ref` 返回的 `offer.reviewVersion`、`offer.updateDiff`（from/to）和 revisions；辅助脚本的修订摘要不等于通过/拒绝记录。读取完整原版和拒绝历史可用下面的只读 D1 查询。首次普通待审无已批准基线；沿用现有候选而非另起 ID。

在项目根目录，把 SQL 保存到本地临时文件，用 `npx wrangler d1 execute ai-yangmao --remote --file /tmp/review-baseline.sql --json` 读取。替换 ID 为 `show` 返回的完整 ID，单引号按 SQL 转义为两个单引号，不插入未知输入的 shell 字符串。不输出密钥，不用 seed 或 INSERT 代替读取。

```sql
SELECT * FROM offers WHERE id = '完整ID';
SELECT candidate, diff, manual_fields, updated_at
FROM offer_proposals WHERE offer_id = '完整ID';
SELECT action, edited_fields, reason_code, reason, at
FROM reviews WHERE offer_id = '完整ID' ORDER BY at DESC;
SELECT diff, evidence, at FROM rejected_offer_updates
WHERE offer_id = '完整ID' ORDER BY at DESC;
SELECT author, diff, evidence_before, evidence_after, at
FROM offer_revisions WHERE offer_id = '完整ID' ORDER BY at DESC;
```

`offers` 行是持久基线；已批准但有更新的条目，proposal 不替换它。没有 proposal 不表示没有拒绝过更新，后者保存在 `rejected_offer_updates`。找不到历史或无读取权限时说明缺口，继续只读核实，不能把缺口当重新提交的许可。

## 全部状态检索，再确定活动身份

只搜待审队列不够。用只读查询取当前项目的活动身份清单，按平台别名、模型名、权益和领取机制检索，包括归错平台的记录：

```sql
SELECT id, platform_id, title, type, value_text, claim_method,
       requirements, audience, claim_start, claim_end, end_kind,
       published_at, tags, review_state, evidence
FROM offers ORDER BY platform_id, id;
```

这是活动业务数据，只保存在当前审核临时文件，不能提交整库快照。命中候选再查其内部历史。身份比较顺序：实际提供调用/领取的平台 → 权益/模型 → 领取方式与资格 → 同一活动窗口/轮次。

- 平台公告与模型厂商转发，同一调用渠道、权益、窗口和机制：同一活动，转发补来源，不能各上架一次。Cline、OpenCode、Nous Portal 的不同调用渠道可独立存在。
- 免费档“每日积分”、签到页与 FAQ 描述同一每日额度：同一活动；注册一次性礼和每日签到是两个机制。不要用发布日期给常驻活动生成新 ID。
- 同一月度 API 权益，标题简写或 ID 加日期后缀：仍查主条目；不同套餐、地区、独立产品或机制不能仅凭金额相同合并。
- 重置：比较实际发放事件，预告/执行确认/process 回复不自动产生新事件。不同独立发放可分列；未来一周每天重置保留整段窗口，不强制同日。同一天也可能有两个有明确证据的独立发放。
- 已拒项必须看拒绝原因。重复项沿用主条目；同版拒绝更新不重开；已解决的证据缺口、真实新政策或管理员明确重新审查才可重开。首次被拒的假活动不能借新标题“补录”复活。

## 差异判定与最小写入

内部审核记录写下：主 ID、比较过的相关 ID、最后批准/拒绝依据、逐字段 from/to、当前官方原文与实际变化、去向。不能写进公开标题、简介、步骤或 adminNote。

**重复关联编号必填（2026-10-10管理员要求）**：无论关联对象已拒绝还是已上架，记录本次对象与所有已确认关联对象的线索号（`leads.id`）、条目完整ID、短码及当前状态，标明主条目或原被拒对象、重复依据和原拒绝理由。线索号不是条目短码；必须分别查询，不能只记录标题或“重复”。已知相关条目时，先查询 `SELECT id, offer_id, status, url, title, resolution FROM leads WHERE offer_id IN ('本次条目ID', '相关条目ID');`，再按官方URL、平台别名及权益机制查未关联或被拒线索；URL相同只能作查找依据，不能代替机制比较。未产生线索/条目或暂未找到编号时分别标注“无关联线索”“无条目”或“未查到”，保留已知编号，后续查到再补齐，不猜造。编号和关系写入 `reviewMemo`、线索处理理由或审核理由；未获批准/拒绝授权时仍可记录关联并保持原状态。

| 情形 | 处理 |
|---|---|
| 原文、资格、权益、窗口均未变，仅中文润色、分类推断、估价/汇率、来源 URL 或抓取时间不同 | 保留已批准字段；无提案不写，有漂移提案按授权拒绝更新 |
| 同一条款曾拒绝，本次没有解决拒绝理由 | 不重开、不换 ID；必要的核实结论留内部 |
| 新 ID/别名/错误归属指向已有同一活动 | 记录主 ID，按授权拒绝重复项；必要纠错在主条目进行，不重新上架主条目 |
| 当前官方正文明确改变权益/资格/日期，或管理员明确指出并确认原字段错误 | 逐字段给依据；沿用主 ID，仅提交相关变化，保持待审；通过后成为新基线 |
| 官方明确独立新轮次、渠道或领取机制 | 证明区别后才新建，不能只凭推文发布时间不同 |
| 页面打不开、登录/弹窗未读到、短正文或旧摘要 | 补读官方正文；不能据此声称政策改变/活动结束，也不能绕过服务器拦截 |

服务器采集入口还要求实际完整 sourceText 与关键官方引文证明变化；人工改字段也必须有依据，不能把自由编辑当绕过稳定性检查的后门。`no_proven_terms_change`、`rejected_terms`、`duplicate` 是需要保持基线/沿用主 ID 的信号，不得 FORCE、改日期、改 URL 或重新补录来穿过它。旧摘录缺失只触发核验，不证明政策改变：须在同一事实槽中识别明确替换的额度、日期或可识别资格；语言切换、连字符、截句/扩句和只省略旧条件不能重开。固定X/status原帖按同一公告处理，不能把同URL重抽当新轮次。机器未识别的实质语义交人工，不能把无变化判定当活动下架。页面 hash 改变、capturedAt 更新和模型生成新摘录本身不证明条款变化；旧摘录仍在时先保留基线并核查是否只是新增相关来源。

提交 edit/approve/reject 带读取时的 `expectedReviewVersion`。409 表示审核目标已变，重新读回和比较，不能刷新版本后原样重放旧补丁。版本锁只能防并发，不能代替活动查重和拒绝历史检查。读回确认主 ID 未变、非目标字段未被改、批准/待审/拒绝状态符合授权；补字段不是接受更新，上架由管理员批。
