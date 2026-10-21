import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  evaluateCageCompatibility,
  type CageMechanicalProfile,
  type CageRigRequirements,
} from '../packages/compatibility-evaluator/src/index.js';

interface FixtureCage {
  readonly id: string;
  readonly subcategory: string;
  readonly synthetic: boolean;
  readonly notForProduction: boolean;
  readonly specs: {
    readonly compatibleDeviceIds?: readonly string[];
    readonly incompatibleDeviceIds?: readonly string[];
    readonly supportedCameraAttachments?: readonly string[];
    readonly accessoryMounts?: readonly string[];
    readonly accessiblePorts?: readonly string[];
    readonly accessibleDoors?: readonly string[];
    readonly evidenceIds?: readonly string[];
  };
}

interface FixtureCageRigProfile extends CageRigRequirements {
  readonly id: string;
  readonly deviceId: string;
  readonly lensId?: string;
  readonly audioId: string;
  readonly mediaId?: string;
  readonly cameraAttachment: string;
  readonly requiredAccessoryMounts: readonly string[];
  readonly requiredAccessiblePorts: readonly string[];
  readonly requiredAccessibleDoors: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly synthetic: boolean;
  readonly notForProduction: boolean;
}

interface ExactRigSelection {
  readonly deviceId: string;
  readonly lensId?: string;
  readonly audioId: string;
  readonly mediaId?: string;
}

interface Fixture {
  readonly products: readonly FixtureCage[];
  readonly cageRigProfiles: readonly FixtureCageRigProfile[];
}

const fixture = JSON.parse(
  readFileSync(new URL('../data/fixtures/demo-catalog.json', import.meta.url), 'utf8'),
) as unknown as Fixture;

function exactProfile(selection: ExactRigSelection): FixtureCageRigProfile | undefined {
  return fixture.cageRigProfiles.find(
    (profile) =>
      profile.deviceId === selection.deviceId &&
      profile.lensId === selection.lensId &&
      profile.audioId === selection.audioId &&
      profile.mediaId === selection.mediaId,
  );
}

function cage(id: string): CageMechanicalProfile {
  const product = fixture.products.find((item) => item.id === id);
  if (!product || product.subcategory !== 'cage') throw new Error(`Missing fixture cage: ${id}`);
  return {
    id: product.id,
    compatibleDeviceIds: product.specs.compatibleDeviceIds ?? [],
    incompatibleDeviceIds: product.specs.incompatibleDeviceIds ?? [],
    supportedCameraAttachments: product.specs.supportedCameraAttachments ?? [],
    accessoryMounts: product.specs.accessoryMounts ?? [],
    accessiblePorts: product.specs.accessiblePorts ?? [],
    accessibleDoors: product.specs.accessibleDoors ?? [],
    evidenceIds: product.specs.evidenceIds ?? [],
  };
}

function evaluateExactSelection(cageId: string, selection: ExactRigSelection): string {
  const profile = exactProfile(selection);
  if (!profile) return 'unknown';
  return evaluateCageCompatibility(cage(cageId), profile).status;
}

const n7TravelSelection: ExactRigSelection = {
  deviceId: 'novacam-n7',
  lensId: 'clearlens-n23',
  audioId: 'echomic-shot-s',
  mediaId: 'swiftcard-v90-512',
};

describe('synthetic exact cage fixture integration', () => {
  it('matches the exact N7 travel rig to its body-specific cage', () => {
    const profile = exactProfile(n7TravelSelection);
    expect(profile?.evidenceIds).toContain('ev-cage-rig-requirements');
    expect(evaluateExactSelection('motionrig-n7-form-cage', n7TravelSelection)).toBe(
      'directly_compatible',
    );
  });

  it('reports a physical body conflict for the X1-specific cage on N7', () => {
    const profile = exactProfile(n7TravelSelection);
    if (!profile) throw new Error('Missing exact N7 cage requirements.');
    const result = evaluateCageCompatibility(cage('motionrig-x1-form-cage'), profile);
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.enclosureFit.status).toBe('incompatible');
  });

  it('returns unknown instead of reusing a profile after an exact component changes', () => {
    const changedMicrophone = exactProfile({
      ...n7TravelSelection,
      audioId: 'echomic-air-c-rx',
    });
    const changedMedia = exactProfile({
      ...n7TravelSelection,
      mediaId: 'swiftcard-cfxb-256',
    });
    expect(changedMicrophone).toBeUndefined();
    expect(changedMedia).toBeUndefined();
    expect(
      evaluateExactSelection('motionrig-n7-form-cage', {
        ...n7TravelSelection,
        audioId: 'echomic-air-c-rx',
      }),
    ).toBe('unknown');
  });

  it('keeps every cage and exact profile synthetic and non-production', () => {
    const cages = fixture.products.filter((item) => item.subcategory === 'cage');
    expect(cages.length).toBeGreaterThanOrEqual(4);
    expect(
      [...cages, ...fixture.cageRigProfiles].every(
        (item) => item.synthetic && item.notForProduction,
      ),
    ).toBe(true);
  });
});
