import { isFiniteNonNegative, result, type CalculationResult } from './result.js';

export interface PriceOffer {
  readonly id: string;
  readonly priceMinor: number;
  readonly currency: string;
  readonly updatedAt: string;
  readonly available: boolean;
  readonly sponsored?: boolean;
  readonly recommended?: boolean;
}

export interface PricedComponent {
  readonly productId: string;
  readonly owned: boolean;
  readonly offers?: readonly PriceOffer[];
}

export interface PriceCalculationInput {
  readonly components: readonly PricedComponent[];
  readonly currency: string;
  readonly asOf: string;
  readonly staleAfterDays?: number;
}

export interface SelectedOffer {
  readonly productId: string;
  readonly offerId: string;
  readonly priceMinor: number;
  readonly updatedAt: string;
  readonly sponsored: boolean;
}

export interface PriceCalculation {
  readonly currency: string;
  readonly cheapestTotalMinor: number;
  readonly recommendedTotalMinor: number;
  readonly ownedProductIds: readonly string[];
  readonly missingProductIds: readonly string[];
  readonly cheapestOffers: readonly SelectedOffer[];
  readonly recommendedOffers: readonly SelectedOffer[];
  readonly newestPriceAt?: string;
  readonly oldestPriceAt?: string;
}

function ageInDays(asOf: Date, updatedAt: Date): number {
  return (asOf.getTime() - updatedAt.getTime()) / 86_400_000;
}

function byPriceThenId(left: PriceOffer, right: PriceOffer): number {
  return left.priceMinor - right.priceMinor || left.id.localeCompare(right.id);
}

export function calculatePrice(input: PriceCalculationInput): CalculationResult<PriceCalculation> {
  const missingData: string[] = [];
  const issues = [];
  const ownedProductIds: string[] = [];
  const missingProductIds: string[] = [];
  const cheapestOffers: SelectedOffer[] = [];
  const recommendedOffers: SelectedOffer[] = [];
  const timestamps: number[] = [];
  const asOf = new Date(input.asOf);
  const staleAfterDays = input.staleAfterDays ?? 7;

  if (!Number.isFinite(asOf.getTime())) {
    return result<PriceCalculation>(
      undefined,
      ['asOf'],
      [
        {
          code: 'PRICE_INVALID_AS_OF',
          message: 'A valid as-of timestamp is required.',
          severity: 'error',
        },
      ],
    );
  }

  for (const component of input.components) {
    if (component.owned) {
      ownedProductIds.push(component.productId);
      continue;
    }

    const available = (component.offers ?? []).filter(
      (offer) =>
        offer.available &&
        offer.currency === input.currency &&
        isFiniteNonNegative(offer.priceMinor) &&
        Number.isInteger(offer.priceMinor) &&
        Number.isFinite(new Date(offer.updatedAt).getTime()),
    );
    if (available.length === 0) {
      missingProductIds.push(component.productId);
      missingData.push(`components.${component.productId}.offer`);
      continue;
    }

    const cheapest = [...available].sort(byPriceThenId)[0];
    if (cheapest === undefined) continue;
    const explicitlyRecommended = available
      .filter((offer) => offer.recommended)
      .sort(byPriceThenId)[0];
    const recommended = explicitlyRecommended ?? cheapest;
    const toSelected = (offer: PriceOffer): SelectedOffer => ({
      productId: component.productId,
      offerId: offer.id,
      priceMinor: offer.priceMinor,
      updatedAt: offer.updatedAt,
      sponsored: offer.sponsored ?? false,
    });
    cheapestOffers.push(toSelected(cheapest));
    recommendedOffers.push(toSelected(recommended));

    for (const offer of [cheapest, recommended]) {
      const updatedAt = new Date(offer.updatedAt);
      timestamps.push(updatedAt.getTime());
      if (ageInDays(asOf, updatedAt) > staleAfterDays) {
        issues.push({
          code: 'PRICE_STALE_OFFER',
          message: 'Offer price is older than the configured freshness threshold.',
          severity: 'warning' as const,
          subjectId: offer.id,
        });
      }
    }
  }

  const value: { -readonly [K in keyof PriceCalculation]: PriceCalculation[K] } = {
    currency: input.currency,
    cheapestTotalMinor: cheapestOffers.reduce((sum, offer) => sum + offer.priceMinor, 0),
    recommendedTotalMinor: recommendedOffers.reduce((sum, offer) => sum + offer.priceMinor, 0),
    ownedProductIds,
    missingProductIds,
    cheapestOffers,
    recommendedOffers,
  };
  if (timestamps.length > 0) {
    value.newestPriceAt = new Date(Math.max(...timestamps)).toISOString();
    value.oldestPriceAt = new Date(Math.min(...timestamps)).toISOString();
  }

  return result(value, missingData, issues);
}
