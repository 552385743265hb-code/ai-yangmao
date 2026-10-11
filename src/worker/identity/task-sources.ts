/** Read-only provenance closure, with UNION deduplication even for corrupt cycles. */
export const taskSourcesCte=`WITH RECURSIVE task_sources(id) AS (
 SELECT ?1
 UNION SELECT r.source_task_id FROM review_task_sources r JOIN task_sources p ON r.task_id=p.id
 UNION SELECT m.source_task_id FROM merge_task_sources m JOIN task_sources p ON m.canonical_task_id=p.id WHERE m.status='active'
)`;
