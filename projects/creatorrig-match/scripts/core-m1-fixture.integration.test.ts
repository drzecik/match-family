import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  evaluateAudioCompatibility,
  evaluateMemoryCompatibility,
  evaluateOpticsCompatibility,
  isPositiveStatus,
} from '../packages/compatibility-evaluator/src/index.js';

interface FixtureProduct {
  readonly id: string;
  readonly weightGrams: number;
  readonly specs: Record<string, unknown>;
}

interface FixtureEdge {
  readonly id: string;
  readonly evidenceIds: readonly string[];
  readonly limitations: readonly string[];
  readonly requiredProductIds: readonly string[];
}

interface FixtureMode {
  readonly id: string;
  readonly bitrateMbps: number;
  readonly mediaFormats: readonly string[];
  readonly minimumSustainedWriteMBps: number;
  readonly minimumSpeedClass: string;
  readonly safetyMarginPercent: number;
  readonly evidenceIds: readonly string[];
}

interface Fixture {
  readonly products: readonly FixtureProduct[];
  readonly compatibilityEdges: readonly FixtureEdge[];
  readonly recordingModes: readonly FixtureMode[];
}

const fixture = JSON.parse(
  readFileSync(new URL('../data/fixtures/demo-catalog.json', import.meta.url), 'utf8'),
) as Fixture;

function product(id: string): FixtureProduct {
  const found = fixture.products.find((item) => item.id === id);
  if (!found) throw new Error(`Missing fixture product: ${id}`);
  return found;
}

function edge(id: string): FixtureEdge {
  const found = fixture.compatibilityEdges.find((item) => item.id === id);
  if (!found) throw new Error(`Missing fixture edge: ${id}`);
  return found;
}

function stringFact(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') throw new Error(`Missing string fact: ${key}`);
  return value;
}

function numberFact(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number') throw new Error(`Missing number fact: ${key}`);
  return value;
}

function booleanFact(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') throw new Error(`Missing boolean fact: ${key}`);
  return value;
}

