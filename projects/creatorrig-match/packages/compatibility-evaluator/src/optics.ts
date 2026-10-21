import { aggregateEvaluationStatus } from './aggregate.js';
import type { BaseEvaluation, EvaluationDimension } from './types.js';

export interface CameraOpticsProfile {
  readonly id: string;
  readonly mount: string;
  readonly sensorDiagonalMm: number;
  readonly supportsAutofocus?: boolean;
  readonly supportsElectronicAperture?: boolean;
  readonly supportsStabilization?: boolean;
  readonly supportsExif?: boolean;
  readonly evidenceIds: readonly string[];
}

export interface LensOpticsProfile {
  readonly id: string;
  readonly mount: string;
  readonly imageCircleMm: number;
  readonly autofocus?: boolean;
  readonly electronicAperture?: boolean;
  readonly stabilization?: boolean;
  readonly exif?: boolean;
  readonly filterThreadMm?: number;
  readonly weightGrams?: number;
  readonly evidenceIds: readonly string[];
}

export interface MountAdapterProfile {
  readonly id: string;
  readonly lensMount: string;
  readonly cameraMount: string;
  readonly verified: boolean;
  readonly evidenceIds: readonly string[];
  readonly autofocus?: boolean;
  readonly apertureControl?: boolean;
  readonly stabilization?: boolean;
  readonly exif?: boolean;
  readonly cropFactor?: number;
  readonly limitations?: readonly string[];
}

export interface OpticsEvaluationInput {
  readonly camera: CameraOpticsProfile;
  readonly lens: LensOpticsProfile;
  readonly adapter?: MountAdapterProfile;
}

export interface OpticsCompatibilityEvaluation extends BaseEvaluation {
  readonly requiredAdapterIds: readonly string[];
  readonly manualOnly: boolean;
  readonly causesCrop: boolean;
  readonly filterThreadMm?: number;
  readonly combinedLensAndAdapterWeightGrams?: number;
  readonly dimensions: {
    readonly mechanical: EvaluationDimension;
    readonly coverage: EvaluationDimension;
    readonly autofocus: EvaluationDimension;
    readonly aperture: EvaluationDimension;
    readonly stabilization: EvaluationDimension;
    readonly exif: EvaluationDimension;
  };
}

