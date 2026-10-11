import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { applyMembershipOfferPatch, buildMembershipBackfill, membershipBackfillSql, membershipBackfillRollbackSql, readMembershipSnapshot, rollbackMembershipOfferPatch } from '../scripts/membership-backfill';
import type { MembershipCatalog } from '../src/shared/membership';
const common = { aliases: [], status: 'verified' as const, sourceUrl: 'https://vendor.example/plans', verifiedAt: '2026-10-01', revision: 1 };
const catalog: MembershipCatalog = { revision: 1, products: [{ ...common, id: 'claude', name: 'Claude' }, { ...common, id: 'cursor', name: 'Cursor' }], plans: [{ ...common, id: 'claude-pro', productId: 'claude', name: 'Pro', billing: 'paid' }, { ...common, id: 'cursor-pro', productId: 'cursor', name: 'Pro', billing: 'paid' }] };
const offer = (requirements = ['member:Claude Pro']) => ({ id: 'offer-1', requirements: JSON.stringify(requirements), evidence: JSON.stringify({ url: 'https://vendor.example/event' }), review_state: 'approved', usd_estimate: 12, updated_at: 'before', membership_requirement: null });
const snapshot = (rows = [offer()]) => ({ offers: rows, approvedVersions: [], proposals: [] });
describe('offline membership backfill', () => {
  it('recognizes unique names without manufacturing administrator confirmation', () => {
    const p = buildMembershipBackfill(snapshot(), catalog);
    expect(p.entries[0].to.status).toBe('needs_review');
    expect(p.entries[0].to.anyOf[0].allOf[0].planIds).toEqual(['claude-pro']);
  });
  it('never guesses a bare Pro or the relation between multiple legacy fields', () => {
    for (const req of [['member:Pro'], ['member:Claude Pro', 'member:Cursor Pro'], ['member:Claude Pro及以上']]) {
      const entry = buildMembershipBackfill(snapshot([offer(req)]), catalog).entries[0];
      expect(entry.to.status).toBe('needs_review'); expect(entry.to.anyOf).toEqual([]);
    }
  });
  it('preserves approval, amounts, dates and evidence through apply and rollback', () => {
    const row = offer(); const plan = buildMembershipBackfill(snapshot([row]), catalog); const entry = plan.entries[0];
    const changed = applyMembershipOfferPatch(row, entry, catalog, plan);
    expect(changed).toEqual({ ...row, membership_requirement: entry.patch.membership_requirement });
    expect(rollbackMembershipOfferPatch(changed, entry)).toEqual(row);
    expect(row.membership_requirement).toBeNull();
  });
  it('rejects concurrent row or catalog changes and unsafe rollback', () => {
    const row = offer(); const plan = buildMembershipBackfill(snapshot(), catalog); const entry = plan.entries[0];
    expect(() => applyMembershipOfferPatch({ ...row, review_state: 'rejected' }, entry, catalog, plan)).toThrow('Snapshot conflict');
    expect(() => applyMembershipOfferPatch(row, entry, { ...catalog, revision: 2 }, plan)).toThrow('Catalog conflict');
    const changed = applyMembershipOfferPatch(row, entry, catalog, plan);
    expect(() => rollbackMembershipOfferPatch({ ...changed, usd_estimate: 99 }, entry)).toThrow('Rollback conflict');
  });
  it('refuses incomplete exports, malformed requirements and duplicated IDs', () => {
    expect(() => readMembershipSnapshot({ offers: [] })).toThrow('snapshot');
    expect(() => buildMembershipBackfill({ ...snapshot(), offers: [{ ...offer(), requirements: null }] }, catalog)).toThrow('Invalid requirements');
    expect(() => buildMembershipBackfill(snapshot([offer(), offer()]), catalog)).toThrow('Duplicate');
    expect(() => buildMembershipBackfill(snapshot(), { ...catalog, plans: [...catalog.plans, catalog.plans[0]] })).toThrow('Duplicate');
  });
  it('keeps approved history and pending candidates separate and immutable', () => {
    const original = { ...snapshot(), approvedVersions: [{ id: 'version-1', state: 'approved', terms_hash: 'v1-original', display_candidate_json: JSON.stringify({ requirements: ['member:Claude Pro'] }) }], proposals: [{ id: 'proposal-1', state: 'pending', display_candidate_json: JSON.stringify({ requirements: ['member:Cursor Pro'] }) }] };
    const before = structuredClone(original); const p = buildMembershipBackfill(original, catalog);
    expect(p.entries.map(e => e.target)).toEqual(['offer', 'approved_baseline', 'proposal']);
    expect(original).toEqual(before);
    expect(() => applyMembershipOfferPatch(original.approvedVersions[0], p.entries[1], catalog, p)).toThrow('Historical');
  });
  it('does not overwrite installed structures and distinguishes no membership', () => {
    const row = offer(['student']); const p = buildMembershipBackfill(snapshot([row]), catalog);
    expect(p.entries[0].to.status).toBe('not_required');
    const changed = applyMembershipOfferPatch(row, p.entries[0], catalog, p);
    expect(buildMembershipBackfill({ ...snapshot(), offers: [changed] }, catalog).entries).toEqual([]);
  });
});

