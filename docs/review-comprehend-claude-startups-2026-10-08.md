# Comprehend 与 Claude Startups 审核凭证 · 2026-10-08

核验时间（UTC）：2026-10-08T08:50:23.951Z。管理员授权修改并提交Comprehend说明，补齐并上架创业计划。

## Comprehend（coxm）

仍为同一已上架条目。说明Paid plan是AWS按量计费账户模式，无固定订阅费，免费额度内免收Comprehend费用；移除不对应实际预付的pay标签，保留card，Paid plan启用条件、超额及不含功能收费在额度和步骤写清。每个受支持API每月50,000单位、首次使用起12个月；美元举例限定情感分析等常规单价，不把所有API强称同价。已接受本条更新提案，未新建重复记录。

来源：[服务价格页](https://aws.amazon.com/comprehend/pricing/)、[AI免费额度页](https://aws.amazon.com/free/ai/)、[账户模式说明](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html)。

## Claude Startups（7rs2）

已将指定条目由pending上架为approved，证据由media改site。

- 一次性$1,000第一方API额度，自发放起6个月有效；不适用于Bedrock/Vertex。
- 首次使用Team的组织可领最多5个Premium席位一年；官方按$100/席/月年付计值最高$6,000，加API合计最高$7,000。usdEstimate=1000、usdMax=7000。
- 合作方最高$45,000是独立发放、条件不同的优惠，不当Anthropic API赠金、不计入本站该条估值；VC渠道最高$100,000也不并入该条。
- 公司成立5年内或近2年获融资；需Console、同域公司邮箱、产品说明、审核及支持地区资格。自筹公司也可申请。正式条款排除在中国等受限地区设立/运营或向当地提供服务的公司；不能仅凭海外网络替代公司资格。
- 已有创业计划成员无需重复申请；已有Team组织不领Team优惠。具体模型目录未承诺，models留空。
- 同渠道同活动ungi为新待审重复条目，本次拒绝（duplicate）并保留7rs2。vmjp $100不同线索未自动改写。

来源：[项目页](https://claude.com/programs/startups)、[官方扩展公告](https://claude.com/resources/articles/were-expanding-the-claude-startups-program-to-help-founders-build)、[项目条款](https://www.anthropic.com/startup-program-official-terms)、[附加权益条款](https://www.anthropic.com/legal/startup-program-addendum)。

## 日期溯源

管理员提供[MadRobot](https://madrobot.blog/2026/10/06/anthropic-claude-startups-free-year-claude-team-1000-api-credits/)后，追到其[CNBC原文](https://www.cnbc.com/2026/10/06/anthropic-claude-startups-program.html)。web读取/搜索被限制，Jina Reader成功返回全文；CNBC明确援引Anthropic称初始计划在5月推出，2026年报道与官网earlier this year限定年份。

记录初始推出月份为2026-05，具体日没有核实，不填写2026-05-01。当前条目为新增免费Team及合作方优惠的扩展版，官方宣布和附加条款生效日均为2026-10-06，claimStart用该日，标题及公开步骤区分两阶段。旧项目条款May22,2025是编辑日期，不能混作Launch。

## 验证

两条plan试算与最终逐字段管理接口读回均为拦截0、提醒0。coxm、7rs2均approved且pendingUpdate=false；ungi为rejected。独立查询参数读取公开列表，两条保留ID各出现一次，字段与最终补丁一致，ungi不返回；没有新增重复。官方摘录在同证据页Jina正文中逐段匹配通过；startup没有标tested，未代表管理员申请实际创业资助。

本次为生产数据编辑和上架，无Worker部署、数据库迁移或消息发送；本地平台要点和本凭证另行Git提交，未将Git提交当作生产验证。
