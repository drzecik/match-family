export { buildModelSearchIndex } from "./build-index.js";
export { searchModelIndex } from "./search.js";
export {
  appendRegionalVariant,
  baseModel,
  NORMALIZER_VERSION,
  normalizeModelKey,
  normalizeModelText,
  numericSignature,
} from "./normalize.js";
export type {
  AmbiguousModelSearchResult,
  BuildSearchIndexOptions,
  CandidateModelSearchResult,
  DeviceSearchInput,
  IndexedSearchKey,
  ModelSearchResult,
  NoModelSearchResult,
  ResolvedModelSearchResult,
  SearchAliasInput,
  SearchCandidate,
  SearchIndexEntry,
  SearchKeyKind,
  SearchOptions,
  StaticModelSearchIndex,
} from "./types.js";
