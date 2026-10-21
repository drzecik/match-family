import { aggregateEvaluationStatus } from './aggregate.js';
import type { BaseEvaluation, EvaluationDimension } from './types.js';
import type { VerificationStatus } from './media-path.js';

export interface CameraRigSupportProfile {
  readonly deviceId: string;
  readonly productIds: readonly string[];
  readonly mountOutput: string;
  readonly plateStandard: string;
  readonly accessoryMounts: readonly string[];
  readonly totalPayloadGrams: number;
  readonly widthMm: number;
  readonly evidenceIds: readonly string[];
}

export interface TripodHeadProfile {
  readonly id: string;
  readonly mountInput: string;
  readonly mountOutput: string;
  readonly plateStandards: readonly string[];
  readonly maxPayloadGrams: number;
  readonly weightGrams: number;
  readonly evidenceIds: readonly string[];
}

export interface TripodProfile {
  readonly id: string;
  readonly mountInput: string;
  readonly maxPayloadGrams: number;
  readonly evidenceIds: readonly string[];
}

export interface TeleprompterProfile {
  readonly id: string;
  readonly mountInput: string;
  readonly supportedPlateStandards: readonly string[];
  readonly maxPayloadGrams: number;
  readonly maxRigWidthMm: number;
  readonly evidenceIds: readonly string[];
}

