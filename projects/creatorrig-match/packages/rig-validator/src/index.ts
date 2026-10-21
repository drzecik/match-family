import { calculateStorage } from '@creatorrig/calculation-engine';

const POSITIVE_RELATIONS = new Set([
  'directly_compatible',
  'compatible_with_adapter',
  'compatible_with_limitations',
  'conditionally_compatible',
]);

export interface RigProductInput {
  readonly id: string;
  readonly selected: boolean;
  readonly owned: boolean;
  readonly weightGrams?: number;
  readonly priceMinor?: number;
}

export interface RigRelationInput {
  readonly sourceProductId: string;
  readonly targetProductId: string;
  readonly relationType: string;
  readonly verificationStatus: string;
  readonly evidenceIds: readonly string[];
  readonly requiredProductIds: readonly string[];
  readonly conditionsSatisfied?: boolean;
}

export interface RequiredConnection {
  readonly sourceProductId: string;
  readonly targetProductId: string;
  readonly label: string;
}

export interface RigMemoryInput {
  readonly mediaFormatSupported: boolean;
  readonly bitrateMbps?: number;
  readonly plannedDurationSeconds: number;
  readonly cardCapacityGB?: number;
  readonly cardSustainedWriteMBps?: number;
  readonly safetyMarginPercent?: number;
}

export interface RigValidationInput {
  readonly products: readonly RigProductInput[];
  readonly relations: readonly RigRelationInput[];
  readonly requiredConnections: readonly RequiredConnection[];
  readonly memory?: RigMemoryInput;
  readonly currency: string;
}

export interface RigFinding {
  readonly code: string;
  readonly severity: 'warning' | 'critical';
  readonly message: string;
  readonly productIds: readonly string[];
}

export interface RigValidationOutput {
  readonly complete: boolean;
  readonly conflicts: readonly RigFinding[];
  readonly unconfirmedRelations: readonly RigFinding[];
  readonly missingProductIds: readonly string[];
  readonly shoppingListProductIds: readonly string[];
  readonly totalKnownWeightGrams: number;
  readonly purchaseCostMinor: number;
  readonly currency: string;
  readonly missingWeightProductIds: readonly string[];
  readonly missingPriceProductIds: readonly string[];
  readonly estimatedRecordingSeconds?: number;
  readonly requiredStorageBytesWithMargin?: number;
}

function isPublishablePositive(relation: RigRelationInput): boolean {
  return relation.verificationStatus === 'verified' &&
    relation.evidenceIds.length > 0 &&
    POSITIVE_RELATIONS.has(relation.relationType) &&
    (relation.relationType !== 'conditionally_compatible' || relation.conditionsSatisfied === true);
}

export function validateRig(input: RigValidationInput): RigValidationOutput {
  const selected = input.products.filter((product) => product.selected);
  const selectedIds = new Set(selected.map((product) => product.id));
  const conflicts: RigFinding[] = [];
  const unconfirmedRelations: RigFinding[] = [];
  const missing = new Set<string>();

  for (const connection of input.requiredConnections) {
    const relation = input.relations.find(
      (candidate) => candidate.sourceProductId === connection.sourceProductId && candidate.targetProductId === connection.targetProductId,
    );
    if (relation?.verificationStatus === 'verified' && relation.relationType === 'incompatible') {
      conflicts.push({ code: 'RIG_INCOMPATIBLE', severity: 'critical', message: `${connection.label}: verified incompatibility.`, productIds: [connection.sourceProductId, connection.targetProductId] });
      continue;
    }
    if (!relation || !isPublishablePositive(relation)) {
      unconfirmedRelations.push({ code: 'RIG_RELATION_UNCONFIRMED', severity: 'warning', message: `${connection.label}: no publishable verified relation.`, productIds: [connection.sourceProductId, connection.targetProductId] });
      continue;
    }
    for (const productId of relation.requiredProductIds) if (!selectedIds.has(productId)) missing.add(productId);
  }

  let totalKnownWeightGrams = 0;
  let purchaseCostMinor = 0;
  const missingWeightProductIds: string[] = [];
  const missingPriceProductIds: string[] = [];
  for (const product of selected) {
    if (product.weightGrams === undefined) missingWeightProductIds.push(product.id);
    else totalKnownWeightGrams += product.weightGrams;
    if (!product.owned) {
      if (product.priceMinor === undefined) missingPriceProductIds.push(product.id);
      else purchaseCostMinor += product.priceMinor;
    }
  }

  let estimatedRecordingSeconds: number | undefined;
  let requiredStorageBytesWithMargin: number | undefined;
  if (input.memory) {
    const storage = calculateStorage(input.memory);
    estimatedRecordingSeconds = storage.value?.recordableSeconds;
    requiredStorageBytesWithMargin = storage.value?.requiredBytesWithMargin;
    if (!input.memory.mediaFormatSupported || storage.value?.cardWriteSpeedSufficient !== true) {
      conflicts.push({ code: 'RIG_MEDIA_INCOMPATIBLE', severity: 'critical', message: 'Selected media cannot safely sustain the recording mode.', productIds: [] });
    }
    if (storage.value?.cardCapacitySufficientForPlannedDuration === false) {
      conflicts.push({ code: 'RIG_MEDIA_CAPACITY_INSUFFICIENT', severity: 'critical', message: 'Selected media does not cover the planned recording duration with safety margin.', productIds: [] });
    }
  }

  return {
    complete: conflicts.length === 0 && unconfirmedRelations.length === 0 && missing.size === 0,
    conflicts,
    unconfirmedRelations,
    missingProductIds: [...missing].sort(),
    shoppingListProductIds: [...new Set([...selected.filter((product) => !product.owned).map((product) => product.id), ...missing])].sort(),
    totalKnownWeightGrams,
    purchaseCostMinor,
    currency: input.currency,
    missingWeightProductIds,
    missingPriceProductIds,
    ...(estimatedRecordingSeconds === undefined ? {} : { estimatedRecordingSeconds }),
    ...(requiredStorageBytesWithMargin === undefined ? {} : { requiredStorageBytesWithMargin }),
  };
}
