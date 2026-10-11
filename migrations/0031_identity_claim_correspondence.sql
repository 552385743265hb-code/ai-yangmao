-- Candidate-only refusals remain anchored to their original decision/candidate.
-- These columns record bounded evidence for applying that same narrow refusal.
ALTER TABLE intake_candidates ADD COLUMN claim_identity_key TEXT;
UPDATE intake_candidates SET claim_identity_key=json_array(json_extract(facts_json,'$.issuerProductId.value'),json_extract(facts_json,'$.mechanism.value'),json_extract(facts_json,'$.occurrenceAnchor.value'))
 WHERE json_extract(facts_json,'$.issuerProductId.state')='known' AND json_extract(facts_json,'$.mechanism.state')='known' AND json_extract(facts_json,'$.occurrenceAnchor.state')='known';
CREATE INDEX candidates_claim_identity_idx ON intake_candidates(claim_identity_key,id);
ALTER TABLE identity_refusal_applications ADD COLUMN canonical_candidate_id TEXT REFERENCES intake_candidates(id);
ALTER TABLE identity_refusal_applications ADD COLUMN identity_basis_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(identity_basis_json));
