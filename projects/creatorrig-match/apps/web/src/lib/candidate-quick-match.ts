export interface CandidateProduct {
  readonly id: string;
  readonly brand: string;
  readonly canonicalName: string;
  readonly model?: string;
  readonly aliases?: readonly string[];
  readonly category: string;
  readonly subcategory: string;
}

export interface CandidateEvidence {
  readonly id: string;
  readonly title: string;
  readonly sourceType: string;
  readonly url: string;
  readonly scope?: readonly string[];
  readonly proofScope?: readonly string[];
}

interface CanonicalDimension {
  readonly dimension: string;
  readonly status: string;
  readonly evidenceIds?: readonly string[];
}

export interface CandidateEdge {
  readonly id: string;
  readonly sourceProductId: string;
  readonly targetProductId: string;
  readonly relationType: string;
  readonly verificationStatus: string;
  readonly publicationStatus?: string;
  readonly dimensions?: Readonly<Record<string, string>>;
  readonly compatibilityDimensions?: readonly CanonicalDimension[];
  readonly requiredProductIds?: readonly string[];
  readonly requiredAdapterIds?: readonly string[];
  readonly limitations?: readonly string[];
  readonly evidenceIds?: readonly string[];
}

export interface CandidateQuickMatchCatalog {
  readonly products: readonly CandidateProduct[];
  readonly evidence: readonly CandidateEvidence[];
  readonly compatibilityEdges: readonly CandidateEdge[];
}

export interface CandidateDimensionView {
  readonly dimension: string;
  readonly status: string;
  readonly evidenceIds: readonly string[];
}

export type CandidateMatchResult =
  { readonly status: 'candidate'; readonly edge: CandidateEdge } | { readonly status: 'unknown' };

export function findCandidateMatch(
  catalog: CandidateQuickMatchCatalog,
  sourceProductId: string,
  targetProductId: string,
): CandidateMatchResult {
  const edge = catalog.compatibilityEdges.find(
    (item) =>
      item.sourceProductId === sourceProductId &&
      item.targetProductId === targetProductId &&
      item.relationType === 'candidate' &&
      item.verificationStatus === 'candidate' &&
      item.publicationStatus !== 'public',
  );
  return edge ? { status: 'candidate', edge } : { status: 'unknown' };
}

export function candidateDimensions(edge: CandidateEdge): readonly CandidateDimensionView[] {
  if (edge.compatibilityDimensions?.length) {
    return edge.compatibilityDimensions.map((item) => ({
      dimension: item.dimension,
      status: item.status,
      evidenceIds: item.evidenceIds ?? [],
    }));
  }
  return Object.entries(edge.dimensions ?? {}).map(([dimension, status]) => ({
    dimension,
    status,
    evidenceIds: edge.evidenceIds ?? [],
  }));
}

export function candidateRequiredProductIds(edge: CandidateEdge): readonly string[] {
  return [...new Set([...(edge.requiredProductIds ?? []), ...(edge.requiredAdapterIds ?? [])])];
}

export function candidateEvidence(
  catalog: CandidateQuickMatchCatalog,
  edge: CandidateEdge,
): readonly CandidateEvidence[] {
  const byId = new Map(catalog.evidence.map((item) => [item.id, item]));
  return (edge.evidenceIds ?? []).flatMap((id) => {
    const evidence = byId.get(id);
    return evidence && evidence.url.startsWith('https://') ? [evidence] : [];
  });
}

export function searchCandidateProducts(
  products: readonly CandidateProduct[],
  query: string,
): readonly CandidateProduct[] {
  const normalized = query.trim().toLocaleLowerCase('pl-PL');
  if (!normalized) return products;
  return products.filter((product) =>
    [product.brand, product.canonicalName, product.model ?? '', ...(product.aliases ?? [])]
      .join(' ')
      .toLocaleLowerCase('pl-PL')
      .includes(normalized),
  );
}
