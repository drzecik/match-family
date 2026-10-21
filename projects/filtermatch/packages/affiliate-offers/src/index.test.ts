import { describe, expect, it } from 'vitest';
import { CsvOfferProvider, displayPriceMinor, importOffersCsv, sortOffers, type Offer } from './index.js';

const header = 'id,consumableId,merchant,productId,sku,ean,priceMinor,currency,shippingMinor,availability,destinationUrl,affiliateUrl,sponsored,fetchedAt,expiresAt,status';
const valid = 'offer-1,filter-1,Fixture Shop,p-1,CF-1,5901234123457,10999,PLN,1200,in_stock,https://example.test/p/1,https://example.test/a/1,false,2026-07-17T08:00:00.000Z,2026-08-17T08:00:00.000Z,active';

describe('offer CSV import', () => {
  it('imports a controlled row and supports an offer without a price', () => {
    const report = importOffersCsv(`${header}\n${valid}\noffer-2,filter-1,Other,p-2,,,,PLN,,unknown,https://example.test/p/2,,false,2026-07-17T08:00:00.000Z,2026-08-17T08:00:00.000Z,active`);
    expect(report.accepted).toHaveLength(2);
    expect(report.accepted[1]?.priceMinor).toBeUndefined();
  });

  it('rejects formula injection and malicious URL protocols', () => {
    const formula = valid.replace('Fixture Shop', '=1+1');
    const protocol = valid.replace('https://example.test/p/1', 'javascript:alert(1)').replace('offer-1', 'offer-2');
    const report = importOffersCsv(`${header}\n${formula}\n${protocol}`);
    expect(report.accepted).toHaveLength(0);
    expect(report.rejected).toHaveLength(2);
  });

  it('fails closed for malformed CSV and rejects duplicate ids', () => {
    expect(() => importOffersCsv(`${header}\n"broken`)).toThrow('Malformed offer CSV');
    const report = importOffersCsv(`${header}\n${valid}\n${valid}`);
    expect(report.accepted).toHaveLength(1);
    expect(report.duplicateIds).toEqual(['offer-1']);
  });

  it('exposes CSV through the neutral OfferProvider port', async () => {
    const report = await new CsvOfferProvider().load({
      payload: `${header}\n${valid}`,
      retrievedAt: '2026-07-17T08:00:00.000Z'
    });
    expect(report.accepted[0]?.merchantProductId).toBe('p-1');
  });
});

describe('offer presentation', () => {
  const base: Offer = importOffersCsv(`${header}\n${valid}`).accepted[0]!;

  it('does not present a stale price as current', () => {
    expect(displayPriceMinor(base, new Date('2026-09-01T00:00:00.000Z'))).toBeNull();
  });

  it('sorts current available offers by total price, not sponsorship', () => {
    const cheaperSponsored = { ...base, id: 'sponsored', priceMinor: 9000, sponsored: true };
    const cheaperOrganic = { ...base, id: 'organic', priceMinor: 8000, sponsored: false };
    expect(sortOffers([cheaperSponsored, cheaperOrganic], new Date('2026-07-20T00:00:00.000Z')).map(({ id }) => id)).toEqual([
      'organic',
      'sponsored'
    ]);
  });
});
