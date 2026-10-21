import { describe, expect, it } from 'vitest';
import { calculatePrice } from '../src/price.js';

describe('calculatePrice', () => {
  it('excludes owned products and selects cheapest current offers', () => {
    const result = calculatePrice({
      currency: 'PLN',
      asOf: '2026-07-17T00:00:00.000Z',
      components: [
        { productId: 'owned-camera', owned: true },
        {
          productId: 'microphone',
          owned: false,
          offers: [
            {
              id: 'a',
              priceMinor: 30_000,
              currency: 'PLN',
              updatedAt: '2026-07-16T00:00:00.000Z',
              available: true,
            },
            {
              id: 'b',
              priceMinor: 25_000,
              currency: 'PLN',
              updatedAt: '2026-07-16T00:00:00.000Z',
              available: true,
              sponsored: true,
            },
          ],
        },
      ],
    });
    expect(result.value?.cheapestTotalMinor).toBe(25_000);
    expect(result.value?.ownedProductIds).toEqual(['owned-camera']);
    expect(result.value?.cheapestOffers[0]?.offerId).toBe('b');
  });

  it('reports absent offers instead of treating them as zero-priced products', () => {
    const result = calculatePrice({
      currency: 'PLN',
      asOf: '2026-07-17T00:00:00.000Z',
      components: [{ productId: 'lens', owned: false }],
    });
    expect(result.status).toBe('partial');
    expect(result.value?.missingProductIds).toEqual(['lens']);
    expect(result.missingData).toContain('components.lens.offer');
  });

  it('warns about stale prices', () => {
    const result = calculatePrice({
      currency: 'PLN',
      asOf: '2026-07-17T00:00:00.000Z',
      staleAfterDays: 7,
      components: [
        {
          productId: 'card',
          owned: false,
          offers: [
            {
              id: 'old',
              priceMinor: 10_000,
              currency: 'PLN',
              updatedAt: '2026-06-01T00:00:00.000Z',
              available: true,
            },
          ],
        },
      ],
    });
    expect(result.issues.some((issue) => issue.code === 'PRICE_STALE_OFFER')).toBe(true);
  });
});
