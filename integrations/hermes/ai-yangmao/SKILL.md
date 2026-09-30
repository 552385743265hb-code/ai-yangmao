---
name: ai-yangmao
description: >
  AI 羊毛牧场（ai-yangmao.com）的管理和查询。凡是涉及"羊毛""AI 免费额度""待审""日报"，
  或者用户回复带 4 位短码的指令（如"通过 a3f9""拒绝 kesd 付费套餐额度""看一下 p5x9"），
  或者转发/粘贴一个链接并说"补录""收一下""这个羊毛"，都必须用本技能。
  也用于"今天有什么羊毛""10 月 5 日能薅什么""采集正常吗"这类查询。
  NOT for：一般 AI 新闻、模型发布资讯（本项目只收能薅的额度和权益）。
---

# AI 羊毛牧场

所有操作都通过项目自带的命令行工具完成，**不要自己拼 HTTP 请求，也不要读取或显示任何密钥**：

```bash
cd /Volumes/AI/MyWorkspace/AI_Freebies && ./node_modules/.bin/tsx scripts/ym.ts <命令>
```

下文用 `ym` 代指上面这一整行。

## 命令

| 用户说 | 执行 |
|---|---|
| 看待审 / 有什么要审的 | `ym queue` |
| 看一下 a3f9 / a3f9 详情 | `ym show a3f9` |
| 通过 a3f9（可以一次多个：通过 a3f9 kesd） | 逐个 `ym approve <短码>` |
| 拒绝 a3f9 [理由] | `ym reject a3f9 <理由>`。理由尽量以这些词开头，便于统计：付费套餐 / 非AI / 平台错 / 重复 / 过期 / 额度不明 / 分类错 |
| 改 a3f9 的截止日期为 10-31 并通过 | `ym edit a3f9 claimEnd=2026-10-31 endKind=date --approve --reason <用户说的原因>` |
| 看线索 / 有什么新线索 | `ym leads` |
| 忽略线索 #12 | `ym dismiss 12` |
| 补录 <链接> [备注] / 转发来一个链接说"收一下" | `ym add <链接> <备注>` |
| 今天有什么羊毛 | `ym today` |
| 某天能薅什么（10 月 5 日） | `ym on 2026-10-05`（年份默认今年） |
| 采集正常吗 | `ym health --verbose` |
| 准入 / 拒绝新平台 xxx | `ym platform-approve <id>` / `ym platform-reject <id>` |
| 放开 / 关闭某信源的自动上架 | `ym auto-publish <信源id> on` / `off` |
| 官方宣布撤回某条权益 | 核对原文后执行 `ym withdraw <短码> <官方撤回链接> <具体理由>` |
| 核对结果不明的 Telegram 推送 | `ym health --verbose` 查看 ID；确认收到后执行 `ym delivery-delivered <ID> <核对依据>`，确认没收到后执行 `ym delivery-unsent <ID> <核对依据>` |

`edit` 可改字段：title type valueText usdEstimate claimStart claimEnd endKind creditValidity audience requirements modalities platformId sourceTz claimMethod。
- type：new 注册新人礼 / free 限时免费开放 / perk 会员福利 / topup 充值赠送 / gift 会员免费送 / standing 常驻免费额度 / apply 申请制
- endKind：date（有截止日期）/ unknown（截止未知）/ standing（只用于常驻和申请制）
- requirements 逗号分隔：none phone card net realname biz student invite targeted pay:¥100 member:会员名
- 日期一律 YYYY-MM-DD，按官方时区

## 审核时帮用户把关

用户让你"帮我看看这几条该不该过"时，按这些规则给建议，最后由用户决定：
- **该拒**：付费套餐本身自带的额度（如 PRO 会员每月 credits）；不是 AI 使用额度的权益（工作区、存储、席位）；不属于该平台的权益（别家产品）；普通降价打折；来路不明的中转站。
- **该改**：类型、截止日期、门槛明显不对的，用 `edit` 改完再通过。
- **证据缺项**多的（缺 2 项以上），提醒用户先 `show` 看原文再决定。
- 员工账号来源的（如 Codex 重置），提醒用户核对原帖。

## 让模型越来越准

用户的每次修改和拒绝都会被当成纠错样本喂给抽取模型，所以：
- 拒绝或修改时，**一定把用户说的原因原样带上**（`--reason` 或拒绝理由）；用户没说原因、原因又不明显时，问一句"为什么？我记下来让模型以后别再犯"。
- 用户问"最近准确率怎么样"，告诉他网页后台的"准确率"页：https://ai-yangmao.com/#admin

## 回复风格

- 中文、简短，直接转述命令输出的要点；列表保留短码，方便用户接着回复。
- 命令报错时，原样告诉用户错误信息，不要猜测或重试多次。
- 一次通过/拒绝多条时，最后汇总一句"已通过 N 条、拒绝 M 条"。
