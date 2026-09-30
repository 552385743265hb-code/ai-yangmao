// 本地中继：Reddit、LINUX DO 等会拦截云服务器 IP 的信源，由常开的 Mac 每 6 小时读取一次，把线索推到网站。
// 只处理 config.relay = "mac" 的信源；云端管线会跳过这些信源。
// 运行：npx tsx pipeline/reddit-relay.ts（密钥从 .prod.secrets 读取）
import { readFileSync } from 'node:fs';
import { feed, reddit, type Source } from './collectors';

for (const line of readFileSync(new URL('../.prod.secrets', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/#.*$/, '').trim();
}
const { api } = await import('./lib');
const { sources } = await api<{ sources: Source[] }>('/sources');
const mine = sources.filter(s => (s.config as { relay?: string } | undefined)?.relay === 'mac');
let created = 0, failed = 0;
for (const src of mine) {
  try {
    const leads = src.kind === 'feed' ? await feed(src) : await reddit(src);
    for (let i = 0; i < leads.length; i += 100) created += (await api<{ created: number }>('/leads', leads.slice(i, i + 100))).created;
    await api('/snapshots', { sourceId: src.id, url: src.url, ok: true });
    console.log(new Date().toISOString(), src.id, `线索 ${leads.length} 条`);
  } catch (e) {
    failed++;
    console.log(new Date().toISOString(), src.id, '失败', String(e).slice(0, 200));
    await api('/snapshots', { sourceId: src.id, url: src.url, ok: false, error: String(e).slice(0, 500) }).catch(() => undefined);
  }
}
console.log(new Date().toISOString(), `完成：${mine.length} 个信源，新增线索 ${created} 条，失败 ${failed} 个`);
