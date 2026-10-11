ALTER TABLE identity_commands ADD COLUMN execution_token TEXT;
CREATE INDEX entities_platform_cursor_idx ON benefit_entities(platform_id,id);
