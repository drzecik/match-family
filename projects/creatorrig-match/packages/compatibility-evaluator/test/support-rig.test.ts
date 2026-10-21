import { describe, expect, it } from 'vitest';
import { evaluateSupportRig, type SupportRigEvaluationInput } from '../src/support-rig.js';

const base: SupportRigEvaluationInput = {
  rig: {
    deviceId: 'camera-a',
    productIds: ['camera-a', 'lens-a', 'cage-a'],
    mountOutput: 'arca_swiss',
    plateStandard: 'arca_swiss',
    accessoryMounts: ['teleprompter_rail_a'],
    totalPayloadGrams: 2000,
    widthMm: 160,
    evidenceIds: ['ev-rig'],
  },
  head: {
    id: 'head-a',
    mountInput: 'arca_swiss',
    mountOutput: 'three_eighths_16',
    plateStandards: ['arca_swiss'],
    maxPayloadGrams: 3000,
    weightGrams: 500,
    evidenceIds: ['ev-head'],
  },
  tripod: {
    id: 'tripod-a',
    mountInput: 'three_eighths_16',
    maxPayloadGrams: 4000,
    evidenceIds: ['ev-tripod'],
  },
  teleprompter: {
    id: 'prompter-a',
    mountInput: 'teleprompter_rail_a',
    supportedPlateStandards: ['arca_swiss'],
    maxPayloadGrams: 2500,
    maxRigWidthMm: 180,
    evidenceIds: ['ev-prompter'],
  },
  requiredPayloadMarginPercent: 20,
  claim: {
    id: 'support-path-a',
    deviceId: 'camera-a',
    rigProductIds: ['camera-a', 'lens-a', 'cage-a'],
    headId: 'head-a',
    tripodId: 'tripod-a',
    teleprompterId: 'prompter-a',
    totalPayloadGrams: 2000,
    requiredPayloadMarginPercent: 20,
    collisionStatus: 'clear',
    verificationStatus: 'verified',
    conditions: [],
    limitations: [],
    evidenceIds: ['ev-support-path'],
  },
};

function evaluate(overrides: Partial<SupportRigEvaluationInput> = {}) {
  return evaluateSupportRig({ ...base, ...overrides });
}

describe('evaluateSupportRig', () => {
  it('accepts an exact support chain with payload margin', () => {
    const result = evaluate();
    expect(result.status).toBe('directly_compatible');
    expect(result.requiredItemIds).toEqual(['head-a', 'tripod-a', 'prompter-a']);
    expect(result.headRequiredCapacityGrams).toBe(2400);
    expect(result.tripodRequiredCapacityGrams).toBe(3000);
  });

  it('rejects the rig-to-head mount mismatch', () => {
    const result = evaluate({ head: { ...base.head, mountInput: 'manfrotto_501' } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.mountChain.status).toBe('incompatible');
  });

  it('rejects the head-to-tripod mount mismatch', () => {
    const result = evaluate({ tripod: { ...base.tripod, mountInput: 'quarter_20' } });
    expect(result.status).toBe('incompatible');
  });

  it('rejects a head below the required payload margin', () => {
    const result = evaluate({ head: { ...base.head, maxPayloadGrams: 2399 } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.payloadMargin.explanation).toContain('tripod head');
  });

  it('rejects a tripod below combined rig and head weight with margin', () => {
    const result = evaluate({ tripod: { ...base.tripod, maxPayloadGrams: 2999 } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.payloadMargin.explanation).toContain('tripod');
  });

  it('rejects an unsupported plate standard', () => {
    const result = evaluate({ head: { ...base.head, plateStandards: ['manfrotto_501'] } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.plateCompatibility.status).toBe('incompatible');
  });

  it('rejects a rig wider than the teleprompter envelope', () => {
    const result = evaluate({ rig: { ...base.rig, widthMm: 181 } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.clearanceWeight.status).toBe('incompatible');
  });

  it('rejects an explicitly documented collision', () => {
    const result = evaluate({ claim: { ...base.claim, collisionStatus: 'conflict' } });
    expect(result.status).toBe('incompatible');
  });

  it('returns unknown when clearance is not verified', () => {
    const result = evaluate({ claim: { ...base.claim, collisionStatus: 'unknown' } });
    expect(result.status).toBe('unknown');
    expect(result.requiredItemIds).toEqual([]);
  });

  it('fails closed for a candidate support claim', () => {
    const result = evaluate({ claim: { ...base.claim, verificationStatus: 'candidate' } });
    expect(result.status).toBe('unknown');
    expect(result.evidenceIds).toEqual([]);
  });

  it('fails closed without head evidence', () => {
    const result = evaluate({ head: { ...base.head, evidenceIds: [] } });
    expect(result.status).toBe('unknown');
  });

  it('does not match reordered duplicates as an exact rig product set', () => {
    const result = evaluate({ rig: { ...base.rig, productIds: ['camera-a', 'lens-a', 'lens-a'] } });
    expect(result.status).toBe('unknown');
  });

  it('preserves exact support limitations', () => {
    const result = evaluate({ claim: { ...base.claim, limitations: ['Indoor use only.'] } });
    expect(result.status).toBe('compatible_with_limitations');
  });
});
