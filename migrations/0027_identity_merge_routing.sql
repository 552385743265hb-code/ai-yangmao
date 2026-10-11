CREATE TABLE identity_version_routes (
 operation_id TEXT NOT NULL REFERENCES merge_operations(id),
 source_entity_id TEXT NOT NULL REFERENCES benefit_entities(id),
 source_version_id TEXT NOT NULL REFERENCES benefit_versions(id),
 canonical_entity_id TEXT NOT NULL REFERENCES benefit_entities(id),
 canonical_version_id TEXT NOT NULL REFERENCES benefit_versions(id),
 terms_hash TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','rolled_back')),
 PRIMARY KEY(operation_id,source_version_id,canonical_version_id)
);
CREATE INDEX version_routes_canonical_idx ON identity_version_routes(canonical_entity_id,status,canonical_version_id);
CREATE TABLE merge_task_sources (
 operation_id TEXT NOT NULL REFERENCES merge_operations(id),
 canonical_task_id TEXT NOT NULL REFERENCES review_tasks(id),
 source_task_id TEXT NOT NULL REFERENCES review_tasks(id),
 source_material_revision INTEGER NOT NULL CHECK(source_material_revision>=1),
 canonical_material_revision INTEGER NOT NULL CHECK(canonical_material_revision>=1),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','rolled_back')),
 PRIMARY KEY(operation_id,source_task_id)
);
CREATE INDEX task_sources_canonical_idx ON merge_task_sources(canonical_task_id,status,source_task_id);
