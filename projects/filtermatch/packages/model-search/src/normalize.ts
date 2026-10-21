import { NORMALIZER_VERSION } from "./types.js";

export { NORMALIZER_VERSION };

const CONTROLLED_SEPARATORS = /[\s\-‐‑‒–—―_./\\]+/gu;

/**
 * Human-readable normalization. It is intentionally not a lookup key: model
 * suffixes remain visible and can be inspected by callers and in reports.
 */
export function normalizeModelText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleUpperCase("en-US")
    .replace(/[‐‑‒–—―]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Conservative separator-insensitive key. Only common model separators are
 * discarded. Regional suffix characters are retained, e.g. AC2889/10 becomes
 * AC288910 and can never equal the base AC2889.
 */
export function normalizeModelKey(value: string): string {
  return normalizeModelText(value).replace(CONTROLLED_SEPARATORS, "");
}

export function numericSignature(value: string): readonly string[] {
  return normalizeModelKey(value).match(/\p{N}+/gu) ?? [];
}

export function appendRegionalVariant(
  canonicalModel: string,
  regionalVariant?: string | null,
): string {
  const canonical = normalizeModelText(canonicalModel);
  const variant = regionalVariant == null ? "" : normalizeModelText(regionalVariant);

  if (variant.length === 0) return canonical;

  const variantWithoutLeadingSeparator = variant.replace(/^[\s\-_/\\.]+/u, "");
  if (variantWithoutLeadingSeparator.length === 0) return canonical;

  // Some data sources repeat a suffix already present in canonicalModel.
  if (normalizeModelKey(canonical).endsWith(normalizeModelKey(variantWithoutLeadingSeparator))) {
    return canonical;
  }

  return `${canonical}/${variantWithoutLeadingSeparator}`;
}

/** Returns the unsuffixed model when regionalVariant is explicitly known. */
export function baseModel(
  canonicalModel: string,
  regionalVariant?: string | null,
): string {
  const canonical = normalizeModelText(canonicalModel);
  const variant = regionalVariant == null
    ? ""
    : normalizeModelText(regionalVariant).replace(/^[\s\-_/\\.]+/u, "");
  if (variant.length === 0) return canonical;

  const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const suffix = new RegExp(`[\\s\\-_/\\\\.]+${escapedVariant}$`, "u");
  const withoutSuffix = canonical.replace(suffix, "").trim();
  return withoutSuffix.length > 0 ? withoutSuffix : canonical;
}
