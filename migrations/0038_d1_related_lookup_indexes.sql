-- Backfill previews and transactional guards look up related rows by offer_id.
-- IF NOT EXISTS also permits the quota-recovery runtime to install these first.
CREATE INDEX IF NOT EXISTS reviews_offer_idx ON reviews(offer_id);
CREATE INDEX IF NOT EXISTS leads_offer_idx ON leads(offer_id);
