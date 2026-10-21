import { describe, expect, it } from 'vitest';
import {
  referenceFlooringConfiguration,
  referenceFlooringInput,
} from '@materialmatch/test-fixtures';
import { calculateMaterialProject, CalculationError } from '../src/index.js';

const errorCode = (run: () => unknown) => {
  try {
    run();
    return undefined;
  } catch (error) {
    return error instanceof CalculationError ? error.code : 'unexpected';
  }
};

describe('calculation boundary and security cases', () => {
  it.each([0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid room width: %s',
    (widthMillimeters) => {
      const project = {
        ...referenceFlooringInput.project,
        rooms: [
          {
            ...referenceFlooringInput.project.rooms[0]!,
            geometry: { kind: 'rectangle' as const, widthMillimeters, lengthMillimeters: 5_000 },
          },
        ],
      };
      expect(
        errorCode(() => calculateMaterialProject({ project }, referenceFlooringConfiguration)),
      ).toBe('INVALID_INPUT');
    },
  );

  it('rejects exclusions consuming the entire room', () => {
    const project = {
      ...referenceFlooringInput.project,
      rooms: [
        {
          ...referenceFlooringInput.project.rooms[0]!,
          excludedAreas: [{ id: 'all', areaSquareMillimeters: 20_000_000 }],
        },
      ],
    };
    expect(
      errorCode(() => calculateMaterialProject({ project }, referenceFlooringConfiguration)),
    ).toBe('AREA_EXCLUSIONS_EXCEED_ROOM');
  });

  it('rejects waste outside the configured range', () => {
    expect(
      errorCode(() =>
        calculateMaterialProject(
          { project: { ...referenceFlooringInput.project, wasteBasisPoints: 2_001 } },
          referenceFlooringConfiguration,
        ),
      ),
    ).toBe('WASTE_OUTSIDE_RANGE');
  });

  it('rejects unknown fields instead of accepting executable-looking configuration', () => {
    const malicious = {
      ...referenceFlooringConfiguration,
      formula: "globalThis.fetch('https://attacker.invalid')",
    };
    expect(
      errorCode(() => calculateMaterialProject(referenceFlooringInput, malicious as never)),
    ).toBe('INVALID_CONFIGURATION');
  });

  it('rejects executable-looking and unknown fields in calculation input', () => {
    const maliciousInput = {
      ...referenceFlooringInput,
      onComplete: "fetch('https://attacker.invalid')",
    };
    expect(
      errorCode(() =>
        calculateMaterialProject(maliciousInput as never, referenceFlooringConfiguration),
      ),
    ).toBe('INVALID_INPUT');
  });

  it('keeps unavailable and unpriced products visible but ineligible for cart', () => {
    const mainVariant = referenceFlooringConfiguration.mainProduct.variants[0]!;
    const { price: _price, ...variantWithoutPrice } = mainVariant;
    void _price;
    const configuration = {
      ...referenceFlooringConfiguration,
      mainProduct: {
        ...referenceFlooringConfiguration.mainProduct,
        variants: [{ ...variantWithoutPrice, available: false }],
      },
    };
    const result = calculateMaterialProject(referenceFlooringInput, configuration);
    expect(result.mainProduct.quantity).toBe(10);
    expect(result.cartLines[0]).toMatchObject({
      quantity: 10,
      eligible: false,
      exclusionReason: 'PRODUCT_UNAVAILABLE',
    });
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(['PRODUCT_UNAVAILABLE', 'PRICE_MISSING']),
    );
    expect(result.totalPrice).toBeUndefined();
  });

  it('supports multiple rooms without losing integer precision', () => {
    const room = referenceFlooringInput.project.rooms[0]!;
    const project = {
      ...referenceFlooringInput.project,
      wasteBasisPoints: 0,
      rooms: [room, { ...room, id: 'room-2', doors: [] }],
    };
    const result = calculateMaterialProject({ project }, referenceFlooringConfiguration);
    expect(result.measurements.netAreaSquareMillimeters).toBe(40_000_000);
    expect(result.measurements.perimeterMillimeters).toBe(36_000);
    expect(result.mainProduct.quantity).toBe(19);
  });
});
