CREATE TABLE identity_backfill_progress (
 snapshot_hash TEXT PRIMARY KEY NOT NULL,
 cursor_json TEXT NOT NULL CHECK(json_valid(cursor_json)),
 manifest_json TEXT NOT NULL CHECK(json_valid(manifest_json)),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0)
);
CREATE TABLE merge_plans (
 plan_hash TEXT PRIMARY KEY NOT NULL,
 snapshot_hash TEXT NOT NULL,
 plan_json TEXT NOT NULL CHECK(json_valid(plan_json)),
 approved_by TEXT,
 status TEXT NOT NULL DEFAULT 'preview' CHECK(status IN ('preview','approved','applied','rolled_back')),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE merge_operations (
 id TEXT PRIMARY KEY NOT NULL,
 request_id TEXT NOT NULL UNIQUE REFERENCES identity_commands(request_id),
 plan_hash TEXT NOT NULL REFERENCES merge_plans(plan_hash),
 group_id TEXT NOT NULL,
 before_manifest TEXT NOT NULL CHECK(json_valid(before_manifest)),
 after_manifest TEXT NOT NULL CHECK(json_valid(after_manifest)),
 state TEXT NOT NULL CHECK(state IN ('applied','rolled_back')),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX merge_operations_plan_idx ON merge_operations(plan_hash,group_id);
CREATE TABLE merge_members (
 operation_id TEXT NOT NULL REFERENCES merge_operations(id),
 entity_id TEXT NOT NULL REFERENCES benefit_entities(id),
 canonical_entity_id TEXT NOT NULL REFERENCES benefit_entities(id),
 expected_revision INTEGER NOT NULL CHECK(expected_revision>=0),
 post_revision INTEGER NOT NULL CHECK(post_revision>=0),
 PRIMARY KEY(operation_id,entity_id)
);
CREATE INDEX merge_members_entity_idx ON merge_members(entity_id,operation_id);
