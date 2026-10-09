/* ============================================================
 * AI 羊毛牧场 · 网页主程序（构建时与 data.js 合并；ECharts 自托管）
 * ============================================================ */

/* ---------- 基础工具 ---------- */
const DAY = 864e5;
let NOW = new Date();
let T0 = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
const dayAt = n => new Date(T0.getFullYear(), T0.getMonth(), T0.getDate() + n);
const pad = n => String(n).padStart(2, '0');
const ymd = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const md = dt => `${dt.getMonth() + 1}月${dt.getDate()}日`;
const hm = dt => `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
const dayIdx = dt => Math.round((new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()) - T0) / DAY);
const WD = ['日', '一', '二', '三', '四', '五', '六'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sum = (a, f) => a.reduce((x, o) => x + f(o), 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uniq = a => [...new Set(a)];
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function hash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FONT = '"Rubik","PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",sans-serif';
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 存不了就只在本次打开有效 */ } },
};
function tzOffset(tz, date) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(date).map(x => [x.type, x.value]));
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - date.getTime()) / 60000;
}
function zonedToDate(y, m, d, h, mi, tz, sec = 0) { const guess = Date.UTC(y, m, d, h, mi, sec); const first = guess - tzOffset(tz, new Date(guess)) * 60000; return new Date(guess - tzOffset(tz, new Date(first)) * 60000); }
function luminance(hex) {
  const m = hex.replace('#', '').match(/.{2}/g); if (!m) return 0.5;
  const [r, g, b] = m.map(x => { const c = parseInt(x, 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const onColor = hex => luminance(hex) > 0.32 ? '#1c2921' : '#ffffff';
function hexA(hex, a) { const m = hex.replace('#', '').match(/.{2}/g); if (!m) return hex; const [r, g, b] = m.map(x => parseInt(x, 16)); return `rgba(${r},${g},${b},${a})`; }

/* ---------- 主题色（从 CSS 变量读取，切换深浅色时重读） ---------- */
function tk() {
  const s = getComputedStyle(document.documentElement); const g = n => s.getPropertyValue(n).trim();
  return {
    bg: g('--bg'), surface: g('--surface'), surface2: g('--surface-2'), ink: g('--ink'), ink2: g('--ink-2'), muted: g('--muted'),
    line: g('--line'), line2: g('--line-2'), tag: g('--tag'), tagSoft: g('--tag-soft'), good: g('--good'), warn: g('--warn'), serious: g('--serious'), critical: g('--critical'),
    s: [1, 2, 3, 4, 5, 6, 7, 8].map(i => g('--s' + i)), q: [0, 1, 2, 3, 4, 5, 6, 7].map(i => g('--q' + i)),
  };
}
let TK = tk();
const typeColor = ty => TK.s[TYPES[ty].slot - 1];
const ptypeColor = pt => TK.s[PTYPE[pt].slot - 1];
const typeVar = ty => `var(--s${TYPES[ty].slot})`;

/* ---------- 数据准备 ---------- */
let PMAP = {}, OMAP = {}, MEMBERS = [], LAST_OK = null;
/** 数据加载后调用：建立索引，计算依赖数据的统计。 */
function prepare() {
  PMAP = Object.fromEntries(PLATFORMS.map(p => [p.id, p]));
  OFFERS = OFFERS.filter(o => PMAP[o.p]);
  OFFERS.forEach(o => { o.plat = PMAP[o.p]; });
  OMAP = Object.fromEntries(OFFERS.map(o => [o.id, o]));
  MEMBERS = uniq(OFFERS.flatMap(o => o.r.filter(r => r.startsWith('member:')).map(r => r.slice(7))));
  LAST_OK = META.lastSuccessfulCollect ? new Date(META.lastSuccessfulCollect) : null;
  RACE = computeRace(); TREND = computeTrend();
  HOLIDAYS.forEach(h => { h.past = holidayPast(h); });
}
/** 往年同一节日前后 7 天内有效过的活动，按平台列出（只用已收录的历史数据推算）。 */
function holidayPast(h) {
  const [y, m, d] = h.d.split('-').map(Number), names = [];
  for (let back = 1; back <= 3; back++) {
    const c = dayIdx(new Date(y - back, m - 1, d)), from = c - 7, to = c + 7;
    OFFERS.forEach(o => {
      const end = o.ek === 'date' ? o.e : o.withdrawnAt ? dayIdx(new Date(o.withdrawnAt)) : o.since;
      if (isLimited(o) && o.since <= to && end >= from) names.push(`${o.plat.name}（${y - back}）`);
    });
  }
  return uniq(names).join('、');
}
const isLimited = o => o.ty !== 'standing' && o.ty !== 'apply';
function statusOf(o, k = 0) {
  const at = k === 0 ? new Date() : dayAt(k);
  if (o.withdrawnAt && Date.parse(o.withdrawnAt) <= at.getTime()) return 'ended';
  if (o.ek === 'date' && endInstant(o).getTime() < at.getTime()) return 'ended';
  if (o.verify === 'evidence_missing') return 'stale';
  const age = o.verifiedAt ? at.getTime() - Date.parse(o.verifiedAt) : Infinity;
  if (o.ty === 'standing') return age >= 14 * DAY ? 'stale' : 'standing';
  if (o.ty === 'apply') return age >= 14 * DAY ? 'stale' : 'open';
  if (o.s != null && startInstant(o).getTime() > at.getTime()) return 'upcoming';
  // 与 src/shared/lifecycle.ts 一致：管理员实测的限时活动，有截止日期就到截止前一直有效，否则 7 天内要复测
  if (age > (o.st === 'tested' ? (o.ek === 'date' ? Infinity : 7 * DAY) : 48 * 3600_000)) return 'stale';
  if (o.ek === 'date' && endInstant(o).getTime() - at.getTime() <= 3 * DAY) return 'ending';
  return 'active';
}
const ST = {
  active: { l: '进行中', i: '●', c: 'good' }, ending: { l: '即将结束', i: '◔', c: 'serious' }, upcoming: { l: '未开始', i: '◷', c: '' },
  ended: { l: '已结束', i: '✕', c: '' }, standing: { l: '常驻', i: '∞', c: '' }, stale: { l: '待核验', i: '!', c: 'warn' }, open: { l: '长期开放', i: '◎', c: '' },
};
const activeLimited = o => isLimited(o) && ['active', 'ending'].includes(statusOf(o));
const claimable = o => ['active', 'ending', 'standing'].includes(statusOf(o));
const activeOn = (o, k) => {
  if (!isLimited(o) || statusOf(o) === 'stale') return false;
  const from = o.s == null ? Date.parse(o.discoveredAt) : startInstant(o).getTime();
  const to = Math.min(o.ek === 'date' ? endInstant(o).getTime() : Infinity, o.withdrawnAt ? Date.parse(o.withdrawnAt) : Infinity);
  return from < dayAt(k + 1).getTime() && to >= dayAt(k).getTime();
};
const endInstant = o => { const d = dayAt(o.e); return zonedToDate(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, o.tz, 59); };
const startInstant = o => { if (o.s == null) return new Date(o.discoveredAt); const d = dayAt(o.s); return zonedToDate(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, o.tz); };
const actualEnd = o => { const times = [o.ek === 'date' ? endInstant(o).getTime() : NaN, o.withdrawnAt ? Date.parse(o.withdrawnAt) : NaN].filter(Number.isFinite); return times.length ? new Date(Math.min(...times)) : null; };

/* ---------- 我的条件 / 我的清单（只存在本机浏览器） ---------- */
const C = Object.assign({ only: false, phone: false, card: false, net: false, student: false, biz: false, invite: false, realname: true, pay: true, members: [] }, LS.get('ym-cond', {}));
const savedMine = LS.get('ym-mine', {});
const MINE = { want: savedMine.want || [], claimed: savedMine.claimed || [], legacyGot: savedMine.legacyGot || (savedMine.claimed ? [] : savedMine.got || []) };
const localMonth = () => ymd(new Date()).slice(0, 7);
const claimedThisMonth = id => MINE.claimed.some(x => x.id === id && x.month === localMonth());
let CMP = [];
const COND_ITEMS = [
  ['net', '可以使用海外网络'], ['phone', '有海外手机号'], ['card', '有海外信用卡 / PayPal'], ['student', '有学生身份'],
  ['biz', '有公司可做企业认证'], ['invite', '手上有邀请码'], ['realname', '可以完成国内实名'], ['pay', '接受小额充值'],
];
function missing(o) {
  const miss = [];
  for (const r of o.r) {
    const [k, p] = r.split(':');
    if (k === 'none') continue;
    if (k === 'targeted') { miss.push(r); continue; }
    if (k === 'member') { if (!C.members.includes(p)) miss.push(r); continue; }
    if (!C[k]) miss.push(r);
  }
  return miss;
}
const eligible = o => missing(o).length === 0;
const view = arr => C.only ? arr.filter(eligible) : arr;
function reqLabel(r) { const [k, p] = r.split(':'); if (k === 'member') return `需会员 · ${p}`; if (k === 'pay') return `需充值 ${p}`; return REQ[k]; }
function reqChips(o, mark = false) {
  return `<div class="chips">${o.r.map(r => {
    const k = r.split(':')[0];
    let cls = '';
    if (mark && k !== 'none' && k !== 'targeted') cls = missing({ r: [r] }).length ? 'miss' : 'have';
    const pre = cls === 'have' ? '✓ ' : cls === 'miss' ? '✕ ' : '';
    return `<span class="chip ${cls}">${pre}${esc(reqLabel(r))}</span>`;
  }).join('')}</div>`;
}

/* ---------- 薅度雷达（全部按规则算，不调用模型） ---------- */
const REQ_PEN = { pay: 30, member: 35, phone: 25, card: 25, net: 10, realname: 5, biz: 40, student: 30, invite: 25, targeted: 30, unknown: 50 };
const EASE = { auto: 100, member: 90, signup: 80, code: 70, app: 65, topup: 50, form: 30 };
const SRCV = { site: 100, docs: 100, official: 85, staff: 70, tested: 80, media: 30 };
const DIMS = ['价值', '门槛低', '好领取', '剩余时间', '信源可信', '国内直领'];
const WEIGHTS = [0.25, 0.2, 0.15, 0.15, 0.1, 0.15];
function dims(o) {
  const v = clamp(Math.round(Math.log10(o.usd + 1) / Math.log10(1001) * 100), 3, 100);
  let th = 100; o.r.forEach(r => { th -= REQ_PEN[r.split(':')[0]] || 0; }); th = Math.max(5, th);
  const st = statusOf(o);
  let tm;
  if (!isLimited(o)) tm = st === 'stale' ? 40 : 100;
  else if (o.ek === 'unknown') tm = 60;
  else if (st === 'ended') tm = 0;
  else if (st === 'upcoming') tm = 100;
  else tm = clamp(Math.round((o.e + 1) / 30 * 100), 4, 100);
  const cn = o.cn ? 100 : (o.r.some(r => ['phone', 'card'].includes(r.split(':')[0])) ? 20 : 50);
  return [v, th, EASE[o.c], tm, SRCV[o.st], cn];
}
const score = o => Math.round(dims(o).reduce((a, x, i) => a + x * WEIGHTS[i], 0));

/* ---------- 文案格式 ---------- */
function money(u) {
  if (u >= 1000) return '$' + (u >= 10000 ? Math.round(u / 1000) : (u / 1000).toFixed(1)) + 'k';
  if (u >= 1) return '$' + Math.round(u).toLocaleString('en-US');
  return '$' + u.toFixed(2);
}
// 价值是范围时显示“$10–60”，排序和图表用保守的下限 o.usd
const usdText = o => o.usdMax != null && o.usdMax > o.usd ? `${money(o.usd)}–${money(o.usdMax).replace(/^\$/, '')}` : money(o.usd);
const valLabel = o => o.noUsd ? `<span style="font-size:.72em">${esc(o.v.length > 22 ? o.v.slice(0, 21) + '…' : o.v)}</span>` : o.ty === 'standing' ? `≈ ${usdText(o)}<small>每月</small>` : o.ty === 'apply' ? `最高 ${money(o.usdMax ?? o.usd)}` : `≈ ${usdText(o)}`;
function leftText(o) {
  const st = statusOf(o);
  if (st === 'ended') return actualEnd(o) ? `${md(actualEnd(o))}结束` : '已结束';
  if (st === 'upcoming') return o.s === 1 ? '明天开始' : `${o.s} 天后开始`;
  if (st === 'stale') return `${Math.round(-o.vf)} 天未核验成功`;
  if (st === 'standing') return `常驻 · ${ago(o.vf)}核验`;
  if (st === 'open') return '长期开放申请';
  if (o.ek === 'unknown') return '截止未知 · 每 24 小时复核';
  if (o.e === 0) return '今天结束';
  if (o.e === 1) return '明天结束';
  return `还剩 ${o.e} 天`;
}
function ago(vf) { const v = -vf; if (v < 1) return `${Math.max(1, Math.round(v * 24))} 小时前`; return `${Math.round(v)} 天前`; }
function cdText(ms) {
  if (ms <= 0) return '已结束';
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return (d ? `${d}天 ` : '') + `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
function barOf(o) {
  const st = statusOf(o);
  if (st === 'standing') return [1, 'var(--s6)'];
  if (st === 'stale') return [0.4, 'var(--warn)'];
  if (st === 'open') return [1, 'var(--s7)'];
  if (st === 'upcoming') return [1, 'var(--line-2)'];
  if (st === 'ended') return [0, 'var(--line-2)'];
  if (o.ek === 'unknown') return [0.6, 'var(--muted)'];
  const frac = clamp((o.e + 0.5) / Math.max(1, o.e - (o.s ?? o.e - 30)), 0.03, 1);
  return [frac, o.e === 0 ? 'var(--critical)' : st === 'ending' ? 'var(--serious)' : 'var(--good)'];
}

/* ---------- 小部件 ---------- */
const etagSvg = col => `<svg viewBox="0 0 14 16" aria-hidden="true"><rect x="4.5" y="0.5" width="5" height="4" rx="1.5" style="fill:${col}"/><rect x="0.5" y="3" width="13" height="12.5" rx="3.5" style="fill:${col}"/><circle cx="7" cy="6.6" r="1.5" style="fill:var(--surface)"/></svg>`;
const etag = ty => `<span class="etag">${etagSvg(typeVar(ty))}${TYPES[ty].l}</span>`;
function stChip(o) {
  const s = statusOf(o);
  let m = ST[s];
  if (s === 'ending' && o.e === 0) m = { l: '今天结束', i: '!', c: 'critical' };
  return `<span class="st ${m.c}"><b>${m.i}</b>${m.l}</span>`;
}
const stBadge = (c, i, l) => `<span class="st ${c}"><b>${i}</b>${l}</span>`;
function miniRadar(o, size = 66) {
  const d = dims(o), n = 6, c = size / 2, R = size / 2 - 5;
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [c + Math.cos(a) * r, c + Math.sin(a) * r].map(v => v.toFixed(1)).join(','); };
  const ring = f => Array.from({ length: n }, (_, i) => pt(i, R * f)).join(' ');
  const poly = d.map((v, i) => pt(i, R * Math.max(v, 6) / 100)).join(' ');
  const col = typeVar(o.ty);
  return `<svg class="oc-radar" viewBox="0 0 ${size} ${size}" aria-hidden="true"><polygon points="${ring(1)}" style="fill:var(--surface-2);stroke:var(--line-2)"/><polygon points="${ring(0.5)}" style="fill:none;stroke:var(--line-2)"/><polygon points="${poly}" style="fill:${col};fill-opacity:.3;stroke:${col};stroke-width:1.6;stroke-linejoin:round"/></svg>`;
}
function spark(vals) {
  const w = 120, h = 30, p = 3, mx = Math.max(...vals), mn = Math.min(...vals);
  const x = i => p + i * (w - 2 * p) / (vals.length - 1), y = v => h - p - (v - mn) / ((mx - mn) || 1) * (h - 2 * p);
  const line = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${line}L${x(vals.length - 1)},${h}L${x(0)},${h}Z" style="fill:currentColor;opacity:.13"/><path d="${line}" style="fill:none;stroke:currentColor;stroke-width:2;vector-effect:non-scaling-stroke;stroke-linejoin:round"/></svg>`;
}
function ringSvg(frac, size, col, stroke = 6) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, m = size / 2;
  return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${m}" cy="${m}" r="${r}" style="fill:none;stroke:var(--surface-2);stroke-width:${stroke}"/><circle cx="${m}" cy="${m}" r="${r}" transform="rotate(-90 ${m} ${m})" style="fill:none;stroke:${col};stroke-width:${stroke};stroke-linecap:round;stroke-dasharray:${(c * clamp(frac, 0, 1)).toFixed(1)} ${c.toFixed(1)}"/></svg>`;
}
function emptySheep(msg) {
  return `<div class="empty"><svg viewBox="0 0 120 80" aria-hidden="true"><ellipse cx="60" cy="72" rx="44" ry="5" style="fill:var(--surface-2)"/><g transform="translate(64,46)"><g style="fill:var(--wool);stroke:var(--wool-edge);stroke-width:2">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle cx="${(Math.cos(i / 8 * 6.28) * 17).toFixed(1)}" cy="${(Math.sin(i / 8 * 6.28) * 10 - 2).toFixed(1)}" r="8"/>`).join('')}</g><ellipse cx="0" cy="-2" rx="18" ry="11" style="fill:var(--wool)"/><g style="fill:var(--face)"><rect x="-12" y="7" width="3.5" height="12" rx="1.5"/><rect x="8" y="7" width="3.5" height="12" rx="1.5"/><ellipse cx="-22" cy="-6" rx="6.5" ry="8.5"/></g><circle cx="-24" cy="-8" r="1.3" style="fill:#fff"/></g><path d="M18 70 l3 -8 l3 8 M28 71 l2 -6 l2 6 M96 70 l3 -7 l3 7" style="fill:none;stroke:var(--hill-4);stroke-width:1.6;stroke-linecap:round"/></svg><div>${msg}</div></div>`;
}

/* ---------- 图标 ---------- */
const svgI = inner => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICON = {
  today: svgI('<circle class="ic-dot" cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>'),
  calendar: svgI('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><rect class="ic-dot" x="7" y="13" width="4" height="4" rx="1"/>'),
  timeline: svgI('<rect class="ic-dot" x="3" y="5" width="11" height="3.6" rx="1.8"/><rect x="8" y="10.2" width="13" height="3.6" rx="1.8"/><rect x="5" y="15.4" width="9" height="3.6" rx="1.8"/>'),
  insights: svgI('<path d="M3.5 19.5h17"/><path d="M5 15l4-4.5 3.5 3 6.5-7.5"/><circle class="ic-dot" cx="19" cy="6" r="2.2"/>'),
  all: svgI('<rect class="ic-dot" x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'),
  library: svgI('<path class="ic-dot" d="M12 12c-2-2.6-3.6-4-5.6-4a4 4 0 0 0 0 8c2 0 3.6-1.4 5.6-4zm0 0c2 2.6 3.6 4 5.6 4a4 4 0 0 0 0-8c-2 0-3.6 1.4-5.6 4z"/>'),
  apply: svgI('<path d="M7 3.5h7l4.5 4.5v12.5H7z"/><path d="M14 3.5V8h4.5"/><path class="ic-dot" d="M9.5 13h6M9.5 16.5h4"/>'),
  models: svgI('<circle class="ic-dot" cx="6" cy="7" r="2.6"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="17.5" r="2.6"/><path d="M8.3 8.3l2.6 6.7M15.9 7.3l-2.9 7.9M8.5 6.8l7.3-.6"/>'),
  mine: svgI('<circle class="ic-dot" cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.8 4.1-5.6 7.5-5.6s6.3 1.8 7.5 5.6"/>'),
  coverage: svgI('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle class="ic-dot" cx="12" cy="12" r="1.4"/><path d="M12 12l6-6"/>'),
  admin: svgI('<circle class="ic-dot" cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5"/>'),
  more: svgI('<circle class="ic-dot" cx="5.5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18.5" cy="12" r="1.7"/>'),
};
const BRAND = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" style="fill:var(--tag-soft)"/><g style="fill:var(--wool);stroke:var(--wool-edge);stroke-width:1.4">${[0, 1, 2, 3, 4, 5, 6].map(i => `<circle cx="${(20 + Math.cos(i / 7 * 6.28 - 1.57) * 8).toFixed(1)}" cy="${(17 + Math.sin(i / 7 * 6.28 - 1.57) * 6).toFixed(1)}" r="5"/>`).join('')}</g><circle cx="20" cy="17" r="7" style="fill:var(--wool)"/><ellipse cx="20" cy="23" rx="6.4" ry="8" style="fill:var(--face)"/><ellipse cx="12.5" cy="20" rx="4.2" ry="1.8" transform="rotate(-20 12.5 20)" style="fill:var(--face)"/><ellipse cx="27.5" cy="20" rx="4.2" ry="1.8" transform="rotate(20 27.5 20)" style="fill:var(--face)"/><rect x="27.2" y="20.5" width="4" height="5" rx="1.3" style="fill:var(--tag)"/><circle cx="17.6" cy="22" r="1.1" style="fill:#fff"/><circle cx="22.4" cy="22" r="1.1" style="fill:#fff"/></svg><span>AI 羊毛牧场</span>`;

/* ---------- 图表 ---------- */
const CHARTS = new Set();
function baseOpt() {
  return {
    textStyle: { fontFamily: FONT, color: TK.ink2 },
    tooltip: { backgroundColor: TK.surface, borderColor: TK.line2, borderWidth: 1, padding: [8, 11], textStyle: { color: TK.ink, fontSize: 12.5, fontFamily: FONT }, extraCssText: 'border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.14);' },
    animation: !REDUCED, animationDuration: 650, animationEasing: 'cubicOut',
  };
}
function chart(el, opt, set = CHARTS) {
  if (typeof el === 'string') el = $(el);
  if (!el) return null;
  const c = echarts.init(el, null, { renderer: 'svg' });
  const b = baseOpt();
  if (opt.tooltip) opt.tooltip = Object.assign({}, b.tooltip, opt.tooltip);
  c.setOption(Object.assign(b, opt));
  set.add(c);
  return c;
}
const axisCommon = () => ({ axisLine: { lineStyle: { color: TK.line2 } }, axisTick: { show: false }, axisLabel: { color: TK.muted, fontSize: 11.5 }, splitLine: { lineStyle: { color: TK.line } } });
const legendCommon = () => ({ icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 12, textStyle: { color: TK.ink2, fontSize: 12 } });

/* ---------- 浮层提示 ---------- */
const tip = () => $('#tip');
function showTip(html, x, y) {
  const t = tip(); t.innerHTML = html; t.hidden = false;
  const w = t.offsetWidth, h = t.offsetHeight;
  let left = x + 14, top = y + 14;
  if (left + w > innerWidth - 8) left = x - w - 14;
  if (top + h > innerHeight - 8) top = y - h - 14;
  t.style.left = Math.max(8, left) + 'px'; t.style.top = Math.max(8, top) + 'px';
}
const hideTip = () => { tip().hidden = true; };
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'tray'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; t.style.zIndex = 90;
  clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 2200);
}

/* ============================================================
 * 羊群主视觉：每只羊一条羊毛。体型 = 价值，耳标颜色 = 类型，羊毛厚度 = 剩余时间。
 * ============================================================ */
