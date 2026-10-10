import {drizzle} from 'drizzle-orm/d1';
import {offers} from '../../../src/db/schema';
import {terms,known} from './terms';
import {displayOffer} from './offer';
import {hashTerms} from '../../../src/shared/identity/normalize';
import {buildMergePlan} from '../../../src/worker/identity/merge-plan';
import type {identityDb} from './db';
export async function seedMerge(f:ReturnType<typeof identityDb>,count=2){
 f.sqlite.exec("UPDATE leads SET status='linked'");
 const ids=Array.from({length:count},(_,i)=>'entity-'+i);
 for(const [index,id] of ids.entries()){const fact=terms();fact.occurrenceAnchor=known('same-campaign');const offerId='offer-'+index,version='version-'+index;
  await drizzle(f.db).insert(offers).values({...displayOffer(),id:offerId,reviewState:'approved',lastVerifiedAt:new Date().toISOString()});
  f.sqlite.prepare("INSERT INTO benefit_entities(id,platform_id,canonical_offer_id,publication_revision) VALUES(?,'vendor',?,?)").run(id,offerId,index+1);
  f.sqlite.prepare("INSERT INTO benefit_versions(id,entity_id,terms_schema,terms_hash,facts_json,display_candidate_json,state) VALUES(?,?,'terms-v1',?,? ,?,'approved')").run(version,id,await hashTerms(fact),JSON.stringify(fact),JSON.stringify({...displayOffer(),id:offerId}));
  f.sqlite.prepare('UPDATE benefit_entities SET current_approved_version_id=? WHERE id=?').run(version,id);
  f.sqlite.prepare("INSERT INTO reviews(offer_id,action,reviewer,reason) VALUES(?,'approve','fixture-admin','原审核记录')").run(offerId);
 }
 f.sqlite.prepare("INSERT INTO identity_events(id,event_key,entity_id,version_id,kind,payload_json) VALUES('root-new','offer:entity-0:1:new:telegram','entity-0','version-0','new',?)").run(JSON.stringify({entityId:'entity-0',versionId:'version-0',publicationRevision:1,decisionId:'original-fixture-decision',channel:'telegram'}));return ids;
}
export const mergeInput=(ids:string[])=>({environment:'synthetic' as const,snapshotHash:'d'.repeat(64),sourceCodeSha:'c557eeff6a40b858ddb20090d469b7c6dca544a5',groups:[{entityIds:ids,canonicalEntityId:ids[0],canonicalReason:'已核对同次发放，保留原公开主链接',evidence:{relation:'same' as const,author:'fixture-admin',quote:'Both URLs describe the same campaign and the same terms.',sourceUrls:['https://vendor.example/campaign']}}]});
export const mergePlan=(f:ReturnType<typeof identityDb>,ids:string[])=>buildMergePlan(f.db,mergeInput(ids));
