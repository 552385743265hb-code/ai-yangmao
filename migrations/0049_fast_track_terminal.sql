-- Preserve jobs and audit data; rejected is a terminal decision, never a retry.
CREATE TABLE fast_track_jobs_next (
  id TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL REFERENCES platforms(id),
  url TEXT NOT NULL,
  benefit TEXT NOT NULL CHECK(length(benefit) BETWEEN 2 AND 500),
  basis TEXT NOT NULL CHECK(basis IN ('official','tested')),
  note TEXT,
  owner_fields_json TEXT NOT NULL DEFAULT '{}',
  lead_id INTEGER REFERENCES leads(id),
  state TEXT NOT NULL CHECK(state IN ('queued','extracting','publishing','needs_owner','published','rejected')),
  lease_until TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  fields_json TEXT,
  progress_json TEXT,
  missing_json TEXT,
  error TEXT,
  offer_id TEXT REFERENCES offers(id),
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  identity_task_id TEXT,
  resolution_json TEXT
);
INSERT INTO fast_track_jobs_next(id,platform_id,url,benefit,basis,note,owner_fields_json,lead_id,state,lease_until,attempts,fields_json,progress_json,missing_json,error,offer_id,actor,created_at,updated_at,published_at,identity_task_id) SELECT id,platform_id,url,benefit,basis,note,owner_fields_json,lead_id,state,lease_until,attempts,fields_json,progress_json,missing_json,error,offer_id,actor,created_at,updated_at,published_at,identity_task_id FROM fast_track_jobs;
DROP TABLE fast_track_jobs;
ALTER TABLE fast_track_jobs_next RENAME TO fast_track_jobs;
CREATE INDEX fast_track_jobs_state ON fast_track_jobs(state,created_at);
