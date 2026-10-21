import { describe, expect, it } from 'vitest';
import {
  migrateCalculationConfiguration,
  safeParseCalculationConfiguration,
} from '../src/index.js';

const minimalConfiguration = {
  id: 'test-config',
  version: { schemaVersion: 1, revision: 0, createdAt: '2026-07-17T00:00:00.000Z' },
  locale: 'pl-PL',
  currency: 'PLN',
  mainProduct: {
    id: 'main',
    nameKey: 'product.main',
    attributes: { materialType: 'flooring', compatibilityTags: [], exclusionTags: [] },
    variants: [
      {
        id: 'variant',
        sku: 'FICTIONAL-MAIN',
        nameKey: 'variant.main',
        materialType: 'flooring',
        compatibilityTags: [],
        exclusionTags: [],
        package: {
          saleUnit: 'package',
          coverageAreaSquareMillimeters: 2_200_000,
          piecesPerPackage: 8,
          minimumPackages: 1,
          orderMultiple: 1,
          openedPackagesSold: false,
        },
        price: { minorUnits: 9999, currency: 'PLN' },
        available: true,
      },
    ],
  },
  defaultVariantId: 'variant',
  wasteRule: { defaultBasisPoints: 800, minimumBasisPoints: 0, maximumBasisPoints: 2000 },
  accessories: [],
  accessoryRules: [],
  compatibilityRules: [],
};

describe('calculation configuration schema', () => {
  it('accepts a complete valid configuration', () => {
    expect(safeParseCalculationConfiguration(minimalConfiguration).success).toBe(true);
  });

  it.each([
    ['unknown executable field', { ...minimalConfiguration, executableFormula: 'process.exit()' }],
    ['unknown default variant', { ...minimalConfiguration, defaultVariantId: 'missing' }],
    [
      'non-integer package coverage',
      {
        ...minimalConfiguration,
        mainProduct: {
          ...minimalConfiguration.mainProduct,
          variants: [
            {
              ...minimalConfiguration.mainProduct.variants[0]!,
              package: {
                ...minimalConfiguration.mainProduct.variants[0]!.package,
                coverageAreaSquareMillimeters: 2_200_000.5,
              },
            },
          ],
        },
      },
    ],
    [
      'unsafe dimension',
      {
        ...minimalConfiguration,
        mainProduct: {
          ...minimalConfiguration.mainProduct,
          variants: [
            {
              ...minimalConfiguration.mainProduct.variants[0]!,
              package: {
                ...minimalConfiguration.mainProduct.variants[0]!.package,
                itemLengthMillimeters: Number.MAX_SAFE_INTEGER,
              },
            },
          ],
        },
      },
    ],
    ['malformed currency', { ...minimalConfiguration, currency: '<script>' }],
  ])('rejects %s', (_name, candidate) => {
    expect(safeParseCalculationConfiguration(candidate).success).toBe(false);
  });

  it('rejects a rule referencing an unknown accessory', () => {
    const candidate = {
      ...minimalConfiguration,
      accessoryRules: [
        {
          id: 'bad',
          accessoryProductId: 'missing',
          status: 'required',
          calculation: { kind: 'fixed', quantity: 1 },
        },
      ],
    };
    expect(safeParseCalculationConfiguration(candidate).success).toBe(false);
  });

  it('rejects prototype-like and HTML identifiers', () => {
    expect(
      safeParseCalculationConfiguration({ ...minimalConfiguration, id: '<img/onerror=alert(1)>' })
        .success,
    ).toBe(false);
  });

  it('migrates schema v0 whole percentages to v1 basis points compatibly and idempotently', () => {
    const legacy = {
      id: minimalConfiguration.id,
      locale: minimalConfiguration.locale,
      currency: minimalConfiguration.currency,
      mainProduct: minimalConfiguration.mainProduct,
      defaultVariantId: minimalConfiguration.defaultVariantId,
      accessories: minimalConfiguration.accessories,
      accessoryRules: minimalConfiguration.accessoryRules,
      compatibilityRules: minimalConfiguration.compatibilityRules,
      version: { schemaVersion: 0, revision: 4, createdAt: '2026-07-17T00:00:00.000Z' },
      wasteRule: {
        defaultPercent: 8,
        minimumPercent: 0,
        maximumPercent: 20,
        patternOverridesPercent: { diagonal: 15 },
      },
    };
    const migrated = migrateCalculationConfiguration(legacy);
    expect(migrated.version).toMatchObject({ schemaVersion: 1, revision: 5 });
    expect(migrated.wasteRule).toEqual({
      defaultBasisPoints: 800,
      minimumBasisPoints: 0,
      maximumBasisPoints: 2_000,
      patternOverrides: { diagonal: 1_500 },
    });
    expect(migrateCalculationConfiguration(migrated)).toEqual(migrated);
    expect(legacy.version.schemaVersion).toBe(0);
  });

  it('rejects unknown future schema versions instead of treating them as current', () => {
    expect(
      safeParseCalculationConfiguration({
        ...minimalConfiguration,
        version: { ...minimalConfiguration.version, schemaVersion: 2 },
      }).success,
    ).toBe(false);
  });
});
