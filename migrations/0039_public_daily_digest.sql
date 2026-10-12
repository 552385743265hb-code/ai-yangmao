-- A singleton frozen daily report; public readers see only the allowlisted public projection.
-- The private notice is retained to reuse existing atomic notification claiming.
CREATE TABLE daily_digest (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  day TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
