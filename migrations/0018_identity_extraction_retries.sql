-- Persist incomplete extraction context even when there are no candidates to queue.
CREATE TABLE intake_extractions (
 request_id TEXT PRIMARY KEY NOT NULL REFERENCES identity_commands(request_id),
 observation_id TEXT NOT NULL REFERENCES source_observations(id), extraction_version TEXT NOT NULL,
 input_json TEXT NOT NULL CHECK(json_valid(input_json)),
 state TEXT NOT NULL CHECK(state IN ('received','deferred')),
 extraction_complete INTEGER NOT NULL CHECK(extraction_complete IN (0,1)),
 next_attempt_at TEXT, last_error TEXT, revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0)
);
CREATE INDEX extractions_retry_idx ON intake_extractions(state,next_attempt_at,request_id);
CREATE INDEX extractions_observation_idx ON intake_extractions(observation_id,request_id);