export interface SupportRigClaim {
  readonly id: string;
  readonly deviceId: string;
  readonly rigProductIds: readonly string[];
  readonly headId: string;
  readonly tripodId: string;
  readonly teleprompterId?: string;
  readonly totalPayloadGrams: number;
  readonly requiredPayloadMarginPercent: number;
  readonly collisionStatus: 'clear' | 'conflict' | 'unknown';
  readonly verificationStatus: VerificationStatus;
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface SupportRigEvaluationInput {
  readonly rig: CameraRigSupportProfile;
  readonly head: TripodHeadProfile;
  readonly tripod: TripodProfile;
  readonly teleprompter?: TeleprompterProfile;
  readonly requiredPayloadMarginPercent: number;
  readonly claim: SupportRigClaim;
}

export interface SupportRigEvaluation extends BaseEvaluation {
  readonly conditions: readonly string[];
  readonly requiredItemIds: readonly string[];
  readonly headRequiredCapacityGrams?: number;
  readonly tripodRequiredCapacityGrams?: number;
  readonly dimensions: {
    readonly mountChain: EvaluationDimension;
    readonly payloadMargin: EvaluationDimension;
    readonly plateCompatibility: EvaluationDimension;
    readonly clearanceWeight: EvaluationDimension;
    readonly evidence: EvaluationDimension;
  };
}

export function evaluateSupportRig(input: SupportRigEvaluationInput): SupportRigEvaluation {
  const evidence = evaluateEvidence(input);
  const evidenced = evidence.status === 'compatible';
  const marginMultiplier = 1 + input.requiredPayloadMarginPercent / 100;
  const headRequiredCapacityGrams = validNonNegative(input.requiredPayloadMarginPercent)
    ? input.rig.totalPayloadGrams * marginMultiplier
    : undefined;
  const tripodRequiredCapacityGrams = validNonNegative(input.requiredPayloadMarginPercent)
    ? (input.rig.totalPayloadGrams + input.head.weightGrams) * marginMultiplier
    : undefined;
  const dimensions = {
    mountChain: evaluateMounts(input, evidenced),
    payloadMargin: evaluatePayload(
      input,
      headRequiredCapacityGrams,
      tripodRequiredCapacityGrams,
      evidenced,
    ),
    plateCompatibility: evaluatePlate(input, evidenced),
    clearanceWeight: evaluateClearance(input, evidenced),
    evidence,
  };
  const results = Object.values(dimensions);
  const limitations = unique(input.claim.limitations);
  const warnings = unique(
    results
      .filter(({ status }) => status === 'unknown' || status === 'incompatible')
      .map(({ explanation }) => explanation),
  );

  const status = aggregateEvaluationStatus({ evidenced, dimensions: results, limitations });
  const positive = status === 'directly_compatible' || status === 'compatible_with_limitations';

  return {
    status,
    conditions: unique(input.claim.conditions),
    requiredItemIds: positive
      ? [
          input.head.id,
          input.tripod.id,
          ...(input.teleprompter === undefined ? [] : [input.teleprompter.id]),
        ]
      : [],
    ...(headRequiredCapacityGrams === undefined ? {} : { headRequiredCapacityGrams }),
    ...(tripodRequiredCapacityGrams === undefined ? {} : { tripodRequiredCapacityGrams }),
    dimensions,
    limitations,
    warnings,
    evidenceIds: evidenced
      ? unique([
          ...input.rig.evidenceIds,
          ...input.head.evidenceIds,
          ...input.tripod.evidenceIds,
          ...(input.teleprompter?.evidenceIds ?? []),
          ...input.claim.evidenceIds,
        ])
      : [],
  };
}

function evaluateEvidence(input: SupportRigEvaluationInput): EvaluationDimension {
  const subjects: Array<readonly [string, readonly string[], string]> = [
    [input.rig.deviceId, input.rig.evidenceIds, 'camera rig'],
    [input.head.id, input.head.evidenceIds, 'tripod head'],
    [input.tripod.id, input.tripod.evidenceIds, 'tripod'],
    [input.claim.id, input.claim.evidenceIds, 'exact support claim'],
  ];
  if (input.teleprompter !== undefined) {
    subjects.push([input.teleprompter.id, input.teleprompter.evidenceIds, 'teleprompter']);
  }
  const missing = subjects
    .filter(([id, ids]) => !nonEmpty(id) || !ids.some(nonEmpty))
    .map(([, , label]) => label);
  if (missing.length > 0) return unknown(`Scoped evidence is missing for: ${missing.join(', ')}.`);
  if (input.claim.verificationStatus !== 'verified') {
    return unknown(`Support claim status ${input.claim.verificationStatus} is not verified.`);
  }
  if (!claimMatches(input))
    return unknown('Support claim does not exactly match the selected rig.');
  return compatible('Every support component and the exact rig claim carry verified evidence.');
}

function evaluateMounts(input: SupportRigEvaluationInput, evidenced: boolean): EvaluationDimension {
  if (!evidenced) return unknown('Mount-chain facts lack verified evidence.');
  const { rig, head, tripod, teleprompter } = input;
  if (![rig.mountOutput, head.mountInput, head.mountOutput, tripod.mountInput].every(nonEmpty)) {
    return unknown('A required support mount identity is missing.');
  }
  if (rig.mountOutput !== head.mountInput || head.mountOutput !== tripod.mountInput) {
    return incompatible('Exact rig-to-head or head-to-tripod mount identities do not align.');
  }
  if (teleprompter !== undefined) {
    if (!nonEmpty(teleprompter.mountInput))
      return unknown('Teleprompter mount identity is missing.');
    if (!rig.accessoryMounts.includes(teleprompter.mountInput)) {
      return incompatible('Rig does not provide the exact teleprompter mount input.');
    }
  }
  return compatible('All exact support mounts align in the documented direction.');
}

function evaluatePayload(
  input: SupportRigEvaluationInput,
  headRequired: number | undefined,
  tripodRequired: number | undefined,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Payload capacity facts lack verified evidence.');
  if (
    headRequired === undefined ||
    tripodRequired === undefined ||
    !validPositive(input.rig.totalPayloadGrams) ||
    !validPositive(input.head.weightGrams) ||
    !validPositive(input.head.maxPayloadGrams) ||
    !validPositive(input.tripod.maxPayloadGrams)
  ) {
    return unknown('A weight, capacity, or payload-margin fact is missing.');
  }
  const insufficient: string[] = [];
  if (input.head.maxPayloadGrams < headRequired) insufficient.push('tripod head');
  if (input.tripod.maxPayloadGrams < tripodRequired) insufficient.push('tripod');
  if (insufficient.length > 0) {
    return incompatible(
      `Payload capacity including required margin is insufficient for: ${insufficient.join(', ')}.`,
    );
  }
  return compatible(
    `Head and tripod meet the ${input.requiredPayloadMarginPercent}% payload margin.`,
  );
}

function evaluatePlate(input: SupportRigEvaluationInput, evidenced: boolean): EvaluationDimension {
  if (!evidenced) return unknown('Plate-standard facts lack verified evidence.');
  if (!nonEmpty(input.rig.plateStandard) || input.head.plateStandards.length === 0) {
    return unknown('Rig plate or supported head plate standards are missing.');
  }
  if (!input.head.plateStandards.includes(input.rig.plateStandard)) {
    return incompatible('Tripod head does not document the exact rig plate standard.');
  }
  if (
    input.teleprompter !== undefined &&
    !input.teleprompter.supportedPlateStandards.includes(input.rig.plateStandard)
  ) {
    return incompatible('Teleprompter does not document the exact rig plate standard.');
  }
  return compatible(`All selected components support ${input.rig.plateStandard}.`);
}

function evaluateClearance(
  input: SupportRigEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Clearance and teleprompter facts lack verified evidence.');
  if (input.claim.collisionStatus === 'unknown')
    return unknown('Exact rig clearance is not confirmed.');
  if (input.claim.collisionStatus === 'conflict') {
    return incompatible(
      'Scoped evidence documents a physical collision in this exact support rig.',
    );
  }
  const { teleprompter, rig } = input;
  if (teleprompter === undefined)
    return compatible('Exact support rig is documented collision-free.');
  if (
    !validPositive(rig.widthMm) ||
    !validPositive(teleprompter.maxRigWidthMm) ||
    !validPositive(teleprompter.maxPayloadGrams)
  ) {
    return unknown('Teleprompter width or payload limit is missing.');
  }
  if (
    rig.widthMm > teleprompter.maxRigWidthMm ||
    rig.totalPayloadGrams > teleprompter.maxPayloadGrams
  ) {
    return incompatible('Rig exceeds the teleprompter documented width or payload limit.');
  }
  return compatible('Exact rig fits the documented teleprompter clearance and weight envelope.');
}

function claimMatches(input: SupportRigEvaluationInput): boolean {
  const { claim, rig, head, tripod, teleprompter } = input;
  return (
    claim.deviceId === rig.deviceId &&
    sameSet(claim.rigProductIds, rig.productIds) &&
    claim.headId === head.id &&
    claim.tripodId === tripod.id &&
    claim.teleprompterId === teleprompter?.id &&
    claim.totalPayloadGrams === rig.totalPayloadGrams &&
    claim.requiredPayloadMarginPercent === input.requiredPayloadMarginPercent
  );
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((id) => right.includes(id))
  );
}

function validPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function validNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(nonEmpty))];
}

function compatible(explanation: string): EvaluationDimension {
  return { status: 'compatible', explanation };
}

function incompatible(explanation: string): EvaluationDimension {
  return { status: 'incompatible', explanation };
}

function unknown(explanation: string): EvaluationDimension {
  return { status: 'unknown', explanation };
}
