import { afterEach, describe, expect, it } from 'vitest';
import middleware from './middleware.js';

const originalPassword = process.env.FILTERMATCH_ACCESS_PASSWORD;
const originalBuildProfile = process.env.FILTERMATCH_BUILD_PROFILE;

afterEach(() => {
  if (originalPassword === undefined) delete process.env.FILTERMATCH_ACCESS_PASSWORD;
  else process.env.FILTERMATCH_ACCESS_PASSWORD = originalPassword;
  if (originalBuildProfile === undefined) delete process.env.FILTERMATCH_BUILD_PROFILE;
  else process.env.FILTERMATCH_BUILD_PROFILE = originalBuildProfile;
});

describe('protected public demonstrator middleware', () => {
  it('fails closed when the deployment secret is missing', async () => {
    delete process.env.FILTERMATCH_ACCESS_PASSWORD;

    const response = middleware(new Request('https://filtermatch.example/'));

    expect(response.status).toBe(503);
    expect(await response.text()).toContain('brak konfiguracji dostępu');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
  });

  it('requests Basic Auth without exposing the configured password', async () => {
    process.env.FILTERMATCH_ACCESS_PASSWORD = 'test-secret';

    const response = middleware(new Request('https://filtermatch.example/'));

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Basic realm="FilterMatch", charset="UTF-8"');
    expect(await response.text()).not.toContain('test-secret');
  });

  it('rejects an incorrect username or password', () => {
    process.env.FILTERMATCH_ACCESS_PASSWORD = 'test-secret';

    for (const credentials of ['other:test-secret', 'filtermatch:wrong']) {
      const response = middleware(requestWithCredentials(credentials));
      expect(response.status).toBe(401);
    }
  });

  it('continues only for the exact configured credentials and keeps the demo out of search indexes', () => {
    process.env.FILTERMATCH_ACCESS_PASSWORD = 'test-secret';

    const response = middleware(requestWithCredentials('filtermatch:test-secret'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive');
  });

  it('hides demonstrator routes and rewrites the old catalog in private review mode', () => {
    process.env.FILTERMATCH_ACCESS_PASSWORD = 'test-secret';
    process.env.FILTERMATCH_BUILD_PROFILE = 'private-review';

    const hidden = middleware(requestWithCredentials('filtermatch:test-secret', '/urzadzenia/airpure-ap100-pl/'));
    expect(hidden.status).toBe(404);
    expect(hidden.headers.get('x-robots-tag')).toContain('noindex');

    const catalog = middleware(requestWithCredentials('filtermatch:test-secret', '/katalog/'));
    expect(catalog.status).toBe(200);
    expect(catalog.headers.get('x-middleware-rewrite')).toBe('https://filtermatch.example/przeglad-danych/');

    for (const path of ['/materialy/example/', '/szukaj/', '/korekty/', '/afiliacja/']) {
      expect(middleware(requestWithCredentials('filtermatch:test-secret', path)).status).toBe(404);
    }

    const review = middleware(requestWithCredentials('filtermatch:test-secret', '/przeglad-danych/'));
    expect(review.status).toBe(200);
    expect(review.headers.get('x-middleware-next')).toBe('1');
    expect(review.headers.get('cache-control')).toBe('private, no-store');
  });
});

function requestWithCredentials(credentials: string, path = '/'): Request {
  return new Request(`https://filtermatch.example${path}`, {
    headers: { authorization: `Basic ${btoa(credentials)}` }
  });
}
