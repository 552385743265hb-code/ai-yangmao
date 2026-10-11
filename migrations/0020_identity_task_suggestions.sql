-- Suggestions are evidence for reviewers, never an approval or a replacement for decisions.
ALTER TABLE review_tasks ADD COLUMN suggestion_json TEXT CHECK(suggestion_json IS NULL OR json_valid(suggestion_json));
CREATE INDEX versions_entity_created_idx ON benefit_versions(entity_id,created_at DESC,id DESC);
