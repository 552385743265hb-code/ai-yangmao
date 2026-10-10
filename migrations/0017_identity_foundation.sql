-- Additive identity layer. Apply after 0016 and before deploying its consumers.
CREATE TABLE source_documents (
 id TEXT PRIMARY KEY NOT NULL, original_url TEXT NOT NULL, url_key TEXT NOT NULL UNIQUE,
 first_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), issuer_hint TEXT
);
CREATE TABLE source_observations (
 id TEXT PRIMARY KEY NOT NULL, document_id TEXT NOT NULL REFERENCES source_documents(id),
 content_hash TEXT NOT NULL, text TEXT NOT NULL CHECK(length(text)<=250000), text_truncated INTEGER NOT NULL CHECK(text_truncated IN (0,1)),
 fetch_kind TEXT NOT NULL CHECK(fetch_kind IN ('direct','indirect','unavailable')), final_url TEXT NOT NULL,
 observed_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, trust_json TEXT NOT NULL CHECK(json_valid(trust_json)),
 UNIQUE(document_id,content_hash,fetch_kind)
);
CREATE INDEX observations_document_idx ON source_observations(document_id,observed_at);
CREATE TABLE benefit_entities (
 id TEXT PRIMARY KEY NOT NULL, platform_id TEXT NOT NULL REFERENCES platforms(id),
 canonical_offer_id TEXT UNIQUE REFERENCES offers(id), series_id TEXT,
 current_approved_version_id TEXT REFERENCES benefit_versions(id),
 state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','merged')),
 merged_into TEXT REFERENCES benefit_entities(id),
 business_revision INTEGER NOT NULL DEFAULT 0 CHECK(business_revision>=0),
 publication_revision INTEGER NOT NULL DEFAULT 0 CHECK(publication_revision>=0),
 first_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 CHECK((state='active' AND merged_into IS NULL) OR (state='merged' AND merged_into IS NOT NULL AND merged_into<>id))
);
CREATE INDEX entities_platform_idx ON benefit_entities(platform_id,state,id);
CREATE TABLE benefit_versions (
 id TEXT PRIMARY KEY NOT NULL, entity_id TEXT NOT NULL REFERENCES benefit_entities(id),
 terms_schema TEXT NOT NULL CHECK(terms_schema='terms-v1'), terms_hash TEXT NOT NULL,
 facts_json TEXT NOT NULL CHECK(json_valid(facts_json)), display_candidate_json TEXT NOT NULL CHECK(json_valid(display_candidate_json)),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected','superseded')),
 base_version_id TEXT REFERENCES benefit_versions(id), revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(entity_id,terms_schema,terms_hash)
);
CREATE INDEX versions_entity_idx ON benefit_versions(entity_id,state,id);
CREATE TABLE intake_candidates (
 id TEXT PRIMARY KEY NOT NULL, observation_id TEXT NOT NULL REFERENCES source_observations(id),
 extraction_version TEXT NOT NULL, span_key TEXT NOT NULL, candidate_key TEXT NOT NULL UNIQUE,
 raw_candidate_json TEXT NOT NULL CHECK(json_valid(raw_candidate_json)), facts_json TEXT NOT NULL CHECK(json_valid(facts_json)), facts_hash TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'received' CHECK(state IN ('received','resolving','resolved_same','resolved_rejected','pending_initial','pending_change','pending_identity','deferred')),
 entity_id TEXT REFERENCES benefit_entities(id), version_id TEXT REFERENCES benefit_versions(id), decision_id TEXT REFERENCES review_decisions(id), task_id TEXT REFERENCES review_tasks(id),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0), next_attempt_at TEXT, last_error TEXT,
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0), lease_token TEXT, lease_until TEXT,
 receipt_json TEXT CHECK(receipt_json IS NULL OR json_valid(receipt_json))
);
CREATE INDEX candidates_retry_idx ON intake_candidates(state,next_attempt_at,id);
CREATE TABLE lead_candidate_links (
 lead_id INTEGER NOT NULL REFERENCES leads(id), candidate_id TEXT NOT NULL REFERENCES intake_candidates(id), PRIMARY KEY(lead_id,candidate_id)
);
CREATE TABLE entity_observations (
 entity_id TEXT NOT NULL REFERENCES benefit_entities(id), candidate_id TEXT NOT NULL REFERENCES intake_candidates(id),
 relation TEXT NOT NULL CHECK(relation IN ('same','changed','evidence_only')), resolver_version TEXT NOT NULL,
 reason_json TEXT NOT NULL CHECK(json_valid(reason_json)), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(entity_id,candidate_id)
);
CREATE TABLE identity_aliases (
 id TEXT PRIMARY KEY NOT NULL, namespace TEXT NOT NULL CHECK(namespace IN ('legacy_offer_id','official_campaign','manual')),
 alias_key TEXT NOT NULL, scope_key TEXT NOT NULL, entity_id TEXT NOT NULL REFERENCES benefit_entities(id),
 basis_json TEXT NOT NULL CHECK(json_valid(basis_json)), status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0)
);
CREATE UNIQUE INDEX aliases_active_uq ON identity_aliases(namespace,alias_key,scope_key) WHERE status='active';
CREATE UNIQUE INDEX aliases_legacy_global_uq ON identity_aliases(alias_key) WHERE namespace='legacy_offer_id' AND status='active';
CREATE INDEX aliases_entity_idx ON identity_aliases(entity_id,status);
CREATE TABLE review_decisions (
 id TEXT PRIMARY KEY NOT NULL, entity_id TEXT REFERENCES benefit_entities(id), candidate_id TEXT REFERENCES intake_candidates(id), version_id TEXT REFERENCES benefit_versions(id),
 action TEXT NOT NULL CHECK(action IN ('approve','reject','same','distinct','reopen','revoke','merge','rollback','edit')),
 reason_code TEXT NOT NULL CHECK(reason_code IN ('duplicate','paid_bundle','ordinary_discount','not_ai','insufficient_evidence','vague','expired','wrong_platform','other')),
 scope_json TEXT NOT NULL CHECK(json_valid(scope_json)), reopen_policy_json TEXT NOT NULL CHECK(json_valid(reopen_policy_json)),
 rules_version TEXT NOT NULL, evidence_refs_json TEXT NOT NULL CHECK(json_valid(evidence_refs_json)), actor TEXT NOT NULL,
 base_version_id TEXT REFERENCES benefit_versions(id), target_version_id TEXT REFERENCES benefit_versions(id),
 idempotency_key TEXT NOT NULL UNIQUE, supersedes_id TEXT REFERENCES review_decisions(id),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), CHECK(entity_id IS NOT NULL OR candidate_id IS NOT NULL)
);
CREATE INDEX decisions_entity_idx ON review_decisions(entity_id,version_id,created_at);
CREATE INDEX decisions_candidate_idx ON review_decisions(candidate_id,created_at);
CREATE TRIGGER decisions_no_update BEFORE UPDATE ON review_decisions BEGIN SELECT RAISE(ABORT,'decisions are append only'); END;
CREATE TRIGGER decisions_no_delete BEFORE DELETE ON review_decisions BEGIN SELECT RAISE(ABORT,'decisions are append only'); END;
CREATE TABLE review_tasks (
 id TEXT PRIMARY KEY NOT NULL, task_key TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('identity','initial','terms_change','evidence_reopen','merge_conflict')),
 entity_id TEXT REFERENCES benefit_entities(id), version_id TEXT REFERENCES benefit_versions(id),
 base_version_id TEXT REFERENCES benefit_versions(id),
 state TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','checking','manual','resolved','cancelled')),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0), material_revision INTEGER NOT NULL DEFAULT 1 CHECK(material_revision>=1),
 lease_token TEXT, lease_until TEXT, decision_id TEXT REFERENCES review_decisions(id),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX tasks_active_uq ON review_tasks(task_key) WHERE state IN ('open','checking','manual');
