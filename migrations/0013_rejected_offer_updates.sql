CREATE TABLE rejected_offer_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  offer_id TEXT NOT NULL REFERENCES offers(id),
  evidence TEXT NOT NULL,
  diff TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX rejected_updates_offer_idx ON rejected_offer_updates(offer_id);
