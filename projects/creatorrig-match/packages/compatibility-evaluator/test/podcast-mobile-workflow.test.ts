import { describe, expect, it } from 'vitest';
import {
  evaluatePodcastMobileWorkflow,
  type PodcastMobileWorkflowEvaluationInput,
} from '../src/podcast-mobile-workflow.js';

const sourceA = {
  id: 'mic-a',
  outputConnector: 'xlr_3',
  signalProtocol: 'balanced_analog_audio',
  channelCount: 1,
  requiresPhantomPower: true,
  phantomPowerWatts: 0.5,
  selfPowered: false,
  evidenceIds: ['ev-mic-a'],
} as const;
const sourceB = { ...sourceA, id: 'mic-b', evidenceIds: ['ev-mic-b'] } as const;

const base: PodcastMobileWorkflowEvaluationInput = {
  host: {
    id: 'phone-a',
    outputConnector: 'usb_c',
    direction: 'host',
    supportedBusProfiles: ['usb_2_0'],
    supportedAudioProtocols: ['usb_audio_2'],
    maxSustainedAudioMBps: 20,
    maxInputChannels: 2,
    maxBusPowerWatts: 5,
    supportedOsVersions: ['mobile_os_18'],
    supportedAppIds: ['podcast-app-a'],
    evidenceIds: ['ev-phone'],
  },
  audioInterface: {
    id: 'interface-a',
    upstreamConnector: 'usb_c',
    direction: 'device',
    supportedBusProfiles: ['usb_2_0'],
    supportedAudioProtocols: ['usb_audio_2'],
    sourceInputConnectors: ['xlr_3'],
    sourceSignalProtocols: ['balanced_analog_audio'],
    monitoringOutputConnectors: ['trs_3_5_stereo'],
    maxSampleRateHz: 96_000,
    maxBitDepth: 24,
    maxInputChannels: 2,
    maxSustainedAudioMBps: 10,
    powerMode: 'bus_powered',
    requiredPowerWatts: 3,
    phantomPowerAvailable: true,
    phantomPowerChannels: 2,
    compatiblePowerSourceIds: [],
    supportedOsVersions: ['mobile_os_18'],
    evidenceIds: ['ev-interface'],
  },
  sources: [sourceA, sourceB],
  monitoring: {
    id: 'headphones-a',
    inputConnector: 'trs_3_5_stereo',
    evidenceIds: ['ev-headphones'],
  },
  busProfile: 'usb_2_0',
  audioProtocol: 'usb_audio_2',
  sampleRateHz: 48_000,
  bitDepth: 24,
  channelCount: 2,
  osVersion: 'mobile_os_18',
  appId: 'podcast-app-a',
  claim: {
    id: 'podcast-mobile-a',
    hostId: 'phone-a',
    interfaceId: 'interface-a',
    sourceIds: ['mic-a', 'mic-b'],
    monitoringId: 'headphones-a',
    busProfile: 'usb_2_0',
    audioProtocol: 'usb_audio_2',
    sampleRateHz: 48_000,
    bitDepth: 24,
    channelCount: 2,
    osVersion: 'mobile_os_18',
    appId: 'podcast-app-a',
    verificationStatus: 'verified',
    conditions: [],
    limitations: [],
    evidenceIds: ['ev-podcast-workflow'],
  },
};

function evaluate(overrides: Partial<PodcastMobileWorkflowEvaluationInput> = {}) {
  return evaluatePodcastMobileWorkflow({ ...base, ...overrides });
}

describe('evaluatePodcastMobileWorkflow', () => {
  it('accepts an exact two-channel mobile podcast workflow', () => {
    const result = evaluate();
    expect(result.status).toBe('directly_compatible');
    expect(result.requiredSustainedAudioMBps).toBe(0.288);
    expect(result.requiredItemIds).toEqual(['interface-a', 'mic-a', 'mic-b', 'headphones-a']);
  });

  it('rejects a host/interface connector mismatch', () => {
    const result = evaluate({ host: { ...base.host, outputConnector: 'lightning' } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.connectorDirection.status).toBe('incompatible');
  });

  it('rejects an input-only host direction', () => {
    const result = evaluate({ host: { ...base.host, direction: 'device' } });
    expect(result.status).toBe('incompatible');
  });

  it('rejects a matching connector with the wrong bus profile', () => {
    const result = evaluate({ host: { ...base.host, supportedBusProfiles: ['usb_1_1'] } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.busProtocol.status).toBe('incompatible');
  });

  it('rejects an unsupported USB Audio protocol', () => {
    const result = evaluate({
      audioInterface: { ...base.audioInterface, supportedAudioProtocols: ['usb_audio_1'] },
    });
    expect(result.status).toBe('incompatible');
  });

  it('rejects an audio format above interface sample-rate capability', () => {
    const result = evaluate({
      audioInterface: { ...base.audioInterface, maxSampleRateHz: 44_100 },
    });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.audioFormatTransfer.status).toBe('incompatible');
  });

  it('rejects a sustained audio throughput bottleneck', () => {
    const result = evaluate({ host: { ...base.host, maxSustainedAudioMBps: 0.2 } });
    expect(result.status).toBe('incompatible');
  });

  it('rejects a source signal protocol not accepted by the interface', () => {
    const result = evaluate({
      audioInterface: { ...base.audioInterface, sourceSignalProtocols: ['digital_aes3'] },
    });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.channelsSignal.status).toBe('incompatible');
  });

  it('rejects a channel count that does not match exact sources', () => {
    const result = evaluate({
      channelCount: 1,
      claim: { ...base.claim, channelCount: 1 },
    });
    expect(result.status).toBe('incompatible');
  });

  it('rejects missing phantom power on required channels', () => {
    const result = evaluate({
      audioInterface: { ...base.audioInterface, phantomPowerChannels: 1 },
    });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.power.status).toBe('incompatible');
  });

  it('rejects insufficient host bus power including phantom load', () => {
    const result = evaluate({ host: { ...base.host, maxBusPowerWatts: 3.5 } });
    expect(result.status).toBe('incompatible');
  });

  it('rejects an unsupported exact mobile OS', () => {
    const result = evaluate({
      audioInterface: { ...base.audioInterface, supportedOsVersions: ['desktop_os_15'] },
    });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.osSoftware.status).toBe('incompatible');
  });

  it('rejects an unsupported exact application', () => {
    const result = evaluate({ host: { ...base.host, supportedAppIds: [] } });
    expect(result.status).toBe('incompatible');
  });

  it('fails closed for a candidate workflow claim', () => {
    const result = evaluate({ claim: { ...base.claim, verificationStatus: 'candidate' } });
    expect(result.status).toBe('unknown');
    expect(result.requiredItemIds).toEqual([]);
    expect(result.evidenceIds).toEqual([]);
  });

  it('fails closed without exact source evidence', () => {
    const result = evaluate({ sources: [{ ...sourceA, evidenceIds: [] }, sourceB] });
    expect(result.status).toBe('unknown');
  });

  it('does not accept duplicate source IDs as an exact claim match', () => {
    const result = evaluate({ sources: [sourceA, { ...sourceB, id: 'mic-a' }] });
    expect(result.status).toBe('unknown');
  });

  it('preserves exact mobile workflow limitations', () => {
    const result = evaluate({
      claim: { ...base.claim, limitations: ['App records stereo only.'] },
    });
    expect(result.status).toBe('compatible_with_limitations');
  });
});
