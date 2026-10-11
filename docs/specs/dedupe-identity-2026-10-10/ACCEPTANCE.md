# 验收矩阵、迁移与回滚

本文件是 `SPEC.md` 的可测合同，尚不是已通过的测试报告。所有用例使用虚构平台/脱敏fixture，禁止拿生产通知或真实管理员令牌跑测试。

## 1. 第一阶段已有验证与边界

PR #2修复三个问题，已有343个Vitest＋8个CLI测试通过，新增12项中6项在修复前出现预期行为失败。第一阶段未实现此处完整身份/历史合并验收；不能以其测试通过替代第二、三阶段测试。

第一阶段包含0016迁移。新Worker上线前必须先加decision_key列/索引；未执行生产迁移/部署。实际D1运行时和生产回放仍需单独验证。

## 2. 必须自动化的验收矩阵

每行可以拆成多个测试；ID用作报告追踪，不把复杂用例压成一个模糊断言。

| ID | 输入/故障 | 必须观察到的结果 |
|---|---|---|
| A01 | 同平台$10明确为USD、10.00 USD、10美元；NFKC/空白改写 | 规范金额相同；证据原文不被改写；hash稳定 |
| A02 | 100/日、100/月、滚动30天、自然月；100 credits与100 tokens | 不同周期/单位不能等价；未知币种不得自动转USD |
| A03 | 同URL同正文连续抓取10次 | 1观察，lastSeen增长；0额外offer/task/通知；核验时间不由社区来源更新 |
| A04 | 同一页注册礼＋每日积分＋付费套餐 | 按独立子项保留3候选，分别关联/拒绝；不是整页一次拒绝或合并 |
| A05 | 同观察抽取随机ID/标题/语言；换抽取版本再跑 | 无重复公开offer；新抽取候选仍经过实体解析，原审计保留 |
| A06 | 3候选：重复已拒、独立待审、写入故障 | 前2持久完成，第3 deferred；重试不重跑已完成；线索不提前吞掉 |
| A07 | 新URL转述既有批准/拒绝活动 | 确認同实体后增加来源关联，不新建审核；duplicateId不是error |
| A08 | 旧known=100，候选unknown；旧有资格，新正文未提及 | 不把额度清零/资格取消；过短内容标INSUFFICIENT或仅关联来源 |
| A09 | 跨语言同注册10美元、官方FAQ/公告/社区，提供明确活动对应依据 | SAME＋EQUIVALENT，1entity/1approved投影，0新增审核任务 |
| A10 | 相同标题/金额，学生与企业独立领取活动 | DISTINCT或身份待判，不能自动SAME |
| A11 | 母公司旗下两产品、第三方调用相同模型 | 不跨实际发放产品合并；纠正platform需证据和审计 |
| A12 | 同价不同模型版本/fast模式、不同池/地区/客户端 | 未证明同计划更新时不自动合并；同标题不能绕过冲突 |
| A13 | 同一天两次独立reset；另有预告/确认/进度帖 | 两次发放保留2entity；同次活动传播关联原entity，不凭日期判断 |
| A14 | 同活动100/日→100/月，有可信替换原文 | 1变更任务；公开仍旧值；批准后才变，人工估值不被改 |
| A15 | 改写文案/截句/数字格式；页面别处变化但本优惠未变 | 不产生terms_change或更改reviewRevision |
| A16 | 同锚点官方新页面更新资格/有效期/自动续费 | 有证据→SAME＋CHANGED；无对应关系→INSUFFICIENT，不静默忽略或自动发布 |
| A17 | 已审A→已审B→官方恢复A，随后同源重放 | 恢复A产生一次B→A任务和新publicationRevision；重放无第二任务/通知 |
| A18 | lookup失败、空响应、top40截断、索引未同步 | 未完整召回不视为没有历史；精确别名可主表查；故障deferred |
| A19 | LLM编造sameAs/quote，候选外ID，页面注入approve指令 | schema/引用/白名单拒绝；不修改审核和权限；错误可审计 |
| A20 | 同requestId同payload重放，含响应丢失 | 相同applied回执；不重复audit/entity/task/outbox |
| A21 | 同requestId不同payload | 409，原结果与记录不变 |
| A22 | 拒绝前offer或task revision改变，提案未变 | 409，提案保留，拒绝记忆/audit/outbox无半提交 |
| A23 | batch第2/3/末尾SQL失败或断言失败 | 整批回滚，command不applied；重试可正确执行 |
| A24 | 并发两请求同强锚点但不同模型ID | 唯一entity、版本与active task；冲突请求读回canonical或重试 |
| A25 | 同product/block并发新活动判断 | 只有一个持相同block revision提交成功，另一方重召回，不绕过锁换ID |
| A26 | rejected paid_bundle、insufficient_evidence、expired、other分别换皮 | 相同scope拒绝继承；补缺官方证据/新轮次按规则一次重开；不全平台黑名单 |
| A27 | 全页不可读/截断、0候选、预算耗尽，尤其重要线索 | 不永久拒绝、不标已完整；持久deferred/manual并有可追踪重试 |
| A28 | 同task加10个来源、健康刷新、改reviewMemo | 1审核卡，0重复提醒；业务revision不因这些元数据增长 |
| A29 | 旧审核卡批准、新人工different、旧模型lease结果 | 旧版本409；新人工判断保持，旧缓存无权覆盖 |
| A30 | 仅ingest/reviewer令牌尝试历史合并、扩大拒绝范围 | 禁止越权；admin正确请求才可执行受控动作 |
| A31 | public列表/API详情/RSS/图表/旧hash ID | 不重复计数；非公开canonical仍404；内部理由不泄漏；fragment前端归一 |
| A32 | 旧offers/拒绝leads/旧rejected_updates回填两次 | 每对象唯一映射，原行字节不变；unknown不臆造；拒绝记忆不丢 |
| A33 | 第101条回填中断，继续同snapshot | 稳定cursor续跑，不重复/跳行；不同snapshotHash不误用checkpoint |
| A34 | 相似历史组有2approved条款冲突或2个人工proposal | preview显示冲突、预期版本；不自动挑一个覆盖另一份 |
| A35 | apply已批准planHash；任一成员在预览后变更 | 409整组不改；部分其他组已完成有单独回执，不能伪称整批成功 |
| A36 | 10成员组，循环alias、失踪canonical、跨产品或different约束 | 禁止整组；超10成员显式oversized，不能静默截断 |
| A37 | 成功逻辑合并 | 一个公开canonical；原offer/review/revision/rejection/delivery内容保留；FK无孤儿 |
| A38 | 同版本任一旧alias已发送new | 合并后不重发new；不新增假的sent记录，原payload字节不变 |
| A39 | 某alias有pending/unknown delivery | 阻止相关重发，展示人工核查；不自动release，claim校验canonical generation |
| A40 | 合并后不同旧revision数字对应同事实版本 | 根据版本/事实/轮次映射，不拿数字相等推定同版本 |
| A41 | 合并后无新业务变更，按manifest rollback | 原active路由恢复；历史审计不删除；重复rollback返回原回执 |
| A42 | 合并后新审核、证据或发送无法分配回原entity | rollback_conflict；列影响，不覆盖新数据或删除已发送回执 |
| A43 | 第三阶段启用后IDENTITY_MODE=off或回滚代码 | alias-aware读过滤继续有效，不能让所有重复行重新公开 |
| A44 | 一产品已backfill另一产品尚未backfill | 后者旧approved正常可见；未完成全状态对账的产品不能开启enforce |
| A45 | 审核版本、候选引用其它实体的version/decision，或跨权限读取raw evidence | 400/409/403合适拒绝；不能仅因ID存在就关联；公开无原始内部正文 |

