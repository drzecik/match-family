import { describe, expect, it } from 'vitest';
import {
  evaluatePowerPath,
  USB_POWER_DELIVERY_PROTOCOL,
  type PowerConsumerRequirement,
  type UsbPdCable,
  type UsbPdPowerSource,
} from '../src/index.js';

const source = (overrides: Partial<UsbPdPowerSource> = {}): UsbPdPowerSource => ({
  id: 'powerframe-pd-72',
  outputConnector: 'usb_c',
  protocol: USB_POWER_DELIVERY_PROTOCOL,
  pdProfiles: [
    { voltageV: 5, maxCurrentA: 3 },
    { voltageV: 9, maxCurrentA: 3 },
  ],
  maximumPowerWatts: 27,
  evidenceIds: ['source-spec'],
  ...overrides,
});

const cable = (overrides: Partial<UsbPdCable> = {}): UsbPdCable => ({
  id: 'powerframe-cable',
  inputConnector: 'usb_c',
  outputConnector: 'usb_c',
  directional: false,
  supportedProtocols: [USB_POWER_DELIVERY_PROTOCOL],
  maxVoltageV: 20,
  maxCurrentA: 3,
  maxPowerWatts: 60,
  evidenceIds: ['cable-spec'],
  ...overrides,
});

const consumer = (overrides: Partial<PowerConsumerRequirement> = {}): PowerConsumerRequirement => ({
  deviceId: 'novacam-n7',
  inputConnector: 'usb_c',
  protocol: USB_POWER_DELIVERY_PROTOCOL,
  requiredVoltageV: 9,
  requiredCurrentA: 3,
  requiredPowerWatts: 27,
  evidenceIds: ['camera-manual'],
  conditions: ['Use only through the documented camera power input.'],
  limitations: [],
  ...overrides,
});

describe('evaluatePowerPath', () => {
  it('confirms all dimensions for an exact evidenced USB PD path', () => {
    const result = evaluatePowerPath(source(), cable(), consumer());
    expect(result.status).toBe('directly_compatible');
    expect(result.dimensions.connectorDirection.status).toBe('compatible');
    expect(result.dimensions.protocolProfile.status).toBe('compatible');
    expect(result.dimensions.voltage.status).toBe('compatible');
    expect(result.dimensions.capacity.status).toBe('compatible');
    expect(result.dimensions.electricalEvidence.status).toBe('compatible');
    expect(result.dimensions.polarity.status).toBe('not_applicable');
  });

  it('returns a limited result for a stationary-only path', () => {
    const result = evaluatePowerPath(
      source(),
      cable(),
      consumer({ limitations: ['Disconnect the path during active gimbal operation.'] }),
    );
    expect(result.status).toBe('compatible_with_limitations');
    expect(result.limitations).toHaveLength(1);
  });

  it('does not infer USB PD from matching USB-C connector shapes', () => {
    const result = evaluatePowerPath(
      source({ protocol: 'fixed_5v_dc', pdProfiles: [] }),
      cable(),
      consumer(),
    );
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.protocolProfile.status).toBe('incompatible');
    expect(result.dimensions.polarity.status).toBe('unknown');
  });

  it('rejects a mismatched connector path', () => {
    const result = evaluatePowerPath(source(), cable({ outputConnector: 'usb_a' }), consumer());
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.connectorDirection.status).toBe('incompatible');
  });

  it('rejects absence of the exact voltage profile', () => {
    const result = evaluatePowerPath(
      source({ pdProfiles: [{ voltageV: 5, maxCurrentA: 3 }] }),
      cable(),
      consumer(),
    );
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.protocolProfile.status).toBe('incompatible');
    expect(result.dimensions.voltage.status).toBe('incompatible');
  });

  it('rejects insufficient source profile current', () => {
    const result = evaluatePowerPath(
      source({ pdProfiles: [{ voltageV: 9, maxCurrentA: 2 }] }),
      cable(),
      consumer(),
    );
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.capacity.status).toBe('incompatible');
  });

  it('rejects insufficient cable current or power', () => {
    const result = evaluatePowerPath(source(), cable({ maxCurrentA: 2 }), consumer());
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.capacity.status).toBe('incompatible');
  });

  it('rejects a cable voltage rating below the negotiated profile', () => {
    const result = evaluatePowerPath(source(), cable({ maxVoltageV: 5 }), consumer());
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.voltage.status).toBe('incompatible');
  });

  it('fails closed when electrical evidence is missing', () => {
    const result = evaluatePowerPath(source(), cable({ evidenceIds: [] }), consumer());
    expect(result.status).toBe('unknown');
    expect(result.evidenceIds).toEqual([]);
    expect(result.dimensions.electricalEvidence.status).toBe('unknown');
  });

  it('fails closed when a capacity fact is missing', () => {
    const result = evaluatePowerPath(source(), cable({ maxPowerWatts: Number.NaN }), consumer());
    expect(result.status).toBe('unknown');
    expect(result.dimensions.capacity.status).toBe('unknown');
  });

  it('never waives polarity for a non-PD path', () => {
    const result = evaluatePowerPath(
      source({ protocol: 'fixed_5v_dc', pdProfiles: [] }),
      cable({ supportedProtocols: ['fixed_5v_dc'] }),
      consumer({ protocol: 'fixed_5v_dc' }),
    );
    expect(result.dimensions.polarity.status).toBe('unknown');
    expect(result.status).toBe('unknown');
  });

  it('fails closed for an empty source PD profile list', () => {
    const result = evaluatePowerPath(source({ pdProfiles: [] }), cable(), consumer());
    expect(result.status).toBe('unknown');
    expect(result.dimensions.protocolProfile.status).toBe('unknown');
  });
});
