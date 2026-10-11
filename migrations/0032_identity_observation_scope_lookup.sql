CREATE INDEX decisions_observation_cursor_idx ON review_decisions(json_extract(scope_json,'$.observationId'),id);
