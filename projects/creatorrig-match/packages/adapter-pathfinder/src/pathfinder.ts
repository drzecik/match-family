import {
  isVerifiedTraversableEdge,
  type CompatibilityEdge,
  type CompatibilityGraph,
  type CompatibilityNode,
  type GraphInterface,
  type SafeInterfaceTransition,
} from '@creatorrig/compatibility-graph';

export interface AdapterPathfinderOptions {
  /** Number of products between source and target. Hard-capped for safe, explainable results. */
  readonly maxIntermediateProducts?: number;
  readonly maxPaths?: number;
}

export interface PathExplanationStep {
  readonly kind: 'connection' | 'internal_transition';
  readonly productId?: string;
  readonly edgeId?: string;
  readonly explanation: string;
}

export interface SafeCompatibilityPath {
  readonly productIds: readonly string[];
  readonly edgeIds: readonly string[];
  readonly intermediateProductIds: readonly string[];
  readonly explanations: readonly PathExplanationStep[];
  readonly limitations: readonly string[];
}

export interface RejectedPathStep {
  readonly edgeId?: string;
  readonly productId?: string;
  readonly reason:
    | 'unverified_relation'
    | 'unsafe_or_unknown_electrical'
    | 'unsafe_or_unknown_protocol'
    | 'interface_direction_mismatch'
    | 'missing_interface_evidence'
    | 'missing_verified_internal_transition'
    | 'cycle';
  readonly explanation: string;
}

export interface AdapterPathfinderResult {
  readonly paths: readonly SafeCompatibilityPath[];
  readonly rejections: readonly RejectedPathStep[];
}

interface QueueState {
  readonly currentId: string;
  readonly productIds: readonly string[];
  readonly edges: readonly CompatibilityEdge[];
  readonly explanations: readonly PathExplanationStep[];
}

const MAX_INTERMEDIATES_HARD_LIMIT = 4;

export function findSafeAdapterPaths(
  graph: CompatibilityGraph,
  sourceProductId: string,
  targetProductId: string,
  options: AdapterPathfinderOptions = {},
): AdapterPathfinderResult {
  if (!graph.getNode(sourceProductId))
    throw new Error(`Unknown source product: ${sourceProductId}`);
  if (!graph.getNode(targetProductId))
    throw new Error(`Unknown target product: ${targetProductId}`);
  if (sourceProductId === targetProductId) {
    throw new Error('Source and target must be different products');
  }

  const maxIntermediateProducts = Math.min(
    Math.max(options.maxIntermediateProducts ?? 3, 0),
    MAX_INTERMEDIATES_HARD_LIMIT,
  );
  const maxEdges = maxIntermediateProducts + 1;
  const maxPaths = Math.max(options.maxPaths ?? 5, 1);
  const rejections: RejectedPathStep[] = [];
  const paths: SafeCompatibilityPath[] = [];
  const queue: QueueState[] = [
    { currentId: sourceProductId, productIds: [sourceProductId], edges: [], explanations: [] },
  ];

  while (queue.length > 0 && paths.length < maxPaths) {
    const state = queue.shift();
    if (!state) break;
    if (state.edges.length >= maxEdges) continue;

    for (const edge of graph.outgoing(state.currentId, { includeUnverified: true })) {
      const edgeRejection = validateEdge(graph, edge);
      if (edgeRejection) {
        rejections.push(edgeRejection);
        continue;
      }

      if (state.productIds.includes(edge.targetProductId)) {
        rejections.push({
          edgeId: edge.id,
          productId: edge.targetProductId,
          reason: 'cycle',
          explanation: `Edge ${edge.id} would revisit ${edge.targetProductId}.`,
        });
        continue;
      }

      const transition = validateIntermediateTransition(graph, state.edges.at(-1), edge);
      if (transition.rejection) {
        rejections.push(transition.rejection);
        continue;
      }

      const explanations = [
        ...state.explanations,
        ...(transition.explanation ? [transition.explanation] : []),
        { kind: 'connection' as const, edgeId: edge.id, explanation: edge.explanation },
      ];
      const edges = [...state.edges, edge];
      const productIds = [...state.productIds, edge.targetProductId];

      if (edge.targetProductId === targetProductId) {
        paths.push({
          productIds,
          edgeIds: edges.map((pathEdge) => pathEdge.id),
          intermediateProductIds: productIds.slice(1, -1),
          explanations,
          limitations: edges.flatMap((pathEdge) => pathEdge.limitations ?? []),
        });
      } else {
        queue.push({ currentId: edge.targetProductId, productIds, edges, explanations });
      }
    }
  }

  paths.sort((left, right) => {
    const byLength = left.edgeIds.length - right.edgeIds.length;
    return byLength !== 0 ? byLength : left.limitations.length - right.limitations.length;
  });

  return { paths, rejections: deduplicateRejections(rejections) };
}

