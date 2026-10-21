import { aggregateEvaluationStatus } from './aggregate.js';
import type { BaseEvaluation, EvaluationDimension } from './types.js';

export interface LensFrontProfile {
  readonly id: string;
  readonly filterThreadMm?: number;
  readonly outerDiameterMm?: number;
  readonly imageCircleMm: number;
  /** Documented minimum unobstructed aperture required in front of this exact lens. */
  readonly minimumClearApertureMm: number;
  readonly evidenceIds: readonly string[];
}

export interface StepUpRingProfile {
  readonly id: string;
  /** Lens-side female thread. */
  readonly inputThreadDiameterMm: number;
  /** Accessory-side male thread. */
  readonly outputThreadDiameterMm: number;
  /** Must explicitly confirm that the ring is used input-to-output. */
  readonly directional: boolean;
  readonly clearApertureMm: number;
  readonly evidenceIds: readonly string[];
}

export interface RoundFilterProfile {
  readonly id: string;
  readonly filterThreadMm: number;
  readonly clearApertureMm: number;
  readonly evidenceIds: readonly string[];
}

export interface MatteBoxProfile {
  readonly id: string;
  readonly clampDiameterMm: number;
  /** Exact documented lens barrel diameter accepted by the supplied clamp. */
  readonly supportedLensOuterDiameterMm: number;
  readonly clearApertureMm: number;
  readonly maximumSupportedFilterDiameterMm: number;
  readonly evidenceIds: readonly string[];
}

export type ExactSafetyStatus = 'clear' | 'conflict' | 'unknown';

/**
 * Evidence scoped to one exact lens/accessory combination. A generic product
 * specification cannot establish absence of collisions or vignetting.
 */
