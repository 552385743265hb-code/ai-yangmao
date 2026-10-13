import { DeferError } from '../llm';
import { memoryRecordSchema, memorySnapshotSchema, screeningRuleSchema, platformProfileSchema, calibrationSchema, type MemorySnapshot } from '../../src/shared/screening/types';
import { z } from 'zod';

const pageSchema = z.object({
  records: z.array(memoryRecordSchema),
  rules: z.array(screeningRuleSchema).default([]),
  profiles: z.array(platformProfileSchema).default([]),
  calibrations: z.array(calibrationSchema).default([]),
  nextCursor: z.string().nullable(),
});

export async function loadMemory(): Promise<MemorySnapshot> {
  const base = process.env.API_BASE?.replace(/\/$/, '');
  if (!base) throw new Error('explicit API_BASE required for screening memory');
  const records = [];
  let rules: MemorySnapshot['rules'] = [];
  let profiles: MemorySnapshot['profiles'] = [];
  let calibrations: MemorySnapshot['calibrations'] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 100; page++) {
    const url = new URL(`${base}/api/ingest/screening/memory`);
    url.searchParams.set('limit', '500');
    if (cursor) url.searchParams.set('cursor', cursor);
    let response: Response;
    try {
      response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.INGEST_TOKEN ?? ''}` }, signal: AbortSignal.timeout(30000) });
    } catch (error) {
      throw new DeferError(`screening memory unavailable: ${(error as Error).message}`);
    }
    if (!response.ok) throw new DeferError(`screening memory returned ${response.status}`);
    const parsed = pageSchema.safeParse(await response.json());
    if (!parsed.success) throw new DeferError('screening memory page failed validation');
    if (page === 0) {
      rules = parsed.data.rules;
      profiles = parsed.data.profiles;
      calibrations = parsed.data.calibrations;
    }
    records.push(...parsed.data.records);
    if (!parsed.data.nextCursor) {
      const snapshot = { generatedAt: new Date().toISOString(), records, rules, profiles, calibrations };
      const checked = memorySnapshotSchema.safeParse(snapshot);
      if (!checked.success) throw new DeferError('screening memory snapshot failed validation');
      return checked.data;
    }
    cursor = parsed.data.nextCursor;
  }
  throw new DeferError('screening memory pagination incomplete');
}
