import type { EvaluationDimension, EvaluationStatus } from './types.js';

export interface AggregateStatusInput {
  /**
   * False when the exact scoped evidence required for this evaluation is absent.
   * An unevidenced evaluation yields `unknown`: without proof the engine asserts
   * neither a positive nor a negative compatibility claim.
   */
  readonly evidenced: boolean;
  /** Every per-dimension result contributing to this evaluation. */
  readonly dimensions: readonly EvaluationDimension[];
  /** Limitations already collected by the caller, including claim-level ones. */
  readonly limitations?: readonly string[];
  /**
   * False when the evaluation has no subject at all (for example no accessory is
   * selected). Treated exactly like missing evidence: nothing can be asserted.
   */
  readonly applicable?: boolean;
  /**
   * True when a positive result depends on a verified adapter or conversion step,
   * so the status is reported as `compatible_with_adapter` rather than direct.
   */
  readonly adapterRequired?: boolean;
}

/**
 * The single conservative aggregation rule for every compatibility evaluator.
 *
 * Order is deliberate and must not be reordered per evaluator:
 *  1. no evidence or nothing to evaluate -> `unknown` (no claim in either direction)
 *  2. any explicit mismatch              -> `incompatible`
 *  3. any missing fact                   -> `unknown` (never optimistic)
 *  4. any limitation                     -> `compatible_with_limitations`
 *  5. verified adapter required          -> `compatible_with_adapter`
 *  6. otherwise                          -> `directly_compatible`
 *
 * `not_applicable` dimensions never contribute to a negative or unknown result.
 */
export function aggregateEvaluationStatus(input: AggregateStatusInput): EvaluationStatus {
  const { evidenced, dimensions, adapterRequired = false } = input;
  const limitations = input.limitations ?? [];
  const applicable = input.applicable ?? true;

  if (!applicable || !evidenced) return 'unknown';
  if (dimensions.some((dimension) => dimension.status === 'incompatible')) return 'incompatible';
  if (dimensions.some((dimension) => dimension.status === 'unknown')) return 'unknown';

  const limited =
    limitations.length > 0 ||
    dimensions.some((dimension) => dimension.status === 'compatible_with_limitations');
  if (limited) return 'compatible_with_limitations';
  if (adapterRequired) return 'compatible_with_adapter';
  return 'directly_compatible';
}

/** True when a status may be presented to a user as a working configuration. */
export function isPositiveStatus(status: EvaluationStatus): boolean {
  return (
    status === 'directly_compatible' ||
    status === 'compatible_with_adapter' ||
    status === 'compatible_with_limitations'
  );
}
