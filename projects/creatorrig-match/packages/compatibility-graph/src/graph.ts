import type { CompatibilityEdge, CompatibilityNode, EdgeQueryOptions } from './types.js';

export class CompatibilityGraph {
  readonly #nodes = new Map<string, CompatibilityNode>();
  readonly #edges = new Map<string, CompatibilityEdge>();
  readonly #outgoing = new Map<string, CompatibilityEdge[]>();
  readonly #incoming = new Map<string, CompatibilityEdge[]>();

  constructor(nodes: readonly CompatibilityNode[] = [], edges: readonly CompatibilityEdge[] = []) {
    for (const node of nodes) this.addNode(node);
    for (const edge of edges) this.addEdge(edge);
  }

  addNode(node: CompatibilityNode): void {
    if (this.#nodes.has(node.id)) throw new Error(`Duplicate graph node: ${node.id}`);
    this.#nodes.set(node.id, node);
  }

  addEdge(edge: CompatibilityEdge): void {
    if (this.#edges.has(edge.id)) throw new Error(`Duplicate graph edge: ${edge.id}`);
    if (!this.#nodes.has(edge.sourceProductId)) {
      throw new Error(`Unknown source node for edge ${edge.id}: ${edge.sourceProductId}`);
    }
    if (!this.#nodes.has(edge.targetProductId)) {
      throw new Error(`Unknown target node for edge ${edge.id}: ${edge.targetProductId}`);
    }
    if (edge.sourceProductId === edge.targetProductId) {
      throw new Error(`Self edges are not allowed: ${edge.id}`);
    }

    this.#edges.set(edge.id, edge);
    const outgoing = this.#outgoing.get(edge.sourceProductId) ?? [];
    outgoing.push(edge);
    this.#outgoing.set(edge.sourceProductId, outgoing);
    const incoming = this.#incoming.get(edge.targetProductId) ?? [];
    incoming.push(edge);
    this.#incoming.set(edge.targetProductId, incoming);
  }

  getNode(id: string): CompatibilityNode | undefined {
    return this.#nodes.get(id);
  }

  getEdge(id: string): CompatibilityEdge | undefined {
    return this.#edges.get(id);
  }

  nodes(): readonly CompatibilityNode[] {
    return [...this.#nodes.values()];
  }

  edges(): readonly CompatibilityEdge[] {
    return [...this.#edges.values()];
  }

  outgoing(productId: string, options: EdgeQueryOptions = {}): readonly CompatibilityEdge[] {
    return this.#filter(this.#outgoing.get(productId) ?? [], options);
  }

  incoming(productId: string, options: EdgeQueryOptions = {}): readonly CompatibilityEdge[] {
    return this.#filter(this.#incoming.get(productId) ?? [], options);
  }

  between(
    sourceProductId: string,
    targetProductId: string,
    options: EdgeQueryOptions = {},
  ): readonly CompatibilityEdge[] {
    return this.outgoing(sourceProductId, options).filter(
      (edge) => edge.targetProductId === targetProductId,
    );
  }

  #filter(edges: readonly CompatibilityEdge[], options: EdgeQueryOptions): CompatibilityEdge[] {
    return edges.filter((edge) => {
      if (!options.includeUnverified && edge.verificationStatus !== 'verified') return false;
      if (options.relationTypes && !options.relationTypes.includes(edge.relationType)) return false;
      return true;
    });
  }
}
