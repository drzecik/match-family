import { describe, expect, it } from 'vitest';
import {
  parseResearchRig,
  serializeResearchRig,
  summarizeResearchRig,
  type ResearchRigEdge,
  type ResearchRigProduct,
  type ResearchRigTemplate,
} from './research-rig';

const template: ResearchRigTemplate = {
  id: 'test',
  label: 'Test',
  description: 'Test',
  requiredCategories: ['capture_device', 'audio', 'memory_and_transfer'],
};
const products: readonly ResearchRigProduct[] = [
  {
    id: 'camera',
    brand: 'Brand',
    canonicalName: 'Camera',
    category: 'capture_device',
    subcategory: 'camera',
    weightGrams: 500,
    sourceReferences: ['ev-camera'],
  },
  {
    id: 'microphone',
    brand: 'Brand',
    canonicalName: 'Microphone',
    category: 'audio',
    subcategory: 'microphone',
    sourceReferences: ['ev-microphone'],
  },
  {
    id: 'card',
    brand: 'Brand',
    canonicalName: 'Card',
    category: 'memory_and_transfer',
    subcategory: 'sd_card',
    weightGrams: 2,
  },
];
const edge: ResearchRigEdge = {
  id: 'candidate-camera-microphone',
  sourceProductId: 'camera',
  targetProductId: 'microphone',
  relationType: 'candidate',
  compatibilityDimensions: [
    { dimension: 'signal_protocol', status: 'compatible', summary: 'Candidate only.' },
  ],
  evidenceIds: ['ev-edge'],
  verificationStatus: 'candidate',
};

describe('research rig summary', () => {
  it('calculates known weight, missing facts, completeness and candidate coverage', () => {
    const result = summarizeResearchRig(products, [edge], ['camera', 'microphone'], template);
    expect(result.totalKnownWeightGrams).toBe(500);
    expect(result.productsWithoutWeight.map(({ id }) => id)).toEqual(['microphone']);
    expect(result.missingCategories).toEqual(['memory_and_transfer']);
    expect(result.completenessPercent).toBe(67);
    expect(result.candidateEdges).toEqual([edge]);
    expect(result.unknownPairs).toBe(0);
    expect(result.evidenceCount).toBe(3);
  });

  it('does not infer compatibility for pairs without an exact candidate edge', () => {
    const result = summarizeResearchRig(products, [], ['camera', 'microphone', 'card'], template);
    expect(result.candidateEdges).toEqual([]);
    expect(result.unknownPairs).toBe(3);
    expect(result.completenessPercent).toBe(100);
  });
});

describe('research rig exchange', () => {
  it('round-trips a local candidate configuration and deduplicates IDs', () => {
    const serialized = serializeResearchRig('vlog', ['camera', 'camera', 'card'], ['camera']);
    expect(parseResearchRig(serialized)).toEqual({
      templateId: 'vlog',
      selectedIds: ['camera', 'card'],
      ownedIds: ['camera'],
    });
    expect(serialized).toContain('"verificationStatus":"candidate"');
  });

  it('rejects malformed or unrelated files', () => {
    expect(parseResearchRig('{broken')).toBeNull();
    expect(parseResearchRig(JSON.stringify({ format: 'other', version: 1 }))).toBeNull();
  });
});
