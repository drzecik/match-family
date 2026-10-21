export const RELATION_TYPES = [
  'directly_compatible',
  'compatible_with_adapter',
  'compatible_with_limitations',
  'physically_compatible_only',
  'electronically_compatible_only',
  'conditionally_compatible',
  'incompatible',
  'unknown',
  'candidate',
  'deprecated',
] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

export const COMPATIBILITY_DIMENSIONS = [
  'mechanical',
  'electrical',
  'signal_protocol',
  'optical',
  'memory',
  'software_firmware',
] as const;

export type CompatibilityDimension = (typeof COMPATIBILITY_DIMENSIONS)[number];

export type DimensionStatus =
  'compatible' | 'compatible_with_limitations' | 'incompatible' | 'unknown' | 'not_applicable';

export interface DimensionResult {
  readonly status: DimensionStatus;
  readonly verified: boolean;
  readonly explanation: string;
}

export type VerificationStatus = 'verified' | 'candidate' | 'rejected' | 'stale' | 'deprecated';

export type InterfaceDirection = 'input' | 'output' | 'bidirectional';

export interface GraphInterface {
  readonly id: string;
  readonly connector: string;
  readonly direction: InterfaceDirection;
  /** Explicit protocol identifiers. Connector names are never treated as protocols. */
  readonly protocols: readonly string[];
}

export interface SafeInterfaceTransition {
  readonly fromInterfaceId: string;
  readonly toInterfaceId: string;
  readonly verified: boolean;
  readonly protocolSafety: 'safe' | 'unsafe' | 'unknown' | 'not_applicable';
  readonly electricalSafety: 'safe' | 'unsafe' | 'unknown' | 'not_applicable';
  readonly explanation: string;
}

export interface CompatibilityNode {
  readonly id: string;
  readonly productType?: string;
  readonly interfaces?: readonly GraphInterface[];
  /** Verified internal routing/conversion through an adapter, cable, or active device. */
  readonly safeTransitions?: readonly SafeInterfaceTransition[];
}

export interface CompatibilityEdge {
  readonly id: string;
  readonly sourceProductId: string;
  readonly targetProductId: string;
  readonly sourceInterfaceId?: string;
  readonly targetInterfaceId?: string;
  /** Product-relation direction and actual signal/power flow may differ. */
  readonly interfaceFlow:
    'source_to_target' | 'target_to_source' | 'bidirectional' | 'not_applicable';
  readonly relationType: RelationType;
  readonly compatibilityDimensions: Readonly<
    Partial<Record<CompatibilityDimension, DimensionResult>>
  >;
  readonly requiredAdapterIds?: readonly string[];
  readonly limitations?: readonly string[];
  readonly conditions?: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly verificationStatus: VerificationStatus;
  readonly verifiedAt?: string;
  /** Human-readable, evidence-scoped explanation of this exact directional connection. */
  readonly explanation: string;
}

export interface EdgeQueryOptions {
  readonly includeUnverified?: boolean;
  readonly relationTypes?: readonly RelationType[];
}

export const NON_TRAVERSABLE_RELATIONS: ReadonlySet<RelationType> = new Set([
  'incompatible',
  'unknown',
  'candidate',
  'deprecated',
  'physically_compatible_only',
  'electronically_compatible_only',
]);

export function isVerifiedTraversableEdge(edge: CompatibilityEdge): boolean {
  if (edge.verificationStatus !== 'verified' || edge.evidenceIds.length === 0) return false;
  if (NON_TRAVERSABLE_RELATIONS.has(edge.relationType)) return false;

  const dimensionResults = Object.values(edge.compatibilityDimensions);
  if (dimensionResults.length === 0) return false;

  return dimensionResults.every(
    (dimension) =>
      dimension !== undefined &&
      dimension.verified &&
      dimension.status !== 'incompatible' &&
      dimension.status !== 'unknown',
  );
}
