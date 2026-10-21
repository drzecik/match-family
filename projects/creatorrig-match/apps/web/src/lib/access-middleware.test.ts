import { afterEach, describe, expect, it } from 'vitest';
import middleware from '../../../../middleware';
import { accessCookieName, createAccessToken } from './access-gate';

const originalPassword = process.env.SITE_PASSWORD;

afterEach(() => {
  if (originalPassword === undefined) delete process.env.SITE_PASSWORD;
  else process.env.SITE_PASSWORD = originalPassword;
});

describe('public deployment middleware', () => {
  it('fails closed when no password is configured', async () => {
    delete process.env.SITE_PASSWORD;
    const response = await middleware(new Request('https://example.test/'));
    expect(response?.status).toBe(503);
  });

  it('shows a Polish noindex login page to an unauthenticated visitor', async () => {
    process.env.SITE_PASSWORD = 'secret';
    const response = await middleware(new Request('https://example.test/produkt/test'));
    expect(response?.status).toBe(200);
    expect(response?.headers.get('x-robots-tag')).toContain('noindex');
    expect(await response?.text()).toContain('Wpisz hasło.');
  });

  it('rejects an incorrect password', async () => {
    process.env.SITE_PASSWORD = 'secret';
    const response = await middleware(
      new Request('https://example.test/__unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'password=wrong',
      }),
    );
    expect(response?.status).toBe(401);
    expect(await response?.text()).toContain('Podane hasło jest nieprawidłowe.');
  });

  it('sets a hardened cookie and admits its exact token', async () => {
    process.env.SITE_PASSWORD = 'secret';
    const unlockResponse = await middleware(
      new Request('https://example.test/__unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'password=secret',
      }),
    );
    expect(unlockResponse?.status).toBe(303);
    expect(unlockResponse?.headers.get('set-cookie')).toContain('HttpOnly; Secure; SameSite=Lax');

    const token = await createAccessToken('secret');
    const admitted = await middleware(
      new Request('https://example.test/', {
        headers: { Cookie: `${accessCookieName()}=${token}` },
      }),
    );
    expect(admitted).toBeUndefined();
  });
});
