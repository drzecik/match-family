import { parse } from 'csv-parse/sync';
import { z } from 'zod';

const MAX_CSV_BYTES = 2_000_000;
const MAX_ROWS = 10_000;
const FORMULA_PREFIX = /^[\s]*[=+\-@\t\r]/u;

const safeUrlSchema = z
  .string()
  .url()
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'Only http/https URLs are allowed');

const offerRowSchema = z.object({
  id: z.string().min(1).max(120),
  consumableId: z.string().min(1).max(120),
  merchant: z.string().min(1).max(160),
  merchantProductId: z.string().min(1).max(160),
  sku: z.string().max(120).optional(),
  ean: z.string().regex(/^\d{8,14}$/u).optional(),
  priceMinor: z.number().int().nonnegative().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/u),
  shippingMinor: z.number().int().nonnegative().optional(),
  availability: z.enum(['in_stock', 'out_of_stock', 'preorder', 'unknown']),
  destinationUrl: safeUrlSchema,
  affiliateUrl: safeUrlSchema.optional(),
  sponsored: z.boolean(),
  fetchedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  status: z.enum(['active', 'inactive'])
});

export type Offer = z.infer<typeof offerRowSchema>;

export interface OfferProviderInput {
  payload: string;
  retrievedAt: string;
}

/** Domain-neutral port. API/feed adapters can implement it without changing compatibility data. */
export interface OfferProvider {
  readonly id: string;
  load(input: OfferProviderInput): Promise<OfferImportReport>;
}

export interface OfferImportReport {
  accepted: Offer[];
  rejected: Array<{ row: number; reasons: string[] }>;
  duplicateIds: string[];
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function optionalMinor(value: string | undefined): number | undefined {
  const normalized = optional(value);
  if (normalized === undefined) return undefined;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function hasFormulaCell(row: Record<string, string>): boolean {
  return Object.values(row).some((value) => FORMULA_PREFIX.test(value));
}

export function importOffersCsv(csv: string): OfferImportReport {
  if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) throw new Error('Offer CSV exceeds the 2 MB limit');

  let rows: Record<string, string>[];
  try {
    rows = parse(csv, {
      bom: true,
      columns: true,
      skip_empty_lines: true,
      relax_column_count: false,
      trim: false
    }) as Record<string, string>[];
  } catch (error) {
    throw new Error(`Malformed offer CSV: ${error instanceof Error ? error.message : 'unknown parser error'}`);
  }

  if (rows.length > MAX_ROWS) throw new Error(`Offer CSV exceeds the ${MAX_ROWS} row limit`);

  const accepted: Offer[] = [];
  const rejected: OfferImportReport['rejected'] = [];
  const duplicateIds: string[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (hasFormulaCell(row)) {
      rejected.push({ row: rowNumber, reasons: ['Potential CSV formula injection'] });
      return;
    }

    const candidate = {
      id: row.id?.trim(),
      consumableId: row.consumableId?.trim(),
      merchant: row.merchant?.trim(),
      merchantProductId: (row.merchantProductId ?? row.productId)?.trim(),
      sku: optional(row.sku),
      ean: optional(row.ean),
      priceMinor: optionalMinor(row.priceMinor),
      currency: row.currency?.trim().toUpperCase(),
      shippingMinor: optionalMinor(row.shippingMinor),
      availability: row.availability?.trim(),
      destinationUrl: row.destinationUrl?.trim(),
      affiliateUrl: optional(row.affiliateUrl),
      sponsored: row.sponsored?.trim().toLowerCase() === 'true',
      fetchedAt: row.fetchedAt?.trim(),
      expiresAt: row.expiresAt?.trim(),
      status: row.status?.trim()
    };

    const result = offerRowSchema.safeParse(candidate);
    if (!result.success) {
      rejected.push({ row: rowNumber, reasons: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) });
      return;
    }
    if (seen.has(result.data.id)) {
      duplicateIds.push(result.data.id);
      rejected.push({ row: rowNumber, reasons: ['Duplicate offer id in import'] });
      return;
    }
    seen.add(result.data.id);
    accepted.push(result.data);
  });

  return { accepted, rejected, duplicateIds };
}

export class CsvOfferProvider implements OfferProvider {
  readonly id = 'controlled-csv';

  async load(input: OfferProviderInput): Promise<OfferImportReport> {
    if (!Number.isFinite(Date.parse(input.retrievedAt))) throw new Error('retrievedAt must be an ISO date');
    return importOffersCsv(input.payload);
  }
}

export function isOfferCurrent(offer: Offer, now = new Date()): boolean {
  return offer.status === 'active' && new Date(offer.expiresAt).getTime() > now.getTime();
}

export function displayPriceMinor(offer: Offer, now = new Date()): number | null {
  return isOfferCurrent(offer, now) && offer.priceMinor !== undefined ? offer.priceMinor : null;
}

export function sortOffers(offers: readonly Offer[], now = new Date()): Offer[] {
  const availabilityRank: Record<Offer['availability'], number> = {
    in_stock: 0,
    preorder: 1,
    unknown: 2,
    out_of_stock: 3
  };
  return [...offers].sort((left, right) => {
    const current = Number(isOfferCurrent(right, now)) - Number(isOfferCurrent(left, now));
    if (current !== 0) return current;
    const availability = availabilityRank[left.availability] - availabilityRank[right.availability];
    if (availability !== 0) return availability;
    const leftTotal = (left.priceMinor ?? Number.MAX_SAFE_INTEGER) + (left.shippingMinor ?? 0);
    const rightTotal = (right.priceMinor ?? Number.MAX_SAFE_INTEGER) + (right.shippingMinor ?? 0);
    return leftTotal - rightTotal || left.merchant.localeCompare(right.merchant, 'pl');
  });
}
