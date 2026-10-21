import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  assessOffer,
  safeMerchantAffiliateUrl,
  type AffiliateOffer,
  type MerchantUrlPolicy,
  type OfferAssessment,
} from '@creatorrig/affiliate-offers';

export interface SyntheticAffiliateOffer extends AffiliateOffer {
  readonly synthetic: true;
  readonly notForProduction: true;
}

export interface ImportedOffer {
  readonly offer: SyntheticAffiliateOffer;
  readonly assessment: OfferAssessment;
}

export interface OfferImportOptions {
  readonly now: string;
  readonly staleAfterDays: number;
  readonly merchantPolicies: readonly MerchantUrlPolicy[];
}

export const SYNTHETIC_MERCHANT_POLICIES: readonly MerchantUrlPolicy[] = [
  {
    merchant: 'Creator Supply Demo',
    host: 'creator-supply.synthetic.example',
    allowedPathPrefixes: ['/products/'],
  },
  {
    merchant: 'Rig Outlet Demo',
    host: 'rig-outlet.synthetic.example',
    allowedPathPrefixes: ['/catalog/'],
  },
];

export function importSyntheticOffers(
  raw: unknown,
  catalogProductIds: ReadonlySet<string>,
  options: OfferImportOptions,
): readonly ImportedOffer[] {
  const root = asRecord(raw, 'offer feed');
  if (root.schemaVersion !== '1.0.0-synthetic') fail('unsupported_schema_version');
  if (root.synthetic !== true || root.notForProduction !== true) {
    fail('feed_must_be_synthetic_and_not_for_production');
  }
  if (!Array.isArray(root.offers)) fail('offers_must_be_an_array');

  const imported: ImportedOffer[] = [];
  const seenIds = new Set<string>();
  for (const [index, value] of root.offers.entries()) {
    const offer = parseOffer(value, `offers[${index}]`);
    if (seenIds.has(offer.id)) fail(`duplicate_offer_id:${offer.id}`);
    seenIds.add(offer.id);
    if (!catalogProductIds.has(offer.productId)) fail(`unknown_product_id:${offer.productId}`);

    const strictUrl = safeMerchantAffiliateUrl(
      offer.affiliateUrl,
      offer.merchant,
      options.merchantPolicies,
    );
    if (strictUrl === undefined) fail(`unsafe_or_unapproved_affiliate_url:${offer.id}`);
    const assessment = assessOffer(offer, {
      now: options.now,
      staleAfterDays: options.staleAfterDays,
      allowedMerchantHosts: options.merchantPolicies.map(({ host }) => host),
    });
    if (!assessment.publishable) {
      fail(`unpublishable_offer:${offer.id}:${assessment.warnings.join(',')}`);
    }
    imported.push({ offer: { ...offer, affiliateUrl: strictUrl }, assessment });
  }
  return imported;
}

function parseOffer(value: unknown, path: string): SyntheticAffiliateOffer {
  const record = asRecord(value, path);
  const id = requiredString(record.id, `${path}.id`);
  const productId = requiredString(record.productId, `${path}.productId`);
  const merchant = requiredString(record.merchant, `${path}.merchant`);
  const currency = requiredString(record.currency, `${path}.currency`);
  const affiliateUrl = requiredString(record.affiliateUrl, `${path}.affiliateUrl`);
  const updatedAt = requiredString(record.updatedAt, `${path}.updatedAt`);
  if (record.synthetic !== true || record.notForProduction !== true) {
    fail(`${path}:record_must_be_synthetic_and_not_for_production`);
  }
  if (typeof record.sponsored !== 'boolean') fail(`${path}.sponsored:expected_boolean`);
  const availability = record.availability;
  if (!['in_stock', 'out_of_stock', 'preorder', 'unknown'].includes(String(availability))) {
    fail(`${path}.availability:invalid_value`);
  }
  const priceMinor = record.priceMinor;
  if (priceMinor !== undefined && (!Number.isInteger(priceMinor) || Number(priceMinor) < 0)) {
    fail(`${path}.priceMinor:expected_non_negative_integer_or_absent`);
  }
  return {
    id,
    productId,
    merchant,
    ...(priceMinor === undefined ? {} : { priceMinor: Number(priceMinor) }),
    currency,
    affiliateUrl,
    availability: availability as AffiliateOffer['availability'],
    updatedAt,
    sponsored: record.sponsored,
    synthetic: true,
    notForProduction: true,
  };
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${path}:expected_object`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) fail(`${path}:expected_string`);
  return value;
}

function fail(message: string): never {
  throw new Error(message);
}

async function main(): Promise<void> {
  const offersUrl = new URL('../../data/offers/synthetic-offers.json', import.meta.url);
  const catalogUrl = new URL('../../data/fixtures/demo-catalog.json', import.meta.url);
  const [offerText, catalogText] = await Promise.all([
    readFile(offersUrl, 'utf8'),
    readFile(catalogUrl, 'utf8'),
  ]);
  const catalog = asRecord(JSON.parse(catalogText) as unknown, 'catalog');
  if (!Array.isArray(catalog.products)) fail('catalog.products:expected_array');
  const productIds = new Set(
    catalog.products.map((product, index) =>
      requiredString(asRecord(product, `products[${index}]`).id, `products[${index}].id`),
    ),
  );
  const imported = importSyntheticOffers(JSON.parse(offerText) as unknown, productIds, {
    now: new Date().toISOString(),
    staleAfterDays: 30,
    merchantPolicies: SYNTHETIC_MERCHANT_POLICIES,
  });
  const stale = imported.filter(({ assessment }) => !assessment.fresh).length;
  const missingPrice = imported.filter(({ offer }) => offer.priceMinor === undefined).length;
  const unavailable = imported.filter(({ offer }) => offer.availability === 'out_of_stock').length;
  process.stdout.write(
    `Validated ${imported.length} synthetic offers (${stale} stale, ${missingPrice} without price, ${unavailable} unavailable).\n`,
  );
}

const entryPath = process.argv[1];
if (entryPath !== undefined && fileURLToPath(import.meta.url) === entryPath) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
