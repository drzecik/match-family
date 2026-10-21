import { describe, expect, it } from 'vitest';
import { validateRig, type RigValidationInput } from '../src/index.js';

const completeInput: RigValidationInput = {
  currency: 'PLN',
  products: [
    { id: 'camera', selected: true, owned: true, weightGrams: 500, priceMinor: 400_000 },
    { id: 'mic', selected: true, owned: false, weightGrams: 80, priceMinor: 40_000 },
    { id: 'cable', selected: true, owned: false, weightGrams: 20, priceMinor: 5_000 },
  ],
  relations: [{ sourceProductId: 'camera', targetProductId: 'mic', relationType: 'directly_compatible', verificationStatus: 'verified', evidenceIds: ['manual'], requiredProductIds: ['cable'] }],
  requiredConnections: [{ sourceProductId: 'camera', targetProductId: 'mic', label: 'camera to microphone' }],
};

describe('rig validator', () => {
  it('accepts a complete evidence-backed rig', () => expect(validateRig(completeInput).complete).toBe(true));
  it('reports a missing cable', () => {
    const result = validateRig({ ...completeInput, products: completeInput.products.filter((product) => product.id !== 'cable') });
    expect(result.missingProductIds).toEqual(['cable']);
    expect(result.complete).toBe(false);
  });
  it('reports a verified critical conflict', () => {
    const result = validateRig({ ...completeInput, relations: [{ ...completeInput.relations[0]!, relationType: 'incompatible', requiredProductIds: [] }] });
    expect(result.conflicts[0]?.code).toBe('RIG_INCOMPATIBLE');
  });
  it('does not charge for owned products', () => expect(validateRig(completeInput).purchaseCostMinor).toBe(45_000));
  it('reports price without an offer', () => {
    const result = validateRig({
      ...completeInput,
      products: completeInput.products.map((product) =>
        product.id === 'mic'
          ? { id: 'mic', selected: true, owned: false, weightGrams: 80 }
          : product,
      ),
    });
    expect(result.missingPriceProductIds).toEqual(['mic']);
  });
  it('never accepts candidate as verified compatibility', () => {
    const result = validateRig({ ...completeInput, relations: [{ ...completeInput.relations[0]!, relationType: 'candidate', verificationStatus: 'candidate' }] });
    expect(result.unconfirmedRelations).toHaveLength(1);
    expect(result.complete).toBe(false);
  });
  it('sums weight including adapters and cables', () => expect(validateRig(completeInput).totalKnownWeightGrams).toBe(600));
  it('rejects a slow or unsupported recording card', () => {
    const result = validateRig({ ...completeInput, memory: { mediaFormatSupported: true, bitrateMbps: 600, plannedDurationSeconds: 3600, cardCapacityGB: 128, cardSustainedWriteMBps: 70, safetyMarginPercent: 20 } });
    expect(result.conflicts[0]?.code).toBe('RIG_MEDIA_INCOMPATIBLE');
  });
  it('rejects a card that cannot cover the planned duration with safety margin', () => {
    const result = validateRig({
      ...completeInput,
      memory: {
        mediaFormatSupported: true,
        bitrateMbps: 600,
        plannedDurationSeconds: 3_600,
        cardCapacityGB: 256,
        cardSustainedWriteMBps: 90,
        safetyMarginPercent: 20,
      },
    });
    expect(result.conflicts.map((finding) => finding.code)).toContain(
      'RIG_MEDIA_CAPACITY_INSUFFICIENT',
    );
    expect(result.complete).toBe(false);
  });
});
