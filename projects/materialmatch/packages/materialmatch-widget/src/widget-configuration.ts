import type { WidgetConfiguration } from './types';

export const MAX_WIDGET_CONFIGURATION_JSON_LENGTH = 1_000_000;

export interface WidgetConfigurationValidation {
  readonly success: boolean;
  readonly issues: readonly string[];
  readonly configuration?: WidgetConfiguration;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function stringRecordIsValid(value: unknown): boolean {
  return (
    value === undefined ||
    (isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string'))
  );
}

export function validateWidgetConfiguration(input: unknown): WidgetConfigurationValidation {
  if (!isRecord(input)) return { success: false, issues: ['configuration must be an object'] };
  const issues: string[] = [];
  if (typeof input.schemaVersion !== 'string' || input.schemaVersion.length === 0)
    issues.push('schemaVersion must be a non-empty string');
  if (typeof input.configurationVersion !== 'string' || input.configurationVersion.length === 0)
    issues.push('configurationVersion must be a non-empty string');

  const numericFields = [
    'defaultWasteBasisPoints',
    'minimumWasteBasisPoints',
    'maximumWasteBasisPoints',
  ] as const;
  for (const field of numericFields) {
    if (!isFiniteInteger(input[field]) || input[field] < 0 || input[field] > 10_000)
      issues.push(`${field} must be an integer between 0 and 10000`);
  }
  if (
    isFiniteInteger(input.minimumWasteBasisPoints) &&
    isFiniteInteger(input.defaultWasteBasisPoints) &&
    isFiniteInteger(input.maximumWasteBasisPoints) &&
    !(
      input.minimumWasteBasisPoints <= input.defaultWasteBasisPoints &&
      input.defaultWasteBasisPoints <= input.maximumWasteBasisPoints
    )
  ) {
    issues.push('waste limits must contain the default value');
  }
  if (!isRecord(input.calculation)) issues.push('calculation must be an object');
  if (input.allowPartialCart !== undefined && typeof input.allowPartialCart !== 'boolean')
    issues.push('allowPartialCart must be a boolean');
  if (!stringRecordIsValid(input.productNames)) issues.push('productNames must contain strings');
  if (!stringRecordIsValid(input.translations)) issues.push('translations must contain strings');
  if (input.brand !== undefined) {
    if (!isRecord(input.brand)) issues.push('brand must be an object');
    else if (
      (input.brand.name !== undefined && typeof input.brand.name !== 'string') ||
      (input.brand.logoUrl !== undefined && typeof input.brand.logoUrl !== 'string')
    )
      issues.push('brand values must be strings');
  }
  return issues.length
    ? { success: false, issues }
    : { success: true, issues, configuration: input as unknown as WidgetConfiguration };
}

export function parseWidgetConfigurationJson(serialized: string): WidgetConfigurationValidation {
  if (serialized.length > MAX_WIDGET_CONFIGURATION_JSON_LENGTH)
    return { success: false, issues: ['configuration JSON exceeds the size limit'] };
  try {
    return validateWidgetConfiguration(JSON.parse(serialized));
  } catch {
    return { success: false, issues: ['configuration JSON is invalid'] };
  }
}

/** Allows only embedded raster images and resources served by the customer's own origin. */
export function safeBrandAssetUrl(rawValue: string | undefined, baseUrl: string): string | null {
  if (!rawValue) return null;
  if (/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(rawValue)) return rawValue;
  try {
    const base = new URL(baseUrl);
    const resolved = new URL(rawValue, base);
    return resolved.origin === base.origin && ['http:', 'https:'].includes(resolved.protocol)
      ? resolved.href
      : null;
  } catch {
    return null;
  }
}
