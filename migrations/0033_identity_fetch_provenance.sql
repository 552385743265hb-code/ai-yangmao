ALTER TABLE source_observations ADD COLUMN fetch_provenance_json TEXT CHECK(fetch_provenance_json IS NULL OR json_valid(fetch_provenance_json));
CREATE TABLE source_observation_fetches (
 id TEXT PRIMARY KEY NOT NULL,
 observation_id TEXT NOT NULL REFERENCES source_observations(id),
 request_id TEXT NOT NULL UNIQUE REFERENCES identity_commands(request_id),
 provenance_json TEXT NOT NULL CHECK(json_valid(provenance_json)),
 observed_at TEXT NOT NULL
);
CREATE INDEX observation_fetches_parent_idx ON source_observation_fetches(observation_id,id);
ALTER TABLE intake_candidates ADD COLUMN source_fetch_id TEXT REFERENCES source_observation_fetches(id);
CREATE TRIGGER observation_fetches_no_update BEFORE UPDATE ON source_observation_fetches BEGIN SELECT RAISE(ABORT,'fetch provenance is immutable'); END;
CREATE TRIGGER observation_fetches_no_delete BEFORE DELETE ON source_observation_fetches BEGIN SELECT RAISE(ABORT,'fetch provenance is retained'); END;
