import { aggregateEvaluationStatus } from './aggregate.js';
import type { BaseEvaluation, EvaluationDimension } from './types.js';

export type AudioConnector = 'TRS_3_5' | 'TRRS_3_5' | 'USB_C' | 'LIGHTNING' | 'XLR_3';
export type AudioSignal = 'analog_mic' | 'analog_line' | 'digital';
export type MicrophonePower =
  'self_powered' | 'plug_in_power' | 'phantom_48v' | 'usb_bus_power' | 'unknown';

export interface AudioEndpoint {
  readonly id: string;
  readonly connector: AudioConnector;
  readonly signal: AudioSignal;
  readonly protocols: readonly string[];
  readonly channels: number;
  readonly plugInPower?: boolean;
  readonly phantomPowerVolts?: readonly number[];
  readonly busPower?: boolean;
  readonly evidenceIds: readonly string[];
}

export interface AudioSource {
  readonly id: string;
  readonly output: AudioEndpoint;
  readonly requiredPower: MicrophonePower;
  readonly evidenceIds: readonly string[];
}

export interface AudioHost {
  readonly id: string;
  readonly inputs: readonly AudioEndpoint[];
  readonly evidenceIds: readonly string[];
}

export interface AudioAdapter {
  readonly id: string;
  readonly fromConnector: AudioConnector;
  readonly toConnector: AudioConnector;
  readonly fromSignal: AudioSignal;
  readonly toSignal: AudioSignal;
  readonly protocols: readonly string[];
  readonly verified: boolean;
  readonly evidenceIds: readonly string[];
  readonly passesPlugInPower?: boolean;
  readonly limitations?: readonly string[];
}

export interface AudioEvaluationInput {
  readonly host: AudioHost;
  readonly source: AudioSource;
  readonly adapters?: readonly AudioAdapter[];
  readonly limitations?: readonly string[];
}

export interface AudioCompatibilityEvaluation extends BaseEvaluation {
  readonly selectedInputId?: string;
  readonly requiredAdapterIds: readonly string[];
  readonly requiredItems: readonly string[];
  readonly dimensions: {
    readonly physical: EvaluationDimension;
    readonly signal: EvaluationDimension;
    readonly electrical: EvaluationDimension;
    readonly channels: EvaluationDimension;
  };
}

export function evaluateAudioCompatibility(
  input: AudioEvaluationInput,
): AudioCompatibilityEvaluation {
  const attempts = input.host.inputs.map((hostInput) =>
    evaluateEndpoint(
      input.source,
      hostInput,
      input.adapters ?? [],
      input.host.evidenceIds,
      input.limitations ?? [],
    ),
  );
  if (attempts.length === 0) return noAudioInput(input);
  attempts.sort((left, right) => scoreAudioAttempt(right) - scoreAudioAttempt(left));
  const selected = attempts[0];
  if (!selected) return noAudioInput(input);

  return {
    ...selected,
    evidenceIds: unique([
      ...input.host.evidenceIds,
      ...input.source.evidenceIds,
      ...input.source.output.evidenceIds,
      ...selected.evidenceIds,
    ]),
  };
}

function evaluateEndpoint(
  source: AudioSource,
  hostInput: AudioEndpoint,
  adapters: readonly AudioAdapter[],
  hostEvidenceIds: readonly string[],
  claimLimitations: readonly string[],
): AudioCompatibilityEvaluation {
  const output = source.output;
  const directConnector = output.connector === hostInput.connector;
  const directSignal = output.signal === hostInput.signal;
  const directProtocol = protocolsOverlap(output.protocols, hostInput.protocols);
  const adapter = adapters.find(
    (item) =>
      item.verified &&
      item.evidenceIds.length > 0 &&
      item.fromConnector === output.connector &&
      item.toConnector === hostInput.connector &&
      item.fromSignal === output.signal &&
      item.toSignal === hostInput.signal &&
      protocolsOverlap(item.protocols, output.protocols) &&
      protocolsOverlap(item.protocols, hostInput.protocols),
  );
  const commonAdapterNeeded = inferCommonAdapter(output, hostInput);
  const physicalWorks = directConnector || adapter !== undefined;
  const signalWorks = (directSignal && directProtocol) || adapter !== undefined;
  const requiredItems = adapter ? [] : commonAdapterNeeded ? [commonAdapterNeeded] : [];
  const limitations = [...claimLimitations, ...(adapter?.limitations ?? [])];

  const electrical = evaluateMicrophonePower(source.requiredPower, hostInput, adapter);
  const channelLimited = output.channels > hostInput.channels;
  if (channelLimited) {
    limitations.push(
      `Source exposes ${output.channels} channels, but the host input accepts ${hostInput.channels}.`,
    );
  }

  const physical: EvaluationDimension = {
    status: physicalWorks ? 'compatible' : commonAdapterNeeded ? 'unknown' : 'incompatible',
    explanation: physicalWorks
      ? adapter
        ? `Connector conversion is provided by verified adapter ${adapter.id}.`
        : 'Connectors match directly.'
      : commonAdapterNeeded
        ? `A ${commonAdapterNeeded} may be required, but no exact verified adapter was supplied.`
        : 'Connectors do not match and no verified adapter was supplied.',
  };
  const signal: EvaluationDimension = {
    status: signalWorks ? 'compatible' : commonAdapterNeeded ? 'unknown' : 'incompatible',
    explanation: signalWorks
      ? adapter
        ? 'The verified adapter bridges the documented audio signal and protocol.'
        : 'Signal type and explicit audio protocol match.'
      : 'A matching connector alone does not establish signal or protocol compatibility.',
  };
  const channels: EvaluationDimension = {
    status: channelLimited ? 'compatible_with_limitations' : 'compatible',
    explanation: channelLimited
      ? `Only ${hostInput.channels} of ${output.channels} channels can be accepted.`
      : `The host can accept all ${output.channels} source channels.`,
  };
  const evidenced =
    hostEvidenceIds.length > 0 &&
    source.evidenceIds.length > 0 &&
    output.evidenceIds.length > 0 &&
    hostInput.evidenceIds.length > 0 &&
    (adapter === undefined || adapter.evidenceIds.length > 0);
  const status = aggregateEvaluationStatus({
    evidenced,
    dimensions: [physical, signal, electrical, channels],
    limitations,
    adapterRequired: adapter !== undefined,
  });

  return {
    status,
    selectedInputId: hostInput.id,
    requiredAdapterIds: adapter ? [adapter.id] : [],
    requiredItems,
    limitations,
    warnings: electrical.status === 'incompatible' ? [electrical.explanation] : [],
    evidenceIds: [...hostInput.evidenceIds, ...(adapter?.evidenceIds ?? [])],
    dimensions: {
      physical,
      signal,
      electrical,
      channels,
    },
  };
}

