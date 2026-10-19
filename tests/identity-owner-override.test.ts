import { beforeEach, afterEach, it, expect } from 'vitest';
import { auditFixture, auditTerms } from './fixtures/identity/audit';
import { IdentityService } from '../src/worker/identity/service';
import { hashTerms } from '../src/shared/identity/normalize';
import { canonicalTermsSchema } from '../src/shared/identity/types';
import { unknownIdentityTerms } from '../src/worker/identity/adapters';

let f: ReturnType<typeof auditFixture>, service: IdentityService;
beforeEach(() => { f = auditFixture(); service = new IdentityService(f.db); });
afterEach(() => f.sqlite.close());

async function approvedEntity() {
  const text = 'Campaign lifecycle grants 10 USD.';
  const o = await f.observation('original', text), c = await f.candidate('original', o, text, auditTerms('lifecycle'));
  const a = await service.resolveCandidate(c.candidateId, 'original');
  await service.decideTask(a.taskId!, { requestId: 'approve-original', expectedRevision: 0, action: 'approve', actor: 'admin', role: 'admin' });
  return a.entityId!;
}
async function unprovenTask(id: string, patch: Record<string, unknown> = {}) {
  const text = 'Reposted: campaign lifecycle grants 10 USD.';
  const o = await f.observation(id, text), c = await f.candidate(id, o, text, unknownIdentityTerms(), patch);
  const r = await service.resolveCandidate(c.candidateId, id);
  expect(r.outcome).toBe('needs_identity_review');
  const task = f.sqlite.prepare('SELECT id, revision FROM review_tasks WHERE id=?').get(r.taskId) as { id: string; revision: number };
  return { candidateId: c.candidateId, task };
}

it('an administrator can confirm an unproven repost as the same approved activity', async () => {
  const entityId = await approvedEntity(), { candidateId, task } = await unprovenTask('repost');
  const r = await service.resolveIdentityTask(task.id, { requestId: 'owner-same', expectedRevision: task.revision, action: 'same', candidateId, entityId, actor: 'admin', reason: '管理员确认同一活动', ownerOverride: true });
  expect(r).toMatchObject({ entityId, outcome: 'duplicate_approved' });
  expect(f.sqlite.prepare("SELECT state FROM review_tasks WHERE id=?").get(task.id)).not.toEqual({ state: 'manual' });
});

it('without the owner override the identity gate still refuses', async () => {
  const entityId = await approvedEntity(), { candidateId, task } = await unprovenTask('repost');
  await expect(service.resolveIdentityTask(task.id, { requestId: 'plain-same', expectedRevision: task.revision, action: 'same', candidateId, entityId, actor: 'reviewer', reason: '看起来相同' })).rejects.toMatchObject({ status: 400 });
});

it('the override never crosses platforms', async () => {
  f.sqlite.exec("INSERT INTO platforms(id,name,type,status,site) VALUES('other','Other','lab','approved','https://other.example')");
  const entityId = await approvedEntity(), { candidateId, task } = await unprovenTask('foreign', { platformId: 'other' });
  await expect(service.resolveIdentityTask(task.id, { requestId: 'cross', expectedRevision: task.revision, action: 'same', candidateId, entityId, actor: 'admin', reason: '跨平台不应合并', ownerOverride: true })).rejects.toMatchObject({ status: 400 });
});

it('rejecting a task with a reason category is accepted by the strict decision schema', async () => {
  await approvedEntity(); const { candidateId, task } = await unprovenTask('dup');
  const r = await f.call(`admin/identity/tasks/${task.id}/resolve`, { requestId: 'reject-dup', expectedRevision: task.revision, action: 'reject', reasonCategory: 'duplicate', reason: '与已上架活动重复', scope: { kind: 'claim', candidateId } }, true);
  expect(r.status).toBe(200);
});

