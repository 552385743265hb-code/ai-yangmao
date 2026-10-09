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

文档路径以项目根目录 `/Volumes/AI/MyWorkspace/AI_Freebies` 为基准，安装到 Hermes 后也不能按技能安装目录解析：`docs/data-contract.md`、`pipeline/learned-rules.md`、`pipeline/platform-notes.md`；命令与权限见 `docs/operations.md`，完整索引 `docs/README.md`。当前口径覆盖历史设计决定。

## 命令

| 用户说 | 执行 |
|---|---|
| 看待审 / 有什么要审的 | `ym queue` |
| 看一下 a3f9 / a3f9 详情 | `ym show a3f9` |
| 通过 a3f9（可以一次多个：通过 a3f9 kesd） | 逐个 `ym approve <短码>` |
| 拒绝 a3f9 [理由] | `ym reject a3f9 <理由>`。理由尽量以这些词开头，便于统计：付费套餐 / 非AI / 平台错 / 重复 / 日期无法确认 / 额度不明 / 分类错 |
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
- type：new 注册新人礼 / trial 应用尝鲜 / free 限时免费开放 / perk 会员福利 / topup 历史充值赠送/身份专享折扣 / gift 会员免费送 / standing 常驻免费额度 / apply 申请制
- endKind：date（有截止日期）/ unknown（截止未知）/ standing（只用于常驻和申请制）
- requirements 逗号分隔：none phone card net realname biz student invite targeted pay:¥100 member:会员名
- 日期一律 YYYY-MM-DD，按官方时区

## 审核时帮用户把关

用户让你"帮我看看这几条该不该过"时，按这些规则给建议，最后由用户决定：
- **该拒**：付费套餐本身自带的额度（如 PRO 会员每月 credits）；不是 AI 使用额度的权益（工作区、存储、席位）；不属于该平台的权益（别家产品）；普通降价打折；来路不明的中转站。
- **该改**：按数据合同逐项补字段；修改默认保持待审，只有用户明确授权通过时才用 `--approve`。
- **历史**：已结束但属实、起止日期可确认的活动可以作为历史上架；结束本身不是拒绝理由。
- 学生、教师、设备认证的免费会员或五折及以下优惠，以及首月实付不超过 $1 的优惠按通用规则保留。免费套餐只收可量化额度。
- 官方原文未核实就保留待审；`tested` 只能由管理员亲测确认。
- **证据缺项**多的（缺 2 项以上），提醒用户先 `show` 看原文再决定。
- 员工账号来源的（如 Codex 重置），提醒用户核对原帖。

## 完整审核与角色边界

`ym edit` 的上述字段列表有限。模型、标签、额度范围上限、步骤和完整证据等用仓库审核脚本（从项目根目录运行）：

```bash
npx tsx .claude/skills/yangmao-review/scripts/offer.ts plan <短码> patch.json
npx tsx .claude/skills/yangmao-review/scripts/offer.ts apply <短码> patch.json --reason "核实依据"
npx tsx .claude/skills/yangmao-review/scripts/offer.ts suggest <短码> judge --reason "需要管理员判断"
```

`plan` 只试算；`apply` 默认只补字段；`suggest` 仅写内部建议，不通过或拒绝。对已上架条目用 `reject` 持久记住被拒证据后移除更新提案；管理员确需下架时用审核脚本 `unpublish`，官方撤回则用 `ym withdraw`。

审核员可以处理条目、建议、核验记录和线索；不能下架、撤回、批准平台、启用自动上架或处理推送台账。平台准入与条目通过是两件事。`ym` 使用本机管理员密钥，不代表本次任务已授权执行管理员动作。`digest` / `urgent` 只预览，`dispatch` 发送消息必须得到用户明确授权。

## 让模型越来越准

用户的每次修改和拒绝都会被当成纠错样本喂给抽取模型，所以：
- 拒绝或修改时，**一定把用户说的原因原样带上**（`--reason` 或拒绝理由）；用户没说原因、原因又不明显时，问一句"为什么？我记下来让模型以后别再犯"。
- 用户问"最近准确率怎么样"，告诉他网页后台的"准确率"页：https://ai-yangmao.com/#admin

## 回复风格

- 中文、简短，直接转述命令输出的要点；列表保留短码，方便用户接着回复。
- 命令报错时，原样告诉用户错误信息，不要猜测或重试多次。
- 一次通过/拒绝多条时，最后汇总一句"已通过 N 条、拒绝 M 条"。

收录排除与审核稳定性统一按项目数据合同和通用规则；消费返利、首购/升级付费/充值触发赠额不收。模型改写不等于官方条款变化，新ID也必须查重。原文匹配失败先核对默认页与折叠弹窗；人工核对后retested仅恢复有效性，不代替接受更新。
