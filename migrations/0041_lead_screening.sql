-- Lead screening storage. Shadow mode records verdicts; nothing here closes or publishes offers.
ALTER TABLE leads ADD COLUMN url_key TEXT;
CREATE UNIQUE INDEX leads_url_key_uq ON leads(url_key) WHERE url_key IS NOT NULL;

CREATE TABLE screening_items (
  id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL CHECK (subject_kind IN ('lead', 'task')),
  subject_id TEXT NOT NULL,
  platform_id TEXT,
  origin TEXT,
  state TEXT NOT NULL CHECK (state IN ('awaiting_screen', 'cleared', 'awaiting_verify', 'owner', 'parked', 'closed')),
  tier TEXT NOT NULL CHECK (tier IN ('P0', 'P1', 'P2', 'P3')),
  deadline TEXT,
  signals_json TEXT NOT NULL DEFAULT '[]',
  urgency_quote TEXT,
  tier_by TEXT NOT NULL CHECK (tier_by IN ('gate0', 'screener', 'owner')),
  discovered_at TEXT NOT NULL,
  due_at TEXT NOT NULL,
  verify_until TEXT,
  park_expires_at TEXT,
  notified_at TEXT,
  renotified_at TEXT,
  not_urgent_at TEXT,
  suggestion TEXT CHECK (suggestion IN ('history', 'possibly_real', 'new_platform', 'screening_unavailable', 'unverified')),
  latest_decision_id TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE (subject_kind, subject_id)
);
CREATE INDEX screening_items_queue ON screening_items(state, tier, due_at);

CREATE TABLE screening_decisions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES screening_items(id),
  verdict TEXT NOT NULL,
  match_ref TEXT,
  rule_id TEXT,
  reason_category TEXT,
  occurrence_check TEXT,
  confidence REAL NOT NULL,
  evidence_quote TEXT NOT NULL,
  explanation TEXT NOT NULL,
  urgency_json TEXT NOT NULL,
  model TEXT NOT NULL,
  calibrated INTEGER NOT NULL,
  prompt_version TEXT NOT NULL,
  context_hash TEXT NOT NULL,
  downgrade_json TEXT NOT NULL DEFAULT '[]',
  mode TEXT NOT NULL CHECK (mode IN ('shadow', 'suggest', 'auto')),
  applied_action TEXT,
  applied_at TEXT,
  owner_outcome TEXT CHECK (owner_outcome IN ('confirmed', 'overridden', 'undone')),
  owner_category TEXT,
  owner_actor TEXT,
  owner_at TEXT,
  owner_reason TEXT,
  spot_check INTEGER NOT NULL DEFAULT 0,
  request_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE INDEX screening_decisions_item ON screening_decisions(item_id, created_at);
CREATE INDEX screening_decisions_applied ON screening_decisions(applied_at);

CREATE TABLE screening_rules (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('title_pattern', 'semantic')),
  scope_kind TEXT NOT NULL CHECK (scope_kind IN ('global', 'platform', 'source', 'origin')),
  scope_value TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  pattern TEXT,
  example_refs_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('proposed', 'active', 'retired', 'declined')),
  author TEXT,
  hits INTEGER NOT NULL DEFAULT 0,
  overrides INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  decided_at TEXT,
  decided_by TEXT,
  retired_reason TEXT
);

CREATE TABLE decision_labels (
  subject_kind TEXT NOT NULL CHECK (subject_kind IN ('lead', 'offer', 'candidate')),
  subject_id TEXT NOT NULL,
  category TEXT NOT NULL,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('owner', 'model', 'unknown')),
  label_source TEXT NOT NULL CHECK (label_source IN ('owner', 'inferred')),
  confidence REAL,
  justification TEXT,
  labeled_at TEXT NOT NULL,
  PRIMARY KEY (subject_kind, subject_id)
);

CREATE TABLE platform_profiles (
  platform_id TEXT PRIMARY KEY REFERENCES platforms(id),
  profile_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE platform_profile_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id TEXT NOT NULL REFERENCES platforms(id),
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  cites_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX platform_profile_events_platform ON platform_profile_events(platform_id, id);

CREATE TABLE screening_calibrations (
  model TEXT PRIMARY KEY,
  close_threshold REAL NOT NULL,
  new_threshold REAL NOT NULL,
  sample_size INTEGER NOT NULL,
  close_precision REAL NOT NULL,
  wrong_new_rate REAL NOT NULL,
  recurring_false_closes INTEGER NOT NULL,
  computed_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('proposed', 'active', 'retired')),
  approved_by TEXT,
  approved_at TEXT
);
