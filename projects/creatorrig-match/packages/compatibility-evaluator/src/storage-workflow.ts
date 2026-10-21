import { aggregateEvaluationStatus } from './aggregate.js';
import type { BaseEvaluation, EvaluationDimension } from './types.js';
import type { VerificationStatus } from './media-path.js';

export type StorageTransferDirection = 'read_from_media' | 'write_to_media';

export interface ComputerWorkflowProfile {
  readonly id: string;
  readonly outputConnector: string;
  readonly direction: 'host' | 'device' | 'bidirectional' | 'unknown';
  readonly supportedBusProfiles: readonly string[];
  readonly maxSustainedTransferMBps: number;
  readonly maxBusPowerWatts: number;
  readonly supportedOsVersions: readonly string[];
  readonly supportedSoftwareIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface WorkflowDockProfile {
  readonly id: string;
  readonly upstreamConnector: string;
  readonly downstreamConnector: string;
  readonly directional: boolean;
  readonly supportedBusProfiles: readonly string[];
  readonly maxSustainedTransferMBps: number;
  readonly powerMode: 'bus_powered' | 'external_required' | 'self_powered' | 'unknown';
  readonly requiredPowerWatts: number;
  readonly downstreamPowerWatts: number;
  readonly compatiblePowerSourceIds: readonly string[];
  readonly supportedOsVersions: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface CardReaderWorkflowProfile {
  readonly id: string;
  readonly inputConnector: string;
  readonly supportedBusProfiles: readonly string[];
  readonly supportedMediaFormats: readonly string[];
  readonly supportedMediaProtocols: readonly string[];
  readonly maxSustainedTransferMBps: number;
  readonly requiredPowerWatts: number;
  readonly supportedOsVersions: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface StorageMediaWorkflowProfile {
  readonly id: string;
  readonly mediaFormat: string;
  readonly mediaProtocol: string;
  readonly sustainedReadMBps: number;
  readonly sustainedWriteMBps: number;
  readonly evidenceIds: readonly string[];
}

export interface WorkflowPowerSourceProfile {
  readonly id: string;
  readonly compatibleDeviceIds: readonly string[];
  readonly maxPowerWatts: number;
  readonly evidenceIds: readonly string[];
}

export interface StorageWorkflowClaim {
  readonly id: string;
  readonly computerId: string;
  readonly dockId?: string;
  readonly readerId: string;
  readonly mediaId: string;
  readonly powerSourceId?: string;
  readonly busProfile: string;
  readonly mediaProtocol: string;
  readonly transferDirection: StorageTransferDirection;
  readonly requiredSustainedTransferMBps: number;
  readonly osVersion: string;
  readonly softwareId?: string;
  readonly verificationStatus: VerificationStatus;
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface StorageWorkflowEvaluationInput {
  readonly computer: ComputerWorkflowProfile;
  readonly dock?: WorkflowDockProfile;
  readonly reader: CardReaderWorkflowProfile;
  readonly media: StorageMediaWorkflowProfile;
  readonly powerSource?: WorkflowPowerSourceProfile;
  readonly busProfile: string;
  readonly transferDirection: StorageTransferDirection;
  readonly requiredSustainedTransferMBps: number;
  readonly osVersion: string;
  readonly softwareId?: string;
  readonly claim: StorageWorkflowClaim;
}

export interface StorageWorkflowEvaluation extends BaseEvaluation {
  readonly conditions: readonly string[];
  readonly requiredItemIds: readonly string[];
  readonly effectiveSustainedTransferMBps?: number;
  readonly dimensions: {
    readonly connectorDirection: EvaluationDimension;
    readonly busProtocol: EvaluationDimension;
    readonly mediaProtocol: EvaluationDimension;
    readonly sustainedTransfer: EvaluationDimension;
    readonly power: EvaluationDimension;
    readonly osSoftware: EvaluationDimension;
    readonly evidence: EvaluationDimension;
  };
}

export function evaluateStorageWorkflow(
  input: StorageWorkflowEvaluationInput,
): StorageWorkflowEvaluation {
  const evidence = evaluateEvidence(input);
  const evidenced = evidence.status === 'compatible';
  const effectiveSustainedTransferMBps = calculateEffectiveTransfer(input);
  const dimensions = {
    connectorDirection: evaluateConnectors(input, evidenced),
    busProtocol: evaluateBus(input, evidenced),
    mediaProtocol: evaluateMedia(input, evidenced),
    sustainedTransfer: evaluateTransfer(input, effectiveSustainedTransferMBps, evidenced),
    power: evaluatePower(input, evidenced),
    osSoftware: evaluateOsSoftware(input, evidenced),
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
          ...(input.dock === undefined ? [] : [input.dock.id]),
          input.reader.id,
          input.media.id,
          ...(input.dock?.powerMode === 'external_required' && input.powerSource !== undefined
            ? [input.powerSource.id]
            : []),
        ]
      : [],
    ...(effectiveSustainedTransferMBps === undefined ? {} : { effectiveSustainedTransferMBps }),
    dimensions,
    limitations,
    warnings,
    evidenceIds: evidenced
      ? unique([
          ...input.computer.evidenceIds,
          ...(input.dock?.evidenceIds ?? []),
          ...input.reader.evidenceIds,
          ...input.media.evidenceIds,
          ...(input.powerSource?.evidenceIds ?? []),
          ...input.claim.evidenceIds,
        ])
      : [],
  };
}

function evaluateEvidence(input: StorageWorkflowEvaluationInput): EvaluationDimension {
  const subjects: Array<readonly [string, readonly string[], string]> = [
    [input.computer.id, input.computer.evidenceIds, 'computer'],
    [input.reader.id, input.reader.evidenceIds, 'card reader'],
    [input.media.id, input.media.evidenceIds, 'storage media'],
    [input.claim.id, input.claim.evidenceIds, 'exact workflow claim'],
  ];
  if (input.dock !== undefined) subjects.push([input.dock.id, input.dock.evidenceIds, 'dock']);
  if (input.powerSource !== undefined) {
    subjects.push([input.powerSource.id, input.powerSource.evidenceIds, 'power source']);
  }
  const missing = subjects
    .filter(([id, ids]) => !nonEmpty(id) || !ids.some(nonEmpty))
    .map(([, , label]) => label);
  if (missing.length > 0) return unknown(`Scoped evidence is missing for: ${missing.join(', ')}.`);
  if (input.claim.verificationStatus !== 'verified') {
    return unknown(`Workflow claim status ${input.claim.verificationStatus} is not verified.`);
  }
  if (!claimMatches(input))
    return unknown('Workflow claim does not exactly match the selected path.');
  return compatible('Every workflow component and the exact claim carry verified evidence.');
}

function evaluateConnectors(
  input: StorageWorkflowEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Connector and direction facts lack verified evidence.');
  const { computer, dock, reader } = input;
  if (computer.direction === 'unknown') return unknown('Computer port direction is unknown.');
  if (computer.direction !== 'host' && computer.direction !== 'bidirectional') {
    return incompatible('Selected computer interface is not a documented host output.');
  }
  if (dock === undefined) {
    if (!nonEmpty(computer.outputConnector) || !nonEmpty(reader.inputConnector)) {
      return unknown('Direct computer-to-reader connector identity is missing.');
    }
    return computer.outputConnector === reader.inputConnector
      ? compatible('Computer and reader connectors match exactly.')
      : incompatible('Computer and reader connector identities do not match.');
  }
  if (
    !nonEmpty(dock.upstreamConnector) ||
    !nonEmpty(dock.downstreamConnector) ||
    typeof dock.directional !== 'boolean'
  ) {
    return unknown('Dock connector direction is not fully documented.');
  }
  if (!dock.directional) return unknown('Dock upstream-to-downstream direction is not explicit.');
  if (
    computer.outputConnector !== dock.upstreamConnector ||
    dock.downstreamConnector !== reader.inputConnector
  ) {
    return incompatible(
      'Exact computer, dock, and reader connectors do not align upstream-to-downstream.',
    );
  }
  return compatible('Exact connector chain aligns computer -> dock -> reader.');
}

function evaluateBus(
  input: StorageWorkflowEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Bus-profile facts lack verified evidence.');
  if (!nonEmpty(input.busProfile)) return unknown('Exact bus profile is missing.');
  const supportLists = [
    input.computer.supportedBusProfiles,
    ...(input.dock === undefined ? [] : [input.dock.supportedBusProfiles]),
    input.reader.supportedBusProfiles,
  ];
  if (supportLists.some((profiles) => profiles.length === 0)) {
    return unknown('A workflow component has no documented bus profiles.');
  }
  if (supportLists.some((profiles) => !profiles.includes(input.busProfile))) {
    return incompatible('Not every exact path component supports the selected bus profile.');
  }
  return compatible(`Every path component explicitly supports ${input.busProfile}.`);
}

function evaluateMedia(
  input: StorageWorkflowEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Media format and protocol facts lack verified evidence.');
  const { reader, media, claim } = input;
  if (!nonEmpty(media.mediaFormat) || !nonEmpty(media.mediaProtocol)) {
    return unknown('Exact media format or protocol is missing.');
  }
  if (
    !reader.supportedMediaFormats.includes(media.mediaFormat) ||
    !reader.supportedMediaProtocols.includes(media.mediaProtocol) ||
    claim.mediaProtocol !== media.mediaProtocol
  ) {
    return incompatible('Reader and media do not share the exact format and protocol.');
  }
  return compatible(`Reader explicitly supports ${media.mediaFormat} with ${media.mediaProtocol}.`);
}

function evaluateTransfer(
  input: StorageWorkflowEvaluationInput,
  effective: number | undefined,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Sustained-transfer facts lack verified evidence.');
  if (!validPositive(input.requiredSustainedTransferMBps) || effective === undefined) {
    return unknown('A sustained-transfer requirement or component limit is missing.');
  }
  if (effective < input.requiredSustainedTransferMBps) {
    return incompatible(
      `Effective sustained transfer ${effective} MB/s is below required ${input.requiredSustainedTransferMBps} MB/s.`,
    );
  }
  return compatible(`Effective sustained transfer is ${effective} MB/s.`);
}

function evaluatePower(
  input: StorageWorkflowEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Workflow power facts lack verified evidence.');
  const { computer, dock, reader, powerSource } = input;
  if (!validNonNegative(reader.requiredPowerWatts))
    return unknown('Reader power requirement is missing.');
  if (dock === undefined) {
    if (!validNonNegative(computer.maxBusPowerWatts))
      return unknown('Computer bus-power limit is missing.');
    return computer.maxBusPowerWatts >= reader.requiredPowerWatts
      ? compatible('Computer bus power meets the exact reader requirement.')
      : incompatible('Computer bus power is insufficient for the exact reader requirement.');
  }
  if (dock.powerMode === 'unknown') return unknown('Dock power mode is unknown.');
  if (dock.powerMode === 'external_required') {
    if (powerSource === undefined)
      return incompatible('Dock requires an exact external power source.');
    if (
      !dock.compatiblePowerSourceIds.includes(powerSource.id) ||
      !powerSource.compatibleDeviceIds.includes(dock.id) ||
      !validPositive(powerSource.maxPowerWatts) ||
      powerSource.maxPowerWatts < dock.requiredPowerWatts + reader.requiredPowerWatts
    ) {
      return incompatible(
        'External source is not exactly compatible or lacks documented dock-plus-reader power.',
      );
    }
  } else if (dock.powerMode === 'bus_powered') {
    if (
      !validNonNegative(computer.maxBusPowerWatts) ||
      !validNonNegative(dock.requiredPowerWatts) ||
      computer.maxBusPowerWatts < dock.requiredPowerWatts + reader.requiredPowerWatts
    ) {
      return incompatible('Computer bus power cannot supply the exact dock and reader load.');
    }
  }
  if (!validNonNegative(dock.downstreamPowerWatts)) {
    return unknown('Dock downstream power capacity is missing.');
  }
  if (dock.downstreamPowerWatts < reader.requiredPowerWatts) {
    return incompatible('Dock downstream power is insufficient for the exact reader.');
  }
  return compatible('Exact dock and reader power preconditions are satisfied.');
}

function evaluateOsSoftware(
  input: StorageWorkflowEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('OS/software facts lack verified evidence.');
  if (!nonEmpty(input.osVersion)) return unknown('Exact operating-system version is missing.');
  const osLists = [
    input.computer.supportedOsVersions,
    ...(input.dock === undefined ? [] : [input.dock.supportedOsVersions]),
    input.reader.supportedOsVersions,
  ];
  if (osLists.some((versions) => versions.length === 0)) {
    return unknown('A component OS compatibility list is empty.');
  }
  if (osLists.some((versions) => !versions.includes(input.osVersion))) {
    return incompatible('Exact OS version is not supported by every workflow component.');
  }
  if (
    input.softwareId !== undefined &&
    !input.computer.supportedSoftwareIds.includes(input.softwareId)
  ) {
    return incompatible('Computer does not document support for the exact workflow software.');
  }
  return compatible(
    `Exact OS ${input.osVersion}${input.softwareId === undefined ? '' : ` and software ${input.softwareId}`} are supported.`,
  );
}

function calculateEffectiveTransfer(input: StorageWorkflowEvaluationInput): number | undefined {
  const mediaRate =
    input.transferDirection === 'read_from_media'
      ? input.media.sustainedReadMBps
      : input.media.sustainedWriteMBps;
  const limits = [
    input.computer.maxSustainedTransferMBps,
    ...(input.dock === undefined ? [] : [input.dock.maxSustainedTransferMBps]),
    input.reader.maxSustainedTransferMBps,
    mediaRate,
  ];
  return limits.every(validPositive) ? Math.min(...limits) : undefined;
}

function claimMatches(input: StorageWorkflowEvaluationInput): boolean {
  const { claim } = input;
  return (
    claim.computerId === input.computer.id &&
    claim.dockId === input.dock?.id &&
    claim.readerId === input.reader.id &&
    claim.mediaId === input.media.id &&
    claim.powerSourceId === input.powerSource?.id &&
    claim.busProfile === input.busProfile &&
    claim.mediaProtocol === input.media.mediaProtocol &&
    claim.transferDirection === input.transferDirection &&
    claim.requiredSustainedTransferMBps === input.requiredSustainedTransferMBps &&
    claim.osVersion === input.osVersion &&
    claim.softwareId === input.softwareId
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
