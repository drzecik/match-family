import { describe, expect, it } from 'vitest';
import {
  evaluateOpticsCompatibility,
  type CameraOpticsProfile,
  type LensOpticsProfile,
} from '../src/index.js';

const camera: CameraOpticsProfile = {
  id: 'camera',
  mount: 'NOVA_E',
  sensorDiagonalMm: 28.2,
  supportsAutofocus: true,
  supportsElectronicAperture: true,
  supportsStabilization: true,
  supportsExif: true,
  evidenceIds: ['camera-manual'],
};
const lens = (overrides: Partial<LensOpticsProfile> = {}): LensOpticsProfile => ({
  id: 'lens',
  mount: 'NOVA_E',
  imageCircleMm: 30,
  autofocus: true,
  electronicAperture: true,
  stabilization: true,
  exif: true,
  filterThreadMm: 67,
  weightGrams: 450,
  evidenceIds: ['lens-spec'],
  ...overrides,
});

describe('evaluateOpticsCompatibility', () => {
  it('accepts a same-mount lens with sensor coverage', () => {
    const result = evaluateOpticsCompatibility({ camera, lens: lens() });
    expect(result.status).toBe('directly_compatible');
    expect(result.filterThreadMm).toBe(67);
  });

  it('uses only a verified, evidence-backed mount adapter', () => {
    const adaptedLens = lens({ mount: 'CLEAR_F' });
    const result = evaluateOpticsCompatibility({
      camera,
      lens: adaptedLens,
      adapter: {
        id: 'f-e',
        lensMount: 'CLEAR_F',
        cameraMount: 'NOVA_E',
        verified: true,
        evidenceIds: ['adapter-manual'],
        autofocus: true,
        apertureControl: true,
        stabilization: true,
        exif: true,
      },
    });
    expect(result.status).toBe('compatible_with_adapter');
    expect(result.requiredAdapterIds).toEqual(['f-e']);
  });

  it('distinguishes manual-only and unconfirmed electronics', () => {
    const result = evaluateOpticsCompatibility({
      camera,
      lens: lens({ mount: 'CLEAR_F' }),
      adapter: {
        id: 'manual',
        lensMount: 'CLEAR_F',
        cameraMount: 'NOVA_E',
        verified: true,
        evidenceIds: ['manual'],
        autofocus: false,
        apertureControl: false,
      },
    });
    expect(result.manualOnly).toBe(true);
    expect(result.dimensions.stabilization.status).toBe('unknown');
    expect(result.limitations.some((item) => item.includes('not confirmed'))).toBe(true);
  });

  it('rejects a lens whose image circle does not cover the sensor', () => {
    const result = evaluateOpticsCompatibility({ camera, lens: lens({ imageCircleMm: 20 }) });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.coverage.status).toBe('incompatible');
  });

  it('reports adapter crop', () => {
    const result = evaluateOpticsCompatibility({
      camera,
      lens: lens({ mount: 'CLEAR_F' }),
      adapter: {
        id: 'crop-adapter',
        lensMount: 'CLEAR_F',
        cameraMount: 'NOVA_E',
        verified: true,
        evidenceIds: ['adapter-manual'],
        autofocus: true,
        apertureControl: true,
        stabilization: true,
        exif: true,
        cropFactor: 1.5,
      },
    });
    expect(result.causesCrop).toBe(true);
    expect(result.dimensions.coverage.status).toBe('compatible_with_limitations');
  });

  it('does not treat two absent mount names as a physical match', () => {
    const result = evaluateOpticsCompatibility({
      camera: { ...camera, mount: '' },
      lens: lens({ mount: '' }),
    });
    expect(result.status).toBe('unknown');
    expect(result.dimensions.mechanical.status).toBe('unknown');
  });

  it('does not publish optical compatibility without endpoint evidence', () => {
    const result = evaluateOpticsCompatibility({
      camera: { ...camera, evidenceIds: [] },
      lens: lens(),
    });
    expect(result.status).toBe('unknown');
  });

  it('does not consume electronic claims from an unverified adapter', () => {
    const result = evaluateOpticsCompatibility({
      camera,
      lens: lens({ mount: 'CLEAR_F' }),
      adapter: {
        id: 'candidate',
        lensMount: 'CLEAR_F',
        cameraMount: 'NOVA_E',
        verified: false,
        evidenceIds: [],
        autofocus: true,
        apertureControl: true,
      },
    });
    expect(result.status).toBe('unknown');
    expect(result.dimensions.autofocus.status).toBe('unknown');
  });
});
