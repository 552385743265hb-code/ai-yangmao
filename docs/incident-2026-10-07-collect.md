# 采集 workflow 连续失败 · 2026-10-07

> 历史记录：仅证明标题日期的核验、操作与快照；现役机制见[文档索引](README.md)，当前审批、数量、部署及活动有效性须重新读取。

## 原因与影响

抽查 10 月 6 日 18:17、10 月 7 日 12:17 / 18:17（UTC）的失败运行，均在采集后的 `/api/ingest/verification-queue` 返回 500，堆栈指向 `verifyExistingOffers`。代码检查 workflow 正常。样本：[最新失败运行](https://github.com/accesaver-byte/ai-yangmao/actions/runs/37665682719)。

现场直接请求复现 HTTP 500；Worker 日志显示 `offer_proposals.offer_id in (?, …)` 对所有已审核条目逐个绑定。线上有 198 条 approved 记录，超过 D1 的 100 参数限制。旧单元测试采用 SQLite，未模拟 D1 的参数上限，所以未发现数据量增长后的错误。此前部分信源已经成功写入，不能将 workflow 失败解释为整轮采集完全没有执行。

## 修复

- `src/worker/index.ts` 核验队列改用 approved offers 子查询，参数数目不随条目数增长。
- 后台待审提案原条目、通知修订查询也改用子查询，避免相同问题。
- 回归测试模拟 D1 的 100 参数限制，用 120 条 approved / proposal 验证全量、指定信源、空信源、提案 hash、后台队列及通知构建；修复前失败，修复后通过。
- 日志另有 OpenRouter 固定模型 `qwen/qwen3.8-27b:free` 返回 404，属备用能力降级。仓库变量改为 `openrouter/free`，公开目录确认输入输出单价均为零，单次探测 HTTP 200、89 tokens、cost 0。未改为付费备用模型。
- `0011_review_suggestion.sql` 台账漏记，但实际字段已为 TEXT、默认值 NULL。尝试迁移因 duplicate column 安全失败后，核对结构并只补台账；现已无待执行迁移。

## 发布与验证

修复源码：`bfd1bd0dbb836ad769e56ba1617e5568ce97d3d4`。Worker version：`dd71da47-1339-47b9-bdd1-c8c840b1b14c`，tag `bfd1bd0`。发布保留现有远端 vars；此前版本 `7aac09bb-5ae8-4974-bec5-0ee6caf31c06` 可作代码回滚参照，数据库台账独立记录。

本地类型检查、92 项测试、前端构建通过。线上 health、verification-queue、admin/queue 均 HTTP 200；核验队列正常返回 100 条待核验记录。没有发送通知测试，也没有人工通过待审记录。

已完成 [修复后的采集验证](https://github.com/accesaver-byte/ai-yangmao/actions/runs/37685324059)，完整信源采集与既有条目复核，`lead_limit=0` 跳过新增线索研判；最终结论 success（2026-10-07 21:15 UTC）：220 个信源、220 成功、0 失败；新增线索研判 0，本轮模型成本记录为 ¥0。仍有 3 项抽取延期、21 项证据核验异常，coverageDegraded=true；这些保留在健康记录中，不宣称所有权益证据已重新确认。代码检查运行 37685282747 同样 success。
