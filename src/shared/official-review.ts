/** 自动复核只修改待审草稿/更新提案，不替代管理员批准。 */
export interface OfficialReview {
  status: 'checking' | 'matched' | 'unresolved' | 'failed';
  jobId: string;
  inputVersion: string;
  originUrl: string;
  attempts: number;
  checkedAt: string;
  nextAttemptAt: string | null;
  reason: string;
  queries: string[];
  candidates: string[];
  chosenUrl?: string;
  changedFields?: string[];
}
export interface OfficialPlatform {
  id: string; name: string; site: string | null;
  xHandles: string[]; staffHandles: string[];
}
export interface OfficialSource { url: string; tier: string; platformId?: string | null }
const hosted = new Set(['github.com','gitee.com','huggingface.co','medium.com','substack.com','mp.weixin.qq.com']);
export function officialTier(value: string, platform: OfficialPlatform, sources: OfficialSource[]): 'site'|'docs'|'official'|'staff'|null {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80','443'].includes(url.port))) return null;
  const host=url.hostname.toLowerCase().replace(/^www\./,'');
  if (['x.com','twitter.com'].includes(host)) {
    const m=url.pathname.match(/^\/([^/]+)\/status\/\d+\/?$/);
    if (!m) return null;
    const handle='@'+m[1].toLowerCase();
    if(platform.xHandles.some(h=>h.toLowerCase()===handle))return 'official';
    if(platform.staffHandles.some(h=>h.toLowerCase()===handle))return 'staff';
    return null;
  }
  const entries=[...sources.filter(s=>['site','docs','official'].includes(s.tier)),...(platform.site?[{url:platform.site,tier:'site'}]:[])];
  for(const entry of entries) {
    let base:URL;try{base=new URL(entry.url);}catch{continue;}
    const baseHost=base.hostname.toLowerCase().replace(/^www\./,'');
    if(host!==baseHost && !host.endsWith('.'+baseHost))continue;
    if(hosted.has(baseHost)) {
      if(baseHost==='mp.weixin.qq.com') { if(url.href!==base.href)continue; }
      else {
        const parts=base.pathname.split('/').filter(Boolean);
        // 共享托管不信任整站；GitHub/Gitee限已登记仓库，其他站限已登记路径。
        const prefix=parts.slice(0,['github.com','gitee.com'].includes(baseHost)?2:1).join('/');
        if(!prefix || !(url.pathname==='/'+prefix || url.pathname.startsWith('/'+prefix+'/')))continue;
      }
    }
    return entry.tier==='docs' || /\b(docs|help|support)\b/.test(host) ? 'docs':'site';
  }
  return null;
}
