export type CalculationErrorCode =
  | 'INVALID_CONFIGURATION'
  | 'INVALID_INPUT'
  | 'UNKNOWN_VARIANT'
  | 'AREA_EXCLUSIONS_EXCEED_ROOM'
  | 'WASTE_OUTSIDE_RANGE'
  | 'MISSING_PACKAGE_COVERAGE'
  | 'UNSAFE_INTEGER_RESULT'
  | 'DIVISION_BY_ZERO'
  | 'NON_INTEGER_RESULT'
  | 'UNKNOWN_VARIABLE'
  | 'RULE_LIMIT_EXCEEDED';

export class CalculationError extends Error {
  public constructor(
    public readonly code: CalculationErrorCode,
    message: string,
    public readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = 'CalculationError';
  }
}
