import { it, expect } from 'vitest';
import { officialTier, wechatAccounts } from '../src/shared/official-review';
import { learnWechatAccount } from '../src/worker/wechat-accounts';
import { identityDb } from './fixtures/identity/db';

const wb = { id: 'workbuddy', name: 'WorkBuddy', site: 'https://www.workbuddy.cn', xHandles: [], staffHandles: [], wechat: 'WorkBuddy 官方号,MzYzODgxODMzNQ==' };
const article = (biz: string) => `https://mp.weixin.qq.com/s?__biz=${encodeURIComponent(biz)}&mid=2247496142&idx=1&sn=e26718d2b9c6ff2233493af3d4a7ed7d`;

it('trusts WeChat articles only from the platform registered account', () => {
  expect(wechatAccounts(wb.wechat)).toEqual(['MzYzODgxODMzNQ==']);
  expect(officialTier(article('MzYzODgxODMzNQ=='), wb, [])).toBe('official');
  expect(officialTier(article('MzkyNTYxNzg5Mg=='), wb, [])).toBeNull();
  expect(officialTier('https://mp.weixin.qq.com/s/hrZcV05ZSIKvd1dzSqDNDQ', wb, [])).toBeNull();
  expect(officialTier(article('MzYzODgxODMzNQ=='), { ...wb, wechat: null }, [])).toBeNull();
});

it('learns an account once from an approved WeChat-backed perk and keeps existing text', async () => {
  const f = identityDb();
  f.sqlite.exec("UPDATE platforms SET wechat='Vendor 公众号' WHERE id='vendor'");
  expect(await learnWechatAccount(f.db, 'vendor', article('MzkyNTYxNzg5Mg=='))).toBe(true);
  expect(await learnWechatAccount(f.db, 'vendor', article('MzkyNTYxNzg5Mg=='))).toBe(false);
  expect(await learnWechatAccount(f.db, 'vendor', 'https://vendor.example/rewards')).toBe(false);
  expect(f.sqlite.prepare("SELECT wechat FROM platforms WHERE id='vendor'").get()).toEqual({ wechat: 'Vendor 公众号,MzkyNTYxNzg5Mg==' });
  f.sqlite.close();
});
