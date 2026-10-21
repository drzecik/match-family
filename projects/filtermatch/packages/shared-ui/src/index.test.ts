import { describe, expect, it } from 'vitest';
import {
  compatibilityRelationLabel,
  consumableCategoryLabel,
  serializeStructuredData
} from './index.js';

describe('catalog labels', () => {
  it('distinguishes complete sets, individual elements and accessories', () => {
    expect(consumableCategoryLabel('air-purifier-filter-set')).toBe('Kompletny zestaw filtrów');
    expect(consumableCategoryLabel('air-purifier-hepa-filter')).toBe('Filtr HEPA');
    expect(consumableCategoryLabel('air-purifier-carbon-filter')).toBe('Filtr węglowy');
    expect(consumableCategoryLabel('air-purifier-prefilter')).toBe('Filtr wstępny');
    expect(consumableCategoryLabel('air-purifier-accessory')).toBe('Akcesorium eksploatacyjne');
  });

  it('makes optional accessories and alternatives explicit', () => {
    expect(compatibilityRelationLabel('required')).toBe('Wymagany element');
    expect(compatibilityRelationLabel('alternative')).toBe('Zweryfikowana alternatywa');
    expect(compatibilityRelationLabel('optional')).toBe('Opcjonalne akcesorium');
  });

  it('serializes structured data without allowing a script-closing payload', () => {
    const serialized = serializeStructuredData({ name: '</script><script>alert(1)</script>&' });
    expect(serialized).not.toContain('<');
    expect(serialized).not.toContain('</script>');
    expect(JSON.parse(serialized)).toEqual({ name: '</script><script>alert(1)</script>&' });
  });
});
