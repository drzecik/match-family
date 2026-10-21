import type {
  AccessoryProduct,
  AccessoryRule,
  CalculatedProductLine,
  CalculationConfiguration,
  CalculationInput,
  CalculationResult,
  CalculationStep,
  CartLine,
  MeasurementSummary,
  Money,
  ProductVariant,
  ResultWarning,
  RoomMeasurement,
} from '@materialmatch/domain';
import {
  parseCalculationConfiguration,
  parseCalculationInput,
} from '@materialmatch/configuration-schema';
import { ZodError } from 'zod';
import { CalculationError } from './errors.js';
import {
  applyMinimumAndMultiple,
  ceilDiv,
  checkedMoneyTotal,
  toSafeInteger,
} from './integer-math.js';

interface RoomTotals {
  area: bigint;
  perimeter: bigint;
  doorWidth: bigint;
  doors: number;
  internalCorners: number;
  externalCorners: number;
}

function roomTotals(room: RoomMeasurement): RoomTotals {
  const grossArea =
    room.geometry.kind === 'rectangle'
      ? BigInt(room.geometry.widthMillimeters) * BigInt(room.geometry.lengthMillimeters)
      : BigInt(room.geometry.areaSquareMillimeters);
  const excludedArea = room.excludedAreas.reduce(
    (sum, exclusion) => sum + BigInt(exclusion.areaSquareMillimeters),
    0n,
  );
  if (excludedArea >= grossArea) {
    throw new CalculationError(
      'AREA_EXCLUSIONS_EXCEED_ROOM',
      `Excluded area must be smaller than room area: ${room.id}`,
      { roomId: room.id },
    );
  }
  const perimeter =
    room.geometry.kind === 'rectangle'
      ? 2n * (BigInt(room.geometry.widthMillimeters) + BigInt(room.geometry.lengthMillimeters))
      : BigInt(room.geometry.perimeterMillimeters ?? 0);
  return {
    area: grossArea - excludedArea,
    perimeter,
    doorWidth: room.doors.reduce((sum, door) => sum + BigInt(door.widthMillimeters), 0n),
    doors: room.doors.length,
    internalCorners: room.corners?.internal ?? 0,
    externalCorners: room.corners?.external ?? 0,
  };
}

function selectedWaste(input: CalculationInput, configuration: CalculationConfiguration): number {
  const patternWaste = input.project.installationPattern
    ? configuration.wasteRule.patternOverrides?.[input.project.installationPattern]
    : undefined;
  const waste =
    input.project.wasteBasisPoints ?? patternWaste ?? configuration.wasteRule.defaultBasisPoints;
  if (
    waste < configuration.wasteRule.minimumBasisPoints ||
    waste > configuration.wasteRule.maximumBasisPoints
  ) {
    throw new CalculationError(
      'WASTE_OUTSIDE_RANGE',
      'Requested waste is outside configured limits',
      { wasteBasisPoints: waste },
    );
  }
  return waste;
}

function priceFor(variant: ProductVariant, quantity: number): Money | undefined {
  if (!variant.price) return undefined;
  return { ...variant.price, minorUnits: checkedMoneyTotal(variant.price.minorUnits, quantity) };
}

function cartLine(productId: string, variant: ProductVariant, quantity: number): CartLine {
  const exclusionReason = !variant.available
    ? 'PRODUCT_UNAVAILABLE'
    : !variant.price
      ? 'PRICE_MISSING'
      : undefined;
  const totalPrice = priceFor(variant, quantity);
  return {
    productId,
    variantId: variant.id,
    sku: variant.sku,
    quantity,
    ...(variant.price ? { unitPrice: variant.price } : {}),
    ...(totalPrice ? { totalPrice } : {}),
    eligible: exclusionReason === undefined,
    ...(exclusionReason ? { exclusionReason } : {}),
  };
}

