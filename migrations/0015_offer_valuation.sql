-- Structured V1 benefit valuation. Null keeps legacy offers unchanged until reviewed.
ALTER TABLE offers ADD COLUMN valuation TEXT;
