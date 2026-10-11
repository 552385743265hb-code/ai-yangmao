/** Offline preparation only. This command never connects to or writes a database.
 * Export offers, current approved versions, and pending proposals in one read snapshot.
 * npx tsx scripts/membership-backfill.ts --snapshot /private/snapshot.json --out /private/plan.json
 * Keep snapshots/receipts outside Git. Apply via the normal revision-guarded service;
 * historical version changes below are V2 baseline inputs, never historical UPDATEs.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { migrateLegacyMembership, validateMembership, formatMembership, type MembershipCatalog, type MembershipRequirement } from '../src/shared/membership';

import { withMembershipFacts } from '../src/shared/identity/membership';
import { normalizeTerms, stableJson, withoutEvidence } from '../src/shared/identity/normalize';
import { canonicalTermsSchema } from '../src/shared/identity/types';

type Row = Record<string, unknown>;
export interface MembershipSnapshot { offers: Row[]; approvedVersions: Row[]; proposals: Row[]; }
export interface MembershipBackfillEntry {
  target: 'offer' | 'approved_baseline' | 'proposal'; id: string; beforeHash: string;
  from: string[]; to: MembershipRequirement; reason: string;
  /** Only this patch may change a live offer. V1 history requires a separate V2 baseline. */
  patch: Row; previous: Row;
}
export interface MembershipBackfillPlan {
  schemaVersion: 'membership-backfill-v1'; catalogRevision: number; catalogHash: string;
  entries: MembershipBackfillEntry[]; counts: Record<string, number>; warnings: string[];
}
function stable(value: unknown): string {
  if (value === undefined) throw new Error('Undefined is not valid snapshot JSON');
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`;
}
export const membershipSnapshotHash = (value: unknown): string => createHash('sha256').update(stable(value)).digest('hex');
function parsed(value: unknown): unknown { return typeof value === 'string' ? JSON.parse(value) : value; }
function object(value: unknown, label: string): Row {
  const v = parsed(value);
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`Invalid ${label}`);
  return v as Row;
}
function requirements(value: unknown): string[] {
  const v = parsed(value);
  if (!Array.isArray(v) || !v.every(x => typeof x === 'string')) throw new Error('Invalid requirements: refuse to infer not_required');
  return v;
}
function rows(value: unknown, label: string): Row[] {
  if (!Array.isArray(value)) throw new Error(`Missing ${label} snapshot`);
  return value.map(v => object(v, label));
}
export function readMembershipSnapshot(value: unknown): MembershipSnapshot {
  // Wrangler --json multi-query exports: offers, current approved versions, pending proposals.
  if (Array.isArray(value)) {
    if (value.length !== 3) throw new Error('Expected all three snapshot queries, including pending proposals');
    return { offers: rows(object(value[0], 'offers query').results, 'offers'), approvedVersions: rows(object(value[1], 'versions query').results, 'approved versions'), proposals: rows(object(value[2], 'proposals query').results, 'proposals') };
  }
  const v = object(value, 'snapshot');
  return { offers: rows(v.offers, 'offers'), approvedVersions: rows(v.approvedVersions, 'approved versions'), proposals: rows(v.proposals, 'proposals') };
}
// Manually reviewed qualification equivalences, pinned to complete captured excerpts.
const reviewedAlternatives = [
  {
    "offerId": "devin-devin-kimi-glm-desktop-free",
    "productId": "devin",
    "planIds": [
      "devin-pro",
      "devin-max",
      "devin-teams"
    ],
    "requirements": [
      "member:Devin Pro、Devin Max 或 Devin Teams 订阅"
    ],
    "sourceUrl": "https://devin.ai/blog/kimi-k27-glm-52-devin-desktop",
    "excerpts": {
      "benefit": "For Pro, Max, and Teams plans, Kimi K2.7 and GLM 5.2 will be free until July 5 — try them now.",
      "eligibility": "For Pro, Max, and Teams plans",
      "claim": "Download Devin Desktop",
      "validity": "until July 5"
    }
  },
  {
    "offerId": "cursor-cursor-teams-enterprise-rollouts-trial",
    "productId": "cursor",
    "planIds": [
      "cursor-teams",
      "cursor-enterprise"
    ],
    "requirements": [
      "member:Cursor Teams或Cursor Enterprise"
    ],
    "sourceUrl": "https://cursor.com/changelog/rollouts-and-security-reviewer",
    "excerpts": {
      "benefit": "For the next 10 days, we're including usage credits so teams can try Rollouts on real changes. Teams and Enterprise customers receive credits for roughly 50 and 500 changes, respectively.",
      "eligibility": "Rollouts and Security Reviewer are available today on Teams and Enterprise plans.",
      "claim": "Enable either bot from the automations tab.",
      "validity": "For the next 10 days"
    }
  },
  {
    "offerId": "magnific-magnific-one-desktop-app-free",
    "productId": "magnific",
    "planIds": [
      "magnific-premium-plus",
      "magnific-pro",
      "magnific-business"
    ],
    "requirements": [
      "member:Magnific Premium+ / Magnific Pro / Magnific Business（任一付费会员）"
    ],
    "sourceUrl": "https://www.magnific.com/pricing",
    "excerpts": {
      "benefit": "Unlimited in the desktop app from Oct 8 to 15.",
      "eligibility": "Included with Premium+, Pro, and Business.",
      "validity": "Draft and Final in High quality, 2K and 4K. Max quality uses credits."
    }
  },
  {
    "offerId": "n8n-n8n-gateway-credits-shared-balance",
    "productId": "n8n-cloud",
    "planIds": [
      "n8n-cloud-starter",
      "n8n-cloud-pro"
    ],
    "requirements": [
      "member:n8n Cloud Starter",
      "member:n8n Cloud Pro"
    ],
    "sourceUrl": "https://blog.n8n.io/gateway-credits/",
    "excerpts": {
      "benefit": "Gateway credits are available on n8n Cloud Starter and Pro today.",
      "eligibility": "Now, when you add a node for a supported AI model or service on self-service n8n Cloud plans, everything you need to run it is already available in n8n. Just select Gateway credits instead of adding your own provider credentials.",
      "claim": "From the Cloud Admin Panel, you can track usage by service and workflow, add funds, or set up automatic top-ups."
    }
  }
];
function checkCatalog(catalog: MembershipCatalog): void {
  for (const [kind, list] of [['product', catalog.products], ['plan', catalog.plans]] as const) {
    if (new Set(list.map(p => p.id)).size !== list.length) throw new Error(`Duplicate ${kind} ID`);
  }
  for (const plan of catalog.plans) if (!catalog.products.some(p => p.id === plan.productId)) throw new Error(`Orphan plan ${plan.id}`);
}
export function buildMembershipBackfill(snapshot: MembershipSnapshot, catalog: MembershipCatalog): MembershipBackfillPlan {
  checkCatalog(catalog);
  const entries: MembershipBackfillEntry[] = [];
  const seen = new Set<string>();
  for (const [target, sourceRows] of [['offer', snapshot.offers], ['approved_baseline', snapshot.approvedVersions], ['proposal', snapshot.proposals]] as const) {
    for (let row of sourceRows) {
      if (target === 'proposal' && !row.id && typeof row.offer_id === 'string') row = { ...row, id: row.offer_id };
      if (typeof row.id !== 'string' || !row.id) throw new Error(`Missing ${target} ID`);
      const key = `${target}:${row.id}`;
      if (seen.has(key)) throw new Error(`Duplicate snapshot target ${key}`);
      seen.add(key);
      const candidate = target === 'offer' ? row : object(row.display_candidate_json ?? row.candidate_json ?? row.candidate, `${key} candidate`);
      const from = requirements(candidate.requirements);
      const old = target === 'offer' ? row.membership_requirement : candidate.membershipRequirement;
      // A rerun cannot overwrite a structure installed by an administrator or earlier migration.
      if (old !== undefined && old !== null) continue;
      const to = migrateLegacyMembership(from, catalog);
      // Separate historical member strings do not establish AND versus OR.
      if ((to.legacyText?.length ?? 0) > 1) to.anyOf = [];
      const evidence = candidate.evidence ? object(candidate.evidence, `${key} evidence`) : undefined;
      if (typeof evidence?.url === 'string') {
        try { const u = new URL(evidence.url); if (['https:', 'http:'].includes(u.protocol) && !u.username && !u.password) to.evidenceUrls = [evidence.url]; } catch { /* Missing evidence is a review gap. */ }
      }
      // Reviewed exact equivalence: the approved HF PRO record states an unqualified
      // single PRO membership and its captured official eligibility row names PRO Users.
      // This allowlist is intentionally narrow; a matching product catalog alone is no proof.
      const approved = target === 'approved_baseline' ? row.state === 'approved' : target === 'offer' && row.review_state === 'approved';
      const eligibility = evidence?.excerpts && object(evidence.excerpts, 'evidence excerpts').eligibility;
      if (approved && from.filter(v => v.startsWith('member:')).join('\n') === 'member:Hugging Face PRO'
          && evidence?.url === 'https://huggingface.co/docs/inference-providers/pricing'
          && eligibility === 'PRO Users | $2.00 | All Hugging Face compute services'
          && to.anyOf.length === 1 && to.anyOf[0].allOf.length === 1
          && to.anyOf[0].allOf[0].planIds.join() === 'hugging-face-pro') to.status = 'confirmed';
      const reviewed = reviewedAlternatives.find(rule => rule.offerId === (target === 'approved_baseline' ? row.canonical_offer_id : row.id));
      if (approved && reviewed && stable(from) === stable(reviewed.requirements)
          && evidence?.url === reviewed.sourceUrl && stable(evidence?.excerpts ?? null) === stable(reviewed.excerpts)
          && reviewed.planIds.every(id => catalog.plans.some(p => p.id === id && p.productId === reviewed.productId && p.status === 'verified'))
          && catalog.products.some(p => p.id === reviewed.productId && p.status === 'verified')) {
        to.status = 'confirmed';
        to.anyOf = [{ allOf: [{ productId: reviewed.productId, scope: 'plans', planIds: [...reviewed.planIds], excludePlanIds: [] }] }];
      }
      const errors = validateMembership(to, catalog);
      if (errors.length) throw new Error(`${key}: ${errors.join('; ')}`);
      const field = target === 'offer' ? 'membership_requirement' : 'membershipRequirement';
      const projected = to.status === 'confirmed' ? [...from.filter(v => !v.startsWith('member:')), `member:${formatMembership(to, catalog)}`] : undefined;
      const patch = { [field]: target === 'offer' ? JSON.stringify(to) : to, ...(projected ? { requirements: target === 'offer' ? JSON.stringify(projected) : projected } : {}) };
      entries.push({ target, id: row.id, beforeHash: membershipSnapshotHash(row), from, to, patch,
        previous: { ...(Object.hasOwn(candidate, field) ? { [field]: candidate[field] } : {}), ...(projected ? { requirements: candidate.requirements } : {}) },
        reason: to.status === 'confirmed' ? 'Reviewed approved qualification matches pinned official evidence; no qualification expansion' : to.status === 'not_required' ? 'No legacy member requirement; non-member requirements unchanged' : (to.legacyText?.length ?? 0) > 1 ? 'Multiple legacy fields have no explicit AND/OR; human review required' : to.anyOf.length ? 'Unique exact plan recognized; evidence and qualification equivalence still require review' : 'Ambiguous, restricted or missing catalog match; original wording preserved' });
    }
  }
  const counts: Record<string, number> = { offers: 0, approvedBaselines: 0, proposals: 0, needsReview: 0, notRequired: 0, confirmed: 0 };
  for (const e of entries) { counts[e.target === 'offer' ? 'offers' : e.target === 'proposal' ? 'proposals' : 'approvedBaselines']++; counts[e.to.status === 'needs_review' ? 'needsReview' : e.to.status === 'not_required' ? 'notRequired' : 'confirmed']++; }
  return { schemaVersion: 'membership-backfill-v1', catalogRevision: catalog.revision, catalogHash: membershipSnapshotHash(catalog), entries, counts,
    warnings: ['Offline dry run only; no database writes performed.', 'Catalog evidence proves names, not equivalence of individual legacy qualification rules.', 'Historical facts, hashes and decisions must remain immutable; approved_baseline entries need reviewed V2 baselines and explicit mappings.', 'Before rollout, back up and re-export all three scopes together; compare full-row fingerprints and catalog hash atomically.'] };
}
/** Transaction adapter must validate EVERY row with this helper before persisting any patch. */
export function applyMembershipOfferPatch(row: Row, entry: MembershipBackfillEntry, catalog: MembershipCatalog, plan: MembershipBackfillPlan): Row {
  if (entry.target !== 'offer') throw new Error('Historical versions/proposals require their own revision-guarded service');
  if (catalog.revision !== plan.catalogRevision || membershipSnapshotHash(catalog) !== plan.catalogHash) throw new Error('Catalog conflict');
  if (row.id !== entry.id || membershipSnapshotHash(row) !== entry.beforeHash) throw new Error('Snapshot conflict');
  const expected = { membership_requirement: JSON.stringify(entry.to), ...(entry.to.status === 'confirmed' ? { requirements: JSON.stringify([...entry.from.filter(v => !v.startsWith('member:')), `member:${formatMembership(entry.to, catalog)}`]) } : {}) };
  if (stable(entry.patch) !== stable(expected)) throw new Error('Invalid patch');
  return { ...row, ...entry.patch };
}
export function rollbackMembershipOfferPatch(row: Row, entry: MembershipBackfillEntry): Row {
  if (entry.target !== 'offer' || row.id !== entry.id || row.membership_requirement !== entry.patch.membership_requirement) throw new Error('Rollback conflict');
  if (Object.entries(entry.patch).some(([key, value]) => stable(row[key]) !== stable(value))) throw new Error('Rollback conflict');
  const previous = { ...row }; for (const key of Object.keys(entry.patch)) delete previous[key];
  Object.assign(previous, entry.previous);
  if (membershipSnapshotHash(previous) !== entry.beforeHash) throw new Error('Rollback conflict: other fields changed');
  return previous;
}
/** Execute every statement in ONE atomic D1 batch/SQLite transaction. Never split this list.
 * The existing singleton CHECK(id=1) is used as a fail-closed assertion without creating
 * a new control table. A failed assertion aborts the batch before any row is modified.
 */
export function membershipBackfillSql(snapshot: MembershipSnapshot, catalog: MembershipCatalog, expectedCatalog: MembershipCatalog): string[] {
  const plan = buildMembershipBackfill(snapshot, catalog);
  const quote = (value: unknown): string => value === null ? 'NULL' : typeof value === 'number' ? String(value) : typeof value === 'string' ? `'${value.replaceAll("'", "''")}'` : (() => { throw new Error('Snapshot SQL values must be scalar'); })();
  const assert = (predicate: string): string => `INSERT INTO membership_catalog(id,revision,data_json) SELECT -1,0,'{}' WHERE NOT (${predicate});`;
  const sourceCatalog = JSON.stringify({ products: expectedCatalog.products, plans: expectedCatalog.plans });
  const statements = [assert(`EXISTS(SELECT 1 FROM membership_catalog WHERE id=1 AND revision=${expectedCatalog.revision} AND json(data_json)=json(${quote(sourceCatalog)}))`)];
  const mutable = plan.entries.filter(e => e.target === 'offer');
  for (const entry of mutable) {
    const row = snapshot.offers.find(r => r.id === entry.id)!;
    const predicates = Object.entries(row).filter(([key]) => key !== 'platform_name').map(([key, value]) => {
      if (!/^[a-z_]+$/.test(key)) throw new Error(`Unsafe column ${key}`);
      return `"${key}" IS ${quote(value)}`;
    });
    // Pre-column exports may omit membership_requirement; still protect administrator edits.
    if (!Object.hasOwn(row, 'membership_requirement')) predicates.push('membership_requirement IS NULL');
    statements.push(assert(`EXISTS(SELECT 1 FROM offers WHERE ${predicates.join(' AND ')})`));
  }
  const baselineWrites: string[] = [];
  for (const entry of plan.entries.filter(e => e.target === 'approved_baseline' && e.to.status === 'confirmed')) {
    const row = snapshot.approvedVersions.find(r => r.id === entry.id)!;
    if (row.terms_schema !== 'terms-v1' || row.state !== 'approved' || row.current_approved_version_id !== row.id) throw new Error('Baseline is not current approved V1');
    const facts = canonicalTermsSchema.parse(parsed(row.facts_json));
    const refs = facts.eligibility.state === 'known' ? facts.eligibility.evidenceRefs : [`legacy-version:${row.id}:eligibility`];
    if (!refs.length) throw new Error('Reviewed baseline requires original evidence references');
    const v2 = withMembershipFacts(facts, entry.to, refs);
    const hash = createHash('sha256').update(`${v2.schemaVersion}\n${stableJson(withoutEvidence(normalizeTerms(v2)))}`).digest('hex');
    const id = `membership-v2-${membershipSnapshotHash([row.id, hash]).slice(0, 48)}`;
    const display = { ...object(row.display_candidate_json, 'baseline candidate'), ...entry.patch };
    statements.push(assert(`EXISTS(SELECT 1 FROM benefit_versions WHERE id=${quote(row.id)} AND facts_json=${quote(row.facts_json)} AND display_candidate_json=${quote(row.display_candidate_json)} AND terms_hash=${quote(row.terms_hash)} AND terms_schema='terms-v1' AND state='approved' AND revision=${quote(row.revision)})`));
    statements.push(assert(`EXISTS(SELECT 1 FROM benefit_entities WHERE id=${quote(row.entity_id)} AND current_approved_version_id=${quote(row.id)} AND canonical_offer_id=${quote(row.canonical_offer_id)} AND business_revision=${quote(row.business_revision)} AND publication_revision=${quote(row.publication_revision)} AND state=${quote(row.entity_state)})`));
    statements.push(assert(`NOT EXISTS(SELECT 1 FROM review_tasks WHERE entity_id=${quote(row.entity_id)} AND state IN ('open','checking','manual'))`));
    statements.push(assert(`NOT EXISTS(SELECT 1 FROM offer_proposals WHERE offer_id=${quote(row.canonical_offer_id)})`));
    statements.push(assert(`NOT EXISTS(SELECT 1 FROM membership_version_migrations WHERE old_version_id=${quote(row.id)})`));
    baselineWrites.push(`INSERT INTO benefit_versions(id,entity_id,terms_schema,terms_hash,facts_json,display_candidate_json,state,base_version_id,revision,created_at) VALUES(${quote(id)},${quote(row.entity_id)},'terms-v2',${quote(hash)},${quote(JSON.stringify(v2))},${quote(JSON.stringify(display))},'approved',${quote(row.id)},0,${quote(row.created_at)});`);
    baselineWrites.push(`INSERT INTO membership_version_migrations(old_version_id,new_version_id,offer_id) VALUES(${quote(row.id)},${quote(id)},${quote(row.canonical_offer_id)});`);
    baselineWrites.push(`UPDATE benefit_entities SET current_approved_version_id=${quote(id)},business_revision=business_revision+1 WHERE id=${quote(row.entity_id)};`);
  }
  for (const entry of plan.entries.filter(e => e.target === 'proposal')) {
    const row = snapshot.proposals.find(r => (r.id ?? r.offer_id) === entry.id)!;
    if (typeof row.candidate !== 'string' || !row.offer_id) throw new Error('Proposal SQL requires offer_proposals export');
    const predicate = Object.entries(row).filter(([k]) => k !== 'id').map(([k,v]) => {
      if (!/^[a-z_]+$/.test(k)) throw new Error('Unsafe proposal column');
      return `"${k}" IS ${quote(v)}`;
    }).join(' AND ');
    statements.push(assert(`EXISTS(SELECT 1 FROM offer_proposals WHERE ${predicate})`));
    const candidate = { ...object(row.candidate, 'proposal candidate'), membershipRequirement: entry.to };
    baselineWrites.push(`UPDATE offer_proposals SET candidate=${quote(JSON.stringify(candidate))} WHERE offer_id=${quote(row.offer_id)};`);
  }
  if (membershipSnapshotHash(expectedCatalog) !== membershipSnapshotHash(catalog)) {
    if (catalog.revision <= expectedCatalog.revision) throw new Error('Catalog seed must advance the revision');
    statements.push(`UPDATE membership_catalog SET revision=${catalog.revision},data_json=${quote(JSON.stringify({ products: catalog.products, plans: catalog.plans }))},updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=1;`);
  }
  for (const entry of mutable) statements.push(`UPDATE offers SET ${Object.entries(entry.patch).map(([key, value]) => `${key}=${quote(value)}`).join(',')} WHERE id=${quote(entry.id)};`);
  // needs_review versions/proposals intentionally retain their V1 facts and original displays.
  // Their separate entries in the dry-run receipt are the explicit qualification review worklist.
  statements.unshift(assert('EXISTS(SELECT 1 FROM identity_public_state WHERE id=1)'));
  return [...statements, ...baselineWrites, 'UPDATE identity_public_state SET generation=generation+1 WHERE id=1;'];
}
/** Compatibility rollback preserves all V2 history, catalog entries and mapping evidence. */
export function membershipBackfillRollbackSql(snapshot: MembershipSnapshot, catalog: MembershipCatalog): string[] {
  const plan = buildMembershipBackfill(snapshot, catalog);
  const quote = (v: unknown) => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`;
  const guard = (p: string) => `INSERT INTO membership_catalog(id,revision,data_json) SELECT -1,0,'{}' WHERE NOT (${p});`;
  const guards = [guard(`EXISTS(SELECT 1 FROM membership_catalog WHERE id=1 AND revision=${catalog.revision} AND json(data_json)=json(${quote(JSON.stringify({ products: catalog.products, plans: catalog.plans }))}))`)];
  const updates: string[] = [];
  for (const entry of plan.entries.filter(e => e.target === 'offer')) {
    const row = snapshot.offers.find(r => r.id === entry.id)!;
    const expected = { ...row, ...entry.patch };
    const predicates = Object.entries(expected).filter(([key]) => key !== 'platform_name').map(([key,v]) => {
      if (!/^[a-z_]+$/.test(key)) throw new Error('Unsafe rollback column');
      return `"${key}" IS ${quote(v)}`;
    }).join(' AND ');
    guards.push(guard(`EXISTS(SELECT 1 FROM offers WHERE ${predicates})`));
    updates.push(`UPDATE offers SET ${Object.keys(entry.patch).map(key => `${key}=${quote(row[key])}`).join(',')} WHERE id=${quote(entry.id)};`);
  }
  for (const entry of plan.entries.filter(e => e.target === 'approved_baseline' && e.to.status === 'confirmed')) {
    const row = snapshot.approvedVersions.find(r => r.id === entry.id)!;
    guards.push(guard(`EXISTS(SELECT 1 FROM benefit_entities e JOIN membership_version_migrations m ON m.new_version_id=e.current_approved_version_id WHERE e.id=${quote(row.entity_id)} AND m.old_version_id=${quote(row.id)} AND m.offer_id=${quote(row.canonical_offer_id)} AND e.business_revision=${quote(Number(row.business_revision) + 1)} AND e.publication_revision=${quote(row.publication_revision)} AND e.state=${quote(row.entity_state)})`));
    guards.push(guard(`NOT EXISTS(SELECT 1 FROM review_tasks WHERE entity_id=${quote(row.entity_id)} AND state IN ('open','checking','manual'))`));
    guards.push(guard(`NOT EXISTS(SELECT 1 FROM offer_proposals WHERE offer_id=${quote(row.canonical_offer_id)})`));
    updates.push(`UPDATE benefit_entities SET current_approved_version_id=${quote(row.id)},business_revision=business_revision+1 WHERE id=${quote(row.entity_id)};`);
  }
  for (const entry of plan.entries.filter(e => e.target === 'proposal')) {
    const row = snapshot.proposals.find(r => (r.id ?? r.offer_id) === entry.id)!;
    const candidate = JSON.stringify({ ...object(row.candidate, 'proposal candidate'), membershipRequirement: entry.to });
    guards.push(guard(`EXISTS(SELECT 1 FROM offer_proposals WHERE offer_id=${quote(row.offer_id)} AND candidate=${quote(candidate)} AND diff=${quote(row.diff)} AND updated_at=${quote(row.updated_at)} AND detected_at=${quote(row.detected_at)})`));
    updates.push(`UPDATE offer_proposals SET candidate=${quote(row.candidate)} WHERE offer_id=${quote(row.offer_id)};`);
  }
  guards.unshift(guard('EXISTS(SELECT 1 FROM identity_public_state WHERE id=1)'));
  return [...guards, ...updates, 'UPDATE identity_public_state SET generation=generation+1 WHERE id=1;'];
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some((v, i) => i % 2 === 0 && !['--snapshot', '--catalog', '--out', '--sql-out', '--expected-catalog', '--rollback-out'].includes(v)) || args.length % 2) throw new Error('Usage: --snapshot FILE --out FILE [--catalog FILE]; writes only a local dry-run receipt');
  const get = (key: string) => { const i = args.indexOf(key); return i < 0 ? undefined : args[i + 1]; };
  const input = get('--snapshot'), output = get('--out');
  if (!input || !output || resolve(input) === resolve(output)) throw new Error('Distinct --snapshot and --out paths are required');
  const catalog = JSON.parse(readFileSync(get('--catalog') ?? new URL('../seed/memberships.json', import.meta.url), 'utf8')) as MembershipCatalog;
  const snapshot = readMembershipSnapshot(JSON.parse(readFileSync(input, 'utf8')));
  const plan = buildMembershipBackfill(snapshot, catalog);
  const sqlOutput = get('--sql-out'), expectedPath = get('--expected-catalog');
  if (Boolean(sqlOutput) !== Boolean(expectedPath)) throw new Error('--sql-out requires --expected-catalog and vice versa');
  const sql = sqlOutput && expectedPath ? membershipBackfillSql(snapshot, catalog, JSON.parse(readFileSync(expectedPath, 'utf8')) as MembershipCatalog) : undefined;
  if (sqlOutput && [resolve(input), resolve(output), resolve(expectedPath!)].includes(resolve(sqlOutput))) throw new Error('SQL output must have a distinct path');
  writeFileSync(output, JSON.stringify(plan, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  if (sqlOutput && sql) writeFileSync(sqlOutput, '-- MUST execute as one atomic D1 batch or SQLite transaction. Do not split.\n' + sql.join('\n') + '\n', { mode: 0o600, flag: 'wx' });
  const rollbackOutput = get('--rollback-out');
  if (rollbackOutput) writeFileSync(rollbackOutput, '-- Atomic compatibility rollback; preserve catalog and V2 history.\n' + membershipBackfillRollbackSql(snapshot, catalog).join('\n') + '\n', { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ dryRun: true, counts: plan.counts, output: resolve(output) }));
}
