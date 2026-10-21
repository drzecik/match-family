import { describe, expect, it } from 'vitest';
import {
  evaluateFilterMatteBoxCompatibility,
  type FilterMatteBoxEvaluationInput,
} from '../src/filter-matte-box.js';

const baseInput: FilterMatteBoxEvaluationInput = {
  deviceId: 'novacam-ff1',
  sensorDiagonalMm: 43.3,
  deviceEvidenceIds: ['ev-camera-sensor'],
  lens: {
    id: 'clearlens-prime-35',
    filterThreadMm: 67,
    outerDiameterMm: 80,
    imageCircleMm: 44,
    minimumClearApertureMm: 60,
    evidenceIds: ['ev-lens-front'],
  },
  stepUpRing: {
    id: 'ring-67-82',
    inputThreadDiameterMm: 67,
    outputThreadDiameterMm: 82,
    directional: true,
    clearApertureMm: 65,
    evidenceIds: ['ev-ring'],
  },
  filter: {
    id: 'filter-nd-82',
    filterThreadMm: 82,
    clearApertureMm: 78,
    evidenceIds: ['ev-filter'],
  },
  matteBox: {
    id: 'matte-box-80',
    clampDiameterMm: 80,
    supportedLensOuterDiameterMm: 80,
    clearApertureMm: 90,
    maximumSupportedFilterDiameterMm: 82,
    evidenceIds: ['ev-matte-box'],
  },
  configuration: {
    id: 'filter-rig-prime-35-full',
    deviceId: 'novacam-ff1',
    lensId: 'clearlens-prime-35',
    stepUpRingId: 'ring-67-82',
    filterId: 'filter-nd-82',
    matteBoxId: 'matte-box-80',
    sensorDiagonalMm: 43.3,
    collisionStatus: 'clear',
    vignettingStatus: 'clear',
    conditions: ['At 35 mm and with the documented clamp installed.'],
    limitations: [],
    evidenceIds: ['ev-exact-filter-rig'],
  },
};

type EvaluationOverrides = Partial<
  Omit<FilterMatteBoxEvaluationInput, 'stepUpRing' | 'filter' | 'matteBox'>
> & {
  readonly stepUpRing?: FilterMatteBoxEvaluationInput['stepUpRing'] | undefined;
  readonly filter?: FilterMatteBoxEvaluationInput['filter'] | undefined;
  readonly matteBox?: FilterMatteBoxEvaluationInput['matteBox'] | undefined;
};

function evaluate(overrides: EvaluationOverrides = {}) {
  const { stepUpRing, filter, matteBox, ...required } = { ...baseInput, ...overrides };
  return evaluateFilterMatteBoxCompatibility({
    ...required,
    ...(stepUpRing === undefined ? {} : { stepUpRing }),
    ...(filter === undefined ? {} : { filter }),
    ...(matteBox === undefined ? {} : { matteBox }),
  });
}

