import { describe, expect, it } from 'vitest';
import { evaluatePodcastMobileWorkflow } from '../src/podcast-mobile-workflow.js';
import { evaluateStorageWorkflow } from '../src/storage-workflow.js';

function evaluateVerifiedStorage() {
  return evaluateStorageWorkflow({
    computer: {
      id: 'travel-computer',
      outputConnector: 'usb_c',
      direction: 'host',
      supportedBusProfiles: ['usb_3_2_gen2'],
      maxSustainedTransferMBps: 500,
      maxBusPowerWatts: 5,
      supportedOsVersions: ['desktop_os_15'],
      supportedSoftwareIds: [],
      evidenceIds: ['ev-computer'],
    },
    reader: {
      id: 'travel-reader',
      inputConnector: 'usb_c',
      supportedBusProfiles: ['usb_3_2_gen2'],
      supportedMediaFormats: ['sdxc'],
      supportedMediaProtocols: ['uhs_ii'],
      maxSustainedTransferMBps: 300,
      requiredPowerWatts: 1,
      supportedOsVersions: ['desktop_os_15'],
      evidenceIds: ['ev-reader'],
    },
    media: {
      id: 'travel-card',
      mediaFormat: 'sdxc',
      mediaProtocol: 'uhs_ii',
      sustainedReadMBps: 250,
      sustainedWriteMBps: 180,
      evidenceIds: ['ev-card'],
    },
    busProfile: 'usb_3_2_gen2',
    transferDirection: 'read_from_media',
    requiredSustainedTransferMBps: 150,
    osVersion: 'desktop_os_15',
    claim: {
      id: 'travel-storage-path',
      computerId: 'travel-computer',
      readerId: 'travel-reader',
      mediaId: 'travel-card',
      busProfile: 'usb_3_2_gen2',
      mediaProtocol: 'uhs_ii',
      transferDirection: 'read_from_media',
      requiredSustainedTransferMBps: 150,
      osVersion: 'desktop_os_15',
      verificationStatus: 'verified',
      conditions: [],
      limitations: [],
      evidenceIds: ['ev-storage-path'],
    },
  });
}

function evaluateVerifiedMobileAudio() {
  return evaluatePodcastMobileWorkflow({
    host: {
      id: 'travel-phone',
      outputConnector: 'usb_c',
      direction: 'host',
      supportedBusProfiles: ['usb_2_0'],
      supportedAudioProtocols: ['usb_audio_2'],
      maxSustainedAudioMBps: 5,
      maxInputChannels: 1,
      maxBusPowerWatts: 2,
      supportedOsVersions: ['mobile_os_18'],
      supportedAppIds: ['field-audio-app'],
      evidenceIds: ['ev-phone'],
    },
    audioInterface: {
      id: 'self-powered-interface',
      upstreamConnector: 'usb_c',
      direction: 'device',
      supportedBusProfiles: ['usb_2_0'],
      supportedAudioProtocols: ['usb_audio_2'],
      sourceInputConnectors: ['trs_3_5'],
      sourceSignalProtocols: ['analog_audio'],
      monitoringOutputConnectors: [],
      maxSampleRateHz: 48_000,
      maxBitDepth: 24,
      maxInputChannels: 1,
      maxSustainedAudioMBps: 5,
      powerMode: 'self_powered',
      requiredPowerWatts: 0,
      phantomPowerAvailable: false,
      phantomPowerChannels: 0,
      compatiblePowerSourceIds: [],
      supportedOsVersions: ['mobile_os_18'],
      evidenceIds: ['ev-interface'],
    },
    sources: [
      {
        id: 'self-powered-receiver',
        outputConnector: 'trs_3_5',
        signalProtocol: 'analog_audio',
        channelCount: 1,
        requiresPhantomPower: false,
        phantomPowerWatts: 0,
        selfPowered: true,
        evidenceIds: ['ev-receiver'],
      },
    ],
    busProfile: 'usb_2_0',
    audioProtocol: 'usb_audio_2',
    sampleRateHz: 48_000,
    bitDepth: 24,
    channelCount: 1,
    osVersion: 'mobile_os_18',
    appId: 'field-audio-app',
    claim: {
      id: 'travel-mobile-audio-path',
      hostId: 'travel-phone',
      interfaceId: 'self-powered-interface',
      sourceIds: ['self-powered-receiver'],
      busProfile: 'usb_2_0',
      audioProtocol: 'usb_audio_2',
      sampleRateHz: 48_000,
      bitDepth: 24,
      channelCount: 1,
      osVersion: 'mobile_os_18',
      appId: 'field-audio-app',
      verificationStatus: 'verified',
      conditions: [],
      limitations: [],
      evidenceIds: ['ev-mobile-audio-path'],
    },
  });
}

describe('M4 workflow integration', () => {
  it('validates independent storage-ingest and mobile-audio paths for one travel workflow', () => {
    const storage = evaluateVerifiedStorage();
    const audio = evaluateVerifiedMobileAudio();

    expect(storage.status).toBe('directly_compatible');
    expect(storage.requiredItemIds).toEqual(['travel-reader', 'travel-card']);
    expect(audio.status).toBe('directly_compatible');
    expect(audio.requiredItemIds).toEqual(['self-powered-interface', 'self-powered-receiver']);
  });

  it('keeps evidence and required items scoped to their exact workflow', () => {
    const storage = evaluateVerifiedStorage();
    const audio = evaluateVerifiedMobileAudio();

    expect(storage.evidenceIds).not.toContain('ev-mobile-audio-path');
    expect(audio.evidenceIds).not.toContain('ev-storage-path');
    expect(storage.requiredItemIds).not.toContain('self-powered-interface');
    expect(audio.requiredItemIds).not.toContain('travel-reader');
  });
});