function woolRatio(o) { if (o.ek === 'unknown') return 0.7; return clamp(o.e / 10, 0, 1); }
function sheepSvg(p) {
  const o = p.o, r = rng(hash(o.id)), flip = hash(o.id) % 2 ? -1 : 1;
  const wool = woolRatio(o), sheared = wool <= 0.12;
  const rx = 26, ry = 16, n = 12, br = 4.2 + 7.5 * wool;
  let bumps = '';
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; bumps += `<circle cx="${(Math.cos(a) * rx * 0.9).toFixed(1)}" cy="${(Math.sin(a) * ry * 0.85 - 3).toFixed(1)}" r="${(br * (0.85 + 0.3 * r())).toFixed(1)}"/>`; }
  const core = `<ellipse cx="0" cy="-3" rx="${rx}" ry="${ry}"/>`;
  const body = sheared
    ? `<g class="wool-o" style="fill:var(--skin);stroke:var(--wool-edge);stroke-width:2">${core}</g><g style="fill:var(--wool);stroke:var(--wool-edge);stroke-width:1.2"><circle cx="-8" cy="-15" r="3"/><circle cx="5" cy="-17" r="2.6"/><circle cx="15" cy="-10" r="2.4"/></g>`
    : `<g class="wool-o" style="fill:var(--wool);stroke:var(--wool-edge);stroke-width:2.6">${core}${bumps}</g><g style="fill:var(--wool)">${core}${bumps}</g>`;
  const scissors = sheared ? `<g class="snip" transform="translate(${flip < 0 ? -34 : 20},-40)" style="fill:none;stroke:var(--ink-2);stroke-width:1.8;stroke-linecap:round"><circle cx="0" cy="12" r="3"/><circle cx="7" cy="12" r="3"/><path d="M1.6 9.6L9 0M5.4 9.6L-2 0"/></g>` : '';
  const x = p.x.toFixed(1), y = p.y.toFixed(1), sc = p.sc.toFixed(3);
  const label = `${o.t}，${o.plat.name}，${TYPES[o.ty].l}，${valLabel(o).replace(/<[^>]+>/g, '')}，${leftText(o)}`;
  return `<g class="sheep" tabindex="0" role="link" aria-label="${esc(label)}" data-id="${o.id}" transform="translate(${x},${y})">
    <ellipse cx="0" cy="${(24 * p.sc).toFixed(1)}" rx="${(25 * p.sc).toFixed(1)}" ry="${(4 * p.sc).toFixed(1)}" style="fill:var(--hill-4);opacity:.35"/>
    <g transform="scale(${flip * p.sc},${sc})"><g class="bob" style="animation-delay:-${(r() * 3).toFixed(2)}s">
      <circle cx="${rx + 2}" cy="-6" r="4" style="fill:${sheared ? 'var(--skin)' : 'var(--wool)'};stroke:var(--wool-edge);stroke-width:1.5"/>
      <g style="fill:var(--face)"><rect x="-17" y="9" width="4.4" height="15" rx="2"/><rect x="-8" y="11" width="4.4" height="14" rx="2"/><rect x="6" y="11" width="4.4" height="14" rx="2"/><rect x="14" y="9" width="4.4" height="15" rx="2"/></g>
      ${body}
      <g transform="translate(-29,-10) rotate(-12)">
        ${sheared ? '' : '<circle cx="1" cy="-10" r="5" style="fill:var(--wool);stroke:var(--wool-edge);stroke-width:1.4"/>'}
        <ellipse cx="0" cy="0" rx="8.5" ry="11" style="fill:var(--face)"/>
        <ellipse cx="-8.5" cy="-6" rx="6" ry="2.6" transform="rotate(-25 -8.5 -6)" style="fill:var(--face)"/>
        <ellipse cx="8.5" cy="-7" rx="6" ry="2.6" transform="rotate(25 8.5 -7)" style="fill:var(--face)"/>
        <g transform="translate(10,-5)"><rect x="-3" y="-1" width="7" height="8" rx="2" style="fill:${typeVar(o.ty)};stroke:var(--face);stroke-width:.8"/><circle cx="0.5" cy="1.8" r="1" style="fill:var(--face)"/></g>
        <circle cx="-3" cy="-2" r="1.7" style="fill:#fff"/>
      </g>
    </g></g>${scissors}</g>`;
}
function meadowBg(W, H, wx) {
  const hill = (y0, amp, ph, v) => {
    let d = `M0,${H} L0,${y0}`; const steps = 6;
    for (let i = 1; i <= steps; i++) {
      const xx = W * i / steps, yy = y0 + Math.sin(i * 1.3 + ph) * amp, cx = W * (i - 0.5) / steps, cy = y0 + Math.sin((i - 0.5) * 1.3 + ph) * amp - amp * 0.7;
      d += ` Q${cx.toFixed(0)},${cy.toFixed(0)} ${xx.toFixed(0)},${yy.toFixed(0)}`;
    }
    return `<path d="${d} L${W},${H} Z" style="fill:var(${v})"/>`;
  };
  const r = rng(99);
  const sunX = W - Math.min(110, W * 0.2), sunY = H * 0.17;
  let sky = '';
  if (wx.i >= 60) sky += `<g style="stroke:var(--sun);stroke-width:3;stroke-linecap:round">${[...Array(10)].map((_, i) => { const a = i / 10 * 6.283; return `<path d="M${(sunX + Math.cos(a) * 30).toFixed(1)},${(sunY + Math.sin(a) * 30).toFixed(1)} L${(sunX + Math.cos(a) * 38).toFixed(1)},${(sunY + Math.sin(a) * 38).toFixed(1)}"/>`; }).join('')}</g><circle cx="${sunX}" cy="${sunY}" r="22" style="fill:var(--sun)"/>`;
  const cloud = (cx, cy, s) => `<g transform="translate(${cx},${cy}) scale(${s})" style="fill:var(--cloud);opacity:.92"><ellipse cx="0" cy="0" rx="26" ry="12"/><circle cx="-10" cy="-8" r="11"/><circle cx="8" cy="-11" r="14"/><circle cx="22" cy="-3" r="9"/></g>`;
  if (wx.i < 80) sky += cloud(sunX - 20, sunY + 14, 1.1);
  sky += cloud(W * 0.38, H * 0.12, 0.8) + cloud(W * 0.62, H * 0.2, 0.6);
  if (wx.i < 40) sky += `<g style="stroke:var(--s1);stroke-width:2;stroke-linecap:round;opacity:.6">${[...Array(6)].map((_, i) => `<path d="M${sunX - 34 + i * 10},${sunY + 30} l-3,8"/>`).join('')}</g>`;
  const fenceY = H * 0.43;
  let fence = '';
  for (let x = 14; x < W; x += 58) { const j = (r() - 0.5) * 3; fence += `<path d="M${x},${fenceY + 16 + j} L${x + 0.8},${fenceY - 14 + j}" />`; }
  const rail = yy => { let d = `M0,${(yy + (r() - 0.5) * 2).toFixed(1)}`; for (let x = 60; x <= W + 60; x += 60) d += ` L${x},${(yy + (r() - 0.5) * 2.4).toFixed(1)}`; return `<path d="${d}"/>`; };
  fence = `<g style="fill:none;stroke:var(--fence);stroke-width:3;stroke-linecap:round;opacity:.75">${fence}${rail(fenceY - 6)}${rail(fenceY + 6)}</g>`;
  let tufts = '';
  for (let i = 0; i < Math.round(W / 34); i++) { const x = r() * W, y = H * 0.55 + r() * H * 0.42; tufts += `<path d="M${x.toFixed(0)},${y.toFixed(0)} l2.5,-7 l2.5,7 l2,-5 l2,5"/>`; }
  let flowers = '';
  for (let i = 0; i < Math.round(W / 120); i++) { const x = r() * W, y = H * 0.6 + r() * H * 0.36; flowers += `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)})"><circle r="3.2" style="fill:#fff"/><circle r="1.4" style="fill:var(--tag)"/></g>`; }
  return sky + hill(H * 0.46, 10, 0.3, '--hill-1') + fence + hill(H * 0.55, 12, 2.1, '--hill-2') + hill(H * 0.7, 9, 4.2, '--hill-3') + `<g style="fill:none;stroke:var(--hill-4);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">${tufts}</g>` + flowers;
}
function buildFlock(el, list, wx) {
  const W = Math.max(300, Math.round(el.clientWidth || 800));
  const small = W < 640, H = small ? 330 : 400;
  const base = small ? 0.6 : W < 900 ? 0.78 : 0.95;
  if (!list.length) { el.innerHTML = `<svg class="meadow" viewBox="0 0 ${W} ${H}" aria-hidden="true">${meadowBg(W, H, wx)}</svg>` + emptySheep('按你的条件，草地上暂时没有羊。去"我的条件"放宽一点试试。'); return; }
  const maxU = Math.max(...list.map(o => o.usd));
  const r = rng(20260930);
  const items = list.map(o => ({ o, sc: base * (0.62 + 0.75 * Math.sqrt(o.usd / maxU)) })).sort((a, b) => b.sc - a.sc);
  const top = H * (small ? 0.5 : 0.52), bottom = H - 26 * base;
  const placed = [];
  for (const it of items) {
    const rad = 33 * it.sc;
    let best = null, bestGap = -Infinity;
    for (let k = 0; k < 320; k++) {
      const x = 16 + rad * 1.2 + r() * (W - 32 - rad * 2.4);
      const y = top + rad * 0.5 + r() * Math.max(4, bottom - top - rad * 1.3);
      const gap = placed.length ? Math.min(...placed.map(p => Math.hypot(p.x - x, (p.y - y) * 1.5) - p.rad - rad)) : 999;
      if (gap > bestGap) { best = { x, y }; bestGap = gap; }
      if (gap > 8) break;
    }
    placed.push({ ...it, ...best, rad });
  }
  placed.sort((a, b) => a.y - b.y);
  el.innerHTML = `<svg class="meadow" viewBox="0 0 ${W} ${H}" role="group" aria-label="进行中的羊毛，共 ${list.length} 只羊">${meadowBg(W, H, wx)}${placed.map(sheepSvg).join('')}</svg>`;
  el.dataset.w = W;
  $$('.sheep', el).forEach(g => {
    const o = OMAP[g.dataset.id];
    const html = `<b>${esc(o.t)}</b>${esc(o.plat.name)} · ${TYPES[o.ty].l}<br>${valLabel(o).replace(/<small>/, ' ').replace(/<\/small>/, '')} · ${leftText(o)}<br><span class="muted">薅度 ${score(o)} · 点击看详情</span>`;
    g.addEventListener('mousemove', e => showTip(html, e.clientX, e.clientY));
    g.addEventListener('mouseleave', hideTip);
    g.addEventListener('focus', () => { const b = g.getBoundingClientRect(); showTip(html, b.right, b.top); });
    g.addEventListener('blur', hideTip);
    g.addEventListener('click', () => { hideTip(); location.hash = 'offer-' + o.id; });
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.hash = 'offer-' + o.id; } });
  });
}

/* ---------- 羊毛天气 ---------- */
function weatherNow() {
  const act = view(OFFERS.filter(activeLimited));
  const fresh = view(OFFERS.filter(o => o.since >= -7 && claimable(o))).length;
  const ending = act.filter(o => statusOf(o) === 'ending').length;
  const val = sum(act, o => o.usd);
  const i = clamp(Math.round(18 + fresh * 4 + Math.log10(1 + val) * 11 - ending * 2), 5, 99);
  const [t, adv] = i >= 80 ? ['晴', '草肥羊壮，适合出门薅'] : i >= 60 ? ['晴间多云', '新羊毛不少，先领薅度分高的'] : i >= 40 ? ['多云', '羊毛一般，可以等等节日活动'] : ['小雨', '今天没什么可薅，明天再来'];
  return { i, t, adv, fresh, ending, val };
}
function wxIcon(i) {
  const sun = '<circle cx="18" cy="17" r="8" style="fill:var(--sun)"/>';
  const cloud = (dx, dy) => `<g transform="translate(${dx},${dy})" style="fill:var(--cloud);stroke:var(--line-2);stroke-width:1"><path d="M8 32h22a6 6 0 0 0 0-12 9 9 0 0 0-17-2 6.5 6.5 0 0 0-5 14z"/></g>`;
  const rain = '<g style="stroke:var(--s1);stroke-width:2;stroke-linecap:round"><path d="M14 36l-2 4M21 36l-2 4M28 36l-2 4"/></g>';
  const inner = i >= 80 ? sun + '<g style="stroke:var(--sun);stroke-width:2.4;stroke-linecap:round"><path d="M18 3v4M18 27v4M4 17h4M28 17h4M8 7l3 3M25 24l3 3M8 27l3-3M25 10l3-3"/></g>' : i >= 60 ? sun + cloud(4, 2) : i >= 40 ? cloud(2, -2) : cloud(2, -6) + rain;
  return `<svg viewBox="0 0 40 42" aria-hidden="true">${inner}</svg>`;
}

/* ============================================================
 * 页面
 * ============================================================ */
