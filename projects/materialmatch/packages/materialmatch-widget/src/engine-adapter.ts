import { calculateMaterialProject } from '@materialmatch/calculation-engine';
import type { TranslationId } from '@materialmatch/shared-ui';
import type {
  CalculatedProductLine,
  CalculationConfiguration,
  CalculationStep,
  CartLine,
  MeasurementProject,
  ResultWarning,
} from '@materialmatch/domain';
import type {
  ResultLineStatus,
  WidgetCalculationRequest,
  WidgetCalculationResult,
  WidgetResultLine,
} from './types';

function projectFromRequest(request: WidgetCalculationRequest): MeasurementProject {
  return {
    id: request.project.id,
    wasteBasisPoints: request.project.wasteBasisPoints,
    rooms: request.project.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      geometry: {
        kind: 'rectangle' as const,
        lengthMillimeters: room.lengthMm,
        widthMillimeters: room.widthMm,
      },
      excludedAreas:
        room.excludedAreaSquareMm > 0
          ? [{ id: `${room.id}-excluded`, areaSquareMillimeters: room.excludedAreaSquareMm }]
          : [],
      doors:
        room.doorWidthMm > 0
          ? [{ id: `${room.id}-doors`, widthMillimeters: room.doorWidthMm }]
          : [],
      corners: {
        internal: room.internalCornerCount ?? 0,
        external: room.externalCornerCount ?? 0,
      },
    })),
  };
}

function statusFromCartLine(line: CartLine | undefined): ResultLineStatus {
  if (!line || !line.eligible) return 'unavailable';
  if (!line.unitPrice) return 'missing-price';
  return 'available';
}

function presentLine(
  line: CalculatedProductLine,
  cartLines: readonly CartLine[],
  configuration: CalculationConfiguration,
  productNames: Readonly<Record<string, string>>,
): WidgetResultLine {
  const cartLine = cartLines.find(
    (candidate) => candidate.productId === line.productId && candidate.variantId === line.variantId,
  );
  const product =
    line.productId === configuration.mainProduct.id
      ? configuration.mainProduct
      : configuration.accessories.find((candidate) => candidate.id === line.productId);
  return {
    id: `${line.productId}:${line.variantId}`,
    sku: line.sku,
    name: productNames[line.productId] ?? product?.nameKey ?? line.sku,
    quantity: line.quantity,
    unitLabel: line.saleUnit === 'package' ? 'opak.' : line.saleUnit === 'roll' ? 'rol.' : 'szt.',
    unitPriceMinor: line.unitPrice?.minorUnits ?? null,
    totalPriceMinor: line.totalPrice?.minorUnits ?? null,
    status: statusFromCartLine(cartLine),
    required: true,
  };
}

const engineTranslationIds = new Set<TranslationId>([
  'calculation.netArea',
  'calculation.perimeter',
  'calculation.skirtingLength',
  'calculation.wasteArea',
  'calculation.grossArea',
  'calculation.rawPackages',
  'calculation.finalPackages',
  'calculation.purchasedArea',
  'calculation.accessory.byArea',
  'calculation.accessory.byPerimeter',
  'calculation.accessory.byRoomCount',
  'calculation.accessory.byDoorCount',
  'calculation.accessory.byCornerCount',
  'calculation.accessory.byMainPackages',
  'calculation.accessory.fixed',
  'calculation.accessory.optional',
  'warning.productUnavailable',
  'warning.priceMissing',
  'warning.optionalAccessoryNotSelected',
  'warning.incompatibleAccessory',
]);

function knownTranslationId(value: string): TranslationId | undefined {
  return engineTranslationIds.has(value as TranslationId) ? (value as TranslationId) : undefined;
}

function presentStep(step: CalculationStep): {
  id: string;
  translationId?: TranslationId;
  description: string;
  expression: string;
} {
  const inputs = Object.entries(step.inputValues)
    .map(([name, value]) => `${name}=${value}`)
    .join(', ');
  const translationId = knownTranslationId(step.explanationKey);
  return {
    id: step.id,
    ...(translationId ? { translationId } : {}),
    description: step.explanationKey,
    expression: `${step.operation}(${inputs}) → ${step.outputValue} ${step.outputUnit}`,
  };
}

function presentWarning(warning: ResultWarning): {
  code: string;
  message: string;
  translationId?: TranslationId;
} {
  const translationId = knownTranslationId(warning.messageKey);
  return {
    code: warning.code,
    message: warning.messageKey,
    ...(translationId ? { translationId } : {}),
  };
}

export function calculateWithMaterialMatchEngine(
  request: WidgetCalculationRequest,
): WidgetCalculationResult {
  const calculation = request.calculation as CalculationConfiguration;
  const result = calculateMaterialProject(
    {
      project: projectFromRequest(request),
      ...(request.variantId ? { variantId: request.variantId } : {}),
      ...(request.selectedOptionalAccessoryIds
        ? { selectedOptionalAccessoryIds: request.selectedOptionalAccessoryIds }
        : {}),
    },
    calculation,
  );
  const productNames = request.productNames ?? {};
  const mainProduct = presentLine(result.mainProduct, result.cartLines, calculation, productNames);
  const accessories = result.accessories.map((line) =>
    presentLine(line, result.cartLines, calculation, productNames),
  );
  return {
    calculationId: result.projectId,
    configurationVersion: `${result.configurationVersion.schemaVersion}.${result.configurationVersion.revision}`,
    netAreaSquareMm: result.measurements.netAreaSquareMillimeters,
    wasteAreaSquareMm: result.measurements.wasteAreaSquareMillimeters,
    grossAreaSquareMm: result.measurements.grossAreaSquareMillimeters,
    purchaseAreaSquareMm:
      result.mainProduct.purchasedAreaSquareMillimeters ??
      result.measurements.grossAreaSquareMillimeters,
    surplusAreaSquareMm: result.mainProduct.excessAreaSquareMillimeters ?? 0,
    lines: [mainProduct, ...accessories],
    steps: result.steps.map(presentStep),
    warnings: result.warnings.map(presentWarning),
    totalPriceMinor: result.totalPrice?.minorUnits ?? null,
  };
}
