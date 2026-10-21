export interface AffiliateOffer {
  readonly id: string;
  readonly productId: string;
  readonly merchant: string;
  readonly priceMinor?: number | undefined;
  readonly currency: string;
  readonly affiliateUrl: string;
  readonly availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'unknown';
  readonly updatedAt: string;
  readonly sponsored: boolean;
}

export interface OfferAssessment {
  readonly publishable: boolean;
  readonly fresh: boolean;
  readonly warnings: readonly string[];
  readonly safeUrl?: string;
}

export interface MerchantUrlPolicy {
  readonly merchant: string;
  readonly host: string;
  readonly allowedPathPrefixes: readonly string[];
}

export interface CompatibilityOfferCandidate {
  readonly productId: string;
  /** Lower values are better; derived only from compatibility and user requirements. */
  readonly compatibilityRank: number;
  readonly offer?: AffiliateOffer;
}

export function assessOffer(
  offer: AffiliateOffer,
  options: {
    readonly now: string;
    readonly staleAfterDays: number;
    readonly allowedMerchantHosts: readonly string[];
  },
): OfferAssessment {
  const warnings: string[] = [];
  const safeUrl = safeAffiliateUrl(offer.affiliateUrl, options.allowedMerchantHosts);
  if (!safeUrl) warnings.push('unsafe_or_unapproved_affiliate_url');
  if (offer.priceMinor === undefined) warnings.push('price_unavailable');
  else if (!Number.isInteger(offer.priceMinor) || offer.priceMinor < 0)
    warnings.push('invalid_price');
  if (!/^[A-Z]{3}$/.test(offer.currency)) warnings.push('invalid_currency');
  if (!offer.id.trim() || !offer.productId.trim() || !offer.merchant.trim())
    warnings.push('missing_identity');

  const updated = Date.parse(offer.updatedAt);
  const now = Date.parse(options.now);
  const freshnessWindowMs = options.staleAfterDays * 86_400_000;
  const fresh =
    Number.isFinite(updated) &&
    Number.isFinite(now) &&
    options.staleAfterDays >= 0 &&
    updated <= now &&
    now - updated <= freshnessWindowMs;
  if (!fresh) warnings.push('stale_or_invalid_price_date');

  return {
    publishable: warnings.every((warning) =>
      ['stale_or_invalid_price_date', 'price_unavailable'].includes(warning),
    ),
    fresh,
    warnings,
    ...(safeUrl ? { safeUrl } : {}),
  };
}

/**
 * Applies both an exact merchant/host mapping and a path/query allowlist.
 * This rejects allowlisted hosts used as generic redirectors.
 */
export function safeMerchantAffiliateUrl(
  candidate: string,
  merchant: string,
  policies: readonly MerchantUrlPolicy[],
): string | undefined {
  const policy = policies.find((item) => item.merchant === merchant);
  if (policy === undefined) return undefined;
  const safeUrl = safeAffiliateUrl(candidate, [policy.host]);
  if (safeUrl === undefined) return undefined;
  const url = new URL(safeUrl);
  if (
    !policy.allowedPathPrefixes.some(
      (prefix) => prefix.startsWith('/') && url.pathname.startsWith(prefix),
    )
  )
    return undefined;
  if (url.hash) return undefined;
  const blockedPathSegments = new Set(['away', 'go', 'out', 'redirect']);
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    return undefined;
  }
  if (
    decodedPath
      .split('/')
      .filter(Boolean)
      .some((segment) => blockedPathSegments.has(segment.toLowerCase()))
  ) {
    return undefined;
  }
  const redirectParameters = new Set([
    'continue',
    'destination',
    'next',
    'redirect',
    'redirect_url',
    'return',
    'return_url',
    'target',
    'url',
  ]);
  if ([...url.searchParams.keys()].some((key) => redirectParameters.has(key.toLowerCase()))) {
    return undefined;
  }
  return safeUrl;
}

export function safeAffiliateUrl(
  candidate: string,
  allowedMerchantHosts: readonly string[],
): string | undefined {
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:') return undefined;
    if (url.username || url.password || url.port) return undefined;
    const host = url.hostname.toLowerCase();
    const approved = allowedMerchantHosts.some((allowed) => host === allowed.toLowerCase());
    if (!approved) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Sponsorship is intentionally absent from every comparison. */
export function rankOffers(offers: readonly AffiliateOffer[]): readonly AffiliateOffer[] {
  const availabilityRank: Record<AffiliateOffer['availability'], number> = {
    in_stock: 0,
    preorder: 1,
    unknown: 2,
    out_of_stock: 3,
  };
  return [...offers].sort(
    (left, right) =>
      availabilityRank[left.availability] - availabilityRank[right.availability] ||
      compareOptionalPrice(left.priceMinor, right.priceMinor) ||
      left.merchant.localeCompare(right.merchant) ||
      left.id.localeCompare(right.id),
  );
}

/** Compatibility rank is always the primary key; sponsorship is never read. */
export function rankCompatibilityOfferCandidates(
  candidates: readonly CompatibilityOfferCandidate[],
): readonly CompatibilityOfferCandidate[] {
  const rankedOffers = new Map(
    rankOffers(candidates.flatMap(({ offer }) => (offer === undefined ? [] : [offer]))).map(
      (offer, index) => [offer.id, index],
    ),
  );
  return [...candidates].sort(
    (left, right) =>
      left.compatibilityRank - right.compatibilityRank ||
      (left.offer === undefined
        ? Number.MAX_SAFE_INTEGER
        : (rankedOffers.get(left.offer.id) ?? 0)) -
        (right.offer === undefined
          ? Number.MAX_SAFE_INTEGER
          : (rankedOffers.get(right.offer.id) ?? 0)) ||
      left.productId.localeCompare(right.productId),
  );
}

export function sponsorshipDisclosure(offer: AffiliateOffer): string | undefined {
  return offer.sponsored ? 'Pozycja sponsorowana' : undefined;
}

function compareOptionalPrice(left: number | undefined, right: number | undefined): number {
  if (left === undefined) return right === undefined ? 0 : 1;
  if (right === undefined) return -1;
  return left - right;
}
