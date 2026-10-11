-- A broad refusal can apply without asserting that two occurrences are one entity.
CREATE TABLE identity_refusal_applications (
 candidate_id TEXT NOT NULL REFERENCES intake_candidates(id),
 decision_id TEXT NOT NULL REFERENCES review_decisions(id),
 facts_hash TEXT NOT NULL,
 rules_version TEXT NOT NULL,
 PRIMARY KEY(candidate_id,decision_id)
);
CREATE INDEX refusal_applications_decision_idx ON identity_refusal_applications(decision_id,candidate_id);
