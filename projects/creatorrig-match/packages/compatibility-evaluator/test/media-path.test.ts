import { describe, expect, it } from 'vitest';
import { evaluateMediaPath, type MediaPathEvaluationInput } from '../src/media-path.js';

const mode = { width: 3840, height: 2160, frameRate: 30 } as const;
const base: MediaPathEvaluationInput = {
  camera: {
    id: 'camera-a',
    outputConnector: 'micro_hdmi_type_d',
    direction: 'output',
    protocolProfile: 'hdmi_2_0',
    supportedModes: [mode],
    evidenceIds: ['ev-camera-video'],
  },
  cable: {
    id: 'cable-micro-full-hdmi',
    inputConnector: 'micro_hdmi_type_d',
    outputConnector: 'hdmi_type_a',
    directional: true,
    supportedProtocolProfiles: ['hdmi_2_0'],
    supportedModes: [mode],
    evidenceIds: ['ev-cable'],
  },
  destination: {
    id: 'recorder-a',
    inputConnector: 'hdmi_type_a',
    supportedProtocolProfiles: ['hdmi_2_0'],
    supportedModes: [mode],
    capabilities: ['monitor', 'record'],
    powerMode: 'external_required',
    compatiblePowerSourceIds: ['battery-a'],
    evidenceIds: ['ev-recorder'],
  },
  powerSource: {
    id: 'battery-a',
    compatibleDestinationIds: ['recorder-a'],
    evidenceIds: ['ev-battery'],
  },
  requestedMode: mode,
  requestedCapability: 'record',
  claim: {
    id: 'path-camera-recorder',
    deviceId: 'camera-a',
    cableId: 'cable-micro-full-hdmi',
    destinationId: 'recorder-a',
    powerSourceId: 'battery-a',
    protocolProfile: 'hdmi_2_0',
    mode,
    requestedCapability: 'record',
    verificationStatus: 'verified',
    conditions: [],
    limitations: [],
    evidenceIds: ['ev-path'],
  },
};

function evaluate(overrides: Partial<MediaPathEvaluationInput> = {}) {
  return evaluateMediaPath({ ...base, ...overrides });
}