export interface FilterRigConfigurationClaim {
  readonly id: string;
  readonly deviceId: string;
  readonly lensId: string;
  readonly stepUpRingId?: string;
  readonly filterId?: string;
  readonly matteBoxId?: string;
  readonly sensorDiagonalMm: number;
  readonly collisionStatus: ExactSafetyStatus;
  readonly vignettingStatus: ExactSafetyStatus;
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface FilterMatteBoxEvaluationInput {
  readonly deviceId: string;
  readonly sensorDiagonalMm: number;
  readonly deviceEvidenceIds: readonly string[];
  readonly lens: LensFrontProfile;
  readonly stepUpRing?: StepUpRingProfile;
  readonly filter?: RoundFilterProfile;
  readonly matteBox?: MatteBoxProfile;
  readonly configuration: FilterRigConfigurationClaim;
}

export interface FilterMatteBoxEvaluation extends BaseEvaluation {
  readonly conditions: readonly string[];
  readonly requiredAdapterIds: readonly string[];
  readonly selectedAccessoryIds: readonly string[];
  readonly terminalFilterThreadMm?: number;
  readonly dimensions: {
    readonly threadDiameter: EvaluationDimension;
    readonly adapterDirection: EvaluationDimension;
    readonly coverageClearAperture: EvaluationDimension;
    readonly matteBoxMount: EvaluationDimension;
    readonly collisionVignetting: EvaluationDimension;
    readonly evidence: EvaluationDimension;
  };
}

/**
 * Evaluates the bounded path lens -> optional step-up ring -> optional round
 * filter, plus an optional matte box clamped to the exact lens barrel.
 *
 * Exact numeric fit is never promoted to proof of collision-free or
 * vignetting-free use: that requires a matching configuration claim.
 */
export function evaluateFilterMatteBoxCompatibility(
  input: FilterMatteBoxEvaluationInput,
): FilterMatteBoxEvaluation {
  const { lens, stepUpRing, filter, matteBox, configuration } = input;
  const selectedAccessoryIds = [stepUpRing?.id, filter?.id, matteBox?.id].filter(
    (id): id is string => id !== undefined,
  );
  const hasAccessory = selectedAccessoryIds.length > 0;
  const evidence = evaluateEvidence(input, hasAccessory);
  const evidenceAvailable = evidence.status === 'compatible';
  const terminalFilterThreadMm = getTerminalFilterThreadMm(lens, stepUpRing);
  const dimensions = {
    threadDiameter: evaluateThreadDiameter(lens, stepUpRing, filter, evidenceAvailable),
    adapterDirection: evaluateAdapterDirection(lens, stepUpRing, evidenceAvailable),
    coverageClearAperture: evaluateCoverageAndAperture(
      lens,
      stepUpRing,
      filter,
      matteBox,
      input.sensorDiagonalMm,
      evidenceAvailable,
    ),
    matteBoxMount: evaluateMatteBoxMount(lens, stepUpRing, filter, matteBox, evidenceAvailable),
    collisionVignetting: evaluateCollisionAndVignetting(input, hasAccessory, evidenceAvailable),
    evidence,
  };
  const results = Object.values(dimensions);
  const limitations = uniqueNonEmpty([
    ...configuration.limitations,
    ...results
      .filter((result) => result.status === 'compatible_with_limitations')
      .map((result) => result.explanation),
  ]);
  const warnings = uniqueNonEmpty([
    ...(!hasAccessory ? ['No filter, step-up ring, or matte box was selected.'] : []),
    ...results
      .filter((result) => result.status === 'unknown' || result.status === 'incompatible')
      .map((result) => result.explanation),
  ]);

  const status = aggregateEvaluationStatus({
    evidenced: evidenceAvailable,
    applicable: hasAccessory,
    dimensions: results,
    limitations,
    adapterRequired: stepUpRing !== undefined,
  });

  return {
    status,
    conditions: uniqueNonEmpty(configuration.conditions),
    requiredAdapterIds:
      stepUpRing !== undefined && status !== 'unknown' && status !== 'incompatible'
        ? [stepUpRing.id]
        : [],
    selectedAccessoryIds,
    ...(terminalFilterThreadMm === undefined ? {} : { terminalFilterThreadMm }),
    dimensions,
    limitations,
    warnings,
    evidenceIds: evidenceAvailable
      ? uniqueNonEmpty([
          ...input.deviceEvidenceIds,
          ...lens.evidenceIds,
          ...(stepUpRing?.evidenceIds ?? []),
          ...(filter?.evidenceIds ?? []),
          ...(matteBox?.evidenceIds ?? []),
          ...configuration.evidenceIds,
        ])
      : [],
  };
}

function evaluateEvidence(
  input: FilterMatteBoxEvaluationInput,
  hasAccessory: boolean,
): EvaluationDimension {
  const { deviceId, deviceEvidenceIds, lens, stepUpRing, filter, matteBox, configuration } = input;
  if (!hasAccessory) return unknown('No accessory identity is available to evaluate.');

  const missingSubjects = [
    ...(!hasExactIdentityAndEvidence(deviceId, deviceEvidenceIds) ? ['device'] : []),
    ...(!hasExactIdentityAndEvidence(lens.id, lens.evidenceIds) ? ['lens'] : []),
    ...(stepUpRing !== undefined &&
    !hasExactIdentityAndEvidence(stepUpRing.id, stepUpRing.evidenceIds)
      ? ['step-up ring']
      : []),
    ...(filter !== undefined && !hasExactIdentityAndEvidence(filter.id, filter.evidenceIds)
      ? ['filter']
      : []),
    ...(matteBox !== undefined && !hasExactIdentityAndEvidence(matteBox.id, matteBox.evidenceIds)
      ? ['matte box']
      : []),
    ...(!hasExactIdentityAndEvidence(configuration.id, configuration.evidenceIds)
      ? ['exact configuration claim']
      : []),
  ];
  if (missingSubjects.length > 0) {
    return unknown(
      `Scoped evidence or an exact identity is missing for: ${missingSubjects.join(', ')}.`,
    );
  }
  if (!configurationMatches(input)) {
    return unknown(
      'The configuration claim does not exactly match all selected product IDs and sensor facts.',
    );
  }
  return {
    status: 'compatible',
    explanation: 'Every selected product and the exact configuration claim carry scoped evidence.',
  };
}

function evaluateThreadDiameter(
  lens: LensFrontProfile,
  ring: StepUpRingProfile | undefined,
  filter: RoundFilterProfile | undefined,
  evidenceAvailable: boolean,
): EvaluationDimension {
  if (!evidenceAvailable) return unknown('Thread diameter facts lack scoped evidence.');
  if (ring === undefined && filter === undefined) {
    return {
      status: 'not_applicable',
      explanation: 'No threaded front accessory is selected.',
    };
  }
  if (!isFinitePositive(lens.filterThreadMm)) {
    return unknown('The exact lens filter thread diameter is missing.');
  }
  if (ring !== undefined) {
    if (
      !isFinitePositive(ring.inputThreadDiameterMm) ||
      !isFinitePositive(ring.outputThreadDiameterMm)
    ) {
      return unknown('A step-up ring thread diameter is missing.');
    }
    if (ring.inputThreadDiameterMm !== lens.filterThreadMm) {
      return {
        status: 'incompatible',
        explanation: `Ring input ${ring.inputThreadDiameterMm} mm does not match the exact ${lens.filterThreadMm} mm lens thread.`,
      };
    }
  }
  const terminalThreadMm = ring?.outputThreadDiameterMm ?? lens.filterThreadMm;
  if (filter !== undefined) {
    if (!isFinitePositive(filter.filterThreadMm)) {
      return unknown('The exact filter thread diameter is missing.');
    }
    if (filter.filterThreadMm !== terminalThreadMm) {
      return {
        status: 'incompatible',
        explanation: `Filter thread ${filter.filterThreadMm} mm does not match the exact ${terminalThreadMm} mm upstream thread.`,
      };
    }
  }
  return {
    status: 'compatible',
    explanation: `All selected threaded interfaces follow the exact ${lens.filterThreadMm}${ring === undefined ? '' : ` -> ${ring.outputThreadDiameterMm}`} mm path.`,
  };
}

function evaluateAdapterDirection(
  lens: LensFrontProfile,
  ring: StepUpRingProfile | undefined,
  evidenceAvailable: boolean,
): EvaluationDimension {
  if (ring === undefined) {
    return {
      status: 'not_applicable',
      explanation: 'No step-up ring is selected.',
    };
  }
  if (!evidenceAvailable) return unknown('Step-up ring direction lacks scoped evidence.');
  if (typeof ring.directional !== 'boolean' || !isFinitePositive(lens.filterThreadMm)) {
    return unknown('The ring direction or lens-side thread fact is missing.');
  }
  if (!ring.directional) {
    return unknown('The ring is not documented as directional input-to-output.');
  }
  if (ring.inputThreadDiameterMm === lens.filterThreadMm) {
    return {
      status: 'compatible',
      explanation: `Ring ${ring.id} is installed in its documented ${ring.inputThreadDiameterMm} -> ${ring.outputThreadDiameterMm} mm direction.`,
    };
  }
  if (ring.outputThreadDiameterMm === lens.filterThreadMm) {
    return {
      status: 'incompatible',
      explanation: `Ring ${ring.id} would have to be reversed; its documented input is ${ring.inputThreadDiameterMm} mm.`,
    };
  }
  return {
    status: 'incompatible',
    explanation: `Ring ${ring.id} has no documented input matching the exact lens thread.`,
  };
}

function evaluateCoverageAndAperture(
  lens: LensFrontProfile,
  ring: StepUpRingProfile | undefined,
  filter: RoundFilterProfile | undefined,
  matteBox: MatteBoxProfile | undefined,
  sensorDiagonalMm: number,
  evidenceAvailable: boolean,
): EvaluationDimension {
  if (!evidenceAvailable) return unknown('Coverage and clear-aperture facts lack scoped evidence.');
  if (
    !isFinitePositive(sensorDiagonalMm) ||
    !isFinitePositive(lens.imageCircleMm) ||
    !isFinitePositive(lens.minimumClearApertureMm)
  ) {
    return unknown('Sensor, image-circle, or minimum clear-aperture data is missing.');
  }
  if (lens.imageCircleMm < sensorDiagonalMm) {
    return {
      status: 'incompatible',
      explanation: `The ${lens.imageCircleMm} mm image circle does not cover the exact ${sensorDiagonalMm} mm sensor diagonal.`,
    };
  }

  const apertures = [
    ...(ring === undefined ? [] : [{ label: `ring ${ring.id}`, value: ring.clearApertureMm }]),
    ...(filter === undefined
      ? []
      : [{ label: `filter ${filter.id}`, value: filter.clearApertureMm }]),
    ...(matteBox === undefined
      ? []
      : [{ label: `matte box ${matteBox.id}`, value: matteBox.clearApertureMm }]),
  ];
  if (apertures.some(({ value }) => !isFinitePositive(value))) {
    return unknown('A selected accessory clear-aperture value is missing.');
  }
  const obstructing = apertures.filter(({ value }) => value < lens.minimumClearApertureMm);
  if (obstructing.length > 0) {
    return {
      status: 'incompatible',
      explanation: `Documented clear aperture is below the lens minimum for: ${obstructing.map(({ label }) => label).join(', ')}.`,
    };
  }
  return {
    status: 'compatible',
    explanation: `The image circle covers the sensor and every selected accessory meets the exact ${lens.minimumClearApertureMm} mm minimum clear aperture.`,
  };
}

function evaluateMatteBoxMount(
  lens: LensFrontProfile,
  ring: StepUpRingProfile | undefined,
  filter: RoundFilterProfile | undefined,
  matteBox: MatteBoxProfile | undefined,
  evidenceAvailable: boolean,
): EvaluationDimension {
  if (matteBox === undefined) {
    return {
      status: 'not_applicable',
      explanation: 'No matte box is selected.',
    };
  }
  if (!evidenceAvailable) return unknown('Matte-box mount facts lack scoped evidence.');
  if (
    !isFinitePositive(lens.outerDiameterMm) ||
    !isFinitePositive(matteBox.clampDiameterMm) ||
    !isFinitePositive(matteBox.supportedLensOuterDiameterMm)
  ) {
    return unknown('The exact lens barrel or matte-box clamp diameter is missing.');
  }
  if (
    matteBox.clampDiameterMm !== lens.outerDiameterMm ||
    matteBox.supportedLensOuterDiameterMm !== lens.outerDiameterMm
  ) {
    return {
      status: 'incompatible',
      explanation: `Matte-box clamp ${matteBox.clampDiameterMm} mm is not explicitly specified for the exact ${lens.outerDiameterMm} mm lens barrel.`,
    };
  }
  if (filter !== undefined || ring !== undefined) {
    if (!isFinitePositive(matteBox.maximumSupportedFilterDiameterMm)) {
      return unknown('The matte-box maximum supported front-filter diameter is missing.');
    }
    const accessoryDiameterMm = filter?.filterThreadMm ?? ring?.outputThreadDiameterMm;
    if (!isFinitePositive(accessoryDiameterMm)) {
      return unknown('The exact front-accessory diameter is missing.');
    }
    if (accessoryDiameterMm > matteBox.maximumSupportedFilterDiameterMm) {
      return {
        status: 'incompatible',
        explanation: `Front accessory diameter ${accessoryDiameterMm} mm exceeds the matte-box maximum ${matteBox.maximumSupportedFilterDiameterMm} mm.`,
      };
    }
  }
  return {
    status: 'compatible',
    explanation: `Matte box explicitly supports the exact ${lens.outerDiameterMm} mm lens barrel and selected front-accessory diameter.`,
  };
}

function evaluateCollisionAndVignetting(
  input: FilterMatteBoxEvaluationInput,
  hasAccessory: boolean,
  evidenceAvailable: boolean,
): EvaluationDimension {
  if (!hasAccessory) return unknown('No accessory configuration is selected.');
  if (!evidenceAvailable) {
    return unknown(
      'An exact collision and vignetting claim is unavailable for this configuration.',
    );
  }
  const { configuration } = input;
  if (configuration.collisionStatus === 'conflict') {
    return {
      status: 'incompatible',
      explanation: 'Scoped evidence documents a physical collision in this exact configuration.',
    };
  }
  if (configuration.vignettingStatus === 'conflict') {
    return {
      status: 'incompatible',
      explanation: 'Scoped evidence documents vignetting in this exact configuration.',
    };
  }
  if (configuration.collisionStatus !== 'clear' || configuration.vignettingStatus !== 'clear') {
    return unknown(
      'Absence of both collisions and vignetting is not confirmed for this exact configuration.',
    );
  }
  if (configuration.limitations.length > 0) {
    return {
      status: 'compatible_with_limitations',
      explanation:
        'Collision-free and vignetting-free use is confirmed only under stated limitations.',
    };
  }
  return {
    status: 'compatible',
    explanation:
      'Scoped evidence confirms no collision or vignetting for this exact configuration.',
  };
}

function configurationMatches(input: FilterMatteBoxEvaluationInput): boolean {
  const { deviceId, sensorDiagonalMm, lens, stepUpRing, filter, matteBox, configuration } = input;
  return (
    configuration.deviceId === deviceId &&
    configuration.lensId === lens.id &&
    optionalIdMatches(configuration.stepUpRingId, stepUpRing?.id) &&
    optionalIdMatches(configuration.filterId, filter?.id) &&
    optionalIdMatches(configuration.matteBoxId, matteBox?.id) &&
    configuration.sensorDiagonalMm === sensorDiagonalMm &&
    isFinitePositive(sensorDiagonalMm)
  );
}

function optionalIdMatches(claimed: string | undefined, selected: string | undefined): boolean {
  return claimed === selected;
}

function getTerminalFilterThreadMm(
  lens: LensFrontProfile,
  ring: StepUpRingProfile | undefined,
): number | undefined {
  const value = ring?.outputThreadDiameterMm ?? lens.filterThreadMm;
  return isFinitePositive(value) ? value : undefined;
}

function hasExactIdentityAndEvidence(id: string, evidenceIds: readonly string[]): boolean {
  return nonEmpty(id) && evidenceIds.some(nonEmpty);
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function isFinitePositive(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

function unknown(explanation: string): EvaluationDimension {
  return { status: 'unknown', explanation };
}

function uniqueNonEmpty(values: readonly string[]): string[] {
  return [...new Set(values.filter(nonEmpty))];
}
