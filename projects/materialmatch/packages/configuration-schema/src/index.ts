import { z } from 'zod';
import type {
  CalculationConfiguration,
  CalculationInput,
  VerticalPack,
} from '@materialmatch/domain';

export const CURRENT_CONFIGURATION_SCHEMA_VERSION = 1;
const MAX_DIMENSION_MM = 1_000_000;
const MAX_AREA_MM2 = 1_000_000_000_000;
const MAX_PRICE_MINOR_UNITS = 1_000_000_000_000;
const idSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
const translationKeySchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
const tagSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
const nonNegativeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const positiveInteger = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export const moneySchema = z
  .object({
    minorUnits: nonNegativeInteger.max(MAX_PRICE_MINOR_UNITS),
    currency: z
      .string()
      .length(3)
      .regex(/^[A-Z]{3}$/),
  })
  .strict();

export const packageSpecificationSchema = z
  .object({
    saleUnit: z.enum(['package', 'piece', 'roll']),
    coverageAreaSquareMillimeters: positiveInteger.max(MAX_AREA_MM2).optional(),
    itemAreaSquareMillimeters: positiveInteger.max(MAX_AREA_MM2).optional(),
    itemLengthMillimeters: positiveInteger.max(MAX_DIMENSION_MM).optional(),
    piecesPerPackage: positiveInteger.max(100_000),
    minimumPackages: nonNegativeInteger.max(1_000_000),
    orderMultiple: positiveInteger.max(1_000_000),
    openedPackagesSold: z.boolean(),
  })
  .strict();

const compatibilityAttributesShape = {
  materialType: tagSchema,
  productFamily: tagSchema.optional(),
  thicknessMillimeters: positiveInteger.max(MAX_DIMENSION_MM).optional(),
  grade: tagSchema.optional(),
  installationMethod: tagSchema.optional(),
  compatibilityTags: z.array(tagSchema).max(100),
  exclusionTags: z.array(tagSchema).max(100),
};

export const productVariantSchema = z
  .object({
    id: idSchema,
    sku: z.string().min(1).max(128),
    nameKey: translationKeySchema,
    package: packageSpecificationSchema,
    price: moneySchema.optional(),
    available: z.boolean(),
    ...compatibilityAttributesShape,
  })
  .strict();

export const materialProductSchema = z
  .object({
    id: idSchema,
    nameKey: translationKeySchema,
    attributes: z.object(compatibilityAttributesShape).strict(),
    variants: z.array(productVariantSchema).min(1).max(10_000),
  })
  .strict();

export const accessoryProductSchema = z
  .object({
    id: idSchema,
    nameKey: translationKeySchema,
    variant: productVariantSchema,
  })
  .strict();

export const wasteRuleSchema = z
  .object({
    defaultBasisPoints: nonNegativeInteger.max(10_000),
    minimumBasisPoints: nonNegativeInteger.max(10_000),
    maximumBasisPoints: nonNegativeInteger.max(10_000),
    patternOverrides: z
      .record(z.string().min(1).max(80), nonNegativeInteger.max(10_000))
      .optional(),
  })
  .strict()
  .superRefine((rule, context) => {
    if (
      rule.minimumBasisPoints > rule.defaultBasisPoints ||
      rule.defaultBasisPoints > rule.maximumBasisPoints
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Waste limits must contain the default value',
      });
    }
    for (const [pattern, value] of Object.entries(rule.patternOverrides ?? {})) {
      if (value < rule.minimumBasisPoints || value > rule.maximumBasisPoints) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['patternOverrides', pattern],
          message: 'Pattern waste is outside configured limits',
        });
      }
    }
  });

const accessoryCalculationSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('byArea'),
      coverageAreaSquareMillimeters: positiveInteger.max(MAX_AREA_MM2),
    })
    .strict(),
  z
    .object({
      kind: z.literal('byPerimeter'),
      itemLengthMillimeters: positiveInteger.max(MAX_DIMENSION_MM),
      subtractDoorWidths: z.boolean(),
    })
    .strict(),
  z.object({ kind: z.literal('byRoomCount'), unitsPerRoom: positiveInteger.max(100_000) }).strict(),
  z.object({ kind: z.literal('byDoorCount'), unitsPerDoor: positiveInteger.max(100_000) }).strict(),
  z
    .object({
      kind: z.literal('byCornerCount'),
      cornerType: z.enum(['internal', 'external']),
      unitsPerCorner: positiveInteger.max(100_000),
    })
    .strict(),
  z
    .object({
      kind: z.literal('byMainPackages'),
      mainPackagesPerUnit: positiveInteger.max(100_000),
    })
    .strict(),
  z.object({ kind: z.literal('fixed'), quantity: nonNegativeInteger.max(1_000_000) }).strict(),
  z
    .object({ kind: z.literal('optional'), defaultQuantity: nonNegativeInteger.max(1_000_000) })
    .strict(),
]);

