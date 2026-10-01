// 把 seed/platforms.json 生成为幂等的 SQL（重复执行只更新、不重复插入；不会覆盖已审核的准入状态）。
import { readFileSync } from 'node:fs';

interface P { id: string; name: string; type: string; site: string | null; x: string[]; staff?: string[] }
interface S { id: string; platform: string | null; kind: string; url: string; tier: string; config?: Record<string, unknown>; enabled?: boolean }
const data = JSON.parse(readFileSync(new URL('../seed/platforms.json', import.meta.url), 'utf8')) as { platforms: P[]; sources: S[] };

const q = (v: string | null) => (v == null ? 'NULL' : `'${v.replaceAll("'", "''")}'`);
const out: string[] = ['-- 由 scripts/gen-seed.ts 生成，勿手改'];
for (const p of data.platforms) {
  out.push(`INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES (${q(p.id)}, ${q(p.name)}, ${q(p.type)}, ${q(p.site)}, ${q(JSON.stringify(p.x))}, ${q(JSON.stringify(p.staff ?? []))})
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');`);
}
for (const s of data.sources) {
  const cfg = q(JSON.stringify(s.config ?? {}));
  // config 只在新建时写入，已有信源保留运行中累积的状态（如 deferCount），但合并种子里声明的键
  out.push(`INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES (${q(s.id)}, ${q(s.platform)}, ${q(s.kind)}, ${q(s.url)}, ${q(s.tier)}, ${cfg}, ${s.enabled === false ? 0 : 1})
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);`);
}
console.log(out.join('\n'));
