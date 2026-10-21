export interface ResearchRigProduct {
  readonly id: string;
  readonly brand: string;
  readonly canonicalName: string;
  readonly category: string;
  readonly subcategory: string;
  readonly weightGrams?: number;
  readonly officialUrl?: string;
  readonly sourceReferences?: readonly string[];
  readonly evidenceIds?: readonly string[];
  readonly specs?: { readonly evidenceIds?: readonly string[] };
}

export interface ResearchRigEdge {
  readonly id: string;
  readonly sourceProductId: string;
  readonly targetProductId: string;
  readonly relationType: 'candidate';
  readonly proposedRelationType?: string;
  readonly dimensions?: Readonly<Record<string, string>>;
  readonly compatibilityDimensions?: readonly {
    readonly dimension: string;
    readonly status: string;
    readonly summary: string;
    readonly evidenceIds?: readonly string[];
  }[];
  readonly requiredProductIds?: readonly string[];
  readonly requiredAdapterIds?: readonly string[];
  readonly conditions?: readonly string[];
  readonly limitations?: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly verificationStatus: 'candidate';
}

export interface ResearchRigTemplate {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly requiredCategories: readonly string[];
}

export const RESEARCH_RIG_TEMPLATES: readonly ResearchRigTemplate[] = [
  {
    id: 'vlog',
    label: 'Vlog i YouTube',
    description: 'Korpus, optyka, dźwięk, zapis i stabilizacja.',
    requiredCategories: [
      'capture_device',
      'optics',
      'audio',
      'memory_and_transfer',
      'stabilization_and_mounting',
    ],
  },
  {
    id: 'mobile_video',
    label: 'Mobilne wideo',
    description: 'Telefon lub kamera mobilna, dźwięk, uchwyt i światło.',
    requiredCategories: [
      'capture_device',
      'audio',
      'stabilization_and_mounting',
      'lighting',
    ],
  },
  {
    id: 'interview',
    label: 'Wywiad',
    description: 'Obraz, optyka, dźwięk, światło i pamięć.',
    requiredCategories: ['capture_device', 'optics', 'audio', 'lighting', 'memory_and_transfer'],
  },
  {
    id: 'studio',
    label: 'Studio twórcy',
    description: 'Kompletny tor obrazu, dźwięku, światła, podglądu i zasilania.',
    requiredCategories: [
      'capture_device',
      'optics',
      'audio',
      'lighting',
      'monitoring_and_recording',
      'power',
    ],
  },
  {
    id: 'streaming',
    label: 'Streaming',
    description: 'Źródło obrazu, dźwięk, światło i tor podglądu/rejestracji.',
    requiredCategories: ['capture_device', 'audio', 'lighting', 'monitoring_and_recording'],
  },
  {
    id: 'travel',
    label: 'Zestaw podróżny',
    description: 'Lekki obraz, optyka, dźwięk, pamięć i stabilizacja.',
    requiredCategories: [
      'capture_device',
      'optics',
      'audio',
      'memory_and_transfer',
      'stabilization_and_mounting',
    ],
  },
] as const;

export interface ResearchRigSummary {
  readonly selectedProducts: readonly ResearchRigProduct[];
  readonly totalKnownWeightGrams: number;
  readonly productsWithoutWeight: readonly ResearchRigProduct[];
  readonly evidenceCount: number;
  readonly presentCategories: readonly string[];
  readonly missingCategories: readonly string[];
  readonly candidateEdges: readonly ResearchRigEdge[];
  readonly unknownPairs: number;
  readonly completenessPercent: number;
}

function edgePairKey(edge: Pick<ResearchRigEdge, 'sourceProductId' | 'targetProductId'>): string {
  return [edge.sourceProductId, edge.targetProductId].sort().join('::');
}

export function summarizeResearchRig(
  products: readonly ResearchRigProduct[],
  edges: readonly ResearchRigEdge[],
  selectedIds: readonly string[],
  template: ResearchRigTemplate,
): ResearchRigSummary {
  const selectedIdSet = new Set(selectedIds);
  const selectedProducts = products.filter((product) => selectedIdSet.has(product.id));
  const presentCategories = [...new Set(selectedProducts.map((product) => product.category))];
  const missingCategories = template.requiredCategories.filter(
    (category) => !presentCategories.includes(category),
  );
  const candidateEdges = edges.filter(
    (edge) =>
      edge.relationType === 'candidate' &&
      edge.verificationStatus === 'candidate' &&
      selectedIdSet.has(edge.sourceProductId) &&
      selectedIdSet.has(edge.targetProductId),
  );
  const coveredPairs = new Set(candidateEdges.map(edgePairKey)).size;
  const pairCount = (selectedProducts.length * (selectedProducts.length - 1)) / 2;
  const evidenceIds = new Set<string>();
  for (const product of selectedProducts) {
    for (const id of [
      ...(product.sourceReferences ?? []),
      ...(product.evidenceIds ?? []),
      ...(product.specs?.evidenceIds ?? []),
    ]) {
      evidenceIds.add(id);
    }
  }
  for (const edge of candidateEdges) {
    for (const id of edge.evidenceIds) evidenceIds.add(id);
  }

  return {
    selectedProducts,
    totalKnownWeightGrams: selectedProducts.reduce(
      (sum, product) => sum + (product.weightGrams ?? 0),
      0,
    ),
    productsWithoutWeight: selectedProducts.filter((product) => product.weightGrams === undefined),
    evidenceCount: evidenceIds.size,
    presentCategories,
    missingCategories,
    candidateEdges,
    unknownPairs: Math.max(0, pairCount - coveredPairs),
    completenessPercent:
      template.requiredCategories.length === 0
        ? 0
        : Math.round(
            ((template.requiredCategories.length - missingCategories.length) /
              template.requiredCategories.length) *
              100,
          ),
  };
}

export function serializeResearchRig(
  templateId: string,
  selectedIds: readonly string[],
  ownedIds: readonly string[],
): string {
  return JSON.stringify({
    format: 'creatorrig-research-rig',
    version: 1,
    templateId,
    selectedIds: [...new Set(selectedIds)],
    ownedIds: [...new Set(ownedIds)].filter((id) => selectedIds.includes(id)),
    verificationStatus: 'candidate',
  });
}

export function parseResearchRig(value: string): {
  readonly templateId: string;
  readonly selectedIds: readonly string[];
  readonly ownedIds: readonly string[];
} | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (
      parsed.format !== 'creatorrig-research-rig' ||
      parsed.version !== 1 ||
      typeof parsed.templateId !== 'string' ||
      !Array.isArray(parsed.selectedIds) ||
      !Array.isArray(parsed.ownedIds) ||
      !parsed.selectedIds.every((id) => typeof id === 'string') ||
      !parsed.ownedIds.every((id) => typeof id === 'string')
    ) {
      return null;
    }
    return {
      templateId: parsed.templateId,
      selectedIds: [...new Set(parsed.selectedIds)],
      ownedIds: [...new Set(parsed.ownedIds)],
    };
  } catch {
    return null;
  }
}
