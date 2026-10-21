export type EvaluationStatus =
  | 'directly_compatible'
  | 'compatible_with_adapter'
  | 'compatible_with_limitations'
  | 'incompatible'
  | 'unknown';

export type EvaluationDimensionStatus =
  'compatible' | 'compatible_with_limitations' | 'incompatible' | 'unknown' | 'not_applicable';

export interface EvaluationDimension {
  readonly status: EvaluationDimensionStatus;
  readonly explanation: string;
}

export interface BaseEvaluation {
  readonly status: EvaluationStatus;
  readonly limitations: readonly string[];
  readonly warnings: readonly string[];
  readonly evidenceIds: readonly string[];
}