export function evaluateOpticsCompatibility(
  input: OpticsEvaluationInput,
): OpticsCompatibilityEvaluation {
  const { camera, lens, adapter } = input;
  /** An absent mount name is a missing fact, never a match with another absent name. */
  const mountsKnown = nonEmpty(camera.mount) && nonEmpty(lens.mount);
  const sameMount = mountsKnown && camera.mount === lens.mount;
  const validAdapter =
    adapter?.verified === true &&
    adapter.evidenceIds.length > 0 &&
    adapter.lensMount === lens.mount &&
    adapter.cameraMount === camera.mount;
  const physicallyCompatible = sameMount || validAdapter;
  const coverageKnown =
    isFinitePositive(lens.imageCircleMm) && isFinitePositive(camera.sensorDiagonalMm);
  const coversSensor = coverageKnown && lens.imageCircleMm - camera.sensorDiagonalMm >= 0;
  /** Scoped evidence for both endpoints, and for the adapter whenever one is used. */
  const evidenced =
    camera.evidenceIds.length > 0 &&
    lens.evidenceIds.length > 0 &&
    (adapter === undefined || validAdapter);
  const causesCrop = validAdapter && (adapter.cropFactor ?? 1) > 1;
  const limitations = [...(validAdapter ? (adapter.limitations ?? []) : [])];
  const warnings: string[] = [];

  const autofocus = electronicFeature(
    'autofocus',
    lens.autofocus,
    camera.supportsAutofocus,
    sameMount,
    validAdapter ? adapter.autofocus : undefined,
  );
  const aperture = electronicFeature(
    'electronic aperture control',
    lens.electronicAperture,
    camera.supportsElectronicAperture,
    sameMount,
    validAdapter ? adapter.apertureControl : undefined,
  );
  const stabilization = electronicFeature(
    'lens stabilization control',
    lens.stabilization,
    camera.supportsStabilization,
    sameMount,
    validAdapter ? adapter.stabilization : undefined,
  );
  const exif = electronicFeature(
    'EXIF transfer',
    lens.exif,
    camera.supportsExif,
    sameMount,
    validAdapter ? adapter.exif : undefined,
  );

  for (const result of [autofocus, aperture, stabilization, exif]) {
    if (result.status === 'incompatible' || result.status === 'unknown')
      limitations.push(result.explanation);
  }
  if (causesCrop)
    limitations.push(`The adapter applies a ${adapter?.cropFactor ?? 1}× crop factor.`);
  if (coverageKnown && !coversSensor)
    warnings.push('The lens image circle does not cover the full sensor.');
  if (mountsKnown && !physicallyCompatible)
    warnings.push('The mounts do not match and no verified matching adapter was supplied.');
  if (!evidenced) warnings.push('Optical facts are not supported by scoped evidence.');

  const manualOnly =
    physicallyCompatible &&
    (autofocus.status === 'incompatible' || autofocus.status === 'unknown') &&
    (aperture.status === 'incompatible' || aperture.status === 'unknown');

  const mechanical: EvaluationDimension = {
    status: !mountsKnown ? 'unknown' : physicallyCompatible ? 'compatible' : 'incompatible',
    explanation: !mountsKnown
      ? 'A camera or lens mount name is missing, so the mechanical fit cannot be evaluated.'
      : sameMount
        ? `Lens and camera use ${camera.mount}.`
        : validAdapter
          ? `Verified adapter ${adapter.id} converts ${lens.mount} to ${camera.mount}.`
          : `Lens mount ${lens.mount} does not match camera mount ${camera.mount}.`,
  };
  const coverage: EvaluationDimension = {
    status: !coverageKnown
      ? 'unknown'
      : !coversSensor
        ? 'incompatible'
        : causesCrop
          ? 'compatible_with_limitations'
          : 'compatible',
    explanation: !coverageKnown
      ? 'The image circle or sensor diagonal is missing, so sensor coverage cannot be evaluated.'
      : coversSensor
        ? `The ${lens.imageCircleMm} mm image circle covers the ${camera.sensorDiagonalMm} mm sensor diagonal${causesCrop ? ', with adapter crop' : ''}.`
        : `The ${lens.imageCircleMm} mm image circle is smaller than the ${camera.sensorDiagonalMm} mm sensor diagonal.`,
  };

  /**
   * Only mechanical fit and sensor coverage can block an optical pairing. Electronic
   * feature pass-through is reported as a limitation, because an unconfirmed autofocus
   * link does not stop the lens from mounting and exposing correctly.
   */
  const status = aggregateEvaluationStatus({
    evidenced,
    dimensions: [mechanical, coverage],
    limitations,
    adapterRequired: validAdapter,
  });

  return {
    status,
    requiredAdapterIds: validAdapter ? [adapter.id] : [],
    manualOnly,
    causesCrop,
    ...(lens.filterThreadMm === undefined ? {} : { filterThreadMm: lens.filterThreadMm }),
    ...(lens.weightGrams === undefined
      ? {}
      : { combinedLensAndAdapterWeightGrams: lens.weightGrams }),
    limitations: unique(limitations),
    warnings,
    evidenceIds: unique([
      ...camera.evidenceIds,
      ...lens.evidenceIds,
      ...(validAdapter ? adapter.evidenceIds : []),
    ]),
    dimensions: {
      mechanical,
      coverage,
      autofocus,
      aperture,
      stabilization,
      exif,
    },
  };
}

function electronicFeature(
  label: string,
  lensHasFeature: boolean | undefined,
  cameraSupportsFeature: boolean | undefined,
  sameMount: boolean,
  adapterPassesFeature: boolean | undefined,
): EvaluationDimension {
  if (lensHasFeature === undefined)
    return { status: 'unknown', explanation: `The lens implementation of ${label} is unknown.` };
  if (!lensHasFeature)
    return { status: 'not_applicable', explanation: `The lens does not implement ${label}.` };
  if (cameraSupportsFeature === undefined)
    return { status: 'unknown', explanation: `Camera support for ${label} is not confirmed.` };
  if (!cameraSupportsFeature)
    return { status: 'incompatible', explanation: `The camera does not support ${label}.` };
  if (sameMount) return { status: 'compatible', explanation: `Native mount supports ${label}.` };
  if (adapterPassesFeature === true)
    return { status: 'compatible', explanation: `The verified adapter documents ${label}.` };
  if (adapterPassesFeature === false)
    return { status: 'incompatible', explanation: `The adapter does not pass ${label}.` };
  return { status: 'unknown', explanation: `Adapter support for ${label} is not confirmed.` };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
