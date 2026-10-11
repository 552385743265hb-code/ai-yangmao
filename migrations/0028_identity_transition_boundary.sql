-- Publication counters are scoped to their own entity; they are never compared
-- across entities to infer equivalent versions. These freeze the merge boundary.
ALTER TABLE identity_version_routes ADD COLUMN source_publication_revision INTEGER CHECK(source_publication_revision IS NULL OR source_publication_revision>=0);
ALTER TABLE identity_version_routes ADD COLUMN canonical_publication_revision INTEGER CHECK(canonical_publication_revision IS NULL OR canonical_publication_revision>=0);
UPDATE identity_version_routes SET
 source_publication_revision=(SELECT json_extract(member.value,'$.entity.publication_revision') FROM merge_operations op,json_each(op.before_manifest,'$.expected') member WHERE op.id=identity_version_routes.operation_id AND json_extract(member.value,'$.entity.id')=identity_version_routes.source_entity_id),
 canonical_publication_revision=(SELECT json_extract(member.value,'$.entity.publication_revision') FROM merge_operations op,json_each(op.before_manifest,'$.expected') member WHERE op.id=identity_version_routes.operation_id AND json_extract(member.value,'$.entity.id')=identity_version_routes.canonical_entity_id);