describe('evaluateFilterMatteBoxCompatibility', () => {
  it('accepts an exact direct lens-to-filter path', () => {
    const directConfiguration = {
      id: baseInput.configuration.id,
      deviceId: baseInput.configuration.deviceId,
      lensId: baseInput.configuration.lensId,
      filterId: baseInput.configuration.filterId!,
      sensorDiagonalMm: baseInput.configuration.sensorDiagonalMm,
      collisionStatus: baseInput.configuration.collisionStatus,
      vignettingStatus: baseInput.configuration.vignettingStatus,
      conditions: baseInput.configuration.conditions,
      limitations: baseInput.configuration.limitations,
      evidenceIds: baseInput.configuration.evidenceIds,
    };
    const result = evaluate({
      stepUpRing: undefined,
      matteBox: undefined,
      filter: { ...baseInput.filter!, filterThreadMm: 67 },
      configuration: directConfiguration,
    });

    expect(result.status).toBe('directly_compatible');
    expect(result.requiredAdapterIds).toEqual([]);
    expect(result.terminalFilterThreadMm).toBe(67);
    expect(result.dimensions.threadDiameter.status).toBe('compatible');
    expect(result.dimensions.matteBoxMount.status).toBe('not_applicable');
  });

  it('accepts an exact step-up ring, filter, and matte-box path with an explained adapter', () => {
    const result = evaluate();

    expect(result.status).toBe('compatible_with_adapter');
    expect(result.requiredAdapterIds).toEqual(['ring-67-82']);
    expect(result.selectedAccessoryIds).toEqual(['ring-67-82', 'filter-nd-82', 'matte-box-80']);
    expect(result.terminalFilterThreadMm).toBe(82);
    expect(Object.values(result.dimensions).map(({ status }) => status)).toEqual([
      'compatible',
      'compatible',
      'compatible',
      'compatible',
      'compatible',
      'compatible',
    ]);
    expect(result.evidenceIds).toEqual([
      'ev-camera-sensor',
      'ev-lens-front',
      'ev-ring',
      'ev-filter',
      'ev-matte-box',
      'ev-exact-filter-rig',
    ]);
  });

  it('rejects a reversed step-up ring and does not recommend it', () => {
    const result = evaluate({
      stepUpRing: {
        ...baseInput.stepUpRing!,
        inputThreadDiameterMm: 82,
        outputThreadDiameterMm: 67,
      },
      filter: { ...baseInput.filter!, filterThreadMm: 67 },
    });

    expect(result.status).toBe('incompatible');
    expect(result.requiredAdapterIds).toEqual([]);
    expect(result.dimensions.adapterDirection.status).toBe('incompatible');
    expect(result.dimensions.adapterDirection.explanation).toContain('reversed');
  });

  it('returns unknown when ring directionality is not documented', () => {
    const result = evaluate({
      stepUpRing: { ...baseInput.stepUpRing!, directional: false },
    });

    expect(result.status).toBe('unknown');
    expect(result.requiredAdapterIds).toEqual([]);
    expect(result.dimensions.adapterDirection.status).toBe('unknown');
  });

  it('rejects a filter thread that does not match the upstream thread', () => {
    const result = evaluate({
      filter: { ...baseInput.filter!, filterThreadMm: 77 },
    });

    expect(result.status).toBe('incompatible');
    expect(result.dimensions.threadDiameter.status).toBe('incompatible');
    expect(result.dimensions.threadDiameter.explanation).toContain('77 mm');
  });

  it('rejects a lens image circle that does not cover the exact sensor', () => {
    const result = evaluate({
      lens: { ...baseInput.lens, imageCircleMm: 40 },
    });

    expect(result.status).toBe('incompatible');
    expect(result.dimensions.coverageClearAperture.status).toBe('incompatible');
    expect(result.dimensions.coverageClearAperture.explanation).toContain('does not cover');
  });

  it.each([
    ['step-up ring', { stepUpRing: { ...baseInput.stepUpRing!, clearApertureMm: 59 } }],
    ['filter', { filter: { ...baseInput.filter!, clearApertureMm: 59 } }],
    ['matte box', { matteBox: { ...baseInput.matteBox!, clearApertureMm: 59 } }],
  ] as const)('rejects an obstructing %s clear aperture', (_label, overrides) => {
    const result = evaluate(overrides);

    expect(result.status).toBe('incompatible');
    expect(result.dimensions.coverageClearAperture.status).toBe('incompatible');
    expect(result.dimensions.coverageClearAperture.explanation).toContain('below the lens minimum');
  });

  it('rejects a matte-box clamp that is not exact for the lens barrel', () => {
    const result = evaluate({
      matteBox: { ...baseInput.matteBox!, clampDiameterMm: 85 },
    });

    expect(result.status).toBe('incompatible');
    expect(result.dimensions.matteBoxMount.status).toBe('incompatible');
    expect(result.dimensions.matteBoxMount.explanation).toContain('not explicitly specified');
  });

  it('rejects a front filter larger than the documented matte-box capacity', () => {
    const result = evaluate({
      matteBox: { ...baseInput.matteBox!, maximumSupportedFilterDiameterMm: 77 },
    });

    expect(result.status).toBe('incompatible');
    expect(result.dimensions.matteBoxMount.status).toBe('incompatible');
    expect(result.dimensions.matteBoxMount.explanation).toContain('exceeds');
  });

  it('rejects an exact configuration with a documented collision', () => {
    const result = evaluate({
      configuration: { ...baseInput.configuration, collisionStatus: 'conflict' },
    });

    expect(result.status).toBe('incompatible');
    expect(result.dimensions.collisionVignetting.status).toBe('incompatible');
    expect(result.dimensions.collisionVignetting.explanation).toContain('physical collision');
  });

  it('rejects an exact configuration with documented vignetting', () => {
    const result = evaluate({
      configuration: { ...baseInput.configuration, vignettingStatus: 'conflict' },
    });

    expect(result.status).toBe('incompatible');
    expect(result.dimensions.collisionVignetting.status).toBe('incompatible');
    expect(result.dimensions.collisionVignetting.explanation).toContain('vignetting');
  });

  it('does not infer absence of vignetting from matching diameters', () => {
    const result = evaluate({
      configuration: { ...baseInput.configuration, vignettingStatus: 'unknown' },
    });

    expect(result.status).toBe('unknown');
    expect(result.requiredAdapterIds).toEqual([]);
    expect(result.dimensions.collisionVignetting.status).toBe('unknown');
  });

  it('returns unknown when the exact configuration IDs do not match the selection', () => {
    const result = evaluate({
      configuration: { ...baseInput.configuration, filterId: 'similar-filter-nd-82' },
    });

    expect(result.status).toBe('unknown');
    expect(result.evidenceIds).toEqual([]);
    expect(result.dimensions.evidence.status).toBe('unknown');
    expect(result.dimensions.evidence.explanation).toContain('exactly match');
  });

  it('does not reuse a vignetting claim for a different exact device', () => {
    const result = evaluate({ deviceId: 'novacam-ff1-regional-variant' });

    expect(result.status).toBe('unknown');
    expect(result.evidenceIds).toEqual([]);
    expect(result.dimensions.evidence.status).toBe('unknown');
  });

  it('does not reuse a vignetting claim for a different sensor diagonal', () => {
    const result = evaluate({ sensorDiagonalMm: 28.2 });

    expect(result.status).toBe('unknown');
    expect(result.dimensions.evidence.status).toBe('unknown');
  });

  it.each([
    ['device', { deviceEvidenceIds: [] }],
    ['lens', { lens: { ...baseInput.lens, evidenceIds: [] } }],
    ['ring', { stepUpRing: { ...baseInput.stepUpRing!, evidenceIds: [] } }],
    ['filter', { filter: { ...baseInput.filter!, evidenceIds: [] } }],
    ['matte box', { matteBox: { ...baseInput.matteBox!, evidenceIds: [] } }],
    ['configuration', { configuration: { ...baseInput.configuration, evidenceIds: [] } }],
  ] as const)('fails closed when %s evidence is missing', (_label, overrides) => {
    const result = evaluate(overrides);

    expect(result.status).toBe('unknown');
    expect(result.evidenceIds).toEqual([]);
    expect(result.requiredAdapterIds).toEqual([]);
    expect(result.dimensions.evidence.status).toBe('unknown');
  });

  it('returns a limited result when the exact clear claim has explicit limitations', () => {
    const result = evaluate({
      configuration: {
        ...baseInput.configuration,
        limitations: ['No stacked filters.'],
      },
    });

    expect(result.status).toBe('compatible_with_limitations');
    expect(result.requiredAdapterIds).toEqual(['ring-67-82']);
    expect(result.limitations).toContain('No stacked filters.');
    expect(result.dimensions.collisionVignetting.status).toBe('compatible_with_limitations');
  });

  it('does not produce a positive result when no accessory is selected', () => {
    const emptyConfiguration = {
      id: baseInput.configuration.id,
      deviceId: baseInput.configuration.deviceId,
      lensId: baseInput.configuration.lensId,
      sensorDiagonalMm: baseInput.configuration.sensorDiagonalMm,
      collisionStatus: baseInput.configuration.collisionStatus,
      vignettingStatus: baseInput.configuration.vignettingStatus,
      conditions: baseInput.configuration.conditions,
      limitations: baseInput.configuration.limitations,
      evidenceIds: baseInput.configuration.evidenceIds,
    };
    const result = evaluate({
      stepUpRing: undefined,
      filter: undefined,
      matteBox: undefined,
      configuration: emptyConfiguration,
    });

    expect(result.status).toBe('unknown');
    expect(result.selectedAccessoryIds).toEqual([]);
    expect(result.warnings).toContain('No filter, step-up ring, or matte box was selected.');
  });

  it('keeps model identities exact instead of normalizing similar IDs', () => {
    const result = evaluate({
      lens: { ...baseInput.lens, id: 'ClearLens-Prime-35' },
    });

    expect(result.status).toBe('unknown');
    expect(result.dimensions.evidence.status).toBe('unknown');
  });
});
