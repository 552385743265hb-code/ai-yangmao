// 有界真实模型回归：合成文本复现已确认案例，不抓取/修改业务数据，不允许付费模型兜底。
import { writeFileSync } from 'node:fs';
import { extract } from '../pipeline/llm';
import { modelBudget } from '../pipeline/budget';

type Case = { id: string; name: string; text: string; existing?: string; check: (offers: Awaited<ReturnType<typeof extract>>['offers']) => boolean };
const cases: Case[] = [
  { id: 'workbuddy', name: 'WorkBuddy', text: 'WorkBuddy套餐表：体验版免费，每月500基础积分。标准版每月基础2000+加赠2000（限时），实得4000；高级版基础4000+加赠5000（限时），实得9000；旗舰版基础20000+加赠30000（限时），实得50000。以上随付费订阅每月发放，未提供独立活动条件。',
    existing: 'workbuddy-standard｜标准版限时加赠2000｜每月赠2000\nworkbuddy-advanced｜高级版限时加赠5000｜每月赠5000\nworkbuddy-flagship｜旗舰版限时加赠30000｜每月赠30000',
    check: (o: Awaited<ReturnType<typeof extract>>['offers']) => o.length > 0 && o.every(x => !x.requirements.some(r => /^(member|pay):/.test(r))) && o.some(x => /500/.test(x.valueText)) },
  { id: 'xiaomi-mimo', name: '小米 MiMo', text: '个人月付首次购买优惠12%，年付比月付优惠12%，Lite原价$6/月。只是订阅价格，没有额外积分或免费使用活动。',
    check: (o: Awaited<ReturnType<typeof extract>>['offers']) => o.length === 0 },
  { id: 'aws', name: 'AWS', text: 'Amazon Comprehend：Paid plan是按量计费账户，无固定订阅费、无需充值或预付，但须绑定支持的支付方式。首次调用起12个月，每个受支持API每月免费50,000文本单位；超出额度按量收费。',
    check: (o: Awaited<ReturnType<typeof extract>>['offers']) => o.length > 0 && o.every(x => x.requirements.includes('card') && !x.requirements.some(r => /^pay:/.test(r) || r === 'net')) },
  { id: 'vidu', name: 'Vidu', text: 'Vidu新用户注册获得一次性20试用积分。Free为$0/月；Q4 540P每秒消耗4积分；My References每月10个参考素材管理配额，不是免费视频生成次数。',
    check: (o: Awaited<ReturnType<typeof extract>>['offers']) => o.length === 1 && o[0].type === 'new' && o[0].modalities.length === 1 && o[0].modalities[0] === 'video' && /20/.test(o[0].valueText) && !/每月\s*20\s*(试用)?积分|每月\s*10\s*(条视频|次视频|次生成)/.test(o[0].valueText) },
  { id: 'anthropic', name: 'Anthropic', text: 'Claude Startups原计划2026年5月推出（月份精度，无具体日）。2026年10月6日公布扩展：获批公司获一次性$1,000 Claude API额度，发放后6个月有效；首次使用Team的组织最多5个Premium席位免费一年，官方按年付$100/席/月算价值最高$6,000。第三方合作商最高$45,000优惠不是Anthropic API赠金。公司须成立5年内或近2年获融资、同域公司邮箱并审核；受限地区不适用。',
    check: (o: Awaited<ReturnType<typeof extract>>['offers']) => o.length === 1 && o[0].type === 'apply' && o[0].modalities.length === 1 && o[0].modalities[0] === 'text' && o[0].usdEstimate === 1000 && o[0].usdMax === 7000 && o[0].claimStart === '2026-10-06' && (!o[0].publishedAt || o[0].publishedAt === '2026-10-06') },
];
const results: object[] = [];
const selected = (process.env.LESSON_CASES ?? '').split(',').map(s => s.trim()).filter(Boolean);
if (selected.some(id => !cases.some(c => c.id === id))) throw new Error('Unknown LESSON_CASES');
for (const c of cases.filter(c => !selected.length || selected.includes(c.id))) {
  try {
    const r = await extract(c.name, `https://fixture.invalid/${c.id}`, c.text, () => undefined,
      { platformIds: [c.id], existing: c.existing, allowPaid: false, budget: modelBudget, deadlineAt: Date.now() + 180_000 });
    const passed = c.check(r.offers);
    results.push({ id: c.id, passed, provider: r.provider, tokens: r.tokens, costCny: r.costCny, offers: r.offers });
    console.log(JSON.stringify({ id: c.id, passed, provider: r.provider, tokens: r.tokens, costCny: r.costCny, offers: r.offers.length }));
  } catch (error) {
    results.push({ id: c.id, passed: false, error: (error as Error).message });
    console.log(JSON.stringify({ id: c.id, passed: false, error: (error as Error).message }));
  }
}
writeFileSync('extraction-lessons-results.json', JSON.stringify({ at: new Date().toISOString(), synthetic: true, results }, null, 2));
if (results.some(r => !(r as { passed: boolean }).passed)) process.exitCode = 1;