describe('atomic migration SQL', () => {
  const empty: MembershipCatalog = { revision: 0, products: [], plans: [] };
  function database() {
    const db = new DatabaseSync(':memory:');
    db.exec(`CREATE TABLE membership_catalog(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER,data_json TEXT,updated_at TEXT);
      INSERT INTO membership_catalog VALUES(1,0,'{"products":[],"plans":[]}',NULL);
      CREATE TABLE identity_public_state(id INTEGER PRIMARY KEY,generation INTEGER); INSERT INTO identity_public_state VALUES(1,0);
      CREATE TABLE offers(id TEXT PRIMARY KEY,requirements TEXT,evidence TEXT,review_state TEXT,usd_estimate REAL,updated_at TEXT,membership_requirement TEXT);`);
    const r = offer();
    db.prepare('INSERT INTO offers VALUES(?,?,?,?,?,?,?)').run(r.id, r.requirements, r.evidence, r.review_state, r.usd_estimate, r.updated_at, r.membership_requirement);
    return db;
  }
  it('writes only additive structure/catalog and rolls the transaction back after a conflict', () => {
    const db = database(); const sql = membershipBackfillSql(snapshot(), catalog, empty);
    db.exec('BEGIN'); db.exec(sql.join('\n')); db.exec('COMMIT');
    const row = db.prepare('SELECT * FROM offers').get()!;
    expect(row.review_state).toBe('approved'); expect(row.usd_estimate).toBe(12); expect(row.updated_at).toBe('before');
    expect(JSON.parse(String(row.membership_requirement)).status).toBe('needs_review');
    expect(() => { db.exec('BEGIN'); try { db.exec(sql.join('\n')); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } }).toThrow();
    expect(db.prepare('SELECT * FROM offers').get()).toEqual(row);
    db.exec('BEGIN'); db.exec(membershipBackfillRollbackSql(snapshot(), catalog).join('\n')); db.exec('COMMIT');
    expect(db.prepare('SELECT membership_requirement FROM offers').get()?.membership_requirement).toBeNull();
    expect(db.prepare('SELECT revision FROM membership_catalog').get()?.revision).toBe(1); db.close();
  });
  it('any changed row blocks all offers and the catalog seed before writes', () => {
    const db = database(); db.exec("UPDATE offers SET review_state='rejected'");
    const sql = membershipBackfillSql(snapshot(), catalog, empty);
    expect(() => { db.exec('BEGIN'); try { db.exec(sql.join('\n')); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } }).toThrow();
    expect(db.prepare('SELECT revision FROM membership_catalog').get()?.revision).toBe(0);
    expect(db.prepare('SELECT membership_requirement FROM offers').get()?.membership_requirement).toBeNull(); db.close();
  });
});

it('confirms only the approved exact qualification proof, never pending or restricted variants', () => {
  const hfCatalog: MembershipCatalog = { revision: 1, products: [{ ...common, id: 'hugging-face', name: 'Hugging Face' }], plans: [{ ...common, id: 'hugging-face-pro', productId: 'hugging-face', name: 'PRO', billing: 'unknown' }] };
  const row = { ...offer(['member:Hugging Face PRO']), evidence: JSON.stringify({ url: 'https://huggingface.co/docs/inference-providers/pricing', excerpts: { eligibility: 'PRO Users | $2.00 | All Hugging Face compute services' } }) };
  expect(buildMembershipBackfill(snapshot([row]), hfCatalog).entries[0].to.status).toBe('confirmed');
  expect(buildMembershipBackfill(snapshot([{ ...row, review_state: 'pending' }]), hfCatalog).entries[0].to.status).toBe('needs_review');
  expect(buildMembershipBackfill(snapshot([{ ...row, requirements: JSON.stringify(['member:Hugging Face PRO 年付']) }]), hfCatalog).entries[0].to.status).toBe('needs_review');
});

it('migrates explicit Starter/Pro availability as alternatives and preserves unknown changed restrictions', () => {
  const n8nCatalog: MembershipCatalog = { revision: 1, products: [{ ...common, id: 'n8n-cloud', name: 'n8n Cloud' }], plans: ['starter', 'pro'].map(id => ({ ...common, id: `n8n-cloud-${id}`, productId: 'n8n-cloud', name: id, billing: 'paid' })) };
  const evidence = { url: 'https://blog.n8n.io/gateway-credits/', excerpts: { benefit: 'Gateway credits are available on n8n Cloud Starter and Pro today.', eligibility: 'Now, when you add a node for a supported AI model or service on self-service n8n Cloud plans, everything you need to run it is already available in n8n. Just select Gateway credits instead of adding your own provider credentials.', claim: 'From the Cloud Admin Panel, you can track usage by service and workflow, add funds, or set up automatic top-ups.' } };
  const row = { ...offer(['member:n8n Cloud Starter', 'member:n8n Cloud Pro']), id: 'n8n-n8n-gateway-credits-shared-balance', evidence: JSON.stringify(evidence) };
  const result = buildMembershipBackfill(snapshot([row]), n8nCatalog).entries[0].to;
  expect(result.status).toBe('confirmed'); expect(result.anyOf).toHaveLength(1); expect(result.anyOf[0].allOf).toHaveLength(1);
  expect(result.anyOf[0].allOf[0].planIds).toEqual(['n8n-cloud-starter', 'n8n-cloud-pro']);
  const plan = buildMembershipBackfill(snapshot([row]), n8nCatalog);
  const updated = applyMembershipOfferPatch(row, plan.entries[0], n8nCatalog, plan);
  expect(JSON.parse(String(updated.requirements))).toEqual(['member:n8n Cloud starter / n8n Cloud pro']);
  expect(rollbackMembershipOfferPatch(updated, plan.entries[0])).toEqual(row);
  expect(() => rollbackMembershipOfferPatch({ ...updated, requirements: '[]' }, plan.entries[0])).toThrow('Rollback conflict');
  evidence.excerpts.eligibility += ' Annual plans only.';
  expect(buildMembershipBackfill(snapshot([{ ...row, evidence: JSON.stringify(evidence) }]), n8nCatalog).entries[0].to.status).toBe('needs_review');
});
