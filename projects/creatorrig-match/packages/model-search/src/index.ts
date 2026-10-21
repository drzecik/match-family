export interface SearchableProduct {
  readonly id: string;
  readonly brand: string;
  readonly canonicalName: string;
  readonly model: string;
  readonly variant?: string;
  readonly region?: readonly string[];
  readonly aliases: readonly string[];
}

export interface ProductSearchHit<T extends SearchableProduct = SearchableProduct> {
  readonly product: T;
  readonly score: number;
  readonly matchedBy: "canonical_name" | "model" | "alias" | "brand" | "variant" | "fuzzy";
}

const normalize = (value: string): string =>
  value
    .normalize("NFKD")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokens = (value: string): readonly string[] => normalize(value).split(" ").filter(Boolean);

function fieldScore(query: string, field: string, exact: number, prefix: number, contains: number): number {
  const normalized = normalize(field);
  if (normalized === query) return exact;
  if (normalized.startsWith(query)) return prefix;
  if (normalized.includes(query)) return contains;
  const queryTokens = tokens(query);
  const fieldTokens = new Set(tokens(normalized));
  return queryTokens.length > 0 && queryTokens.every((token) => fieldTokens.has(token)) ? contains - 5 : 0;
}

export function searchProducts<T extends SearchableProduct>(
  products: readonly T[],
  rawQuery: string,
  limit = 8,
): readonly ProductSearchHit<T>[] {
  const query = normalize(rawQuery);
  if (!query) return [];

  const hits = products.flatMap((product): ProductSearchHit<T>[] => {
    const candidates: Array<{ score: number; matchedBy: ProductSearchHit["matchedBy"] }> = [
      { score: fieldScore(query, product.canonicalName, 100, 92, 82), matchedBy: "canonical_name" },
      { score: fieldScore(query, product.model, 98, 90, 80), matchedBy: "model" },
      { score: fieldScore(query, product.brand, 70, 60, 50), matchedBy: "brand" },
      ...(product.variant ? [{ score: fieldScore(query, product.variant, 88, 78, 68), matchedBy: "variant" as const }] : []),
      ...product.aliases.map((alias) => ({ score: fieldScore(query, alias, 96, 88, 78), matchedBy: "alias" as const })),
    ];
    const best = candidates.sort((left, right) => right.score - left.score)[0];
    if (!best || best.score <= 0) return [];
    return [{ product, ...best }];
  });

  return hits
    .sort((left, right) => right.score - left.score || left.product.canonicalName.localeCompare(right.product.canonicalName))
    .slice(0, Math.max(0, limit));
}

export function isAmbiguousSearchResult(hits: readonly ProductSearchHit[]): boolean {
  return hits.length > 1 && (hits[0]?.score ?? 0) - (hits[1]?.score ?? 0) < 8;
}
