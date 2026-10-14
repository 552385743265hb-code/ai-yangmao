import { afterEach, describe, expect, it,vi } from 'vitest';
import { identityDb } from './fixtures/identity/db';
import { generateDaily, readLatestDaily } from '../src/worker/daily';
import { sendFeishu } from '../src/worker/feishu';
import type { Env } from '../src/worker/index';
import { createHash } from 'node:crypto';
import {buildNotice,claimNotice,ackDelivery} from '../src/worker/admin';
const fixtures:ReturnType<typeof identityDb>[]=[];
afterEach(()=>{fixtures.splice(0).forEach(f=>f.sqlite.close());vi.unstubAllGlobals();});
function fixture(){
  const f=identityDb();fixtures.push(f);
  f.sqlite.prepare(`INSERT INTO offers(id,platform_id,title,type,modalities,claim_method,requirements,audience,value_text,end_kind,last_verified_at,evidence,steps,review_state)
    VALUES('daily','vendor','Daily free credits','standing','["text"]','signup','["none"]','all','Free 10 credits','standing',?,?,'[]','approved')`).run(new Date().toISOString(),JSON.stringify({url:'https://vendor.example',tier:'site',excerpts:{benefit:'Free 10 credits',eligibility:'Everyone',validity:'Every month'}}));
  return {f,env:{DB:f.db,ADMIN_TOKEN:'fixture',INGEST_TOKEN:'fixture'} as Env};
}
describe('latest shared daily digest',()=>{
  it('public reads never create a report or write notification state',async()=>{
    const {f,env}=fixture();
    expect(await readLatestDaily(env)).toBeNull();
    expect(f.sqlite.prepare('SELECT count(*) n FROM daily_digest').get()?.n).toBe(0);
    expect(f.sqlite.prepare('SELECT count(*) n FROM deliveries').get()?.n).toBe(0);
  });
  it('freezes one report per day and excludes internal notice fields',async()=>{
    const {f,env}=fixture();const first=await generateDaily(env);
    f.sqlite.prepare("UPDATE offers SET title='Changed after publication',review_memo='PRIVATE',admin_note='Public note'").run();
    expect((await generateDaily(env)).public).toEqual(first.public);
    const report=await readLatestDaily(env);
    expect(report?.boards.standing[0].title).toBe('Daily free credits');
    expect(report?.boards.standing[0].lastVerifiedAt).toBeTruthy();
    expect(report?.markdown).not.toContain('核验时间');
    expect(report?.markdown).toContain('Free 10 credits');
    expect(JSON.stringify(report)).not.toMatch(/reviewMemo|PRIVATE|reviewVersion|pendingCount|identityGuards|marks|preparation/);
    expect(f.sqlite.prepare('SELECT count(*) n FROM daily_digest').get()?.n).toBe(1);
  });
  it('generates the public report on the existing daily schedule even without a webhook',async()=>{
    const {f,env}=fixture();
    expect((await sendFeishu(env,'digest')).sent).toBe(0);
    expect((await readLatestDaily(env))?.boards.standing).toHaveLength(1);
    expect(f.sqlite.prepare('SELECT count(*) n FROM deliveries').get()?.n).toBe(0);
  });
  it('keeps detailed quotations in the linked data while the shared digest stays concise',async()=>{
    const {f,env}=fixture();
    for(const [source,translation] of [['Free 10 credits','免费 10 积分'],['Everyone','所有人']])
      f.sqlite.prepare('INSERT INTO translations(hash,source,zh) VALUES(?,?,?)').run(createHash('sha256').update(source).digest('hex'),source,translation);
    const report=(await generateDaily(env)).public;
    expect(report.boards.standing[0].originalExcerpts.benefit).toBe('Free 10 credits');
    expect(report.markdown).toContain('免费 10 积分');
    expect(report.markdown).not.toContain('Everyone');
    expect(report.markdown).not.toMatch(/官方原文|译文|怎么领/);
  });
  it('concurrent generation returns the same winner and keeps only one latest report',async()=>{
    const {f,env}=fixture();const [a,b]=await Promise.all([generateDaily(env),generateDaily(env)]);
    expect(a.public).toEqual(b.public);
    expect(f.sqlite.prepare('SELECT count(*) n FROM daily_digest').get()?.n).toBe(1);
    const next=await generateDaily(env,new Date(Date.now()+86400_000));
    expect(next.public.day).not.toBe(a.public.day);
    expect((await readLatestDaily(env))?.day).toBe(next.public.day);
    expect(f.sqlite.prepare('SELECT count(*) n FROM daily_digest').get()?.n).toBe(1);
  });
  it('adopts an existing successful Feishu edition on first preparation without sending again',async()=>{
    const {f,env}=fixture();const claimed=await claimNotice(env,'digest','feishu');await ackDelivery(env,claimed.deliveryId!,'sent');
    f.sqlite.exec("UPDATE offers SET title='New title after the delivered edition'");
    const prepared=await generateDaily(env);expect(prepared.public.boards.standing[0].title).toBe('Daily free credits');
    expect(prepared.sourceDeliveryId).toBe(claimed.deliveryId);
    vi.stubGlobal('fetch',vi.fn(()=>{throw Error('must not send');}));
    const result=await sendFeishu({...env,FEISHU_WEBHOOK:'https://example.com/webhook'},'digest');expect(result.sent).toBe(0);expect(result.skipped).toBe('没有新内容');
  });
  it('reports invalid frozen versions accurately and permits explicit repair only before any possible delivery',async()=>{
    const {f,env}=fixture();
    f.sqlite.exec("INSERT INTO benefit_entities(id,platform_id,canonical_offer_id,publication_revision) VALUES('daily-entity','vendor','daily',1)");
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({code:429,msg:'retry'})));
    const sending={...env,FEISHU_WEBHOOK:'https://example.com/webhook'};
    expect((await sendFeishu(sending,'digest')).sent).toBe(0);
    f.sqlite.exec("UPDATE benefit_entities SET publication_revision=2 WHERE id='daily-entity'");
    const blocked=await sendFeishu(sending,'digest');expect(blocked.error).toContain('版本已变化');
    const refreshed=await generateDaily(env,new Date(),true);expect(refreshed.public.revision).toBe(2);expect(refreshed.public.markdown).toContain('修订');
    const pending=await claimNotice(env,'digest','feishu',refreshed.notice);expect(pending.deliveryId).toBeTruthy();
    await expect(generateDaily(env,new Date(),true)).rejects.toThrow('发送或待核对');
    expect((await readLatestDaily(env))?.revision).toBe(2);
  });
  it('does not send a superseded edition when repair wins the race before claiming',async()=>{
    const {f,env}=fixture();await generateDaily(env);
    let signal!:()=>void,release!:()=>void;
    const reached=new Promise<void>(resolve=>{signal=resolve;}),resume=new Promise<void>(resolve=>{release=resolve;});
    let pause=true;
    const db=new Proxy(f.db,{get(target,key){if(key==='prepare')return(sql:string)=>{
      const statement=target.prepare(sql);
      if(sql.includes("status='sent' AND json_extract(payload,'$.digestDay')")){
        const first=statement.first.bind(statement);statement.first=async(...args:any[])=>{if(pause){pause=false;signal();await resume;}return first(...args as []);};
      }return statement;
    };return Reflect.get(target,key);}});
    const sent:any[]=[];vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{sent.push(JSON.parse(init.body));return Response.json({code:0});}));
    const sending=sendFeishu({...env,DB:db,FEISHU_WEBHOOK:'https://example.com/webhook'},'digest');await reached;
    f.sqlite.exec("UPDATE offers SET title='Refreshed edition'");
    await generateDaily(env,new Date(),true);release();await sending;
    expect(sent).toHaveLength(1);expect(JSON.stringify(sent)).toContain('Refreshed edition');expect(JSON.stringify(sent)).toContain('修订');
    expect((await readLatestDaily(env))?.revision).toBe(2);
  });
});