function availabilityWarnings(productId: string, variant: ProductVariant): ResultWarning[] {
  const warnings: ResultWarning[] = [];
  if (!variant.available)
    warnings.push({
      code: 'PRODUCT_UNAVAILABLE',
      messageKey: 'warning.productUnavailable',
      productId,
      severity: 'error',
    });
  if (!variant.price)
    warnings.push({
      code: 'PRICE_MISSING',
      messageKey: 'warning.priceMissing',
      productId,
      severity: 'warning',
    });
  return warnings;
}

function accessoryIsCompatible(
  configuration: CalculationConfiguration,
  accessory: AccessoryProduct,
  mainVariant: ProductVariant,
): boolean {
  const directRules = configuration.compatibilityRules.filter(
    (rule) =>
      rule.sourceProductId === configuration.mainProduct.id &&
      (!rule.targetProductId || rule.targetProductId === accessory.id),
  );
  if (directRules.some((rule) => rule.status === 'incompatible')) return false;
  const tags = new Set(accessory.variant.compatibilityTags);
  const exclusions = new Set(accessory.variant.exclusionTags);
  if (mainVariant.compatibilityTags.some((tag) => exclusions.has(tag))) return false;
  if (mainVariant.exclusionTags.some((tag) => tags.has(tag))) return false;
  return directRules.every(
    (rule) =>
      (rule.requiredTags ?? []).every((tag) => tags.has(tag)) &&
      !(rule.excludedTags ?? []).some((tag) => tags.has(tag)),
  );
}

function calculateAccessoryQuantity(
  rule: AccessoryRule,
  measurements: MeasurementSummary,
  mainPackages: number,
): { quantity: number; inputs: Readonly<Record<string, number | string>> } {
  const calculation = rule.calculation;
  let raw: bigint;
  let inputs: Readonly<Record<string, number | string>>;
  switch (calculation.kind) {
    case 'byArea':
      raw = ceilDiv(
        BigInt(measurements.grossAreaSquareMillimeters),
        BigInt(calculation.coverageAreaSquareMillimeters),
      );
      inputs = {
        grossAreaSquareMillimeters: measurements.grossAreaSquareMillimeters,
        coverageAreaSquareMillimeters: calculation.coverageAreaSquareMillimeters,
        rounding: 'ceil',
      };
      break;
    case 'byPerimeter': {
      const length = calculation.subtractDoorWidths
        ? measurements.skirtingLengthMillimeters
        : measurements.perimeterMillimeters;
      raw = ceilDiv(BigInt(length), BigInt(calculation.itemLengthMillimeters));
      inputs = {
        requiredLengthMillimeters: length,
        itemLengthMillimeters: calculation.itemLengthMillimeters,
        subtractDoorWidths: calculation.subtractDoorWidths ? 1 : 0,
        rounding: 'ceil',
      };
      break;
    }
    case 'byRoomCount':
      raw = BigInt(measurements.roomCount) * BigInt(calculation.unitsPerRoom);
      inputs = { roomCount: measurements.roomCount, unitsPerRoom: calculation.unitsPerRoom };
      break;
    case 'byDoorCount':
      raw = BigInt(measurements.doorCount) * BigInt(calculation.unitsPerDoor);
      inputs = { doorCount: measurements.doorCount, unitsPerDoor: calculation.unitsPerDoor };
      break;
    case 'byCornerCount': {
      const cornerCount =
        calculation.cornerType === 'internal'
          ? measurements.internalCornerCount
          : measurements.externalCornerCount;
      raw = BigInt(cornerCount) * BigInt(calculation.unitsPerCorner);
      inputs = {
        cornerType: calculation.cornerType,
        cornerCount,
        unitsPerCorner: calculation.unitsPerCorner,
      };
      break;
    }
    case 'byMainPackages':
      raw = ceilDiv(BigInt(mainPackages), BigInt(calculation.mainPackagesPerUnit));
      inputs = {
        mainPackages,
        mainPackagesPerUnit: calculation.mainPackagesPerUnit,
        rounding: 'ceil',
      };
      break;
    case 'fixed':
      raw = BigInt(calculation.quantity);
      inputs = { configuredQuantity: calculation.quantity };
      break;
    case 'optional':
      raw = BigInt(calculation.defaultQuantity);
      inputs = { configuredQuantity: calculation.defaultQuantity };
      break;
  }
  return { quantity: toSafeInteger(raw, `accessory quantity (${rule.id})`), inputs };
}

