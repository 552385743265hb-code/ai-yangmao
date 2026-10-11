// Additive identity tables. Migration 0017 also enforces append-only decisions.
import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { platforms, offers, leads } from './schema';

export const sourceDocuments = sqliteTable('source_documents', {
  id: text('id').primaryKey().notNull(),
  originalUrl: text('original_url').notNull(),
  urlKey: text('url_key').notNull(),
  firstSeenAt: text('first_seen_at').notNull().default(sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`),
  lastSeenAt: text('last_seen_at').notNull().default(sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`),
  issuerHint: text('issuer_hint'),
}, t => [
  uniqueIndex('source_documents_url_key_uq').on(t.urlKey),
]);

export const sourceObservations = sqliteTable('source_observations', {
  id: text('id').primaryKey().notNull(),
  documentId: text('document_id').notNull().references((): AnySQLiteColumn => sourceDocuments.id),
  contentHash: text('content_hash').notNull(),
  text: text('text').notNull(),
  textTruncated: integer('text_truncated').notNull(),
  fetchKind: text('fetch_kind').notNull(),
  finalUrl: text('final_url').notNull(),
  observedAt: text('observed_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
  trustJson: text('trust_json').notNull(),
}, t => [
  index('observations_document_idx').on(t.documentId, t.observedAt),
  uniqueIndex('source_observations_document_id_content_hash_fetch_kind_uq').on(t.documentId, t.contentHash, t.fetchKind),
  check('source_observations_check_0', sql`length(text)<=250000`),
  check('source_observations_check_1', sql`text_truncated IN (0,1)`),
  check('source_observations_check_2', sql`fetch_kind IN ('direct','indirect','unavailable')`),
  check('source_observations_check_3', sql`json_valid(trust_json)`),
]);

export const benefitEntities = sqliteTable('benefit_entities', {
  id: text('id').primaryKey().notNull(),
  platformId: text('platform_id').notNull().references((): AnySQLiteColumn => platforms.id),
  canonicalOfferId: text('canonical_offer_id').references((): AnySQLiteColumn => offers.id),
  seriesId: text('series_id'),
  currentApprovedVersionId: text('current_approved_version_id').references((): AnySQLiteColumn => benefitVersions.id),
  state: text('state').notNull().default(sql`'active'`),
  routingGeneration: integer('routing_generation').notNull().default(0),
  mergedInto: text('merged_into').references((): AnySQLiteColumn => benefitEntities.id),
  businessRevision: integer('business_revision').notNull().default(sql`0`),
  publicationRevision: integer('publication_revision').notNull().default(sql`0`),
  firstSeenAt: text('first_seen_at').notNull().default(sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`),
  lastSeenAt: text('last_seen_at').notNull().default(sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`),
}, t => [
  index('entities_platform_idx').on(t.platformId, t.state, t.id),
  index('entities_platform_generation_idx').on(t.platformId,t.routingGeneration,t.id),
  uniqueIndex('benefit_entities_canonical_offer_id_uq').on(t.canonicalOfferId),
  check('benefit_entities_check_0', sql`state IN ('active','merged')`),
  check('benefit_entities_check_1', sql`business_revision>=0`),
  check('benefit_entities_check_2', sql`publication_revision>=0`),
  check('benefit_entities_check_3', sql`(state='active' AND merged_into IS NULL) OR (state='merged' AND merged_into IS NOT NULL AND merged_into<>id)`),
]);

export const benefitVersions = sqliteTable('benefit_versions', {
  id: text('id').primaryKey().notNull(),
  entityId: text('entity_id').notNull().references((): AnySQLiteColumn => benefitEntities.id),
  termsSchema: text('terms_schema').notNull(),
  termsHash: text('terms_hash').notNull(),
  factsJson: text('facts_json').notNull(),
  displayCandidateJson: text('display_candidate_json').notNull(),
  state: text('state').notNull().default(sql`'pending'`),
  baseVersionId: text('base_version_id').references((): AnySQLiteColumn => benefitVersions.id),
  revision: integer('revision').notNull().default(sql`0`),
  createdAt: text('created_at').notNull().default(sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`),
}, t => [
  index('versions_entity_idx').on(t.entityId, t.state, t.id),
  uniqueIndex('benefit_versions_entity_id_terms_schema_terms_hash_uq').on(t.entityId, t.termsSchema, t.termsHash),
  check('benefit_versions_check_0', sql`terms_schema='terms-v1'`),
  check('benefit_versions_check_1', sql`json_valid(facts_json)`),
  check('benefit_versions_check_2', sql`json_valid(display_candidate_json)`),
  check('benefit_versions_check_3', sql`state IN ('pending','approved','rejected','superseded')`),
  check('benefit_versions_check_4', sql`revision>=0`),
]);

export const intakeCandidates = sqliteTable('intake_candidates', {
  id: text('id').primaryKey().notNull(),
  observationId: text('observation_id').notNull().references((): AnySQLiteColumn => sourceObservations.id),
  extractionVersion: text('extraction_version').notNull(),
  spanKey: text('span_key').notNull(),
  candidateKey: text('candidate_key').notNull(),
  rawCandidateJson: text('raw_candidate_json').notNull(),
  factsJson: text('facts_json').notNull(),
  factsHash: text('facts_hash').notNull(),
  state: text('state').notNull().default(sql`'received'`),
  entityId: text('entity_id').references((): AnySQLiteColumn => benefitEntities.id),
  versionId: text('version_id').references((): AnySQLiteColumn => benefitVersions.id),
  decisionId: text('decision_id').references((): AnySQLiteColumn => reviewDecisions.id),
  taskId: text('task_id').references((): AnySQLiteColumn => reviewTasks.id),
  attempts: integer('attempts').notNull().default(sql`0`),
  nextAttemptAt: text('next_attempt_at'),
  lastError: text('last_error'),
  revision: integer('revision').notNull().default(sql`0`),
  leaseToken: text('lease_token'),
  leaseUntil: text('lease_until'),
  receiptJson: text('receipt_json'),
}, t => [
  index('candidates_retry_idx').on(t.state, t.nextAttemptAt, t.id),
  uniqueIndex('intake_candidates_candidate_key_uq').on(t.candidateKey),
  check('intake_candidates_check_0', sql`json_valid(raw_candidate_json)`),
  check('intake_candidates_check_1', sql`json_valid(facts_json)`),
  check('intake_candidates_check_2', sql`state IN ('received','resolving','resolved_same','resolved_rejected','pending_initial','pending_change','pending_identity','deferred')`),
  check('intake_candidates_check_3', sql`attempts>=0`),
  check('intake_candidates_check_4', sql`revision>=0`),
  check('intake_candidates_check_5', sql`receipt_json IS NULL OR json_valid(receipt_json)`),
]);

export const leadCandidateLinks = sqliteTable('lead_candidate_links', {
  leadId: integer('lead_id').notNull().references((): AnySQLiteColumn => leads.id),
  candidateId: text('candidate_id').notNull().references((): AnySQLiteColumn => intakeCandidates.id),
}, t => [
  primaryKey({ columns: [t.leadId, t.candidateId] }),
]);

export const entityObservations = sqliteTable('entity_observations', {
  entityId: text('entity_id').notNull().references((): AnySQLiteColumn => benefitEntities.id),
  candidateId: text('candidate_id').notNull().references((): AnySQLiteColumn => intakeCandidates.id),
  relation: text('relation').notNull(),
  resolverVersion: text('resolver_version').notNull(),
  reasonJson: text('reason_json').notNull(),
  createdAt: text('created_at').notNull().default(sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`),
}, t => [
  primaryKey({ columns: [t.entityId, t.candidateId] }),
  check('entity_observations_check_0', sql`relation IN ('same','changed','evidence_only')`),
  check('entity_observations_check_1', sql`json_valid(reason_json)`),
]);

export const identityAliases = sqliteTable('identity_aliases', {
  id: text('id').primaryKey().notNull(),
  namespace: text('namespace').notNull(),
  aliasKey: text('alias_key').notNull(),
  scopeKey: text('scope_key').notNull(),
  entityId: text('entity_id').notNull().references((): AnySQLiteColumn => benefitEntities.id),
  basisJson: text('basis_json').notNull(),
  status: text('status').notNull().default(sql`'active'`),
  revision: integer('revision').notNull().default(sql`0`),
}, t => [
  index('aliases_entity_idx').on(t.entityId, t.status),
  uniqueIndex('aliases_legacy_global_uq').on(t.aliasKey).where(sql`namespace='legacy_offer_id' AND status='active'`),
  uniqueIndex('aliases_active_uq').on(t.namespace, t.aliasKey, t.scopeKey).where(sql`status='active'`),
  check('identity_aliases_check_0', sql`namespace IN ('legacy_offer_id','official_campaign','manual')`),
  check('identity_aliases_check_1', sql`json_valid(basis_json)`),
  check('identity_aliases_check_2', sql`status IN ('active','revoked')`),
  check('identity_aliases_check_3', sql`revision>=0`),
]);

export const reviewDecisions = sqliteTable('review_decisions', {
  reasonText:text('reason_text').notNull().default(''),
  basisJson:text('basis_json').notNull().default('{}'),
  id: text('id').primaryKey().notNull(),
  entityId: text('entity_id').references((): AnySQLiteColumn => benefitEntities.id),
  candidateId: text('candidate_id').references((): AnySQLiteColumn => intakeCandidates.id),
  versionId: text('version_id').references((): AnySQLiteColumn => benefitVersions.id),
  action: text('action').notNull(),
  reasonCode: text('reason_code').notNull(),
  scopeJson: text('scope_json').notNull(),
  reopenPolicyJson: text('reopen_policy_json').notNull(),
  rulesVersion: text('rules_version').notNull(),
  evidenceRefsJson: text('evidence_refs_json').notNull(),
  actor: text('actor').notNull(),
  baseVersionId: text('base_version_id').references((): AnySQLiteColumn => benefitVersions.id),
  targetVersionId: text('target_version_id').references((): AnySQLiteColumn => benefitVersions.id),
  idempotencyKey: text('idempotency_key').notNull(),
  supersedesId: text('supersedes_id').references((): AnySQLiteColumn => reviewDecisions.id),
  createdAt: text('created_at').notNull().default(sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`),
}, t => [
  index('decisions_candidate_idx').on(t.candidateId, t.createdAt),
  index('decisions_entity_idx').on(t.entityId, t.versionId, t.createdAt),
  uniqueIndex('review_decisions_idempotency_key_uq').on(t.idempotencyKey),
  check('review_decisions_check_0', sql`action IN ('approve','reject','same','distinct','reopen','revoke','merge','rollback','edit')`),
  check('review_decisions_check_1', sql`reason_code IN ('duplicate','paid_bundle','ordinary_discount','not_ai','insufficient_evidence','vague','expired','wrong_platform','other')`),
  check('review_decisions_check_2', sql`json_valid(scope_json)`),
  check('review_decisions_check_3', sql`json_valid(reopen_policy_json)`),
  check('review_decisions_check_4', sql`json_valid(evidence_refs_json)`),
  check('review_decisions_check_5', sql`entity_id IS NOT NULL OR candidate_id IS NOT NULL`),
]);

export const reviewTasks = sqliteTable('review_tasks', {
  suggestionJson: text('suggestion_json'),
  leaseContextJson: text('lease_context_json'),
  id: text('id').primaryKey().notNull(),
  taskKey: text('task_key').notNull(),
  kind: text('kind').notNull(),
  entityId: text('entity_id').references((): AnySQLiteColumn => benefitEntities.id),
  versionId: text('version_id').references((): AnySQLiteColumn => benefitVersions.id),
  baseVersionId: text('base_version_id').references((): AnySQLiteColumn => benefitVersions.id),
  state: text('state').notNull().default(sql`'open'`),
  revision: integer('revision').notNull().default(sql`0`),
  materialRevision: integer('material_revision').notNull().default(sql`1`),
  leaseToken: text('lease_token'),
  leaseUntil: text('lease_until'),
  decisionId: text('decision_id').references((): AnySQLiteColumn => reviewDecisions.id),
  createdAt: text('created_at').notNull().default(sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`),
}, t => [
  index('tasks_state_idx').on(t.state, t.kind, t.id),
  uniqueIndex('tasks_active_uq').on(t.taskKey).where(sql`state IN ('open','checking','manual')`),
  check('review_tasks_check_0', sql`kind IN ('identity','initial','terms_change','evidence_reopen','merge_conflict')`),
  check('review_tasks_check_1', sql`state IN ('open','checking','manual','resolved','cancelled')`),
  check('review_tasks_check_2', sql`revision>=0`),
  check('review_tasks_check_3', sql`material_revision>=1`),
]);

export const taskCandidates = sqliteTable('task_candidates', {
  taskId: text('task_id').notNull().references((): AnySQLiteColumn => reviewTasks.id),
  candidateId: text('candidate_id').notNull().references((): AnySQLiteColumn => intakeCandidates.id),
}, t => [
  primaryKey({ columns: [t.taskId, t.candidateId] }),
]);

export const identityConstraints = sqliteTable('identity_constraints', {
  id: text('id').primaryKey().notNull(),
  entityA: text('entity_a').references((): AnySQLiteColumn => benefitEntities.id),
  entityB: text('entity_b').references((): AnySQLiteColumn => benefitEntities.id),
  candidateA: text('candidate_a').references((): AnySQLiteColumn => intakeCandidates.id),
  candidateB: text('candidate_b').references((): AnySQLiteColumn => intakeCandidates.id),
  taskId: text('task_id').references((): AnySQLiteColumn => reviewTasks.id),
  relation: text('relation').notNull(),
  basisJson: text('basis_json').notNull(),
  actor: text('actor').notNull(),
  revision: integer('revision').notNull().default(sql`0`),
}, t => [
  uniqueIndex('constraints_candidates_uq').on(t.candidateA, t.candidateB).where(sql`candidate_a IS NOT NULL`),
  uniqueIndex('constraints_entities_uq').on(t.entityA, t.entityB).where(sql`entity_a IS NOT NULL`),
  check('identity_constraints_check_0', sql`relation IN ('same','different')`),
  check('identity_constraints_check_1', sql`json_valid(basis_json)`),
  check('identity_constraints_check_2', sql`revision>=0`),
  check('identity_constraints_check_3', sql`(entity_a IS NOT NULL AND entity_b IS NOT NULL AND entity_a<entity_b AND candidate_a IS NULL AND candidate_b IS NULL)
 OR (candidate_a IS NOT NULL AND candidate_b IS NOT NULL AND candidate_a<candidate_b AND entity_a IS NULL AND entity_b IS NULL)`),
]);

export const identityBlocks = sqliteTable('identity_blocks', {
  blockKey: text('block_key').primaryKey().notNull(),
  revision: integer('revision').notNull().default(sql`0`),
}, t => [
  check('identity_blocks_check_0', sql`revision>=0`),
]);

export const identityCommands = sqliteTable('identity_commands', {
  executionToken:text('execution_token'),
  requestId: text('request_id').primaryKey().notNull(),
  payloadHash: text('payload_hash').notNull(),
  state: text('state').notNull(),
  resultJson: text('result_json'),
  expectedJson: text('expected_json').notNull(),
  createdAt: text('created_at').notNull().default(sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`),
}, t => [
  check('identity_commands_check_0', sql`state IN ('staged','applied')`),
  check('identity_commands_check_1', sql`result_json IS NULL OR json_valid(result_json)`),
  check('identity_commands_check_2', sql`json_valid(expected_json)`),
]);

export const identityEvents = sqliteTable('identity_events', {
  id: text('id').primaryKey().notNull(),
  eventKey: text('event_key').notNull(),
  entityId: text('entity_id').references((): AnySQLiteColumn => benefitEntities.id),
  versionId: text('version_id').references((): AnySQLiteColumn => benefitVersions.id),
  taskId: text('task_id').references((): AnySQLiteColumn => reviewTasks.id),
  kind: text('kind').notNull(),
  payloadJson: text('payload_json').notNull(),
  status: text('status').notNull().default(sql`'pending'`),
  createdAt: text('created_at').notNull().default(sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`),
}, t => [
  index('events_status_idx').on(t.status, t.id),
  uniqueIndex('identity_events_event_key_uq').on(t.eventKey),
  check('identity_events_check_0', sql`kind IN ('review','new','changed','ending','ended','merge','rollback')`),
  check('identity_events_check_1', sql`json_valid(payload_json)`),
  check('identity_events_check_2', sql`status IN ('pending','delivered','blocked')`),
]);

export const intakeExtractions = sqliteTable('intake_extractions', {
  requestId: text('request_id').primaryKey().notNull().references(() => identityCommands.requestId),
  observationId: text('observation_id').notNull().references(() => sourceObservations.id),
  extractionVersion: text('extraction_version').notNull(),
  inputJson: text('input_json').notNull(),
  state: text('state', { enum: ['received', 'deferred'] }).notNull(),
  extractionComplete: integer('extraction_complete', { mode: 'boolean' }).notNull(),
  nextAttemptAt: text('next_attempt_at'), lastError: text('last_error'),
  revision: integer('revision').notNull().default(0),
}, t => [
  index('extractions_retry_idx').on(t.state,t.nextAttemptAt,t.requestId),
  index('extractions_observation_idx').on(t.observationId,t.requestId),
  check('extractions_json',sql`json_valid(input_json)`),
  check('extractions_state',sql`state IN ('received','deferred')`),
  check('extractions_complete',sql`extraction_complete IN (0,1)`),
  check('extractions_revision',sql`revision>=0`),
]);

export const identityExtractionLeads=sqliteTable('identity_extraction_leads',{
 requestId:text('request_id').notNull().references(()=>intakeExtractions.requestId),
 leadId:integer('lead_id').notNull().references(()=>leads.id),
},t=>[primaryKey({columns:[t.requestId,t.leadId]}),index('extraction_leads_lead_idx').on(t.leadId,t.requestId)]);

export const identityRefusalApplications=sqliteTable('identity_refusal_applications',{
 candidateId:text('candidate_id').notNull().references(()=>intakeCandidates.id),
 decisionId:text('decision_id').notNull().references(()=>reviewDecisions.id),
 factsHash:text('facts_hash').notNull(),rulesVersion:text('rules_version').notNull(),
},t=>[primaryKey({columns:[t.candidateId,t.decisionId]}),index('refusal_applications_decision_idx').on(t.decisionId,t.candidateId)]);
export const identityBackfillProgress=sqliteTable('identity_backfill_progress',{
 snapshotHash:text('snapshot_hash').primaryKey().notNull(),cursorJson:text('cursor_json').notNull(),manifestJson:text('manifest_json').notNull(),revision:integer('revision').notNull().default(0),
},()=>[check('backfill_cursor_json',sql`json_valid(cursor_json)`),check('backfill_manifest_json',sql`json_valid(manifest_json)`)]);
export const mergePlans=sqliteTable('merge_plans',{
 planHash:text('plan_hash').primaryKey().notNull(),snapshotHash:text('snapshot_hash').notNull(),planJson:text('plan_json').notNull(),approvedBy:text('approved_by'),status:text('status').notNull().default('preview'),revision:integer('revision').notNull().default(0),createdAt:text('created_at').notNull().default(sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`),
},()=>[check('merge_plan_json',sql`json_valid(plan_json)`),check('merge_plan_status',sql`status IN ('preview','approved','applied','rolled_back')`)]);
export const mergeOperations=sqliteTable('merge_operations',{
 id:text('id').primaryKey().notNull(),requestId:text('request_id').notNull().unique().references(()=>identityCommands.requestId),planHash:text('plan_hash').notNull().references(()=>mergePlans.planHash),groupId:text('group_id').notNull(),beforeManifest:text('before_manifest').notNull(),afterManifest:text('after_manifest').notNull(),state:text('state').notNull(),revision:integer('revision').notNull().default(0),createdAt:text('created_at').notNull().default(sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`),
},t=>[index('merge_operations_plan_idx').on(t.planHash,t.groupId),check('merge_operation_state',sql`state IN ('applied','rolled_back')`),check('merge_before_json',sql`json_valid(before_manifest)`),check('merge_after_json',sql`json_valid(after_manifest)`)]);
export const mergeMembers=sqliteTable('merge_members',{
 operationId:text('operation_id').notNull().references(()=>mergeOperations.id),entityId:text('entity_id').notNull().references(()=>benefitEntities.id),canonicalEntityId:text('canonical_entity_id').notNull().references(()=>benefitEntities.id),expectedRevision:integer('expected_revision').notNull(),postRevision:integer('post_revision').notNull(),
},t=>[primaryKey({columns:[t.operationId,t.entityId]}),index('merge_members_entity_idx').on(t.entityId,t.operationId)]);
export const identityVersionRoutes=sqliteTable('identity_version_routes',{
 operationId:text('operation_id').notNull().references(()=>mergeOperations.id),sourceEntityId:text('source_entity_id').notNull().references(()=>benefitEntities.id),sourceVersionId:text('source_version_id').notNull().references(()=>benefitVersions.id),canonicalEntityId:text('canonical_entity_id').notNull().references(()=>benefitEntities.id),canonicalVersionId:text('canonical_version_id').notNull().references(()=>benefitVersions.id),termsHash:text('terms_hash').notNull(),sourcePublicationRevision:integer('source_publication_revision'),canonicalPublicationRevision:integer('canonical_publication_revision'),status:text('status').notNull().default('active'),
},t=>[primaryKey({columns:[t.operationId,t.sourceVersionId,t.canonicalVersionId]}),index('version_routes_canonical_idx').on(t.canonicalEntityId,t.status,t.canonicalVersionId),check('version_routes_status',sql`status IN ('active','rolled_back')`)]);
export const mergeTaskSources=sqliteTable('merge_task_sources',{
 operationId:text('operation_id').notNull().references(()=>mergeOperations.id),canonicalTaskId:text('canonical_task_id').notNull().references(()=>reviewTasks.id),sourceTaskId:text('source_task_id').notNull().references(()=>reviewTasks.id),sourceMaterialRevision:integer('source_material_revision').notNull(),canonicalMaterialRevision:integer('canonical_material_revision').notNull(),status:text('status').notNull().default('active'),
},t=>[primaryKey({columns:[t.operationId,t.sourceTaskId]}),index('task_sources_canonical_idx').on(t.canonicalTaskId,t.status,t.sourceTaskId),check('merge_task_sources_status',sql`status IN ('active','rolled_back')`)]);
export const identityPublicState=sqliteTable('identity_public_state',{
 id:integer('id').primaryKey(),generation:integer('generation').notNull().default(0),
},()=>[check('identity_public_singleton',sql`id=1`),check('identity_public_generation',sql`generation>=0`)]);