## 3. 冻结回放数据与质量门槛

离线语料至少60个由人工标注的pair：20个SAME/EQUIVALENT（至少8个跨语言或跨来源），20个DISTINCT（资格/产品/模型/池/轮次），10个SAME/CHANGED（周期/额度/资格/日期/续费），10个UNRESOLVED（缺证据、歧义、截断）。另外为候选集合遗漏、单页多权益、历史周期恢复加入流程级fixture。

标注由原文和收录规则支持，记录label作者、证据和版本；不让待评估模型自己生成真值。合成fixture验证逻辑，用户授权的真实脱敏回放验证实际效果，两者分别报告。

固定集合上线门槛：20个明确重复至少18个无需新增人工任务，其余必须解释为不确定，不得误报新活动；20个独立控制样本自动误合并为0；10个真实变更全部产生正确任务且公开版本不提前变化；10个不确定样本全部不自动批准/永久拒绝。以上是指定数据集的验收目标，不宣称实际无限输入100%正确。

报告automatic precision、recall、uncertain rate和每类分母；单独列false merge、false reject、duplicate review leak。样本不足或无实际数据时标记未达现场验收，不把合成样本成绩宣传成线上效果。

## 4. 工程测试命令与环境

```bash
node --version                 # 确认24系列
npm ci
npm run typecheck
npm test
npm run build:web
git diff --check
```

