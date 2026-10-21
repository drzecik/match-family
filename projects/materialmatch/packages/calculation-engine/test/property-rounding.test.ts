import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  referenceFlooringConfiguration,
  referenceFlooringInput,
} from '@materialmatch/test-fixtures';
import { calculateMaterialProject } from '../src/index.js';

const configurationWithPackaging = (minimumPackages: number, orderMultiple: number) => ({
  ...referenceFlooringConfiguration,
  mainProduct: {
    ...referenceFlooringConfiguration.mainProduct,
    variants: referenceFlooringConfiguration.mainProduct.variants.map((variant) => ({
      ...variant,
      package: { ...variant.package, minimumPackages, orderMultiple },
    })),
  },
});

describe('package rounding properties', () => {
  it('always purchases enough area and respects minimum/order multiple', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 0, max: 2_000 }),
        fc.constantFrom(1, 2, 3, 7),
        (widthMillimeters, lengthMillimeters, wasteBasisPoints, multiple) => {
          const project = {
            ...referenceFlooringInput.project,
            wasteBasisPoints,
            rooms: [
              {
                ...referenceFlooringInput.project.rooms[0]!,
                doors: [],
                geometry: { kind: 'rectangle' as const, widthMillimeters, lengthMillimeters },
              },
            ],
          };
          const result = calculateMaterialProject(
            { project },
            configurationWithPackaging(2, multiple),
          );
          expect(result.mainProduct.purchasedAreaSquareMillimeters).toBeGreaterThanOrEqual(
            result.measurements.grossAreaSquareMillimeters,
          );
          expect(result.mainProduct.quantity).toBeGreaterThanOrEqual(2);
          expect(result.mainProduct.quantity % multiple).toBe(0);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('package count is monotonic as room area grows', () => {
    let previous = 0;
    for (let widthMillimeters = 1; widthMillimeters <= 100_000; widthMillimeters += 499) {
      const project = {
        ...referenceFlooringInput.project,
        wasteBasisPoints: 0,
        rooms: [
          {
            ...referenceFlooringInput.project.rooms[0]!,
            doors: [],
            geometry: { kind: 'rectangle' as const, widthMillimeters, lengthMillimeters: 5_000 },
          },
        ],
      };
      const current = calculateMaterialProject({ project }, referenceFlooringConfiguration)
        .mainProduct.quantity;
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });
});