CREATE INDEX tasks_state_idx ON review_tasks(state,kind,id);
CREATE TABLE task_candidates (
 task_id TEXT NOT NULL REFERENCES review_tasks(id), candidate_id TEXT NOT NULL REFERENCES intake_candidates(id), PRIMARY KEY(task_id,candidate_id)
);
CREATE TABLE identity_constraints (
 id TEXT PRIMARY KEY NOT NULL, entity_a TEXT REFERENCES benefit_entities(id), entity_b TEXT REFERENCES benefit_entities(id),
 candidate_a TEXT REFERENCES intake_candidates(id), candidate_b TEXT REFERENCES intake_candidates(id), task_id TEXT REFERENCES review_tasks(id),
 relation TEXT NOT NULL CHECK(relation IN ('same','different')), basis_json TEXT NOT NULL CHECK(json_valid(basis_json)), actor TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
 CHECK((entity_a IS NOT NULL AND entity_b IS NOT NULL AND entity_a<entity_b AND candidate_a IS NULL AND candidate_b IS NULL)
 OR (candidate_a IS NOT NULL AND candidate_b IS NOT NULL AND candidate_a<candidate_b AND entity_a IS NULL AND entity_b IS NULL))
);
CREATE UNIQUE INDEX constraints_entities_uq ON identity_constraints(entity_a,entity_b) WHERE entity_a IS NOT NULL;
CREATE UNIQUE INDEX constraints_candidates_uq ON identity_constraints(candidate_a,candidate_b) WHERE candidate_a IS NOT NULL;
CREATE TABLE identity_blocks (block_key TEXT PRIMARY KEY NOT NULL, revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0));
CREATE TABLE identity_commands (
 request_id TEXT PRIMARY KEY NOT NULL, payload_hash TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('staged','applied')),
 result_json TEXT CHECK(result_json IS NULL OR json_valid(result_json)), expected_json TEXT NOT NULL CHECK(json_valid(expected_json)),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE identity_events (
 id TEXT PRIMARY KEY NOT NULL, event_key TEXT NOT NULL UNIQUE, entity_id TEXT REFERENCES benefit_entities(id),
 version_id TEXT REFERENCES benefit_versions(id), task_id TEXT REFERENCES review_tasks(id),
 kind TEXT NOT NULL CHECK(kind IN ('review','new','changed','ending','ended','merge','rollback')),
 payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivered','blocked')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX events_status_idx ON identity_events(status,id);
ALTER TABLE reviews ADD COLUMN decision_id TEXT REFERENCES review_decisions(id);
CREATE UNIQUE INDEX reviews_decision_uq ON reviews(decision_id);
