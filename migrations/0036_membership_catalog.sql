-- Structured membership is additive. Existing states/evidence remain untouched.
ALTER TABLE offers ADD COLUMN membership_requirement TEXT CHECK(membership_requirement IS NULL OR json_valid(membership_requirement));
CREATE TABLE membership_catalog (
 id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
 data_json TEXT NOT NULL CHECK(json_valid(data_json)), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO membership_catalog(id,revision,data_json) VALUES(1,0,'{"products":[],"plans":[]}');
CREATE TABLE membership_catalog_audit (
 id TEXT PRIMARY KEY NOT NULL, action TEXT NOT NULL, actor TEXT NOT NULL,
 before_json TEXT NOT NULL CHECK(json_valid(before_json)), after_json TEXT NOT NULL CHECK(json_valid(after_json)),
 at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TRIGGER membership_catalog_revision_audit AFTER UPDATE OF data_json ON membership_catalog
BEGIN
 INSERT INTO membership_catalog_audit(id,action,actor,before_json,after_json)
 VALUES(lower(hex(randomblob(16))),'catalog-update','authorized-admin',OLD.data_json,NEW.data_json);
END;
