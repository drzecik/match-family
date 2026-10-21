import { describe, expect, it } from 'vitest';
import {
  evaluateAudioCompatibility,
  type AudioEndpoint,
  type AudioHost,
  type AudioSource,
} from '../src/index.js';

const endpoint = (overrides: Partial<AudioEndpoint> = {}): AudioEndpoint => ({
  id: 'camera-input',
  connector: 'TRS_3_5',
  signal: 'analog_mic',
  protocols: ['analog_unbalanced_audio'],
  channels: 2,
  plugInPower: true,
  evidenceIds: ['camera-manual'],
  ...overrides,
});
const host = (input: AudioEndpoint): AudioHost => ({
  id: 'camera',
  inputs: [input],
  evidenceIds: ['camera-spec'],
});
const source = (overrides: Partial<AudioSource> = {}): AudioSource => ({
  id: 'mic',
  output: endpoint({ id: 'mic-output' }),
  requiredPower: 'self_powered',
  evidenceIds: ['mic-manual'],
  ...overrides,
});

describe('evaluateAudioCompatibility', () => {
  it('accepts direct TRS audio', () => {
    const result = evaluateAudioCompatibility({ host: host(endpoint()), source: source() });
    expect(result.status).toBe('directly_compatible');
  });

  it('requires a verified adapter for TRRS to TRS', () => {
    const trrs = source({ output: endpoint({ connector: 'TRRS_3_5', id: 'trrs-output' }) });
    const missing = evaluateAudioCompatibility({ host: host(endpoint()), source: trrs });
    expect(missing.status).toBe('unknown');
    expect(missing.requiredItems[0]).toContain('TRRS-to-TRS');

    const verified = evaluateAudioCompatibility({
      host: host(endpoint()),
      source: trrs,
      adapters: [
        {
          id: 'trrs-trs',
          fromConnector: 'TRRS_3_5',
          toConnector: 'TRS_3_5',
          fromSignal: 'analog_mic',
          toSignal: 'analog_mic',
          protocols: ['analog_unbalanced_audio'],
          verified: true,
          evidenceIds: ['adapter-manual'],
        },
      ],
    });
    expect(verified.status).toBe('compatible_with_adapter');
    expect(verified.requiredAdapterIds).toEqual(['trrs-trs']);
  });

  it('does not publish a result without evidence for the exact endpoints', () => {
    const result = evaluateAudioCompatibility({
      host: { ...host(endpoint()), evidenceIds: [] },
      source: source(),
    });
    expect(result.status).toBe('unknown');
  });

  it('requires documented plug-in-power pass-through from an adapter', () => {
    const trrs = source({
      output: endpoint({ connector: 'TRRS_3_5', id: 'trrs-output' }),
      requiredPower: 'plug_in_power',
    });
    const result = evaluateAudioCompatibility({
      host: host(endpoint()),
      source: trrs,
      adapters: [
        {
          id: 'trrs-trs',
          fromConnector: 'TRRS_3_5',
          toConnector: 'TRS_3_5',
          fromSignal: 'analog_mic',
          toSignal: 'analog_mic',
          protocols: ['analog_unbalanced_audio'],
          verified: true,
          evidenceIds: ['adapter-manual'],
        },
      ],
    });
    expect(result.status).toBe('unknown');
    expect(result.dimensions.electrical.status).toBe('unknown');
  });

  it('accepts explicitly documented USB Audio and bus power', () => {
    const usb = endpoint({
      connector: 'USB_C',
      signal: 'digital',
      protocols: ['usb_audio_2'],
      busPower: true,
      plugInPower: false,
    });
    const result = evaluateAudioCompatibility({
      host: host(usb),
      source: source({ output: { ...usb, id: 'receiver-output' }, requiredPower: 'usb_bus_power' }),
    });
    expect(result.status).toBe('directly_compatible');
  });

  it('rejects missing plug-in power and missing phantom power', () => {
    const unpowered = endpoint({ plugInPower: false, phantomPowerVolts: [] });
    expect(
      evaluateAudioCompatibility({
        host: host(unpowered),
        source: source({ requiredPower: 'plug_in_power' }),
      }).status,
    ).toBe('incompatible');
    expect(
      evaluateAudioCompatibility({
        host: host(unpowered),
        source: source({ requiredPower: 'phantom_48v' }),
      }).status,
    ).toBe('incompatible');
  });

  it('reports channel limitations without claiming additional channels', () => {
    const result = evaluateAudioCompatibility({
      host: host(endpoint({ channels: 1 })),
      source: source({ output: endpoint({ id: 'four-channel', channels: 4 }) }),
    });
    expect(result.status).toBe('compatible_with_limitations');
    expect(result.dimensions.channels.status).toBe('compatible_with_limitations');
  });
});
