-- Decisions remain append-only; retain human rationale and the exact reviewed basis.
ALTER TABLE review_decisions ADD COLUMN reason_text TEXT NOT NULL DEFAULT '';
ALTER TABLE review_decisions ADD COLUMN basis_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(basis_json));
CREATE INDEX decisions_supersedes_idx ON review_decisions(supersedes_id);
