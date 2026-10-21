import { isFiniteNonNegative, isFinitePositive, result, type CalculationResult } from './result.js';

export interface WeightedComponent {
  readonly id: string;
  readonly weightGrams?: number;
  readonly quantity?: number;
}

export interface WeightCalculationInput {
  readonly components: readonly WeightedComponent[];
  readonly payloadCapacityGrams?: number;
  readonly payloadSafetyMarginPercent?: number;
}

export interface WeightCalculation {
  readonly knownWeightGrams: number;
  readonly includedComponentCount: number;
  readonly payloadSafetyMarginPercent: number;
  readonly recommendedMaximumPayloadGrams?: number;
  readonly remainingToRatedCapacityGrams?: number;
  readonly remainingToRecommendedCapacityGrams?: number;
  readonly payloadUtilizationPercent?: number;
  readonly withinRatedCapacity?: boolean;
  readonly withinRecommendedCapacity?: boolean;
}

export function calculateWeight(
  input: WeightCalculationInput,
): CalculationResult<WeightCalculation> {
  const missingData: string[] = [];
  const issues = [];
  let knownWeightGrams = 0;
  let includedComponentCount = 0;

  for (const component of input.components) {
    const quantity = component.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      issues.push({
        code: 'WEIGHT_INVALID_QUANTITY',
        message: 'Component quantity must be a positive integer.',
        severity: 'error' as const,
        subjectId: component.id,
      });
      continue;
    }
    if (!isFiniteNonNegative(component.weightGrams)) {
      missingData.push(`components.${component.id}.weightGrams`);
      continue;
    }
    knownWeightGrams += component.weightGrams * quantity;
    includedComponentCount += quantity;
  }

  const requestedMargin = input.payloadSafetyMarginPercent ?? 20;
  const payloadSafetyMarginPercent =
    isFiniteNonNegative(requestedMargin) && requestedMargin < 100 ? requestedMargin : 20;
  if (payloadSafetyMarginPercent !== requestedMargin) {
    issues.push({
      code: 'WEIGHT_INVALID_MARGIN',
      message: 'Invalid payload safety margin was replaced with the default 20%.',
      severity: 'warning' as const,
    });
  }

  const value: { -readonly [K in keyof WeightCalculation]: WeightCalculation[K] } = {
    knownWeightGrams,
    includedComponentCount,
    payloadSafetyMarginPercent,
  };

  if (isFinitePositive(input.payloadCapacityGrams)) {
    value.recommendedMaximumPayloadGrams =
      input.payloadCapacityGrams * (1 - payloadSafetyMarginPercent / 100);
    value.remainingToRatedCapacityGrams = input.payloadCapacityGrams - knownWeightGrams;
    value.remainingToRecommendedCapacityGrams =
      value.recommendedMaximumPayloadGrams - knownWeightGrams;
    value.payloadUtilizationPercent = (knownWeightGrams / input.payloadCapacityGrams) * 100;
    value.withinRatedCapacity = knownWeightGrams <= input.payloadCapacityGrams;
    value.withinRecommendedCapacity = knownWeightGrams <= value.recommendedMaximumPayloadGrams;
    if (!value.withinRatedCapacity) {
      issues.push({
        code: 'WEIGHT_PAYLOAD_EXCEEDED',
        message: 'Known component weight exceeds the rated payload.',
        severity: 'error' as const,
      });
    } else if (!value.withinRecommendedCapacity) {
      issues.push({
        code: 'WEIGHT_MARGIN_EXCEEDED',
        message: 'Known component weight fits the rating but exceeds the configured safety margin.',
        severity: 'warning' as const,
      });
    }
  } else {
    missingData.push('payloadCapacityGrams');
  }

  return result(value, missingData, issues);
}
