export const SEARCH_INDEX_VERSION = 1 as const;
export const NORMALIZER_VERSION = "model-v1" as const;

export interface DeviceSearchInput {
  readonly id: string;
  readonly brand: string;
  readonly canonicalModel: string;
  readonly regionalVariant?: string | null;
  readonly series?: string | null;
  readonly identifiers?: Readonly<Record<string, string | readonly string[] | null>>;
}

export interface SearchAliasInput {
  readonly id?: string;
  readonly entityType: "device" | string;
  readonly entityId: string;
  readonly rawAlias: string;
  readonly normalizedAlias?: string;
  readonly aliasType?: string;
  readonly approved: boolean;
  readonly source?: string;
}

export type SearchKeyKind =
  | "canonical_model"
  | "full_model"
  | "brand_model"
  | "series_model"
  | "identifier"
  | "approved_alias";

export interface IndexedSearchKey {
  readonly value: string;
  readonly normalized: string;
  readonly kind: SearchKeyKind;
}

export interface SearchIndexEntry {
  readonly deviceId: string;
  readonly brand: string;
  readonly canonicalModel: string;
  readonly fullModel: string;
  readonly regionalVariant?: string;
  readonly series?: string;
  readonly keys: readonly IndexedSearchKey[];
  readonly fuzzyKeys: readonly string[];
  readonly numericSignature: readonly string[];
}

export interface StaticModelSearchIndex {
  readonly version: typeof SEARCH_INDEX_VERSION;
  readonly normalizerVersion: typeof NORMALIZER_VERSION;
  readonly generatedAt: string;
  readonly entries: Readonly<Record<string, SearchIndexEntry>>;
  /** A normalized lookup key may deliberately point at several devices. */
  readonly exact: Readonly<Record<string, readonly string[]>>;
  /** Model without a regional suffix. Used only to surface ambiguity. */
  readonly baseModels: Readonly<Record<string, readonly string[]>>;
}

export interface BuildSearchIndexOptions {
  /** Required for deterministic builds; the CLI defaults to the current time. */
  readonly generatedAt?: string;
}

export interface SearchOptions {
  readonly maxCandidates?: number;
  /** Cannot be lowered below the conservative package default. */
  readonly fuzzyThreshold?: number;
}

export interface SearchCandidate {
  readonly deviceId: string;
  readonly label: string;
  readonly score: number;
  readonly reason: "similar_model";
  readonly numericMismatch: boolean;
}

export interface ResolvedModelSearchResult {
  readonly status: "resolved";
  readonly query: string;
  readonly normalizedQuery: string;
  readonly deviceId: string;
  readonly matchKind: "exact" | "approved_alias";
}

export interface AmbiguousModelSearchResult {
  readonly status: "ambiguous";
  readonly query: string;
  readonly normalizedQuery: string;
  readonly candidates: readonly SearchCandidate[];
  readonly reason: "key_collision" | "regional_variants";
}

export interface CandidateModelSearchResult {
  readonly status: "candidates";
  readonly query: string;
  readonly normalizedQuery: string;
  readonly candidates: readonly SearchCandidate[];
}

export interface NoModelSearchResult {
  readonly status: "not_found";
  readonly query: string;
  readonly normalizedQuery: string;
  readonly candidates: readonly [];
}

export type ModelSearchResult =
  | ResolvedModelSearchResult
  | AmbiguousModelSearchResult
  | CandidateModelSearchResult
  | NoModelSearchResult;
