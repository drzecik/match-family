import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { calculatePower } from '../src/power.js';

describe('calculatePower', () => {
  it('rejects a verified voltage mismatch', () => {
    const result = calculatePower({
      loads: [{ id: 'camera', powerWatts: 8, acceptedVoltage: { min: 7, max: 9 } }],
      source: {
        id: 'battery',
        outputVoltage: 12,
        maxOutputWatts: 30,
        energyWh: 60,
        efficiencyPercent: 90,
      },
    });
    expect(result.value?.safetyStatus).toBe('incompatible');
    expect(result.issues.map((issue) => issue.code)).toContain('POWER_VOLTAGE_MISMATCH');
  });

  it('never labels an unverified voltage as compatible', () => {
    const result = calculatePower({
      loads: [{ id: 'camera', powerWatts: 8 }],
      source: { id: 'battery', outputVoltage: 8, maxOutputWatts: 30 },
    });
    expect(result.value?.safetyStatus).toBe('unknown');
    expect(result.missingData).toContain('loads.camera.acceptedVoltage');
  });

  it('does not treat an invalid accepted-voltage range as evidence of safety', () => {
    const result = calculatePower({
      loads: [{ id: 'camera', powerWatts: 8, acceptedVoltage: { min: 12, max: 7 } }],
      source: { id: 'battery', outputVoltage: 8, maxOutputWatts: 30 },
    });
    expect(result.value?.safetyStatus).toBe('unknown');
    expect(result.issues.map((issue) => issue.code)).toContain('POWER_INVALID_ACCEPTED_VOLTAGE');
  });

  it('does not require an external source for entirely self-powered loads', () => {
    const result = calculatePower({
      loads: [{ id: 'microphone', selfPowered: true }],
    });
    expect(result.status).toBe('complete');
    expect(result.value?.safetyStatus).toBe('compatible');
    expect(result.missingData).toEqual([]);
  });

  it('requires the exact verified PD profile', () => {
    const result = calculatePower({
      loads: [
        {
          id: 'phone',
          powerWatts: 15,
          acceptedVoltage: { min: 9, max: 9 },
          requiredPdProfile: '9V/3A',
        },
      ],
      source: { id: 'bank', outputVoltage: 9, maxOutputWatts: 27, supportedPdProfiles: ['5V/3A'] },
    });
    expect(result.value?.safetyStatus).toBe('incompatible');
    expect(result.issues.map((issue) => issue.code)).toContain('POWER_PD_PROFILE_MISMATCH');
  });

  it('computes runtime from energy, efficiency, and demand', () => {
    const result = calculatePower({
      loads: [{ id: 'monitor', powerWatts: 10, acceptedVoltage: { min: 12, max: 12 } }],
      source: {
        id: 'battery',
        outputVoltage: 12,
        maxOutputWatts: 20,
        energyWh: 100,
        efficiencyPercent: 80,
      },
    });
    expect(result.status).toBe('complete');
    expect(result.value?.estimatedRuntimeHours).toBe(8);
  });

  it('adds finite positive power demands', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0.01, max: 1_000, noNaN: true, noDefaultInfinity: true }), {
          maxLength: 30,
        }),
        (loads) => {
          const result = calculatePower({
            loads: loads.map((powerWatts, index) => ({
              id: String(index),
              powerWatts,
              acceptedVoltage: { min: 12, max: 12 },
            })),
            source: { id: 'source', outputVoltage: 12, maxOutputWatts: 100_000 },
          });
          expect(result.value?.knownDemandWatts).toBeCloseTo(
            loads.reduce((sum, load) => sum + load, 0),
            8,
          );
        },
      ),
    );
  });
});