describe('evaluateMediaPath', () => {
  it('accepts a fully evidenced camera-to-recorder path', () => {
    const result = evaluate();
    expect(result.status).toBe('directly_compatible');
    expect(result.requiredItemIds).toEqual(['cable-micro-full-hdmi', 'battery-a']);
    expect(Object.values(result.dimensions).every(({ status }) => status === 'compatible')).toBe(
      true,
    );
  });

  it('rejects a connector mismatch', () => {
    const result = evaluate({ cable: { ...base.cable, inputConnector: 'mini_hdmi_type_c' } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.connectorDirection.status).toBe('incompatible');
    expect(result.requiredItemIds).toEqual([]);
  });

  it('rejects an input-only camera interface', () => {
    const result = evaluate({ camera: { ...base.camera, direction: 'input' } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.connectorDirection.status).toBe('incompatible');
  });

  it('rejects a cable without the exact HDMI/SDI profile', () => {
    const result = evaluate({
      cable: { ...base.cable, supportedProtocolProfiles: ['hdmi_1_4'] },
    });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.protocolVersion.status).toBe('incompatible');
  });

  it('rejects an unsupported resolution/frame-rate tuple', () => {
    const result = evaluate({
      destination: { ...base.destination, supportedModes: [{ ...mode, frameRate: 25 }] },
    });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.videoMode.status).toBe('incompatible');
  });

  it('returns unknown for an empty mode capability list', () => {
    const result = evaluate({ cable: { ...base.cable, supportedModes: [] } });
    expect(result.status).toBe('unknown');
    expect(result.requiredItemIds).toEqual([]);
  });

  it('distinguishes monitoring from recording and capture capabilities', () => {
    const result = evaluate({ destination: { ...base.destination, capabilities: ['monitor'] } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.capability.status).toBe('incompatible');
  });

  it('rejects a power source not documented for the exact destination', () => {
    const result = evaluate({
      powerSource: { ...base.powerSource!, compatibleDestinationIds: ['other-recorder'] },
    });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.powerPrecondition.status).toBe('incompatible');
  });

  it('keeps an exact USB bus-powered capture device conditional on documented host power', () => {
    const result = evaluateMediaPath({
      camera: base.camera,
      cable: base.cable,
      destination: {
        ...base.destination,
        powerMode: 'usb_bus_powered',
        capabilities: ['capture'],
      },
      requestedMode: base.requestedMode,
      requestedCapability: 'capture',
      claim: {
        id: base.claim.id,
        deviceId: base.claim.deviceId,
        cableId: base.claim.cableId,
        destinationId: base.claim.destinationId,
        protocolProfile: base.claim.protocolProfile,
        mode: base.claim.mode,
        requestedCapability: 'capture',
        verificationStatus: 'verified',
        conditions: ['Host USB port must provide the documented bus-power profile.'],
        limitations: [],
        evidenceIds: base.claim.evidenceIds,
      },
    });
    expect(result.status).toBe('compatible_with_limitations');
    expect(result.dimensions.powerPrecondition.status).toBe('compatible_with_limitations');
    expect(result.requiredItemIds).toEqual(['cable-micro-full-hdmi']);
  });

  it('fails closed for USB bus power without an exact host condition', () => {
    const result = evaluateMediaPath({
      camera: base.camera,
      cable: base.cable,
      destination: { ...base.destination, powerMode: 'usb_bus_powered' },
      requestedMode: base.requestedMode,
      requestedCapability: base.requestedCapability,
      claim: {
        id: base.claim.id,
        deviceId: base.claim.deviceId,
        cableId: base.claim.cableId,
        destinationId: base.claim.destinationId,
        protocolProfile: base.claim.protocolProfile,
        mode: base.claim.mode,
        requestedCapability: base.claim.requestedCapability,
        verificationStatus: 'verified',
        conditions: [],
        limitations: [],
        evidenceIds: base.claim.evidenceIds,
      },
    });
    expect(result.status).toBe('unknown');
    expect(result.requiredItemIds).toEqual([]);
  });

  it('rejects a missing exact power source for an externally powered destination', () => {
    const result = evaluateMediaPath({
      camera: base.camera,
      cable: base.cable,
      destination: base.destination,
      requestedMode: base.requestedMode,
      requestedCapability: base.requestedCapability,
      claim: {
        id: base.claim.id,
        deviceId: base.claim.deviceId,
        cableId: base.claim.cableId,
        destinationId: base.claim.destinationId,
        protocolProfile: base.claim.protocolProfile,
        mode: base.claim.mode,
        requestedCapability: base.claim.requestedCapability,
        verificationStatus: 'verified',
        conditions: [],
        limitations: [],
        evidenceIds: base.claim.evidenceIds,
      },
    });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.powerPrecondition.status).toBe('incompatible');
    expect(result.requiredItemIds).toEqual([]);
  });

  it('supports an exact 3G-SDI path', () => {
    const result = evaluate({
      camera: {
        ...base.camera,
        outputConnector: 'bnc_sdi',
        protocolProfile: 'sdi_3g',
      },
      cable: {
        ...base.cable,
        inputConnector: 'bnc_sdi',
        outputConnector: 'bnc_sdi',
        supportedProtocolProfiles: ['sdi_3g'],
      },
      destination: {
        ...base.destination,
        inputConnector: 'bnc_sdi',
        supportedProtocolProfiles: ['sdi_3g'],
      },
      claim: { ...base.claim, protocolProfile: 'sdi_3g' },
    });
    expect(result.status).toBe('directly_compatible');
    expect(result.dimensions.protocolVersion.status).toBe('compatible');
  });

  it('fails closed for a candidate claim', () => {
    const result = evaluate({ claim: { ...base.claim, verificationStatus: 'candidate' } });
    expect(result.status).toBe('unknown');
    expect(result.evidenceIds).toEqual([]);
    expect(result.requiredItemIds).toEqual([]);
  });

  it('fails closed when exact cable evidence is absent', () => {
    const result = evaluate({ cable: { ...base.cable, evidenceIds: [] } });
    expect(result.status).toBe('unknown');
    expect(result.dimensions.evidence.status).toBe('unknown');
  });

  it('does not reuse a claim for a similar destination ID', () => {
    const result = evaluate({ destination: { ...base.destination, id: 'recorder-a-v2' } });
    expect(result.status).toBe('unknown');
    expect(result.requiredItemIds).toEqual([]);
  });

  it('preserves explicit path limitations', () => {
    const result = evaluate({ claim: { ...base.claim, limitations: ['No raw recording.'] } });
    expect(result.status).toBe('compatible_with_limitations');
    expect(result.limitations).toEqual(['No raw recording.']);
  });
});
