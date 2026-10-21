import { describe, expect, it } from 'vitest';
import { evaluateGimbalCompatibility, type GimbalEvaluationInput } from '../src/index.js';

const input = (overrides: Partial<GimbalEvaluationInput> = {}): GimbalEvaluationInput => ({
  gimbal: {
    id: 'gimbal-pro',
    ratedPayloadGrams: 1800,
    payloadSafetyMarginPercent: 20,
    supportedCameraMounts: ['quarter_20'],
    maximumPackageWidthMm: 160,
    maximumPackageHeightMm: 120,
    maximumPackageDepthMm: 200,
    maximumCenterOfGravityOffsetMm: 75,
    evidenceIds: ['gimbal-manual'],
  },
  rig: {
    id: 'camera-lens-rig',
    cameraMount: 'quarter_20',
    packageWidthMm: 124,
    packageHeightMm: 84,
    packageDepthMm: 132,
    centerOfGravityOffsetMm: 42,
    conditions: ['Microphone remains centred above the camera.'],
    evidenceIds: ['rig-mechanical-profile'],
  },
  payloadComponents: [
    { id: 'camera', weightGrams: 495 },
    { id: 'lens', weightGrams: 210 },
    { id: 'microphone', weightGrams: 86 },
  ],
  ...overrides,
});

describe('evaluateGimbalCompatibility', () => {
  it('confirms payload, mounting, clearance and balance independently', () => {
    const result = evaluateGimbalCompatibility(input());
    expect(result.status).toBe('directly_compatible');
    expect(result.payloadWeightGrams).toBe(791);
    expect(result.recommendedMaximumPayloadGrams).toBe(1440);
    expect(result.dimensions.clearance.status).toBe('compatible');
  });

  it('rejects payload above the rated limit', () => {
    const result = evaluateGimbalCompatibility(
      input({ payloadComponents: [{ id: 'camera', weightGrams: 1900 }] }),
    );
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.payload.status).toBe('incompatible');
  });

  it('distinguishes rated payload from the safety threshold', () => {
    const result = evaluateGimbalCompatibility(
      input({ payloadComponents: [{ id: 'camera', weightGrams: 1500 }] }),
    );
    expect(result.status).toBe('compatible_with_limitations');
    expect(result.recommendedPayloadHeadroomGrams).toBe(-60);
  });

  it('rejects physical clearance even when payload is sufficient', () => {
    const base = input();
    const result = evaluateGimbalCompatibility(
      input({ rig: { ...base.rig, packageDepthMm: 240 } }),
    );
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.clearance.status).toBe('incompatible');
  });

  it('does not infer a mounting standard from physical similarity', () => {
    const base = input();
    const result = evaluateGimbalCompatibility(
      input({ rig: { ...base.rig, cameraMount: 'phone_clamp' } }),
    );
    expect(result.dimensions.mounting.status).toBe('incompatible');
  });

  it('returns unknown for missing component weight', () => {
    const result = evaluateGimbalCompatibility(
      input({ payloadComponents: [{ id: 'unknown-cable' }] }),
    );
    expect(result.status).toBe('unknown');
    expect(result.dimensions.payload.status).toBe('unknown');
  });

  it('returns unknown rather than a recommendation without scoped evidence', () => {
    const base = input();
    const result = evaluateGimbalCompatibility(
      input({ gimbal: { ...base.gimbal, evidenceIds: [] } }),
    );
    expect(result.status).toBe('unknown');
    expect(result.evidenceIds).toEqual([]);
  });

  it('rejects an out-of-range center of gravity', () => {
    const base = input();
    const result = evaluateGimbalCompatibility(
      input({ rig: { ...base.rig, centerOfGravityOffsetMm: 90 } }),
    );
    expect(result.dimensions.balance.status).toBe('incompatible');
  });
});
