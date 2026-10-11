import type {LeadResolution} from '../../shared/lead-review';
import {leadReviewVersion,type ReviewableLead} from '../../shared/lead-review';
import {canonicalOfferMap} from './canonical';
export async function canonicalLeadProjection<T extends ReviewableLead>(db:D1Database,leads:T[]){
 const origins=(l:T)=>l.resolution?.originOfferIds??l.resolution?.offerIds??[];
 const map=await canonicalOfferMap(db,leads.flatMap(l=>[...(l.offerId?[l.offerId]:[]),...origins(l)]));
 return leads.map(l=>({...l,originOfferId:l.originOfferId??l.offerId??null,identityReadVersion:leadReviewVersion(l),offerId:l.offerId?map.get(l.offerId)?.offerId??l.offerId:null,resolution:l.resolution?{...l.resolution,originOfferIds:origins(l),offerIds:[...new Set(origins(l).map(id=>map.get(id)?.offerId??id))]} as LeadResolution:null}));
}
