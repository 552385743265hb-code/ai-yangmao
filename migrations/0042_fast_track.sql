-- Administrator fast-track: an owner-verified official URL plus a one-line benefit goes live as soon as
-- a free model has filled the basic fields; screening, verification and the identity gate are skipped.
CREATE TABLE fast_track_jobs (
  id TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL REFERENCES platforms(id),
  url TEXT NOT NULL,
  benefit TEXT NOT NULL CHECK(length(benefit) BETWEEN 2 AND 500),
  basis TEXT NOT NULL CHECK(basis IN ('official','tested')),
  note TEXT,
  owner_fields_json TEXT NOT NULL DEFAULT '{}',
  lead_id INTEGER REFERENCES leads(id),
  state TEXT NOT NULL CHECK(state IN ('queued','extracting','publishing','needs_owner','published')),
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
  published_at TEXT
);
CREATE INDEX fast_track_jobs_state ON fast_track_jobs(state, created_at);
ALTER TABLE offers ADD COLUMN fast_tracked_at TEXT;
