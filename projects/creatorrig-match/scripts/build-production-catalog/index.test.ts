import { describe, expect, it } from 'vitest';
import { mergeProductionFragments } from './index.js';

const evidence = {
  id: 'evidence.camera.manual',
  sourceType: 'official_manual',
  title: 'Camera manual',
  url: 'https://manufacturer.example/camera/manual.pdf',
  scope: ['mechanical', 'signal', 'memory'],
  status: 'verified',
  verifier: 'Human reviewer',
  verifiedAt: '2026-07-18T10:00:00.000Z',
  synthetic: false,
  notForProduction: false,
};

const fragment = {
  schemaVersion: '1.0.0',
  generatedAt: '2026-07-18T10:00:00.000Z',
  synthetic: false,
  notForProduction: false,
  verificationStatus: 'verified',
  humanReviewRequired: false,
  products: [
    {
      id: 'camera.real',
      brand: 'Real Camera',
      canonicalName: 'Real Camera One',
      specs: { evidenceIds: [evidence.id] },
      synthetic: false,
      notForProduction: false,
    },
  ],
  evidence: [evidence],
  compatibilityEdges: [],
  recordingModes: [],
};

describe('production catalog gate', () => {
  it('merges only explicit human-verified, non-synthetic fragments', () => {
    const catalog = mergeProductionFragments([{ file: 'camera.json', value: fragment }]);
    expect(catalog.synthetic).toBe(false);
    expect(catalog.notForProduction).toBe(false);
    expect(catalog.products).toHaveLength(1);
    expect(catalog.sourceFiles).toEqual(['camera.json']);
  });

  it.each([
    ['candidate fragment', { verificationStatus: 'candidate', humanReviewRequired: true }],
    ['synthetic fragment', { synthetic: true }],
  ])('rejects a %s', (_label, change) => {
    expect(() =>
      mergeProductionFragments([{ file: 'unsafe.json', value: { ...fragment, ...change } }]),
    ).toThrow();
  });

  it('rejects a synthetic record hidden inside a production fragment', () => {
    const product = { ...fragment.products[0], synthetic: true };
    expect(() =>
      mergeProductionFragments([
        { file: 'unsafe.json', value: { ...fragment, products: [product] } },
      ]),
    ).toThrow(/production records must explicitly set false/);
  });

  it('rejects a candidate record hidden inside a verified fragment', () => {
    const product = {
      ...fragment.products[0],
      verificationStatus: 'candidate',
      humanReviewRequired: true,
    };
    expect(() =>
      mergeProductionFragments([
        { file: 'unsafe.json', value: { ...fragment, products: [product] } },
      ]),
    ).toThrow(/candidate records cannot enter the production catalog/);
  });

  it('rejects an AI candidate edge', () => {
    const candidate = {
      id: 'edge.candidate',
      sourceProductId: 'camera.real',
      targetProductId: 'camera.real',
      relationType: 'candidate',
      verificationStatus: 'candidate',
      evidenceIds: [evidence.id],
      dimensions: { signal: 'compatible' },
      synthetic: false,
      notForProduction: false,
    };
    expect(() =>
      mergeProductionFragments([
        { file: 'unsafe.json', value: { ...fragment, compatibilityEdges: [candidate] } },
      ]),
    ).toThrow(/candidate records cannot enter the production catalog/);
  });

  it('rejects non-official or non-HTTPS evidence', () => {
    const unsafeEvidence = {
      ...evidence,
      sourceType: 'independent_test',
      url: 'http://review.example/camera',
    };
    expect(() =>
      mergeProductionFragments([
        { file: 'unsafe.json', value: { ...fragment, evidence: [unsafeEvidence] } },
      ]),
    ).toThrow(/production evidence must be official/);
  });

  it('requires official evidence for every asserted edge dimension', () => {
    const microphone = {
      id: 'microphone.real',
      brand: 'Real Audio',
      canonicalName: 'Real Microphone One',
      evidenceIds: [evidence.id],
      synthetic: false,
      notForProduction: false,
    };
    const edge = {
      id: 'edge.camera.microphone',
      sourceProductId: 'camera.real',
      targetProductId: microphone.id,
      relationType: 'directly_compatible',
      verificationStatus: 'verified',
      evidenceIds: [evidence.id],
      dimensions: { electrical: 'compatible', signal: 'compatible' },
      synthetic: false,
      notForProduction: false,
    };
    expect(() =>
      mergeProductionFragments([
        {
          file: 'unsafe.json',
          value: {
            ...fragment,
            products: [...fragment.products, microphone],
            compatibilityEdges: [edge],
          },
        },
      ]),
    ).toThrow(/does not cover asserted dimension electrical/);
  });

  it('fails when no verified fragments exist', () => {
    expect(() => mergeProductionFragments([])).toThrow(/No verified production fragments/);
  });
});
