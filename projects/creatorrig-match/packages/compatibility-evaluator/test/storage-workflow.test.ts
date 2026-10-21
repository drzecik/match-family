import { describe, expect, it } from 'vitest';
import {
  evaluateStorageWorkflow,
  type StorageWorkflowEvaluationInput,
} from '../src/storage-workflow.js';

const base: StorageWorkflowEvaluationInput = {
  computer: {
    id: 'computer-a',
    outputConnector: 'usb_c',
    direction: 'host',
    supportedBusProfiles: ['usb_3_2_gen2'],
    maxSustainedTransferMBps: 900,
    maxBusPowerWatts: 15,
    supportedOsVersions: ['macos_15'],
    supportedSoftwareIds: ['ingest-pro'],
    evidenceIds: ['ev-computer'],
  },
  dock: {
    id: 'dock-a',
    upstreamConnector: 'usb_c',
    downstreamConnector: 'usb_c',
    directional: true,
    supportedBusProfiles: ['usb_3_2_gen2'],
    maxSustainedTransferMBps: 850,
    powerMode: 'external_required',
    requiredPowerWatts: 15,
    downstreamPowerWatts: 7.5,
    compatiblePowerSourceIds: ['dock-psu-a'],
    supportedOsVersions: ['macos_15'],
    evidenceIds: ['ev-dock'],
  },
  reader: {
    id: 'reader-a',
    inputConnector: 'usb_c',
    supportedBusProfiles: ['usb_3_2_gen2'],
    supportedMediaFormats: ['cfexpress_type_b'],
    supportedMediaProtocols: ['nvme_pcie_3'],
    maxSustainedTransferMBps: 820,
    requiredPowerWatts: 2.5,
    supportedOsVersions: ['macos_15'],
    evidenceIds: ['ev-reader'],
  },
  media: {
    id: 'card-a',
    mediaFormat: 'cfexpress_type_b',
    mediaProtocol: 'nvme_pcie_3',
    sustainedReadMBps: 800,
    sustainedWriteMBps: 400,
    evidenceIds: ['ev-card'],
  },
  powerSource: {
    id: 'dock-psu-a',
    compatibleDeviceIds: ['dock-a'],
    maxPowerWatts: 30,
    evidenceIds: ['ev-dock-psu'],
  },
  busProfile: 'usb_3_2_gen2',
  transferDirection: 'read_from_media',
  requiredSustainedTransferMBps: 300,
  osVersion: 'macos_15',
  softwareId: 'ingest-pro',
  claim: {
    id: 'storage-workflow-a',
    computerId: 'computer-a',
    dockId: 'dock-a',
    readerId: 'reader-a',
    mediaId: 'card-a',
    powerSourceId: 'dock-psu-a',
    busProfile: 'usb_3_2_gen2',
    mediaProtocol: 'nvme_pcie_3',
    transferDirection: 'read_from_media',
    requiredSustainedTransferMBps: 300,
    osVersion: 'macos_15',
    softwareId: 'ingest-pro',
    verificationStatus: 'verified',
    conditions: [],
    limitations: [],
    evidenceIds: ['ev-storage-workflow'],
  },
};

function evaluate(overrides: Partial<StorageWorkflowEvaluationInput> = {}) {
  return evaluateStorageWorkflow({ ...base, ...overrides });
}

describe('evaluateStorageWorkflow', () => {
  it('accepts an exact computer-dock-reader-media workflow', () => {
    const result = evaluate();
    expect(result.status).toBe('directly_compatible');
    expect(result.effectiveSustainedTransferMBps).toBe(800);
    expect(result.requiredItemIds).toEqual(['dock-a', 'reader-a', 'card-a', 'dock-psu-a']);
  });

  it('rejects a physical connector mismatch without inferring the bus', () => {
    const result = evaluate({ dock: { ...base.dock!, upstreamConnector: 'thunderbolt_2' } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.connectorDirection.status).toBe('incompatible');
  });

  it('fails closed when dock direction is not explicit', () => {
    const result = evaluate({ dock: { ...base.dock!, directional: false } });
    expect(result.status).toBe('unknown');
    expect(result.requiredItemIds).toEqual([]);
  });

  it('rejects a mismatched exact bus profile despite matching USB-C connectors', () => {
    const result = evaluate({ reader: { ...base.reader, supportedBusProfiles: ['usb_2_0'] } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.busProtocol.status).toBe('incompatible');
  });

  it('rejects an unsupported media format', () => {
    const result = evaluate({ reader: { ...base.reader, supportedMediaFormats: ['sdxc'] } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.mediaProtocol.status).toBe('incompatible');
  });

  it('rejects an unsupported media protocol inside a physically fitting format', () => {
    const result = evaluate({ reader: { ...base.reader, supportedMediaProtocols: ['sata'] } });
    expect(result.status).toBe('incompatible');
  });

  it('rejects a sustained-transfer bottleneck', () => {
    const result = evaluate({ dock: { ...base.dock!, maxSustainedTransferMBps: 250 } });
    expect(result.status).toBe('incompatible');
    expect(result.effectiveSustainedTransferMBps).toBe(250);
    expect(result.dimensions.sustainedTransfer.status).toBe('incompatible');
  });

  it('uses sustained write speed for a write-to-media workflow', () => {
    const result = evaluate({
      transferDirection: 'write_to_media',
      requiredSustainedTransferMBps: 450,
      claim: {
        ...base.claim,
        transferDirection: 'write_to_media',
        requiredSustainedTransferMBps: 450,
      },
    });
    expect(result.status).toBe('incompatible');
    expect(result.effectiveSustainedTransferMBps).toBe(400);
  });

  it('rejects an unverified dock power source', () => {
    const result = evaluate({
      powerSource: { ...base.powerSource!, compatibleDeviceIds: ['other-dock'] },
    });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.power.status).toBe('incompatible');
  });

  it('rejects a dock source that cannot cover dock plus reader load', () => {
    const result = evaluate({ powerSource: { ...base.powerSource!, maxPowerWatts: 17 } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.power.status).toBe('incompatible');
  });

  it('rejects insufficient downstream reader power', () => {
    const result = evaluate({ dock: { ...base.dock!, downstreamPowerWatts: 2 } });
    expect(result.status).toBe('incompatible');
  });

  it('rejects an unsupported exact OS version', () => {
    const result = evaluate({ reader: { ...base.reader, supportedOsVersions: ['windows_11'] } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.osSoftware.status).toBe('incompatible');
  });

  it('rejects unsupported workflow software', () => {
    const result = evaluate({ computer: { ...base.computer, supportedSoftwareIds: [] } });
    expect(result.status).toBe('incompatible');
  });

  it('fails closed for a candidate workflow claim', () => {
    const result = evaluate({ claim: { ...base.claim, verificationStatus: 'candidate' } });
    expect(result.status).toBe('unknown');
    expect(result.requiredItemIds).toEqual([]);
    expect(result.evidenceIds).toEqual([]);
  });

  it('fails closed without exact media evidence', () => {
    const result = evaluate({ media: { ...base.media, evidenceIds: [] } });
    expect(result.status).toBe('unknown');
  });

  it('does not reuse a claim for a similar reader ID', () => {
    const result = evaluate({ reader: { ...base.reader, id: 'reader-a-revision-2' } });
    expect(result.status).toBe('unknown');
  });

  it('preserves exact workflow limitations', () => {
    const result = evaluate({ claim: { ...base.claim, limitations: ['One reader at a time.'] } });
    expect(result.status).toBe('compatible_with_limitations');
  });
});
