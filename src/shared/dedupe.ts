// 入库硬性去重：不依赖模型给的 ID 或 sameAs。同一平台下标题几乎一样，或证据链接相同且额度几乎一样，视为同一条。
const bigrams = (s: string) => {
  const t = s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
};
export function similarity(a: string, b: string): number {
  const A = bigrams(a), B = bigrams(b);
  if (!A.size || !B.size) return a.trim() === b.trim() ? 1 : 0;
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  return (2 * n) / (A.size + B.size);
}
export const normUrl = (value: string) => {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid|msclkid)$/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    const host=url.hostname.toLowerCase().replace(/^www\./,'');
    return (host==='twitter.com'?'x.com':host) + url.pathname.replace(/\/+$/,'') + url.search;
  } catch { return value.trim(); }
};
/** A fixed social announcement is one source version, not a mutable pricing page. */
export function officialStatusKey(value:string):string|null {
  try{const url=new URL(value);const host=url.hostname.toLowerCase().replace(/^www\./,'');const match=url.pathname.match(/^\/([^/]+)\/status\/(\d+)\/?$/);return ['x.com','twitter.com'].includes(host)&&match?`x.com/${match[1].toLowerCase()}/status/${match[2]}`:null;}catch{return null;}
}
// 档位、金额不同的标题（如 2,999 元档 / 4,999 元档）只差几个数字，不能当成同一条
const digits = (s: string) => (s.normalize('NFKC').match(/\d[\d,.]*/g) ?? []).map(x => x.replace(/,/g, '')).sort().join('|');

export interface DedupeCandidate { id: string; platformId: string; title: string; valueText: string; evidenceUrl: string; eventDay?: string | null; claimStart?: string | null; sameOccurrenceAs?:string; reviewState?:string; type?:string; claimMethod?:string; requirements?:string[]; audience?:string; models?:string[]; modalities?:string[] }
type Incoming = Omit<DedupeCandidate,'id'> & {id?:string};
const titleKey=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
// Generic daily-credit descriptions may come from FAQ, pricing, or the account check-in page.
// Keep product/model, paid-tier, region and task qualifiers: only a scope-free alias is safe.
function genericDailyCredits(o: Incoming): boolean {
  let t=titleKey(o.title);
  if(!/每日|每天|签到|daily|checkin/.test(t)||!/积分|credits?|tokens?|points?|盒饭/.test(t))return false;
  t=t.replaceAll(titleKey(o.platformId),'');
  t=t.replace(/免费档|免费层|免费版|每日|每天|签到|登录|奖励|赠送|额度|积分|盒饭|领取|赠|送|领|合计|free|tier|daily|checkin|credits?|tokens?|points?|bonus|rewards?|[0-9]+/g,'');
  return !t;
}
function sameRepostedWeek(a: Incoming,b:Incoming):boolean {
  if(a.eventDay||b.eventDay||titleKey(a.title)!==titleKey(b.title)||!a.claimStart||!b.claimStart)return false;
  if(!/一周|1周|7天|one week|a week|7 days/i.test(a.title+' '+a.valueText)||!/一周|1周|7天|one week|a week|7 days/i.test(b.title+' '+b.valueText))return false;
  return Math.abs(Date.parse(a.claimStart)-Date.parse(b.claimStart))<7*86400000;
}
function sameRecurringAlias(a: Incoming,b:DedupeCandidate):boolean {
  return !a.eventDay&&!b.eventDay&&!!a.id&&a.id.replace(/-\d{4}-\d{2}-\d{2}$/,'')===b.id
    && /每月|monthly/i.test(a.title+' '+a.valueText)&&/每月|monthly/i.test(b.title+' '+b.valueText);
}
function monthlyApiScope(o: Incoming):string|null {
  if(o.eventDay||!/每月|monthly/i.test(o.title)||!/api/i.test(o.title))return null;
  const plans=[...new Set(o.title.toLowerCase().match(/max(?:\s*\d+x)?|team|pro|premium|standard|enterprise/g)??[])].sort();
  if(!plans.length)return null;
  // Named products or capabilities left over mean a different scope, not a generic plan allowance.
  let rest=o.title.toLowerCase().replace(o.platformId.toLowerCase(),'').replace(/anthropic|claude/g,'');
  rest=rest.replace(/max(?:\s*\d+x)?|team|pro|premium|standard|enterprise|api|monthly|credits?|每月|月度|计划|订阅|用户|会员|额度|扩展|赠送|赠金|免费|与|和|及/g,'').replace(/[\s\p{P}\p{S}]/gu,'');
  return rest?null:plans.join('|');
}
// 同日不同公告可能是第二次发放，也可能是传播进度。没有同活动判断时保留待审，不能硬合并。
export const ambiguousReset = (a: Omit<DedupeCandidate,'id'>, b:DedupeCandidate) =>
  !!(a.eventDay && a.eventDay===b.eventDay && normUrl(a.evidenceUrl)!==normUrl(b.evidenceUrl) && a.sameOccurrenceAs!==b.id);
