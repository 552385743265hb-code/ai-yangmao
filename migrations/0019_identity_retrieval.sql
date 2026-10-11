CREATE INDEX candidates_issuer_idx ON intake_candidates(json_extract(facts_json,'$.issuerProductId.value'),id);
CREATE INDEX decisions_scope_product_idx ON review_decisions(json_extract(scope_json,'$.productId'),id);
CREATE INDEX decisions_entity_cursor_idx ON review_decisions(entity_id,id);
CREATE INDEX decisions_candidate_cursor_idx ON review_decisions(candidate_id,id);
-- Rebuildable search aid; structured tables and exact aliases stay authoritative.
CREATE VIRTUAL TABLE identity_search USING fts5(entity_id UNINDEXED,platform_id UNINDEXED,search_text,tokenize='unicode61');
