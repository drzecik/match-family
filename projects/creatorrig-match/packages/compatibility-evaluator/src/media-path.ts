import { aggregateEvaluationStatus } from './aggregate.js';
import type { BaseEvaluation, EvaluationDimension } from './types.js';

export type MediaCapability = 'monitor' | 'record' | 'capture' | 'stream';
export type VerificationStatus = 'verified' | 'candidate' | 'unknown' | 'deprecated';

export interface VideoMode {
  readonly width: number;
  readonly height: number;
  readonly frameRate: number;
}

export interface CameraVideoOutputProfile {
  readonly id: string;
  readonly outputConnector: string;
  readonly direction: 'output' | 'input' | 'bidirectional' | 'unknown';
  readonly protocolProfile: string;
  readonly supportedModes: readonly VideoMode[];
  readonly evidenceIds: readonly string[];
}

export interface VideoCableProfile {
  readonly id: string;
  readonly inputConnector: string;
  readonly outputConnector: string;
  readonly directional: boolean;
  readonly supportedProtocolProfiles: readonly string[];
  readonly supportedModes: readonly VideoMode[];
  readonly evidenceIds: readonly string[];
}

export interface MediaDestinationProfile {
  readonly id: string;
  readonly inputConnector: string;
  readonly supportedProtocolProfiles: readonly string[];
  readonly supportedModes: readonly VideoMode[];
  readonly capabilities: readonly MediaCapability[];
  readonly powerMode: 'self_powered' | 'usb_bus_powered' | 'external_required' | 'unknown';
  readonly compatiblePowerSourceIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface MediaPowerSourceProfile {
  readonly id: string;
  readonly compatibleDestinationIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface MediaPathClaim {
  readonly id: string;
  readonly deviceId: string;
  readonly cableId: string;
  readonly destinationId: string;
  readonly powerSourceId?: string;
  readonly protocolProfile: string;
  readonly mode: VideoMode;
  readonly requestedCapability: MediaCapability;
  readonly verificationStatus: VerificationStatus;
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface MediaPathEvaluationInput {
  readonly camera: CameraVideoOutputProfile;
  readonly cable: VideoCableProfile;
  readonly destination: MediaDestinationProfile;
  readonly powerSource?: MediaPowerSourceProfile;
  readonly requestedMode: VideoMode;
  readonly requestedCapability: MediaCapability;
  readonly claim: MediaPathClaim;
}

export interface MediaPathEvaluation extends BaseEvaluation {
  readonly conditions: readonly string[];
  readonly requiredItemIds: readonly string[];
  readonly dimensions: {
    readonly connectorDirection: EvaluationDimension;
    readonly protocolVersion: EvaluationDimension;
    readonly videoMode: EvaluationDimension;
    readonly capability: EvaluationDimension;
    readonly powerPrecondition: EvaluationDimension;
    readonly evidence: EvaluationDimension;
  };
}

/** Evaluates one exact camera -> cable -> media destination path. */
export function evaluateMediaPath(input: MediaPathEvaluationInput): MediaPathEvaluation {
  const evidence = evaluateEvidence(input);
  const evidenced = evidence.status === 'compatible';
  const dimensions = {
    connectorDirection: evaluateConnectorDirection(input, evidenced),
    protocolVersion: evaluateProtocol(input, evidenced),
    videoMode: evaluateMode(input, evidenced),
    capability: evaluateCapability(input, evidenced),
    powerPrecondition: evaluatePower(input, evidenced),
    evidence,
  };
  const results = Object.values(dimensions);
  const limitations = unique([
    ...input.claim.limitations,
    ...results
      .filter(({ status }) => status === 'compatible_with_limitations')
      .map(({ explanation }) => explanation),
  ]);
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
      ? unique([
          input.cable.id,
          ...(input.destination.powerMode === 'external_required' && input.powerSource !== undefined
            ? [input.powerSource.id]
            : []),
        ])
      : [],
    dimensions,
    limitations,
    warnings,
    evidenceIds: evidenced
      ? unique([
          ...input.camera.evidenceIds,
          ...input.cable.evidenceIds,
          ...input.destination.evidenceIds,
          ...(input.powerSource?.evidenceIds ?? []),
          ...input.claim.evidenceIds,
        ])
      : [],
  };
}

function evaluateEvidence(input: MediaPathEvaluationInput): EvaluationDimension {
  const subjects: Array<readonly [string, readonly string[], string]> = [
    [input.camera.id, input.camera.evidenceIds, 'camera'],
    [input.cable.id, input.cable.evidenceIds, 'cable'],
    [input.destination.id, input.destination.evidenceIds, 'destination'],
    [input.claim.id, input.claim.evidenceIds, 'exact path claim'],
  ];
  if (input.powerSource !== undefined) {
    subjects.push([input.powerSource.id, input.powerSource.evidenceIds, 'power source']);
  }
  const missing = subjects
    .filter(([id, evidenceIds]) => !nonEmpty(id) || !evidenceIds.some(nonEmpty))
    .map(([, , label]) => label);
  if (missing.length > 0) return unknown(`Scoped evidence is missing for: ${missing.join(', ')}.`);
  if (input.claim.verificationStatus !== 'verified') {
    return unknown(`Path claim status ${input.claim.verificationStatus} is not verified.`);
  }
  if (!claimMatches(input)) {
    return unknown(
      'The verified claim does not exactly match the selected path, mode, or capability.',
    );
  }
  return compatible('Every path element and the exact claim carry scoped verified evidence.');
}

function evaluateConnectorDirection(
  input: MediaPathEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Connector and direction facts lack verified evidence.');
  const { camera, cable, destination } = input;
  if (
    !nonEmpty(camera.outputConnector) ||
    !nonEmpty(cable.inputConnector) ||
    !nonEmpty(cable.outputConnector) ||
    !nonEmpty(destination.inputConnector) ||
    typeof cable.directional !== 'boolean' ||
    camera.direction === 'unknown'
  ) {
    return unknown('A connector or direction fact is missing.');
  }
  if (camera.direction !== 'output' && camera.direction !== 'bidirectional') {
    return incompatible('The selected camera interface is not a documented video output.');
  }
  const forward =
    camera.outputConnector === cable.inputConnector &&
    cable.outputConnector === destination.inputConnector;
  const reverse =
    camera.outputConnector === cable.outputConnector &&
    cable.inputConnector === destination.inputConnector;
  if (forward || (!cable.directional && reverse)) {
    return compatible('Exact connectors align in a documented cable orientation.');
  }
  return incompatible('Exact connector identities or cable direction do not align.');
}

function evaluateProtocol(
  input: MediaPathEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Protocol/version facts lack verified evidence.');
  const protocol = input.claim.protocolProfile;
  if (!nonEmpty(protocol) || !nonEmpty(input.camera.protocolProfile)) {
    return unknown('An exact HDMI/SDI protocol profile is missing.');
  }
  if (
    input.camera.protocolProfile !== protocol ||
    !input.cable.supportedProtocolProfiles.includes(protocol) ||
    !input.destination.supportedProtocolProfiles.includes(protocol)
  ) {
    return incompatible(
      'Camera, cable, and destination do not share the exact protocol/version profile.',
    );
  }
  return compatible(`Every path element explicitly supports ${protocol}.`);
}

function evaluateMode(input: MediaPathEvaluationInput, evidenced: boolean): EvaluationDimension {
  if (!evidenced) return unknown('Resolution and frame-rate facts lack verified evidence.');
  if (!validMode(input.requestedMode))
    return unknown('Requested resolution or frame rate is missing.');
  const supports = [
    input.camera.supportedModes,
    input.cable.supportedModes,
    input.destination.supportedModes,
  ];
  if (supports.some((modes) => modes.length === 0))
    return unknown('A supported video-mode list is empty.');
  if (supports.some((modes) => !modes.some((mode) => sameMode(mode, input.requestedMode)))) {
    return incompatible(
      'At least one exact path element does not support the requested resolution and frame rate.',
    );
  }
  return compatible(
    `Every path element supports ${input.requestedMode.width}×${input.requestedMode.height} at ${input.requestedMode.frameRate} fps.`,
  );
}

function evaluateCapability(
  input: MediaPathEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Recording/capture capability lacks verified evidence.');
  if (!input.destination.capabilities.includes(input.requestedCapability)) {
    return incompatible(`Destination does not document ${input.requestedCapability} capability.`);
  }
  return compatible(`Destination explicitly supports ${input.requestedCapability}.`);
}

function evaluatePower(input: MediaPathEvaluationInput, evidenced: boolean): EvaluationDimension {
  if (!evidenced) return unknown('Destination power precondition lacks verified evidence.');
  const { destination, powerSource } = input;
  if (destination.powerMode === 'unknown') return unknown('Destination power mode is unknown.');
  if (destination.powerMode === 'self_powered') {
    return { status: 'not_applicable', explanation: 'Destination is explicitly self-powered.' };
  }
  if (destination.powerMode === 'usb_bus_powered') {
    if (input.claim.conditions.length === 0) {
      return unknown('USB bus power requires an exact documented host-power condition.');
    }
    return {
      status: 'compatible_with_limitations',
      explanation:
        'Destination requires USB bus power from a host satisfying the exact claim conditions.',
    };
  }
  if (powerSource === undefined)
    return incompatible('Destination requires an exact external power source.');
  if (
    !destination.compatiblePowerSourceIds.includes(powerSource.id) ||
    !powerSource.compatibleDestinationIds.includes(destination.id)
  ) {
    return incompatible(
      'Selected power source is not mutually documented for this exact destination.',
    );
  }
  return compatible('Exact destination power precondition is satisfied.');
}

function claimMatches(input: MediaPathEvaluationInput): boolean {
  const { claim } = input;
  return (
    claim.deviceId === input.camera.id &&
    claim.cableId === input.cable.id &&
    claim.destinationId === input.destination.id &&
    claim.powerSourceId === input.powerSource?.id &&
    claim.protocolProfile === input.camera.protocolProfile &&
    claim.requestedCapability === input.requestedCapability &&
    sameMode(claim.mode, input.requestedMode)
  );
}

function validMode(mode: VideoMode): boolean {
  return [mode.width, mode.height, mode.frameRate].every(
    (value) => Number.isFinite(value) && value > 0,
  );
}

function sameMode(left: VideoMode, right: VideoMode): boolean {
  return (
    left.width === right.width && left.height === right.height && left.frameRate === right.frameRate
  );
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
