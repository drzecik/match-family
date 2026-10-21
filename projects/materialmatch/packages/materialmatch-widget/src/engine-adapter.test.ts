import { referenceFlooringConfiguration } from '@materialmatch/test-fixtures';
import { describe, expect, it } from 'vitest';
import { calculateWithMaterialMatchEngine } from './engine-adapter';

describe('calculation engine presentation adapter', () => {
  it('maps the reference room to exact presentation and cart quantities', () => {
    const result = calculateWithMaterialMatchEngine({
      configurationVersion: '1.0',
      calculation: referenceFlooringConfiguration,
      productNames: {
        'fictional-floor-panel': 'Fikcyjne panele',
        underlay: 'Fikcyjny podkład',
        skirting: 'Fikcyjna listwa',
        'internal-corner': 'Narożnik wewnętrzny',
        'external-corner': 'Narożnik zewnętrzny',
      },
      selectedOptionalAccessoryIds: ['internal-corner', 'external-corner'],
      project: {
        id: 'adapter-reference',
        name: 'Referencja',
        wasteBasisPoints: 800,
        rooms: [
          {
            id: 'room-1',
            name: 'Pokój',
            lengthMm: 5000,
            widthMm: 4000,
            doorWidthMm: 900,
            excludedAreaSquareMm: 0,
            internalCornerCount: 6,
            externalCornerCount: 2,
          },
        ],
      },
    });

    expect(result).toMatchObject({
      netAreaSquareMm: 20_000_000,
      grossAreaSquareMm: 21_600_000,
      purchaseAreaSquareMm: 22_000_000,
      surplusAreaSquareMm: 400_000,
      lines: [
        { name: 'Fikcyjne panele', quantity: 10, status: 'available' },
        { name: 'Fikcyjny podkład', quantity: 3, status: 'available' },
        { name: 'Fikcyjna listwa', quantity: 8, status: 'available' },
        { name: 'Narożnik wewnętrzny', quantity: 6, status: 'available' },
        { name: 'Narożnik zewnętrzny', quantity: 2, status: 'available' },
      ],
    });
    expect(result.totalPriceMinor).not.toBeNull();
    expect(result.steps.map((step) => step.id)).toContain('material.packages');
    expect(result.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'accessory.internal-corners',
          expression: expect.stringContaining('cornerCount=6'),
        }),
        expect.objectContaining({
          id: 'accessory.external-corners',
          expression: expect.stringContaining('cornerCount=2'),
        }),
      ]),
    );
  });

  it('uses zero corners for hosts using the legacy measurement shape', () => {
    const result = calculateWithMaterialMatchEngine({
      configurationVersion: '1.0',
      calculation: referenceFlooringConfiguration,
      selectedOptionalAccessoryIds: ['internal-corner', 'external-corner'],
      project: {
        id: 'legacy-host',
        name: 'Starsza integracja',
        wasteBasisPoints: 800,
        rooms: [
          {
            id: 'room-1',
            name: 'Pokój',
            lengthMm: 5000,
            widthMm: 4000,
            doorWidthMm: 0,
            excludedAreaSquareMm: 0,
          },
        ],
      },
    });

    expect(result.lines.some((line) => line.id.startsWith('internal-corner:'))).toBe(false);
    expect(result.lines.some((line) => line.id.startsWith('external-corner:'))).toBe(false);
  });
});
