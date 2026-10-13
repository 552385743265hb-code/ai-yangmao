import {membershipPublicationError} from './membership';
import {needsEvidence} from '../shared/review-preparation';
import {canonicalOffers} from './identity/canonical';
import { drizzle } from 'drizzle-orm/d1';
import { and,eq } from 'drizzle-orm';
import * as s from '../db/schema';
import type { Env } from './index';
import { offerIn } from '../shared/ingest';
import { sameBenefit } from '../shared/dedupe';
import { officialTier } from '../shared/official-review';
import { blocking,checkOffer } from '../shared/spec';
const db=(env:Pick<Env,'DB'>)=>drizzle(env.DB,{schema:s});
type OfferRow=typeof s.offers.$inferSelect;

export const validateStoredOffer = (offer: OfferRow) => offerIn.safeParse({
  ...offer, firstChannel: offer.firstChannel ?? undefined, sourceId: offer.sourceId ?? undefined,
});

/** 管理员通过时的门槛：平台已准入、证据是该平台的官方出处。不能靠 reviewState 绕过准入。 */
export async function publicationError(env: Pick<Env, 'DB'>, offer: OfferRow, options:{preserveExistingMembership?:boolean;preserveExistingEvidence?:boolean}={}): Promise<string | null> {
  const valid = validateStoredOffer(offer);
  if (!valid.success) return '活动字段或日期不符合共享校验规则';
  const membershipIssue=options.preserveExistingMembership?null:await membershipPublicationError(env.DB,offer);if(membershipIssue)return membershipIssue;
  if (offer.verifyResult === 'evidence_missing' && !options.preserveExistingEvidence) return '当前官方页面未能再次确认原条款，先核验再通过';
  const [platform] = await db(env).select().from(s.platforms).where(eq(s.platforms.id, offer.platformId));
  if (!platform || platform.status !== 'approved') return '平台尚未准入';
  if (offer.evidence.tier === 'media') return '媒体或社区转述不能作为上架证据，请先补齐官方出处';
  const published=await db(env).select().from(s.offers).where(and(eq(s.offers.platformId,offer.platformId),eq(s.offers.reviewState,'approved'),canonicalOffers));
  const duplicate=published.find(other=>other.id!==offer.id&&sameBenefit(offer,other));
  if(duplicate)return `与已上架的 ${duplicate.id} 是同一活动，请先核对合并，避免重复上架`;
  const block = blocking(checkOffer(offer));
  if (block.length) return block.map(i => `${i.label}：${i.problem}`).join('；');
  // 自动补证要求领取/资格原文；最终人工审批可核对图片条件，但缺少核心权益原文仍先补证。
  // 管理员亲测仍通过 tested 显式确认，模型不能设置 tested。
  if(needsEvidence(options.preserveExistingEvidence?{...offer,verifyResult:null}:offer,false))return '官方权益原文不足，请等待系统补证或补充准确证据后再通过';
  let url: URL;
  try { url = new URL(offer.evidence.url); } catch { return '官方证据链接无效'; }
  if (!['https:', 'http:'].includes(url.protocol)) return '官方证据必须是网页链接';
  // 管理员亲自领到过：链接可以是官网下载页或社区帖子，不要求属于平台官方出处
  if (offer.evidence.tier === 'tested') return null;
  // 公众号图片等仍由管理员确认；自动流程不能以公众号名推断任意文章作者。
  if (offer.evidence.tier === 'official' && url.hostname === 'mp.weixin.qq.com' && platform.wechat) return null;
  const official = await db(env).select({ url: s.sources.url, tier: s.sources.tier }).from(s.sources).where(eq(s.sources.platformId, platform.id));
  const tier=officialTier(url.href,platform,official);
  if (tier && (offer.evidence.tier!=='staff'||tier==='staff')) return null;
  return '证据链接不属于该平台的官网或已登记官方信源';
}

