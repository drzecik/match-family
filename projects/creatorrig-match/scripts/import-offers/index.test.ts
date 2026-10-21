import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  importSyntheticOffers,
  SYNTHETIC_MERCHANT_POLICIES,
  type OfferImportOptions,
} from './index.js';

const options: OfferImportOptions = {
  now: '2026-07-17T12:00:00.000Z',
  staleAfterDays: 30,
  merchantPolicies: SYNTHETIC_MERCHANT_POLICIES,
};

function feed(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: '1.0.0-synthetic',
    synthetic: true,
    notForProduction: true,
    offers: [
      {
        id: 'offer-a',
        productId: 'product-a',
        merchant: 'Creator Supply Demo',
        priceMinor: 10_000,
        currency: 'PLN',
        affiliateUrl: 'https://creator-supply.synthetic.example/products/product-a?ref=creatorrig',
        availability: 'in_stock',
        updatedAt: '2026-07-16T12:00:00.000Z',
        sponsored: false,
        synthetic: true,
        notForProduction: true,
        ...overrides,
      },
    ],
  };
}

describe('synthetic offer importer', () => {
  it('imports a strictly allowlisted synthetic offer', () => {
    const [result] = importSyntheticOffers(feed(), new Set(['product-a']), options);
    expect(result?.assessment.publishable).toBe(true);
    expect(result?.assessment.fresh).toBe(true);
    expect(result?.offer.affiliateUrl).toBe(
      'https://creator-supply.synthetic.example/products/product-a?ref=creatorrig',
    );
  });

  it('blocks an open redirect on an otherwise allowlisted merchant host', () => {
    expect(() =>
      importSyntheticOffers(
        feed({
          affiliateUrl:
            'https://creator-supply.synthetic.example/products/product-a?redirect=https://evil.test',
        }),
        new Set(['product-a']),
        options,
      ),
    ).toThrow('unsafe_or_unapproved_affiliate_url');
  });

  it('blocks an unapproved path on an approved merchant host', () => {
    expect(() =>
      importSyntheticOffers(
        feed({
          affiliateUrl: 'https://creator-supply.synthetic.example/redirect?ref=creatorrig',
        }),
        new Set(['product-a']),
        options,
      ),
    ).toThrow('unsafe_or_unapproved_affiliate_url');
  });

  it('blocks merchant and hostname substitution', () => {
    expect(() =>
      importSyntheticOffers(feed({ merchant: 'Rig Outlet Demo' }), new Set(['product-a']), options),
    ).toThrow('unsafe_or_unapproved_affiliate_url');
  });

  it('blocks offers for products absent from the catalog', () => {
    expect(() => importSyntheticOffers(feed(), new Set(['other-product']), options)).toThrow(
      'unknown_product_id:product-a',
    );
  });

  it('requires both synthetic safety flags on every record', () => {
    expect(() =>
      importSyntheticOffers(feed({ notForProduction: false }), new Set(['product-a']), options),
    ).toThrow('record_must_be_synthetic_and_not_for_production');
  });

  it('imports stale and missing-price offers with explicit warnings', () => {
    const [result] = importSyntheticOffers(
      feed({ priceMinor: undefined, updatedAt: '2025-01-01T00:00:00.000Z' }),
      new Set(['product-a']),
      options,
    );
    expect(result?.assessment.publishable).toBe(true);
    expect(result?.assessment.fresh).toBe(false);
    expect(result?.assessment.warnings).toEqual([
      'price_unavailable',
      'stale_or_invalid_price_date',
    ]);
  });

  it('rejects duplicate offer identities', () => {
    const value = feed();
    value.offers.push({ ...value.offers[0]! });
    expect(() => importSyntheticOffers(value, new Set(['product-a']), options)).toThrow(
      'duplicate_offer_id:offer-a',
    );
  });
});

describe('synthetic offer fixture integration', () => {
  it('imports the full fixture against current catalog product IDs', async () => {
    const [offerText, catalogText] = await Promise.all([
      readFile(new URL('../../data/offers/synthetic-offers.json', import.meta.url), 'utf8'),
      readFile(new URL('../../data/fixtures/demo-catalog.json', import.meta.url), 'utf8'),
    ]);
    const catalog = JSON.parse(catalogText) as { products: Array<{ id: string }> };
    const imported = importSyntheticOffers(
      JSON.parse(offerText) as unknown,
      new Set(catalog.products.map(({ id }) => id)),
      options,
    );

    expect(imported.length).toBeGreaterThanOrEqual(25);
    expect(imported.some(({ offer }) => offer.sponsored)).toBe(true);
    expect(imported.some(({ assessment }) => !assessment.fresh)).toBe(true);
    expect(imported.some(({ offer }) => offer.priceMinor === undefined)).toBe(true);
    expect(imported.some(({ offer }) => offer.availability === 'out_of_stock')).toBe(true);
    expect(imported.every(({ offer }) => offer.synthetic && offer.notForProduction)).toBe(true);
  });
});
