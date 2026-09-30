// ym：AI 羊毛牧场的命令行工具，给 Hermes Agent 的技能调用（也可以自己在终端用）。
// 密钥从项目根目录的 .prod.secrets 读取（ADMIN_TOKEN）。输出为适合直接发到 Telegram 的中文纯文本。
import { readFileSync } from 'node:fs';

const env: Record<string, string> = {};
for (const line of readFileSync(new URL('../.prod.secrets', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/#.*$/, '').trim();
}
const BASE = (process.env.API_BASE ?? env.API_BASE ?? 'https://ai-yangmao.com').replace(/\/$/, '');

async function call<T = any>(path: string, body?: unknown, admin = true): Promise<T> {
  const res = await fetch(`${BASE}/api${admin ? '/admin' : ''}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${env.ADMIN_TOKEN ?? ''}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({})) as any;
  if (!res.ok) { console.error(`出错（${res.status}）：${j.error ?? ''}${j.issues ? ' ' + JSON.stringify(j.issues).slice(0, 300) : ''}`); process.exit(1); }
  return j as T;
}

const REQ: Record<string, string> = { none: '零门槛', phone: '海外手机号', card: '海外信用卡', net: '海外网络', realname: '实名', biz: '企业认证', student: '学生认证', invite: '邀请码', targeted: '定向发放' };
const req = (r: string[]) => r.map(x => x.startsWith('pay:') ? `充值 ${x.slice(4)}` : x.startsWith('member:') ? `会员 ${x.slice(7)}` : REQ[x] ?? x).join('、');
const AUD: Record<string, string> = { new: '新用户', old: '老用户', all: '全部用户', unclear: '资格未明确' };
const line = (o: any) => `[${o.code}] ${o.platform}｜${o.title}\n     ${o.value} · ${o.end}`;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());

const HELP = `用法：ym <命令>
  queue                 看待审（羊毛、新平台、可放开自动上架的信源）
  show <短码>           看一条羊毛的全部字段和官方证据
  approve <短码>        通过
  reject <短码> [理由]  拒绝
  edit <短码> 字段=值 … [--approve]  修改字段（可同时通过）。字段：title type valueText usdEstimate claimStart claimEnd endKind creditValidity audience requirements modalities platformId sourceTz claimMethod
  leads [数量]          看最新线索
  dismiss <线索id>      忽略线索
  add <链接> [备注]     补录链接（下一轮采集抓取并抽取，进待审）
  today                 今天能领的羊毛
  on <YYYY-MM-DD>       某一天有效的限时羊毛
  digest [--commit]     日报内容（--commit 记入通知台账；没有变化时不输出）
  urgent [--commit]     48 小时内截止的新上架（加急提醒）
  health                采集健康状况（有问题才输出，--verbose 总是输出）
  platform-approve <平台id> / platform-reject <平台id>
  auto-publish <信源id> on|off`;

const [cmd, ...args] = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const rest = args.filter(a => !a.startsWith('--'));

switch (cmd) {
  case 'queue': {
    const q = await call('/queue');
    if (!q.pending.length && !q.pendingPlatforms.length && !q.suggestAutoPublish.length) { console.log(`待审队列是空的。新线索 ${q.newLeads} 条。`); break; }
    console.log(`待审 ${q.pending.length} 条（新线索 ${q.newLeads} 条）`);
    for (const o of q.pending) console.log(`${line(o)}\n     证据缺：${o.missingEvidence.join('、') || '无'} · 门槛：${req(o.requirements)}`);
    if (q.pendingPlatforms.length) console.log(`\n新平台待准入：${q.pendingPlatforms.map((p: any) => `${p.name}（${p.id}）`).join('、')}`);
    for (const s of q.suggestAutoPublish) console.log(`\n建议放开自动上架：${s.id}（已连续原样通过 ${s.cleanStreak} 条）→ ym auto-publish ${s.id} on`);
    break;
  }
  case 'show': {
    const { offer: o, revisions } = await call(`/offers/${rest[0]}`);
    console.log(`[${o.code}] ${o.title}（${o.platform}）
类型：${o.type}　状态：${o.status}　审核：${o.reviewState}
额度：${o.value}${o.usd != null ? `（约 $${o.usd}）` : ''}
领取：${o.claimMethod}　${o.claimStart ?? '已开放'} → ${o.end}（官方时区 ${o.sourceTz}）　额度有效期：${o.creditValidity ?? '未写'}
资格：${AUD[o.audience]}；${req(o.requirements)}
证据（${o.evidenceTier}）：${o.evidenceUrl}
  权益：${o.excerpts.benefit ?? '—'}
  资格：${o.excerpts.eligibility ?? '—'}
  领取：${o.excerpts.claim ?? '—'}
  有效期：${o.excerpts.validity ?? '—'}
${revisions.length ? `修订：${revisions.map((r: any) => r.diff.map((x: any) => `${x.field} ${x.from}→${x.to}`).join('；')).join(' / ')}\n` : ''}网页：${o.link}`);
    break;
  }
  case 'approve': case 'reject': {
    const r = await call(`/offers/${rest[0]}/${cmd}`, { reason: rest.slice(1).join(' ') || undefined });
    console.log(`${cmd === 'approve' ? '已通过' : '已拒绝'}：[${r.code}] ${r.title}${r.sourceCleanStreak != null ? `（该信源连续原样通过 ${r.sourceCleanStreak} 条）` : ''}${r.urgent ? '\n⚠️ 48 小时内截止，下一次整点检查会发加急提醒' : ''}`);
    break;
  }
  case 'edit': {
    const fields: Record<string, unknown> = {};
    for (const kv of rest.slice(1)) {
      const i = kv.indexOf('='); if (i < 0) continue;
      const k = kv.slice(0, i), v = kv.slice(i + 1);
      fields[k] = ['requirements', 'modalities'].includes(k) ? v.split(',') : k === 'usdEstimate' ? (v === 'null' ? null : Number(v)) : v === 'null' ? null : v;
    }
    const r = await call(`/offers/${rest[0]}/edit`, { fields, approve: flag('--approve') });
    console.log(`已修改 [${r.code}]：${r.changed.join('、')}${r.approved ? '，并已通过' : ''}`);
    break;
  }
  case 'leads': {
    const { leads } = await call(`/leads?limit=${rest[0] ?? 15}`);
    console.log(leads.length ? leads.map((l: any) => `#${l.id} ${l.origin}｜${l.title}\n     ${l.url}`).join('\n') : '没有新线索。');
    break;
  }
  case 'dismiss': { await call(`/leads/${rest[0]}/dismiss`, {}); console.log(`已忽略线索 #${rest[0]}`); break; }
  case 'add': {
    const r = await call('/manual', { url: rest[0], note: rest.slice(1).join(' ') || undefined });
    console.log(`已补录（线索 #${r.leadId}），下一轮采集会抓取并抽取，结果进待审。`);
    break;
  }
  case 'today': case 'on': {
    const date = cmd === 'today' ? today() : rest[0];
    const r = await call(`/offers?${cmd === 'today' ? 'view=claimable' : `on=${date}`}`, undefined, false);
    if (!r.offers.length) { console.log(`${date} 没有收录到可领的羊毛。`); break; }
    console.log(`${cmd === 'today' ? '今天' : date} 可领 ${r.count} 条：`);
    for (const o of r.offers) console.log(`• ${o.title}｜${o.valueText}${o.endKind === 'date' ? ` · ${o.claimEnd} 截止` : o.endKind === 'unknown' ? ' · 截止未知' : ''}\n  https://ai-yangmao.com/#offer-${o.id}`);
    break;
  }
  case 'digest': case 'urgent': {
    const r = await call(`/notify?kind=${cmd}&channel=telegram${flag('--commit') ? '&commit=1' : ''}`);
    if (r.empty) break; // 没有变化不输出 → Hermes 定时任务不发空消息
    const d = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric' }).format(new Date());
    const sec = (t: string, a: any[]) => a.length ? `\n${t}（${a.length}）\n${a.map(line).join('\n')}\n` : '';
    if (cmd === 'urgent') console.log(`⚡ 加急：48 小时内截止\n${r.items.urgent.map(line).join('\n')}`);
    else console.log(`🐑 AI 羊毛牧场日报 · ${d}\n${sec('🆕 新上架', r.items.new)}${sec('⏰ 3 天内结束', r.items.ending)}${sec('🔄 条款变化', r.items.changed)}${sec('❌ 已结束', r.items.ended)}${r.pendingCount ? `\n📝 待审 ${r.pendingCount} 条，回复"看待审"处理` : ''}\n\n网页：https://ai-yangmao.com`);
    break;
  }
  case 'health': {
    const h = await call('/health');
    const bad = h.collectStale || h.failingSources.length;
    if (!bad && !flag('--verbose')) break;
    console.log(`${bad ? '🚨 采集告警' : '✅ 采集正常'}：最近一次成功采集 ${h.lastSuccessfulCollect ? `${h.hoursSince.toFixed(1)} 小时前` : '从未成功'}${h.failingSources.length ? `\n连续失败的信源：\n${h.failingSources.map((s: any) => `• ${s.id}（${s.failStreak} 次）：${s.lastError ?? ''}`).join('\n')}` : ''}`);
    break;
  }
  case 'platform-approve': case 'platform-reject': { await call(`/platforms/${rest[0]}/${cmd.slice(9)}`, {}); console.log(`平台 ${rest[0]} 已${cmd.endsWith('approve') ? '准入' : '拒绝'}`); break; }
  case 'auto-publish': { const r = await call(`/sources/${rest[0]}/auto-publish`, { on: rest[1] !== 'off' }); console.log(`信源 ${rest[0]} 自动上架：${r.autoPublish ? '已放开' : '已关闭'}`); break; }
  default: console.log(HELP);
}
