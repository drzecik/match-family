import { describe, expect, it } from 'vitest';
import {
  decodeRigFragment,
  encodeRigFragment,
  sanitizePortableRig,
  type PortableRig,
} from '../src/index.js';

const options = {
  allowedProductIds: new Set(['camera', 'lens', 'filter']),
  allowedRecordingModeIds: new Set(['mode']),
  now: '2026-07-17T12:00:00.000Z',
};

describe('versioned rig exchange', () => {
  it('round-trips a bounded portable rig', () => {
    const rig: PortableRig = {
      schemaVersion: '1.0.0',
      synthetic: true,
      notForProduction: true,
      deviceId: 'camera',
      selectedProductIds: ['camera', 'lens'],
      ownedProductIds: ['camera'],
      recordingModeId: 'mode',
      plannedMinutes: 90,
      exportedAt: options.now,
    };
    expect(decodeRigFragment(encodeRigFragment(rig), options).rig).toEqual(rig);
  });

  it('migrates and sanitizes the legacy builder state', () => {
    const result = sanitizePortableRig(
      {
        schemaVersion: '0.1.0-demo',
        state: {
          deviceId: 'camera',
          lensId: 'lens',
          filterId: 'filter',
          extraIds: ['unknown'],
          ownedIds: ['camera', 'unknown'],
          modeId: 'mode',
          plannedMinutes: 30,
        },
      },
      options,
    );
    expect(result.errors).toEqual([]);
    expect(result.rig?.selectedProductIds).toEqual(['camera', 'lens', 'filter']);
    expect(result.rig?.ownedProductIds).toEqual(['camera']);
  });

  it('rejects unknown devices and oversized fragments', () => {
    expect(sanitizePortableRig({ deviceId: 'unknown' }, options).errors).toContain(
      'unknown_or_missing_device',
    );
    expect(decodeRigFragment('x'.repeat(12_001), options).errors).toContain(
      'invalid_fragment_length',
    );
  });

  it('drops unknown IDs and executable-looking fields instead of interpreting them', () => {
    const result = sanitizePortableRig(
      {
        deviceId: 'camera',
        selectedProductIds: ['camera', 'javascript:alert(1)', 'lens'],
        ownedProductIds: ['<script>bad()</script>'],
        plannedMinutes: 'not-a-number',
        conditions: [{ execute: 'rm -rf /' }],
        __proto__: { polluted: true },
      },
      options,
    );
    expect(result.rig?.selectedProductIds).toEqual(['camera', 'lens']);
    expect(result.rig?.ownedProductIds).toEqual([]);
    expect(result.rig?.plannedMinutes).toBe(60);
    expect(Object.prototype).not.toHaveProperty('polluted');
  });
});
