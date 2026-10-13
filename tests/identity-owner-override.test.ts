import { beforeEach, afterEach, it, expect } from 'vitest';
import { auditFixture, auditTerms } from './fixtures/identity/audit';
import { IdentityService } from '../src/worker/identity/service';
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