const relationStatusSchema = z.enum([
  'required',
  'recommended',
  'optional',
  'alternative',
  'incompatible',
]);

export const accessoryRuleSchema = z
  .object({
    id: idSchema,
    accessoryProductId: idSchema,
    status: relationStatusSchema,
    calculation: accessoryCalculationSchema,
    alternativeGroup: idSchema.optional(),
  })
  .strict();

export const compatibilityRuleSchema = z
  .object({
    id: idSchema,
    sourceProductId: idSchema,
    targetProductId: idSchema.optional(),
    status: relationStatusSchema,
    requiredTags: z.array(tagSchema).max(100).optional(),
    excludedTags: z.array(tagSchema).max(100).optional(),
  })
  .strict();

export const configurationVersionSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_CONFIGURATION_SCHEMA_VERSION),
    revision: nonNegativeInteger.max(1_000_000_000),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

const roomGeometrySchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('rectangle'),
      widthMillimeters: positiveInteger.max(MAX_DIMENSION_MM),
      lengthMillimeters: positiveInteger.max(MAX_DIMENSION_MM),
    })
    .strict(),
  z
    .object({
      kind: z.literal('manualArea'),
      areaSquareMillimeters: positiveInteger.max(MAX_AREA_MM2),
      perimeterMillimeters: nonNegativeInteger.max(MAX_DIMENSION_MM * 4).optional(),
    })
    .strict(),
]);

export const roomMeasurementSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(200).optional(),
    geometry: roomGeometrySchema,
    excludedAreas: z
      .array(
        z
          .object({ id: idSchema, areaSquareMillimeters: positiveInteger.max(MAX_AREA_MM2) })
          .strict(),
      )
      .max(1_000),
    doors: z
      .array(
        z
          .object({ id: idSchema, widthMillimeters: positiveInteger.max(MAX_DIMENSION_MM) })
          .strict(),
      )
      .max(1_000),
    corners: z
      .object({
        internal: nonNegativeInteger.max(100_000),
        external: nonNegativeInteger.max(100_000),
      })
      .strict()
      .optional(),
  })
  .strict();

export const measurementProjectSchema = z
  .object({
    id: idSchema,
    rooms: z.array(roomMeasurementSchema).min(1).max(1_000),
    wasteBasisPoints: nonNegativeInteger.max(10_000).optional(),
    installationPattern: tagSchema.optional(),
  })
  .strict();

export const calculationInputSchema = z
  .object({
    project: measurementProjectSchema,
    variantId: idSchema.optional(),
    selectedOptionalAccessoryIds: z.array(idSchema).max(10_000).optional(),
  })
  .strict();

