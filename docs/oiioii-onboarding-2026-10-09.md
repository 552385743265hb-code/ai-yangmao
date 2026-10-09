# OiiOii 准入与首次线索扫描（2026-10-09）

> 历史记录：仅证明标题日期的核验、操作与快照；现役机制见[文档索引](README.md)，当前审批、数量、部署及活动有效性须重新读取。

用户明确授权新增厂商、查找官方渠道及各地区版本、首次扫描并推送审核。生产厂商 `oiioii` 已批准，条目保持 pending；5个信源 enabled=1、auto_publish=0。没有注册用户账号、购买套餐或把活动自动通过。

## 官方入口与账号

| 项目 | 已登记地址 / 核验依据 |
|---|---|
| 主站 / 英文 | https://www.oiioii.ai/ ，同站 /en/ |
| 简中 | https://www.oiioii.ai/zh/ |
| 繁中 / 日文 | https://www.oiioii.ai/zh-Hant/ 、https://www.oiioii.ai/ja/ |
| X | https://x.com/OiiOii_AI ，主页页脚直接链接且FAQ再次列明 |
| YouTube | https://www.youtube.com/@OiiOii_AI ，主页页脚直接链接 |
| Instagram | https://www.instagram.com/oiioii_ai/ ，主页页脚直接链接 |
| Reddit | https://www.reddit.com/user/OiiOiiAI/ ，主页链接及FAQ的u/OiiOiiAI交叉确认 |
| Discord | https://discord.gg/KCwR6burVc ，官网价格页导航 |
| 中文帮助文档 | https://ecncw7du1qtr.feishu.cn/wiki/R6m5w5RILiS35lkM7PycEUhHnfc ，中文主页Help直接链接；本次确认链接归属，未完成全文读取 |
| 英文帮助文档 | https://docs.google.com/document/d/1plIxnmE-XoWP-GbOsZ9jqiz5qKXS7ysg1-rsJ4pifEY/edit ，英文主页Help直接链接，正文通过公开导出读取 |
| FAQ | https://www.oiioii.ai/faq |
| 价格及积分规则 | https://www.oiioii.ai/price |
| 公告 / 博客 | https://www.oiioii.ai/changelog 、https://www.oiioii.ai/blog |

FAQ明确支持English、Simplified Chinese、Traditional Chinese、Japanese原生UI。目前证据支持同站多语言入口，未发现独立大陆版或独立国内/国际账户、额度体系的可靠官方说明，故统一一个厂商，避免重复权益。`app.oiioii.art`搜索结果展示同名内容，但本次未取得主站互链确认，作为候选域名记入平台要点，未加入证据域名白名单。公众号/小红书“OiiOii AI”仅查到第三方提及，未验证具体官方账号ID。

外部托管帮助文档保存在厂商notes和平台要点中；不把整个Google Docs/飞书域名加入该厂商的证据白名单。自动采集使用稳定的本域price、faq、zh主页、changelog及blog。X账号写入厂商x_handles，供现有线索归属和官方复核使用。

## 本次待审线索

原始线索3752，官方价格页中“Community & Rewards”三种不同领取机制分别建稿：

| 短码 | 条目 | 审核入口 |
|---|---|---|
| d6wy | 新用户注册赠盒饭积分 | https://ai-yangmao.com/#admin-offer-oiioii-new-user-bonus |
| v6r6 | 免费档每日积分/签到 | https://ai-yangmao.com/#admin-offer-oiioii-daily-check-in |
| f58l | 邀请好友注册并登录奖励 | https://ai-yangmao.com/#admin-offer-oiioii-referral-bonus |

三条证据均来自本轮直接获取的官方price页面，各有连续英文原文摘录，site级；未设置tested。官方确认奖励机制，但写明数额和有效期以当期活动为准，因此当前数量、资格、有效期仍需核实，requirements保持unknown作为上架拦截，美元留空，不猜免费可用模型。

已查历史社区线索 https://linux.do/t/topic/1468443 （2026-01-16），“注册1000/每日50/邀请200”不能当成10月现行数额。官方Google帮助文档仍写签到/邀请奖励7天、会员赠额30天；当前价格页规定奖励以当期活动为准、会员额度31天，旧指南不能覆盖当前账户规则。付费会员签到310/930/1550等并非免费账号固定赠额；$7会员试用及普通订阅折扣不单独收录。

三条已写内部核验记录与judge建议，没有通过或拒绝。官网规则不充分时应补当前账户权益页证据，而不是用旧社区数字或套餐表补空。

## 送达与验证

- 定时通知已自动覆盖全部三条，Telegram delivery `c863565a-ef9a-4bdf-b8a7-ac36f2b15891`：`sent`，UTC 2026-10-09 07:08（America/New_York 03:08），error为空。
- 本次另行准备的定向通知被按对象去重拦下，未重复发送；没有动旧的投递不明记录。
- D1读回确认厂商approved、官方X账号、5个信源启用且自动上架关闭、三条offer均pending/site。
- 本地typecheck、214项回归通过；seed JSON厂商/信源ID唯一，生成SQL已在内存SQLite通过完整迁移后执行并读回新厂商及5个信源。
- canonical seed与平台要点已更新。本轮无需Worker代码部署或数据库迁移；生产只执行OiiOii定向新增，没有运行全量生产seed。