function evaluateMicrophonePower(
  power: MicrophonePower,
  input: AudioEndpoint,
  adapter: AudioAdapter | undefined,
): EvaluationDimension {
  switch (power) {
    case 'self_powered':
      return { status: 'compatible', explanation: 'The source supplies its own power.' };
    case 'plug_in_power':
      if (adapter && adapter.passesPlugInPower !== true) {
        return adapter.passesPlugInPower === false
          ? {
              status: 'incompatible',
              explanation: 'The verified adapter blocks the required plug-in power.',
            }
          : {
              status: 'unknown',
              explanation: 'Plug-in-power pass-through is not documented for the adapter.',
            };
      }
      return input.plugInPower
        ? { status: 'compatible', explanation: 'The input provides documented plug-in power.' }
        : {
            status: 'incompatible',
            explanation: 'The microphone requires plug-in power that this input does not provide.',
          };
    case 'phantom_48v':
      return input.phantomPowerVolts?.includes(48)
        ? { status: 'compatible', explanation: 'The input provides documented 48 V phantom power.' }
        : {
            status: 'incompatible',
            explanation:
              'The microphone requires 48 V phantom power that this input does not provide.',
          };
    case 'usb_bus_power':
      return input.busPower
        ? { status: 'compatible', explanation: 'The host input provides documented USB bus power.' }
        : {
            status: 'incompatible',
            explanation: 'The source requires USB bus power that is not documented for this input.',
          };
    case 'unknown':
      return {
        status: 'unknown',
        explanation: 'The microphone power requirement is not documented.',
      };
  }
}

function inferCommonAdapter(output: AudioEndpoint, input: AudioEndpoint): string | undefined {
  if (output.signal !== 'analog_mic' || input.signal !== 'analog_mic') return undefined;
  if (output.connector === 'TRRS_3_5' && input.connector === 'TRS_3_5')
    return 'verified TRRS-to-TRS microphone adapter';
  if (output.connector === 'TRS_3_5' && input.connector === 'TRRS_3_5')
    return 'verified TRS-to-TRRS microphone adapter';
  return undefined;
}

function protocolsOverlap(left: readonly string[], right: readonly string[]): boolean {
  return left.some((protocol) => right.includes(protocol));
}

function scoreAudioAttempt(value: AudioCompatibilityEvaluation): number {
  const statusScore = {
    directly_compatible: 5,
    compatible_with_adapter: 4,
    compatible_with_limitations: 3,
    unknown: 1,
    incompatible: 0,
  }[value.status];
  return statusScore * 100 - value.limitations.length;
}

function noAudioInput(input: AudioEvaluationInput): AudioCompatibilityEvaluation {
  const physical: EvaluationDimension = {
    status: 'incompatible',
    explanation: 'No host audio input is declared.',
  };
  const signal: EvaluationDimension = {
    status: 'incompatible',
    explanation: 'No signal path exists.',
  };
  const electrical: EvaluationDimension = {
    status: 'unknown',
    explanation: 'Power cannot be evaluated without an input.',
  };
  const channels: EvaluationDimension = {
    status: 'unknown',
    explanation: 'Channel capacity cannot be evaluated without an input.',
  };
  return {
    status: aggregateEvaluationStatus({
      evidenced: input.host.evidenceIds.length > 0,
      dimensions: [physical, signal, electrical, channels],
    }),
    requiredAdapterIds: [],
    requiredItems: [],
    limitations: [],
    warnings: ['The host has no declared audio input.'],
    evidenceIds: unique([...input.host.evidenceIds, ...input.source.evidenceIds]),
    dimensions: {
      physical,
      signal,
      electrical,
      channels,
    },
  };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
