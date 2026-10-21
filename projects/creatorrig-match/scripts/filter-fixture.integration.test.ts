import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluateFilterMatteBoxCompatibility } from '../packages/compatibility-evaluator/src/index.js';

type SafetyStatus = 'clear' | 'conflict' | 'unknown';

interface FixtureProduct {
  readonly id: string;
  readonly specs: {
    readonly sensorDiagonalMm?: number;
    readonly filterThreadMm?: number;
    readonly outerDiameterMm?: number;
    readonly imageCircleMm?: number;
    readonly minimumClearApertureMm?: number;
    readonly inputThreadDiameterMm?: number;
    readonly outputThreadDiameterMm?: number;
    readonly directional?: boolean;
    readonly clearApertureMm?: number;
    readonly clampDiameterMm?: number;
    readonly supportedLensOuterDiameterMm?: number;
    readonly maximumSupportedFilterDiameterMm?: number;
    readonly evidenceIds?: readonly string[];
  };
}

interface FixtureProfile {
  readonly id: string;
  readonly deviceId: string;
  readonly lensId: string;
  readonly filterId?: string;
  readonly stepUpRingId?: string;
  readonly matteBoxId?: string;
  readonly sensorDiagonalMm: number;
  readonly collisionStatus: SafetyStatus;
  readonly vignettingStatus: SafetyStatus;
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceIds: readonly string[];
}

interface Fixture {
  readonly products: readonly FixtureProduct[];
  readonly filterRigProfiles: readonly FixtureProfile[];
}

const fixture = JSON.parse(
  readFileSync(new URL('../data/fixtures/demo-catalog.json', import.meta.url), 'utf8'),
) as unknown as Fixture;

function evaluate(profileId: string) {
  const profile = fixture.filterRigProfiles.find((item) => item.id === profileId);
  if (!profile) throw new Error(`Missing filter profile: ${profileId}`);
  const product = (id: string): FixtureProduct => {
    const value = fixture.products.find((item) => item.id === id);
    if (!value) throw new Error(`Missing filter fixture product: ${id}`);
    return value;
  };
  const device = product(profile.deviceId);
  const lens = product(profile.lensId);
  const filter = profile.filterId ? product(profile.filterId) : undefined;
  const ring = profile.stepUpRingId ? product(profile.stepUpRingId) : undefined;
  const matteBox = profile.matteBoxId ? product(profile.matteBoxId) : undefined;

  return evaluateFilterMatteBoxCompatibility({
    deviceId: device.id,
    sensorDiagonalMm: device.specs.sensorDiagonalMm ?? Number.NaN,
    deviceEvidenceIds: device.specs.evidenceIds ?? [],
    lens: {
      id: lens.id,
      ...(lens.specs.filterThreadMm === undefined
        ? {}
        : { filterThreadMm: lens.specs.filterThreadMm }),
      ...(lens.specs.outerDiameterMm === undefined
        ? {}
        : { outerDiameterMm: lens.specs.outerDiameterMm }),
      imageCircleMm: lens.specs.imageCircleMm ?? Number.NaN,
      minimumClearApertureMm: lens.specs.minimumClearApertureMm ?? Number.NaN,
      evidenceIds: lens.specs.evidenceIds ?? [],
    },
    ...(ring
      ? {
          stepUpRing: {
            id: ring.id,
            inputThreadDiameterMm: ring.specs.inputThreadDiameterMm ?? Number.NaN,
            outputThreadDiameterMm: ring.specs.outputThreadDiameterMm ?? Number.NaN,
            directional: ring.specs.directional ?? false,
            clearApertureMm: ring.specs.clearApertureMm ?? Number.NaN,
            evidenceIds: ring.specs.evidenceIds ?? [],
          },
        }
      : {}),
    ...(filter
      ? {
          filter: {
            id: filter.id,
            filterThreadMm: filter.specs.filterThreadMm ?? Number.NaN,
            clearApertureMm: filter.specs.clearApertureMm ?? Number.NaN,
            evidenceIds: filter.specs.evidenceIds ?? [],
          },
        }
      : {}),
    ...(matteBox
      ? {
          matteBox: {
            id: matteBox.id,
            clampDiameterMm: matteBox.specs.clampDiameterMm ?? Number.NaN,
            supportedLensOuterDiameterMm: matteBox.specs.supportedLensOuterDiameterMm ?? Number.NaN,
            clearApertureMm: matteBox.specs.clearApertureMm ?? Number.NaN,
            maximumSupportedFilterDiameterMm:
              matteBox.specs.maximumSupportedFilterDiameterMm ?? Number.NaN,
            evidenceIds: matteBox.specs.evidenceIds ?? [],
          },
        }
      : {}),
    configuration: profile,
  });
}

describe('synthetic filter and matte-box fixture integration', () => {
  it('confirms the exact travel filter path through its required step-up ring', () => {
    const result = evaluate('filter-profile-n23-vnd67-stepup');
    expect(result.status).toBe('compatible_with_limitations');
    expect(result.requiredAdapterIds).toEqual(['clearfilter-step-up-49-67']);
    expect(result.dimensions.collisionVignetting.status).toBe('compatible_with_limitations');
  });

  it('confirms the exact direct protective filter path without an adapter', () => {
    const result = evaluate('filter-profile-n23-protect49-direct');
    expect(result.status).toBe('directly_compatible');
    expect(result.requiredAdapterIds).toEqual([]);
  });

  it('rejects the exact clear-aperture and vignetting conflict', () => {
    const result = evaluate('filter-profile-n23-narrow-vignetting');
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.coverageClearAperture.status).toBe('incompatible');
    expect(result.dimensions.collisionVignetting.status).toBe('incompatible');
  });

  it('keeps the evidence-free candidate unknown and never recommends an adapter', () => {
    const result = evaluate('filter-profile-l50-matte95-candidate');
    expect(result.status).toBe('unknown');
    expect(result.evidenceIds).toEqual([]);
    expect(result.requiredAdapterIds).toEqual([]);
  });
});
