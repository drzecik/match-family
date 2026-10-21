import { describe, expect, it } from 'vitest';
import { evaluateLightingRig, type LightingRigEvaluationInput } from '../src/lighting-rig.js';

const base: LightingRigEvaluationInput = {
  light: {
    id: 'light-a',
    standMountInput: 'five_eighths_spigot',
    modifierMount: 'bowens_s',
    bodyDiameterMm: 120,
    minimumModifierClearApertureMm: 100,
    weightGrams: 2200,
    powerMode: 'external_required',
    inputVoltageV: 48,
    requiredPowerWatts: 200,
    wirelessProtocols: ['mesh_light_1'],
    evidenceIds: ['ev-light'],
  },
  modifier: {
    id: 'softbox-a',
    mountInput: 'bowens_s',
    mountOutput: 'softbox_grid_a',
    maximumLightDiameterMm: 140,
    clearApertureMm: 110,
    weightGrams: 800,
    evidenceIds: ['ev-softbox'],
  },
  grid: {
    id: 'grid-a',
    mountInput: 'softbox_grid_a',
    weightGrams: 100,
    evidenceIds: ['ev-grid'],
  },
  stand: {
    id: 'stand-a',
    mountOutput: 'five_eighths_spigot',
    maxPayloadGrams: 4000,
    evidenceIds: ['ev-stand'],
  },
  powerSource: {
    id: 'psu-a',
    outputVoltageV: 48,
    maxPowerWatts: 240,
    compatibleLightIds: ['light-a'],
    evidenceIds: ['ev-psu'],
  },
  controller: {
    id: 'controller-a',
    wirelessProtocols: ['mesh_light_1'],
    compatibleLightIds: ['light-a'],
    evidenceIds: ['ev-controller'],
  },
  requiredPayloadMarginPercent: 20,
  controlRequired: true,
  claim: {
    id: 'lighting-rig-a',
    lightId: 'light-a',
    modifierId: 'softbox-a',
    gridId: 'grid-a',
    standId: 'stand-a',
    powerSourceId: 'psu-a',
    controllerId: 'controller-a',
    totalMountedWeightGrams: 3100,
    requiredPayloadMarginPercent: 20,
    requiredVoltageV: 48,
    requiredPowerWatts: 200,
    wirelessProtocol: 'mesh_light_1',
    controlRequired: true,
    collisionStatus: 'clear',
    verificationStatus: 'verified',
    conditions: [],
    limitations: [],
    evidenceIds: ['ev-lighting-rig'],
  },
};

function evaluate(overrides: Partial<LightingRigEvaluationInput> = {}) {
  return evaluateLightingRig({ ...base, ...overrides });
}

