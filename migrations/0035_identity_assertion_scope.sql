-- Raw material hints partition incomplete assertions only, never activity IDs.
-- NULL legacy hints are compared against retained raw input lazily; no original rewrite.
ALTER TABLE intake_candidates ADD COLUMN assertion_scope_key TEXT;
CREATE INDEX candidates_assertion_scope_idx ON intake_candidates(claim_family_key,assertion_facts_hash,assertion_scope_key);
