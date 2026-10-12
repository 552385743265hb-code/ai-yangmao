import { Hono } from 'hono';
import { buildMemoryPage } from './memory';
import type { Env } from '../index';

export const screeningIngestRoutes = new Hono<{ Bindings: Env }>();

screeningIngestRoutes.get('/memory', async c => {
  const limit = Math.min(500, Math.max(1, Number(c.req.query('limit') ?? 500) || 500));
  const cursor = c.req.query('cursor') || null;
  const page = await buildMemoryPage(c.env.DB, cursor, limit);
  const first = !cursor;
  const rules = first ? (await c.env.DB.prepare(`SELECT id, kind, scope_kind scopeKind, scope_value scopeValue, category, description, pattern, status FROM screening_rules`).all()).results : [];
  const profiles = first ? (await c.env.DB.prepare(`SELECT profile_json FROM platform_profiles ORDER BY platform_id`).all<{ profile_json: string }>()).results.map(row => JSON.parse(row.profile_json)) : [];
  const calibrations = first ? (await c.env.DB.prepare(`SELECT model, close_threshold closeThreshold, new_threshold newThreshold, sample_size sampleSize, close_precision closePrecision, wrong_new_rate wrongNewRate, recurring_false_closes recurringFalseCloses, status FROM screening_calibrations`).all()).results : [];
  return c.json({ records: page.records, rules, profiles, calibrations, nextCursor: page.nextCursor });
});
