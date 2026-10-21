export type CalculationStatus = 'complete' | 'partial' | 'unavailable';

export type CalculationIssueSeverity = 'info' | 'warning' | 'error';

export interface CalculationIssue {
  readonly code: string;
  readonly message: string;
  readonly severity: CalculationIssueSeverity;
  readonly subjectId?: string;
}

export interface CalculationResult<T> {
  readonly status: CalculationStatus;
  readonly value?: T;
  readonly missingData: readonly string[];
  readonly issues: readonly CalculationIssue[];
}

export function result<T>(
  value: T | undefined,
  missingData: readonly string[],
  issues: readonly CalculationIssue[],
): CalculationResult<T> {
  if (value === undefined) {
    return { status: 'unavailable', missingData, issues };
  }

  return {
    status:
      missingData.length > 0 || issues.some((issue) => issue.severity === 'error')
        ? 'partial'
        : 'complete',
    value,
    missingData,
    issues,
  };
}

export function isFiniteNonNegative(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= 0;
}

export function isFinitePositive(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}
