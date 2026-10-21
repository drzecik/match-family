import { describe, expect, it } from 'vitest';
import {
  referenceFlooringConfiguration,
  referenceFlooringInput,
} from '@materialmatch/test-fixtures';
import { calculateMaterialProject } from '../src/index.js';

describe('reference flooring regression', () => {
  it('calculates the complete 4 m x 5 m scenario with traceable intermediate values', () => {
    const result = calculateMaterialProject(referenceFlooringInput, referenceFlooringConfiguration);

    expect(result.measurements).toEqual({
      netAreaSquareMillimeters: 20_000_000,
      wasteBasisPoints: 800,
      wasteAreaSquareMillimeters: 1_600_000,
      grossAreaSquareMillimeters: 21_600_000,
      perimeterMillimeters: 18_000,
      doorWidthMillimeters: 900,
      skirtingLengthMillimeters: 17_100,
      roomCount: 1,
      doorCount: 1,
      internalCornerCount: 4,
      externalCornerCount: 0,
    });
    expect(result.mainProduct).toMatchObject({
      quantity: 10,
      purchasedAreaSquareMillimeters: 22_000_000,
      excessAreaSquareMillimeters: 400_000,
    });
    expect(result.accessories.map(({ productId, quantity }) => ({ productId, quantity }))).toEqual([
      { productId: 'underlay', quantity: 3 },
      { productId: 'skirting', quantity: 8 },
    ]);
    expect(
      result.cartLines.map(({ sku, quantity, eligible }) => ({ sku, quantity, eligible })),
    ).toEqual([
      { sku: 'FICTIONAL-MM-PANEL-NATURAL', quantity: 10, eligible: true },
      { sku: 'FICTIONAL-MM-UNDERLAY', quantity: 3, eligible: true },
      { sku: 'FICTIONAL-MM-SKIRTING', quantity: 8, eligible: true },
    ]);
    expect(result.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'waste.area',
          outputValue: 1_600_000,
          explanationKey: 'calculation.wasteArea',
        }),
        expect.objectContaining({
          id: 'material.rawPackages',
          outputValue: 10,
          explanationKey: 'calculation.rawPackages',
        }),
        expect.objectContaining({
          id: 'material.purchasedArea',
          outputValue: 22_000_000,
          explanationKey: 'calculation.purchasedArea',
        }),
        expect.objectContaining({
          id: 'material.excessArea',
          outputValue: 400_000,
          explanationKey: 'calculation.excessArea',
        }),
        expect.objectContaining({ id: 'accessory.underlay-by-gross-area', outputValue: 3 }),
        expect.objectContaining({ id: 'accessory.skirting-by-net-perimeter', outputValue: 8 }),
      ]),
    );
    expect(result.mainProduct.explanationStepIds).toEqual([
      'material.rawPackages',
      'material.packages',
      'material.purchasedArea',
      'material.excessArea',
    ]);
    expect(
      result.steps.find((candidate) => candidate.id === 'accessory.skirting-by-net-perimeter')
        ?.inputValues,
    ).toMatchObject({
      requiredLengthMillimeters: 17_100,
      itemLengthMillimeters: 2_400,
      rounding: 'ceil',
      rawQuantity: 8,
    });
  });

  it('is deterministic and does not mutate either argument', () => {
    const inputSnapshot = structuredClone(referenceFlooringInput);
    const configurationSnapshot = structuredClone(referenceFlooringConfiguration);
    const first = calculateMaterialProject(referenceFlooringInput, referenceFlooringConfiguration);
    const second = calculateMaterialProject(referenceFlooringInput, referenceFlooringConfiguration);
    expect(second).toEqual(first);
    expect(referenceFlooringInput).toEqual(inputSnapshot);
    expect(referenceFlooringConfiguration).toEqual(configurationSnapshot);
  });
});
