import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { ensureRelatedReadIndexes } from '../src/worker/d1-read-indexes';

const migrationName = '0038_d1_related_lookup_indexes.sql';
const migration = readFileSync(new URL(`../migrations/${migrationName}`, import.meta.url), 'utf8');
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of readdirSync(new URL('../migrations/', import.meta.url)).filter(n => /^\d+_.+\.sql$/.test(n) && n < migrationName).sort()) {
    sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  }
  sqlite.exec('PRAGMA foreign_keys=OFF');
  for (const table of ['reviews', 'leads']) {
    // Foreign keys are disabled in this isolated query-plan fixture.
    if (table === 'reviews') sqlite.exec("INSERT INTO reviews(offer_id,action) VALUES ('target','approve'),('other','reject')");
    else sqlite.exec("INSERT INTO leads(offer_id,origin,url) VALUES ('target','manual','https://example.com/1'),('other','manual','https://example.com/2')");
  }
  return sqlite;
}
function plan(sqlite: DatabaseSync, sql: string) {
  return sqlite.prepare(`EXPLAIN QUERY PLAN ${sql}`).all('target').map(row => String(row.detail)).join('\n');
}
function adapter(sqlite: DatabaseSync) {
  return {
    prepare(sql: string) { return { sql }; },
    async batch(statements: { sql: string }[]) {
      sqlite.exec('BEGIN');
      try { for (const statement of statements) sqlite.exec(statement.sql); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
      return [];
    },
  } as unknown as D1Database;
}
function definitions(sqlite: DatabaseSync) {
  return sqlite.prepare("SELECT name,tbl_name,sql FROM sqlite_master WHERE name IN ('reviews_offer_idx','leads_offer_idx') ORDER BY name").all();
}

describe('D1 related-row read indexes', () => {
  it('replaces preview and transactional guard scans with indexed lookups without changing results', () => {
    const sqlite = fixture();
    try {
      for (const table of ['reviews', 'leads']) {
        const queries = [
          `SELECT * FROM ${table} WHERE offer_id=? ORDER BY id LIMIT 1001`,
          `SELECT count(*) FROM ${table} WHERE offer_id=?`,
          `SELECT NOT EXISTS(SELECT 1 FROM ${table} t WHERE t.offer_id=? AND NOT EXISTS(SELECT 1 FROM json_each('[{"id":1}]') j WHERE t.id IS json_extract(j.value,'$.id')))`,
        ];
        const before = queries.map(sql => sqlite.prepare(sql).all('target'));
        for (const sql of queries) expect(plan(sqlite, sql)).toMatch(/SCAN (?:reviews|leads|t)/);
        sqlite.exec(`CREATE INDEX ${table}_offer_idx ON ${table}(offer_id)`);
        queries.forEach((sql, index) => {
          expect(plan(sqlite, sql)).toContain(`${table}_offer_idx`);
          expect(plan(sqlite, sql)).not.toMatch(/SCAN (?:reviews|leads|t)(?:\s|$)/);
          expect(sqlite.prepare(sql).all('target')).toEqual(before[index]);
        });
      }
    } finally { sqlite.close(); }
  });

  it('allows repeated bootstrap and migration in either order with identical indexes and unchanged rows', async () => {
    const runtime = fixture(), migrated = fixture();
    try {
      const before = runtime.prepare('SELECT * FROM reviews').all();
      await ensureRelatedReadIndexes(adapter(runtime));
      await ensureRelatedReadIndexes(adapter(runtime));
      runtime.exec(migration);
      migrated.exec(migration);
      await ensureRelatedReadIndexes(adapter(migrated));
      expect(definitions(runtime)).toEqual(definitions(migrated));
      expect(definitions(runtime)).toHaveLength(2);
      expect(runtime.prepare('SELECT * FROM reviews').all()).toEqual(before);
    } finally { runtime.close(); migrated.close(); }
  });
});