function membershipOnly(plan = 'vendor-pro', evidenceRef = 'quote-1') {
  return canonicalTermsSchema.parse({ ...unknownIdentityTerms(), schemaVersion: 'terms-v2', membership: {
    state: 'known', value: { schemaVersion: 'membership-v1', status: 'confirmed', anyOf: [
      { allOf: [{ productId: 'vendor', scope: 'plans', planIds: [plan], excludePlanIds: [] }] }
    ] }, evidenceRefs: [evidenceRef]
  } });
}
async function partialMembershipTask(plan = 'vendor-pro', addedFact = false) {
  const entityId = await approvedEntity();
  const baseline = membershipOnly('vendor-pro', 'legacy-membership');
  f.sqlite.prepare('UPDATE benefit_versions SET facts_json=?,terms_schema=?,terms_hash=? WHERE id=(SELECT current_approved_version_id FROM benefit_entities WHERE id=?)')
    .run(JSON.stringify(baseline), baseline.schemaVersion, await hashTerms(baseline), entityId);
  const text = 'PRO members receive monthly credits.';
  const facts = membershipOnly(plan);
  if (addedFact) facts.issuerProductId = { state: 'known', value: 'vendor', evidenceRefs: ['quote-1'] };
  const observation = await f.observation('membership-repost', text);
  // Reproduce legacy membership migration: canonical membership is known while issuer/mechanism stay unknown.
  const candidate = await f.candidate('membership-repost', observation, text, unknownIdentityTerms());
  f.sqlite.prepare('UPDATE intake_candidates SET facts_json=?,facts_hash=? WHERE id=?').run(JSON.stringify(facts), await hashTerms(facts), candidate.candidateId);
  const receipt = await service.resolveCandidate(candidate.candidateId, 'membership-repost');
  const task = f.sqlite.prepare('SELECT id,revision FROM review_tasks WHERE id=?').get(receipt.taskId) as { id: string; revision: number };
  return { entityId, candidateId: candidate.candidateId, task };
}
it('admin route links identical membership-only legacy facts without changing the approved version', async () => {
  const { entityId, candidateId, task } = await partialMembershipTask();
  const before = f.sqlite.prepare('SELECT current_approved_version_id,publication_revision FROM benefit_entities WHERE id=?').get(entityId);
  const r = await f.call(`admin/identity/tasks/${task.id}/resolve`, { requestId: 'same-membership', expectedRevision: task.revision,
    action: 'same', candidateId, entityId, reason: '管理员确认与已上架会员额度相同' }, true);
  expect(r.status).toBe(200);
  expect(r.body).toMatchObject({ outcome: 'duplicate_approved', entityId });
  expect(f.sqlite.prepare('SELECT state FROM review_tasks WHERE id=?').get(task.id)).toEqual({ state: 'resolved' });
  expect(f.sqlite.prepare('SELECT current_approved_version_id,publication_revision FROM benefit_entities WHERE id=?').get(entityId)).toEqual(before);
  expect(f.sqlite.prepare('SELECT count(*) n FROM benefit_versions').get()).toEqual({ n: 1 });
});
it('partial membership confirmation still requires the owner override', async () => {
  const { entityId, candidateId, task } = await partialMembershipTask();
  await expect(service.resolveIdentityTask(task.id, { requestId: 'reviewer-membership', expectedRevision: task.revision,
    action: 'same', candidateId, entityId, actor: 'reviewer', reason: '确认同一活动' })).rejects.toMatchObject({ status: 400 });
});
it('owner confirmation does not erase a conflicting membership plan', async () => {
  const { entityId, candidateId, task } = await partialMembershipTask('vendor-enterprise');
  await expect(service.resolveIdentityTask(task.id, { requestId: 'conflicting-membership', expectedRevision: task.revision,
    action: 'same', candidateId, entityId, actor: 'admin', ownerOverride: true, reason: '不同会员资格不能合并' })).rejects.toMatchObject({ status: 400 });
});
it('owner confirmation does not discard newly introduced canonical facts', async () => {
  const { entityId, candidateId, task } = await partialMembershipTask('vendor-pro', true);
  await expect(service.resolveIdentityTask(task.id, { requestId: 'added-fact', expectedRevision: task.revision,
    action: 'same', candidateId, entityId, actor: 'admin', ownerOverride: true, reason: '新增事实不能直接丢弃' })).rejects.toMatchObject({ status: 400 });
});
