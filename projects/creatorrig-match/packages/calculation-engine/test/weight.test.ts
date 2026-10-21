import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { calculateWeight } from '../src/weight.js';

describe('calculateWeight', () => {
  it('includes adapters and cables and reports payload margin', () => {
    const result = calculateWeight({
      components: [
        { id: 'camera', weightGrams: 500 },
        { id: 'lens', weightGrams: 300 },
        { id: 'cable', weightGrams: 20, quantity: 2 },
      ],
      payloadCapacityGrams: 1_000,
      payloadSafetyMarginPercent: 20,
    });
    expect(result.value).toMatchObject({
      knownWeightGrams: 840,
      recommendedMaximumPayloadGrams: 800,
      withinRatedCapacity: true,
      withinRecommendedCapacity: false,
    });
    expect(result.issues.map((issue) => issue.code)).toContain('WEIGHT_MARGIN_EXCEEDED');
  });

  it('returns a partial known sum when a component weight is missing', () => {
    const result = calculateWeight({
      components: [{ id: 'known', weightGrams: 100 }, { id: 'unknown' }],
    });
    expect(result.status).toBe('partial');
    expect(result.value?.knownWeightGrams).toBe(100);
    expect(result.missingData).toContain('components.unknown.weightGrams');
  });

  it('sums non-negative component weights', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 100_000 }), { maxLength: 100 }), (weights) => {
        const result = calculateWeight({
          components: weights.map((weightGrams, index) => ({ id: String(index), weightGrams })),
        });
        expect(result.value?.knownWeightGrams).toBe(
          weights.reduce((sum, weight) => sum + weight, 0),
        );
      }),
    );
  });
});
