-- Restoration tasks reference retained evidence; never move/delete original candidates.
CREATE TABLE review_task_sources (
 task_id TEXT NOT NULL REFERENCES review_tasks(id),
 source_task_id TEXT NOT NULL REFERENCES review_tasks(id),
 PRIMARY KEY(task_id,source_task_id),
 CHECK(task_id<>source_task_id)
);
CREATE INDEX review_task_sources_reverse_idx ON review_task_sources(source_task_id,task_id);
CREATE INDEX deliveries_channel_status_idx ON deliveries(channel,status,id);
CREATE INDEX events_entity_status_idx ON identity_events(entity_id,status,id);
