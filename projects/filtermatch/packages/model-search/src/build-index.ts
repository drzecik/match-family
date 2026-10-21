import {
  appendRegionalVariant,
  baseModel,
  normalizeModelKey,
  normalizeModelText,
  numericSignature,
} from "./normalize.js";
import {
  NORMALIZER_VERSION,
  SEARCH_INDEX_VERSION,
  type BuildSearchIndexOptions,
  type DeviceSearchInput,
  type IndexedSearchKey,
  type SearchAliasInput,
  type SearchIndexEntry,
  type SearchKeyKind,
  type StaticModelSearchIndex,
} from "./types.js";

function addToLookup(lookup: Map<string, Set<string>>, key: string, deviceId: string): void {
  if (key.length === 0) return;
  const ids = lookup.get(key) ?? new Set<string>();
  ids.add(deviceId);
  lookup.set(key, ids);
}

function lookupToRecord(lookup: Map<string, Set<string>>): Record<string, readonly string[]> {
  return Object.fromEntries(
    [...lookup.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, ids]) => [key, [...ids].sort()]),
  );
}

function addKey(
  keys: IndexedSearchKey[],
  seen: Set<string>,
  value: string,
  kind: SearchKeyKind,
): void {
  const normalized = normalizeModelKey(value);
  const signature = `${normalized}\u0000${kind}`;
  if (normalized.length === 0 || seen.has(signature)) return;
  seen.add(signature);
  keys.push({ value: normalizeModelText(value), normalized, kind });
}

function identifierValues(
  identifiers: DeviceSearchInput["identifiers"],
): readonly string[] {
  if (identifiers == null) return [];
  return Object.values(identifiers).flatMap((value) => {
    if (value == null) return [];
    return typeof value === "string" ? [value] : value;
  });
}

function displayText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[‐‑‒–—―]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim();
}

export function buildModelSearchIndex(
  devices: readonly DeviceSearchInput[],
  aliases: readonly SearchAliasInput[] = [],
  options: BuildSearchIndexOptions = {},
): StaticModelSearchIndex {
  const deviceIds = new Set<string>();
  const approvedAliasesByDevice = new Map<string, SearchAliasInput[]>();

  for (const alias of aliases) {
    if (!alias.approved || alias.entityType !== "device") continue;
    const deviceAliases = approvedAliasesByDevice.get(alias.entityId) ?? [];
    deviceAliases.push(alias);
    approvedAliasesByDevice.set(alias.entityId, deviceAliases);
  }

  const entries: Record<string, SearchIndexEntry> = {};
  const exactLookup = new Map<string, Set<string>>();
  const baseLookup = new Map<string, Set<string>>();

  for (const device of [...devices].sort((left, right) => left.id.localeCompare(right.id))) {
    if (deviceIds.has(device.id)) throw new Error(`Duplicate device id: ${device.id}`);
    deviceIds.add(device.id);
    if (device.id.trim().length === 0) throw new Error("Device id must not be empty");
    if (normalizeModelKey(device.canonicalModel).length === 0) {
      throw new Error(`Device ${device.id} has an empty canonical model`);
    }

    const brand = displayText(device.brand);
    const canonicalModel = normalizeModelText(device.canonicalModel);
    const fullModel = appendRegionalVariant(canonicalModel, device.regionalVariant);
    const unsuffixedModel = baseModel(canonicalModel, device.regionalVariant);
    const keys: IndexedSearchKey[] = [];
    const seenKeys = new Set<string>();

    // A base canonical model is intentionally not added to `exact` for a
    // regional variant. This prevents a bare model from silently choosing one.
    if (device.regionalVariant == null || device.regionalVariant.trim().length === 0) {
      addKey(keys, seenKeys, canonicalModel, "canonical_model");
      addKey(keys, seenKeys, `${brand} ${canonicalModel}`, "brand_model");
    } else {
      addKey(keys, seenKeys, fullModel, "full_model");
      addKey(keys, seenKeys, `${brand} ${fullModel}`, "brand_model");
      addToLookup(baseLookup, normalizeModelKey(unsuffixedModel), device.id);
      addToLookup(baseLookup, normalizeModelKey(`${brand} ${unsuffixedModel}`), device.id);
    }

    if (device.series != null && device.series.trim().length > 0) {
      addKey(keys, seenKeys, `${device.series} ${fullModel}`, "series_model");
      addKey(keys, seenKeys, `${brand} ${device.series} ${fullModel}`, "series_model");
    }
    for (const identifier of identifierValues(device.identifiers)) {
      addKey(keys, seenKeys, identifier, "identifier");
    }
    for (const alias of approvedAliasesByDevice.get(device.id) ?? []) {
      addKey(keys, seenKeys, alias.rawAlias, "approved_alias");
    }

    for (const key of keys) addToLookup(exactLookup, key.normalized, device.id);
    const fuzzyKeys = [...new Set([
      normalizeModelKey(fullModel),
      normalizeModelKey(`${brand} ${fullModel}`),
    ])];

    entries[device.id] = {
      deviceId: device.id,
      brand,
      canonicalModel,
      fullModel,
      ...(device.regionalVariant != null && device.regionalVariant.trim().length > 0
        ? { regionalVariant: normalizeModelText(device.regionalVariant) }
        : {}),
      ...(device.series != null && device.series.trim().length > 0
        ? { series: displayText(device.series) }
        : {}),
      keys,
      fuzzyKeys,
      numericSignature: numericSignature(fullModel),
    };
  }

  for (const entityId of approvedAliasesByDevice.keys()) {
    if (!deviceIds.has(entityId)) {
      throw new Error(`Approved alias references unknown device: ${entityId}`);
    }
  }

  const generatedAt = options.generatedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(generatedAt))) {
    throw new Error(`Invalid generatedAt date: ${generatedAt}`);
  }

  return {
    version: SEARCH_INDEX_VERSION,
    normalizerVersion: NORMALIZER_VERSION,
    generatedAt,
    entries,
    exact: lookupToRecord(exactLookup),
    baseModels: lookupToRecord(baseLookup),
  };
}
