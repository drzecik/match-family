import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  evaluateGimbalCompatibility,
  type GimbalMechanicalProfile,
  type RigMechanicalProfile,
} from '../packages/compatibility-evaluator/src/index.js';

interface FixtureProduct {
  readonly id: string;
  readonly subcategory: string;
  readonly weightGrams: number;
  readonly specs: Record<string, unknown>;
}

interface FixtureProfile extends RigMechanicalProfile {
  readonly deviceId: string;
  readonly lensId?: string;
  readonly audioId: string;
  readonly mediaId?: string;
  readonly cageId?: string;
}

interface Fixture {
  readonly products: readonly FixtureProduct[];
  readonly gimbalRigProfiles: readonly FixtureProfile[];
  readonly powerPathProfiles: readonly {
    readonly deviceId: string;
    readonly powerSourceId: string;
    readonly cableId: string;
    readonly expectedStatus: string;
    readonly limitations: readonly string[];
  }[];
  readonly rigs: readonly { readonly id: string; readonly selectedProductIds: readonly string[] }[];
}

const fixture = JSON.parse(
  readFileSync(new URL('../data/fixtures/demo-catalog.json', import.meta.url), 'utf8'),
) as unknown as Fixture;

function gimbal(id: string): GimbalMechanicalProfile {
  const product = fixture.products.find((item) => item.id === id);
  if (!product) throw new Error(`Missing fixture gimbal: ${id}`);
  return { id: product.id, ...product.specs } as unknown as GimbalMechanicalProfile;
}

describe('synthetic gimbal fixture integration', () => {
  it('validates the complete travel rig on the camera gimbal', () => {
    const rig = fixture.rigs.find((item) => item.id === 'complete-travel-rig');
    const profile = fixture.gimbalRigProfiles.find((item) => item.id === 'profile-n7-n23');
    if (!rig || !profile) throw new Error('Missing complete travel rig fixture.');
    const stationaryPowerPath = fixture.powerPathProfiles.find(
      (candidate) =>
        candidate.deviceId === 'novacam-n7' &&
        rig.selectedProductIds.includes(candidate.powerSourceId) &&
        rig.selectedProductIds.includes(candidate.cableId) &&
        candidate.expectedStatus === 'compatible_with_limitations' &&
        candidate.limitations.length > 0,
    );
    if (!stationaryPowerPath) throw new Error('Missing exact stationary power-path fixture.');
    const externalPowerIds = new Set([
      stationaryPowerPath.powerSourceId,
      stationaryPowerPath.cableId,
    ]);
    const payloadComponents = rig.selectedProductIds
      .filter((id) => id !== 'motionrig-flow-pro' && !externalPowerIds.has(id))
      .map((id) => {
        const product = fixture.products.find((item) => item.id === id);
        if (!product) throw new Error(`Missing payload fixture product: ${id}`);
        return { id, weightGrams: product.weightGrams };
      });
    const result = evaluateGimbalCompatibility({
      gimbal: gimbal('motionrig-flow-pro'),
      rig: profile,
      payloadComponents,
    });
    expect(result.status).toBe('directly_compatible');
    expect(profile.cageId).toBe('motionrig-n7-form-cage');
    expect(result.payloadWeightGrams).toBe(1029);
    expect(result.evidenceIds).toContain('ev-motionrig-manual');
    expect(result.evidenceIds).toContain('ev-rig-mechanical-profiles');
  });

  it('rejects the camera rig on the phone-only gimbal', () => {
    const profile = fixture.gimbalRigProfiles.find((item) => item.id === 'profile-n7-n23');
    if (!profile) throw new Error('Missing camera mechanical profile.');
    const result = evaluateGimbalCompatibility({
      gimbal: gimbal('motionrig-pocket-lite'),
      rig: profile,
      payloadComponents: [{ id: 'camera-package', weightGrams: 811 }],
    });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.payload.status).toBe('incompatible');
    expect(result.dimensions.mounting.status).toBe('incompatible');
  });
});
