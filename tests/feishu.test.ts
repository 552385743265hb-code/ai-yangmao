import { createHmac } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCards, dispatchCollect, scheduledCollect, sendFeishu } from '../src/worker/feishu';
import { buildNotice } from '../src/worker/admin';
import type { Env } from '../src/worker/index';

let sqlite: DatabaseSync;
let env: Env;

function d1(memory: DatabaseSync) {
  return {
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

  it('卡片写全福利、领取方式、条件、截止（换算北京时间）、有效期和可点击的链接，英文翻译成中文并缓存', async () => {
    const calls = stubFetch(() => ({ code: 0 }));
    sqlite.prepare("UPDATE offers SET admin_note='升级后才到账，\n注意先绑卡' WHERE id='kiro-bonus'").run();
    sqlite.prepare("UPDATE offers SET usd_max=40 WHERE id='kiro-bonus'").run();
    const notice = await buildNotice(env, 'digest', 'feishu');
    const [card] = await buildCards(env, notice) as { elements: { tag: string; text?: { content: string }; actions?: { url: string }[] }[] }[];
    const text = card.elements.filter(e => e.tag === 'div').map(e => e.text!.content).join('\n');
    expect(text).toContain('🎁 **福利**：【译】$20 credited toward your subscription（约 $20–40）');
    expect(text).toContain('📥 **怎么领**：充值后赠送');
    expect(text).toContain('💬 **牧场心得**：升级后才到账， 注意先绑卡');
    expect(text).toContain('　1. 【译】Sign in with social login or AWS Builder ID');
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
    expect(calls[0].body).toEqual({ ref: 'main' });
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

  it('作为历史数据补录的已结束活动不推送“已结束”；推送过上架的才推送', async () => {
    stubFetch(() => ({ code: 0 }));
    const yesterday = new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10);
    sqlite.prepare("UPDATE offers SET claim_start='2026-09-01', claim_end=?, source_tz='UTC'").run(yesterday);
    expect((await buildNotice(env, 'digest', 'feishu')).items.ended).toEqual([]);
    sqlite.prepare("INSERT INTO notifications (offer_id, channel, stage, sent_at) VALUES ('kiro-bonus','feishu','new',?)").run(new Date(Date.now() - 5 * 86400_000).toISOString());
    expect((await buildNotice(env, 'digest', 'feishu')).items.ended.map(x => x.id)).toEqual(['kiro-bonus']);
  });
});
