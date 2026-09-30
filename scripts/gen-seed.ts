// 把 seed/platforms.json 生成为幂等的 SQL（重复执行只更新、不重复插入；不会覆盖已审核的准入状态）。
import { readFileSync } from 'node:fs';

interface P { id: string; name: string; type: string; site: string | null; x: string[]; staff?: string[] }
interface S { id: string; platform: string | null; kind: string; url: string; tier: string }
const data = JSON.parse(readFileSync(new URL('../seed/platforms.json', import.meta.url), 'utf8')) as { platforms: P[]; sources: S[] };

const q = (v: string | null) => (v == null ? 'NULL' : `'${v.replaceAll("'", "''")}'`);
const out: string[] = ['-- 由 scripts/gen-seed.ts 生成，勿手改'];
for (const p of data.platforms) {
  out.push(`INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES (${q(p.id)}, ${q(p.name)}, ${q(p.type)}, ${q(p.site)}, ${q(JSON.stringify(p.x))}, ${q(JSON.stringify(p.staff ?? []))})
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');`);
}
for (const s of data.sources) {
  out.push(`INSERT INTO sources (id, platform_id, kind, url, tier) VALUES (${q(s.id)}, ${q(s.platform)}, ${q(s.kind)}, ${q(s.url)}, ${q(s.tier)})
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier;`);
}
console.log(out.join('\n'));
