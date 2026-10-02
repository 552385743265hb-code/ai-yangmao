// 证据域名归属：同一家公司主域名下的子站都算官方（如 kuku.baidu.com 和 cloud.baidu.com 都在 baidu.com 下）。
// 公共托管域名（github.io、vercel.app 等）上谁都能开子站，只认完全相同的主机名。
const MULTI_PART_TLD = new Set(['com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'ac.cn', 'co.uk', 'org.uk', 'co.jp', 'ne.jp', 'or.jp', 'com.hk', 'com.tw', 'com.sg', 'com.au', 'co.kr', 'co.in', 'com.br']);
const SHARED_HOSTS = new Set(['github.io', 'vercel.app', 'pages.dev', 'workers.dev', 'netlify.app', 'herokuapp.com', 'notion.site', 'gitbook.io', 'feishu.cn', 'larksuite.com', 'medium.com', 'substack.com', 'hf.space', 'huggingface.co', 'github.com', 'gitee.com', 'weixin.qq.com', 'qq.com', 'x.com', 'twitter.com', 'zhihu.com', 'bilibili.com', 'youtube.com']);

export function registrableDomain(host: string): string {
  const parts = host.toLowerCase().replace(/\.$/, '').split('.');
  const two = parts.slice(-2).join('.');
  return parts.length > 2 && MULTI_PART_TLD.has(two) ? parts.slice(-3).join('.') : two;
}
export function sameOrganization(evidenceHost: string, officialHost: string): boolean {
  const a = evidenceHost.toLowerCase(), b = officialHost.toLowerCase();
  if (a === b || a.endsWith('.' + b)) return true;
  const ra = registrableDomain(a), rb = registrableDomain(b);
  return ra === rb && !SHARED_HOSTS.has(rb);
}
