// Run with `npx tsx scripts/identity/verify-local.mjs`; no remote D1 API is used.
import assert from 'node:assert/strict';
import { getPlatformProxy } from 'wrangler';
import { IdentityStore } from '../../src/worker/identity/store.ts';
const proxy=await getPlatformProxy({configPath:'tests/fixtures/identity/wrangler.jsonc',persist:{path:'.superpowers/sdd/IMPLEMENTATION/d1/v3'}});
try {
 const db=proxy.env.DB, id=crypto.randomUUID();
 const store=new IdentityStore(db);
 const body={requestId:`runtime-${id}`,originalUrl:`https://synthetic.example/${id}`,finalUrl:`https://synthetic.example/${id}`,text:'Synthetic signup credit.',fetchKind:'indirect',observedAt:'2026-10-10T10:00:00.000Z',truncated:false};
 const first=await store.recordObservation(body);
 assert.deepEqual(await store.recordObservation(body),first);
 assert.equal((await db.prepare('SELECT count(*) n FROM source_observations WHERE id=?').bind(first.observationId).first()).n,1);
 const returning=await db.batch([db.prepare('INSERT INTO identity_blocks(block_key,revision) VALUES(?,0) RETURNING revision').bind(id)]);
 assert.equal(returning[0].results[0].revision,0);
 await assert.rejects(()=>db.batch([
  db.prepare('UPDATE identity_blocks SET revision=1 WHERE block_key=?').bind(id),
  db.prepare("INSERT INTO identity_commands(request_id,payload_hash,state,expected_json) VALUES(?,'test','invalid','[]')").bind(id),
 ]));
 assert.equal((await db.prepare('SELECT revision FROM identity_blocks WHERE block_key=?').bind(id).first()).revision,0);
 assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 console.log(JSON.stringify({environment:'local-workerd-d1',observationReplay:'passed',returning:'passed',batchCheckRollback:'passed',foreignKeys:'passed',externalMessages:0,modelCalls:0}));
} finally { await proxy.dispose(); }
