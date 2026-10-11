CREATE TABLE identity_public_state (
 id INTEGER PRIMARY KEY CHECK(id=1),
 generation INTEGER NOT NULL DEFAULT 0 CHECK(generation>=0)
);
INSERT INTO identity_public_state(id,generation) VALUES(1,0);
CREATE INDEX entities_platform_generation_idx ON benefit_entities(platform_id,routing_generation,id);
