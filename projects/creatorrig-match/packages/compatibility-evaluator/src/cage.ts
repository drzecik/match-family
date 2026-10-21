import { aggregateEvaluationStatus } from './aggregate.js';
import type { BaseEvaluation, EvaluationDimension } from './types.js';

/**
 * Evidence-backed mechanical facts for a cage. Identifiers are controlled,
 * exact values; the evaluator deliberately performs no normalization.
 */
export interface CageMechanicalProfile {
  readonly id: string;
  /** Exact product/body variant IDs confirmed by the cage manufacturer. */
  readonly compatibleDeviceIds: readonly string[];
  /** Exact product/body variant IDs with an explicitly documented physical conflict. */
  readonly incompatibleDeviceIds?: readonly string[];
  readonly supportedCameraAttachments: readonly string[];
  readonly accessoryMounts: readonly string[];
  readonly accessiblePorts: readonly string[];
  readonly accessibleDoors: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface CageRigRequirements {
  /** Exact product/body variant ID, not a family or shape identifier. */
  readonly deviceId: string;
  readonly cameraAttachment: string;
  readonly requiredAccessoryMounts: readonly string[];
  readonly requiredAccessiblePorts: readonly string[];
  readonly requiredAccessibleDoors: readonly string[];
  readonly conditions: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface CageCompatibilityEvaluation extends BaseEvaluation {
  readonly conditions: readonly string[];
  readonly missingAccessoryMounts: readonly string[];
  readonly blockedRequiredPorts: readonly string[];
  readonly blockedRequiredDoors: readonly string[];
  readonly dimensions: {
    readonly enclosureFit: EvaluationDimension;
    readonly cameraAttachment: EvaluationDimension;
    readonly accessoryMounting: EvaluationDimension;
    readonly accessClearance: EvaluationDimension;
  };
}

export function evaluateCageCompatibility(
  cage: CageMechanicalProfile,
  rig: CageRigRequirements,
): CageCompatibilityEvaluation {
  const evidenceAvailable = cage.evidenceIds.length > 0 && rig.evidenceIds.length > 0;
  const missingAccessoryMounts = exactMissing(rig.requiredAccessoryMounts, cage.accessoryMounts);
  const blockedRequiredPorts = exactMissing(rig.requiredAccessiblePorts, cage.accessiblePorts);
  const blockedRequiredDoors = exactMissing(rig.requiredAccessibleDoors, cage.accessibleDoors);

  const dimensions = {
    enclosureFit: evaluateEnclosureFit(cage, rig, evidenceAvailable),
    cameraAttachment: evaluateCameraAttachment(cage, rig, evidenceAvailable),
    accessoryMounting: evaluateAccessoryMounting(
      rig.requiredAccessoryMounts,
      missingAccessoryMounts,
      evidenceAvailable,
    ),
    accessClearance: evaluateAccessClearance(
      rig.requiredAccessiblePorts,
      rig.requiredAccessibleDoors,
      blockedRequiredPorts,
      blockedRequiredDoors,
      evidenceAvailable,
    ),
  };
  const results = Object.values(dimensions);
  const limitations = unique(
    results
      .filter((result) => result.status === 'compatible_with_limitations')
      .map((result) => result.explanation),
  );
  const warnings = unique([
    ...results
      .filter((result) => result.status === 'unknown' || result.status === 'incompatible')
      .map((result) => result.explanation),
    ...(evidenceAvailable
      ? []
      : ['Cage and camera-body requirements are not supported by scoped evidence.']),
  ]);

  const status = aggregateEvaluationStatus({
    evidenced: evidenceAvailable,
    dimensions: results,
  });

  return {
    status,
    conditions: rig.conditions,
    missingAccessoryMounts,
    blockedRequiredPorts,
    blockedRequiredDoors,
    limitations,
    warnings,
    evidenceIds: evidenceAvailable ? unique([...cage.evidenceIds, ...rig.evidenceIds]) : [],
    dimensions,
  };
}

function evaluateEnclosureFit(
  cage: CageMechanicalProfile,
  rig: CageRigRequirements,
  evidenceAvailable: boolean,
): EvaluationDimension {
  if (!evidenceAvailable) {
    return {
      status: 'unknown',
      explanation: 'Exact cage-to-camera-body fit lacks scoped evidence.',
    };
  }
  if (!rig.deviceId || cage.compatibleDeviceIds.length === 0) {
    if (rig.deviceId && cage.incompatibleDeviceIds?.includes(rig.deviceId)) {
      return {
        status: 'incompatible',
        explanation: `Cage has an explicitly documented physical conflict with exact camera body variant ${rig.deviceId}.`,
      };
    }
    return {
      status: 'unknown',
      explanation: 'Exact camera body variant or the verified compatibility list is missing.',
    };
  }
  if (cage.incompatibleDeviceIds?.includes(rig.deviceId)) {
    return {
      status: 'incompatible',
      explanation: `Cage has an explicitly documented physical conflict with exact camera body variant ${rig.deviceId}.`,
    };
  }
  if (!cage.compatibleDeviceIds.includes(rig.deviceId)) {
    return {
      status: 'unknown',
      explanation: `Cage fit is not confirmed for exact camera body variant ${rig.deviceId}.`,
    };
  }
  return {
    status: 'compatible',
    explanation: `Cage explicitly supports exact camera body variant ${rig.deviceId}.`,
  };
}

function evaluateCameraAttachment(
  cage: CageMechanicalProfile,
  rig: CageRigRequirements,
  evidenceAvailable: boolean,
): EvaluationDimension {
  if (!evidenceAvailable) {
    return {
      status: 'unknown',
      explanation: 'Camera attachment compatibility lacks scoped evidence.',
    };
  }
  if (!rig.cameraAttachment || cage.supportedCameraAttachments.length === 0) {
    return {
      status: 'unknown',
      explanation: 'Camera attachment standard is not fully documented.',
    };
  }
  if (!cage.supportedCameraAttachments.includes(rig.cameraAttachment)) {
    return {
      status: 'unknown',
      explanation: `Cage does not explicitly confirm camera attachment ${rig.cameraAttachment}; connector shape is not treated as proof.`,
    };
  }
  return {
    status: 'compatible',
    explanation: `Cage explicitly supports camera attachment ${rig.cameraAttachment}.`,
  };
}

function evaluateAccessoryMounting(
  requirements: readonly string[],
  missing: readonly string[],
  evidenceAvailable: boolean,
): EvaluationDimension {
  if (requirements.length === 0) {
    return {
      status: 'not_applicable',
      explanation: 'No accessory mounting capability is required by this rig.',
    };
  }
  if (!evidenceAvailable) {
    return {
      status: 'unknown',
      explanation: 'Accessory mounting capabilities lack scoped evidence.',
    };
  }
  if (missing.length > 0) {
    return {
      status: 'incompatible',
      explanation: `Cage lacks required documented accessory mounts: ${missing.join(', ')}.`,
    };
  }
  return {
    status: 'compatible',
    explanation: `Cage provides all required accessory mounts: ${unique(requirements).join(', ')}.`,
  };
}

function evaluateAccessClearance(
  requiredPorts: readonly string[],
  requiredDoors: readonly string[],
  blockedPorts: readonly string[],
  blockedDoors: readonly string[],
  evidenceAvailable: boolean,
): EvaluationDimension {
  if (requiredPorts.length === 0 && requiredDoors.length === 0) {
    return {
      status: 'not_applicable',
      explanation: 'No port or door access is required by this rig.',
    };
  }
  if (!evidenceAvailable) {
    return {
      status: 'unknown',
      explanation: 'Required port and door clearance lacks scoped evidence.',
    };
  }
  if (blockedPorts.length > 0 || blockedDoors.length > 0) {
    const details = [
      ...(blockedPorts.length > 0 ? [`ports: ${blockedPorts.join(', ')}`] : []),
      ...(blockedDoors.length > 0 ? [`doors: ${blockedDoors.join(', ')}`] : []),
    ];
    return {
      status: 'incompatible',
      explanation: `Cage does not preserve required access for ${details.join('; ')}.`,
    };
  }
  return {
    status: 'compatible',
    explanation: 'Cage preserves all required port and door access.',
  };
}

function exactMissing(required: readonly string[], available: readonly string[]): string[] {
  return unique(required).filter((requirement) => !available.includes(requirement));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
