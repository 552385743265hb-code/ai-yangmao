-- Rebuild only the version table constraint; V1 rows/hashes/decisions are retained verbatim.
PRAGMA defer_foreign_keys=ON;
CREATE TABLE benefit_versions_membership (
 id TEXT PRIMARY KEY NOT NULL, entity_id TEXT NOT NULL REFERENCES benefit_entities(id),
 terms_schema TEXT NOT NULL CHECK(terms_schema IN ('terms-v1','terms-v2')), terms_hash TEXT NOT NULL,
 facts_json TEXT NOT NULL CHECK(json_valid(facts_json)), display_candidate_json TEXT NOT NULL CHECK(json_valid(display_candidate_json)),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected','superseded')),
 base_version_id TEXT REFERENCES benefit_versions(id), revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(entity_id,terms_schema,terms_hash)
);
INSERT INTO benefit_versions_membership SELECT * FROM benefit_versions;
DROP TABLE benefit_versions;
ALTER TABLE benefit_versions_membership RENAME TO benefit_versions;
CREATE INDEX versions_entity_idx ON benefit_versions(entity_id,state,id);
CREATE INDEX versions_entity_created_idx ON benefit_versions(entity_id,created_at DESC,id DESC);
CREATE TABLE membership_version_migrations (
 old_version_id TEXT PRIMARY KEY NOT NULL REFERENCES benefit_versions(id),
 new_version_id TEXT NOT NULL REFERENCES benefit_versions(id),
 offer_id TEXT NOT NULL REFERENCES offers(id),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
PRAGMA defer_foreign_keys=OFF;
