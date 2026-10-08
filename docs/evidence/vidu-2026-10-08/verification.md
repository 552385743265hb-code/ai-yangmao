# Vidu 注册礼核验 · 2026-10-08

核验时间（UTC）：2026-10-08T06:54:55.630Z。目标：ds4t / vidu-vidu-signup-bonus。

管理员明确反馈“我试过了，新人注册20积分”，并要求将截图权益全部更新。本次更新同一条目并维持上架，没有新增重复条目。

- 注册礼：一次性20试用积分，管理员亲测，证据级别tested。
- Free套餐：$0/月；Q4 540P视频每秒消耗4积分。
- My References：每月10个参考素材管理配额，不当作10条免费视频。
- 积分单位比价：20 × $2,300 / (12 × 20,000) ≈ $0.19，采用本次官方Ultimate年付促销卡的最低费率。比较表仍有8,000/月旧值，选促销卡20,000所得估值更保守。付费档Q4每秒消耗2积分，与Free不同；此估值仅比较积分单位价格，不是视频实际购买费用，references不计美元。
- 模型栏只列截图确认的Vidu Q4，不根据产品导航推断Q3免费，也不断言Q3不可用。
- 未公开活动起止；注册trial有效期仍以账户明细为准，不套订阅30天或Purchased/Bonus两年。每日登录赠礼rqbg未改。

## 证据

[管理员提供的Free套餐截图](free-plan-admin-tested.png)。SHA-256：467ca0ee8619fd391f0bf524aaa2bd0c5c1d3b3cea5052f24bcef50654d9a5e3。

[官方价格页](https://www.vidu.com/pricing)的Jina渲染正文复核套餐、Q4费率和参考素材配额；My References归Content Management。

官网原文：“New users receive trial credits upon registering for Vidu.”。具体20积分来自管理员亲测；原英文摘录拼入的20和1 free trial未在官网复现，已移除，没有新增额外一次免费生成承诺。

## 写入与读回

仓库offer.ts执行apply（--approve）、memo、retest；写前核对条目未被其他操作改动，plan拦截0、提醒2（活动开始及截止未公开）。

管理接口逐字段读回通过：approved、active、pendingUpdate=false。独立查询参数读取公开列表，同一ID恰好出现一次，额度、$0.19估值、Q4模型及tested证据均匹配。最近核验：2026-10-08T06:50:20.284Z。

首次Python读回遇到TLS EOF，未据此判定写入失败；改用Node读取后全部断言通过。

本次为生产数据更新，无代码发布、迁移或消息发送；平台要点、截图和凭证在本地仓库记录，Git推送另计。

旧的“建议通过，注册数量官方没写”审核建议已清除；本次实测数量和依据在条目与核验记录内，不保留过时的审批提示。
