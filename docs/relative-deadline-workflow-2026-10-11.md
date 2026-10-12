# 全局一周限免自动填写截止工作流

2026-10-11纽约时间。管理员要求已有全局一周限免声明时，agent自动填写截止字段。

执行于pipeline/offer-draft.ts的toOffer，以及Worker /api/ingest/offers的collectedOfferIn，共用src/shared/campaign-deadline.ts。不仅修改提示词，原始入库请求同样受规则处理。

仅限全局限免free：可信周期原文（validity/benefit）及完整活动开始日或公告时间齐备时，自动填写claimEnd及endKind=date。先采用明确活动开始；若精确公告与开始为同一源时区日期则使用公告时刻；不同开始日不沿用早发公告时间。日精度日期跨月/年加7天，精确公告按7天推算并转源时区日期。capturedAt、标题和月份不是依据。源正文存在时须匹配摘录；个人领取/激活/注册后的有效期与媒体线索均不推算。

evidence.claimEndDerivation存储7天周期、原文/来源URL、时间锚点、精度、推算claimEnd及可用的推算时刻。沿现有evidence JSON存储，不需要迁移。首页、详情、卡片明确标截止估算，不把派生日期冒充官方公布的具体时刻。

明确截止优先保留；已有人工批准基线的普通校验不自动重写。不会制造identityFacts，填写日期不等于批准活动。回归包括直接入库后真实SQL读回日期及元数据，并确认仍pending。

## 发布和验证

代码2ca2289已推送origin/main并部署；生产Worker版本0b2f54de-58dc-4d20-bc64-eda25882cdee，tag=2ca2289。干净提交构建的typecheck、924项Vitest、11项审核CLI测试、前端构建通过；线上health为200。

入库集成测试的真实SQLite读回确认：公告2026-10-09T13:55:42Z且原文for a week时，claimEnd=2026-10-16、endKind=date，原文依据进入evidence JSON，状态仍pending。测试在隔离数据环境执行，未向生产插入合成活动。现有生产人工批准记录没有被本次发布回填或重新核验。
