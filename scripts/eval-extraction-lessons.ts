// 有界真实模型回归：合成文本复现已确认案例，不抓取/修改业务数据，不允许付费模型兜底。
import { writeFileSync } from 'node:fs';
import { extract } from '../pipeline/llm';
import { modelBudget } from '../pipeline/budget';

type Case = { id: string; name: string; text: string; existing?: string; platformIds?:string[]; check: (offers: Awaited<ReturnType<typeof extract>>['offers']) => boolean };
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
  { id:'reset-same-day',name:'OpenAI',platformIds:['openai'],existing:'openai-reset-morning｜Codex 重置卡发放｜1张｜开始:2026-10-08｜发布:2026-10-08T12:00:00Z｜证据:https://fixture.invalid/morning',
    text:'OpenAI官方公告，发布时间2026-10-08T18:00:00Z：今天稍早我们已发放一张Codex重置卡。现在向所有Codex订阅用户独立再发放第二张重置卡，这是另一次额外发放，不是上午发放的传播进度说明。发放仅限今天，卡可保留到使用时。',
    check:o=>o.length===1&&o[0].tags?.includes('reset')===true&&o[0].claimStart==='2026-10-08'&&o[0].claimEnd==='2026-10-08'&&Date.parse(o[0].publishedAt??'')===Date.parse('2026-10-08T18:00:00Z')&&o[0].sameAs!=='openai-reset-morning' },
  { id:'reset-followup',name:'OpenAI',platformIds:['openai'],existing:'openai-reset-morning｜Codex 重置卡发放｜1张｜开始:2026-10-08｜发布:2026-10-08T12:00:00Z｜证据:https://fixture.invalid/morning',
    text:'OpenAI官方进度回复，发布时间2026-10-08T18:00:00Z：今天12:00Z宣布发给所有Codex订阅用户的那一张重置卡还在传播中，部分账号稍晚收到。本回复不是第二次发放，也不是新活动。',
    check:o=>o.length===0||(o.length===1&&o[0].sameAs==='openai-reset-morning'&&Date.parse(o[0].publishedAt??'')!==Date.parse('2026-10-08T18:00:00Z')) },
  { id:'identity-gift',name:'Example AI',text:'Example AI 学生计划：在校大学生完成自动学生身份认证，即可免费领取Pro会员12个月。无需提交项目材料，无人工资助评审，无需绑卡；不提供现金。非学生Pro价格每月$10。没有公布整个学生计划的申请截止日。',
    check:o=>o.length===1&&o[0].type==='gift'&&o[0].requirements.includes('student')&&o[0].endKind==='unknown'&&o[0].claimEnd===null&&/12|一年/.test(o[0].creditValidity??'') },
  { id:'grant-vs-prize',name:'Example AI',text:'Example AI官方公告包含两项不同机制。编程比赛前三名每人奖励$1,000 API额度，仅赢家可获奖。另有独立科研资助，研究者提交课题材料，经人工审批可获最高$200 API额度，不参与排名或比赛；申请项目全年常驻。',
    check:o=>o.length===1&&o[0].type==='apply'&&o[0].endKind==='standing'&&/200/.test(o[0].valueText)&&!(/1,?000/.test(o[0].valueText)) },
  { id:'claim-vs-validity',name:'Example AI',text:'Example AI注册送$10模型推理API赠金。所有新账号可在2026年10月10日到10月12日（UTC）注册并领取，无需支付或绑卡，领取后的额度30天有效。仅限推理API，不能抵扣云服务器。',
    check:o=>o.length===1&&o[0].type==='new'&&o[0].claimStart==='2026-10-10'&&o[0].claimEnd==='2026-10-12'&&/30/.test(o[0].creditValidity??'')&&o[0].usdEstimate===10 },
];
const results: object[] = [];
const deadline=Date.now()+15*60_000;
const selected = (process.env.LESSON_CASES ?? '').split(',').map(s => s.trim()).filter(Boolean);
if (selected.some(id => !cases.some(c => c.id === id))) throw new Error('Unknown LESSON_CASES');
for (const c of cases.filter(c => !selected.length || selected.includes(c.id))) {
  try {
    if(Date.now()>=deadline)throw new Error('回归总时限已到，剩余案例未评估');
    const r = await extract(c.name, `https://fixture.invalid/${c.id}`, c.text, () => undefined,
      { platformIds: c.platformIds??[c.id], existing: c.existing, allowPaid: false, budget: modelBudget, deadlineAt: Math.min(deadline,Date.now() + 180_000) });
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
