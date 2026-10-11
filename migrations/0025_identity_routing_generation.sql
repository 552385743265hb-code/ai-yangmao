ALTER TABLE benefit_entities ADD COLUMN routing_generation INTEGER NOT NULL DEFAULT 0 CHECK(routing_generation>=0);
CREATE INDEX entities_merged_into_idx ON benefit_entities(merged_into,id);
