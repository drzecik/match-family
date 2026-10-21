import { describe, expect, it } from 'vitest';
import {
  assessOffer,
  rankCompatibilityOfferCandidates,
  rankOffers,
  safeAffiliateUrl,
  safeMerchantAffiliateUrl,
  sponsorshipDisclosure,
  type AffiliateOffer,
} from '../src/index.js';

const offer = (overrides: Partial<AffiliateOffer> = {}): AffiliateOffer => ({
  id: 'offer-1',
  productId: 'product-1',
  merchant: 'Synthetic Store',
  priceMinor: 10_000,
  currency: 'PLN',
  affiliateUrl: 'https://shop.synthetic.example/products/1?ref=creatorrig',
  availability: 'in_stock',
  updatedAt: '2026-07-15T00:00:00.000Z',
  sponsored: false,
  ...overrides,
});

describe('affiliate offer safety', () => {
  it('accepts an exact allowlisted HTTPS merchant URL', () => {
    expect(safeAffiliateUrl(offer().affiliateUrl, ['shop.synthetic.example'])).toBe(
      'https://shop.synthetic.example/products/1?ref=creatorrig',
    );
  });

  it.each([
    'javascript:alert(1)',
    'http://shop.synthetic.example/product',
    'https://shop.synthetic.example.evil.test/product',
    'https://user:password@shop.synthetic.example/product',
    'https://shop.synthetic.example:444/product',
  ])('rejects unsafe redirect target %s', (url) => {
    expect(safeAffiliateUrl(url, ['shop.synthetic.example'])).toBeUndefined();
  });

  it('marks stale prices without publishing an unsafe warning-free claim', () => {
    const result = assessOffer(offer({ updatedAt: '2025-01-01T00:00:00.000Z' }), {
      now: '2026-07-17T00:00:00.000Z',
      staleAfterDays: 30,
      allowedMerchantHosts: ['shop.synthetic.example'],
    });
    expect(result.publishable).toBe(true);
    expect(result.fresh).toBe(false);
    expect(result.warnings).toContain('stale_or_invalid_price_date');
  });

  it('blocks invalid price and unapproved URL', () => {
    const result = assessOffer(
      offer({ priceMinor: -1, affiliateUrl: 'https://evil.test/redirect' }),
      {
        now: '2026-07-17T00:00:00.000Z',
        staleAfterDays: 30,
        allowedMerchantHosts: ['shop.synthetic.example'],
      },
    );
    expect(result.publishable).toBe(false);
    expect(result.safeUrl).toBeUndefined();
  });

  it('keeps a missing price publishable but warns and sorts it after known prices', () => {
    const missingPrice = offer({ id: 'without-price', priceMinor: undefined });
    const result = assessOffer(missingPrice, {
      now: '2026-07-17T00:00:00.000Z',
      staleAfterDays: 30,
      allowedMerchantHosts: ['shop.synthetic.example'],
    });
    expect(result.publishable).toBe(true);
    expect(result.warnings).toContain('price_unavailable');
    expect(rankOffers([missingPrice, offer({ id: 'priced' })]).map(({ id }) => id)).toEqual([
      'priced',
      'without-price',
    ]);
  });

  it('rejects allowlisted merchant URLs that can act as open redirects', () => {
    const policies = [
      {
        merchant: 'Synthetic Store',
        host: 'shop.synthetic.example',
        allowedPathPrefixes: ['/products/'],
      },
    ];
    expect(
      safeMerchantAffiliateUrl(
        'https://shop.synthetic.example/products/1?redirect=https://evil.test',
        'Synthetic Store',
        policies,
      ),
    ).toBeUndefined();
    expect(
      safeMerchantAffiliateUrl(
        'https://shop.synthetic.example/products/%72edirect?ref=creatorrig',
        'Synthetic Store',
        policies,
      ),
    ).toBeUndefined();
    expect(
      safeMerchantAffiliateUrl(
        'https://shop.synthetic.example/products/1?ref=creatorrig',
        'Synthetic Store',
        policies,
      ),
    ).toBe('https://shop.synthetic.example/products/1?ref=creatorrig');
  });

  it('never lets sponsorship change offer ordering', () => {
    const cheap = offer({ id: 'cheap', priceMinor: 9_000, sponsored: false });
    const expensiveSponsored = offer({ id: 'expensive', priceMinor: 11_000, sponsored: true });
    expect(rankOffers([expensiveSponsored, cheap]).map((item) => item.id)).toEqual([
      'cheap',
      'expensive',
    ]);
    expect(sponsorshipDisclosure(expensiveSponsored)).toBe('Pozycja sponsorowana');
  });

  it('orders unavailable stock after purchasable offers regardless of price', () => {
    const unavailable = offer({ id: 'unavailable', priceMinor: 1, availability: 'out_of_stock' });
    const available = offer({ id: 'available', priceMinor: 50_000, availability: 'in_stock' });
    expect(rankOffers([unavailable, available]).map(({ id }) => id)).toEqual([
      'available',
      'unavailable',
    ]);
  });

  it('never lets sponsorship change compatibility-first product ranking', () => {
    const compatible = offer({
      id: 'compatible-offer',
      productId: 'compatible-product',
      priceMinor: 12_000,
      sponsored: false,
    });
    const limitedSponsored = offer({
      id: 'limited-sponsored',
      productId: 'limited-product',
      priceMinor: 8_000,
      sponsored: true,
    });
    const candidates = [
      { productId: 'limited-product', compatibilityRank: 1, offer: limitedSponsored },
      { productId: 'compatible-product', compatibilityRank: 0, offer: compatible },
    ];
    expect(rankCompatibilityOfferCandidates(candidates).map(({ productId }) => productId)).toEqual([
      'compatible-product',
      'limited-product',
    ]);
    expect(
      rankCompatibilityOfferCandidates([
        candidates[0]!,
        { ...candidates[1]!, offer: { ...compatible, sponsored: true } },
      ]).map(({ productId }) => productId),
    ).toEqual(['compatible-product', 'limited-product']);
  });
});
