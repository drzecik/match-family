import { describe, expect, it } from 'vitest';
import { validateProductionSiteUrl } from './production-site.js';

describe('production site URL', () => {
  it('accepts only a clean public HTTPS origin', () => {
    expect(validateProductionSiteUrl('https://filtermatch.pl').origin).toBe('https://filtermatch.pl');
    expect(validateProductionSiteUrl('https://www.filtermatch.pl/').origin).toBe('https://www.filtermatch.pl');
  });

  it.each([
    'http://filtermatch.pl',
    'https://user:secret@filtermatch.pl',
    'https://filtermatch.pl/path',
    'https://filtermatch.pl/?preview=true',
    'https://localhost',
    'https://127.0.0.1',
    'https://localhost.',
    'https://filtermatch.example',
    'https://example.com',
    'https://example.com.',
    'https://preview.example.net',
    'https://preview.example.net.',
    'https://filtermatch.pl:8443'
  ])('rejects non-production site URL %s', (url) => {
    expect(() => validateProductionSiteUrl(url)).toThrow(/real HTTPS origin/u);
  });
});
