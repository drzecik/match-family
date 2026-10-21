import { aggregateEvaluationStatus } from './aggregate.js';
import type { BaseEvaluation, EvaluationDimension } from './types.js';

export interface GimbalPayloadComponent {
  readonly id: string;
  readonly weightGrams?: number;
}

export interface RigMechanicalProfile {
  readonly id: string;
  readonly cameraMount: string;
  readonly packageWidthMm?: number;
  readonly packageHeightMm?: number;
  readonly packageDepthMm?: number;
  readonly centerOfGravityOffsetMm?: number;
  readonly conditions: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface GimbalMechanicalProfile {
  readonly id: string;
  readonly ratedPayloadGrams?: number;
  readonly payloadSafetyMarginPercent: number;
  readonly supportedCameraMounts: readonly string[];
  readonly maximumPackageWidthMm?: number;
  readonly maximumPackageHeightMm?: number;
  readonly maximumPackageDepthMm?: number;
  readonly maximumCenterOfGravityOffsetMm?: number;
  readonly evidenceIds: readonly string[];
}

export interface GimbalEvaluationInput {
  readonly gimbal: GimbalMechanicalProfile;
  readonly rig: RigMechanicalProfile;
  readonly payloadComponents: readonly GimbalPayloadComponent[];
}

export interface GimbalCompatibilityEvaluation extends BaseEvaluation {
  readonly payloadWeightGrams?: number;
  readonly ratedPayloadGrams?: number;
  readonly recommendedMaximumPayloadGrams?: number;
  readonly ratedPayloadHeadroomGrams?: number;
  readonly recommendedPayloadHeadroomGrams?: number;
  readonly conditions: readonly string[];
  readonly dimensions: {
    readonly payload: EvaluationDimension;
    readonly mounting: EvaluationDimension;
    readonly clearance: EvaluationDimension;
    readonly balance: EvaluationDimension;
  };
}

export function evaluateGimbalCompatibility(
  input: GimbalEvaluationInput,
): GimbalCompatibilityEvaluation {
  const { gimbal, rig } = input;
  const missingWeights = input.payloadComponents
    .filter((component) => !isFiniteNonNegative(component.weightGrams))
    .map((component) => component.id);
  const payloadWeightGrams =
    missingWeights.length === 0
      ? input.payloadComponents.reduce(
          (total, component) => total + (component.weightGrams ?? 0),
          0,
        )
      : undefined;
  const validRatedPayload = isFinitePositive(gimbal.ratedPayloadGrams);
  const validMargin =
    Number.isFinite(gimbal.payloadSafetyMarginPercent) &&
    gimbal.payloadSafetyMarginPercent >= 0 &&
    gimbal.payloadSafetyMarginPercent < 100;
  const recommendedMaximumPayloadGrams =
    validRatedPayload && validMargin
      ? gimbal.ratedPayloadGrams * (1 - gimbal.payloadSafetyMarginPercent / 100)
      : undefined;

  const payload = evaluatePayload(
    payloadWeightGrams,
    validRatedPayload ? gimbal.ratedPayloadGrams : undefined,
    recommendedMaximumPayloadGrams,
    missingWeights,
  );
  const mounting = evaluateMounting(rig.cameraMount, gimbal.supportedCameraMounts);
  const clearance = evaluateClearance(rig, gimbal);
  const balance = evaluateBalance(
    rig.centerOfGravityOffsetMm,
    gimbal.maximumCenterOfGravityOffsetMm,
  );
  const dimensions = { payload, mounting, clearance, balance };
  const results = Object.values(dimensions);
  const missingEvidence = gimbal.evidenceIds.length === 0 || rig.evidenceIds.length === 0;
  const limitations: string[] = [];
  const warnings: string[] = [];

  for (const result of results) {
    if (result.status === 'compatible_with_limitations') limitations.push(result.explanation);
    if (result.status === 'unknown' || result.status === 'incompatible') {
      warnings.push(result.explanation);
    }
  }
  if (missingEvidence) warnings.push('Mechanical facts are not supported by scoped evidence.');

  const status = aggregateEvaluationStatus({
    evidenced: !missingEvidence,
    dimensions: results,
  });

  return {
    status,
    ...(payloadWeightGrams === undefined ? {} : { payloadWeightGrams }),
    ...(validRatedPayload ? { ratedPayloadGrams: gimbal.ratedPayloadGrams } : {}),
    ...(recommendedMaximumPayloadGrams === undefined ? {} : { recommendedMaximumPayloadGrams }),
    ...(payloadWeightGrams === undefined || !validRatedPayload
      ? {}
      : { ratedPayloadHeadroomGrams: gimbal.ratedPayloadGrams - payloadWeightGrams }),
    ...(payloadWeightGrams === undefined || recommendedMaximumPayloadGrams === undefined
      ? {}
      : {
          recommendedPayloadHeadroomGrams: recommendedMaximumPayloadGrams - payloadWeightGrams,
        }),
    conditions: rig.conditions,
    limitations: unique(limitations),
    warnings: unique(warnings),
    evidenceIds: missingEvidence ? [] : unique([...gimbal.evidenceIds, ...rig.evidenceIds]),
    dimensions,
  };
}

function evaluatePayload(
  payloadWeightGrams: number | undefined,
  ratedPayloadGrams: number | undefined,
  recommendedMaximumPayloadGrams: number | undefined,
  missingWeightIds: readonly string[],
): EvaluationDimension {
  if (payloadWeightGrams === undefined) {
    return {
      status: 'unknown',
      explanation: `Payload cannot be confirmed; weight is missing for: ${missingWeightIds.join(', ')}.`,
    };
  }
  if (ratedPayloadGrams === undefined || recommendedMaximumPayloadGrams === undefined) {
    return { status: 'unknown', explanation: 'Gimbal payload rating or safety margin is missing.' };
  }
  if (payloadWeightGrams > ratedPayloadGrams) {
    return {
      status: 'incompatible',
      explanation: `Payload ${payloadWeightGrams} g exceeds the rated ${ratedPayloadGrams} g.`,
    };
  }
  if (payloadWeightGrams > recommendedMaximumPayloadGrams) {
    return {
      status: 'compatible_with_limitations',
      explanation: `Payload ${payloadWeightGrams} g is within the rated limit but exceeds the recommended ${recommendedMaximumPayloadGrams} g safety threshold.`,
    };
  }
  return {
    status: 'compatible',
    explanation: `Payload ${payloadWeightGrams} g is within the recommended ${recommendedMaximumPayloadGrams} g threshold.`,
  };
}

function evaluateMounting(
  cameraMount: string,
  supportedCameraMounts: readonly string[],
): EvaluationDimension {
  if (!cameraMount || supportedCameraMounts.length === 0) {
    return { status: 'unknown', explanation: 'Camera mounting standard is not fully documented.' };
  }
  if (!supportedCameraMounts.includes(cameraMount)) {
    return {
      status: 'incompatible',
      explanation: `Rig mount ${cameraMount} is not in the verified gimbal mount list.`,
    };
  }
  return {
    status: 'compatible',
    explanation: `Gimbal supports the ${cameraMount} mounting standard.`,
  };
}

function evaluateClearance(
  rig: RigMechanicalProfile,
  gimbal: GimbalMechanicalProfile,
): EvaluationDimension {
  const comparisons = [
    ['width', rig.packageWidthMm, gimbal.maximumPackageWidthMm],
    ['height', rig.packageHeightMm, gimbal.maximumPackageHeightMm],
    ['depth', rig.packageDepthMm, gimbal.maximumPackageDepthMm],
  ] as const;
  const missing = comparisons.filter(
    ([, actual, maximum]) => !isFinitePositive(actual) || !isFinitePositive(maximum),
  );
  if (missing.length > 0) {
    return {
      status: 'unknown',
      explanation: `Clearance cannot be confirmed; missing ${missing.map(([name]) => name).join(', ')} limits or dimensions.`,
    };
  }
  const exceeded = comparisons.flatMap(([name, actual, maximum]) =>
    isFinitePositive(actual) && isFinitePositive(maximum) && actual > maximum ? [name] : [],
  );
  if (exceeded.length > 0) {
    return {
      status: 'incompatible',
      explanation: `Rig exceeds verified gimbal clearance for ${exceeded.join(', ')}.`,
    };
  }
  return { status: 'compatible', explanation: 'Rig package fits all verified clearance limits.' };
}

function evaluateBalance(
  centerOfGravityOffsetMm: number | undefined,
  maximumCenterOfGravityOffsetMm: number | undefined,
): EvaluationDimension {
  if (
    !isFiniteNonNegative(centerOfGravityOffsetMm) ||
    !isFinitePositive(maximumCenterOfGravityOffsetMm)
  ) {
    return {
      status: 'unknown',
      explanation: 'Center-of-gravity clearance is not fully documented.',
    };
  }
  if (centerOfGravityOffsetMm > maximumCenterOfGravityOffsetMm) {
    return {
      status: 'incompatible',
      explanation: `Center-of-gravity offset ${centerOfGravityOffsetMm} mm exceeds the verified ${maximumCenterOfGravityOffsetMm} mm limit.`,
    };
  }
  return {
    status: 'compatible',
    explanation: `Center-of-gravity offset ${centerOfGravityOffsetMm} mm is within the verified limit.`,
  };
}

function isFinitePositive(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

function isFiniteNonNegative(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= 0;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
