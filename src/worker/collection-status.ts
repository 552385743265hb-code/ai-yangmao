/** Fetch freshness is distinct from a completely successful collection/extraction/verification run. */
export async function readCollectionStatus(db:D1Database){
 const safe="CASE WHEN json_valid(stats) THEN stats ELSE '{}' END";
 const [fetched,full,attempt]=await Promise.all([
  db.prepare(`SELECT finished_at FROM runs WHERE kind IN ('collect','sweep') AND finished_at IS NOT NULL AND (CAST(json_extract(${safe},'$.fetchedSources') AS INTEGER)>0 OR CAST(json_extract(${safe},'$.ok') AS INTEGER)>0 OR ok=1) ORDER BY finished_at DESC LIMIT 1`).first<{finished_at:string}>(),
  db.prepare("SELECT finished_at FROM runs WHERE kind='collect' AND ok=1 AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1").first<{finished_at:string}>(),
  db.prepare("SELECT finished_at,ok,stats FROM runs WHERE kind IN ('collect','sweep') AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1").first<{finished_at:string;ok:number;stats:string}>(),
 ]);
 let stats:{coverageDegraded?:boolean}={};try{stats=JSON.parse(attempt?.stats??'{}');}catch{/* Unknown coverage is not a successful complete run. */}
 return {lastCollectedAt:fetched?.finished_at??null,lastSuccessfulCollect:full?.finished_at??null,lastCollectionAttemptAt:attempt?.finished_at??null,coverageDegraded:!!attempt&&(!attempt.ok||!!stats.coverageDegraded)};
}
