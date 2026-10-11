-- Candidate assertion variants; activity identity remains in benefit_entities.
ALTER TABLE intake_candidates ADD COLUMN claim_family_key TEXT;
ALTER TABLE intake_candidates ADD COLUMN assertion_facts_hash TEXT;
UPDATE intake_candidates SET claim_family_key=candidate_key,assertion_facts_hash=facts_hash;
CREATE INDEX candidates_family_facts_idx ON intake_candidates(claim_family_key,assertion_facts_hash,id);