describe('M1 synthetic fixture integration', () => {
  it('requires the exact evidenced TRRS to TRS adapter and confirms plug-in power', () => {
    const claim = edge('n7-lav-r');
    const camera = product('novacam-n7');
    const microphone = product('echomic-lav-r');
    const adapter = product('echomic-trrs-trs-adapter');
    const result = evaluateAudioCompatibility({
      host: {
        id: camera.id,
        inputs: [
          {
            id: 'n7-audio-input',
            connector: 'TRS_3_5',
            signal: 'analog_mic',
            protocols: ['analog_unbalanced_audio'],
            channels: numberFact(camera.specs, 'audioInputChannels'),
            plugInPower: booleanFact(camera.specs, 'plugInPower'),
            evidenceIds: claim.evidenceIds,
          },
        ],
        evidenceIds: claim.evidenceIds,
      },
      source: {
        id: microphone.id,
        output: {
          id: 'lav-r-output',
          connector: 'TRRS_3_5',
          signal: 'analog_mic',
          protocols: ['analog_unbalanced_audio'],
          channels: numberFact(microphone.specs, 'channels'),
          evidenceIds: claim.evidenceIds,
        },
        requiredPower: 'plug_in_power',
        evidenceIds: claim.evidenceIds,
      },
      adapters: [
        {
          id: adapter.id,
          fromConnector: 'TRRS_3_5',
          toConnector: 'TRS_3_5',
          fromSignal: 'analog_mic',
          toSignal: 'analog_mic',
          protocols: ['analog_unbalanced_audio'],
          verified: true,
          passesPlugInPower: booleanFact(adapter.specs, 'passesPlugInPower'),
          evidenceIds: claim.evidenceIds,
          limitations: claim.limitations,
        },
      ],
    });

    expect(result.status).toBe('compatible_with_limitations');
    expect(result.requiredAdapterIds).toEqual(claim.requiredProductIds);
    expect(result.dimensions.electrical.status).toBe('compatible');
  });

  it('reports exact mount conversion while preserving electronic limitations', () => {
    const claim = edge('x1-l50');
    const camera = product('novacam-x1');
    const lens = product('clearlens-l50');
    const adapter = product('clearlens-x-l-adapter');
    const result = evaluateOpticsCompatibility({
      camera: {
        id: camera.id,
        mount: stringFact(camera.specs, 'lensMount'),
        sensorDiagonalMm: numberFact(camera.specs, 'sensorDiagonalMm'),
        supportsAutofocus: booleanFact(camera.specs, 'supportsAutofocus'),
        supportsElectronicAperture: booleanFact(camera.specs, 'supportsElectronicAperture'),
        supportsStabilization: booleanFact(camera.specs, 'supportsStabilization'),
        supportsExif: booleanFact(camera.specs, 'supportsExif'),
        evidenceIds: claim.evidenceIds,
      },
      lens: {
        id: lens.id,
        mount: stringFact(lens.specs, 'lensMount'),
        imageCircleMm: numberFact(lens.specs, 'imageCircleMm'),
        autofocus: booleanFact(lens.specs, 'autofocus'),
        electronicAperture: booleanFact(lens.specs, 'apertureControl'),
        stabilization: booleanFact(lens.specs, 'stabilization'),
        exif: booleanFact(lens.specs, 'exif'),
        evidenceIds: claim.evidenceIds,
      },
      adapter: {
        id: adapter.id,
        cameraMount: stringFact(adapter.specs, 'inputMount'),
        lensMount: stringFact(adapter.specs, 'outputMount'),
        verified: true,
        autofocus: booleanFact(adapter.specs, 'autofocus'),
        apertureControl: booleanFact(adapter.specs, 'apertureControl'),
        stabilization: booleanFact(adapter.specs, 'stabilization'),
        exif: booleanFact(adapter.specs, 'exif'),
        limitations: claim.limitations,
        evidenceIds: claim.evidenceIds,
      },
    });

    expect(result.status).toBe('compatible_with_limitations');
    expect(result.requiredAdapterIds).toEqual(claim.requiredProductIds);
    expect(result.dimensions.mechanical.status).toBe('compatible');
    expect(result.dimensions.autofocus.status).toBe('incompatible');
  });

  it('accepts the complete N7 event card only when format, speed and capacity are evidenced', () => {
    const camera = product('novacam-n7');
    const card = product('swiftcard-v90-1024');
    const mode = fixture.recordingModes.find((item) => item.id === 'n7-4k60');
    if (!mode) throw new Error('Missing recording mode: n7-4k60');
    const cardEvidence = card.specs.evidenceIds;
    if (!Array.isArray(cardEvidence) || !cardEvidence.every((id) => typeof id === 'string')) {
      throw new Error('Missing card evidence.');
    }
    const result = evaluateMemoryCompatibility({
      deviceMedia: [
        {
          format: 'sd',
          maximumCapacityGB: numberFact(camera.specs, 'maxMediaCapacityGb'),
          evidenceIds: mode.evidenceIds,
        },
      ],
      mode: {
        id: mode.id,
        bitrateMbps: mode.bitrateMbps,
        mediaRequirements: {
          mediaFormats: mode.mediaFormats,
          minimumSustainedWriteMBps: mode.minimumSustainedWriteMBps,
          minimumSpeedClassMBps: Number(mode.minimumSpeedClass.slice(1)),
          evidenceIds: mode.evidenceIds,
        },
        evidenceIds: mode.evidenceIds,
      },
      card: {
        id: card.id,
        format: stringFact(card.specs, 'mediaFormat'),
        capacityGB: numberFact(card.specs, 'capacityGb'),
        sustainedWriteMBps: numberFact(card.specs, 'sustainedWriteMBps'),
        guaranteedSpeedClassMBps: 90,
        evidenceIds: cardEvidence,
      },
      safetyHeadroom: 1 + mode.safetyMarginPercent / 100,
    });

    expect(isPositiveStatus(result.status)).toBe(true);
    expect(result.dimensions.capacity.status).toBe('compatible');
    expect(result.dimensions.sustainedWrite.status).toBe('compatible');
    expect(result.estimatedRecordingSeconds).toBeGreaterThan(10_000);
  });
});