describe('evaluateLightingRig', () => {
  it('accepts a fully evidenced light, modifier, stand, power, and control rig', () => {
    const result = evaluate();
    expect(result.status).toBe('directly_compatible');
    expect(result.requiredStandCapacityGrams).toBe(3720);
    expect(result.requiredItemIds).toEqual([
      'stand-a',
      'softbox-a',
      'grid-a',
      'psu-a',
      'controller-a',
    ]);
  });

  it('does not require a modifier mount when the exact rig has no modifier or grid', () => {
    const { modifierId: _modifierId, gridId: _gridId, ...unmodifiedClaim } = base.claim;
    const { modifier: _modifier, grid: _grid, ...withoutOptics } = base;
    void _modifierId;
    void _gridId;
    void _modifier;
    void _grid;
    const result = evaluateLightingRig({
      ...withoutOptics,
      light: { ...base.light, modifierMount: '', minimumModifierClearApertureMm: 0 },
      claim: {
        ...unmodifiedClaim,
        totalMountedWeightGrams: base.light.weightGrams,
      },
    });
    expect(result.status).toBe('directly_compatible');
    expect(result.dimensions.mountChain.status).toBe('compatible');
  });

  it('rejects a stand mount mismatch', () => {
    const result = evaluate({ stand: { ...base.stand, mountOutput: 'quarter_20' } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.mountChain.status).toBe('incompatible');
  });

  it('rejects a modifier mount mismatch', () => {
    const result = evaluate({ modifier: { ...base.modifier!, mountInput: 'proprietary_mount' } });
    expect(result.status).toBe('incompatible');
  });

  it('rejects a grid mount mismatch', () => {
    const result = evaluate({ grid: { ...base.grid!, mountInput: 'other_grid_mount' } });
    expect(result.status).toBe('incompatible');
  });

  it('rejects a modifier that is too small for the light', () => {
    const result = evaluate({ modifier: { ...base.modifier!, maximumLightDiameterMm: 119 } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.modifierDiameter.status).toBe('incompatible');
  });

  it('rejects a modifier with insufficient clear aperture', () => {
    const result = evaluate({ modifier: { ...base.modifier!, clearApertureMm: 99 } });
    expect(result.status).toBe('incompatible');
  });

  it('rejects a stand below mounted weight with margin', () => {
    const result = evaluate({ stand: { ...base.stand, maxPayloadGrams: 3719 } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.standPayload.status).toBe('incompatible');
  });

  it('rejects wrong voltage even when connector and power are sufficient', () => {
    const result = evaluate({ powerSource: { ...base.powerSource!, outputVoltageV: 24 } });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.electricalPower.status).toBe('incompatible');
  });

  it('rejects insufficient documented source power', () => {
    const result = evaluate({ powerSource: { ...base.powerSource!, maxPowerWatts: 199 } });
    expect(result.status).toBe('incompatible');
  });

  it('rejects a source not documented for the exact light', () => {
    const result = evaluate({
      powerSource: { ...base.powerSource!, compatibleLightIds: ['light-b'] },
    });
    expect(result.status).toBe('incompatible');
  });

  it('rejects a missing exact source for an externally powered light', () => {
    const result = evaluateLightingRig({
      light: base.light,
      modifier: base.modifier!,
      grid: base.grid!,
      stand: base.stand,
      controller: base.controller!,
      requiredPayloadMarginPercent: base.requiredPayloadMarginPercent,
      controlRequired: base.controlRequired,
      claim: {
        id: base.claim.id,
        lightId: base.claim.lightId,
        modifierId: base.claim.modifierId!,
        gridId: base.claim.gridId!,
        standId: base.claim.standId,
        controllerId: base.claim.controllerId!,
        totalMountedWeightGrams: base.claim.totalMountedWeightGrams,
        requiredPayloadMarginPercent: base.claim.requiredPayloadMarginPercent,
        requiredVoltageV: base.claim.requiredVoltageV,
        requiredPowerWatts: base.claim.requiredPowerWatts,
        wirelessProtocol: base.claim.wirelessProtocol!,
        controlRequired: base.claim.controlRequired,
        collisionStatus: base.claim.collisionStatus,
        verificationStatus: 'verified',
        conditions: [],
        limitations: [],
        evidenceIds: base.claim.evidenceIds,
      },
    });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.electricalPower.status).toBe('incompatible');
    expect(result.requiredItemIds).toEqual([]);
  });

  it('rejects an incompatible wireless protocol', () => {
    const result = evaluate({
      controller: { ...base.controller!, wirelessProtocols: ['bluetooth_other'] },
    });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.wirelessControl.status).toBe('incompatible');
  });

  it('fails closed when collision status is unknown', () => {
    const result = evaluate({ claim: { ...base.claim, collisionStatus: 'unknown' } });
    expect(result.status).toBe('unknown');
    expect(result.requiredItemIds).toEqual([]);
  });

  it('fails closed for a candidate lighting claim', () => {
    const result = evaluate({ claim: { ...base.claim, verificationStatus: 'candidate' } });
    expect(result.status).toBe('unknown');
    expect(result.evidenceIds).toEqual([]);
  });

  it('fails closed without exact power-source evidence', () => {
    const result = evaluate({ powerSource: { ...base.powerSource!, evidenceIds: [] } });
    expect(result.status).toBe('unknown');
  });

  it('fails closed when claim weight does not equal the selected components', () => {
    const result = evaluate({ claim: { ...base.claim, totalMountedWeightGrams: 3000 } });
    expect(result.status).toBe('unknown');
  });

  it('preserves exact lighting limitations', () => {
    const result = evaluate({ claim: { ...base.claim, limitations: ['Indoor use only.'] } });
    expect(result.status).toBe('compatible_with_limitations');
  });
});
