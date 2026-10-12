-- Administrators and anonymous visitors share one public experience stream.
CREATE TABLE anonymous_comment_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id INTEGER NOT NULL UNIQUE CHECK(public_id BETWEEN 100000 AND 999999),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE offer_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  offer_id TEXT NOT NULL REFERENCES offers(id),
  anonymous_id INTEGER REFERENCES anonymous_comment_users(id),
  content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 500),
  request_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX offer_comments_public ON offer_comments(offer_id, deleted_at, id);
CREATE INDEX offer_comments_author ON offer_comments(anonymous_id, offer_id, id);
CREATE TABLE comment_rate_limits (
  key TEXT PRIMARY KEY,
  used INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX comment_rate_limits_expiry ON comment_rate_limits(expires_at);
-- Keep the legacy integration field while moving its display into the shared stream.
INSERT INTO offer_comments(offer_id, anonymous_id, content, request_key, created_at)
SELECT id, NULL, trim(admin_note), 'legacy:' || id, updated_at
FROM offers WHERE admin_note IS NOT NULL AND length(trim(admin_note)) > 0;