新增测试文件也必须被现有`npm test`包含。不得只运行新文件后宣称全套通过。脚本实测命令、Node版本、HEAD和完整log保留在忽略的验证目录或CI artifact，不提交敏感数据库。

事务分两层验证：现有Node SQLite迁移驱动的Worker集成；Wrangler本地D1运行时对同迁移的batch/RETURNING/约束/并发验证。没有第二层时报告未完成运行时验证。真实模型默认mock，已批准预算的模型评测另记费用。

## 5. 数据迁移与发布顺序

本清单是未来发布操作要求，不是现在执行授权。

1. 核对执行 main、正式 PR #6 及后续修复、迁移历史；先生成脱敏副本与可恢复快照，记录snapshotHash及授权环境。
2. 新增列/表/索引先迁移到本地或批准的staging；保留旧字段，禁止drop/rename破坏性切换；空库和旧库分别测试。
3. 部署兼容代码，identity默认shadow、模型辅助关闭、merge关闭；旧投影和通知继续原路径，只记录新诊断。
4. 独立回填，100行checkpoint，比较全部状态counts和映射；没有完成某产品回填，不开启其enforce。
5. 冻结fixture和脱敏回放达到门槛，再对明确批准的少数产品canary；检查压制项样本与变更项，不只看队列变短。
6. 完成canonical读过滤、旧链接和通知继承验收，才可在隔离副本演练历史apply/rollback；生产须另批具体planHash。
7. 逐组apply，失败组停止，已成功组保留receipt。每组核对公开数、全部关联、决定和pending/unknown发送。
8. 发布后核对真实版本和迁移状态、D1指标、延迟与重复/误拒；不从CI绿灯推断已上线。

## 6. Dry-run输出必须包括

environment、snapshotHash、sourceCodeSha、resolver/rulesVersion、scanCursor、高水位、各表记录数、候选组数、冲突数、预计写行数、选定canonical理由、所有expected revisions、通知影响、before/after manifest、planHash、跳过与不可自动处理清单。

默认零写入。CLI缺少`--input`或显式环境即退出；不得回退到生产API_BASE。不得把`--dry-run`实现成“先写再rollback但已发消息”。需要外部调用的分析默认mock或单独批准。

## 7. 回滚与停止条件

应立即停止扩大canary/执行后续merge组的条件：任一控制样本误合并、拒绝决定丢失、approved投影未经批准变化、重复或未知结果消息被重发、无法解释的记录减少、预算/读行数超批准范围。

写入回滚：关闭新解析提交并保留alias-aware读取及旧投影，不drop新增表。合并后回到alias-unaware旧Worker不是合法回滚。准备一个已测试的兼容回滚commit。

数据回滚：使用操作manifest与post revisions；符合条件才反向改路由。后续人工修改或消息已发生时输出冲突，不能为回滚效果“干净”而强行覆写。所有撤销本身追加审计。全库restore/Time Travel需要独立灾难恢复授权，不是日常单组合并撤销按钮。

## 8. 最终交付证据

每个PR必须交付变更范围、exact HEAD、迁移文件、失败→通过测试记录、全套与构建结果、运行时核验、质量回放统计、未验证/失败项、预算与数据风险。独立审查未做则明确没有；不得以自审代替独立审查声明。最终报告区分“代码完成”“已推送”“已合并”“已部署”“生产已验证”五个状态。
