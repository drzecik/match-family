export type RecommendationRelation =
  | 'directly_compatible'
  | 'compatible_with_adapter'
  | 'compatible_with_limitations'
  | 'physically_compatible_only'
  | 'electronically_compatible_only'
  | 'conditionally_compatible'
  | 'incompatible'
  | 'unknown'
  | 'candidate'
  | 'deprecated';

export type VerificationStatus = 'verified' | 'candidate' | 'deprecated';
export type SafetyStatus = 'safe' | 'unknown' | 'unsafe';
export type ExclusionReason =
  | 'not_verified'
  | 'no_evidence'
  | 'conditions_not_satisfied'
  | 'not_recommendable_relation'
  | 'safety_not_verified'
  | 'unsafe';

export interface RecommendationCandidate {
  readonly id: string;
  readonly relation: RecommendationRelation;
  readonly verificationStatus: VerificationStatus;
  readonly safetyStatus: SafetyStatus;
  readonly evidenceIds: readonly string[];
  /** Must be true before a conditional relation can enter a recommendation. */
  readonly conditionsSatisfied?: boolean;
  /** 0..1, computed from user requirements without affiliate inputs. */
  readonly requirementFit: number;
  readonly owned: boolean;
  readonly withinBudget: boolean;
  /** 0..1. */
  readonly qualityScore: number;
  /** 0..1. */
  readonly availabilityScore: number;
  readonly priceMinor?: number;
  readonly affiliate?: boolean;
  readonly sponsored?: boolean;
}

export interface RankedRecommendation extends RecommendationCandidate {
  readonly rank: number;
}

export interface ExcludedRecommendation {
  readonly candidate: RecommendationCandidate;
  readonly reason: ExclusionReason;
}

export interface RecommendationRanking {
  readonly ranked: readonly RankedRecommendation[];
  readonly excluded: readonly ExcludedRecommendation[];
}

const RELATION_PRIORITY: Readonly<Record<RecommendationRelation, number>> = {
  directly_compatible: 4,
  compatible_with_adapter: 3,
  compatible_with_limitations: 2,
  conditionally_compatible: 1,
  physically_compatible_only: 0,
  electronically_compatible_only: 0,
  incompatible: 0,
  unknown: 0,
  candidate: 0,
  deprecated: 0,
};

const RECOMMENDABLE = new Set<RecommendationRelation>([
  'directly_compatible',
  'compatible_with_adapter',
  'compatible_with_limitations',
  'conditionally_compatible',
]);

function finiteScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function exclusionReason(candidate: RecommendationCandidate): ExclusionReason | undefined {
  if (candidate.verificationStatus !== 'verified' || candidate.relation === 'candidate')
    return 'not_verified';
  if (!candidate.evidenceIds.some((id) => id.trim().length > 0)) return 'no_evidence';
  if (!RECOMMENDABLE.has(candidate.relation)) return 'not_recommendable_relation';
  if (candidate.safetyStatus === 'unsafe') return 'unsafe';
  if (candidate.safetyStatus === 'unknown') return 'safety_not_verified';
  if (candidate.relation === 'conditionally_compatible' && candidate.conditionsSatisfied !== true)
    return 'conditions_not_satisfied';
  return undefined;
}

/**
 * Lexicographic policy ordering. Affiliate and sponsorship flags are intentionally
 * absent from the comparator, so they cannot change compatibility ranking.
 */
function compare(left: RecommendationCandidate, right: RecommendationCandidate): number {
  return (
    RELATION_PRIORITY[right.relation] - RELATION_PRIORITY[left.relation] ||
    finiteScore(right.requirementFit) - finiteScore(left.requirementFit) ||
    Number(right.owned) - Number(left.owned) ||
    Number(right.withinBudget) - Number(left.withinBudget) ||
    finiteScore(right.qualityScore) - finiteScore(left.qualityScore) ||
    finiteScore(right.availabilityScore) - finiteScore(left.availabilityScore) ||
    (left.priceMinor ?? Number.POSITIVE_INFINITY) -
      (right.priceMinor ?? Number.POSITIVE_INFINITY) ||
    left.id.localeCompare(right.id)
  );
}

export function rankRecommendations(
  candidates: readonly RecommendationCandidate[],
): RecommendationRanking {
  const eligible: RecommendationCandidate[] = [];
  const excluded: ExcludedRecommendation[] = [];

  for (const candidate of candidates) {
    const reason = exclusionReason(candidate);
    if (reason === undefined) eligible.push(candidate);
    else excluded.push({ candidate, reason });
  }

  return {
    ranked: [...eligible]
      .sort(compare)
      .map((candidate, index) => ({ ...candidate, rank: index + 1 })),
    excluded,
  };
}
