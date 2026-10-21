import { describe, expect, it } from 'vitest';
import { createTranslator, formatMoney } from './index';

describe('shared presentation helpers', () => {
  it('interpolates translated messages', () => {
    expect(createTranslator()('measurement.roomLegend', { number: 3 })).toBe('Pomieszczenie 3');
  });

  it('provides Polish labels for both corner count fields', () => {
    expect(createTranslator()('field.internalCorners')).toBe('Narożniki wewnętrzne');
    expect(createTranslator()('field.externalCorners')).toBe('Narożniki zewnętrzne');
  });

  it('formats money from minor currency units', () => {
    expect(formatMoney(12345, 'PLN')).toContain('123,45');
  });
});
