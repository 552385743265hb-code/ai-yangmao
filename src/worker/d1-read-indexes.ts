/** Idempotent recovery bootstrap; preserve every backfill consistency guard. */
export async function ensureRelatedReadIndexes(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare('CREATE INDEX IF NOT EXISTS reviews_offer_idx ON reviews(offer_id)'),
    db.prepare('CREATE INDEX IF NOT EXISTS leads_offer_idx ON leads(offer_id)'),
  ]);
}
