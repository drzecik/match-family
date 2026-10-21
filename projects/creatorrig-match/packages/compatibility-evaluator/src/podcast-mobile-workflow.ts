import { aggregateEvaluationStatus } from './aggregate.js';
import type { BaseEvaluation, EvaluationDimension } from './types.js';
import type { VerificationStatus } from './media-path.js';

export interface PodcastMobileHostProfile {
  readonly id: string;
  readonly outputConnector: string;
  readonly direction: 'host' | 'device' | 'bidirectional' | 'unknown';
  readonly supportedBusProfiles: readonly string[];
  readonly supportedAudioProtocols: readonly string[];
  readonly maxSustainedAudioMBps: number;
  readonly maxInputChannels: number;
  readonly maxBusPowerWatts: number;
  readonly supportedOsVersions: readonly string[];
  readonly supportedAppIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface PodcastAudioInterfaceProfile {
  readonly id: string;
  readonly upstreamConnector: string;
  readonly direction: 'device' | 'host' | 'bidirectional' | 'unknown';
  readonly supportedBusProfiles: readonly string[];
  readonly supportedAudioProtocols: readonly string[];
  readonly sourceInputConnectors: readonly string[];
  readonly sourceSignalProtocols: readonly string[];
  readonly monitoringOutputConnectors: readonly string[];
  readonly maxSampleRateHz: number;
  readonly maxBitDepth: number;
  readonly maxInputChannels: number;
  readonly maxSustainedAudioMBps: number;
  readonly powerMode: 'bus_powered' | 'external_required' | 'self_powered' | 'unknown';
  readonly requiredPowerWatts: number;
  readonly phantomPowerAvailable: boolean;
  readonly phantomPowerChannels: number;
  readonly compatiblePowerSourceIds: readonly string[];
  readonly supportedOsVersions: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface PodcastAudioSourceProfile {
  readonly id: string;
  readonly outputConnector: string;
  readonly signalProtocol: string;
  readonly channelCount: number;
  readonly requiresPhantomPower: boolean;
  readonly phantomPowerWatts: number;
  readonly selfPowered: boolean;
  readonly evidenceIds: readonly string[];
}

export interface PodcastMonitoringProfile {
  readonly id: string;
  readonly inputConnector: string;
  readonly evidenceIds: readonly string[];
}

export interface PodcastPowerSourceProfile {
  readonly id: string;
  readonly compatibleInterfaceIds: readonly string[];
  readonly maxPowerWatts: number;
  readonly evidenceIds: readonly string[];
}

export interface PodcastMobileWorkflowClaim {
  readonly id: string;
  readonly hostId: string;
  readonly interfaceId: string;
  readonly sourceIds: readonly string[];
  readonly monitoringId?: string;
  readonly powerSourceId?: string;
  readonly busProfile: string;
  readonly audioProtocol: string;
  readonly sampleRateHz: number;
  readonly bitDepth: number;
  readonly channelCount: number;
  readonly osVersion: string;
  readonly appId: string;
  readonly verificationStatus: VerificationStatus;
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface PodcastMobileWorkflowEvaluationInput {
  readonly host: PodcastMobileHostProfile;
  readonly audioInterface: PodcastAudioInterfaceProfile;
  readonly sources: readonly PodcastAudioSourceProfile[];
  readonly monitoring?: PodcastMonitoringProfile;
  readonly powerSource?: PodcastPowerSourceProfile;
  readonly busProfile: string;
  readonly audioProtocol: string;
  readonly sampleRateHz: number;
  readonly bitDepth: number;
  readonly channelCount: number;
  readonly osVersion: string;
  readonly appId: string;
  readonly claim: PodcastMobileWorkflowClaim;
}

export interface PodcastMobileWorkflowEvaluation extends BaseEvaluation {
  readonly conditions: readonly string[];
  readonly requiredItemIds: readonly string[];
  readonly requiredSustainedAudioMBps?: number;
  readonly dimensions: {
    readonly connectorDirection: EvaluationDimension;
    readonly busProtocol: EvaluationDimension;
    readonly audioFormatTransfer: EvaluationDimension;
    readonly channelsSignal: EvaluationDimension;
    readonly power: EvaluationDimension;
    readonly osSoftware: EvaluationDimension;
    readonly evidence: EvaluationDimension;
  };
}

export function evaluatePodcastMobileWorkflow(
  input: PodcastMobileWorkflowEvaluationInput,
): PodcastMobileWorkflowEvaluation {
  const evidence = evaluateEvidence(input);
  const evidenced = evidence.status === 'compatible';
  const requiredSustainedAudioMBps = calculateAudioRate(input);
  const dimensions = {
    connectorDirection: evaluateConnectors(input, evidenced),
    busProtocol: evaluateBusProtocol(input, evidenced),
    audioFormatTransfer: evaluateAudioTransfer(input, requiredSustainedAudioMBps, evidenced),
    channelsSignal: evaluateChannelsSignal(input, evidenced),
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
      ? unique([
          input.audioInterface.id,
          ...input.sources.map(({ id }) => id),
          ...(input.monitoring === undefined ? [] : [input.monitoring.id]),
          ...(input.audioInterface.powerMode === 'external_required' &&
          input.powerSource !== undefined
            ? [input.powerSource.id]
            : []),
        ])
      : [],
    ...(requiredSustainedAudioMBps === undefined ? {} : { requiredSustainedAudioMBps }),
    dimensions,
    limitations,
    warnings,
    evidenceIds: evidenced
      ? unique([
          ...input.host.evidenceIds,
          ...input.audioInterface.evidenceIds,
          ...input.sources.flatMap(({ evidenceIds }) => evidenceIds),
          ...(input.monitoring?.evidenceIds ?? []),
          ...(input.powerSource?.evidenceIds ?? []),
          ...input.claim.evidenceIds,
        ])
      : [],
  };
}

function evaluateEvidence(input: PodcastMobileWorkflowEvaluationInput): EvaluationDimension {
  const subjects: Array<readonly [string, readonly string[], string]> = [
    [input.host.id, input.host.evidenceIds, 'host'],
    [input.audioInterface.id, input.audioInterface.evidenceIds, 'audio interface'],
    [input.claim.id, input.claim.evidenceIds, 'exact podcast/mobile claim'],
    ...input.sources.map(
      (source) => [source.id, source.evidenceIds, `audio source ${source.id}`] as const,
    ),
  ];
  if (input.monitoring !== undefined) {
    subjects.push([input.monitoring.id, input.monitoring.evidenceIds, 'monitoring device']);
  }
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
    return unknown('Workflow claim does not exactly match selected products and mode.');
  return compatible('Every workflow component and the exact claim carry verified evidence.');
}

function evaluateConnectors(
  input: PodcastMobileWorkflowEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Audio connector and direction facts lack verified evidence.');
  const { host, audioInterface, sources, monitoring } = input;
  if (host.direction === 'unknown' || audioInterface.direction === 'unknown') {
    return unknown('Host or audio-interface direction is unknown.');
  }
  if (
    (host.direction !== 'host' && host.direction !== 'bidirectional') ||
    (audioInterface.direction !== 'device' && audioInterface.direction !== 'bidirectional')
  ) {
    return incompatible('Host and interface directions do not establish a host-to-device path.');
  }
  if (host.outputConnector !== audioInterface.upstreamConnector) {
    return incompatible(
      'Host output and audio-interface upstream connectors do not match exactly.',
    );
  }
  if (
    sources.some((source) => !audioInterface.sourceInputConnectors.includes(source.outputConnector))
  ) {
    return incompatible(
      'At least one source connector is not an exact documented interface input.',
    );
  }
  if (
    monitoring !== undefined &&
    !audioInterface.monitoringOutputConnectors.includes(monitoring.inputConnector)
  ) {
    return incompatible('Monitoring connector is not an exact documented interface output.');
  }
  return compatible('Host, interface, sources, and monitoring connectors align exactly.');
}

function evaluateBusProtocol(
  input: PodcastMobileWorkflowEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Audio bus/protocol facts lack verified evidence.');
  if (!nonEmpty(input.busProfile) || !nonEmpty(input.audioProtocol)) {
    return unknown('Exact bus or audio protocol is missing.');
  }
  if (
    !input.host.supportedBusProfiles.includes(input.busProfile) ||
    !input.audioInterface.supportedBusProfiles.includes(input.busProfile) ||
    !input.host.supportedAudioProtocols.includes(input.audioProtocol) ||
    !input.audioInterface.supportedAudioProtocols.includes(input.audioProtocol)
  ) {
    return incompatible('Host and interface do not share exact bus and audio protocol profiles.');
  }
  return compatible(
    `Host and interface explicitly support ${input.busProfile} / ${input.audioProtocol}.`,
  );
}

function evaluateAudioTransfer(
  input: PodcastMobileWorkflowEvaluationInput,
  requiredRate: number | undefined,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Audio format/throughput facts lack verified evidence.');
  if (
    requiredRate === undefined ||
    !validPositive(input.audioInterface.maxSampleRateHz) ||
    !validPositive(input.audioInterface.maxBitDepth) ||
    !validPositive(input.host.maxSustainedAudioMBps) ||
    !validPositive(input.audioInterface.maxSustainedAudioMBps)
  ) {
    return unknown('Sample-rate, bit-depth, channel, or sustained-throughput data is missing.');
  }
  if (
    input.sampleRateHz > input.audioInterface.maxSampleRateHz ||
    input.bitDepth > input.audioInterface.maxBitDepth ||
    requiredRate > input.host.maxSustainedAudioMBps ||
    requiredRate > input.audioInterface.maxSustainedAudioMBps
  ) {
    return incompatible(
      'Requested audio format exceeds an exact format or sustained-throughput limit.',
    );
  }
  return compatible(`Required sustained audio transfer is ${requiredRate} MB/s.`);
}

function evaluateChannelsSignal(
  input: PodcastMobileWorkflowEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Channel and signal-protocol facts lack verified evidence.');
  const sourceChannels = input.sources.reduce((sum, source) => sum + source.channelCount, 0);
  if (
    input.sources.length === 0 ||
    input.sources.some((source) => !validPositive(source.channelCount)) ||
    !validPositive(input.channelCount) ||
    !validPositive(input.host.maxInputChannels) ||
    !validPositive(input.audioInterface.maxInputChannels)
  ) {
    return unknown('Source identities or exact channel limits are missing.');
  }
  if (
    input.sources.some(
      (source) => !input.audioInterface.sourceSignalProtocols.includes(source.signalProtocol),
    )
  ) {
    return incompatible(
      'At least one source signal protocol is not supported by the exact interface.',
    );
  }
  if (
    sourceChannels !== input.channelCount ||
    input.channelCount > input.host.maxInputChannels ||
    input.channelCount > input.audioInterface.maxInputChannels
  ) {
    return incompatible('Requested channels do not match sources or exceed host/interface limits.');
  }
  return compatible(`Exact source signal path supports ${input.channelCount} input channels.`);
}

function evaluatePower(
  input: PodcastMobileWorkflowEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Audio workflow power facts lack verified evidence.');
  const { host, audioInterface, sources, powerSource } = input;
  if (audioInterface.powerMode === 'unknown')
    return unknown('Audio-interface power mode is unknown.');
  const phantomSources = sources.filter(({ requiresPhantomPower }) => requiresPhantomPower);
  if (
    phantomSources.some(({ selfPowered }) => selfPowered) ||
    phantomSources.some(({ phantomPowerWatts }) => !validNonNegative(phantomPowerWatts))
  ) {
    return unknown('A source has contradictory or missing exact phantom-power facts.');
  }
  if (
    phantomSources.length > 0 &&
    (!audioInterface.phantomPowerAvailable ||
      audioInterface.phantomPowerChannels < phantomSources.length)
  ) {
    return incompatible(
      'Interface cannot provide required phantom power on all exact source channels.',
    );
  }
  const phantomWatts = phantomSources.reduce((sum, source) => sum + source.phantomPowerWatts, 0);
  const requiredWatts = audioInterface.requiredPowerWatts + phantomWatts;
  if (!validNonNegative(audioInterface.requiredPowerWatts)) {
    return unknown('Interface power requirement is missing.');
  }
  if (audioInterface.powerMode === 'bus_powered') {
    if (!validNonNegative(host.maxBusPowerWatts))
      return unknown('Host bus-power limit is missing.');
    return host.maxBusPowerWatts >= requiredWatts
      ? compatible('Host bus power covers interface and exact phantom-power load.')
      : incompatible('Host bus power is insufficient for interface and phantom-power load.');
  }
  if (audioInterface.powerMode === 'external_required') {
    if (powerSource === undefined)
      return incompatible('Audio interface requires an exact external source.');
    if (
      !powerSource.compatibleInterfaceIds.includes(audioInterface.id) ||
      !audioInterface.compatiblePowerSourceIds.includes(powerSource.id) ||
      !validPositive(powerSource.maxPowerWatts) ||
      powerSource.maxPowerWatts < requiredWatts
    ) {
      return incompatible('External source is not exactly compatible or lacks required power.');
    }
  }
  return compatible('Exact interface and source power requirements are satisfied.');
}

function evaluateOsSoftware(
  input: PodcastMobileWorkflowEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('OS/application facts lack verified evidence.');
  if (!nonEmpty(input.osVersion) || !nonEmpty(input.appId)) {
    return unknown('Exact OS version or application identity is missing.');
  }
  if (
    !input.host.supportedOsVersions.includes(input.osVersion) ||
    !input.audioInterface.supportedOsVersions.includes(input.osVersion) ||
    !input.host.supportedAppIds.includes(input.appId)
  ) {
    return incompatible('Exact OS/application combination is not documented across the workflow.');
  }
  return compatible(`Exact OS ${input.osVersion} and application ${input.appId} are supported.`);
}

function calculateAudioRate(input: PodcastMobileWorkflowEvaluationInput): number | undefined {
  if (![input.sampleRateHz, input.bitDepth, input.channelCount].every(validPositive))
    return undefined;
  return (input.sampleRateHz * input.bitDepth * input.channelCount) / 8 / 1_000_000;
}

function claimMatches(input: PodcastMobileWorkflowEvaluationInput): boolean {
  const { claim } = input;
  const sourceIds = input.sources.map(({ id }) => id);
  return (
    claim.hostId === input.host.id &&
    claim.interfaceId === input.audioInterface.id &&
    sameExactSet(claim.sourceIds, sourceIds) &&
    claim.monitoringId === input.monitoring?.id &&
    claim.powerSourceId === input.powerSource?.id &&
    claim.busProfile === input.busProfile &&
    claim.audioProtocol === input.audioProtocol &&
    claim.sampleRateHz === input.sampleRateHz &&
    claim.bitDepth === input.bitDepth &&
    claim.channelCount === input.channelCount &&
    claim.osVersion === input.osVersion &&
    claim.appId === input.appId
  );
}

function sameExactSet(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
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