const main = () => $('#main');
const ph = (title, desc = '', extra = '') => `<div class="ph"><div><h1>${title}</h1>${desc ? `<p>${desc}</p>` : ''}</div>${extra}</div>`;
const secH = (title, hint = '') => `<div class="sec-h"><h2>${title}</h2>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
function ribbon() {
  const ago2 = LAST_OK ? Math.max(0, Math.round((NOW - LAST_OK) / 3600000)) : null;
  return `<div class="ribbon"><span class="live"><i></i>最近成功抓取：<b>${LAST_OK ? `${ago2 < 1 ? '1 小时内' : ago2 + ' 小时前'}（${hm(LAST_OK)}）` : '—'}</b></span><span>${META.coverageDegraded ? '部分新增内容待抽取；现有权益仍按官方证据复核' : '只收能追到官方出处的羊毛，每条都附官方原文'}</span></div>`;
}
function ocard(o) {
  const [frac, col] = barOf(o);
  return `<article class="ocard">
    <a class="stretch" href="#offer-${o.id}" aria-label="${esc(o.t)}"></a>
    <div class="oc-top">${etag(o.ty)}${stChip(o)}</div>
    <div style="min-width:0"><p class="oc-title">${esc(o.t)}</p><div class="oc-plat">${esc(o.plat.name)} · ${CLAIM[o.c]}</div><div class="oc-val">${valLabel(o)}</div></div>
    ${miniRadar(o)}
    <div class="oc-foot">
      <div class="bar" aria-hidden="true"><i style="width:${(frac * 100).toFixed(0)}%;background:${col}"></i></div>
      <div class="oc-meta"><span>${leftText(o)}</span><span class="row" style="gap:6px"><span class="score" title="薅度分">${score(o)}<small>薅度</small></span><button class="cmp" type="button" data-cmp="${o.id}" aria-pressed="${CMP.includes(o.id)}">对比</button></span></div>
      ${reqChips(o)}
    </div>
  </article>`;
}
const ocards = list => list.length ? `<div class="ocards">${list.map(ocard).join('')}</div>` : emptySheep('这里暂时没有羊毛。');
function orow(o, when) {
  return `<a class="orow" href="#offer-${o.id}"><span class="when">${when}</span><span class="t">${esc(o.t)}<small>${esc(o.plat.name)} · ${TYPES[o.ty].l} · ${valLabel(o).replace(/<[^>]+>/g, ' ')}</small></span>${stChip(o)}</a>`;
}
function kpi(label, value, unit, series, color = 'var(--s1)') {
  return `<div class="kpi"><span class="k-l">${label}</span><span class="k-v">${value}${unit ? `<small>${unit}</small>` : ''}</span><span style="color:${color}">${spark(series)}</span></div>`;
}
/** 最近 14 天每天的真实数量。 */
function daily(fn) { return Array.from({ length: 14 }, (_, i) => view(OFFERS.filter(o => fn(o, i - 13))).length); }
function seriesTo(end, n = 14, seed = 1, spread = 0.35) {
  const r = rng(seed); const out = []; let v = end;
  for (let i = 0; i < n; i++) { out.unshift(Math.max(0, Math.round(v))); v = v * (1 - spread * (r() - 0.35) * 0.4); }
  out[n - 1] = end; return out;
}

/* ---------- 今天 ---------- */
function pToday() {
  const act = view(OFFERS.filter(activeLimited));
  const stand = view(OFFERS.filter(o => statusOf(o) === 'standing'));
  const upcoming = view(OFFERS.filter(o => isLimited(o) && statusOf(o) === 'upcoming')).sort((a, b) => a.s - b.s);
  const ending = act.filter(o => statusOf(o) === 'ending');
  const wx = weatherNow();
  const vLim = sum(act, o => o.usd), vStand = sum(stand, o => o.usd);
  const soon = act.filter(o => o.ek === 'date').sort((a, b) => endInstant(a) - endInstant(b)).slice(0, 5);
  main().innerHTML = ribbon() + ph('今天', '今天能薅的羊毛都在这片草地上。点一只羊看详情。') + `
  <div class="hero">
    <div class="hero-over">
      <div class="total"><span class="l">${C.only ? '按你的条件，' : ''}今天能薅到约</span><span class="v">${money(vLim + vStand)}</span><span class="d">限时活动 ${money(vLim)} + 常驻额度每月 ${money(vStand)} · 不含申请制</span></div>
      <div class="wx">${wxIcon(wx.i)}<div><div class="row" style="gap:6px;align-items:baseline"><span class="i">${wx.i}</span><span class="t">今日羊毛指数 · ${wx.t}</span></div><div class="t">${wx.adv}</div></div></div>
    </div>
    <div id="flock"></div>
    <div class="flock-legend"><span><b>羊越大</b>，价值越高</span><span><b>毛越厚</b>，剩余时间越多</span><span><b>剃秃的</b>今明两天结束</span><span class="legend">${Object.keys(TYPES).filter(isTypeLimited).map(t => `<span>${etagSvg(typeVar(t)).replace('<svg ', '<svg style="width:12px;height:14px" ')}${TYPES[t].l}</span>`).join('')}</span></div>
  </div>
  <section class="kpis">
    ${kpi('进行中', act.length, '条', daily((o, k) => activeOn(o, k) && statusOf(o, k) !== 'upcoming'))}
    ${kpi('本周新增', wx.fresh, '条', daily((o, k) => o.since <= k && o.since > k - 7))}
    ${kpi('3 天内结束', ending.length, '条', daily((o, k) => activeOn(o, k) && o.ek === 'date' && o.e - k <= 3), 'var(--serious)')}
    ${kpi('常驻额度', stand.length, '项', daily((o, k) => o.ty === 'standing' && o.since <= k), 'var(--s6)')}
  </section>
  <section>${secH('倒计时', '最快结束的 5 条，按官方时区换算成你的本地时间')}
    <div class="clocks">${soon.map(o => {
      const end = endInstant(o), total = end - startInstant(o), frac = (end - NOW) / total;
      const col = o.e === 0 ? 'var(--critical)' : statusOf(o) === 'ending' ? 'var(--serious)' : 'var(--good)';
      return `<a class="clock" href="#offer-${o.id}">${ringSvg(frac, 54, col)}<div style="min-width:0"><div class="cd" data-end="${end.getTime()}">${cdText(end - NOW)}</div><div class="ttl">${esc(o.t)}</div></div></a>`;
    }).join('') || emptySheep('没有即将结束的活动。')}</div>
  </section>
  <section class="grid g2">
    <div class="card"><h3>进行中的类型分布</h3><p class="sub">点一块，查看这一类的全部羊毛</p><div class="chart" id="cType" style="height:270px"></div></div>
    <div class="card"><h3>按模态分</h3><p class="sub">一条羊毛可能同时覆盖多个模态</p><div class="chart" id="cModal" style="height:270px"></div></div>
  </section>
  <section>${secH('即将开始', '官方已公布、还没开始的活动')}
    <div class="rows">${upcoming.map(o => orow(o, `${md(dayAt(o.s))}开始`)).join('') || emptySheep('暂时没有已公布的新活动。')}</div>
  </section>
  <section>${secH('进行中的羊毛', '按薅度分排序')}${ocards(act.slice().sort((a, b) => score(b) - score(a)))}</section>`;

  buildFlock($('#flock'), act, wx);
  const types = Object.keys(TYPES).filter(isTypeLimited).map(t => ({ t, n: act.filter(o => o.ty === t).length })).filter(x => x.n);
  const cT = chart('#cType', {
    tooltip: { trigger: 'item', formatter: p => `${p.marker}${p.name}<br><b>${p.value}</b> 条 · ${p.percent}%` },
    legend: Object.assign(legendCommon(), { bottom: 0 }),
    series: [{ type: 'pie', radius: ['50%', '72%'], center: ['50%', '43%'], itemStyle: { borderRadius: 5, borderColor: TK.surface, borderWidth: 2 }, label: { show: false }, data: types.map(x => ({ name: TYPES[x.t].l, value: x.n, ty: x.t, itemStyle: { color: typeColor(x.t) } })) }],
    graphic: [
      { type: 'text', left: 'center', top: '33%', style: { text: String(act.length), fill: TK.ink, font: `700 30px ${FONT}`, textAlign: 'center' } },
      { type: 'text', left: 'center', top: '47%', style: { text: '条进行中', fill: TK.muted, font: `12px ${FONT}`, textAlign: 'center' } },
    ],
  });
  cT && cT.on('click', p => { ALLF = Object.assign(defaultAllF(), { ty: p.data.ty }); location.hash = 'all'; });
  const mods = Object.keys(MODAL).map(m => ({ m, n: act.filter(o => o.m.includes(m)).length }));
  const cM = chart('#cModal', {
    grid: { left: 8, right: 36, top: 8, bottom: 8, containLabel: true },
    tooltip: { trigger: 'item', formatter: p => `${p.name}<br><b>${p.value}</b> 条` },
    xAxis: Object.assign(axisCommon(), { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: TK.line } } }),
    yAxis: Object.assign(axisCommon(), { type: 'category', inverse: true, data: mods.map(x => MODAL[x.m]), axisLabel: { color: TK.ink2, fontSize: 12.5 } }),
    series: [{ type: 'bar', barWidth: 14, data: mods.map(x => ({ value: x.n, m: x.m })), itemStyle: { color: TK.s[0], borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: TK.ink2, fontFamily: FONT } }],
  });
  cM && cM.on('click', p => { ALLF = Object.assign(defaultAllF(), { m: p.data.m }); location.hash = 'all'; });
}
function isTypeLimited(t) { return t !== 'standing' && t !== 'apply'; }

/* ---------- 日历 ---------- */
const CAL = { metric: 'count', sel: ymd(T0) };
function dayStats(k) {
  const list = view(OFFERS.filter(o => activeOn(o, k)));
  return {
    list, n: list.length, v: sum(list, o => o.usd),
    starts: view(OFFERS.filter(o => isLimited(o) && o.s === k)), ends: view(OFFERS.filter(o => isLimited(o) && o.ek === 'date' && o.e === k)),
    hol: HOLIDAYS.find(h => h.d === ymd(dayAt(k))),
  };
}
function pCalendar() {
  const months = [-1, 0, 1, 2].map(i => new Date(T0.getFullYear(), T0.getMonth() + i, 1));
  const hols = HOLIDAYS.filter(h => { const k = dayIdx(new Date(h.d + 'T00:00:00')); return k >= -10 && k <= 150; });
  main().innerHTML = ribbon() + ph('日历', '点任意一天，看那天能薅什么。草色越深，那天的羊毛越多。',
    `<div class="row"><div class="seg" role="group" aria-label="颜色表示"><button type="button" data-metric="count" aria-pressed="${CAL.metric === 'count'}">当天条数</button><button type="button" data-metric="value" aria-pressed="${CAL.metric === 'value'}">当天总价值</button></div><label class="field" style="flex-direction:row;align-items:center;gap:8px"><span>跳到</span><input type="date" id="pickDate" value="${CAL.sel}"></label></div>`) + `
  <div class="row small muted" style="margin:-4px 0 12px;gap:14px"><span class="row" style="gap:6px">少 <span class="ramp">${[0, 2, 4, 6, 7].map(i => `<i style="background:var(--q${i})"></i>`).join('')}</span> 多</span><span class="row" style="gap:6px"><i class="sw" style="background:var(--s1);border-radius:50%"></i>当天开始</span><span class="row" style="gap:6px"><i class="sw" style="background:var(--muted);border-radius:50%"></i>当天结束</span><span class="row" style="gap:6px"><i class="sw" style="background:var(--tag)"></i>节日 / 购物节</span></div>
  <div class="months">${months.map((m, i) => `<div class="card month"><h3>${m.getFullYear()}年${m.getMonth() + 1}月</h3><div class="chart" id="cal${i}" style="height:262px"></div></div>`).join('')}</div>
  <section id="dayList"></section>
  <section>${secH('节日提醒', '往年这些节点常有厂商发羊毛')}<div class="hols">${hols.map(h => { const dd = new Date(h.d + 'T00:00:00'); const k = dayIdx(dd); return `<div class="hol"><b>${h.n} · ${md(dd)}</b><span class="muted">${k < 0 ? `${-k} 天前` : k === 0 ? '就是今天' : `还有 ${k} 天`}</span><span>${h.past ? `往年发过：${h.past}` : '往年记录积累中'}</span></div>`; }).join('')}</div></section>`;
  drawMonths(months);
  renderDayList();
  $$('[data-metric]').forEach(b => b.addEventListener('click', () => { CAL.metric = b.dataset.metric; render(true); }));
  $('#pickDate').addEventListener('change', e => { if (e.target.value) { CAL.sel = e.target.value; drawMonths(months); renderDayList(); } });
}
function drawMonths(months) {
  $$('.month .chart').forEach(el => { const c = echarts.getInstanceByDom(el); if (c) { CHARTS.delete(c); c.dispose(); } });
  const all = [];
  months.forEach(m => { const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate(); for (let d = 1; d <= days; d++) all.push(dayStats(dayIdx(new Date(m.getFullYear(), m.getMonth(), d)))); });
  const mx = Math.max(1, ...all.map(s => CAL.metric === 'count' ? s.n : s.v));
  months.forEach((m, i) => {
    const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let d = 1; d <= days; d++) {
      const dt = new Date(m.getFullYear(), m.getMonth(), d), k = dayIdx(dt), s = dayStats(k), val = CAL.metric === 'count' ? s.n : s.v;
      const fill = val === 0 ? TK.surface2 : TK.q[clamp(Math.round(Math.sqrt(val / mx) * 7), 0, 7)];
      cells.push({ date: ymd(dt), d, k, s, val, fill });
    }
    const c = chart('#cal' + i, {
      tooltip: {
        trigger: 'item', formatter: p => {
          const x = cells[p.dataIndex]; const dt = new Date(x.date + 'T00:00:00');
          return `<b>${md(dt)} 周${WD[dt.getDay()]}</b><br>有效 ${x.s.n} 条 · 约 ${money(x.s.v)}${x.s.hol ? `<br>节日：${x.s.hol.n}` : ''}${x.s.starts.length ? `<br>开始：${x.s.starts.map(o => esc(o.t)).join('、')}` : ''}${x.s.ends.length ? `<br>结束：${x.s.ends.map(o => esc(o.t)).join('、')}` : ''}`;
        },
      },
      calendar: { orient: 'vertical', range: `${m.getFullYear()}-${pad(m.getMonth() + 1)}`, cellSize: ['auto', 36], left: 6, right: 6, top: 24, bottom: 4, splitLine: { show: false }, itemStyle: { color: 'transparent', borderWidth: 0 }, dayLabel: { firstDay: 1, nameMap: ['日', '一', '二', '三', '四', '五', '六'], color: TK.muted, fontSize: 11, margin: 6 }, monthLabel: { show: false }, yearLabel: { show: false } },
      series: [{
        type: 'custom', coordinateSystem: 'calendar', data: cells.map(x => [x.date, x.val]),
        renderItem: (params, api) => {
          const x = cells[params.dataIndex], pt = api.coord(api.value(0));
          const w = params.coordSys.cellWidth - 4, h = params.coordSys.cellHeight - 4;
          const isToday = x.k === 0, isSel = x.date === CAL.sel;
          const kids = [
            { type: 'rect', shape: { x: pt[0] - w / 2, y: pt[1] - h / 2, width: w, height: h, r: 7 }, style: { fill: x.fill, stroke: isSel ? TK.ink : isToday ? TK.tag : null, lineWidth: isSel || isToday ? 2 : 0 } },
            { type: 'text', style: { text: String(x.d), x: pt[0], y: pt[1], align: 'center', verticalAlign: 'middle', fill: x.val === 0 ? TK.muted : onColor(x.fill), font: `${isToday ? 700 : 500} 12px ${FONT}` } },
          ];
          if (x.s.hol) kids.push({ type: 'polygon', shape: { points: [[pt[0] - w / 2 + 2, pt[1] - h / 2 + 2], [pt[0] - w / 2 + 11, pt[1] - h / 2 + 2], [pt[0] - w / 2 + 2, pt[1] - h / 2 + 11]] }, style: { fill: TK.tag } });
          if (x.s.starts.length) kids.push({ type: 'circle', shape: { cx: pt[0] + w / 2 - 6, cy: pt[1] - h / 2 + 6, r: 3 }, style: { fill: TK.s[0], stroke: TK.surface, lineWidth: 1 } });
          if (x.s.ends.length) kids.push({ type: 'circle', shape: { cx: pt[0] + w / 2 - 6, cy: pt[1] + h / 2 - 6, r: 3 }, style: { fill: TK.muted, stroke: TK.surface, lineWidth: 1 } });
          return { type: 'group', children: kids };
        },
      }],
    });
    c && c.on('click', p => { CAL.sel = cells[p.dataIndex].date; $('#pickDate').value = CAL.sel; drawMonths(months); renderDayList(); });
  });
}
function renderDayList() {
  const dt = new Date(CAL.sel + 'T00:00:00'), k = dayIdx(dt), s = dayStats(k);
  const standN = view(OFFERS.filter(o => o.ty === 'standing' && Date.parse(o.discoveredAt) < dayAt(k + 1).getTime() && statusOf(o, k) === 'standing')).length;
  const when = k === 0 ? '今天' : k < 0 ? `${-k} 天前` : `${k} 天后`;
  $('#dayList').innerHTML = secH(`${md(dt)} 周${WD[dt.getDay()]} · ${when}`, `当天有效 ${s.n} 条限时羊毛，约 ${money(s.v)}；另有 ${standN} 项常驻额度每天都能用`) +
    (s.hol ? `<p class="small"><span class="sample">${s.hol.n}</span> ${s.hol.past ? `往年这个时候发过羊毛的平台：${s.hol.past}` : '节日前后常有厂商发羊毛，留意推送'}</p>` : '') +
    (k < 0 ? '<p class="small muted">这是过去的日期，列出的是那天有效的羊毛。</p>' : k > 0 ? '<p class="small muted">这是未来的日期，只包含官方已公布的活动；"截止未知"的活动到那天不一定还在。</p>' : '') +
    `<div class="rows">${s.list.sort((a, b) => score(b) - score(a)).map(o => orow(o, o.ek === 'date' ? `至${md(dayAt(o.e))}` : '截止未知')).join('') || emptySheep('这一天没有限时羊毛。')}</div>`;
}

/* ---------- 时间线（甘特图） ---------- */
function pTimeline() {
  // 默认显示前 30 天到后 45 天；数据包含全部历史活动，拖动下方滑块可以往前看
  const viewLo = -30, hi = 45;
  const all = view(OFFERS.filter(o => isLimited(o) && (o.s == null || o.s <= hi)));
  const lo = Math.max(-730, Math.min(viewLo, ...all.map(o => o.since)));
  const items = all;
  const rowsIds = uniq(items.slice().sort((a, b) => (a.ek === 'date' ? a.e : 999) - (b.ek === 'date' ? b.e : 999)).map(o => o.p));
  const rows = rowsIds.map(id => PMAP[id].name);
  const h = rows.length * 34 + 90;
  main().innerHTML = ribbon() + ph('时间线', '每个平台一行，横条是活动的起止时间。竖线是今天，描边的是 3 天内结束的活动。往前拖动可以看历史活动。') +
    `<div class="legend" style="margin-bottom:10px">${Object.keys(TYPES).filter(isTypeLimited).map(t => `<span><i class="sw" style="background:${typeVar(t)}"></i>${TYPES[t].l}</span>`).join('')}<span><i class="sw" style="background:linear-gradient(90deg,var(--muted),transparent)"></i>截止未知</span></div>
    <div class="card" style="padding:10px 6px"><div class="chart" id="cGantt" style="height:${h}px"></div></div>
    <p class="small muted">可以拖动下方滑块或用触控板缩放时间范围。点横条看详情。</p>`;
  const data = items.map(o => {
    const s = Math.max(lo, o.since), e = o.ek === 'date' ? o.e + 1 : o.withdrawnAt ? dayIdx(new Date(o.withdrawnAt)) + 1 : hi;
    return { value: [rowsIds.indexOf(o.p), dayAt(s).getTime(), dayAt(e).getTime()], o };
  });
  const c = chart('#cGantt', {
    grid: { left: 8, right: 16, top: 26, bottom: 46, containLabel: true },
    tooltip: { trigger: 'item', formatter: p => { const o = p.data.o; return `<b>${esc(o.t)}</b>${esc(o.plat.name)} · ${TYPES[o.ty].l}<br>${o.s != null ? md(dayAt(o.s)) : `${md(dayAt(o.since))}起（官方未写开始日）`} → ${o.ek === 'date' ? md(dayAt(o.e)) : '截止未知'}<br>${leftText(o)}`; } },
    xAxis: Object.assign(axisCommon(), { type: 'time', min: dayAt(lo).getTime(), max: dayAt(hi).getTime(), position: 'top', axisLabel: { color: TK.muted, fontSize: 11, formatter: v => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; } }, splitLine: { show: true, lineStyle: { color: TK.line } } }),
    yAxis: Object.assign(axisCommon(), { type: 'category', data: rows, inverse: true, axisLabel: { color: TK.ink2, fontSize: 12 }, splitLine: { show: false } }),
    dataZoom: [{ type: 'inside', xAxisIndex: 0, filterMode: 'weakFilter', startValue: dayAt(viewLo).getTime(), endValue: dayAt(hi).getTime() }, { type: 'slider', xAxisIndex: 0, height: 18, bottom: 10, filterMode: 'weakFilter', startValue: dayAt(viewLo).getTime(), endValue: dayAt(hi).getTime(), borderColor: TK.line, fillerColor: TK.tagSoft, handleStyle: { color: TK.surface, borderColor: TK.line2 }, textStyle: { color: TK.muted }, dataBackground: { lineStyle: { color: TK.line2 }, areaStyle: { color: TK.surface2 } } }],
    series: [{
      type: 'custom', encode: { x: [1, 2], y: 0 }, data,
      renderItem: (params, api) => {
        const o = data[params.dataIndex].o, cat = api.value(0), a = api.coord([api.value(1), cat]), b = api.coord([api.value(2), cat]);
        const bh = api.size([0, 1])[1] * 0.56, cs = params.coordSys;
        const rect = echarts.graphic.clipRectByRect({ x: a[0], y: a[1] - bh / 2, width: Math.max(3, b[0] - a[0] - 2), height: bh }, { x: cs.x, y: cs.y, width: cs.width, height: cs.height });
        if (!rect) return null;
        const col = typeColor(o.ty), st = statusOf(o);
        const fill = o.ek === 'unknown' ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: col }, { offset: 1, color: hexA(col, 0.06) }]) : col;
        const kids = [{ type: 'rect', shape: Object.assign({ r: 4 }, rect), style: { fill, opacity: st === 'ended' ? 0.35 : st === 'upcoming' ? 0.55 : 1, stroke: st === 'ending' ? (o.e === 0 ? TK.critical : TK.serious) : null, lineWidth: st === 'ending' ? 2 : 0 } }];
        if (rect.width > 70) {
          const maxCh = Math.floor((rect.width - 12) / 12.5);
          const txt = o.t.length > maxCh ? o.t.slice(0, Math.max(1, maxCh - 1)) + '…' : o.t;
          kids.push({ type: 'text', style: { text: txt, x: rect.x + 6, y: rect.y + rect.height / 2, verticalAlign: 'middle', fill: o.ek === 'unknown' || st === 'ended' ? TK.ink : onColor(col), font: `500 11.5px ${FONT}` } });
        }
        return { type: 'group', children: kids };
      },
      markLine: { symbol: 'none', silent: true, data: [{ xAxis: NOW.getTime() }], lineStyle: { color: TK.ink, width: 1.5, type: 'solid' }, label: { formatter: '今天', color: TK.ink, fontFamily: FONT, fontSize: 11, position: 'start' } },
    }],
  });
  c && c.on('click', p => { if (p.data && p.data.o) location.hash = 'offer-' + p.data.o.id; });
}

/* ---------- 全部 ---------- */
const defaultAllF = () => ({ ty: '', m: '', c: '', p: '', st: 'claimable', req: '', sort: 'score' });
let ALLF = defaultAllF();
function filtered() {
  let list = view(OFFERS.slice());
  const f = ALLF;
  if (f.ty) list = list.filter(o => o.ty === f.ty);
  if (f.m) list = list.filter(o => o.m.includes(f.m));
  if (f.c) list = list.filter(o => o.c === f.c);
  if (f.p) list = list.filter(o => o.p === f.p);
  if (f.st === 'claimable') list = list.filter(claimable);
  else if (f.st) list = list.filter(o => statusOf(o) === f.st);
  const has = (o, ks) => o.r.some(r => ks.includes(r.split(':')[0]));
  if (f.req === 'zero') list = list.filter(o => o.r.length > 0 && o.r.every(r => r === 'none'));
  if (f.req === 'nooversea') list = list.filter(o => !has(o, ['phone', 'card', 'net']));
  if (f.req === 'nopay') list = list.filter(o => !has(o, ['pay', 'member']));
  if (f.req === 'special') list = list.filter(o => has(o, ['student', 'biz', 'invite', 'targeted']));
  const endKey = o => o.ek === 'date' ? o.e : isLimited(o) ? 500 : 900;
  const sorters = { score: (a, b) => score(b) - score(a), new: (a, b) => b.fs - a.fs, end: (a, b) => endKey(a) - endKey(b), value: (a, b) => b.usd - a.usd };
  return list.sort(sorters[f.sort]);
}
function pAll() {
  const sel = (id, label, opts) => `<label class="field" for="${id}">${label}<select id="${id}" data-f="${id.slice(2)}">${opts.map(([v, l]) => `<option value="${v}" ${ALLF[id.slice(2)] === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
  main().innerHTML = ribbon() + ph('全部羊毛', '筛选、排序，或者勾几条放在一起对比。') + `
  <div class="filters">
    ${sel('f-ty', '类型', [['', '全部类型'], ...Object.entries(TYPES).map(([k, v]) => [k, v.l])])}
    ${sel('f-m', '模态', [['', '全部模态'], ...Object.entries(MODAL)])}
    ${sel('f-req', '门槛', [['', '不限'], ['zero', '零门槛'], ['nooversea', '不需要海外条件'], ['nopay', '不用花钱'], ['special', '学生 / 企业 / 邀请 / 定向']])}
    ${sel('f-c', '领取方式', [['', '全部方式'], ...Object.entries(CLAIM)])}
    ${sel('f-p', '平台', [['', '全部平台'], ...PLATFORMS.filter(p => OFFERS.some(o => o.p === p.id)).map(p => [p.id, p.name])])}
    ${sel('f-st', '状态', [['claimable', '现在或即将可领'], ['', '全部状态'], ['active', '进行中'], ['ending', '即将结束'], ['upcoming', '未开始'], ['standing', '常驻'], ['stale', '待核验'], ['ended', '已结束']])}
    ${sel('f-sort', '排序', [['score', '薅度分高'], ['new', '新上架'], ['end', '快截止'], ['value', '价值高']])}
  </div>
  <div class="row small muted" style="justify-content:space-between;margin-bottom:10px"><span id="allCount"></span><button class="btn sm" type="button" id="resetF">清空筛选</button></div>
  <div id="allList"></div>`;
  const draw = () => { const l = filtered(); $('#allCount').textContent = `共 ${l.length} 条${C.only ? '（已按你的条件过滤）' : ''}`; $('#allList').innerHTML = ocards(l); };
  $$('[data-f]').forEach(s => s.addEventListener('change', () => { ALLF[s.dataset.f] = s.value; draw(); }));
  $('#resetF').addEventListener('click', () => { ALLF = defaultAllF(); render(true); });
  draw();
}

/* ---------- 常驻额度库 ---------- */
function pLibrary() {
  const list = view(OFFERS.filter(o => o.ty === 'standing'));
  const available = list.filter(claimable);
  const pids = uniq(available.map(o => o.p)).sort((a, b) => sum(available.filter(o => o.p === b), o => o.usd) - sum(available.filter(o => o.p === a), o => o.usd));
  const mods = Object.keys(MODAL);
  const cells = [];
  pids.forEach((pid, y) => mods.forEach((m, x) => { const covered = available.filter(o => o.p === pid && o.m.includes(m)); const v = sum(covered, o => o.usd); cells.push({ x, y, v, covered: covered.length > 0, hasUnknownValue: covered.some(o => o.noUsd), pid, m }); }));
  const mx = Math.max(1, ...cells.map(c => c.v));
  const fresh = list.slice().sort((a, b) => a.vf - b.vf);
  main().innerHTML = ribbon() + ph('常驻额度库', '长期免费的额度，没有变化时不重复推送。每 7 天核验一次，14 天没核验成功就转为"待核验"。') + `
  <section class="grid g2" style="margin-top:0">
    <div class="card"><h3>平台 × 模态</h3><p class="sub">格子越深，这个平台在这个模态上每月送得越多</p><div class="chart" id="cMatrix" style="height:${pids.length * 30 + 60}px"></div></div>
    <div class="card"><h3>每月免费价值排行</h3><p class="sub">按平台汇总仍可领的常驻额度；待核验和已结束的项目不计入</p><div class="chart" id="cRank" style="height:${pids.length * 30 + 60}px"></div></div>
  </section>
  <section>${secH('核验新鲜度', '上线后由管线每 7 天自动核验')}
    <div class="card tbl" style="padding:4px 8px"><table><thead><tr><th>额度</th><th>平台</th><th>每月折合</th><th>最近核验</th><th>状态</th></tr></thead><tbody>
    ${fresh.map(o => { const st = statusOf(o), d = -o.vf; const s = st !== 'standing' ? stChip(o) : d >= 8 ? stBadge('warn', '!', '快到核验期') : stBadge('good', '✓', '新鲜'); return `<tr class="link" data-href="#offer-${o.id}"><td>${esc(o.t)}</td><td>${esc(o.plat.name)}</td><td class="n">${o.noUsd ? '未估值' : money(o.usd)}</td><td class="n">${ago(o.vf)}</td><td>${s}</td></tr>`; }).join('')}
    </tbody></table></div>
  </section>
  <section>${secH('全部常驻额度')}${ocards(list.slice().sort((a, b) => score(b) - score(a)))}</section>`;
  const cm = chart('#cMatrix', {
    grid: { left: 8, right: 8, top: 26, bottom: 6, containLabel: true },
    tooltip: { trigger: 'item', formatter: p => { const c = cells[p.dataIndex]; return `<b>${esc(PMAP[c.pid].name)}</b> · ${MODAL[c.m]}<br>${!c.covered ? '不覆盖这个模态' : c.hasUnknownValue ? `已覆盖；${c.v ? `已知价值约 ${money(c.v)}，其余` : ''}官方未提供可比价值` : `每月约 ${money(c.v)}`}`; } },
    xAxis: Object.assign(axisCommon(), { type: 'category', position: 'top', data: mods.map(m => MODAL[m]), axisLine: { show: false }, axisLabel: { color: TK.ink2, fontSize: 12 } }),
    yAxis: Object.assign(axisCommon(), { type: 'category', inverse: true, data: pids.map(p => PMAP[p].name), axisLine: { show: false }, axisLabel: { color: TK.ink2, fontSize: 12 } }),
    series: [{
      type: 'custom', data: cells.map(c => [c.x, c.y, c.v]),
      renderItem: (params, api) => {
        const c = cells[params.dataIndex], pt = api.coord([api.value(0), api.value(1)]), sz = api.size([1, 1]);
        const w = sz[0] - 4, h = sz[1] - 4;
        const fill = c.covered ? TK.q[clamp(Math.round(Math.sqrt(c.v / mx) * 7), 1, 7)] : TK.surface2;
        const kids = [{ type: 'rect', shape: { x: pt[0] - w / 2, y: pt[1] - h / 2, width: w, height: h, r: 5 }, style: { fill } }];
        if (c.v && w > 34) kids.push({ type: 'text', style: { text: money(c.v), x: pt[0], y: pt[1], align: 'center', verticalAlign: 'middle', fill: onColor(fill), font: `500 11px ${FONT}` } });
        return { type: 'group', children: kids };
      },
    }],
  });
  cm && cm.on('click', p => { location.hash = 'platform-' + cells[p.dataIndex].pid; });
  const tot = pids.map(pid => ({ pid, v: sum(available.filter(o => o.p === pid), o => o.usd) }));
  const cr = chart('#cRank', {
    grid: { left: 8, right: 48, top: 8, bottom: 6, containLabel: true },
    tooltip: { trigger: 'item', formatter: p => `${p.name}<br>每月约 <b>${money(p.value)}</b>` },
    xAxis: Object.assign(axisCommon(), { type: 'value', axisLabel: { color: TK.muted, formatter: v => money(v) } }),
    yAxis: Object.assign(axisCommon(), { type: 'category', inverse: true, data: tot.map(t => PMAP[t.pid].name), axisLabel: { color: TK.ink2, fontSize: 12 } }),
    series: [{ type: 'bar', barWidth: 12, data: tot.map(t => ({ value: t.v, pid: t.pid })), itemStyle: { color: TK.s[5], borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: TK.ink2, formatter: p => money(p.value), fontFamily: FONT } }],
  });
  cr && cr.on('click', p => { location.hash = 'platform-' + p.data.pid; });
}

/* ---------- 申请制 ---------- */
function pApply() {
  const list = view(OFFERS.filter(o => o.ty === 'apply')).sort((a, b) => b.usd - a.usd);
  main().innerHTML = ribbon() + ph('申请制', '需要提交材料、等待审核的大额 credits。只收官方长期计划，不计入"今天能薅"的总价值。') + `
  <div class="card"><h3>额度量级</h3><p class="sub">最高可申请额度，对数刻度</p><div class="chart" id="cApply" style="height:${list.length * 40 + 50}px"></div></div>
  <section>${ocards(list)}</section>`;
  const c = chart('#cApply', {
    grid: { left: 8, right: 64, top: 6, bottom: 6, containLabel: true },
    tooltip: { trigger: 'item', formatter: p => `${esc(OMAP[p.data.id].t)}<br>最高 <b>${money(p.value)}</b>` },
    xAxis: Object.assign(axisCommon(), { type: 'log', min: 100, axisLabel: { color: TK.muted, formatter: v => money(v) } }),
    yAxis: Object.assign(axisCommon(), { type: 'category', inverse: true, data: list.map(o => o.plat.name), axisLabel: { color: TK.ink2, fontSize: 12 } }),
    series: [{ type: 'bar', barWidth: 14, data: list.map(o => ({ value: o.usd, id: o.id })), itemStyle: { color: TK.s[6], borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: TK.ink2, formatter: p => money(p.value), fontFamily: FONT } }],
  });
  c && c.on('click', p => { location.hash = 'offer-' + p.data.id; });
}

/* ---------- 按模型找 ---------- */
/** 模型名归一：忽略大小写、空格、连字符和末尾的 Free，方便把各平台的不同写法归到同一个模型。 */
const modelKey = m => m.toLowerCase().replace(/\(.*?\)|（.*?）/g, '').replace(/\bfree\b/g, '').replace(/[\s\-_.·]+/g, '');
function modelIndex() {
  const idx = new Map();
  OFFERS.filter(o => statusOf(o) !== 'ended').forEach(o => (o.models || []).forEach(name => {
    const k = modelKey(name); if (!k) return;
    if (!idx.has(k)) idx.set(k, { name, offers: [] });
    const e = idx.get(k); if (!e.offers.includes(o)) e.offers.push(o);
  }));
  return [...idx.values()].map(e => ({ ...e, plats: uniq(e.offers.map(o => o.p)).length }))
    .sort((a, b) => b.plats - a.plats || b.offers.length - a.offers.length || a.name.localeCompare(b.name));
}
let MODEL_Q = '';
function pModels() {
  const all = modelIndex();
  const q = MODEL_Q.trim().toLowerCase();
  const list = q ? all.filter(m => m.name.toLowerCase().includes(q) || modelKey(m.name).includes(modelKey(q))) : all;
  const limited = o => o.ty !== 'standing' && o.ty !== 'apply';
  const row = o => `<a class="orow" href="#offer-${o.id}" style="grid-template-columns:auto minmax(0,1fr) auto"><span>${etag(o.ty)}</span><span class="t">${esc(o.plat.name)}<small>${esc(o.t)}</small></span>${stChip(o)}</a>`;
  main().innerHTML = ribbon() + ph('按模型找', '同一个模型，在哪些平台能免费用？限时免费会标出截止时间。') + `
    <div class="row" style="margin-bottom:12px;gap:10px;flex-wrap:wrap"><input type="search" id="modelQ" value="${esc(MODEL_Q)}" placeholder="搜模型，如 GLM、Gemini、DeepSeek" style="flex:1;min-width:200px;padding:8px 12px"><span class="small muted">${all.length} 个模型 · ${uniq(all.flatMap(m => m.offers.map(o => o.p))).length} 个平台</span></div>
    ${list.length ? `<div class="grid g2">${list.map(m => `<div class="card"><div class="row" style="justify-content:space-between;align-items:baseline;gap:8px"><h3 style="margin:0">${esc(m.name)}</h3><span class="small muted">${m.plats} 个平台${m.offers.some(limited) ? ' · 含限时' : ''}</span></div>
      <div class="rows" style="margin-top:8px">${m.offers.map(row).join('')}</div></div>`).join('')}</div>`
      : `<div class="card">${emptySheep(all.length ? '没有找到这个模型。' : '还没有记录到具体的免费模型。')}</div>`}`;
  const inp = $('#modelQ');
  inp.addEventListener('input', () => { MODEL_Q = inp.value; const pos = inp.selectionStart; pModels(); const n = $('#modelQ'); n.focus(); n.setSelectionRange(pos, pos); });
}

/* ---------- 洞察 ---------- */
const RESETS = []; // Codex 重置记录：等我们自己的重置条目积累起来再展示
let RACE = { months: [], series: [] }, TREND = { labels: [], nw: [], ed: [], by: {} };
/** 大方榜：近 6 个月各平台累计发放的羊毛价值（按活动出现的日子，不含申请制）。 */
function computeRace() {
  const months = [...Array(6)].map((_, i) => new Date(T0.getFullYear(), T0.getMonth() - 5 + i, 1));
  const mi = o => { const d = dayAt(Math.floor(o.since)); return months.findIndex((m, i) => d >= m && (i === 5 || d < months[i + 1])); };
  const pool = view(OFFERS.filter(o => o.ty !== 'apply' && !o.noUsd));
  const ids = uniq(pool.map(o => o.p)).sort((a, b) => sum(pool.filter(o => o.p === b), o => o.usd) - sum(pool.filter(o => o.p === a), o => o.usd)).slice(0, 12);
  return {
    months: months.map(d => `${d.getFullYear()}年${d.getMonth() + 1}月`),
    series: ids.map(id => { let acc = 0; return { id, vals: months.map((_, i) => (acc += sum(pool.filter(o => o.p === id && (mi(o) === i || (i === 0 && mi(o) < 0 && o.since < 0 && dayAt(Math.floor(o.since)) < months[0]))), o => o.usd))) }; }),
  };
}
/** 最近 12 周：每周新增（按活动出现的日子）与结束（按截止日），以及新增的类型构成。 */
function computeTrend() {
  const labels = [], nw = [], ed = [], by = {};
  Object.keys(TYPES).forEach(t => { by[t] = []; });
  const mon = dayAt(-((T0.getDay() + 6) % 7));
  for (let w = 11; w >= 0; w--) {
    const a = dayIdx(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - w * 7)), b = a + 7;
    labels.push(w === 0 ? '本周' : `${dayAt(a).getMonth() + 1}/${dayAt(a).getDate()}`);
    const fresh = view(OFFERS.filter(o => o.since >= a && o.since < b));
    nw.push(fresh.length); ed.push(view(OFFERS.filter(o => { const end = actualEnd(o); return end && end <= NOW && dayIdx(end) >= a && dayIdx(end) < b; })).length);
    Object.keys(TYPES).forEach(t => by[t].push(fresh.filter(o => o.ty === t).length));
  }
  return { labels, nw, ed, by };
}
function pInsights() {
  if (!OFFERS.length) { main().innerHTML = ribbon() + ph('洞察', '把整片牧场放在一起看：哪里该先薅、谁最大方、羊毛从哪来。') + emptySheep('第一批羊毛审核通过后，这里会出现图表。'); return; }
  const ended = view(OFFERS.filter(o => statusOf(o) === 'ended')).sort((a, b) => actualEnd(b) - actualEnd(a));
  main().innerHTML = ribbon() + ph('洞察', '把整片牧场放在一起看：哪里该先薅、谁最大方、羊毛从哪来、什么时候会重置。') + `
  <section style="margin-top:0"><div class="card"><h3>薅羊毛四象限</h3><p class="sub">横轴是门槛难度，纵轴是价值（对数刻度）；限时活动的气泡越大，剩余时间越多。左上角最值得先薅。</p><div class="chart" id="cQuad" style="height:400px"></div></div></section>
  <section><div class="card"><h3>羊毛从哪来、怎么到你手里</h3><p class="sub">平台类型 → 羊毛类型 → 领取方式 → 主要门槛</p><div class="hscroll"><div class="chart" id="cSankey" style="height:470px"></div></div></div></section>
  <section class="grid g2">
    <div class="card"><h3>谁最大方</h3><p class="sub">面积 = 这个平台所有羊毛的折合美元（不含申请制）</p><div class="chart" id="cTree" style="height:360px"></div><div class="legend">${Object.entries(PTYPE).map(([k, v]) => `<span><i class="sw" style="background:var(--s${v.slot})"></i>${v.l}</span>`).join('')}</div></div>
    <div class="card"><div class="row" style="justify-content:space-between"><div><h3>大方榜</h3><p class="sub" style="margin:0">近 6 个月累计发放价值（按活动开始的月份）</p></div><button class="btn sm pri" type="button" id="racePlay">▶ 回放</button></div><div class="chart" id="cRace" style="height:340px"></div></div>
  </section>
  <section><div class="card" id="resetBox"><h3>重置时钟</h3><p class="sub">Codex、Claude Code 等额度重置的历史分布（按官方发布时间，换算成你的本地时间）。只展示历史，不预测下一次。</p>${resetBlock()}</div></section>
  <section class="grid g2">
    <div class="card"><h3>每周新增与结束</h3><p class="sub">最近 12 周</p><div class="chart" id="cTrend" style="height:280px"></div></div>
    <div class="card"><h3>新增羊毛的类型构成</h3><p class="sub">最近 12 周，按周堆叠</p><div class="chart" id="cStack" style="height:280px"></div></div>
  </section>
  <section>${secH('羊毛墓地', '已经结束的羊毛。点墓碑看它活了多久、平台过去的发放规律。')}
    <div class="graves">${ended.map(o => { const end = dayIdx(actualEnd(o)); const life = Math.max(1, end - o.since + 1); return `<a class="grave" href="#offer-${o.id}"><span class="rip">R.I.P.</span><b>${esc(o.t)}</b><span>${esc(o.plat.name)}</span><span>存活 <span class="age">${life}</span> 天</span><span class="muted">${md(dayAt(o.since))} – ${md(dayAt(end))}</span>${o.why ? `<span class="chip">${esc(o.why)}</span>` : ''}</a>`; }).join('')}</div>
  </section>`;

  drawResetClock();
  // 四象限
  const groups = [['限时活动', o => isLimited(o)], ['常驻额度', o => o.ty === 'standing'], ['申请制', o => o.ty === 'apply']];
  const live = view(OFFERS.filter(o => !['ended'].includes(statusOf(o))));
  const vals = live.map(o => o.usd).sort((a, b) => a - b), med = vals[Math.floor(vals.length / 2)] || 10;
  const cq = chart('#cQuad', {
    grid: { left: 10, right: 20, top: 40, bottom: 34, containLabel: true },
    legend: Object.assign(legendCommon(), { top: 4, left: 0 }),
    tooltip: { trigger: 'item', formatter: p => { const o = OMAP[p.data.id]; return `<b>${esc(o.t)}</b>${esc(o.plat.name)}<br>${valLabel(o).replace(/<[^>]+>/g, ' ')} · 门槛难度 ${p.data.value[0]}<br>${leftText(o)}`; } },
    xAxis: Object.assign(axisCommon(), { type: 'value', min: 0, max: 100, name: '门槛难度 →', nameLocation: 'end', nameGap: 8, nameTextStyle: { color: TK.muted, fontSize: 11, verticalAlign: 'top', padding: [14, 0, 0, 0] } }),
    yAxis: Object.assign(axisCommon(), { type: 'log', min: 0.1, max: 1000000, name: '价值 ↑', nameTextStyle: { color: TK.muted, fontSize: 11, align: 'left' }, axisLabel: { color: TK.muted, fontSize: 11, formatter: v => money(v) } }),
    series: groups.map(([name, fn], gi) => ({
      name, type: 'scatter',
      data: live.filter(fn).map(o => { const d = dims(o); const size = isLimited(o) ? (o.ek === 'date' ? 10 + clamp(o.e, 0, 30) * 0.8 : 22) : 14; return { id: o.id, value: [100 - d[1], o.usd], symbolSize: size }; }),
      itemStyle: { color: TK.s[gi], opacity: 0.85, borderColor: TK.surface, borderWidth: 2 },
      emphasis: { scale: 1.2 },
      ...(gi === 0 ? {
        markArea: { silent: true, itemStyle: { color: TK.tagSoft, opacity: 0.7 }, label: { color: TK.ink, fontFamily: FONT, fontSize: 12, position: 'insideTopLeft', padding: [6, 8] }, data: [[{ name: '优先薅：价值高 · 门槛低', xAxis: 0, yAxis: med }, { xAxis: 50, yAxis: 1000000 }]] },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: TK.line2, type: 'solid' }, label: { show: false }, data: [{ xAxis: 50 }, { yAxis: med }] },
      } : {}),
    })),
  });
  cq && cq.on('click', p => { if (p.data && p.data.id) location.hash = 'offer-' + p.data.id; });

  // 桑基图
  const mainReq = o => { let best = 'none', pen = -1; o.r.forEach(r => { const k = r.split(':')[0]; const v = REQ_PEN[k] || 0; if (v > pen) { pen = v; best = k; } }); return REQ[best]; };
  const flow = view(OFFERS.filter(o => statusOf(o) !== 'ended'));
  const L = {};
  const add = (a, b, col) => { const key = a + '\u0000' + b; L[key] = L[key] || { source: a, target: b, value: 0, col }; L[key].value += 1; };
  flow.forEach(o => { const pt = PTYPE[o.plat.type].l, ty = TYPES[o.ty].l, cl = CLAIM[o.c], rq = mainReq(o); add(pt, ty, typeColor(o.ty)); add(ty, cl, typeColor(o.ty)); add(cl, rq, null); });
  const nodeNames = uniq(Object.values(L).flatMap(l => [l.source, l.target]));
  const typeByLabel = Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [v.l, k]));
  chart('#cSankey', {
    tooltip: { trigger: 'item', formatter: p => p.dataType === 'edge' ? `${p.data.source} → ${p.data.target}<br><b>${p.data.value}</b> 条` : `<b>${p.name}</b>` },
    series: [{
      type: 'sankey', left: 8, right: 110, top: 10, bottom: 10, nodeWidth: 12, nodeGap: 10, draggable: false, layoutIterations: 64,
      label: { color: TK.ink, fontFamily: FONT, fontSize: 12 },
      data: nodeNames.map(n => ({ name: n, itemStyle: { color: typeByLabel[n] ? typeColor(typeByLabel[n]) : TK.ink2, borderWidth: 0 } })),
      links: Object.values(L).map(l => ({ source: l.source, target: l.target, value: l.value, lineStyle: { color: l.col || TK.line2, opacity: l.col ? 0.32 : 0.55, curveness: 0.5 } })),
      emphasis: { focus: 'adjacency' },
    }],
  });

  // 谁最大方
  const ranked = view(OFFERS.filter(o => o.ty !== 'apply'));
  const byP = uniq(ranked.map(o => o.p)).map(pid => ({ pid, v: sum(ranked.filter(o => o.p === pid), o => o.usd) })).sort((a, b) => b.v - a.v);
  const ct = chart('#cTree', {
    tooltip: { trigger: 'item', formatter: p => `<b>${esc(p.name)}</b><br>约 ${money(p.value)} · ${PTYPE[PMAP[p.data.pid].type].l}` },
    series: [{
      type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0,
      itemStyle: { borderColor: TK.surface, borderWidth: 2, gapWidth: 2, borderRadius: 6 },
      label: { show: true, fontFamily: FONT, fontSize: 12, formatter: p => `${p.name}\n${money(p.value)}`, lineHeight: 16 },
      data: byP.map(x => { const col = ptypeColor(PMAP[x.pid].type); return { name: PMAP[x.pid].name, value: x.v, pid: x.pid, itemStyle: { color: col }, label: { color: onColor(col) } }; }),
    }],
  });
  ct && ct.on('click', p => { if (p.data && p.data.pid) location.hash = 'platform-' + p.data.pid; });

  // 大方榜赛跑
  const raceData = mi => RACE.series.map(s => ({ value: s.vals[mi], name: PMAP[s.id].name, pid: s.id, itemStyle: { color: ptypeColor(PMAP[s.id].type), borderRadius: [0, 4, 4, 0] } }));
  const last = RACE.months.length - 1;
  const cr = chart('#cRace', {
    grid: { left: 8, right: 58, top: 40, bottom: 8, containLabel: true },
    xAxis: Object.assign(axisCommon(), { type: 'value', max: 'dataMax', axisLabel: { color: TK.muted, formatter: v => money(v) } }),
    yAxis: Object.assign(axisCommon(), { type: 'category', inverse: true, max: 9, data: RACE.series.map(s => PMAP[s.id].name), axisLabel: { color: TK.ink2, fontSize: 12 }, animationDuration: 300, animationDurationUpdate: 300 }),
    series: [{ type: 'bar', realtimeSort: true, barWidth: 14, data: raceData(last), label: { show: true, position: 'right', valueAnimation: true, color: TK.ink2, fontFamily: FONT, formatter: p => money(p.value) } }],
    animationDuration: 0, animationDurationUpdate: REDUCED ? 0 : 900, animationEasing: 'linear', animationEasingUpdate: 'linear',
    graphic: [{ type: 'text', id: 'mon', right: 8, top: 4, style: { text: RACE.months[last], fill: TK.muted, font: `700 20px ${FONT}`, textAlign: 'right' } }],
  });
  cr && cr.on('click', p => { if (p.data && p.data.pid) location.hash = 'platform-' + p.data.pid; });
  $('#racePlay').addEventListener('click', e => {
    const btn = e.currentTarget; btn.disabled = true; let mi = 0;
    const step = () => { if (!cr || cr.isDisposed()) return; cr.setOption({ series: [{ data: raceData(mi) }], graphic: [{ id: 'mon', style: { text: RACE.months[mi] } }] }); mi++; if (mi <= last) setTimeout(step, 1000); else btn.disabled = false; };
    step();
  });

  // 趋势
  chart('#cTrend', {
    grid: { left: 8, right: 40, top: 34, bottom: 6, containLabel: true },
    legend: Object.assign(legendCommon(), { top: 0, left: 0 }),
    tooltip: { trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: TK.line2 } } },
    xAxis: Object.assign(axisCommon(), { type: 'category', data: TREND.labels, boundaryGap: false }),
    yAxis: Object.assign(axisCommon(), { type: 'value', minInterval: 1 }),
    series: [['新增', TREND.nw, 0], ['结束', TREND.ed, 1]].map(([n, d, i]) => ({ name: n, type: 'line', data: d, smooth: 0.3, symbol: 'circle', symbolSize: 5, showSymbol: false, lineStyle: { width: 2, color: TK.s[i] }, itemStyle: { color: TK.s[i] }, areaStyle: i === 0 ? { color: TK.s[0], opacity: 0.1 } : undefined, endLabel: { show: true, color: TK.ink2, fontFamily: FONT, formatter: p => `${p.value}` } })),
  });
  chart('#cStack', {
    grid: { left: 8, right: 12, top: 56, bottom: 6, containLabel: true },
    legend: Object.assign(legendCommon(), { top: 0, left: 0, itemGap: 8, textStyle: { color: TK.ink2, fontSize: 11 } }),
    tooltip: { trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: TK.line2 } } },
    xAxis: Object.assign(axisCommon(), { type: 'category', data: TREND.labels, boundaryGap: false }),
    yAxis: Object.assign(axisCommon(), { type: 'value', minInterval: 1 }),
    series: Object.keys(TYPES).map(t => ({ name: TYPES[t].l, type: 'line', stack: 'all', data: TREND.by[t], symbol: 'none', smooth: 0.25, lineStyle: { width: 1, color: TK.surface }, areaStyle: { color: typeColor(t), opacity: 0.9 }, itemStyle: { color: typeColor(t) } })),
  });
}

/* ---------- 重置时钟 ---------- */
// 带“额度重置”标签的条目；有官方发布时间（精确到时刻）的才参与星期 × 时段分布
const resetList = () => OFFERS.filter(o => (o.tags || []).includes('reset')).map(o => ({ o, at: o.publishedAt ? new Date(o.publishedAt) : startInstant(o), exact: !!o.publishedAt })).sort((a, b) => b.at - a.at);
function resetBlock() {
  const list = resetList();
  if (list.length < 3) return emptySheep(list.length ? `已收录 ${list.length} 次重置，满 3 次后显示分布。` : '还没有收录到额度重置。');
  const ts = list.map(x => x.at.getTime()).sort((a, b) => a - b);
  const gaps = ts.slice(1).map((t, i) => (t - ts[i]) / DAY), avg = gaps.length ? sum(gaps, g => g) / gaps.length : 0;
  const last = list[0], plats = uniq(list.map(x => x.o.plat.name));
  return `<section class="kpis" style="margin-top:6px">
      <div class="kpi"><span class="k-l">已收录重置</span><span class="k-v">${list.length}<small>次 · ${plats.length} 个平台</small></span></div>
      <div class="kpi"><span class="k-l">平均间隔</span><span class="k-v">${avg.toFixed(1)}<small>天</small></span></div>
      <div class="kpi"><span class="k-l">最近一次</span><span class="k-v">${Math.max(0, Math.round((NOW - last.at) / DAY))}<small>天前 · ${esc(last.o.plat.name)}</small></span></div>
    </section>
    <div class="chart" id="cReset" style="height:260px"></div>
    <div class="rows" style="margin-top:8px">${list.slice(0, 8).map(x => orow(x.o, `${md(x.at)}${x.exact ? ' ' + hm(x.at) : ''}`)).join('')}</div>`;
}
function drawResetClock() {
  const list = resetList().filter(x => x.exact);
  if (!$('#cReset') || !list.length) return;
  const cnt = {};
  list.forEach(x => { const k = `${(x.at.getDay() + 6) % 7}-${x.at.getHours()}`; (cnt[k] = cnt[k] || []).push(x); });
  const data = Object.entries(cnt).map(([k, xs]) => { const [d, h] = k.split('-').map(Number); return { value: [h, d, xs.length], xs }; });
  chart('#cReset', {
    grid: { left: 8, right: 16, top: 10, bottom: 24, containLabel: true },
    tooltip: { trigger: 'item', formatter: p => `周${WD[(p.data.value[1] + 1) % 7]} ${pad(p.data.value[0])}:00 前后 · ${p.data.value[2]} 次<br>${p.data.xs.map(x => `${md(x.at)} ${esc(x.o.t)}`).join('<br>')}` },
    xAxis: Object.assign(axisCommon(), { type: 'value', min: 0, max: 23, interval: 3, axisLabel: { color: TK.muted, formatter: v => `${v}:00` } }),
    yAxis: Object.assign(axisCommon(), { type: 'category', inverse: true, data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'], axisLabel: { color: TK.ink2 } }),
    series: [{ type: 'scatter', data, symbolSize: v => 10 + v[2] * 7, itemStyle: { color: TK.s[0], opacity: 0.85, borderColor: TK.surface, borderWidth: 2 } }],
  });
}

/* ---------- 平台页 ---------- */
function pPlatform(id) {
  const p = PMAP[id];
  if (!p) { main().innerHTML = ribbon() + emptySheep('没找到这个平台。<a href="#today">回到今天</a>'); return; }
  const list = view(OFFERS.filter(o => o.p === id)).sort((a, b) => b.since - a.since);
  const live = list.filter(o => statusOf(o) !== 'ended');
  const avg = i => list.length ? Math.round(sum(list, o => dims(o)[i]) / list.length) : 0;
  const pd = [clamp(list.length * 22, 10, 100), avg(0), avg(1), avg(5), avg(4), list.some(o => o.ty === 'standing') ? 100 : 30];
  main().innerHTML = ribbon() + `<div class="crumb"><a href="#all">全部羊毛</a> / 平台</div>` + ph(esc(p.name), `${PTYPE[p.type].l} · 已准入白名单${p.x ? ` · 监控的 X 账号：${esc(p.x)}` : ''}`, p.site ? `<a class="btn" href="${p.site}" target="_blank" rel="noopener">打开官网 ↗</a>` : '') + `
  <section class="kpis" style="margin-top:0">
    <div class="kpi"><span class="k-l">收录过的羊毛</span><span class="k-v">${list.length}<small>条</small></span></div>
    <div class="kpi"><span class="k-l">现在可领</span><span class="k-v">${list.filter(claimable).length}<small>条</small></span></div>
    <div class="kpi"><span class="k-l">已结束</span><span class="k-v">${list.length - live.length}<small>条</small></span></div>
    <div class="kpi"><span class="k-l">累计价值（不含申请制）</span><span class="k-v">${money(sum(list.filter(o => o.ty !== 'apply'), o => o.usd))}</span></div>
  </section>
  <section class="grid g2">
    <div class="card"><h3>平台雷达</h3><p class="sub">由它发过的所有羊毛按规则汇总</p><div class="chart" id="cPRadar" style="height:300px"></div></div>
    <div class="card"><h3>发放历史</h3><p class="sub">每条羊毛从开始到结束；常驻额度画到今天</p><div class="chart" id="cPHist" style="height:${Math.max(160, list.length * 34 + 70)}px"></div></div>
  </section>
  <section>${secH('这个平台的羊毛')}${ocards(list)}</section>`;
  const col = ptypeColor(p.type);
  chart('#cPRadar', {
    tooltip: { trigger: 'item' },
    radar: { indicator: ['发放频率', '平均价值', '门槛友好', '国内可用', '信源透明', '常驻额度'].map(n => ({ name: n, max: 100 })), radius: '64%', center: ['50%', '54%'], splitNumber: 4, axisName: { color: TK.ink2, fontSize: 12 }, splitLine: { lineStyle: { color: TK.line2 } }, splitArea: { areaStyle: { color: [TK.surface, TK.surface2] } }, axisLine: { lineStyle: { color: TK.line2 } } },
    series: [{ type: 'radar', data: [{ value: pd, name: p.name, areaStyle: { color: col, opacity: 0.25 }, lineStyle: { color: col, width: 2 }, itemStyle: { color: col }, symbolSize: 5 }] }],
  });
  const lo = Math.max(-400, Math.min(-60, ...list.map(o => o.since))), hi = Math.max(20, ...list.map(o => o.ek === 'date' ? o.e + 1 : 0));
  const hd = list.map((o, i) => ({ value: [i, dayAt(Math.max(lo, o.since)).getTime(), dayAt(o.ek === 'date' ? o.e + 1 : 0.2).getTime()], o }));
  const ch = chart('#cPHist', {
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    tooltip: { trigger: 'item', formatter: q => `<b>${esc(q.data.o.t)}</b>${leftText(q.data.o)}` },
    xAxis: Object.assign(axisCommon(), { type: 'time', position: 'top', min: dayAt(lo).getTime(), max: dayAt(hi).getTime(), axisLabel: { color: TK.muted, fontSize: 11, formatter: v => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; } } }),
    yAxis: Object.assign(axisCommon(), { type: 'category', inverse: true, data: list.map(o => o.t.length > 12 ? o.t.slice(0, 11) + '…' : o.t), axisLabel: { color: TK.ink2, fontSize: 11.5 }, splitLine: { show: false } }),
    series: [{
      type: 'custom', encode: { x: [1, 2], y: 0 }, data: hd,
      renderItem: (params, api) => {
        const o = hd[params.dataIndex].o, a = api.coord([api.value(1), api.value(0)]), b = api.coord([api.value(2), api.value(0)]), bh = api.size([0, 1])[1] * 0.5;
        const st = statusOf(o), c = typeColor(o.ty);
        return { type: 'rect', shape: { x: a[0], y: a[1] - bh / 2, width: Math.max(4, b[0] - a[0]), height: bh, r: 4 }, style: { fill: c, opacity: st === 'ended' ? 0.4 : 1 } };
      },
      markLine: { symbol: 'none', silent: true, data: [{ xAxis: NOW.getTime() }], lineStyle: { color: TK.ink, width: 1.2, type: 'solid' }, label: { formatter: '今天', color: TK.ink, fontSize: 11, position: 'start' } },
    }],
  });
  ch && ch.on('click', q => { if (q.data && q.data.o) location.hash = 'offer-' + q.data.o.id; });
}

/* ---------- 详情页 ---------- */
const STEPS = {
  signup: ['打开官方页面（见下方"打开官方领取页"）', '完成注册和所需的身份验证', '额度自动发放，在控制台的余额或用量页查看'],
  auto: ['无需操作，额度或权益自动生效', '在官方控制台或产品设置里确认'],
  member: ['确认你的会员档位符合要求', '权益自动生效，在产品的用量页查看'],
  topup: ['在活动期内完成指定金额的充值', '赠送部分自动到账，留意赠送余额的有效期'],
  form: ['准备材料（公司或学生身份证明等）', '在官方申请页提交表单', '等待审核邮件，通常需要 1 到 4 周'],
  app: ['下载官方 App 并登录', '按活动页提示签到或领取'],
  code: ['向已有用户索取邀请链接或兑换码', '用链接注册，或在账户设置里兑换', '双方权益自动到账'],
};
const NOTE_DRAFTS = new Map();
const NOTE_SAVES = new Set();
function pOffer(id) {
  const o = OMAP[id];
  if (!o) { main().innerHTML = ribbon() + emptySheep('没找到这条羊毛。<a href="#today">回到今天</a>'); return; }
  const st = statusOf(o), d = dims(o), sc = score(o), miss = missing(o);
  const tzName = TZ[o.tz] || o.tz, viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let timeBlock;
  if (isLimited(o) && o.ek === 'date' && st !== 'ended') {
    const target = st === 'upcoming' ? startInstant(o) : endInstant(o);
    const total = endInstant(o) - startInstant(o), frac = st === 'upcoming' ? 1 : (endInstant(o) - NOW) / total;
    const col = o.e === 0 ? 'var(--critical)' : st === 'ending' ? 'var(--serious)' : st === 'upcoming' ? 'var(--s1)' : 'var(--good)';
    timeBlock = `<div class="ring-big">${ringSvg(frac, 92, col, 8)}<div><div class="small muted">${st === 'upcoming' ? '距离开始' : '距离领取截止'}</div><div class="cd" data-end="${target.getTime()}">${cdText(target - NOW)}</div><div class="small muted">按官方${tzName}换算成你的本地时间</div></div></div>`;
  } else if (st === 'ended') timeBlock = `<div class="ring-big">${ringSvg(0, 92, 'var(--muted)', 8)}<div><div class="cd">已结束</div><div class="small muted">${leftText(o)}${o.why ? ` · ${esc(o.why)}` : ''}</div></div></div>`;
  else if (o.ek === 'unknown') timeBlock = `<div class="ring-big">${ringSvg(0.6, 92, 'var(--muted)', 8)}<div><div class="cd">截止未知</div><div class="small muted">官方没写截止日期；每 24 小时复核一次权益页</div></div></div>`;
  else timeBlock = `<div class="ring-big">${ringSvg(st === 'stale' ? 0.35 : 1, 92, st === 'stale' ? 'var(--warn)' : o.ty === 'apply' ? 'var(--s7)' : 'var(--s6)', 8)}<div><div class="cd">${st === 'stale' ? '待核验' : o.ty === 'apply' ? '长期开放' : '常驻'}</div><div class="small muted">每 7 天核验一次 · 上次成功核验在${ago(o.vf)}</div></div></div>`;
  const endLocal = o.ek === 'date' ? endInstant(o) : null;
  const deadline = o.ek === 'date' ? `${md(dayAt(o.e))} 23:59<small>官方按${tzName}${endLocal && o.tz !== viewerTz ? `；你的本地时间 ${md(endLocal)} ${hm(endLocal)}` : ''}</small>` : o.ek === 'unknown' ? '截止未知<small>必须有仍然有效的权益页作证据</small>' : '长期<small>没有截止日期</small>';
  const verify = st === 'stale' ? (o.verify === 'evidence_missing' ? '当前证据页不再支持保存的条款，待人工核验' : `${ago(o.vf)}最后一次核验成功，之后没有核验成功，已转为待核验`) : `${ago(o.vf)}核验：${o.verify || '官方页面可以打开'}`;
  const officialUrl = (o.evidence && o.evidence.url) || o.plat.site;
  const hist = [];
  hist.push([o.fs, `系统发现（最早出现在：${o.early}）`]);
  if (o.pub != null && o.pub !== o.s) hist.push([o.pub, '官方发布']);
  if (o.s != null && o.s <= 0) hist.push([o.s, '活动开始（按官方公布时间）']);
  (o.rev || []).forEach(rv => hist.push([rv.at, `条款修订：${rv.from} → ${rv.to}`]));
  if (st === 'ended') hist.push([o.withdrawnAt ? dayIdx(new Date(o.withdrawnAt)) : o.e, o.withdrawnAt ? `官方撤回${o.why ? `（${o.why}）` : ''}` : '已到官方公布的领取截止时间']);
  if (o.vfDay != null) hist.push([o.vfDay, '最近一次成功核验']);
  hist.sort((a, b) => b[0] - a[0]);
  const same = OFFERS.filter(x => x.p === o.p && x.id !== o.id);
  const wanted = MINE.want.includes(o.id), got = claimedThisMonth(o.id);
  main().innerHTML = ribbon() + `<div class="crumb"><a href="javascript:history.back()">← 返回</a> / <a href="#platform-${o.p}">${esc(o.plat.name)}</a></div>
  <div class="dt-top">${etag(o.ty)}${stChip(o)}<span class="score" title="薅度分">${sc}<small>薅度</small></span></div>
  <h1 class="dt-title">${esc(o.t)}</h1>
  <div class="row" style="margin:6px 0 18px">
    ${officialUrl ? `<a class="btn pri" href="${esc(officialUrl)}" target="_blank" rel="noopener">打开官方页面 ↗</a>` : ''}
    <button class="btn" type="button" data-want="${o.id}" aria-pressed="${wanted}">${wanted ? '★ 想领' : '☆ 想领'}</button>
    <button class="btn" type="button" data-got="${o.id}" aria-pressed="${got}">${got ? '✓ 本月已领' : '记为本月已领'}</button>
    <button class="btn" type="button" data-cmp="${o.id}" aria-pressed="${CMP.includes(o.id)}">加入对比</button>
  </div>
  <div class="dt-grid">
    <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
      <div class="card"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:16px"><div><div class="small muted">赠送内容</div><div class="bigval">${valLabel(o)}</div><div style="margin-top:4px">${esc(o.v)}</div></div>${timeBlock}</div></div>
      <div class="facts">
        <div class="fact"><div class="l">领取方式</div><div class="v">${CLAIM[o.c]}</div></div>
        <div class="fact"><div class="l">领取开始</div><div class="v">${o.s != null ? md(dayAt(o.s)) : '已开放'}</div></div>
        <div class="fact"><div class="l">领取截止</div><div class="v">${deadline}</div></div>
        <div class="fact"><div class="l">额度有效期</div><div class="v">${esc(o.val)}<small>领取之后多久失效，和领取截止是两回事</small></div></div>
        <div class="fact"><div class="l">适用对象</div><div class="v">${AUD[o.aud]}</div></div>
        <div class="fact"><div class="l">模态</div><div class="v">${o.m.map(m => MODAL[m]).join('、')}</div></div>
      </div>
      ${o.note || ADM.token ? `<div class="card" id="noteBox"><h3>💬 牧场心得</h3><p data-note-display style="margin:0;white-space:pre-wrap">${esc(o.note || '还没有心得。')}</p>${ADM.token ? `<form id="noteForm" style="display:flex;flex-direction:column;gap:8px;margin-top:10px"><textarea name="note" rows="3" maxlength="500" placeholder="实际用下来怎么样？比如：速度慢、容易限流、适合做翻译…（公开显示，最多 500 字）">${esc(NOTE_DRAFTS.get(o.id) ?? o.note)}</textarea><div class="row" style="align-items:center"><button class="btn sm pri" type="submit" ${NOTE_SAVES.has(o.id) ? 'disabled' : ''}>保存心得</button><span data-notemsg role="status" class="small" style="font-weight:600">${NOTE_SAVES.has(o.id) ? '保存中…' : NOTE_DRAFTS.has(o.id) ? '未保存' : ''}</span></div></form>` : ''}</div>` : ''}
      <div class="card"><h3>适用资格</h3><p class="sub">${miss.length ? `按你的条件，还差 ${miss.length} 项` : '按你的条件，全部满足'} · <a href="#" data-open-cond style="text-decoration:underline">修改我的条件</a></p>${reqChips(o, true)}${o.r.includes('targeted') ? '<p class="small muted" style="margin:8px 0 0">定向发放：只有部分账号收到，能不能领要看你的账号。</p>' : ''}${o.aud === 'unclear' ? '<p class="small muted" style="margin:8px 0 0">官方没写清楚谁能领，这里不宣称人人可领。</p>' : ''}</div>
      <div class="card"><h3>领取步骤</h3><ol class="steps">${((o.steps && o.steps.length) ? o.steps : (STEPS[o.c] || [])).map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
      <div class="card"><h3>官方证据</h3><p class="sub">信源：${SRC[o.st]}${o.st === 'staff' ? '（白名单内的在职员工账号）' : ''} · ${verify}</p>
        <div class="rows">${[['benefit', '权益'], ['eligibility', '资格'], ['claim', '领取方式'], ['validity', '有效期']].map(([k, l]) => { const ex = o.evidence && o.evidence.excerpts && o.evidence.excerpts[k]; return `<div class="orow" style="grid-template-columns:auto minmax(0,1fr)">${ex ? `<span class="st good"><b>✓</b>${l}</span>` : `<span class="st warn"><b>!</b>${l}</span>`}<span class="t">${ex ? `「${esc(ex)}」` : '官方原文里没有找到对应说明'}<small>${ex ? '官方原文逐字摘录' : '以官方页面为准'}</small></span></div>`; }).join('')}</div>
        <p class="small muted" style="margin:10px 0 0">来源：${officialUrl ? `<a href="${esc(officialUrl)}" target="_blank" rel="noopener" style="text-decoration:underline">${esc(officialUrl)}</a>` : '—'}</p>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
      <div class="card"><h3>薅度雷达</h3><p class="sub">六项按规则计算，合成薅度分 ${sc}</p><div class="chart" id="cRadar" style="height:280px"></div>
        <div class="rows">${DIMS.map((n, i) => `<div class="row small" style="gap:10px;padding:3px 0"><span style="width:64px;color:var(--ink-2)">${n}</span><span class="meter" style="flex:1"><i style="width:${d[i]}%;background:${typeVar(o.ty)}"></i></span><span class="num tnum" style="width:28px;text-align:right">${d[i]}</span></div>`).join('')}</div></div>
      ${ADM.token ? `<div class="card" id="revBox"><h3>条款修订记录</h3>${(o.rev || []).length ? `<div class="diff">${o.rev.map(rv => `<div><span class="small muted">${md(dayAt(rv.at))}</span><br><del>${esc(rv.from)}</del> → <ins>${esc(rv.to)}</ins></div>`).join('')}</div>` : '<p class="small muted" style="margin:0">收录以来条款没有变化。</p>'}</div>` : ''}
      <div class="card"><h3>状态时间轴</h3><ul class="tl">${hist.map(([t, s], i) => `<li class="${i ? '' : 'hot'}"><time>${md(dayAt(t))}</time>${esc(s)}</li>`).join('')}</ul></div>
    </div>
  </div>
  ${same.length ? `<section>${secH(`${esc(o.plat.name)} 的其他羊毛`)}${ocards(same)}</section>` : ''}`;
  const noteForm = $('#noteForm');
  noteForm?.addEventListener('input', () => {
    const value = noteForm.querySelector('[name="note"]').value;
    if (value === o.note) NOTE_DRAFTS.delete(o.id); else NOTE_DRAFTS.set(o.id, value);
    noteForm.querySelector('[data-notemsg]').textContent = value === o.note ? '' : '未保存';
  });
  noteForm?.addEventListener('submit', async e => {
    e.preventDefault(); const f = e.currentTarget, msg = f.querySelector('[data-notemsg]'), button = f.querySelector('button'), input = f.querySelector('[name="note"]');
    if (button.disabled || NOTE_SAVES.has(o.id)) return;
    const note = input.value;
    NOTE_DRAFTS.set(o.id, note); NOTE_SAVES.add(o.id); button.disabled = true; msg.style.color = ''; msg.textContent = '保存中…';
    const visibleForm = () => route()[0] === 'offer' && route()[1] === o.id ? $('#noteForm') : null;
    try {
      const r = await adm(`/offers/${encodeURIComponent(o.id)}/note`, { note }); o.note = r.adminNote || '';
      const currentForm = visibleForm(), currentInput = currentForm?.querySelector('[name="note"]'), current = currentInput?.value ?? NOTE_DRAFTS.get(o.id);
      const currentMessage = currentForm?.querySelector('[data-notemsg]') || msg;
      if (current === note || current === o.note) { if (currentInput) currentInput.value = o.note; NOTE_DRAFTS.delete(o.id); currentMessage.textContent = '已保存'; }
      else { if (current != null) NOTE_DRAFTS.set(o.id, current); currentMessage.textContent = '当前修改未保存'; }
      if (currentForm) $('#noteBox [data-note-display]').textContent = o.note || '还没有心得。';
    } catch (err) { const currentMessage = visibleForm()?.querySelector('[data-notemsg]') || msg; currentMessage.style.color = 'var(--critical-ink)'; currentMessage.textContent = '没有保存：' + err.message; }
    finally { NOTE_SAVES.delete(o.id); button.disabled = false; const currentButton = visibleForm()?.querySelector('button'); if (currentButton) currentButton.disabled = false; }
  });
  // 修订记录按需读取
  const revisionBox = $('#revBox');
  fetch(`/api/offers/${encodeURIComponent(o.id)}`).then(r => r.ok ? r.json() : null).then(j => {
    const box = revisionBox; if (!box?.isConnected || route()[1] !== o.id || !j?.revisions?.length) return;
    const F = { valueText: '额度', claimEnd: '截止', claimStart: '开始', requirements: '门槛', usdEstimate: '折合美元', usdMax: '价值上限', title: '标题', creditValidity: '有效期', endKind: '截止类型', type: '类型', audience: '适用对象', steps: '领取步骤', claimMethod: '领取方式', modalities: '模态', platformId: '平台', sourceTz: '时区', evidence: '官方证据' };
    // 修订内容转成人能读的文字：枚举用中文名，列表逐条，证据只说明链接和级别变化
    const say = (field, v) => {
      if (v == null || v === '') return '（空）';
      if (field === 'type') return TYPES[v]?.l || v;
      if (field === 'claimMethod') return CLAIM[v] || v;
      if (field === 'audience') return AUD[v] || v;
      if (field === 'requirements') return v.map(r => reqLabel(r)).join('、');
      if (field === 'modalities') return v.map(m => MODAL[m] || m).join('、');
      if (Array.isArray(v)) return v.join('；');
      return String(v);
    };
    const line = x => {
      if (x.field !== 'evidence') return `${F[x.field] || x.field}：<del>${esc(say(x.field, x.from))}</del> → <ins>${esc(say(x.field, x.to))}</ins>`;
      const a = x.from || {}, b = x.to || {}, parts = [];
      if (a.tier !== b.tier) parts.push(`级别 <del>${esc(SRC[a.tier] || a.tier || '（空）')}</del> → <ins>${esc(SRC[b.tier] || b.tier)}</ins>`);
      if (a.url !== b.url) parts.push(`链接换成 <ins>${esc(b.url || '')}</ins>`);
      if (JSON.stringify(a.excerpts) !== JSON.stringify(b.excerpts)) parts.push('原文摘录已更新');
      return `官方证据：${parts.join('；') || '重新抓取'}`;
    };
    box.innerHTML = `<h3>条款修订记录</h3><div class="diff">${j.revisions.map(rv => `<div><span class="small muted">${esc(rv.at.slice(0, 10))}</span>${rv.diff.map(x => `<br>${line(x)}`).join('')}</div>`).join('')}</div>`;
  }).catch(() => undefined);
  const col = typeColor(o.ty);
  chart('#cRadar', {
    tooltip: { trigger: 'item' },
    radar: { indicator: DIMS.map(n => ({ name: n, max: 100 })), radius: '66%', center: ['50%', '54%'], splitNumber: 4, axisName: { color: TK.ink2, fontSize: 12 }, splitLine: { lineStyle: { color: TK.line2 } }, splitArea: { areaStyle: { color: [TK.surface, TK.surface2] } }, axisLine: { lineStyle: { color: TK.line2 } } },
    series: [{ type: 'radar', data: [{ value: d, name: o.t, areaStyle: { color: col, opacity: 0.25 }, lineStyle: { color: col, width: 2 }, itemStyle: { color: col }, symbolSize: 5 }] }],
  });
}

/* ---------- 我的 ---------- */
function condForm() {
  return `<label class="tog"><span>只看我能薅的<small>全站只显示你满足门槛的羊毛</small></span><input type="checkbox" data-c="only" ${C.only ? 'checked' : ''}></label>
  ${COND_ITEMS.map(([k, l]) => `<label class="tog"><span>${l}</span><input type="checkbox" data-c="${k}" ${C[k] ? 'checked' : ''}></label>`).join('')}
  <div class="small muted" style="margin:14px 0 6px">我已有的会员</div>
  <div class="chips">${MEMBERS.map(m => `<button class="btn sm" type="button" data-mem="${esc(m)}" aria-pressed="${C.members.includes(m)}">${esc(m)}</button>`).join('')}</div>
  <p class="small muted" style="margin:12px 0 0">只保存在这台设备的浏览器里，不会上传。</p>`;
}
function pMine() {
  const pool = OFFERS.filter(o => claimable(o) && eligible(o));
  const claims = MINE.claimed.filter(x => x.month === localMonth());
  const got = claims.map(x => OMAP[x.id]).filter(Boolean), want = MINE.want.map(id => OMAP[id]).filter(Boolean);
  const gv = sum(claims, x => x.usd), pv = sum(pool, o => o.usd) + sum(claims.filter(x => !pool.some(o => o.id === x.id)), x => x.usd);
  main().innerHTML = ribbon() + ph('我的', '你的条件决定全站显示什么；想领和已领的清单只存在这台设备上。') + `
  <section class="grid g2" style="margin-top:0">
    <div class="card"><h3>本月薅羊毛进度</h3><p class="sub">本月领取时记录的估值 / 当前可领及本月已领的估算价值</p>
      <div class="prog">${ringSvg(pv ? gv / pv : 0, 132, 'var(--s3)', 12)}<div class="kv"><span class="small muted">已薅</span><b>${money(gv)}</b><span class="small muted">共可薅 ${money(pv)} · ${pool.length} 条</span></div></div></div>
    <div class="card"><h3>我的条件</h3>${condForm()}</div>
  </section>
  <section>${secH(`想领（${want.length}）`)}${want.length ? `<div class="rows">${want.map(o => orow(o, leftText(o))).join('')}</div>` : emptySheep('在详情页点"想领"，会出现在这里。')}</section>
  <section>${secH(`本月已领（${got.length}）`)}${got.length ? `<div class="rows">${got.map(o => orow(o, '本月已领')).join('')}</div>` : emptySheep('在详情页点"本月已领"，会计入本月进度。')}</section>
  ${MINE.legacyGot.length ? `<section>${secH(`旧版已领（日期未知 · ${MINE.legacyGot.length}）`)}<p class="small muted">这些记录保留在本机，不计入本月金额。</p><div class="rows">${MINE.legacyGot.map(id => OMAP[id] ? `<div class="row">${orow(OMAP[id], '日期未知')}<button class="btn sm" type="button" data-remove-legacy="${esc(id)}">移除</button></div>` : '').join('')}</div></section>` : ''}`;
}

/* ---------- 覆盖范围 ---------- */
function pCoverage() {
  const cv = COVERAGE || { platforms: PLATFORMS.length, sources: 0, byKind: {}, officialPages: [] };
  const K = { web_list: ['官网页面 / 帮助文档', '每 6 小时，只看羊毛相关句子是否变化'], rss: ['官方 RSS', '每 6 小时'], json: ['官方接口', '每 6 小时'], aihot: ['AIHOT 公开接口', '每小时，含 Codex 重置与赠额'], hn: ['Hacker News', '线索，每 6 小时'], reddit: ['Reddit', '线索，由常开机器中继'], email: ['订阅邮箱', '计划中'], manual: ['补录', '通过 Hermes 转发链接'], sweep: ['周六发现扫描', '计划中'], discord: ['Discord 公告频道', '计划中'] };
  const rows = Object.entries(cv.byKind || {}).map(([k, v]) => [K[k] ? K[k][0] : k, K[k] ? K[k][1] : '', `${v.enabled} 个`, v.failing ? stBadge('warn', '!', `${v.failing} 个连续失败`) : stBadge('good', '✓', '正常')]);
  const gaps = [
    ['微信公众号', '没有自动抓取；靠官网同步公告和补录。', 'warn'],
    ['X（推特）', '只覆盖 AIHOT 已跟踪的账号和官网同步公告。', 'warn'],
    ['Discord', '计划中：关注厂商官方公告频道。', 'critical'], ['产品内通知 / 私信邮件', '计划中：订阅邮箱。', 'critical'],
  ];
  const plist = uniq((cv.officialPages || []).map(x => x.platformId));
  main().innerHTML = ribbon() + ph('覆盖范围', '我们在看哪些地方、还有哪些看不到。只收能追到官方出处的羊毛，不保证覆盖全球所有活动，也不保证抓到所有短时福利。') + `
  <section class="kpis" style="margin-top:0">
    <div class="kpi"><span class="k-l">已准入平台</span><span class="k-v">${cv.platforms}<small>个</small></span></div>
    <div class="kpi"><span class="k-l">监控信源</span><span class="k-v">${cv.sources}<small>个</small></span></div>
    <div class="kpi"><span class="k-l">最近成功采集</span><span class="k-v">${LAST_OK ? hm(LAST_OK) : '—'}</span></div>
    <div class="kpi"><span class="k-l">采集频率</span><span class="k-v">6<small>小时一次</small></span></div>
  </section>
  <section>${secH('正在监控')}<div class="card tbl" style="padding:4px 8px"><table><thead><tr><th>渠道</th><th>方式</th><th>规模</th><th>状态</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div></section>
  <section>${secH('官方页面监控', `${plist.length} 个平台`)}<div class="chips">${plist.map(id => PMAP[id] ? `<a class="chip" href="#platform-${id}">${esc(PMAP[id].name)}</a>` : '').join('')}</div></section>
  <section>${secH('已知缺口')}<div class="rows">${gaps.map(g => `<div class="orow" style="grid-template-columns:auto minmax(0,1fr)">${stBadge(g[2], g[2] === 'critical' ? '✕' : '!', g[2] === 'critical' ? '暂不覆盖' : '部分覆盖')}<span class="t">${g[0]}<small>${g[1]}</small></span></div>`).join('')}</div></section>
  <section>${secH('平台白名单', `${PLATFORMS.length} 个`)}<div class="chips">${PLATFORMS.map(p => `<a class="chip" href="#platform-${p.id}">${etagSvg(ptypeColor(p.type)).replace('<svg ', '<svg style="width:10px;height:12px" ')}${esc(p.name)}</a>`).join('')}</div></section>`;
}

/* ---------- 后台 ---------- */
/* ---------- 后台（管理员密钥登录；数据走 /api/admin） ---------- */
// 管理员密钥：默认存 sessionStorage（刷新不丢，关标签页即清除）；勾选“记住”才存 localStorage。读写失败就只在内存里。
const ADM_KEY = 'ym-admin-token';
const admStore = {
  load() { try { return sessionStorage.getItem(ADM_KEY) || localStorage.getItem(ADM_KEY) || ''; } catch (e) { return ''; } },
  save(token, remember) { try { sessionStorage.setItem(ADM_KEY, token); if (remember) localStorage.setItem(ADM_KEY, token); else localStorage.removeItem(ADM_KEY); } catch (e) { /* 存不了就只在本次打开有效 */ } },
  clear() { try { sessionStorage.removeItem(ADM_KEY); localStorage.removeItem(ADM_KEY); } catch (e) { /* 忽略 */ } },
};
const ADM = { token: admStore.load(), tab: 'queue' };
function dateTimeInput(value) {
  const d = new Date(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value ? `${value}T00:00` : '';
  return value && Number.isFinite(d.getTime()) ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
}
async function adm(path, body) {
  const r = await fetch('/api/admin' + path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: 'Bearer ' + ADM.token, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { ADM.token = ''; ADM.role = ''; admStore.clear(); throw new Error('管理员密钥不正确，请重新登录'); }
  if (!r.ok) throw new Error((j.error || ('请求失败 ' + r.status)) + (Array.isArray(j.issues) && j.issues.length ? '：' + j.issues.map(i => `${FIELD_L[i.path?.[0]] || i.path?.join('.') || ''} ${i.message}`.trim()).join('；') : ''));
  return j;
}
const TIER_L = { site: '官网', docs: '官方文档', official: '官方账号', staff: '员工账号', media: '媒体 / 社区转述', tested: '管理员实测（我亲自领到过）' };
const EX_L = [['benefit', '权益'], ['eligibility', '资格'], ['claim', '领取方式'], ['validity', '有效期']];
const TAG_L = { reset: '额度重置', referral: '邀请奖励', discount: '首月 / 限时折扣', daily: '每日刷新' }; // 与 src/shared/spec.ts TAGS 一致
/** 上架前检查：服务器按 src/shared/spec.ts 算好，这里只负责显示。 */
function checksBlock(o) {
  const main = (o.checks || []).filter(i => i.level !== 'info'), info = (o.checks || []).filter(i => i.level === 'info');
  const line = i => `<div class="orow" style="grid-template-columns:auto minmax(0,1fr);padding:5px 2px">${i.level === 'block' ? stBadge('critical', '✕', '必须补') : stBadge('warn', '!', '建议补')}<span class="t" style="font-weight:400;font-size:13px">${esc(i.label)}：${esc(i.problem)}<small>影响：${esc(i.sections.join('、'))}</small></span></div>`;
  return `<div class="card" style="padding:8px 10px;background:var(--surface-2)"><div class="small" style="font-weight:600;margin-bottom:2px">上架前检查</div>${main.length ? `<div class="rows">${main.map(line).join('')}</div>` : '<div class="small" style="color:var(--good-ink)">✓ 字段齐全，网站所有栏目和推送都能正确显示</div>'}${info.length ? `<div class="small muted" style="margin-top:4px">可选：${info.map(i => esc(i.label)).join('、')}</div>` : ''}</div>`;
}
const RC = [['paid_bundle', '付费套餐自带'], ['not_ai', '不是 AI 额度'], ['wrong_platform', '平台归错'], ['duplicate', '重复'], ['expired', '旧活动 · 日期查不到'], ['vague', '额度不明'], ['insufficient_evidence', '证据不足'], ['wrong_type', '分类错']];
const FIELD_L = { models: '免费模型', tags: '标签', publishedAt: '发布时间', usdMax: '价值上限', steps: '领取步骤', sourceTz: '官方时区', modalities: '模态', title: '标题', type: '类型', valueText: '额度', usdEstimate: '折合美元', claimStart: '开始', claimEnd: '截止', endKind: '截止方式', creditValidity: '有效期', audience: '适用对象', requirements: '门槛', modalities: '模态', platformId: '平台', sourceTz: '时区', claimMethod: '领取方式' };
const SUG = { approve: ['good', '✓', '建议通过'], history: ['good', '⌛', '建议作为历史上架'], reject: ['bad', '✕', '建议拒绝'], judge: ['warn', '?', '需要你判断'] };
const RCL_ALL = { paid_bundle: '付费套餐自带', not_ai: '不是 AI 额度', wrong_platform: '平台归错', duplicate: '重复', expired: '旧活动 · 日期查不到', vague: '额度不明', insufficient_evidence: '证据不足', wrong_type: '分类错', wrong_field: '字段错', other: '其他' };
function sugBlock(o, live = false) {
  const g = o.suggestion; if (!g) return '';
  const [tone, icon, defaultLabel] = SUG[g.verdict] || SUG.judge;
  const label = g.verdict === 'reject' ? (live ? '建议下架' : o.pendingUpdate ? '建议拒绝本次更新' : '建议拒绝收录')
    : o.pendingUpdate && g.verdict === 'approve' ? '建议接受更新' : defaultLabel;
  const rejectLabel = live ? '下架此条目' : o.pendingUpdate ? '拒绝更新，保留已上架内容' : '拒绝收录';
  const color = tone === 'bad' ? 'var(--critical-ink)' : tone === 'warn' ? 'var(--warning-ink, #b26a00)' : 'var(--good-ink, #2e7d32)';
  return `<div class="card" style="padding:8px 10px;border-left:4px solid ${color};margin:0"><div class="row" style="gap:8px;flex-wrap:wrap"><b style="color:${color}">${icon} ${label}</b>${g.code ? `<span class="chip">${esc(RCL_ALL[g.code] || g.code)}</span>` : ''}<span class="small muted">${esc(g.by || '')}${g.at ? ' · ' + esc(g.at.slice(0, 10)) : ''}</span></div><div class="small warn-note" style="margin-top:4px;color:var(--ink)">${esc(g.reason || '')}</div>${g.verdict === 'reject' ? `<p class="small" style="margin:6px 0 0">同意此建议：点击下方“${rejectLabel}”，再确认。${o.pendingUpdate && !live ? '已上架内容继续公开。' : ''}</p>` : ''}</div>`;
}
function reviewActions(o, live) {
  const edit = o.pendingUpdate && !live ? '修改更新' : live ? '补字段' : '修改';
  if (live) return `<div class="row review-actions"><span class="st good"><b>✓</b>已上架</span><button class="btn sm" type="button" data-act="edit">${edit}</button>${ADM.role === 'reviewer' ? '' : '<button class="btn sm bad" type="button" data-act="rejectopen">下架此条目</button>'}</div>`;
  const accept = o.pendingUpdate ? '接受更新' : o.status === 'ended' ? '通过并收录历史' : '通过并上架';
  const tested = o.evidenceTier === 'media';
  const blocked = (o.checks || []).some(i => i.level === 'block');
  return `<div class="row review-actions"><button class="btn sm good" type="button" ${blocked ? `disabled title="先点“${edit}”补齐标红的字段"` : `data-act="${tested ? 'tested' : 'approve'}"${tested ? ' title="官方没有文字公告，但你亲自领到过"' : ''}`}>✓ ${tested ? '我已实测，' : ''}${accept}</button><button class="btn sm" type="button" data-act="edit">${edit}</button><button class="btn sm bad" type="button" data-act="rejectopen">✕ ${o.pendingUpdate ? '拒绝更新，保留已上架内容' : '拒绝收录'}</button></div>${blocked ? `<p class="small" style="margin:0;color:var(--critical-ink)">先点“${edit}”补齐“必须补”的字段</p>` : ''}${o.pendingUpdate ? '<p class="small muted" style="margin:0">接受更新会替换已上架内容；拒绝更新会保留已上架内容。</p>' : ''}`;
}
function pAdmin(focusId) {
  if (focusId) { ADM.tab = 'queue'; ADM.sug = 'all'; }
  if (!ADM.token) {
    main().innerHTML = ribbon() + ph('后台', '用管理员密钥登录。刷新页面不用重新输入，关掉标签页后需要重新登录；勾选“记住”则一直保留，直到退出登录。') + `
    <form id="admLogin" class="card" style="max-width:460px;display:flex;flex-direction:column;gap:10px">
      <label class="field" for="admTok">管理员密钥<input type="password" id="admTok" autocomplete="off" placeholder="输入管理员密钥"></label>
      <label class="row small" style="gap:6px;align-items:center"><input type="checkbox" id="admRemember"> 在这台电脑上记住（公用电脑不要勾选）</label>
      <button class="btn pri" type="submit">登录</button><p class="small muted" id="admErr" style="margin:0"></p>
    </form>`;
    $('#admLogin').addEventListener('submit', async e => {
      e.preventDefault(); ADM.token = $('#admTok').value.trim();
      try { const me = await adm('/whoami'); ADM.role = me.role; ADM.who = me.who; admStore.save(ADM.token, $('#admRemember').checked); render(true); } catch (err) { $('#admErr').textContent = err.message; }
    });
    return;
  }
  if (!ADM.role) { adm('/whoami').then(me => { ADM.role = me.role; ADM.who = me.who; render(true); }).catch(err => { main().innerHTML = `<div class="card"><p>${esc(err.message)}</p></div>`; }); main().innerHTML = emptySheep('加载中…'); return; }
  const reviewer = ADM.role === 'reviewer';
  const tabs = reviewer ? [['queue', '待审'], ['leads', '线索'], ['manual', '补录']] : [['queue', '待审'], ['quality', '准确率'], ['leads', '线索'], ['manual', '补录'], ['health', '采集健康']];
  if (!tabs.some(([k]) => k === ADM.tab)) ADM.tab = 'queue';
  main().innerHTML = ribbon() + ph('后台', `${reviewer ? `审核员：${esc(ADM.who)}。` : ''}审核、编辑、补录。每条都附来源链接和官方原文，点链接核对后再决定。`, `<button class="btn sm" type="button" id="admOut">退出登录</button>`) + `
  <div class="seg" role="tablist" style="margin-bottom:14px">${tabs.map(([k, l]) => `<button type="button" data-admtab="${k}" aria-pressed="${ADM.tab === k}">${l}</button>`).join('')}</div>
  <div id="admBody">${emptySheep('加载中…')}</div>`;
  $('#admOut').addEventListener('click', () => { ADM.token = ''; ADM.role = ''; ADM.who = ''; admStore.clear(); render(true); });
  $$('[data-admtab]').forEach(b => b.addEventListener('click', () => { ADM.tab = b.dataset.admtab; if (route()[1]) location.hash = 'admin'; render(true); }));
  ({ queue: admQueue, quality: admQuality, leads: admLeads, manual: admManual, health: admHealth })[ADM.tab]().catch(err => { $('#admBody').innerHTML = `<div class="card"><p>${esc(err.message)}</p></div>`; if (!ADM.token) render(true); });
}
function officialReviewBlock(o) {
  const r=o.officialReview;
  if(!r && o.evidenceTier!=='media')return '';
  const at=value=>Number.isNaN(Date.parse(value))?'时间未知':new Date(value).toLocaleString('zh-CN');
  const labels={checking:'正在搜索与复核',matched:'AI 已匹配官方原文，待你审核',unresolved:'暂未找到充分官方证据',failed:'复核受阻，等待重试'};
  return `<details class="small" data-official-review><summary style="cursor:pointer;font-weight:600">🔎 ${r?labels[r.status]||'官方复核':'等待自动搜索官方出处'}</summary>
    <p>${esc(r?.reason || '工作流会自动搜索官网、官方文档和已登记的官方 X 账号，找到原文后补全待审字段。')}</p>
    ${r?`<p>已尝试 ${r.attempts} 次 · ${esc(at(r.checkedAt))}${r.nextAttemptAt?` · 下次重试 ${esc(at(r.nextAttemptAt))}`:r.status==='unresolved'||r.status==='failed'?(o.evidenceTier==='media'?' · 等待人工核对，可重新排队':' · 已保留现有官方证据，等待人工审核'):''}</p>`:''}
    ${r?.originUrl?`<p>原社区线索：<a href="${esc(r.originUrl)}" target="_blank" rel="noopener">${esc(r.originUrl)}</a></p>`:''}
    ${r?.queries?.length?`<p>搜索词：${r.queries.map(esc).join('；')}</p>`:''}
    ${(r?.candidates||[]).map(url=>`<p><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></p>`).join('')}
    ${r?.changedFields?.length?`<p>补全字段：${r.changedFields.map(f=>esc(FIELD_L[f]||f)).join('、')}</p>`:''}
    ${o.evidenceTier==='media'&&r?.status!=='checking'?'<button class="btn sm" type="button" data-official-retry>重新排入官方复核</button>':''}</details>`;
}
async function admQueue() {
  const box = $('#admBody');
  const q = await adm('/queue');
  if (!box?.isConnected || ADM.tab !== 'queue') return;
  // live：已上架的条目（字段待补），只显示修改，不显示通过和拒绝
  const card = (o, live = false) => `<article class="card" data-code="${o.code}" data-offer-id="${esc(o.id)}" data-live="${live ? 1 : ''}" data-type="${esc(o.type)}" data-sug="${o.suggestion?.verdict || 'none'}" style="display:flex;flex-direction:column;gap:10px">
    <div class="row" style="justify-content:space-between"><span class="row" style="gap:8px">${TYPES[Object.keys(TYPES).find(k => TYPES[k].l === o.type)] ? etag(Object.keys(TYPES).find(k => TYPES[k].l === o.type)) : esc(o.type)}<span class="chip">${esc(o.platform)}</span><span class="st ${o.evidenceTier === 'media' ? 'warn' : 'good'}"><b>${o.evidenceTier === 'media' ? '!' : '✓'}</b>${TIER_L[o.evidenceTier] || o.evidenceTier}</span>${o.pendingUpdate ? '<span class="st warn"><b>!</b>条款更新待审，旧版仍公开</span>' : ''}${o.status === 'ended' ? '<span class="st"><b>⌛</b>已结束，通过后计入历史</span>' : ''}</span><span class="small muted num">${esc(o.code)}</span></div>
    <div><div style="font-weight:600;font-size:16px">${esc(o.title)}</div><div class="${/未写明|不明确/.test(o.value) ? 'warn-note' : ''}" style="margin-top:4px">${esc(o.value)}</div><div class="small muted" style="margin-top:4px">${esc(o.end)} · 额度有效期：${esc(o.creditValidity || '未写')} · 门槛：${o.requirements.map(r => esc(reqLabel(r))).join('、')} · 对象：${AUD[o.audience] || o.audience}</div></div>
    ${sugBlock(o, live)}
    ${checksBlock(o)}
    <div class="rows">${EX_L.filter(([k]) => k !== 'claim' || o.excerpts[k]).map(([k, l]) => `<div class="orow" style="grid-template-columns:auto minmax(0,1fr);padding:6px 2px">${o.excerpts[k] ? `<span class="st good"><b>✓</b>${l}</span>` : `<span class="st warn"><b>!</b>${l}</span>`}<span class="t" style="font-weight:400;font-size:13.5px">${o.excerpts[k] ? '「' + esc(o.excerpts[k]) + '」' : '原文里没有找到'}</span></div>`).join('')}</div>
    <div class="small" style="word-break:break-all">来源：<a href="${esc(o.evidenceUrl)}" target="_blank" rel="noopener" style="text-decoration:underline">${esc(o.evidenceUrl)}</a></div>
    ${officialReviewBlock(o)}
    ${reviewActions(o, live)}
    ${o.reviewMemo ? `<details open class="small"><summary style="cursor:pointer;font-weight:600">🔍 核验记录（仅管理员可见）</summary><div style="white-space:pre-wrap;margin-top:6px;color:var(--ink-2)">${esc(o.reviewMemo)}</div></details>` : ''}
    <details><summary class="small" style="cursor:pointer">💬 牧场心得${o.adminNote ? '（已写）' : '（可选，公开显示）'}</summary><div class="row" style="margin-top:6px;align-items:flex-start"><textarea data-note rows="2" maxlength="500" style="flex:1;min-width:160px" placeholder="实际用下来怎么样？比如：免费模型速度慢、容易限流">${esc(o.adminNote || '')}</textarea><button class="btn sm" type="button" data-act="note">保存心得</button><span data-note-status role="status" class="small" style="align-self:center"></span></div></details>
    <div data-rejectbox hidden style="display:flex;flex-direction:column;gap:8px">
      <p class="small muted" style="margin:0">${live ? '下架后，本条目不再公开显示，审核记录保留。' : o.pendingUpdate ? '确认后仅拒绝本次更新提案，已上架内容保持原样、继续公开。' : '拒绝后，本条目不会上架。已结束但属实的活动请点“修改”补全开始和截止日期，再通过并收录历史。'}</p>
      <div class="chips">${RC.map(([k, l]) => `<button class="btn sm" type="button" data-rc="${k}" aria-pressed="false">${l}</button>`).join('')}</div>
      <div class="row review-actions"><input type="text" placeholder="补充理由（写清楚，模型以后学得更快）" data-reason style="flex:1;min-width:160px;padding:6px 10px"><button class="btn sm bad" type="button" data-act="reject">${live ? '确认下架' : o.pendingUpdate ? '确认拒绝更新，保留已上架内容' : '确认拒绝收录'}</button></div>
    </div>
    <template data-edittemplate><form data-editform hidden class="filters" style="margin:0">
      ${[['title', '标题', o.title], ['valueText', '额度', o.value], ['creditValidity', '额度有效期', o.creditValidity || '']].map(([k, l, v]) => `<label class="field">${l}<input type="text" name="${k}" value="${esc(v)}"></label>`).join('')}
      <label class="field">领取开始（可空）<input type="date" name="claimStart" value="${esc(o.claimStart || '')}"></label>
      <label class="field">领取截止（可空）<input type="date" name="claimEnd" value="${esc(o.claimEnd || '')}"></label>
      <label class="field">折合美元（下限，可空）<input type="number" step="any" min="0" name="usdEstimate" value="${o.usdEstimate ?? ''}"></label>
      <label class="field">价值上限（是范围时填，可空）<input type="number" step="any" min="0" name="usdMax" value="${o.usdMax ?? ''}"></label>
      <label class="field">官方时区（日期按哪里的时间算）<select name="sourceTz">${(() => { const tz = o.sourceTz || 'UTC', opts = [['Asia/Shanghai', '北京时间（中国厂商）'], ['America/Los_Angeles', '美国西部时间（多数美国厂商）'], ['America/New_York', '美国东部时间'], ['Europe/London', '英国时间'], ['Europe/Paris', '欧洲中部时间'], ['Asia/Tokyo', '日本时间'], ['Asia/Singapore', '新加坡时间'], ['UTC', '世界标准时间 UTC（官方没写时区）']]; return (opts.some(([k]) => k === tz) ? opts : [...opts, [tz, tz]]).map(([k, l]) => `<option value="${k}" ${k === tz ? 'selected' : ''}>${l}</option>`).join(''); })()}</select></label>
      <label class="field">官方发布时间（可空，按你电脑的本地时间填；额度重置要精确到分钟）<input type="datetime-local" name="publishedAt" value="${dateTimeInput(o.publishedAt)}">${/^\d{4}-\d{2}-\d{2}$/.test(o.publishedAt || '') && dateTimeInput(o.publishedAt) ? '<span class="small muted">仅有日期，00:00 是填表占位；未改动则保留日期精度。</span>' : ''}${o.publishedAt && !dateTimeInput(o.publishedAt) ? '<span class="small" role="alert" style="color:var(--critical-ink)">原发布时间无效，请核对后补填；保存时空值会清除原错误日期。</span>' : ''}</label>
      ${(() => { const rq = o.requirements || [], val = k => (rq.find(r => r.startsWith(k + ':')) || '').slice(k.length + 1);
        return `<div class="field" style="grid-column:1/-1">门槛（领之前必须满足的条件，可多选；手机号、信用卡、网络只指海外）<div class="chips">${['none', 'realname', 'phone', 'card', 'net', 'biz', 'student', 'invite', 'targeted'].map(k => `<label class="chip"><input type="checkbox" name="req" value="${k}" ${rq.includes(k) ? 'checked' : ''}> ${REQ[k]}${k === 'student' ? '（含教师）' : ''}</label>`).join('')}</div>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:6px"><label class="chip"><input type="checkbox" name="req" value="member" ${val('member') ? 'checked' : ''}> 需会员</label><input type="text" name="reqMember" value="${esc(val('member'))}" placeholder="哪个会员，如 Pro（$20/月）" style="flex:1;min-width:160px">
        <label class="chip"><input type="checkbox" name="req" value="pay" ${val('pay') ? 'checked' : ''}> 需充值</label><input type="text" name="reqPay" value="${esc(val('pay'))}" placeholder="充多少，如 首充 10 元" style="flex:1;min-width:160px"></div></div>`; })()}
      <div class="field" style="grid-column:1/-1">模态<div class="chips">${Object.entries(MODAL).map(([k, l]) => `<label class="chip"><input type="checkbox" name="modalities" value="${k}" ${(o.modalities || []).includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
      <div class="field" style="grid-column:1/-1">标签<div class="chips">${Object.entries(TAG_L).map(([k, l]) => `<label class="chip"><input type="checkbox" name="tags" value="${k}" ${(o.tags || []).includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
      <label class="field" style="grid-column:1/-1">领取步骤（一行一步）<textarea name="steps" rows="3">${esc((o.steps || []).join('\n'))}</textarea></label>
      <label class="field" style="grid-column:1/-1">免费模型（逗号分隔，按官方写法；用于“按模型找”）<input type="text" name="models" value="${esc((o.models || []).join('，'))}" placeholder="如：Gemini 3.8 Flash，GLM-4.7-Flash"></label>
      <label class="field" style="grid-column:1/-1">官方证据链接<input type="url" name="evidenceUrl" value="${esc(o.evidenceUrl)}"></label>
      <label class="field">证据级别<select name="evidenceTier">${Object.entries(TIER_L).map(([key, name]) => `<option value="${key}" ${o.evidenceTier === key ? 'selected' : ''}>${name}</option>`).join('')}</select></label>
      ${EX_L.map(([key, name]) => `<label class="field" style="grid-column:1/-1">${name}原文摘录<textarea name="excerpt_${key}" rows="3">${esc(o.excerpts[key] || '')}</textarea></label>`).join('')}
      <label class="field">类型<select name="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${v.l === o.type ? 'selected' : ''}>${v.l}</option>`).join('')}</select></label>
      <label class="field">截止方式<select name="endKind">${[['date', '有截止日期'], ['unknown', '截止未知'], ['standing', '常驻 / 申请制']].map(([k, l]) => `<option value="${k}" ${o.endKind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field">领取方式<select name="claimMethod">${Object.entries(CLAIM).map(([k, l]) => `<option value="${k}" ${o.claimMethod === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field">平台<select name="platformId">${PLATFORMS.map(p => `<option value="${esc(p.id)}" ${o.platformId === p.id || (!o.platformId && o.platform === p.name) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
      <label class="field">适用对象<select name="audience">${Object.entries(AUD).map(([k, l]) => `<option value="${k}" ${o.audience === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field" style="grid-column:1/-1">为什么这样改（可选，但强烈建议写）<input type="text" name="__reason" placeholder="例如：要先付费升级才送，属于充值赠送"></label>
      <div class="row review-actions" style="grid-column:1/-1;align-items:center"><button class="btn sm pri" type="submit">${live ? '保存' : o.pendingUpdate ? '保存并接受更新' : '保存并通过'}</button><span data-formmsg role="alert" class="small" style="font-weight:600"></span></div>
    </form></template>
  </article>`;
  const sugCount = k => q.pending.filter(o => (o.suggestion?.verdict || 'none') === k).length;
  const sugTabs = [['all', '全部', q.pending.length], ['approve', '建议通过', sugCount('approve')], ['history', '建议作为历史', sugCount('history')], ['reject', '建议拒绝', sugCount('reject')], ['judge', '需要你判断', sugCount('judge')], ['none', '未标注', sugCount('none')]].filter(([k, , n]) => k === 'all' || n);
  box.innerHTML = `<p class="small muted">待审 ${q.pending.length} 条 · 新线索 ${q.newLeads} 条</p>
    ${q.priorityLeads?.length ? `<section><h3>重要线索 · 尚未进入待审</h3><p class="small muted">这些内容尚未批准。每小时优先研判；抽取受阻的请到“线索”处理。</p>${q.priorityLeads.map(l=>`<div class="card" style="margin-bottom:8px"><b>#${l.id} ${esc(l.title || '')}</b><p class="small">${l.status==='reviewing'?'需人工核验':'等待优先研判'}${l.note?` · ${esc(l.note)}`:''}</p><a href="${esc(l.url)}" target="_blank" rel="noopener">查看原始线索 ↗</a></div>`).join('')}</section>`:''}
    ${sugTabs.length > 2 ? `<div class="seg" role="tablist" style="margin-bottom:12px;flex-wrap:wrap">${sugTabs.map(([k, l, n]) => `<button type="button" data-sugtab="${k}" aria-pressed="${(ADM.sug || 'all') === k}">${l} ${n}</button>`).join('')}</div>` : ''}
    ${q.pendingPlatforms.length ? `<div class="card" style="margin-bottom:12px"><h3>新平台待准入</h3>${q.pendingPlatforms.map(p => `<div class="row" style="justify-content:space-between;padding:6px 0"><span>${esc(p.name)}（${esc(p.id)}）${p.site ? ` · <a href="${esc(p.site)}" target="_blank" rel="noopener">官网</a>` : ''}</span><span class="row"><button class="btn sm good" data-plat="${p.id}:approve">准入</button><button class="btn sm bad" data-plat="${p.id}:reject">拒绝</button></span></div>`).join('')}</div>` : ''}
    ${q.suggestAutoPublish.map(x => `<div class="card" style="margin-bottom:12px"><span class="st warn"><b>!</b>建议放开</span> 信源 ${esc(x.id)} 已连续原样通过 ${x.cleanStreak} 条 <button class="btn sm" data-autopub="${x.id}">放开自动上架</button></div>`).join('')}
    ${q.needsVerification?.length ? `<section>${secH('证据待核验', '旧版已退出当前可领；核对官方页面后才能确认结束或恢复')}${q.needsVerification.map(o => `<form class="card" data-withdraw="${esc(o.code)}" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px"><b>${esc(o.title)}</b><a href="${esc(o.evidenceUrl)}" target="_blank" rel="noopener">打开当前证据 ↗</a><label class="field">官方撤回链接<input type="url" name="evidenceUrl" value="${esc(o.evidenceUrl)}" required></label><label class="field">官方撤回说明<input name="reason" required minlength="4" placeholder="请引用官方明确撤回或停止发放的文字"></label><div class="row"><button class="btn sm good" type="button" data-retest="${esc(o.code)}">我核对过，仍有效</button><button class="btn sm bad" type="submit">核实后结束</button></div></form>`).join('')}</section>` : ''}
    <div class="grid g2">${q.pending.map(o => card(o)).join('') || emptySheep('待审队列是空的。')}</div>
    ${q.incomplete?.length ? `<section><details data-incomplete><summary style="cursor:pointer">${secH('已上架、字段待补', `${q.incomplete.length} 条：补齐后日历、时间线、按模型找、价值统计等栏目才完整`)}</summary><div class="grid g2" data-incomplete-body></div></details></section>` : ''}`;
  const applySug = () => $$('[data-sug]', box).forEach(el => { if (el.closest('details')) return; el.style.display = !ADM.sug || ADM.sug === 'all' || el.dataset.sug === ADM.sug ? '' : 'none'; });
  $$('[data-sugtab]', box).forEach(b => b.addEventListener('click', () => { ADM.sug = b.dataset.sugtab; $$('[data-sugtab]', box).forEach(x => x.setAttribute('aria-pressed', x === b)); applySug(); }));
  applySug();
  const done = (el, msg) => { el.style.opacity = .45; el.querySelectorAll('button,input,select').forEach(x => { x.disabled = true; }); toast(msg); };
  const bindCards = scope => $$('[data-code]', scope).forEach(el => {
    const code = el.dataset.code, live = el.dataset.live === '1', o = (live ? q.incomplete || [] : q.pending).find(x => x.code === code);
    el.querySelector('[data-official-retry]')?.addEventListener('click',async e=>{
      const button=e.currentTarget;button.disabled=true;
      try { await adm(`/offers/${code}/official-retry`,{}); button.textContent='已排队，定时任务会自动复核'; }
      catch(error){button.disabled=false;toast(error.message);}
    });
    // 失败原因显示在按钮旁边，不只在顶部闪一下
    const actMsg = (msg, bad = true) => { let m = el.querySelector('[data-actmsg]'); if (!m) { m = document.createElement('p'); m.dataset.actmsg = ''; m.className = 'small'; m.style.cssText = 'margin:0;font-weight:600'; el.querySelector('[data-act]').closest('.row').after(m); } m.style.color = bad ? 'var(--critical-ink)' : ''; m.textContent = msg; };
    el.querySelector('[data-act="approve"]')?.addEventListener('click', async () => { try { const r = await adm(`/offers/${code}/approve`, {expectedReviewVersion:o?.reviewVersion}); done(el, `${o?.pendingUpdate ? '已接受更新' : '已通过'}：${r.title}`); } catch (e) { actMsg((o?.pendingUpdate ? '没有接受更新：' : '没有通过：') + e.message); } });
    // 社区传闻 → 管理员实测 → 通过：证据级别改为“管理员实测”，链接和摘录保持原样
    el.querySelector('[data-act="tested"]')?.addEventListener('click', async () => {
      try {
        await adm(`/offers/${code}/edit`, { fields: { evidence: { url: o.evidenceUrl, tier: 'tested', capturedAt: new Date().toISOString(), excerpts: o.excerpts } }, approve: true, expectedReviewVersion:o?.reviewVersion, reason: '社区转述，管理员亲自领到过', reasonCode: 'wrong_field' });
        done(el, `已按管理员实测${o.pendingUpdate ? '接受更新' : '通过'}：${o.title}`);
      } catch (e) { actMsg((o.pendingUpdate ? '没有接受更新：' : '没有通过：') + e.message); }
    });
    const noteInput = el.querySelector('[data-note]'), noteButton = el.querySelector('[data-act="note"]'), noteStatus = el.querySelector('[data-note-status]');
    noteInput.addEventListener('input', () => { if (noteStatus.textContent !== '未保存') noteStatus.textContent = '未保存'; });
    noteButton.addEventListener('click', async () => {
      if (noteButton.disabled) return;
      const note = noteInput.value;
      noteButton.disabled = true; noteStatus.textContent = '保存中…';
      try {
        const saved = await adm(`/offers/${code}/note`, { note });
        if (o && !o.pendingUpdate && saved.reviewVersion) o.reviewVersion = saved.reviewVersion;
        noteStatus.textContent = noteInput.value === note ? '已保存' : '当前修改未保存';
      } catch (e) { noteStatus.textContent = '没有保存：' + e.message; }
      finally { noteButton.disabled = false; }
    });
    const rb = el.querySelector('[data-rejectbox]');
    let rc = null;
    el.querySelector('[data-act="rejectopen"]')?.addEventListener('click', () => {
      rb.hidden = !rb.hidden;
      // 有“建议拒绝”时自动填好理由代码和理由，确认即可
      const g = o?.suggestion;
      if (!rb.hidden && g?.verdict === 'reject' && !rc && !el.querySelector('[data-reason]').value) {
        rc = g.code || 'other'; el.querySelector('[data-reason]').value = g.reason || '';
        rb.querySelectorAll('[data-rc]').forEach(x => x.setAttribute('aria-pressed', x.dataset.rc === rc));
      }
    });
    rb.querySelectorAll('[data-rc]').forEach(b => b.addEventListener('click', () => { rc = rc === b.dataset.rc ? null : b.dataset.rc; rb.querySelectorAll('[data-rc]').forEach(x => x.setAttribute('aria-pressed', x.dataset.rc === rc)); }));
    el.querySelector('[data-act="reject"]')?.addEventListener('click', async () => {
      const reason = el.querySelector('[data-reason]').value.trim();
      if (!rc && !reason) { toast('选一个理由或写一句说明，模型才能从这次拒绝里学到东西'); return; }
      try {
        // 已上架的卡片：下架（对已上架条目调用 reject 只会丢弃更新提案，不会撤下）
        if (live) { if (!reason) { toast('写一句下架理由'); return; } const r = await adm(`/offers/${code}/unpublish`, { reason, reasonCode: rc || 'other' }); done(el, `已下架：${r.title}`); return; }
        const r = await adm(`/offers/${code}/reject`, { expectedReviewVersion:o?.reviewVersion, reason: reason || undefined, reasonCode: rc || 'other' }); done(el, o?.pendingUpdate ? `已拒绝更新，保留已上架内容：${r.title}` : `已拒绝收录：${r.title}`);
      } catch (e) { toast(e.message); }
    });
    el.querySelector('[data-act="edit"]').addEventListener('click', () => {
      let f = el.querySelector('[data-editform]');
      if (!f) {
        const template = el.querySelector('[data-edittemplate]');
        template.replaceWith(template.content.cloneNode(true));
        f = el.querySelector('[data-editform]');
        f.addEventListener('submit', submitEdit);
      }
      f.hidden = !f.hidden;
    });
    const submitEdit = async e => {
      e.preventDefault(); const form = e.currentTarget; const fd = Object.fromEntries(new FormData(form));
      const msg = form.querySelector('[data-formmsg]'), btn = form.querySelector('button[type="submit"]');
      msg.style.color = ''; msg.textContent = '保存中…'; btn.disabled = true;
      try {
      const reason = String(fd.__reason || '').trim(); delete fd.__reason;
      const newEvidence = { url: String(fd.evidenceUrl).trim(), tier: String(fd.evidenceTier), capturedAt: new Date().toISOString(), excerpts: {} };
      for (const [key] of EX_L) { newEvidence.excerpts[key] = String(fd[`excerpt_${key}`] || '').trim(); delete fd[`excerpt_${key}`]; }
      delete fd.evidenceUrl; delete fd.evidenceTier;
      const num = v => (String(v ?? '').trim() === '' ? null : Number(v));
      const checked = name => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(x => x.value);
      const pub = String(fd.publishedAt || '').trim();
      if (pub && Number.isNaN(Date.parse(pub))) throw new Error('官方发布时间格式不对');
      if (!checked('modalities').length) throw new Error('至少选一个模态');
      const req = checked('req').map(k => k === 'member' ? `member:${String(fd.reqMember || '').trim() || '会员'}` : k === 'pay' ? `pay:${String(fd.reqPay || '').trim() || '充值'}` : k);
      if (!req.length) throw new Error('门槛至少勾一项；没有任何条件就勾“零门槛”');
      if (req.includes('none') && req.length > 1) throw new Error('勾了“零门槛”就不能再勾其他门槛');
      delete fd.req; delete fd.reqMember; delete fd.reqPay;
      const fields = { ...fd, requirements: req, models: [...new Set(String(fd.models || '').split(/[,，、;；]/).map(x => x.trim()).filter(Boolean))],
        usdEstimate: num(fd.usdEstimate), usdMax: num(fd.usdMax), modalities: checked('modalities'), tags: checked('tags'), publishedAt: pub ? (pub === dateTimeInput(o.publishedAt) ? o.publishedAt : new Date(pub).toISOString()) : null,
        steps: String(fd.steps || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 10), sourceTz: String(fd.sourceTz || 'UTC').trim() };
      if (newEvidence.url !== o.evidenceUrl || newEvidence.tier !== o.evidenceTier || EX_L.some(([key]) => newEvidence.excerpts[key] !== (o.excerpts[key] || ''))) fields.evidence = newEvidence;
      ['claimStart', 'claimEnd', 'creditValidity'].forEach(k => { if (!fields[k]) fields[k] = null; });
      const r = await adm(`/offers/${code}/edit`, { fields, approve: true, expectedReviewVersion:o?.reviewVersion, reason: reason || undefined, reasonCode: fields.type !== undefined && Object.keys(TYPES).find(k => TYPES[k].l === el.dataset.type) !== fields.type ? 'wrong_type' : 'wrong_field' });
      const result = !live && o.pendingUpdate ? '已接受更新' : live ? '已保存' : '已通过';
      done(el, r.changed.length ? `已修改 ${r.changed.map(f => FIELD_L[f] || f).join('、')}；${result}` : `没有改动，${result}`);
      msg.textContent = '';
      } catch (err) { btn.disabled = false; msg.style.color = 'var(--critical-ink)'; msg.textContent = '没有保存：' + err.message; console.error('[admin] 保存并通过失败', err); }
    };
  });
  bindCards(box);
  const incomplete = box.querySelector('[data-incomplete]');
  const loadIncomplete = () => {
    if (!incomplete.open || incomplete.dataset.loaded) return;
    const target = incomplete.querySelector('[data-incomplete-body]');
    target.innerHTML = q.incomplete.map(o => card(o, true)).join('');
    incomplete.dataset.loaded = '1';
    bindCards(target);
  };
  incomplete?.addEventListener('toggle', loadIncomplete);
  const focusId = route()[0] === 'admin' ? route()[1] : null;
  if (focusId) {
    if (!q.pending.some(o => o.id === focusId) && q.incomplete?.some(o => o.id === focusId) && incomplete) { incomplete.open = true; loadIncomplete(); }
    const target = $$('[data-offer-id]', box).find(el => el.dataset.offerId === focusId);
    if (target) {
      target.style.display = ''; target.style.outline = '2px solid var(--tag)'; target.tabIndex = -1;
      target.dataset.focused = '1'; target.focus({ preventScroll: true }); target.scrollIntoView?.({ block: 'center' });
    } else {
      const message = document.createElement('p'); message.className = 'small'; message.setAttribute('role', 'status');
      message.textContent = '这条已不在待审队列，可能已经处理。'; box.prepend(message);
    }
  }
  if (ADM.role === 'reviewer') $$('[data-plat],[data-autopub],[data-withdraw]', box).forEach(x => x.remove());
  $$('[data-plat]', box).forEach(b => b.addEventListener('click', async () => { const [id, act] = b.dataset.plat.split(':'); await adm(`/platforms/${id}/${act}`, {}); toast('已处理'); admQueue(); }));
  $$('[data-autopub]', box).forEach(b => b.addEventListener('click', async () => { await adm(`/sources/${b.dataset.autopub}/auto-publish`, { on: true }); toast('已放开自动上架'); admQueue(); }));
  $$('[data-retest]', box).forEach(b => b.addEventListener('click', async () => { try { await adm(`/offers/${b.dataset.retest}/retested`, {}); toast('已记录：管理员核对仍有效'); admQueue(); } catch (err) { toast(err.message); } }));
  $$('[data-withdraw]', box).forEach(form => form.addEventListener('submit', async e => { e.preventDefault(); const values = Object.fromEntries(new FormData(form)); try { await adm(`/offers/${form.dataset.withdraw}/withdraw`, values); toast('已记录官方撤回并结束活动'); admQueue(); } catch (err) { toast(err.message); } }));
}
async function admQuality() {
  const q = await adm('/quality?days=30');
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
  const RCL = Object.fromEntries(RC.concat([['wrong_field', '字段错'], ['other', '其他']]));
  const fields = Object.entries(q.fields).sort((a, b) => b[1] - a[1]);
  const reasons = Object.entries(q.reasons).sort((a, b) => b[1] - a[1]);
  const srcs = Object.entries(q.bySource).sort((a, b) => b[1].total - a[1].total);
  $('#admBody').innerHTML = `<p class="small muted">最近 30 天你的审核（不含系统自动去重）。原样通过率越高，说明抽取越准；某个字段修改得多，就是模型最该改进的地方。你的修改和拒绝理由会在下一轮采集时附给模型参考，每周六再归纳成规则等你批准。</p>
    <section class="kpis" style="margin-top:0">
      <div class="kpi"><span class="k-l">已审核</span><span class="k-v">${q.reviewed}<small>条</small></span></div>
      <div class="kpi"><span class="k-l">原样通过</span><span class="k-v">${pct(q.approvedClean, q.reviewed)}</span></div>
      <div class="kpi"><span class="k-l">修改后通过</span><span class="k-v">${q.edits}<small>条</small></span></div>
      <div class="kpi"><span class="k-l">拒绝</span><span class="k-v">${q.rejects}<small>条</small></span></div></section>
    <div class="grid g2">
      <div class="card"><h3>最常被改的字段</h3>${fields.length ? `<div class="rows">${fields.map(([f, n]) => `<div class="row small" style="gap:10px;padding:4px 0"><span style="width:72px">${FIELD_L[f] || f}</span><span class="meter" style="flex:1"><i style="width:${Math.round(n / fields[0][1] * 100)}%"></i></span><span class="num">${n}</span></div>`).join('')}</div>` : '<p class="small muted">还没有修改记录。</p>'}</div>
      <div class="card"><h3>拒绝理由</h3>${reasons.length ? `<div class="rows">${reasons.map(([k, n]) => `<div class="row small" style="gap:10px;padding:4px 0"><span style="width:92px">${RCL[k] || k}</span><span class="meter" style="flex:1"><i style="width:${Math.round(n / reasons[0][1] * 100)}%;background:var(--critical)"></i></span><span class="num">${n}</span></div>`).join('')}</div>` : '<p class="small muted">还没有拒绝记录。</p>'}</div>
    </div>
    <section>${secH('各信源的原样通过率', '连续原样通过 5 条的信源会被提议放开自动上架')}<div class="card tbl" style="padding:4px 8px"><table><thead><tr><th>信源</th><th>审核数</th><th>原样通过率</th></tr></thead><tbody>${srcs.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${v.total}</td><td class="n">${pct(v.clean, v.total)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">暂无</td></tr>'}</tbody></table></div></section>`;
}
async function admLeads() {
  const box = $('#admBody');
  box.innerHTML = `<p class="small muted">每小时优先研判重置、赠额和限时福利；每轮保留名额消化旧线索。“需人工处理”保留了未能匹配平台或暂时取不到原文的线索。核实平台并准入后，可重新研判。</p>
    <form id="admPlatform" class="card" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px"><input name="name" placeholder="平台名称" required><select name="type"><option value="lab">模型厂商</option><option value="cloud">云厂商</option><option value="infra">推理平台</option><option value="tool">AI 工具</option><option value="new">新玩家</option></select><input name="site" type="url" placeholder="经核验的官网 https://" required><button class="btn sm" type="submit">送交平台准入</button></form>
    <div class="row" style="gap:12px;margin-bottom:12px"><label class="field">线索状态<select data-lead-status>${[['all','全部未处理'],['new','新线索'],['reviewing','需人工处理']].map(([value,label])=>`<option value="${value}" ${value === (ADM.leadStatus || 'all') ? 'selected' : ''}>${label}</option>`).join('')}</select></label><span data-lead-count class="small muted"></span></div>
    <div class="rows" data-lead-rows></div><div class="row" style="gap:10px;margin-top:12px"><button class="btn sm" type="button" data-lead-more hidden>加载更早的线索</button><span data-lead-message role="status" class="small"></span></div>`;
  $('#admPlatform').addEventListener('submit', async e => { e.preventDefault(); const form = e.currentTarget; const fields = Object.fromEntries(new FormData(form)); try { const host = new URL(fields.site).hostname.replace(/^www\./, '').split('.'); fields.id = (host.length > 2 && !['com', 'cn', 'ai', 'io', 'dev', 'co'].includes(host.at(-2)) ? host.at(-2) : host[0]).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+/, '') || 'new-platform'; const r = await adm('/platforms', fields); toast(`平台 ${r.id} 已进入待准入，先在待审页核实后准入`); form.reset(); } catch (err) { toast(err.message); } });
  const rows = box.querySelector('[data-lead-rows]'), more = box.querySelector('[data-lead-more]'), message = box.querySelector('[data-lead-message]'), select = box.querySelector('[data-lead-status]');
  let nextCursor = null, total = 0, request = 0, retryReset = false;
  const count = () => { box.querySelector('[data-lead-count]').textContent = `已显示 ${rows.querySelectorAll('[data-lead]').length} / ${total} 条`; };
  const load = async (reset = false) => {
    const current = ++request, status = select.value;
    more.disabled = true; message.textContent = '加载中…';
    try {
      const result = await adm(`/leads?limit=60&status=${status}${!reset && nextCursor != null ? `&before=${nextCursor}` : ''}`);
      if (current !== request || !box.isConnected) return;
      if (reset) rows.innerHTML = '';
      const existing = new Set($$('[data-lead]', rows).map(row => Number(row.dataset.lead)));
      for (const l of result.leads.filter(l => !existing.has(l.id))) {
        const row = document.createElement('div'); row.className = 'orow'; row.dataset.lead = l.id; row.style.gridTemplateColumns = 'auto minmax(0,1fr) auto';
        row.innerHTML = `<span class="when">#${l.id}</span><span class="t">${esc(l.title || '(无标题)')}<small><span class="chip">${esc(l.origin)}</span> <span class="chip">${l.status === 'reviewing' ? '需人工处理' : '新线索'}</span> <a href="${esc(l.url)}" target="_blank" rel="noopener" style="text-decoration:underline;word-break:break-all">${esc(l.url)}</a>${l.note ? `<br>${esc(l.note)}` : ''}</small></span><span class="row">${l.status === 'reviewing' ? '<button class="btn sm" type="button" data-retry>重新研判</button>' : ''}<button class="btn sm" type="button" data-dismiss>忽略</button></span>`;
        row.querySelectorAll('[data-dismiss],[data-retry]').forEach(button => button.addEventListener('click', async () => {
          if (button.disabled) return;
          button.disabled = true;
          try {
            const retry = button.hasAttribute('data-retry');
            await adm(`/leads/${l.id}/${retry ? 'retry' : 'dismiss'}`, {});
            if (retry) toast('已放回下一轮研判队列');
            if (retry && select.value === 'all') { row.querySelector('.chip + .chip').textContent = '新线索'; button.remove(); }
            else { row.remove(); total = Math.max(0, total - 1); }
            count();
          } catch (err) { message.textContent = err.message; button.disabled = false; }
        }));
        rows.append(row);
      }
      nextCursor = result.nextCursor ?? null; total = result.total ?? rows.querySelectorAll('[data-lead]').length;
      retryReset = false; more.textContent = '加载更早的线索'; more.hidden = nextCursor == null; count(); message.textContent = total ? '' : '没有待处理的线索。';
    } catch (err) { if (current === request) { retryReset = reset; more.hidden = false; more.textContent = '重试加载'; message.textContent = `没有加载：${err.message}`; } }
    finally { if (current === request) more.disabled = false; }
  };
  select.addEventListener('change', () => { ADM.leadStatus = select.value; load(true); });
  more.addEventListener('click', () => load(retryReset));
  await load(true);
}
async function admManual() {
  $('#admBody').innerHTML = `<form id="admAdd" class="card" style="display:flex;flex-direction:column;gap:10px;max-width:640px"><p class="sub" style="margin:0">粘贴官网公告、公众号文章、推文或新闻链接。下一轮采集（最多 6 小时，也可以在 GitHub 手动触发）会抓取并研判，结果进待审。</p>
    <label class="field">链接<input type="url" name="url" required placeholder="https://"></label><label class="field">备注（可选）<input type="text" name="note" placeholder="比如：DeepSeek 桌面版送 6 元"></label><button class="btn pri" type="submit">补录</button></form>
    <form id="admSrc" class="card" style="display:flex;flex-direction:column;gap:10px;max-width:640px;margin-top:12px"><p class="sub" style="margin:0">补信源：给已登记的平台加一个官方页面（福利页、价格页、帮助文档、博客或 RSS），之后每轮采集都会抓它。只收发放方自己的官方页面。</p>
    <label class="field">平台<select name="platformId" required>${PLATFORMS.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh')).map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label><label class="field">官方链接<input type="url" name="url" required placeholder="https://"></label>
    <label class="field">类型<select name="kind"><option value="web_list">网页</option><option value="rss">RSS</option><option value="json">官方接口</option></select></label>
    <label class="field">级别<select name="tier"><option value="site">官网页面</option><option value="docs">官方文档</option><option value="official">官方账号（博客、公众号、X）</option><option value="staff">员工账号</option></select></label><button class="btn pri" type="submit">加入信源</button></form>`;
  $('#admSrc').addEventListener('submit', async e => { e.preventDefault(); const form = e.currentTarget; try { const r = await adm('/sources', Object.fromEntries(new FormData(form))); toast(`已加入信源 ${r.id}，下一轮采集开始抓取`); form.reset(); } catch (err) { toast(err.message); } });
  $('#admAdd').addEventListener('submit', async e => { e.preventDefault(); const form = e.currentTarget; const fd = Object.fromEntries(new FormData(form)); try { const r = await adm('/manual', { url: fd.url, note: fd.note || undefined }); toast(`已补录（线索 #${r.leadId}）`); form.reset(); } catch (err) { toast(err.message); } });
}
async function admHealth() {
  const h = await adm('/health');
  $('#admBody').innerHTML = `<section class="kpis" style="margin-top:0">
      <div class="kpi"><span class="k-l">最近成功采集</span><span class="k-v">${h.hoursSince == null ? '—' : h.hoursSince.toFixed(1)}<small>小时前</small></span></div>
      <div class="kpi"><span class="k-l">连续失败的信源</span><span class="k-v">${h.failingSources.length}<small>个</small></span></div>
      <div class="kpi"><span class="k-l">今日模型 token</span><span class="k-v">${Math.round(h.tokensToday / 1000)}<small>k${h.tokenCap ? ` / ${Math.round(h.tokenCap / 1000)}k` : ' · 调试期不设总上限'}</small></span></div>
      <div class="kpi"><span class="k-l">今日数据库读取（UTC）</span><span class="k-v">${h.d1Usage?.rowsRead != null ? `${(h.d1Usage.rowsRead / 10000).toFixed(0)}<small>万 / ${h.d1Usage.limits.rowsRead / 10000} 万行</small>` : '—<small>' + (h.d1Usage?.configured ? '读取失败' : '未配置') + '</small>'}</span></div>
      <div class="kpi"><span class="k-l">本月付费兜底</span><span class="k-v">¥${h.costMonthCny.toFixed(2)}<small>/ ¥10</small></span></div></section>
    ${h.officialReviewCounts?`<div class="card" style="margin-bottom:12px"><b>官方出处复核</b><p class="small">待处理 ${h.officialReviewCounts.waiting??0} · 进行中 ${h.officialReviewCounts.checking} · 退避重试 ${h.officialReviewCounts.retrying??0} · 已匹配 ${h.officialReviewCounts.matched} · 重试耗尽待人工 ${h.officialReviewCounts.exhausted??0} · 占位超时 ${h.officialReviewCounts.stalled??0}</p><p class="small muted">条目内可查看原线索、搜索出处、失败原因和下次重试时间。自动补全后仍需审核。</p></div>`:''}
    ${h.leadWorkflow?`<div class="card" style="margin-bottom:12px"><b>线索到审核</b><p class="small">待研判 ${h.leadWorkflow.new} · 人工处理 ${h.leadWorkflow.reviewing} · 重要线索 ${h.leadWorkflow.important}</p><p class="small muted">人工处理中的线索不会自动批准；到“线索”查看具体原因，补齐平台或材料后可重试。</p></div>`:''}
    ${h.coverageDegraded?`<div class="card" style="margin-bottom:12px"><span class="st warn"><b>!</b>最近全量采集覆盖不完整</span><p class="small">核验失败 ${h.lastCollectAttempt?.stats?.verificationFailed??'未记录'} 次 · 核验延期 ${h.lastCollectAttempt?.stats?.verificationDeferred??'未记录'} 条。抓到网页不代表其中每项福利仍有效。</p></div>`:''}
    ${h.d1Usage?.rowsRead != null && h.d1Usage.rowsRead > h.d1Usage.limits.rowsRead * 0.7 ? `<div class="card" style="margin-bottom:12px"><span class="st warn"><b>!</b>数据库读取接近免费额度</span><p class="small" style="margin:6px 0 0">今天已读 ${Math.round(h.d1Usage.rowsRead / 10000)} 万行，免费版每天上限 500 万行，超了全站会无法加载，到 UTC 0 点（东京 9 点）才恢复。先停掉手动采集和批量操作，或在 Cloudflare 升级 Workers 付费版。</p></div>` : ''}
    ${h.dispatchFailures?.length ? `<div class="card" style="margin-bottom:12px"><span class="st warn"><b>!</b>定时采集没能触发</span><p class="small" style="margin:6px 0 0">最近 48 小时有 ${h.dispatchFailures.length} 次触发 GitHub 采集失败（已自动重试一次）：</p><ul class="small">${h.dispatchFailures.map(f => `<li>${esc(f.at.slice(0, 16).replace('T', ' '))} UTC：${esc(f.error || '')}</li>`).join('')}</ul><p class="small muted" style="margin:0">常见原因：GitHub 令牌过期或被重新生成。换上新令牌后在这里会恢复正常。</p></div>` : ''}
    ${h.uncertainDeliveries?.length ? `<section>${secH('投递结果需核对', '先到 Telegram 核对是否收到，再选择结果')}${h.uncertainDeliveries.map(x => `<div class="card" data-delivery="${esc(x.id)}" style="margin-bottom:8px"><b>${esc(x.kind)} · ${esc(x.status)}</b><p class="small muted">${esc(x.id)} · ${esc(x.createdAt)} ${x.error ? `· ${esc(x.error)}` : ''}</p><input type="text" placeholder="填写人工核对依据（至少 4 字）" data-reason style="width:100%;margin-bottom:8px"><div class="row"><button class="btn sm good" data-outcome="delivered">确认已收到</button><button class="btn sm bad" data-outcome="not_delivered">确认没收到，可重试</button></div></div>`).join('')}</section>` : ''}
    <div class="card tbl" style="padding:4px 8px"><table><thead><tr><th>信源</th><th>类型</th><th>最近成功</th><th>状态</th><th>放权</th></tr></thead><tbody>${h.sources.filter(x => x.enabled).map(x => { const stale = !x.lastOkAt || Date.now() - Date.parse(x.lastOkAt) > 12 * 3600_000; return `<tr><td title="${esc(x.url)}">${esc(x.id)}</td><td class="small muted">${x.kind}</td><td class="small">${x.lastOkAt ? esc(x.lastOkAt.slice(5, 16).replace('T', ' ')) : '—'}</td><td>${x.failStreak >= 3 ? stBadge('critical', '✕', `连续失败 ${x.failStreak} 次`) : stale ? stBadge('warn', '!', '超过 12 小时未成功') : x.failStreak ? stBadge('warn', '!', '偶发失败') : stBadge('good', '✓', '正常')}</td><td class="small">${x.autoPublish ? '自动上架' : `人工（${x.cleanStreak}/5）`}</td></tr>`; }).join('')}</tbody></table></div>`;
  $$('[data-delivery] [data-outcome]').forEach(button => button.addEventListener('click', async () => { const box = button.closest('[data-delivery]'); const reason = box.querySelector('[data-reason]').value.trim(); if (reason.length < 4) { toast('请先写明人工核对依据'); return; } try { await adm(`/notify/${box.dataset.delivery}/resolve`, { outcome: button.dataset.outcome, reason }); toast('人工核对结果已记录'); admHealth(); } catch (e) { toast(e.message); } }));
}
function ecg(h) {
  let s = '';
  h.forEach((ok, i) => {
    const x = 2 + i * 5.2;
    s += ok ? `<path d="M${x.toFixed(1)},14 h1 l1,-8 l1.2,13 l1,-5 h1" style="fill:none;stroke:var(--good);stroke-width:1.3;stroke-linejoin:round"/>` : `<path d="M${x.toFixed(1)},14 h5.2" style="stroke:var(--critical);stroke-width:2"/><circle cx="${(x + 2.6).toFixed(1)}" cy="14" r="1.8" style="fill:var(--critical)"/>`;
  });
  return `<svg class="ecg" viewBox="0 0 160 26" aria-label="最近 30 次抓取，失败 ${h.filter(x => !x).length} 次">${s}</svg>`;
}

/* ============================================================
 * 外壳：导航、条件面板、对比、路由
 * ============================================================ */
const PAGES = { today: pToday, calendar: pCalendar, timeline: pTimeline, insights: pInsights, all: pAll, library: pLibrary, apply: pApply, models: pModels, mine: pMine, coverage: pCoverage, admin: pAdmin };
const NAVS = [
  ['逛牧场', [['today', '今天'], ['calendar', '日历'], ['timeline', '时间线'], ['insights', '洞察']]],
  ['找羊毛', [['all', '全部羊毛'], ['library', '常驻额度库'], ['apply', '申请制'], ['models', '按模型找']]],
  ['我', [['mine', '我的']]],
  ['关于', [['coverage', '覆盖范围']]],
];
const TITLES = Object.fromEntries(NAVS.flatMap(g => g[1]));
function drawShell() {
  $$('[data-brand]').forEach(el => { el.innerHTML = BRAND; });
  $('#sideNav').innerHTML = NAVS.map(([g, items]) => `<div class="nav-sep">${g}</div>${items.map(([k, l]) => `<a href="#${k}" data-nav="${k}">${ICON[k]}${l}</a>`).join('')}`).join('');
  $('#tabbar').innerHTML = [['today', '今天'], ['calendar', '日历'], ['timeline', '时间线'], ['insights', '洞察']].map(([k, l]) => `<a href="#${k}" data-nav="${k}">${ICON[k]}<span>${l}</span></a>`).join('') + `<button type="button" data-more>${ICON.more}<span>更多</span></button>`;
  $('#sideFoot').innerHTML = `<span class="live"><i></i>最近更新 ${LAST_OK ? hm(LAST_OK) : '—'}</span><a href="/rss.xml" target="_blank" rel="noopener" style="text-decoration:underline">RSS 订阅</a><a href="#coverage" style="text-decoration:underline">只收能追到官方出处的羊毛，不保证覆盖所有活动</a>`;
  drawCondBtn();
}
function drawCondBtn() {
  const n = COND_ITEMS.filter(([k]) => !['realname', 'pay'].includes(k) && C[k]).length + C.members.length;
  $$('[data-open-cond]').forEach(b => { if (b.classList.contains('cond-btn')) b.innerHTML = `我的条件${n ? `<span class="badge">${n}</span>` : ''}${C.only ? ' · 只看能薅' : ''}`; });
}
function markNav(name) {
  $$('[data-nav]').forEach(a => { const on = a.dataset.nav === name; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const moreOn = !['today', 'calendar', 'timeline', 'insights'].includes(name);
  const mb = $('[data-more]'); if (mb) mb.classList.toggle('on', moreOn);
}
let SHEET_CHARTS = new Set();
function openSheet(title, html, after) {
  $('#sheetPanel').innerHTML = `<div class="sheet-head"><h2 id="sheetTitle">${title}</h2><button class="btn sm" type="button" data-close>关闭</button></div>${html}`;
  $('#sheet').hidden = false;
  document.body.style.overflow = 'hidden';
  after && after();
  const f = $('#sheetPanel [data-close]'); f && f.focus();
}
function closeSheet() {
  SHEET_CHARTS.forEach(c => c.dispose()); SHEET_CHARTS.clear();
  $('#sheet').hidden = true; document.body.style.overflow = '';
}
function openCond() { openSheet('我的条件', condForm()); }
function openMore() {
  const items = [['all', '全部羊毛'], ['library', '常驻额度库'], ['apply', '申请制'], ['models', '按模型找'], ['mine', '我的'], ['coverage', '覆盖范围'], ...(ADM.token ? [['admin', '后台']] : [])];
  openSheet('更多', `<div class="more-nav">${items.map(([k, l]) => `<a href="#${k}" data-close>${ICON[k]}${l}</a>`).join('')}</div>`);
}
function drawTray() {
  const t = $('#tray');
  if (!CMP.length) { t.hidden = true; return; }
  t.hidden = false;
  t.innerHTML = `<span>已选 ${CMP.length} 条对比（最多 3 条）</span><button class="btn sm" type="button" data-cmp-open>开始对比</button><button class="btn sm" type="button" data-cmp-clear style="background:transparent;color:var(--bg);border-color:transparent">清空</button>`;
}
function openCompare() {
  const list = CMP.map(id => OMAP[id]);
  const rowsDef = [['额度', o => valLabel(o).replace(/<[^>]+>/g, ' ')], ['薅度分', o => score(o)], ['类型', o => TYPES[o.ty].l], ['门槛', o => o.r.map(reqLabel).join('、')], ['领取截止', o => o.ek === 'date' ? md(dayAt(o.e)) : o.ek === 'unknown' ? '截止未知' : '长期'], ['额度有效期', o => o.val]];
  openSheet('对比', `<div class="chart" id="cCmp" style="height:300px"></div><div class="tbl"><table><thead><tr><th></th>${list.map((o, i) => `<th><span class="row" style="gap:6px;flex-wrap:nowrap"><i class="sw" style="background:var(--s${i + 1})"></i>${esc(o.plat.name)}</span></th>`).join('')}</tr></thead><tbody>${rowsDef.map(([k, f]) => `<tr><td class="muted">${k}</td>${list.map(o => `<td style="white-space:normal;min-width:120px">${esc(f(o))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`, () => {
    chart('#cCmp', {
      legend: Object.assign(legendCommon(), { bottom: 0, data: list.map(o => o.t.length > 14 ? o.t.slice(0, 13) + '…' : o.t) }),
      tooltip: { trigger: 'item' },
      radar: { indicator: DIMS.map(n => ({ name: n, max: 100 })), radius: '60%', center: ['50%', '46%'], splitNumber: 4, axisName: { color: TK.ink2, fontSize: 12 }, splitLine: { lineStyle: { color: TK.line2 } }, splitArea: { areaStyle: { color: [TK.surface, TK.surface2] } }, axisLine: { lineStyle: { color: TK.line2 } } },
      series: [{ type: 'radar', data: list.map((o, i) => ({ value: dims(o), name: o.t.length > 14 ? o.t.slice(0, 13) + '…' : o.t, lineStyle: { color: TK.s[i], width: 2 }, itemStyle: { color: TK.s[i] }, areaStyle: { color: TK.s[i], opacity: 0.12 }, symbolSize: 5 })) }],
    }, SHEET_CHARTS);
  });
}

function route() {
  const h = decodeURIComponent(location.hash.slice(1)) || 'today';
  if (h.startsWith('admin-offer-')) return ['admin', h.slice(12)];
  if (h.startsWith('offer-')) return ['offer', h.slice(6)];
  if (h.startsWith('platform-')) return ['platform', h.slice(9)];
  return [PAGES[h] ? h : 'today', null];
}
function render(keepScroll) {
  NOW = new Date();
  TK = tk();
  const [name, arg] = route();
  CHARTS.forEach(c => c.dispose()); CHARTS.clear(); hideTip();
  const y = window.scrollY;
  if (name === 'offer') pOffer(arg); else if (name === 'platform') pPlatform(arg); else if (name === 'admin') pAdmin(arg); else PAGES[name]();
  markNav(name === 'offer' || name === 'platform' ? '' : name);
  document.title = name === 'offer' && OMAP[arg] ? `${OMAP[arg].t} · AI 羊毛牧场` : name === 'platform' && PMAP[arg] ? `${PMAP[arg].name} · AI 羊毛牧场` : `${TITLES[name] || '今天'} · AI 羊毛牧场`;
  drawTray();
  if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
}

/* ---------- 全局事件 ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-open-cond],[data-more],[data-close],[data-cmp],[data-cmp-open],[data-cmp-clear],[data-want],[data-got],[data-remove-legacy],[data-mem],tr[data-href]');
  if (!t) return;
  if (t.matches('[data-open-cond]')) { e.preventDefault(); openCond(); return; }
  if (t.matches('[data-more]')) { openMore(); return; }
  if (t.matches('[data-close]')) { closeSheet(); return; }
  if (t.matches('tr[data-href]')) { location.hash = t.dataset.href.slice(1); return; }
  if (t.matches('[data-cmp]')) {
    e.preventDefault(); const id = t.dataset.cmp;
    if (CMP.includes(id)) CMP = CMP.filter(x => x !== id);
    else { if (CMP.length >= 3) { toast('最多对比 3 条，先去掉一条'); return; } CMP.push(id); }
    $$(`[data-cmp="${id}"]`).forEach(b => b.setAttribute('aria-pressed', CMP.includes(id)));
    drawTray(); return;
  }
  if (t.matches('[data-cmp-open]')) { openCompare(); return; }
  if (t.matches('[data-cmp-clear]')) { CMP = []; $$('[data-cmp]').forEach(b => b.setAttribute('aria-pressed', 'false')); drawTray(); return; }
  if (t.matches('[data-want]')) {
    const id = t.dataset.want;
    MINE.want = MINE.want.includes(id) ? MINE.want.filter(x => x !== id) : [...MINE.want, id];
    LS.set('ym-mine', MINE); toast(MINE.want.includes(id) ? '已加入想领' : '已取消'); render(true); return;
  }
  if (t.matches('[data-got]')) {
    const id = t.dataset.got, month = localMonth();
    if (claimedThisMonth(id)) MINE.claimed = MINE.claimed.filter(x => !(x.id === id && x.month === month));
    else MINE.claimed.push({ id, month, at: new Date().toISOString(), usd: OMAP[id]?.usd ?? 0 });
    LS.set('ym-mine', MINE); toast(claimedThisMonth(id) ? '已记入本月' : '已撤销本月记录'); render(true); return;
  }
  if (t.matches('[data-remove-legacy]')) {
    MINE.legacyGot = MINE.legacyGot.filter(id => id !== t.dataset.removeLegacy);
    LS.set('ym-mine', MINE); render(true); return;
  }
  if (t.matches('[data-mem]')) {
    const m = t.dataset.mem;
    C.members = C.members.includes(m) ? C.members.filter(x => x !== m) : [...C.members, m];
    t.setAttribute('aria-pressed', C.members.includes(m));
    LS.set('ym-cond', C); RACE = computeRace(); TREND = computeTrend(); drawCondBtn(); render(true);
  }
});
document.addEventListener('change', e => {
  const t = e.target.closest('[data-c]'); if (!t) return;
  C[t.dataset.c] = t.checked; LS.set('ym-cond', C); RACE = computeRace(); TREND = computeTrend(); drawCondBtn();
  $$(`[data-c="${t.dataset.c}"]`).forEach(x => { x.checked = t.checked; });
  render(true);
});
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });
window.addEventListener('hashchange', () => { closeSheet(); render(false); });
let rsT;
window.addEventListener('resize', () => {
  clearTimeout(rsT);
  rsT = setTimeout(() => {
    CHARTS.forEach(c => c.resize()); SHEET_CHARTS.forEach(c => c.resize());
    const f = $('#flock'); if (f && Math.abs((+f.dataset.w || 0) - f.clientWidth) > 40) buildFlock(f, view(OFFERS.filter(activeLimited)), weatherNow());
  }, 180);
});
let refreshInFlight = false, lastRefreshAt = Date.now();
// 后台页、或者正在填表时不自动重画：重画会清空正在修改的表单（2026-10-03 管理员反馈）。后台的数据点“待审”标签或刷新浏览器即可更新。
const keepPage = () => route()[0] === 'admin' || (route()[0] === 'offer' && NOTE_DRAFTS.has(route()[1])) || !!document.activeElement?.closest?.('form, textarea, input, select') || $$('[data-editform]:not([hidden])').length > 0;
async function refreshPage() {
  if (refreshInFlight) return;
  refreshInFlight = true;
  lastRefreshAt = Date.now();
  const previous = { OFFERS, PLATFORMS, META, COVERAGE, NOW, T0 };
  try {
    NOW = new Date(); T0 = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
    await loadData();
    if (keepPage()) {
      ({ OFFERS, PLATFORMS, META, COVERAGE, NOW, T0 } = previous);
      return;
    }
    prepare(); render(true);
  } catch (e) { /* 保留已加载页面；下次周期检查会再试 */ }
  finally { refreshInFlight = false; }
}
setInterval(() => {
  if (document.hidden || keepPage()) return;
  const now = Date.now();
  $$('[data-end]').forEach(el => { el.textContent = cdText(+el.dataset.end - now); });
  $$('[data-since]').forEach(el => { el.textContent = cdText(now - +el.dataset.since); });
  const endedOrStarted = $$('[data-end]').some(el => +el.dataset.end <= now);
  if (!refreshInFlight && !keepPage() && (ymd(new Date()) !== ymd(T0) || now - lastRefreshAt >= 5 * 60_000 || (endedOrStarted && now - lastRefreshAt >= 10_000))) refreshPage();
}, 1000);
const reTheme = () => { if (!keepPage()) render(true); }; // 深色模式按时切换时，后台只换配色（CSS 变量），不重画
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reTheme);
new MutationObserver(reTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

(async function boot() {
  $$('[data-brand]').forEach(el => { el.innerHTML = BRAND; });
  main().innerHTML = emptySheep('正在把羊赶进草地…');
  try { await loadData(); }
  catch (e) { main().innerHTML = emptySheep('数据没有加载成功，请稍后刷新。'); return; }
  prepare();
  drawShell();
  if (window.echarts) render(false);
  else main().innerHTML = ribbon() + emptySheep('图表库没有加载成功，请检查网络后刷新。');
})();
