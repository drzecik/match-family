import { describe, expect, it } from 'vitest';
import {
  CompatibilityGraph,
  type CompatibilityEdge,
  type CompatibilityNode,
  type DimensionResult,
} from '@creatorrig/compatibility-graph';
import { findSafeAdapterPaths } from '../src/index.js';

const compatible: DimensionResult = {
  status: 'compatible',
  verified: true,
  explanation: 'Official documentation confirms continuity.',
};

const port = (id: string, direction: 'input' | 'output', protocol = 'analog_audio') =>
  ({
    id,
    connector: 'synthetic',
    direction,
    protocols: [protocol],
  }) as const;

const node = (
  id: string,
  inputProtocol = 'analog_audio',
  outputProtocol = inputProtocol,
  safety: 'safe' | 'unsafe' | 'unknown' = 'safe',
): CompatibilityNode => ({
  id,
  interfaces: [
    port(`${id}-in`, 'input', inputProtocol),
    port(`${id}-out`, 'output', outputProtocol),
  ],
  safeTransitions: [
    {
      fromInterfaceId: `${id}-in`,
      toInterfaceId: `${id}-out`,
      verified: true,
      electricalSafety: safety,
      protocolSafety: safety,
      explanation: `${id} transition is ${safety}.`,
    },
  ],
});

const edge = (
  id: string,
  source: string,
  target: string,
  overrides: Partial<CompatibilityEdge> = {},
): CompatibilityEdge => ({
  id,
  sourceProductId: source,
  targetProductId: target,
  sourceInterfaceId: `${source}-out`,
  targetInterfaceId: `${target}-in`,
  interfaceFlow: 'source_to_target',
  relationType: 'directly_compatible',
  compatibilityDimensions: { electrical: compatible, signal_protocol: compatible },
  evidenceIds: [`evidence-${id}`],
  verificationStatus: 'verified',
  explanation: `${source} connects to ${target}.`,
  ...overrides,
});

describe('findSafeAdapterPaths', () => {
  it('prefers direct, then one-adapter, then multi-adapter paths', () => {
    const nodes = [node('source'), node('adapter'), node('cable'), node('target')];
    const graph = new CompatibilityGraph(nodes, [
      edge('direct', 'source', 'target'),
      edge('to-adapter', 'source', 'adapter'),
      edge('adapter-to-target', 'adapter', 'target'),
      edge('adapter-to-cable', 'adapter', 'cable'),
      edge('cable-to-target', 'cable', 'target'),
    ]);
    const result = findSafeAdapterPaths(graph, 'source', 'target');
    expect(result.paths.map((path) => path.edgeIds.length)).toEqual([1, 2, 3]);
    expect(result.paths[1]?.explanations.some((step) => step.kind === 'internal_transition')).toBe(
      true,
    );
  });

  it('avoids cycles', () => {
    const graph = new CompatibilityGraph(
      [node('source'), node('adapter'), node('target')],
      [
        edge('out', 'source', 'adapter'),
        edge('cycle', 'adapter', 'source'),
        edge('finish', 'adapter', 'target'),
      ],
    );
    const result = findSafeAdapterPaths(graph, 'source', 'target');
    expect(result.paths).toHaveLength(1);
    expect(result.rejections.some((item) => item.reason === 'cycle')).toBe(true);
  });

  it.each([
    ['candidate', 'candidate'],
    ['unknown', 'verified'],
    ['incompatible', 'verified'],
    ['deprecated', 'deprecated'],
  ] as const)('excludes %s relations', (relationType, verificationStatus) => {
    const graph = new CompatibilityGraph(
      [node('source'), node('target')],
      [edge('bad', 'source', 'target', { relationType, verificationStatus })],
    );
    expect(findSafeAdapterPaths(graph, 'source', 'target').paths).toHaveLength(0);
  });

  it('rejects an intermediate product with unsafe or unknown electrical routing', () => {
    const graph = new CompatibilityGraph(
      [node('source'), node('adapter', 'analog_audio', 'analog_audio', 'unknown'), node('target')],
      [edge('one', 'source', 'adapter'), edge('two', 'adapter', 'target')],
    );
    const result = findSafeAdapterPaths(graph, 'source', 'target');
    expect(result.paths).toHaveLength(0);
    expect(result.rejections.some((item) => item.reason === 'unsafe_or_unknown_electrical')).toBe(
      true,
    );
  });

  it('rejects an edge with incompatible electrical evidence', () => {
    const graph = new CompatibilityGraph(
      [node('source'), node('target')],
      [
        edge('wrong-voltage', 'source', 'target', {
          compatibilityDimensions: {
            electrical: {
              status: 'incompatible',
              verified: true,
              explanation: 'Voltage ranges do not overlap.',
            },
            signal_protocol: compatible,
          },
        }),
      ],
    );
    const result = findSafeAdapterPaths(graph, 'source', 'target');
    expect(result.paths).toHaveLength(0);
    expect(result.rejections.some((item) => item.reason === 'unsafe_or_unknown_electrical')).toBe(
      true,
    );
  });

  it('rejects connector fit when explicit protocols differ', () => {
    const source = node('source', 'analog_audio', 'usb_audio');
    const target = node('target', 'analog_audio', 'analog_audio');
    const graph = new CompatibilityGraph(
      [source, target],
      [edge('looks-similar', 'source', 'target')],
    );
    const result = findSafeAdapterPaths(graph, 'source', 'target');
    expect(result.paths).toHaveLength(0);
    expect(result.rejections.some((item) => item.reason === 'unsafe_or_unknown_protocol')).toBe(
      true,
    );
  });

  it('keeps product-relation direction separate from reverse audio signal flow', () => {
    const host: CompatibilityNode = {
      id: 'host',
      interfaces: [port('host-in', 'input')],
    };
    const receiver: CompatibilityNode = {
      id: 'receiver',
      interfaces: [port('receiver-out', 'output')],
    };
    const graph = new CompatibilityGraph(
      [host, receiver],
      [
        edge('host-selects-receiver', 'host', 'receiver', {
          sourceInterfaceId: 'host-in',
          targetInterfaceId: 'receiver-out',
          interfaceFlow: 'target_to_source',
        }),
      ],
    );
    expect(findSafeAdapterPaths(graph, 'host', 'receiver').paths).toHaveLength(1);
  });

  it('requires interface-scoped transition evidence for multi-step paths', () => {
    const adapter = { ...node('adapter'), safeTransitions: [] };
    const graph = new CompatibilityGraph(
      [node('source'), adapter, node('target')],
      [edge('one', 'source', 'adapter'), edge('two', 'adapter', 'target')],
    );
    expect(findSafeAdapterPaths(graph, 'source', 'target').paths).toHaveLength(0);
  });
});
