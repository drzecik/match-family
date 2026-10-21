import { CalculationError } from './errors.js';

export function toSafeInteger(value: bigint, label: string): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new CalculationError(
      'UNSAFE_INTEGER_RESULT',
      `${label} is outside the supported integer range`,
      { label },
    );
  }
  return Number(value);
}

export function ceilDiv(dividend: bigint, divisor: bigint): bigint {
  if (divisor <= 0n) {
    throw new CalculationError('DIVISION_BY_ZERO', 'Divisor must be positive');
  }
  if (dividend < 0n) {
    throw new CalculationError(
      'INVALID_INPUT',
      'Ceiling division only accepts non-negative values',
    );
  }
  return dividend / divisor + (dividend % divisor === 0n ? 0n : 1n);
}

export function applyMinimumAndMultiple(
  quantity: bigint,
  minimum: number,
  multiple: number,
): bigint {
  const bounded = quantity < BigInt(minimum) ? BigInt(minimum) : quantity;
  return ceilDiv(bounded, BigInt(multiple)) * BigInt(multiple);
}

export function checkedMoneyTotal(unitMinor: number, quantity: number): number {
  return toSafeInteger(BigInt(unitMinor) * BigInt(quantity), 'money total');
}
