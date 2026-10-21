import { describe, expect, it } from 'vitest';
import {
  evaluateCageCompatibility,
  type CageMechanicalProfile,
  type CageRigRequirements,
} from '../src/index.js';

const cage = (overrides: Partial<CageMechanicalProfile> = {}): CageMechanicalProfile => ({
  id: 'cage-n7-b',
  compatibleDeviceIds: ['novacam-n7-body-b'],
  supportedCameraAttachments: ['quarter_20'],
  accessoryMounts: ['cold_shoe', 'quarter_20', 'nato_rail'],
  accessiblePorts: ['microphone_input', 'usb_c', 'micro_hdmi'],
  accessibleDoors: ['battery_door', 'media_door'],
  evidenceIds: ['cage-manual'],
  ...overrides,
});

const rig = (overrides: Partial<CageRigRequirements> = {}): CageRigRequirements => ({
  deviceId: 'novacam-n7-body-b',
  cameraAttachment: 'quarter_20',
  requiredAccessoryMounts: ['cold_shoe', 'quarter_20', 'nato_rail'],
  requiredAccessiblePorts: ['microphone_input', 'usb_c'],
  requiredAccessibleDoors: ['battery_door', 'media_door'],
  conditions: ['Screen remains folded against the body.'],
  evidenceIds: ['camera-body-b-manual'],
  ...overrides,
});

describe('evaluateCageCompatibility', () => {
  it('confirms fit, attachment, accessory mounts and access independently', () => {
    const result = evaluateCageCompatibility(cage(), rig());

    expect(result.status).toBe('directly_compatible');
    expect(result.dimensions.enclosureFit.status).toBe('compatible');
    expect(result.dimensions.cameraAttachment.status).toBe('compatible');
    expect(result.dimensions.accessoryMounting.status).toBe('compatible');
    expect(result.dimensions.accessClearance.status).toBe('compatible');
    expect(result.evidenceIds).toEqual(['cage-manual', 'camera-body-b-manual']);
    expect(result.conditions).toEqual(['Screen remains folded against the body.']);
  });

  it('requires the exact camera body variant', () => {
    const result = evaluateCageCompatibility(
      cage(),
      rig({ deviceId: 'novacam-n7-body-b-revision-2' }),
    );

    expect(result.status).toBe('unknown');
    expect(result.dimensions.enclosureFit.status).toBe('unknown');
    expect(result.dimensions.enclosureFit.explanation).toContain('novacam-n7-body-b-revision-2');
  });

  it('rejects an exact body variant with an explicitly documented physical conflict', () => {
    const result = evaluateCageCompatibility(
      cage({ incompatibleDeviceIds: ['novacam-n7-body-b-revision-2'] }),
      rig({ deviceId: 'novacam-n7-body-b-revision-2' }),
    );

    expect(result.status).toBe('incompatible');
    expect(result.dimensions.enclosureFit.status).toBe('incompatible');
    expect(result.dimensions.enclosureFit.explanation).toContain('explicitly documented');
  });

  it('keeps an absent body variant unknown without explicit negative evidence', () => {
    const result = evaluateCageCompatibility(
      cage({ compatibleDeviceIds: ['novacam-n7-body-b'], incompatibleDeviceIds: [] }),
      rig({ deviceId: 'novacam-n7-body-c' }),
    );

    expect(result.status).toBe('unknown');
    expect(result.dimensions.enclosureFit.status).toBe('unknown');
  });

  it('does not infer an attachment from a similar identifier or shape', () => {
    const result = evaluateCageCompatibility(cage(), rig({ cameraAttachment: 'quarter20' }));

    expect(result.status).toBe('unknown');
    expect(result.dimensions.cameraAttachment.status).toBe('unknown');
    expect(result.dimensions.cameraAttachment.explanation).toContain('shape');
  });

  it('reports each missing accessory mount as an incompatibility', () => {
    const result = evaluateCageCompatibility(
      cage({ accessoryMounts: ['cold_shoe'] }),
      rig({ requiredAccessoryMounts: ['cold_shoe', 'quarter_20', 'nato_rail'] }),
    );

    expect(result.status).toBe('incompatible');
    expect(result.dimensions.accessoryMounting.status).toBe('incompatible');
    expect(result.missingAccessoryMounts).toEqual(['quarter_20', 'nato_rail']);
  });

  it('reports inaccessible ports and doors separately', () => {
    const result = evaluateCageCompatibility(
      cage({ accessiblePorts: ['microphone_input'], accessibleDoors: ['battery_door'] }),
      rig(),
    );

    expect(result.status).toBe('incompatible');
    expect(result.dimensions.accessClearance.status).toBe('incompatible');
    expect(result.blockedRequiredPorts).toEqual(['usb_c']);
    expect(result.blockedRequiredDoors).toEqual(['media_door']);
  });

  it('marks unrequested mount and access dimensions not applicable', () => {
    const result = evaluateCageCompatibility(
      cage(),
      rig({
        requiredAccessoryMounts: [],
        requiredAccessiblePorts: [],
        requiredAccessibleDoors: [],
      }),
    );

    expect(result.status).toBe('directly_compatible');
    expect(result.dimensions.accessoryMounting.status).toBe('not_applicable');
    expect(result.dimensions.accessClearance.status).toBe('not_applicable');
  });

  it('fails closed when cage evidence is missing', () => {
    const result = evaluateCageCompatibility(cage({ evidenceIds: [] }), rig());

    expect(result.status).toBe('unknown');
    expect(result.evidenceIds).toEqual([]);
    expect(
      Object.values(result.dimensions).every((dimension) => dimension.status === 'unknown'),
    ).toBe(true);
  });

  it('fails closed when camera-body requirement evidence is missing', () => {
    const result = evaluateCageCompatibility(cage(), rig({ evidenceIds: [] }));

    expect(result.status).toBe('unknown');
    expect(result.warnings).toContain(
      'Cage and camera-body requirements are not supported by scoped evidence.',
    );
  });
});
