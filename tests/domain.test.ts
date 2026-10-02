import { describe, expect, it } from 'vitest';
import { registrableDomain, sameOrganization } from '../src/shared/domain';

describe('证据域名归属', () => {
  it('同一主域名下的子站算官方', () => expect(sameOrganization('kuku.baidu.com', 'cloud.baidu.com')).toBe(true));
  it('中国二级后缀', () => {
    expect(registrableDomain('help.aliyun.com.cn')).toBe('aliyun.com.cn');
    expect(sameOrganization('a.example.com.cn', 'b.example.com.cn')).toBe(true);
    expect(sameOrganization('a.foo.com.cn', 'b.bar.com.cn')).toBe(false);
  });
  it('公共托管域名只认完全相同', () => {
    expect(sameOrganization('evil.github.io', 'vendor.github.io')).toBe(false);
    expect(sameOrganization('github.com', 'github.com')).toBe(true);
  });
  it('不同公司不算', () => expect(sameOrganization('baidu.com.evil.io', 'cloud.baidu.com')).toBe(false));
});
