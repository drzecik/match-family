import { describe, expect, it } from 'vitest';
import {
  CompatibilityGraph,
  isVerifiedTraversableEdge,
  type CompatibilityEdge,
} from '../src/index.js';

const edge = (overrides: Partial<CompatibilityEdge> = {}): CompatibilityEdge => ({
  id: 'camera-mic',
  sourceProductId: 'camera',
  targetProductId: 'mic',
  interfaceFlow: 'not_applicable',
  relationType: 'directly_compatible',
  compatibilityDimensions: {
    signal_protocol: { status: 'compatible', verified: true, explanation: 'TRS analog audio' },
  },
  evidenceIds: ['manual-1'],
  verificationStatus: 'verified',
  verifiedAt: '2026-07-17',
  explanation: 'Camera input accepts the microphone output.',
  ...overrides,
});

describe('CompatibilityGraph', () => {
  it('keeps edges directional', () => {
    const graph = new CompatibilityGraph([{ id: 'camera' }, { id: 'mic' }], [edge()]);
    expect(graph.between('camera', 'mic')).toHaveLength(1);
    expect(graph.between('mic', 'camera')).toHaveLength(0);
  });

  it('hides candidates by default while preserving them for editorial workflows', () => {
    const candidate = edge({
      id: 'candidate',
      relationType: 'candidate',
      verificationStatus: 'candidate',
    });
    const graph = new CompatibilityGraph([{ id: 'camera' }, { id: 'mic' }], [candidate]);
    expect(graph.outgoing('camera')).toHaveLength(0);
    expect(graph.outgoing('camera', { includeUnverified: true })).toEqual([candidate]);
    expect(isVerifiedTraversableEdge(candidate)).toBe(false);
  });

  it('rejects dangling and self edges', () => {
    const graph = new CompatibilityGraph([{ id: 'camera' }, { id: 'mic' }]);
    expect(() => graph.addEdge(edge({ targetProductId: 'missing' }))).toThrow('Unknown target');
    expect(() => graph.addEdge(edge({ targetProductId: 'camera' }))).toThrow('Self edges');
  });

  it('does not traverse unknown dimensions or evidence-free relations', () => {
    expect(isVerifiedTraversableEdge(edge({ evidenceIds: [] }))).toBe(false);
    expect(isVerifiedTraversableEdge(edge({ compatibilityDimensions: {} }))).toBe(false);
    expect(
      isVerifiedTraversableEdge(
        edge({
          compatibilityDimensions: {
            electrical: { status: 'unknown', verified: false, explanation: 'No voltage evidence' },
          },
        }),
      ),
    ).toBe(false);
  });
});
