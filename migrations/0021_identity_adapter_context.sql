ALTER TABLE review_tasks ADD COLUMN lease_context_json TEXT CHECK(lease_context_json IS NULL OR json_valid(lease_context_json));
CREATE TABLE identity_extraction_leads (
 request_id TEXT NOT NULL REFERENCES intake_extractions(request_id), lead_id INTEGER NOT NULL REFERENCES leads(id), PRIMARY KEY(request_id,lead_id)
);
CREATE INDEX extraction_leads_lead_idx ON identity_extraction_leads(lead_id,request_id);
INSERT INTO identity_extraction_leads(request_id,lead_id)
 SELECT e.request_id,l.id FROM intake_extractions e,json_each(e.input_json,'$.leadIds') j JOIN leads l ON l.id=j.value;