export const differentOccurrence = (a: Omit<DedupeCandidate, 'id'>, b: Omit<DedupeCandidate, 'id'>) =>
  !!((a.eventDay && b.eventDay && a.eventDay !== b.eventDay) ||
    (a.claimStart && b.claimStart && a.claimStart !== b.claimStart && normUrl(a.evidenceUrl) !== normUrl(b.evidenceUrl)));

// A free Token/Coding Plan can have a short pricing-card description and a longer
// rules page. Match the recurring quota plus complete claim/model scope, not prose.
function creditQuotas(text: string): Map<string, number> {
  const out=new Map<string,number>();
  const t=text.normalize('NFKC').toLowerCase().replace(/,/g,'');
  const amount='(\\d+(?:\\.\\d+)?)\\s*(万|百万|k|m)?\\s*(?:积分|credits?|points?)';
  const interval='(\\d+(?:\\.\\d+)?)\\s*(?:小时|hours?|hrs?)';
  const add=(n:string,scale:string|undefined,hours:string)=>{
    const value=Number(n)*({万:10000,百万:1000000,k:1000,m:1000000}[scale??'']??1);
    const key=Number(hours)+'h';
    // Contradictory same-period pools are not a safe identity signal.
    if(out.has(key)&&out.get(key)!==value)out.set(key,NaN);else out.set(key,value);
  };
  for(const m of t.matchAll(new RegExp(amount+'\\s*(?:/|每|的滚动)\\s*'+interval,'g')))add(m[1],m[2],m[3]);
  for(const m of t.matchAll(new RegExp('(?:每|滚动)\\s*'+interval+'\\s*(?:额度)?\\s*'+amount,'g')))add(m[2],m[3],m[1]);
  return out;
}
export function sameRecurringCreditPlan(a: Incoming,b:DedupeCandidate):boolean {
  if(a.eventDay||b.eventDay||differentOccurrence(a,b)||a.type!=='standing'||b.type!=='standing'||a.claimMethod!==b.claimMethod||!a.claimMethod||a.audience!==b.audience||!a.audience)return false;
  const set=(xs:string[]|undefined)=>xs?.map(titleKey).sort().join('|');
  if(!a.models?.length||!b.models?.length||set(a.models)!==set(b.models)||!a.requirements?.length||set(a.requirements)!==set(b.requirements)||!a.modalities?.length||set(a.modalities)!==set(b.modalities))return false;
  const plan=(o:Incoming)=>{
    const match=(o.title+' '+o.evidenceUrl).toLowerCase().match(/(token|coding)[\s-]*plan/);
    return match?.[1];
  };
  if(!plan(a)||plan(a)!==plan(b))return false;
  const qualifiers=(o:Incoming)=>(o.title.match(/国际|国内|海外|中国|美区|学生|教师|企业|团队|个人|专属|返赠|返利|邀请|推荐|注册|首次|international|global|student|team|enterprise|referral|cashback/gi)??[]).map(titleKey).sort().join('|');
  if(qualifiers(a)!==qualifiers(b))return false;
  const A=creditQuotas(a.valueText),B=creditQuotas(b.valueText);
  const common=[...A.keys()].filter(key=>B.has(key));
  return common.length>0&&common.every(key=>Number.isFinite(A.get(key))&&A.get(key)===B.get(key));
}

// An abbreviated description of the same model-extension post must reuse the main ID.
// Model scope + offer type + channel/region/eligibility qualifiers protect independent offers.
export function sameModelAnnouncement(a:Incoming,b:DedupeCandidate):boolean {
  if(a.eventDay||b.eventDay||a.type!=='free'||b.type!=='free'||!['auto','signup'].includes(a.claimMethod??'')||!['auto','signup'].includes(b.claimMethod??''))return false;
  const post=officialStatusKey(a.evidenceUrl);if(!post||post!==officialStatusKey(b.evidenceUrl))return false;
  const modelKey=(o:Incoming)=>o.models?.map(titleKey).sort().join('|');
  if(!a.models?.length||modelKey(a)!==modelKey(b))return false;
  if(/重置|reset/i.test(a.title+' '+b.title))return false;
  const extended=(o:Incoming)=>/延长|延期|extend/i.test(o.title);
  if(extended(a)!==extended(b))return false;
  const qualifiers=(o:Incoming)=>(o.title.match(/\bapi\b|zen|\bapp\b|\bcli\b|\bweb\b|应用|插件|网页版|桌面|订阅|邀请码|国际|国内|海外|中国|美区|学生|教师|企业|团队|个人/gi)??[]).map(titleKey).sort().join('|');
  return qualifiers(a)===qualifiers(b);
}

