import { describe, expect, it } from 'vitest';
import { mergeCandidateFragments } from './index.js';

const candidate = {
  schemaVersion: '1.0.0',
  generatedAt: '2026-07-18T12:00:00+02:00',
  synthetic: false,
  notForProduction: true,
  verificationStatus: 'candidate',
  humanReviewRequired: true,
  products: [
    {
      id: 'real-camera-candidate',
      canonicalName: 'Real Camera',
      category: 'capture_device',
      synthetic: false,
      notForProduction: true,
    },
  ],
};

describe('candidate catalog generator', () => {
  it('merges non-synthetic research fragments and preserves the warning state', () => {
    const result = mergeCandidateFragments([{ file: 'camera.json', value: candidate }]);
    expect(result.products).toHaveLength(1);
    expect(result.synthetic).toBe(false);
    expect(result.notForProduction).toBe(true);
    expect(result.verificationStatus).toBe('candidate');
    expect(result.humanReviewRequired).toBe(true);
  });

  it('rejects a fragment marked as verified', () => {
    expect(() =>
      mergeCandidateFragments([
        { file: 'unsafe.json', value: { ...candidate, verificationStatus: 'verified' } },
      ]),
    ).toThrow(/must remain candidate/);
  });

  it('rejects synthetic records', () => {
    expect(() =>
      mergeCandidateFragments([
        {
          file: 'unsafe.json',
          value: { ...candidate, products: [{ ...candidate.products[0], synthetic: true }] },
        },
      ]),
    ).toThrow(/explicitly be non-synthetic/);
  });

  it('rejects a record that is not explicitly excluded from production', () => {
    expect(() =>
      mergeCandidateFragments([
        {
          file: 'unsafe.json',
          value: {
            ...candidate,
            products: [{ ...candidate.products[0], notForProduction: false }],
          },
        },
      ]),
    ).toThrow(/must remain outside production/);
  });

  it('rejects duplicate IDs across fragments', () => {
    expect(() =>
      mergeCandidateFragments([
        { file: 'one.json', value: candidate },
        { file: 'two.json', value: candidate },
      ]),
    ).toThrow(/duplicate id/);
  });

  it('rejects category aliases outside the domain ontology', () => {
    expect(() =>
      mergeCandidateFragments([
        {
          file: 'unsafe.json',
          value: {
            ...candidate,
            products: [{ ...candidate.products[0], category: 'memory_transfer' }],
          },
        },
      ]),
    ).toThrow(/canonical product category/);
  });

  it('rejects unsafe or non-official evidence links', () => {
    const evidence = {
      id: 'unsafe-evidence',
      sourceType: 'independent_test',
      url: 'javascript:alert(1)',
      status: 'candidate',
      synthetic: false,
      notForProduction: true,
    };
    expect(() =>
      mergeCandidateFragments([
        { file: 'unsafe.json', value: { ...candidate, evidence: [evidence] } },
      ]),
    ).toThrow(/must be official/);
  });

  it('rejects a relationship disguised as verified', () => {
    const edge = {
      id: 'unsafe-edge',
      sourceProductId: 'real-camera-candidate',
      targetProductId: 'real-microphone-candidate',
      relationType: 'directly_compatible',
      verificationStatus: 'verified',
      synthetic: false,
      notForProduction: true,
    };
    expect(() =>
      mergeCandidateFragments([
        { file: 'unsafe.json', value: { ...candidate, compatibilityEdges: [edge] } },
      ]),
    ).toThrow(/must remain unverified candidates/);
  });
});