export const calculationConfigurationSchema = z
  .object({
    id: idSchema,
    version: configurationVersionSchema,
    locale: z.string().min(2).max(35),
    currency: z
      .string()
      .length(3)
      .regex(/^[A-Z]{3}$/),
    mainProduct: materialProductSchema,
    defaultVariantId: idSchema,
    wasteRule: wasteRuleSchema,
    accessories: z.array(accessoryProductSchema).max(10_000),
    accessoryRules: z.array(accessoryRuleSchema).max(10_000),
    compatibilityRules: z.array(compatibilityRuleSchema).max(10_000),
  })
  .strict()
  .superRefine((configuration, context) => {
    const variantIds = configuration.mainProduct.variants.map((variant) => variant.id);
    if (!variantIds.includes(configuration.defaultVariantId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['defaultVariantId'],
        message: 'Default variant does not exist',
      });
    }
    const accessoryIds = configuration.accessories.map((accessory) => accessory.id);
    const duplicate = (values: readonly string[]): string | undefined =>
      values.find((value, index) => values.indexOf(value) !== index);
    const duplicateVariant = duplicate(variantIds);
    if (duplicateVariant) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mainProduct', 'variants'],
        message: `Duplicate variant id: ${duplicateVariant}`,
      });
    }
    const duplicateAccessory = duplicate(accessoryIds);
    if (duplicateAccessory) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accessories'],
        message: `Duplicate accessory id: ${duplicateAccessory}`,
      });
    }
    const duplicateProductVariantId = duplicate([
      ...variantIds,
      ...configuration.accessories.map((accessory) => accessory.variant.id),
    ]);
    if (duplicateProductVariantId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate product variant id: ${duplicateProductVariantId}`,
      });
    }
    const duplicateSku = duplicate([
      ...configuration.mainProduct.variants.map((variant) => variant.sku),
      ...configuration.accessories.map((accessory) => accessory.variant.sku),
    ]);
    if (duplicateSku) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate SKU: ${duplicateSku}` });
    }
    const pricedVariants = [
      ...configuration.mainProduct.variants,
      ...configuration.accessories.map((accessory) => accessory.variant),
    ];
    for (const variant of pricedVariants) {
      if (variant.price && variant.price.currency !== configuration.currency) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Price currency does not match configuration currency: ${variant.id}`,
        });
      }
    }
    for (const [index, rule] of configuration.accessoryRules.entries()) {
      if (!accessoryIds.includes(rule.accessoryProductId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['accessoryRules', index, 'accessoryProductId'],
          message: 'Accessory rule references an unknown product',
        });
      }
    }
    const knownProductIds = new Set([configuration.mainProduct.id, ...accessoryIds]);
    for (const [index, rule] of configuration.compatibilityRules.entries()) {
      if (
        !knownProductIds.has(rule.sourceProductId) ||
        (rule.targetProductId && !knownProductIds.has(rule.targetProductId))
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['compatibilityRules', index],
          message: 'Compatibility rule references an unknown product',
        });
      }
    }
  });

export const verticalPackSchema = z
  .object({
    id: idSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
    nameKey: translationKeySchema,
    supportedMaterialTypes: z.array(tagSchema).min(1).max(100),
    configuration: calculationConfigurationSchema,
  })
  .strict()
  .superRefine((pack, context) => {
    if (
      !pack.supportedMaterialTypes.includes(pack.configuration.mainProduct.attributes.materialType)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supportedMaterialTypes'],
        message: 'Pack must support its configured main material type',
      });
    }
  });

const legacyWasteRuleV0Schema = z
  .object({
    defaultPercent: nonNegativeInteger.max(100),
    minimumPercent: nonNegativeInteger.max(100),
    maximumPercent: nonNegativeInteger.max(100),
    patternOverridesPercent: z
      .record(z.string().min(1).max(80), nonNegativeInteger.max(100))
      .optional(),
  })
  .strict();

const legacyConfigurationV0Schema = z
  .object({
    id: idSchema,
    version: z
      .object({
        schemaVersion: z.literal(0),
        revision: nonNegativeInteger.max(1_000_000_000),
        createdAt: z.string().datetime({ offset: true }),
      })
      .strict(),
    locale: z.string().min(2).max(35),
    currency: z
      .string()
      .length(3)
      .regex(/^[A-Z]{3}$/),
    mainProduct: materialProductSchema,
    defaultVariantId: idSchema,
    wasteRule: legacyWasteRuleV0Schema,
    accessories: z.array(accessoryProductSchema).max(10_000),
    accessoryRules: z.array(accessoryRuleSchema).max(10_000),
    compatibilityRules: z.array(compatibilityRuleSchema).max(10_000),
  })
  .strict();

/** Migrates serialized configuration without mutating it. Schema v0 stored whole percentages; v1 stores basis points. */
export function migrateCalculationConfiguration(input: unknown): CalculationConfiguration {
  const current = calculationConfigurationSchema.safeParse(input);
  if (current.success) return current.data as CalculationConfiguration;
  const legacy = legacyConfigurationV0Schema.parse(input);
  const migrated = {
    ...legacy,
    version: { ...legacy.version, schemaVersion: 1, revision: legacy.version.revision + 1 },
    wasteRule: {
      defaultBasisPoints: legacy.wasteRule.defaultPercent * 100,
      minimumBasisPoints: legacy.wasteRule.minimumPercent * 100,
      maximumBasisPoints: legacy.wasteRule.maximumPercent * 100,
      ...(legacy.wasteRule.patternOverridesPercent
        ? {
            patternOverrides: Object.fromEntries(
              Object.entries(legacy.wasteRule.patternOverridesPercent).map(([key, value]) => [
                key,
                value * 100,
              ]),
            ),
          }
        : {}),
    },
  };
  return calculationConfigurationSchema.parse(migrated) as CalculationConfiguration;
}

export function parseCalculationConfiguration(input: unknown): CalculationConfiguration {
  return calculationConfigurationSchema.parse(input) as CalculationConfiguration;
}

export function safeParseCalculationConfiguration(input: unknown) {
  return calculationConfigurationSchema.safeParse(input);
}

export function parseMeasurementProject(input: unknown) {
  return measurementProjectSchema.parse(input);
}

export function parseCalculationInput(input: unknown): CalculationInput {
  return calculationInputSchema.parse(input) as CalculationInput;
}

export function safeParseMeasurementProject(input: unknown) {
  return measurementProjectSchema.safeParse(input);
}

export function parseVerticalPack(input: unknown): VerticalPack {
  return verticalPackSchema.parse(input) as VerticalPack;
}

export * from './import-validation.js';
