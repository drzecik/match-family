import { describe, expect, it } from 'vitest';
import {
  evaluateMemoryCompatibility,
  type MemoryCardProfile,
  type RecordingModeProfile,
} from '../src/index.js';

const mode = (overrides: Partial<RecordingModeProfile> = {}): RecordingModeProfile => ({
  id: '4k-100',
  bitrateMbps: 100,
  mediaRequirements: {
    mediaFormats: ['SDXC'],
    minimumSustainedWriteMBps: 12.5,
    minimumSpeedClassMBps: 30,
    evidenceIds: ['mode-manual'],
  },
  evidenceIds: ['camera-manual'],
  ...overrides,
});
const card = (overrides: Partial<MemoryCardProfile> = {}): MemoryCardProfile => ({
  id: 'sd-128',
  format: 'SDXC',
  capacityGB: 128,
  sustainedWriteMBps: 60,
  guaranteedSpeedClassMBps: 30,
  filesystem: 'exFAT',
  evidenceIds: ['card-spec'],
  ...overrides,
});
const deviceMedia = [
  {
    format: 'SDXC',
    maximumCapacityGB: 512,
    filesystems: ['exFAT'],
    evidenceIds: ['camera-manual'],
  },
];

describe('evaluateMemoryCompatibility', () => {
  it('accepts a sufficiently fast supported card and calculates recording time', () => {
    const result = evaluateMemoryCompatibility({ deviceMedia, mode: mode(), card: card() });
    expect(result.status).toBe('directly_compatible');
    expect(result.estimatedStorageGBPerHour).toBe(45);
    expect(result.estimatedRecordingSeconds).toBeCloseTo(9_728);
  });

  it('rejects a slow card', () => {
    const result = evaluateMemoryCompatibility({
      deviceMedia,
      mode: mode(),
      card: card({ sustainedWriteMBps: 10, guaranteedSpeedClassMBps: 10 }),
    });
    expect(result.status).toBe('incompatible');
    expect(result.dimensions.sustainedWrite.status).toBe('incompatible');
  });

  it('rejects unsupported format and excessive capacity', () => {
    expect(
      evaluateMemoryCompatibility({
        deviceMedia,
        mode: mode(),
        card: card({ format: 'CFEXPRESS_B' }),
      }).status,
    ).toBe('incompatible');
    expect(
      evaluateMemoryCompatibility({ deviceMedia, mode: mode(), card: card({ capacityGB: 1_024 }) })
        .status,
    ).toBe('incompatible');
  });

  it('returns unknown when bitrate and write requirement are absent', () => {
    const result = evaluateMemoryCompatibility({
      deviceMedia,
      mode: {
        id: 'mode-without-bitrate',
        mediaRequirements: { mediaFormats: ['SDXC'], evidenceIds: ['mode-manual'] },
        evidenceIds: ['camera-manual'],
      },
      card: card(),
    });
    expect(result.status).toBe('unknown');
    expect(result.estimatedRecordingSeconds).toBeUndefined();
  });

  it('flags excessive performance headroom without changing compatibility', () => {
    const result = evaluateMemoryCompatibility({
      deviceMedia,
      mode: mode(),
      card: card({ sustainedWriteMBps: 300 }),
    });
    expect(result.status).toBe('directly_compatible');
    expect(result.performanceHeadroom).toBe('excessive');
  });

  it('does not publish a card result without exact device, mode, and card evidence', () => {
    const result = evaluateMemoryCompatibility({
      deviceMedia,
      mode: mode(),
      card: card({ evidenceIds: [] }),
    });
    expect(result.status).toBe('unknown');
  });
});

describe('memory input boundary regressions', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'never approves invalid card capacity %s',
    (capacityGB) => {
      const result = evaluateMemoryCompatibility({
        deviceMedia,
        mode: mode(),
        card: card({ capacityGB }),
      });
      expect(result.status).toBe('unknown');
      expect(result.estimatedRecordingSeconds).toBeUndefined();
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.MIN_VALUE, Number.MAX_VALUE])(
    'never publishes invalid or overflowing estimates for bitrate %s',
    (bitrateMbps) => {
      const result = evaluateMemoryCompatibility({
        deviceMedia,
        mode: mode({ bitrateMbps }),
        card: card(),
      });
      expect(result.status).toBe('unknown');
      expect(result.estimatedRecordingSeconds).toBeUndefined();
      expect(result.estimatedStorageGBPerHour).toBeUndefined();
    },
  );

  it('does not approve infinite write performance or non-finite tuning values', () => {
    for (const overrides of [
      { card: card({ sustainedWriteMBps: Number.POSITIVE_INFINITY }) },
      { safetyHeadroom: Number.NaN },
      { usableCapacityRatio: Number.NaN },
    ]) {
      const result = evaluateMemoryCompatibility({
        deviceMedia,
        mode: mode(),
        card: card(),
        ...overrides,
      });
      expect(result.status).toBe('unknown');
      expect(result.estimatedRecordingSeconds).toBeUndefined();
    }
  });

  it('does not treat blank evidence identifiers as proof', () => {
    const result = evaluateMemoryCompatibility({
      deviceMedia,
      mode: mode(),
      card: card({ evidenceIds: ['  '] }),
    });
    expect(result.status).toBe('unknown');
  });

  it('does not approve two empty media format identifiers', () => {
    const result = evaluateMemoryCompatibility({
      deviceMedia: [{ ...deviceMedia[0]!, format: '' }],
      mode: mode({ mediaRequirements: { ...mode().mediaRequirements, mediaFormats: [''] } }),
      card: card({ format: '' }),
    });
    expect(result.status).toBe('unknown');
  });
});
