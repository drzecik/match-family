import { describe, expect, it } from 'vitest';
import {
  buildPublicGraphArtifact,
  buildSearchArtifact,
  reportGraphConflicts,
  reportMissingCoreRelations,
  reportStaleEvidence,
  type OperationalData,
} from './data-operations.js';

const data: OperationalData = {
  products: [
    {
      id: 'camera',
      canonicalName: 'Nova Cám',
      aliases: ['N-Cam'],
      category: 'capture_device',
      subcategory: 'camera',
      synthetic: true,
      notForProduction: true,
    },
    {
      id: 'lens',
      canonicalName: 'Lens',
      aliases: [],
      category: 'optics',
      subcategory: 'lens',
      synthetic: true,
      notForProduction: true,
    },
  ],
  compatibilityEdges: [
    {
      id: 'verified',
      sourceProductId: 'camera',
      targetProductId: 'lens',
      relationType: 'directly_compatible',
      verificationStatus: 'verified',
      evidenceIds: ['manual'],
    },
    {
      id: 'candidate',
      sourceProductId: 'camera',
      targetProductId: 'lens',
      relationType: 'candidate',
      verificationStatus: 'candidate',
      evidenceIds: [],
    },
  ],
  evidence: [{ id: 'manual', verifiedAt: '2026-07-01', status: 'verified' }],
};

describe('deterministic data operations', () => {
  it('builds public graph without candidate edges', () => {
    expect(buildPublicGraphArtifact(data).edges.map((edge) => edge.id)).toEqual(['verified']);
  });

  it('builds normalized local search terms', () => {
    expect(buildSearchArtifact(data).records[0]?.normalizedTerms).toContain('nova cam');
  });

  it('reports contradictory verified claims and missing evidence', () => {
    const changed: OperationalData = {
      ...data,
      compatibilityEdges: [
        ...data.compatibilityEdges,
        {
          id: 'negative',
          sourceProductId: 'camera',
          targetProductId: 'lens',
          relationType: 'incompatible',
          verificationStatus: 'verified',
          evidenceIds: [],
        },
      ],
    };
    expect(reportGraphConflicts(changed)).toEqual([
      'contradictory_verified_pair:camera->lens',
      'verified_without_evidence:negative',
    ]);
  });

  it('reports stale evidence deterministically', () => {
    expect(reportStaleEvidence(data, '2026-07-17', 30)).toEqual([]);
    expect(reportStaleEvidence(data, '2027-07-17', 30)).toEqual(['manual']);
  });

  it('reports absent core relationships without creating them', () => {
    expect(reportMissingCoreRelations({ ...data, compatibilityEdges: [] })).toEqual([
      'camera->lens',
    ]);
  });
});
