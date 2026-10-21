import { describe, expect, it } from 'vitest';
import {
  categoryLabel,
  dimensionExplanation,
  dimensionLabel,
  dimensionStatusLabel,
  evidenceSourceLabel,
  formatEvidenceDate,
  localizeTechnicalCopy,
  relationTypeLabel,
  searchMatchLabel,
  subcategoryLabel,
} from './polish-labels';

describe('Polish presentation labels', () => {
  it('covers every category and subcategory present in the synthetic catalog', async () => {
    const catalog = await import('../../../../data/fixtures/demo-catalog.json');

    for (const product of catalog.default.products) {
      expect(categoryLabel(product.category)).not.toBe('Pozostały sprzęt');
      expect(subcategoryLabel(product.subcategory)).not.toBe('akcesorium');
      expect(categoryLabel(product.category)).not.toContain('_');
      expect(subcategoryLabel(product.subcategory)).not.toContain('_');
    }
  });

  it('turns graph vocabulary into clear Polish labels', () => {
    expect(relationTypeLabel('candidate')).toBe('Oczekuje na weryfikację');
    expect(relationTypeLabel('unknown')).toBe('Niepotwierdzone');
    expect(dimensionStatusLabel('compatible_with_limitations')).toBe(
      'zgodne z ograniczeniami',
    );
    expect(dimensionLabel('sustainedWrite')).toBe('Ciągła prędkość zapisu');
    expect(dimensionExplanation('sustainedWrite', 'unknown')).toMatch(/Brakuje/);
  });

  it('localizes source, search, and date metadata', () => {
    expect(evidenceSourceLabel('official_manual')).toBe('oficjalna instrukcja');
    expect(searchMatchLabel('canonical_name')).toBe('nazwa produktu');
    expect(formatEvidenceDate('2026-07-17')).toBe('17 lipca 2026');
  });

  it('keeps Polish grammar while replacing imported technical jargon', () => {
    expect(localizeTechnicalCopy('Adapter jest uwzględniony w payloadzie.')).toBe(
      'Adapter jest uwzględniony w obciążeniu.',
    );
    expect(localizeTechnicalCopy('Powerbank jest wyłączony z payloadu gimbala.')).toBe(
      'Powerbank jest wyłączony z obciążenia stabilizatora.',
    );
    expect(localizeTechnicalCopy('Mikrofon jest zamocowany w górnym cold shoe.')).toBe(
      'Mikrofon jest zamocowany w górnej stopce akcesoriów.',
    );
    expect(
      localizeTechnicalCopy(
        'Collision-free and vignetting-free use is confirmed only under stated limitations.',
      ),
    ).toBe(
      'Brak kolizji i winietowania potwierdzono wyłącznie przy zachowaniu podanych ograniczeń.',
    );
  });
});