// Rejected ordinary pricing/free-plan descriptions are remembered across short aliases.
// Only the same official page and claim scope qualify; real quotas/gifts remain independent.
function sameRejectedDescription(a:Incoming,b:DedupeCandidate):boolean {
  if(b.reviewState!=='rejected'||a.eventDay||b.eventDay||normUrl(a.evidenceUrl)!==normUrl(b.evidenceUrl))return false;
  const req=(o:Incoming)=>o.requirements?.map(titleKey).sort().join('|');
  if(!a.requirements?.length||req(a)!==req(b)||a.models?.length||b.models?.length)return false;
  const text=(o:Incoming)=>o.title+' '+o.valueText;
  const gift=(o:Incoming)=>/赠送|赠金|奖励|额外赠|bonus|grant|free credits|free trial|首次|试用/i.test(text(o));
  if(gift(a)||gift(b))return false;
  const rates=(o:Incoming)=>[...new Set([...text(o).matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m=>Number(m[1])).concat([...text(o).matchAll(/(\d+(?:\.\d+)?)\s*折/g)].map(m=>Number(m[1])).filter(n=>n>0&&n<=10).map(n=>Math.round((10-n)*10))))].sort((x,y)=>x-y).join('|');
  const launch=(o:Incoming)=>/api/i.test(text(o))&&/首发|发布|上线|launch/i.test(text(o))&&/折|discount|off/i.test(text(o));
  if(['perk','topup','trial'].includes(a.type??'')&&['perk','topup','trial'].includes(b.type??'')&&launch(a)&&launch(b)&&!/free|免费/i.test(text(a)+' '+text(b))&&rates(a)&&rates(a)===rates(b))return true;
  const basic=(o:Incoming)=>o.type==='standing'&&['auto','signup'].includes(o.claimMethod??'')
    && /免费层|免费档|免费版|free (?:tier|plan)/i.test(text(o))&&/限制|limited|limits?/i.test(text(o))
    && !/(?:\d[\d,.]*|[一二两三四五六七八九十百千万亿]+)\s*(?:credits?|tokens?|积分|次|张|个视频|个图像|美元)/i.test(o.valueText);
  return basic(a)&&basic(b);
}

export function findDuplicate<T extends DedupeCandidate>(o: Incoming, existing: T[]): T | undefined {
  // Prefer the accepted canonical record over a rejected duplicate alias.
  const ranked=[...existing].sort((a,b)=>(a.reviewState==='approved'?0:a.reviewState==='pending'?1:2)-(b.reviewState==='approved'?0:b.reviewState==='pending'?1:2));
  return ranked.find(e => e.platformId === o.platformId && !ambiguousReset(o,e) && (
    sameRejectedDescription(o,e) || sameModelAnnouncement(o,e) || sameRecurringCreditPlan(o,e) || (!o.eventDay&&!e.eventDay&&genericDailyCredits(o)&&genericDailyCredits(e)) || (!!monthlyApiScope(o)&&monthlyApiScope(o)===monthlyApiScope(e)) || sameRecurringAlias(o,e) || sameRepostedWeek(o,e) || (!differentOccurrence(o,e) && (
    (digits(e.title) === digits(o.title) && similarity(e.title, o.title) >= 0.85) ||
    (normUrl(e.evidenceUrl) === normUrl(o.evidenceUrl) && digits(e.valueText) === digits(o.valueText) && similarity(e.valueText, o.valueText) >= 0.85)))));
}

/** Exact source + title can identify a record mistakenly assigned to another platform. */
export function crossPlatformDuplicate<T extends DedupeCandidate>(o:Incoming,existing:T[]):T|undefined {
  if(o.eventDay)return undefined;
  return existing.find(e=>e.platformId!==o.platformId&&!e.eventDay&&e.reviewState==='approved'
    && normUrl(e.evidenceUrl)===normUrl(o.evidenceUrl)&&titleKey(e.title)===titleKey(o.title)&&!differentOccurrence(o,e));
}

/** 补全后的精确冲突只交审核处理，不能静默覆盖两个已有草稿或重复上架。 */
export function sameBenefit(a: {platformId:string;title:string;valueText:string;type:string;claimMethod:string;claimStart?:string|null;claimEnd?:string|null;publishedAt?:string|null;tags?:string[];evidence:{url:string}}, b: typeof a): boolean {
  const text=(value:string)=>value.normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
  return a.platformId===b.platformId && a.type===b.type && a.claimMethod===b.claimMethod
    && normUrl(a.evidence.url)===normUrl(b.evidence.url) && text(a.title)===text(b.title) && text(a.valueText)===text(b.valueText)
    && (a.claimStart??null)===(b.claimStart??null) && (a.claimEnd??null)===(b.claimEnd??null)
    && (!(a.tags?.includes('reset')||b.tags?.includes('reset')) || (a.publishedAt??null)===(b.publishedAt??null));
}