function validateEdge(
  graph: CompatibilityGraph,
  edge: CompatibilityEdge,
): RejectedPathStep | undefined {
  const electrical = edge.compatibilityDimensions.electrical;
  if (
    electrical &&
    (electrical.status === 'unknown' ||
      electrical.status === 'incompatible' ||
      !electrical.verified)
  ) {
    return {
      edgeId: edge.id,
      reason: 'unsafe_or_unknown_electrical',
      explanation: electrical.explanation,
    };
  }

  const signal = edge.compatibilityDimensions.signal_protocol;
  if (
    signal &&
    (signal.status === 'unknown' || signal.status === 'incompatible' || !signal.verified)
  ) {
    return {
      edgeId: edge.id,
      reason: 'unsafe_or_unknown_protocol',
      explanation: signal.explanation,
    };
  }

  if (!isVerifiedTraversableEdge(edge)) {
    return {
      edgeId: edge.id,
      reason: 'unverified_relation',
      explanation: `Edge ${edge.id} is not a verified, evidence-backed traversable relation.`,
    };
  }

  if ((edge.sourceInterfaceId === undefined) !== (edge.targetInterfaceId === undefined)) {
    return {
      edgeId: edge.id,
      reason: 'missing_interface_evidence',
      explanation: `Edge ${edge.id} identifies only one side of the connection.`,
    };
  }

  if (edge.sourceInterfaceId && edge.targetInterfaceId) {
    const source = findInterface(graph.getNode(edge.sourceProductId), edge.sourceInterfaceId);
    const target = findInterface(graph.getNode(edge.targetProductId), edge.targetInterfaceId);
    if (!source || !target) {
      return {
        edgeId: edge.id,
        reason: 'missing_interface_evidence',
        explanation: `Edge ${edge.id} references an interface absent from its product.`,
      };
    }
    if (!interfaceDirectionsMatch(edge, source, target)) {
      return {
        edgeId: edge.id,
        reason: 'interface_direction_mismatch',
        explanation: `Interfaces on edge ${edge.id} do not have output-to-input direction.`,
      };
    }
    if (signal && signal.status !== 'not_applicable' && !hasProtocolOverlap(source, target)) {
      return {
        edgeId: edge.id,
        reason: 'unsafe_or_unknown_protocol',
        explanation: `Connector fit on edge ${edge.id} has no explicitly shared protocol.`,
      };
    }
  }

  return undefined;
}

function validateIntermediateTransition(
  graph: CompatibilityGraph,
  incoming: CompatibilityEdge | undefined,
  outgoing: CompatibilityEdge,
): { explanation?: PathExplanationStep; rejection?: RejectedPathStep } {
  if (!incoming) return {};
  const productId = incoming.targetProductId;
  if (productId !== outgoing.sourceProductId) {
    return {
      rejection: {
        productId,
        reason: 'missing_verified_internal_transition',
        explanation: 'Path edges are not contiguous.',
      },
    };
  }
  if (!incoming.targetInterfaceId || !outgoing.sourceInterfaceId) {
    return {
      rejection: {
        productId,
        edgeId: outgoing.id,
        reason: 'missing_verified_internal_transition',
        explanation: `No interface-scoped continuity evidence through ${productId}.`,
      },
    };
  }

  const node = graph.getNode(productId);
  const transition = node?.safeTransitions?.find(
    (item) =>
      item.fromInterfaceId === incoming.targetInterfaceId &&
      item.toInterfaceId === outgoing.sourceInterfaceId,
  );
  const rejection = unsafeTransitionRejection(productId, outgoing.id, transition);
  if (rejection) return { rejection };

  return {
    explanation: {
      kind: 'internal_transition',
      productId,
      explanation: transition?.explanation ?? 'Verified internal transition.',
    },
  };
}

function unsafeTransitionRejection(
  productId: string,
  edgeId: string,
  transition: SafeInterfaceTransition | undefined,
): RejectedPathStep | undefined {
  if (!transition || !transition.verified) {
    return {
      productId,
      edgeId,
      reason: 'missing_verified_internal_transition',
      explanation: `No verified internal interface transition through ${productId}.`,
    };
  }
  if (transition.electricalSafety === 'unsafe' || transition.electricalSafety === 'unknown') {
    return {
      productId,
      edgeId,
      reason: 'unsafe_or_unknown_electrical',
      explanation: transition.explanation,
    };
  }
  if (transition.protocolSafety === 'unsafe' || transition.protocolSafety === 'unknown') {
    return {
      productId,
      edgeId,
      reason: 'unsafe_or_unknown_protocol',
      explanation: transition.explanation,
    };
  }
  return undefined;
}

function findInterface(
  node: CompatibilityNode | undefined,
  id: string,
): GraphInterface | undefined {
  return node?.interfaces?.find((item) => item.id === id);
}

function canOutput(value: GraphInterface): boolean {
  return value.direction === 'output' || value.direction === 'bidirectional';
}

function canInput(value: GraphInterface): boolean {
  return value.direction === 'input' || value.direction === 'bidirectional';
}

function interfaceDirectionsMatch(
  edge: CompatibilityEdge,
  source: GraphInterface,
  target: GraphInterface,
): boolean {
  switch (edge.interfaceFlow) {
    case 'source_to_target':
      return canOutput(source) && canInput(target);
    case 'target_to_source':
      return canInput(source) && canOutput(target);
    case 'bidirectional':
      return source.direction === 'bidirectional' && target.direction === 'bidirectional';
    case 'not_applicable':
      return true;
  }
}

function hasProtocolOverlap(source: GraphInterface, target: GraphInterface): boolean {
  return source.protocols.some((protocol) => target.protocols.includes(protocol));
}

function deduplicateRejections(items: readonly RejectedPathStep[]): RejectedPathStep[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.edgeId ?? ''}:${item.productId ?? ''}:${item.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
