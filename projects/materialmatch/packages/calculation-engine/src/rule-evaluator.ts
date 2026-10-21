import type { IntegerCondition, IntegerExpression } from '@materialmatch/domain';
import { CalculationError } from './errors.js';

interface Fraction {
  numerator: bigint;
  denominator: bigint;
}

interface EvaluationBudget {
  operations: number;
}

export const MAX_RULE_DEPTH = 32;
export const MAX_RULE_OPERATIONS = 512;

function visit(budget: EvaluationBudget, depth: number): void {
  budget.operations += 1;
  if (depth > MAX_RULE_DEPTH || budget.operations > MAX_RULE_OPERATIONS) {
    throw new CalculationError(
      'RULE_LIMIT_EXCEEDED',
      'Rule exceeds the evaluation depth or operation limit',
      { depth, operations: budget.operations },
    );
  }
}

const fraction = (numerator: bigint, denominator = 1n): Fraction => {
  if (denominator === 0n)
    throw new CalculationError('DIVISION_BY_ZERO', 'Rule attempted division by zero');
  return denominator < 0n
    ? { numerator: -numerator, denominator: -denominator }
    : { numerator, denominator };
};

const floorFraction = ({ numerator, denominator }: Fraction): bigint => {
  const quotient = numerator / denominator;
  return numerator >= 0n || numerator % denominator === 0n ? quotient : quotient - 1n;
};

const ceilFraction = ({ numerator, denominator }: Fraction): bigint => {
  const quotient = numerator / denominator;
  return numerator <= 0n || numerator % denominator === 0n ? quotient : quotient + 1n;
};

const compare = (left: Fraction, right: Fraction): bigint =>
  left.numerator * right.denominator - right.numerator * left.denominator;

function evaluateCondition(
  condition: IntegerCondition,
  variables: Readonly<Record<string, number>>,
  budget: EvaluationBudget,
  depth: number,
): boolean {
  visit(budget, depth);
  switch (condition.op) {
    case 'not':
      return !evaluateCondition(condition.value, variables, budget, depth + 1);
    case 'and':
      return (
        evaluateCondition(condition.left, variables, budget, depth + 1) &&
        evaluateCondition(condition.right, variables, budget, depth + 1)
      );
    case 'or':
      return (
        evaluateCondition(condition.left, variables, budget, depth + 1) ||
        evaluateCondition(condition.right, variables, budget, depth + 1)
      );
    case 'equal':
      return (
        compare(
          evaluateFraction(condition.left, variables, budget, depth + 1),
          evaluateFraction(condition.right, variables, budget, depth + 1),
        ) === 0n
      );
    case 'greaterThan':
      return (
        compare(
          evaluateFraction(condition.left, variables, budget, depth + 1),
          evaluateFraction(condition.right, variables, budget, depth + 1),
        ) > 0n
      );
    case 'lessThan':
      return (
        compare(
          evaluateFraction(condition.left, variables, budget, depth + 1),
          evaluateFraction(condition.right, variables, budget, depth + 1),
        ) < 0n
      );
  }
}

function evaluateFraction(
  expression: IntegerExpression,
  variables: Readonly<Record<string, number>>,
  budget: EvaluationBudget,
  depth: number,
): Fraction {
  visit(budget, depth);
  switch (expression.op) {
    case 'literal':
      if (!Number.isSafeInteger(expression.value))
        throw new CalculationError('INVALID_INPUT', 'Rule literal must be a safe integer');
      return fraction(BigInt(expression.value));
    case 'variable': {
      if (!Object.hasOwn(variables, expression.name))
        throw new CalculationError('UNKNOWN_VARIABLE', `Unknown rule variable: ${expression.name}`);
      const value = variables[expression.name];
      if (value === undefined)
        throw new CalculationError('UNKNOWN_VARIABLE', `Unknown rule variable: ${expression.name}`);
      if (!Number.isSafeInteger(value))
        throw new CalculationError(
          'INVALID_INPUT',
          `Rule variable is not a safe integer: ${expression.name}`,
        );
      return fraction(BigInt(value));
    }
    case 'ceil':
      return fraction(
        ceilFraction(evaluateFraction(expression.value, variables, budget, depth + 1)),
      );
    case 'floor':
      return fraction(
        floorFraction(evaluateFraction(expression.value, variables, budget, depth + 1)),
      );
    case 'percentage': {
      const value = evaluateFraction(expression.value, variables, budget, depth + 1);
      const basisPoints = evaluateFraction(expression.basisPoints, variables, budget, depth + 1);
      return fraction(
        value.numerator * basisPoints.numerator,
        value.denominator * basisPoints.denominator * 10_000n,
      );
    }
    case 'conditional':
      return evaluateFraction(
        evaluateCondition(expression.condition, variables, budget, depth + 1)
          ? expression.whenTrue
          : expression.whenFalse,
        variables,
        budget,
        depth + 1,
      );
    case 'lookupTable': {
      const key = evaluateFraction(expression.key, variables, budget, depth + 1);
      if (key.numerator % key.denominator !== 0n)
        throw new CalculationError('NON_INTEGER_RESULT', 'Lookup key must be an integer');
      const lookupKey = (key.numerator / key.denominator).toString();
      const value = Object.hasOwn(expression.entries, lookupKey)
        ? expression.entries[lookupKey]
        : expression.fallback;
      if (value === undefined || !Number.isSafeInteger(value))
        throw new CalculationError('INVALID_INPUT', 'Lookup value must be a safe integer');
      return fraction(BigInt(value));
    }
    case 'add':
    case 'subtract':
    case 'multiply':
    case 'divide':
    case 'min':
    case 'max': {
      const left = evaluateFraction(expression.left, variables, budget, depth + 1);
      const right = evaluateFraction(expression.right, variables, budget, depth + 1);
      if (expression.op === 'add' || expression.op === 'subtract') {
        const sign = expression.op === 'add' ? 1n : -1n;
        return fraction(
          left.numerator * right.denominator + sign * right.numerator * left.denominator,
          left.denominator * right.denominator,
        );
      }
      if (expression.op === 'multiply')
        return fraction(left.numerator * right.numerator, left.denominator * right.denominator);
      if (expression.op === 'divide')
        return fraction(left.numerator * right.denominator, left.denominator * right.numerator);
      const comparison = compare(left, right);
      return expression.op === 'min'
        ? comparison <= 0n
          ? left
          : right
        : comparison >= 0n
          ? left
          : right;
    }
  }
}

export function evaluateIntegerExpression(
  expression: IntegerExpression,
  variables: Readonly<Record<string, number>> = {},
): number {
  const result = evaluateFraction(expression, variables, { operations: 0 }, 1);
  if (result.numerator % result.denominator !== 0n) {
    throw new CalculationError('NON_INTEGER_RESULT', 'Rule result must be explicitly rounded');
  }
  const integer = result.numerator / result.denominator;
  if (integer < BigInt(Number.MIN_SAFE_INTEGER) || integer > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new CalculationError(
      'UNSAFE_INTEGER_RESULT',
      'Rule result is outside the safe integer range',
    );
  }
  return Number(integer);
}
