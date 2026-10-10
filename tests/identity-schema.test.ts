import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const files = readdirSync(new URL('../migrations/', import.meta.url)).filter(n => /^\d+_.+\.sql$/.test(n)).sort();
function migrate(db: DatabaseSync, names = files) { for (const n of names) db.exec(readFileSync(new URL(`../migrations/${n}`, import.meta.url), 'utf8')); }
describe('identity additive migration', () => {
  it('A20 fresh and 0016 upgrade preserve history and expose all identity tables', () => {
    for (const upgrade of [false,true]) {
      const db = new DatabaseSync(':memory:'); db.exec('PRAGMA foreign_keys=ON');
      if (upgrade) {
        migrate(db, files.filter(n => n.slice(0,4) <= '0016'));
        db.exec("INSERT INTO platforms(id,name,type) VALUES('kept','Kept','lab')");
        migrate(db, files.filter(n => n.slice(0,4) > '0016'));
        expect(db.prepare('SELECT name FROM platforms').get()).toEqual({ name: 'Kept' });
      } else migrate(db);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x => x.name);
      for (const name of ['source_documents','source_observations','intake_candidates','lead_candidate_links','benefit_entities','benefit_versions','entity_observations','identity_aliases','review_decisions','review_tasks','task_candidates','identity_constraints','identity_blocks','identity_commands','identity_events']) expect(tables).toContain(name);
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]); db.close();
    }
  });
  it('A24 strong aliases enforce uniqueness, legacy offer identity is global, resolved task keys can be reused', () => {
    const db = new DatabaseSync(':memory:'); migrate(db);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name='identity_aliases'").get()).toBeDefined();
    db.exec("PRAGMA foreign_keys=ON; INSERT INTO platforms(id,name,type) VALUES('vendor','Vendor','lab'); INSERT INTO benefit_entities(id,platform_id) VALUES('e1','vendor'),('e2','vendor')");
    const alias = db.prepare("INSERT INTO identity_aliases(id,namespace,alias_key,scope_key,entity_id,basis_json,status) VALUES(?,'legacy_offer_id','old',?,?,'{}','active')");
    alias.run('a1','vendor','e1');
    expect(() => alias.run('a2','another-product','e2')).toThrow(/UNIQUE/);
    db.exec("INSERT INTO review_tasks(id,task_key,kind,entity_id) VALUES('t1','initial:e1','initial','e1')");
    expect(() => db.exec("INSERT INTO review_tasks(id,task_key,kind,entity_id) VALUES('t2','initial:e1','initial','e1')")).toThrow(/UNIQUE/);
    db.exec("UPDATE review_tasks SET state='resolved' WHERE id='t1'; INSERT INTO review_tasks(id,task_key,kind,entity_id) VALUES('t2','initial:e1','initial','e1')");
    expect(db.prepare("SELECT material_revision FROM review_tasks WHERE id='t2'").get()).toEqual({ material_revision: 1 }); db.close();
  });
  it('A23/A45 invalid references, staged states and malformed JSON cannot persist', () => {
    const db = new DatabaseSync(':memory:'); migrate(db);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name='identity_commands'").get()).toBeDefined();
    db.exec('PRAGMA foreign_keys=ON');
    expect(() => db.exec("INSERT INTO benefit_entities(id,platform_id) VALUES('e','missing')")).toThrow(/FOREIGN KEY/);
    expect(() => db.exec("INSERT INTO identity_commands(request_id,payload_hash,state,expected_json) VALUES('r','h','broken','[]')")).toThrow(/CHECK/);
    expect(() => db.exec("INSERT INTO identity_commands(request_id,payload_hash,state,expected_json) VALUES('r','h','staged','bad')")).toThrow(/CHECK/);
    db.close();
  });
});
