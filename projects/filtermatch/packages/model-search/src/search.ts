import { similarity } from "./distance.js";
import { normalizeModelKey, numericSignature } from "./normalize.js";
import type {
  ModelSearchResult,
  SearchCandidate,
  SearchIndexEntry,
  SearchOptions,
  StaticModelSearchIndex,
} from "./types.js";

const DEFAULT_FUZZY_THRESHOLD = 0.85;
const MIN_FUZZY_QUERY_LENGTH = 5;

function label(entry: SearchIndexEntry): string {
  return `${entry.brand} ${entry.fullModel}`;
}

function exactCandidate(entry: SearchIndexEntry): SearchCandidate {
  return {
    deviceId: entry.deviceId,
    label: label(entry),
    score: 1,
    reason: "similar_model",
    numericMismatch: false,
  };
}

function matchKind(
  entry: SearchIndexEntry,
  normalizedQuery: string,
): "exact" | "approved_alias" {
  const matchingKinds = entry.keys
    .filter((key) => key.normalized === normalizedQuery)
    .map((key) => key.kind);
  return matchingKinds.some((kind) => kind !== "approved_alias")
    ? "exact"
    : "approved_alias";
}

function candidatesForIds(
  index: StaticModelSearchIndex,
  ids: readonly string[],
): readonly SearchCandidate[] {
  return ids.flatMap((deviceId) => {
    const entry = index.entries[deviceId];
    return entry == null ? [] : [exactCandidate(entry)];
  });
}

function fuzzyCandidates(
  index: StaticModelSearchIndex,
  normalizedQuery: string,
  options: SearchOptions,
): readonly SearchCandidate[] {
  if (normalizedQuery.length < MIN_FUZZY_QUERY_LENGTH) return [];
  const threshold = options.fuzzyThreshold ?? DEFAULT_FUZZY_THRESHOLD;
  if (threshold < DEFAULT_FUZZY_THRESHOLD || threshold > 1) {
    throw new Error(`fuzzyThreshold must be between ${DEFAULT_FUZZY_THRESHOLD} and 1`);
  }
  const maxCandidates = options.maxCandidates ?? 5;
  const queryNumbers = numericSignature(normalizedQuery);

  return Object.values(index.entries)
    .map((entry): SearchCandidate | null => {
      const score = Math.max(...entry.fuzzyKeys.map((key) => similarity(normalizedQuery, key)));
      if (score < threshold || score >= 1) return null;
      return {
        deviceId: entry.deviceId,
        label: label(entry),
        score: Number(score.toFixed(4)),
        reason: "similar_model",
        numericMismatch:
          queryNumbers.join("|") !== entry.numericSignature.join("|"),
      };
    })
    .filter((candidate): candidate is SearchCandidate => candidate != null)
    .sort((left, right) => right.score - left.score || left.deviceId.localeCompare(right.deviceId))
    .slice(0, Math.max(0, maxCandidates));
}

export function searchModelIndex(
  index: StaticModelSearchIndex,
  query: string,
  options: SearchOptions = {},
): ModelSearchResult {
  const normalizedQuery = normalizeModelKey(query);
  if (normalizedQuery.length === 0) {
    return { status: "not_found", query, normalizedQuery, candidates: [] };
  }

  const exactIds = index.exact[normalizedQuery] ?? [];
  if (exactIds.length > 1) {
    return {
      status: "ambiguous",
      query,
      normalizedQuery,
      candidates: candidatesForIds(index, exactIds),
      reason: "key_collision",
    };
  }
  const exactId = exactIds[0];
  if (exactId != null) {
    const entry = index.entries[exactId];
    if (entry == null) throw new Error(`Search index references missing device: ${exactId}`);
    return {
      status: "resolved",
      query,
      normalizedQuery,
      deviceId: exactId,
      matchKind: matchKind(entry, normalizedQuery),
    };
  }

  const variantIds = index.baseModels[normalizedQuery] ?? [];
  if (variantIds.length > 0) {
    return {
      status: "ambiguous",
      query,
      normalizedQuery,
      candidates: candidatesForIds(index, variantIds),
      reason: "regional_variants",
    };
  }

  const candidates = fuzzyCandidates(index, normalizedQuery, options);
  return candidates.length > 0
    ? { status: "candidates", query, normalizedQuery, candidates }
    : { status: "not_found", query, normalizedQuery, candidates: [] };
}