function step(
  id: string,
  operation: string,
  inputValues: CalculationStep['inputValues'],
  outputValue: number,
  outputUnit: CalculationStep['outputUnit'],
  explanationKey: string,
): CalculationStep {
  return { id, operation, inputValues, outputValue, outputUnit, explanationKey };
}

export function calculateMaterialProject(
  rawInput: CalculationInput,
  rawConfiguration: CalculationConfiguration,
): CalculationResult {
  let configuration: CalculationConfiguration;
  try {
    configuration = parseCalculationConfiguration(rawConfiguration);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new CalculationError(
        'INVALID_CONFIGURATION',
        'Configuration failed schema validation',
        { issues: error.issues },
      );
    }
    throw error;
  }
  let input: CalculationInput;
  try {
    input = parseCalculationInput(rawInput);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new CalculationError('INVALID_INPUT', 'Measurement input failed schema validation', {
        issues: error.issues,
      });
    }
    throw error;
  }

  const variantId = input.variantId ?? configuration.defaultVariantId;
  const mainVariant = configuration.mainProduct.variants.find(
    (variant) => variant.id === variantId,
  );
  if (!mainVariant) throw new CalculationError('UNKNOWN_VARIANT', `Unknown variant: ${variantId}`);
  const coverage = mainVariant.package.coverageAreaSquareMillimeters;
  if (!coverage)
    throw new CalculationError(
      'MISSING_PACKAGE_COVERAGE',
      'Main material requires package coverage',
    );

  const totals = input.project.rooms.map(roomTotals).reduce<RoomTotals>(
    (sum, room) => ({
      area: sum.area + room.area,
      perimeter: sum.perimeter + room.perimeter,
      doorWidth: sum.doorWidth + room.doorWidth,
      doors: sum.doors + room.doors,
      internalCorners: sum.internalCorners + room.internalCorners,
      externalCorners: sum.externalCorners + room.externalCorners,
    }),
    { area: 0n, perimeter: 0n, doorWidth: 0n, doors: 0, internalCorners: 0, externalCorners: 0 },
  );
  const wasteBasisPoints = selectedWaste(input, configuration);
  const wasteArea = ceilDiv(totals.area * BigInt(wasteBasisPoints), 10_000n);
  const grossArea = totals.area + wasteArea;
  const rawPackages = ceilDiv(grossArea, BigInt(coverage));
  const packageQuantity = applyMinimumAndMultiple(
    rawPackages,
    mainVariant.package.minimumPackages,
    mainVariant.package.orderMultiple,
  );
  const purchasedArea = packageQuantity * BigInt(coverage);
  const skirtingLength =
    totals.perimeter > totals.doorWidth ? totals.perimeter - totals.doorWidth : 0n;

  const measurements: MeasurementSummary = {
    netAreaSquareMillimeters: toSafeInteger(totals.area, 'net area'),
    wasteBasisPoints,
    wasteAreaSquareMillimeters: toSafeInteger(wasteArea, 'waste area'),
    grossAreaSquareMillimeters: toSafeInteger(grossArea, 'gross area'),
    perimeterMillimeters: toSafeInteger(totals.perimeter, 'perimeter'),
    doorWidthMillimeters: toSafeInteger(totals.doorWidth, 'door widths'),
    skirtingLengthMillimeters: toSafeInteger(skirtingLength, 'skirting length'),
    roomCount: input.project.rooms.length,
    doorCount: totals.doors,
    internalCornerCount: totals.internalCorners,
    externalCornerCount: totals.externalCorners,
  };
  const packageCount = toSafeInteger(packageQuantity, 'main package quantity');
  const steps: CalculationStep[] = [
    step(
      'measurement.netArea',
      'subtract',
      { roomCount: measurements.roomCount },
      measurements.netAreaSquareMillimeters,
      'squareMillimeter',
      'calculation.netArea',
    ),
    step(
      'measurement.perimeter',
      'add',
      { roomCount: measurements.roomCount },
      measurements.perimeterMillimeters,
      'millimeter',
      'calculation.perimeter',
    ),
    step(
      'measurement.skirtingLength',
      'subtract',
      {
        perimeterMillimeters: measurements.perimeterMillimeters,
        doorWidthMillimeters: measurements.doorWidthMillimeters,
      },
      measurements.skirtingLengthMillimeters,
      'millimeter',
      'calculation.skirtingLength',
    ),
    step(
      'waste.area',
      'percentage',
      { netAreaSquareMillimeters: measurements.netAreaSquareMillimeters, wasteBasisPoints },
      measurements.wasteAreaSquareMillimeters,
      'squareMillimeter',
      'calculation.wasteArea',
    ),
    step(
      'material.grossArea',
      'add',
      {
        netAreaSquareMillimeters: measurements.netAreaSquareMillimeters,
        wasteAreaSquareMillimeters: measurements.wasteAreaSquareMillimeters,
      },
      measurements.grossAreaSquareMillimeters,
      'squareMillimeter',
      'calculation.grossArea',
    ),
    step(
      'material.rawPackages',
      'ceilDivide',
      {
        grossAreaSquareMillimeters: measurements.grossAreaSquareMillimeters,
        packageCoverageSquareMillimeters: coverage,
      },
      toSafeInteger(rawPackages, 'raw package quantity'),
      'package',
      'calculation.rawPackages',
    ),
    step(
      'material.packages',
      'minimumAndMultiple',
      {
        rawPackages: toSafeInteger(rawPackages, 'raw packages'),
        minimumPackages: mainVariant.package.minimumPackages,
        orderMultiple: mainVariant.package.orderMultiple,
      },
      packageCount,
      'package',
      'calculation.finalPackages',
    ),
    step(
      'material.purchasedArea',
      'multiply',
      { packages: packageCount, packageCoverageSquareMillimeters: coverage },
      toSafeInteger(purchasedArea, 'purchased area'),
      'squareMillimeter',
      'calculation.purchasedArea',
    ),
    step(
      'material.excessArea',
      'subtract',
      {
        purchasedAreaSquareMillimeters: toSafeInteger(purchasedArea, 'purchased area'),
        grossAreaSquareMillimeters: measurements.grossAreaSquareMillimeters,
      },
      toSafeInteger(purchasedArea - grossArea, 'excess area'),
      'squareMillimeter',
      'calculation.excessArea',
    ),
  ];
  const mainTotalPrice = priceFor(mainVariant, packageCount);
  const mainProduct: CalculatedProductLine = {
    productId: configuration.mainProduct.id,
    variantId: mainVariant.id,
    sku: mainVariant.sku,
    quantity: packageCount,
    saleUnit: mainVariant.package.saleUnit,
    purchasedAreaSquareMillimeters: toSafeInteger(purchasedArea, 'purchased area'),
    excessAreaSquareMillimeters: toSafeInteger(purchasedArea - grossArea, 'excess area'),
    ...(mainVariant.price ? { unitPrice: mainVariant.price } : {}),
    ...(mainTotalPrice ? { totalPrice: mainTotalPrice } : {}),
    explanationStepIds: [
      'material.rawPackages',
      'material.packages',
      'material.purchasedArea',
      'material.excessArea',
    ],
  };

  const accessories: CalculatedProductLine[] = [];
  const warnings: ResultWarning[] = availabilityWarnings(configuration.mainProduct.id, mainVariant);
  if (
    configuration.accessoryRules.some((rule) => rule.calculation.kind === 'byPerimeter') &&
    (measurements.perimeterMillimeters === 0 ||
      measurements.doorWidthMillimeters >= measurements.perimeterMillimeters)
  ) {
    warnings.push({
      code: 'NO_PERIMETER',
      messageKey: 'warning.noUsablePerimeter',
      severity: 'warning',
    });
  }
  const selectedOptional = new Set(input.selectedOptionalAccessoryIds ?? []);
  for (const rule of configuration.accessoryRules) {
    const accessory = configuration.accessories.find(
      (candidate) => candidate.id === rule.accessoryProductId,
    );
    if (!accessory || rule.status === 'incompatible') continue;
    if (
      (rule.status === 'optional' ||
        rule.status === 'alternative' ||
        rule.calculation.kind === 'optional') &&
      !selectedOptional.has(accessory.id)
    ) {
      warnings.push({
        code: 'OPTIONAL_ACCESSORY',
        messageKey: 'warning.optionalAccessoryNotSelected',
        productId: accessory.id,
        severity: 'info',
      });
      continue;
    }
    if (!accessoryIsCompatible(configuration, accessory, mainVariant)) {
      warnings.push({
        code: 'INCOMPATIBLE_ACCESSORY',
        messageKey: 'warning.incompatibleAccessory',
        productId: accessory.id,
        severity: 'error',
      });
      continue;
    }
    const accessoryCalculation = calculateAccessoryQuantity(rule, measurements, packageCount);
    const rawQuantity = accessoryCalculation.quantity;
    const finalQuantity = toSafeInteger(
      applyMinimumAndMultiple(
        BigInt(rawQuantity),
        accessory.variant.package.minimumPackages,
        accessory.variant.package.orderMultiple,
      ),
      `accessory package quantity (${rule.id})`,
    );
    if (finalQuantity === 0) continue;
    const stepId = `accessory.${rule.id}`;
    steps.push(
      step(
        stepId,
        `minimumAndMultiple:${rule.calculation.kind}`,
        {
          ...accessoryCalculation.inputs,
          rawQuantity,
          minimumQuantity: accessory.variant.package.minimumPackages,
          orderMultiple: accessory.variant.package.orderMultiple,
        },
        finalQuantity,
        accessory.variant.package.saleUnit,
        `calculation.accessory.${rule.calculation.kind}`,
      ),
    );
    const accessoryTotalPrice = priceFor(accessory.variant, finalQuantity);
    accessories.push({
      productId: accessory.id,
      variantId: accessory.variant.id,
      sku: accessory.variant.sku,
      quantity: finalQuantity,
      saleUnit: accessory.variant.package.saleUnit,
      ...(accessory.variant.price ? { unitPrice: accessory.variant.price } : {}),
      ...(accessoryTotalPrice ? { totalPrice: accessoryTotalPrice } : {}),
      explanationStepIds: [stepId],
    });
    warnings.push(...availabilityWarnings(accessory.id, accessory.variant));
  }

  const cartLines = [
    cartLine(configuration.mainProduct.id, mainVariant, packageCount),
    ...accessories.flatMap((line) => {
      const accessory = configuration.accessories.find(
        (candidate) => candidate.id === line.productId,
      );
      return accessory ? [cartLine(accessory.id, accessory.variant, line.quantity)] : [];
    }),
  ];
  const allPricesKnown = cartLines.every((line) => line.totalPrice !== undefined);
  const totalPrice = allPricesKnown
    ? {
        currency: configuration.currency,
        minorUnits: toSafeInteger(
          cartLines.reduce((sum, line) => sum + BigInt(line.totalPrice?.minorUnits ?? 0), 0n),
          'cart total',
        ),
      }
    : undefined;
  return {
    configurationVersion: configuration.version,
    projectId: input.project.id,
    measurements,
    mainProduct,
    accessories,
    cartLines,
    ...(totalPrice ? { totalPrice } : {}),
    warnings,
    steps,
  };
}
