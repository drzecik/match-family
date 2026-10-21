export interface OperationalProduct {
  readonly id: string;
  readonly canonicalName: string;
  readonly aliases: readonly string[];
  readonly category: string;
  readonly subcategory: string;
  readonly synthetic: boolean;
  readonly notForProduction: boolean;
}

export interface OperationalEdge {
  readonly id: string;
  readonly sourceProductId: string;
  readonly targetProductId: string;
  readonly relationType: string;
  readonly verificationStatus: string;
  readonly evidenceIds: readonly string[];
}

export interface OperationalEvidence {
  readonly id: string;
  readonly verifiedAt: string;
  readonly status: string;
}

export interface OperationalData {
  readonly products: readonly OperationalProduct[];
  readonly compatibilityEdges: readonly OperationalEdge[];
  readonly evidence: readonly OperationalEvidence[];
}

export function buildPublicGraphArtifact(data: OperationalData) {
  const products = data.products.filter((product) => product.synthetic && product.notForProduction);
  const allowedIds = new Set(products.map((product) => product.id));
  const edges = data.compatibilityEdges.filter(
    (edge) =>
      edge.verificationStatus === 'verified' &&
      edge.relationType !== 'candidate' &&
      edge.relationType !== 'unknown' &&
      edge.evidenceIds.length > 0 &&
      allowedIds.has(edge.sourceProductId) &&
      allowedIds.has(edge.targetProductId),
  );
  return {
    schemaVersion: '1.0.0-demo',
    synthetic: true,
    notForProduction: true,
    products: products.map(({ id, canonicalName, category, subcategory }) => ({
      id,
      canonicalName,
      category,
      subcategory,
    })),
    edges,
  } as const;
}

export function buildSearchArtifact(data: OperationalData) {
  return {
    schemaVersion: '1.0.0-demo',
    synthetic: true,
    notForProduction: true,
    records: data.products.map((product) => ({
      id: product.id,
      canonicalName: product.canonicalName,
      aliases: product.aliases,
      category: product.category,
      subcategory: product.subcategory,
      normalizedTerms: [product.canonicalName, ...product.aliases]
        .map(normalizeSearchTerm)
        .filter(Boolean),
    })),
  } as const;
}

export function reportGraphConflicts(data: OperationalData): readonly string[] {
  const reports: string[] = [];
  const byPair = new Map<string, OperationalEdge[]>();
  for (const edge of data.compatibilityEdges) {
    const key = `${edge.sourceProductId}->${edge.targetProductId}`;
    byPair.set(key, [...(byPair.get(key) ?? []), edge]);
    if (edge.verificationStatus === 'verified' && edge.evidenceIds.length === 0)
      reports.push(`verified_without_evidence:${edge.id}`);
  }
  for (const [pair, edges] of byPair) {
    const verified = edges.filter((edge) => edge.verificationStatus === 'verified');
    const hasPositive = verified.some((edge) =>
      ['directly_compatible', 'compatible_with_adapter', 'compatible_with_limitations'].includes(
        edge.relationType,
      ),
    );
    const hasNegative = verified.some((edge) => edge.relationType === 'incompatible');
    if (hasPositive && hasNegative) reports.push(`contradictory_verified_pair:${pair}`);
  }
  return reports.sort();
}

export function reportStaleEvidence(
  data: OperationalData,
  now: string,
  maximumAgeDays: number,
): readonly string[] {
  const nowMs = Date.parse(now);
  const maximumAgeMs = maximumAgeDays * 86_400_000;
  return data.evidence
    .filter((evidence) => {
      const verifiedAt = Date.parse(evidence.verifiedAt);
      return (
        evidence.status === 'verified' &&
        (!Number.isFinite(verifiedAt) ||
          !Number.isFinite(nowMs) ||
          maximumAgeDays < 0 ||
          nowMs - verifiedAt > maximumAgeMs)
      );
    })
    .map((evidence) => evidence.id)
    .sort();
}

export function reportMissingCoreRelations(data: OperationalData): readonly string[] {
  const devices = data.products.filter((product) => product.category === 'capture_device');
  const targets = data.products.filter(
    (product) =>
      product.subcategory === 'lens' ||
      product.subcategory === 'wired_microphone' ||
      product.subcategory === 'audio_receiver',
  );
  const known = new Set(
    data.compatibilityEdges.map((edge) => `${edge.sourceProductId}->${edge.targetProductId}`),
  );
  return devices
    .flatMap((device) =>
      targets
        .filter((target) => !known.has(`${device.id}->${target.id}`))
        .map((target) => `${device.id}->${target.id}`),
    )
    .sort();
}

function normalizeSearchTerm(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
