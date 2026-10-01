import { describe, expect, it } from 'vitest';
import { reviewerFor } from '../src/worker/admin';

const env = { REVIEWER_TOKENS: 'alice:aaaaaaaaaaaaaaaaaaaa, bob:short' } as any;
describe('reviewer tokens', () => {
  it('matches a reviewer by token', () => expect(reviewerFor(env, 'aaaaaaaaaaaaaaaaaaaa')).toBe('alice'));
  it('ignores short or unknown tokens', () => {
    expect(reviewerFor(env, 'short')).toBeNull();
    expect(reviewerFor(env, 'bbbbbbbbbbbbbbbbbbbb')).toBeNull();
    expect(reviewerFor({} as any, 'aaaaaaaaaaaaaaaaaaaa')).toBeNull();
  });
});
