import { createHmac } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCards, dispatchCollect, scheduledCollect, sendFeishu, runScheduled, CRON } from '../src/worker/feishu';
import { buildNotice } from '../src/worker/admin';
import worker from '../src/worker/index';
import type { Env } from '../src/worker/index';

let sqlite: DatabaseSync;
let env: Env;

function d1(memory: DatabaseSync) {
  return {
    async batch(statements:{all():Promise<unknown>}[]){memory.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.all());memory.exec('COMMIT');return results;}catch(error){memory.exec('ROLLBACK');throw error;}},
    prepare(sql: string) {
      let args: unknown[] = [];
      return {
        bind(...values: unknown[]) { args = values; return this; },
        async raw() { const statement = memory.prepare(sql); statement.setReturnArrays(true); return statement.all(...args as []); },
        async all() { return { results: memory.prepare(sql).all(...args as []) }; },
        async first() { return memory.prepare(sql).get(...args as []) ?? null; },
        async run() { return { meta: memory.prepare(sql).run(...args as []), success: true }; },
      };
    },
  } as unknown as D1Database;
}

const evidence = {
  url: 'https://kiro.dev/pricing/', tier: 'site', capturedAt: '2026-09-30T00:00:00Z',
  excerpts: { benefit: 'Get $20 credited toward your subscription when you first upgrade to a paid plan.', eligibility: 'The first time you upgrade to any Kiro paid plan.', claim: 'Upgrade to a paid plan.', validity: 'Offer ends October 3.' },
};

beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  for (const name of readdirSync(new URL('../migrations/', import.meta.url)).filter(n => /^\d+_.+\.sql$/.test(n)).sort()) {
    sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  }
  env = { DB: d1(sqlite), INGEST_TOKEN: 'x'.repeat(20), ADMIN_TOKEN: 'y'.repeat(20), FEISHU_WEBHOOK: 'https://open.feishu.cn/open-apis/bot/v2/hook/test', FEISHU_SECRET: 'test-secret', GEMINI_API_KEY: 'gemini-key' } as unknown as Env;
  sqlite.prepare("INSERT INTO platforms (id,name,type,status,site) VALUES ('kiro','Kiro','tool','approved','https://kiro.dev')").run();
  // 官方（美西）时区的今天 23:59 截止：一定在 48 小时内
  const end = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  sqlite.prepare(`INSERT INTO offers (id,platform_id,title,type,modalities,claim_method,requirements,audience,value_text,usd_estimate,claim_end,end_kind,credit_validity,source_tz,last_verified_at,review_state,evidence,steps)
    VALUES ('kiro-bonus','kiro','Kiro 首次升级订阅赠送','topup','["code"]','topup','["pay:首次升级付费套餐","card"]','all','$20 credited toward your subscription',20,?, 'date','Valid for 30 days','America/Los_Angeles',?,'approved',?,?)`)
    .run(end, new Date().toISOString(), JSON.stringify(evidence), JSON.stringify(['Sign in with social login or AWS Builder ID', 'Upgrade to a paid plan']));
});
afterEach(() => { sqlite.close(); vi.unstubAllGlobals(); });

/** 模拟外部接口：Gemini 翻译、飞书机器人、GitHub。 */
function stubFetch(feishu: (body: Record<string, unknown>) => Record<string, unknown>) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body ?? '{}'));
    calls.push({ url, body });
    if (url.includes('generativelanguage')) {
      const list = JSON.parse(body.contents[0].parts[0].text.split('\n\n').pop()) as string[];
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(list.map(t => `【译】${t}`)) }] } }] }));
    }
    if (url.includes('open.feishu.cn')) return new Response(JSON.stringify(feishu(body)));
    if (url.includes('api.github.com')) return new Response(null, { status: 204 });
    return new Response('{}', { status: 404 });
  }));
  return calls;
}

