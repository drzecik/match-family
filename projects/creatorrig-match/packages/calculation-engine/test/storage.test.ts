import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { calculateStorage } from '../src/storage.js';

describe('calculateStorage', () => {
  it('converts bitrate and estimates capacity and recording time', () => {
    const result = calculateStorage({
      bitrateMbps: 400,
      plannedDurationSeconds: 600,
      cardCapacityGB: 128,
      safetyMarginPercent: 20,
      supportedCapacitiesGB: [64, 128, 256],
      cardSustainedWriteMBps: 60,
      cardVideoSpeedClass: 'V60',
    });

    expect(result.status).toBe('complete');
    expect(result.value).toMatchObject({
      bytesPerSecond: 50_000_000,
      estimatedBytes: 30_000_000_000,
      requiredBytesWithMargin: 36_000_000_000,
      recordableSeconds: 2_560,
      cardCapacitySufficientForPlannedDuration: true,
      selectedCapacitySupported: true,
      cardWriteSpeedSufficient: true,
      minimumVideoSpeedClass: 'V60',
      recommendedVideoSpeedClass: 'V60',
      cardVideoSpeedClassSufficient: true,
    });
  });

  it('fails capacity when the planned duration plus safety margin exceeds the card', () => {
    const result = calculateStorage({
      bitrateMbps: 600,
      plannedDurationSeconds: 3_600,
      cardCapacityGB: 256,
      safetyMarginPercent: 20,
    });

    expect(result.value?.requiredBytesWithMargin).toBe(324_000_000_000);
    expect(result.value?.cardCapacitySufficientForPlannedDuration).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('STORAGE_CAPACITY_TOO_SMALL');
  });

  it('does not invent a result without bitrate', () => {
    const result = calculateStorage({ cardCapacityGB: 128 });
    expect(result.status).toBe('unavailable');
    expect(result.missingData).toContain('bitrateMbps');
    expect(result.value).toBeUndefined();
  });

  it('flags media slower than the rate including safety margin', () => {
    const result = calculateStorage({
      bitrateMbps: 800,
      cardSustainedWriteMBps: 100,
      cardVideoSpeedClass: 'V90',
    });
    expect(result.value?.minimumSustainedWriteMBps).toBe(100);
    expect(result.value?.recommendedSustainedWriteMBps).toBe(120);
    expect(result.value?.cardWriteSpeedSufficient).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('STORAGE_CARD_TOO_SLOW');
    expect(result.value?.recommendedVideoSpeedClass).toBe('above_v90');
    expect(result.value?.cardVideoSpeedClassSufficient).toBe(false);
  });

  it('is linear in bitrate for every positive finite bitrate', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 10_000, noNaN: true, noDefaultInfinity: true }),
        (bitrate) => {
          const calculated = calculateStorage({ bitrateMbps: bitrate }).value;
          expect(calculated).toBeDefined();
          expect(calculated?.bytesPerMinute).toBeCloseTo(calculated!.bytesPerSecond * 60, 8);
          expect(calculated?.bytesPerHour).toBeCloseTo(calculated!.bytesPerSecond * 3_600, 8);
        },
      ),
    );
  });
});
