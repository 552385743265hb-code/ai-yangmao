# 已批准活动再次入队：语言、摘录与同帖别名（2026-10-10）

## 生产复现

三条属于不同路径，不能仅用一个“标题相似度”解释。

- Space Bunny：主项opencode-opencode-space-bunny-free-period-extension已批准；同一官推2107398361733104102又生成opencode-opencode-spacebunny-free-tier。标题/正文缩短及auto/signup推断不同，原硬去重未命中。
- 云知声U2-Flash：同一model-hub/u2-flash从中文正文变成英文，活动日期9/30–10/31、新老用户、100RPM与10,000,000TPM均未改；新提案省略旧条件。旧机器门控把原中文摘录不在英文正文当条款变更。
- WorkBuddy国际版：原福利摘录删掉了first query条件，改摘完整句后旧不连续句不再匹配；100/350未变。提案只是invite→none字段纠错，而非政策改变。

三条在数据库均出现evidence_missing。泛用X读取可能得到登录/导航页，缺正文仍会进入核验；重复失败又推进updated_at/reviewVersion，导致同一失败重复提醒。源证据不足不等于权益改变。

## 修复

1. 旧摘录缺失仍须新原文落在完整sourceText中，并在同一事实槽识别明确替换的数量/单位、日期或可识别资格。翻译、格式、扩句/截句、只省略条件均不足以重开。未识别语义保留人工核验，不能猜是变更或下架。
2. 固定X/status不会因同URL重抽自动重开；同帖、同模型、同免费/延长语义的别名沿用主ID。不同模型、渠道、资格、机制及公告仍有边界保护。
3. 已evidence_missing的重复失败不推进reviewVersion；正文恢复仍正常复核。
4. X原帖采用第一方cdn.syndication.twimg.com嵌入读取，必须检查id_str及作者screen_name；记录fetchedUrl，finalUrl为核对后的原帖地址，其他平台的普通读取不变。错误身份、空/已知截断文本不升级来源。
5. 生产Space Bunny重复项按duplicate拒绝；云知声与WorkBuddy纯漂移提案关闭。保留已批准价值、期限、模型和领取方式。实读当前官方原文后修正证据摘录；WorkBuddy公开奖励邀请链接的requirements一次性纠正为none，保留app及国际100/350权益，不重新上架。

## 验证与运行范围

原代码可复现语言切换、扩句、拒绝同版换译文和同帖新ID的漏拦。回归覆盖这些场景，以及真实额度/日期/资格替换、不同公告/渠道/模型/机制、旧线索关联、失败幂等及第一方读取身份不符。

一次性生产处理的读回确认：三个主项保持approved、无pendingUpdate；Space Bunny别名rejected；额度、估值、时间、模型与领取方式均按已批准原版比较保持一致。不能用后台返回的待审候选当原版；比较前按updateDiff.from还原基线。

本地typecheck、301项项目测试、8项审核脚本测试、build:web通过。发布与线上重放在下文另记，不能从单元测试或本地合并推断已上线。

## 线上验收

代码5a253e0已推送main并部署，Worker版本bdb1d201-c95f-471e-bd76-08aee941459d。三条官方原文分别匹配1/4/3段摘录，直接来源核验通过。实际正文各重放2次，Space Bunny使用全新ID与不同措辞：6次均返回unchanged且归原主ID，无新增行/提案，完整管理视图及主reviewVersion保持一致。拒绝记忆在U2-Flash和WorkBuddy重放中生效。该凭证仅证明本轮已验收的路径；未知语义仍须人工核对。

## 后续待审扫描

同日剩余4项逐一核对：2px3普通Muse免费层按other拒绝；rgjd重复已拒API首发付费折扣，按duplicate拒绝；neme为未收过的Pixel9Pro独立历史活动（2024-08-07至2025-11-15），不同于已批准的Pixel10/11，保留历史待审、type改gift；5nja企业专项赠金与七天开发者窗口不同，保留待审并清除无依据的2025截止年份，申请上限$10,000独立记录。原普通折扣/免费层的换ID措辞记忆补入硬去重，不误合并新量化赠额、身份优惠或不同设备代际。