describe('飞书群日报', () => {
  it('签名正确，飞书确认成功后才记入通知台账，第二次不再重复发', async () => {
    const calls = stubFetch(() => ({ code: 0, msg: 'success' }));
    const r = await sendFeishu(env, 'digest');
    expect(r).toMatchObject({ sent: 1, cards: 1 });
    const post = calls.find(c => c.url.includes('open.feishu.cn'))!;
    const expected = createHmac('sha256', `${post.body.timestamp}\ntest-secret`).update('').digest('base64');
    expect(post.body.sign).toBe(expected);
    // 新上架时已临期：同时记下"临期"，同一天不会再以"3 天内结束"重复推送
    expect(sqlite.prepare("SELECT stage FROM notifications WHERE channel='feishu' ORDER BY stage").all()).toEqual([{ stage: 'ending' }, { stage: 'new' }]);
    expect(await sendFeishu(env, 'digest')).toMatchObject({ sent: 0, skipped: '没有新内容' });
  });

  it('飞书明确拒收（比如签名错误）时不记账，释放占位，下一次会重新发送', async () => {
    stubFetch(() => ({ code: 19021, msg: 'sign match fail or timestamp is not within one hour from current time' }));
    const r = await sendFeishu(env, 'digest');
    expect(r.sent).toBe(0);
    expect(sqlite.prepare("SELECT count(*) n FROM notifications").get()).toEqual({ n: 0 });
    stubFetch(() => ({ code: 0 }));
    expect(await sendFeishu(env, 'digest')).toMatchObject({ sent: 1 });
  });

  it('日报只保留福利摘要、条件、截止、有效期和信源链接，不带原文或领取教程', async () => {
    const calls = stubFetch(() => ({ code: 0 }));
    sqlite.prepare("UPDATE offers SET admin_note='升级后才到账，\n注意先绑卡' WHERE id='kiro-bonus'").run();
    sqlite.prepare("UPDATE offers SET usd_max=40 WHERE id='kiro-bonus'").run();
    const notice = await buildNotice(env, 'digest', 'feishu');
    const [card] = await buildCards(env, notice) as { elements: { tag: string; text?: { content: string }; actions?: { url: string }[] }[] }[];
    const text = card.elements.filter(e => e.tag === 'div').map(e => e.text!.content).join('\n');
    expect(text).toContain('🎁 **福利**：【译】$20 credited toward your subscription（旧参考值 $20–$40 · 待按已审核估值口径重估）');
    expect(text).not.toMatch(/怎么领|牧场心得|官方原文|官方说明|译文|核验时间/);
    expect(text).not.toContain('Sign in with social login');
    expect(text).not.toContain(evidence.excerpts.benefit);
    expect(text).not.toContain(evidence.excerpts.eligibility);
    expect(text).toContain('🔎 **信源**：官网');
    expect(text).toContain('✅ **条件**：需充值（首次升级付费套餐）、需海外信用卡 / PayPal；适用：所有用户');
    expect(text).toMatch(/⏰ \*\*截止\*\*：\d+月\d+日 23:59（美西时间），即北京时间 \d+月\d+日 1[45]:59/);
    expect(text).toContain('⌛ **额度有效期**：【译】Valid for 30 days');
    const urls = card.elements.flatMap(e => e.actions ?? []).map(a => a.url);
    expect(urls).toEqual(['https://kiro.dev/pricing/', 'https://ai-yangmao.com/#offer-kiro-bonus', 'https://ai-yangmao.com']);
    // 第二次排版直接用缓存，不再调用翻译
    const before = calls.filter(c => c.url.includes('generativelanguage')).length;
    await buildCards(env, notice);
    expect(calls.filter(c => c.url.includes('generativelanguage')).length).toBe(before);
  });

  it('恢复后的小时检查补上漏掉的日报，后续检查不重复发送', async () => {
    const calls = stubFetch(() => ({ code: 0 }));
    const now = new Date();
    // 东京 10:07，已过本日 09:00；使用固定 UTC 时刻防止主机时区影响。
    const day = now.toISOString().slice(0, 10);
    const check = new Date(`${day}T01:07:00Z`);
    sqlite.prepare("UPDATE offers SET type='standing',end_kind='standing',claim_end=NULL,last_verified_at=?").run(check.toISOString());
    await runScheduled(CRON.urgent, env, check);
    expect(sqlite.prepare("SELECT kind,status FROM deliveries WHERE kind='digest'").all()).toEqual([{kind:'digest',status:'sent'}]);
    const count = calls.filter(c => c.url.includes('open.feishu.cn')).length;
    expect(count).toBe(1);
    await runScheduled(CRON.urgent, env, check);
    expect(calls.filter(c => c.url.includes('open.feishu.cn'))).toHaveLength(count);
  });

  it('日报补跑请求挂起时，加急仍然先完成送达', async () => {
    stubFetch(() => ({ code: 0 }));
    let reached!:()=>void,release!:()=>void;
    const reading=new Promise<void>(resolve=>{reached=resolve;}),resume=new Promise<void>(resolve=>{release=resolve;});
    const database=new Proxy(env.DB,{get(target,key){
      if(key==='prepare')return(sql:string)=>{
        const statement=target.prepare(sql);
        if(sql==='SELECT payload FROM daily_digest WHERE id=1'){
          const first=statement.first.bind(statement);
          statement.first=async(...args:[])=>{reached();await resume;return first(...args);};
        }
        return statement;
      };
      return Reflect.get(target,key);
    }});
    const tokyoDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(new Date());
    const sending=runScheduled(CRON.urgent,{...env,DB:database},new Date(`${tokyoDay}T01:07:00Z`));
    await reading;
    try{expect(sqlite.prepare("SELECT kind,status FROM deliveries WHERE kind='urgent'").all()).toEqual([{kind:'urgent',status:'sent'}]);}
    finally{release();await sending;}
  });

  it('旧日报拒收后，加急已送达的活动不会再次出现在补跑日报', async () => {
    stubFetch(() => ({ code: 429, msg: 'retry' }));
    expect((await sendFeishu(env,'digest')).sent).toBe(0);
    const calls=stubFetch(() => ({ code: 0 }));
    const tokyoDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(new Date());
    await runScheduled(CRON.urgent,env,new Date(`${tokyoDay}T01:07:00Z`));
    expect(calls.filter(c=>c.url.includes('open.feishu.cn'))).toHaveLength(1);
    expect(sqlite.prepare("SELECT kind,status FROM deliveries ORDER BY created_at").all()).toEqual([{kind:'digest',status:'released'},{kind:'urgent',status:'sent'}]);
    const payload=JSON.parse(String(sqlite.prepare('SELECT payload FROM daily_digest').get()?.payload));
    expect(payload.public.revision).toBe(2);
    expect(payload.public.boards.rising).toEqual([]);
  });

  it('东京 09:00 前不会提前生成或推送下一期日报', async () => {
    stubFetch(() => ({ code: 0 }));
    const check = new Date(`${new Date().toISOString().slice(0,10)}T23:07:00Z`);
    sqlite.prepare("UPDATE offers SET type='standing',end_kind='standing',claim_end=NULL,last_verified_at=?").run(check.toISOString());
    await runScheduled(CRON.urgent, env, check);
    expect(sqlite.prepare('SELECT count(*) n FROM daily_digest').get()?.n).toBe(0);
    expect(sqlite.prepare("SELECT count(*) n FROM deliveries WHERE kind='digest'").get()?.n).toBe(0);
  });

  it('小时补跑保留结果不明的日报占位，不能盲目重发', async () => {
    sqlite.prepare("UPDATE offers SET type='standing',end_kind='standing',claim_end=NULL").run();
    vi.stubGlobal('fetch', vi.fn(async () => { throw Error('delivery unknown'); }));
    expect((await sendFeishu(env,'digest')).sent).toBe(0);
    const unknown = sqlite.prepare("SELECT id,status FROM deliveries WHERE kind='digest'").get();
    expect(unknown?.status).toBe('unknown');
    const calls = stubFetch(() => ({ code: 0 }));
    const tokyoDay = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(new Date());
    const check = new Date(`${tokyoDay}T01:07:00Z`);
    await runScheduled(CRON.urgent, env, check);
    expect(sqlite.prepare("SELECT id,status FROM deliveries WHERE kind='digest'").all()).toEqual([unknown]);
    expect(calls.filter(c=>c.url.includes('open.feishu.cn'))).toHaveLength(0);
  });

  it('shows V1 first30 membership value, unpriced beta and application ceiling without sending a message', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const noTranslation = { ...env, GEMINI_API_KEY: undefined };
    const base = { version: 'v1', status: 'priced', method: 'official_price', period: 'first30', usdEstimate: 20,
      usdMax: null, fullValue: 240, formula: '1 × $20', inputs: {}, sources: [{ url: 'https://kiro.dev/pricing/',
        checkedAt: '2026-10-09', excerpt: '$20 per month.', priceBasis: '官方月价' }], assumptions: [], reviewedAt: '2026-10-09' };
    const cardText = async () => {
      const notice = await buildNotice(noTranslation, 'digest', 'feishu');
      const cards = await buildCards(noTranslation, notice) as any[];
      return cards.flatMap(card => card.elements).filter(element => element.tag === 'div').map(element => element.text.content).join('\n');
    };
    sqlite.prepare('UPDATE offers SET valuation=?').run(JSON.stringify(base));
    const first = await cardText();
    expect(first).toContain('官方价格折算 · 月度参考价值 $20');
    expect(first).not.toContain('$240');
    sqlite.prepare('UPDATE offers SET usd_estimate=NULL, valuation=?').run(JSON.stringify({ ...base, status: 'beta_unpriced', method: 'none', usdEstimate: null, fullValue: null, formula: null }));
    expect(await cardText()).toContain('公测免费 · 价值待定');
    const notice = await buildNotice(noTranslation, 'digest', 'feishu');
    // The scheduler's existing application exclusion stays unchanged; exercise only card rendering.
    const application = { ...notice.items.rising[0], type: '申请制', usdEstimate: null, usdMax: 100_000,
      valuation: { ...base, method: 'face_value', period: 'apply_max', usdEstimate: null, usdMax: 100_000, fullValue: null } };
    const cards = await buildCards(noTranslation, { kind: 'digest', items: { rising: [application] } } as any) as any[];
    expect(JSON.stringify(cards)).toContain('最高可申请 $100,000（审批决定，无保底）');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('加急只推 48 小时内截止、仍然有效的条目；已发过的新上架不重复加急', async () => {
    stubFetch(() => ({ code: 0 }));
    expect(await sendFeishu(env, 'urgent')).toMatchObject({ sent: 1 });
    expect(await sendFeishu(env, 'digest')).toMatchObject({ sent: 0 });
    sqlite.prepare("UPDATE offers SET last_verified_at='2026-01-01T00:00:00Z'").run();
    sqlite.prepare("DELETE FROM notifications").run();
    expect(await sendFeishu(env, 'urgent')).toMatchObject({ sent: 0 });
  });

  it('准点触发采集：调用 GitHub 的手动触发接口', async () => {
    expect(await dispatchCollect(env)).toMatchObject({ ok: false });
    const calls = stubFetch(() => ({}));
    expect(await dispatchCollect({ ...env, GH_DISPATCH_TOKEN: 'ghp_test' } as Env)).toEqual({ ok: true });
    expect(calls[0].url).toBe('https://api.github.com/repos/accesaver-byte/ai-yangmao/actions/workflows/collect.yml/dispatches');
    expect(calls[0].body).toEqual({ ref: 'main', inputs: { fast_leads: 'false', lead_limit: '50' } });
    expect(await dispatchCollect({ ...env, GH_DISPATCH_TOKEN: 'ghp_test' } as Env, true)).toEqual({ ok: true });
    expect(calls[1].body.inputs).toEqual({ fast_leads: 'true', lead_limit: '50' });
  });

  it('定时触发采集失败会重试一次，仍失败就记一条失败记录', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"Bad credentials"}', { status: 401 })));
    const r = await scheduledCollect({ ...env, GH_DISPATCH_TOKEN: 'ghp_old' } as Env, async () => undefined);
    expect(r.ok).toBe(false);
    expect((fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(2);
    const row = sqlite.prepare("SELECT ok, stats FROM runs WHERE kind='collect'").get() as { ok: number; stats: string };
    expect(row.ok).toBe(0);
    expect(JSON.parse(row.stats)).toMatchObject({ stage: 'dispatch' });
    expect(JSON.parse(row.stats).error).toContain('401');
  });

  it('纠正记录接口：带上人工修改（含理由）和拒绝理由', async () => {
    sqlite.prepare("INSERT INTO offer_revisions (offer_id, diff, author) VALUES ('kiro-bonus', ?, 'admin')").run(JSON.stringify([{ field: 'requirements', from: ['phone'], to: ['realname'] }]));
    sqlite.prepare("INSERT INTO reviews (offer_id, action, reviewer, reason) VALUES ('kiro-bonus','edit','admin','phone 指海外手机号')").run();
    sqlite.prepare("INSERT INTO reviews (offer_id, action, reviewer, reason, reason_code) VALUES ('kiro-bonus','reject','reviewer1','套餐自带','paid_bundle')").run();
    sqlite.prepare("INSERT INTO reviews (offer_id, action, reviewer, reason_code) VALUES ('kiro-bonus','reject','system','duplicate')").run();
    const r = await worker.fetch!(new Request('https://x/api/ingest/corrections?platform=kiro', { headers: { Authorization: 'Bearer ' + 'x'.repeat(20) } }) as never, env, { waitUntil() {}, passThroughOnException() {} } as never);
    const { corrections } = await r.json() as { corrections: string[] };
    expect(corrections.some(x => x.includes('requirements') && x.includes('理由：phone 指海外手机号'))).toBe(true);
    expect(corrections.some(x => x.includes('被拒绝：付费套餐自带的额度，套餐自带'))).toBe(true);
    expect(corrections.length).toBe(2);
  });

  it('飞书日报分三个榜：常驻榜、新星榜、末班车榜', async () => {
    const n = await buildNotice(env, 'digest', 'feishu');
    expect(n.items.standing.length).toBeLessThanOrEqual(5);
    expect(n.items.rising.length).toBeLessThanOrEqual(3);
    expect(n.items.lastcall.length).toBeLessThanOrEqual(3);
    expect(n.items.ended).toEqual([]);
    const ids = [...n.items.standing, ...n.items.rising, ...n.items.lastcall].map(x => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('作为历史数据补录的已结束活动不推送“已结束”；推送过上架的才推送', async () => {
    stubFetch(() => ({ code: 0 }));
    const yesterday = new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10);
    sqlite.prepare("UPDATE offers SET claim_start='2026-09-01', claim_end=?, source_tz='UTC'").run(yesterday);
    expect((await buildNotice(env, 'digest', 'telegram')).items.ended).toEqual([]);
    sqlite.prepare("INSERT INTO notifications (offer_id, channel, stage, sent_at) VALUES ('kiro-bonus','telegram','new',?)").run(new Date(Date.now() - 5 * 86400_000).toISOString());
    expect((await buildNotice(env, 'digest', 'telegram')).items.ended.map(x => x.id)).toEqual(['kiro-bonus']);
  });
});
