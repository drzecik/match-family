import { describe, expect, it } from 'vitest';
import {
  accessCookie,
  accessCookieName,
  createAccessToken,
  readCookie,
  timingSafeEqual,
} from './access-gate';

describe('deployment access gate', () => {
  it('derives a stable token without exposing the password', async () => {
    const token = await createAccessToken('test-password');
    expect(token).toHaveLength(64);
    expect(token).not.toContain('test-password');
    expect(await createAccessToken('test-password')).toBe(token);
    expect(await createAccessToken('different-password')).not.toBe(token);
  });

  it('reads only the exact access cookie', () => {
    expect(readCookie('other=1; creatorrig_access=abc%20123', accessCookieName())).toBe('abc 123');
    expect(readCookie('creatorrig_access_extra=wrong', accessCookieName())).toBeUndefined();
    expect(readCookie(null, accessCookieName())).toBeUndefined();
  });

  it('compares tokens and emits a hardened cookie', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abd', 'abc')).toBe(false);
    expect(timingSafeEqual(undefined, 'abc')).toBe(false);
    expect(accessCookie('token')).toContain(
      'creatorrig_access=token; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800',
    );
  });
});
