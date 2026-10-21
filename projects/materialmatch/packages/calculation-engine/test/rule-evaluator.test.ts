import { describe, expect, it } from 'vitest';
import type { IntegerExpression } from '@materialmatch/domain';
import type { CalculationError } from '../src/index.js';
import { evaluateIntegerExpression, MAX_RULE_DEPTH } from '../src/index.js';

describe('safe typed rule evaluator', () => {
  it('evaluates explicit rational rounding without executing text', () => {
    const expression: IntegerExpression = {
      op: 'ceil',
      value: {
        op: 'divide',
        left: { op: 'variable', name: 'area' },
        right: { op: 'literal', value: 2_200_000 },
      },
    };
    expect(evaluateIntegerExpression(expression, { area: 21_600_000 })).toBe(10);
  });

  it('supports percentage, conditions and lookup tables', () => {
    const expression: IntegerExpression = {
      op: 'conditional',
      condition: {
        op: 'greaterThan',
        left: { op: 'variable', name: 'rooms' },
        right: { op: 'literal', value: 1 },
      },
      whenTrue: {
        op: 'lookupTable',
        key: { op: 'variable', name: 'rooms' },
        entries: { '2': 400 },
        fallback: 999,
      },
      whenFalse: {
        op: 'percentage',
        value: { op: 'literal', value: 10_000 },
        basisPoints: { op: 'literal', value: 800 },
      },
    };
    expect(evaluateIntegerExpression(expression, { rooms: 2 })).toBe(400);
    expect(evaluateIntegerExpression(expression, { rooms: 1 })).toBe(800);
  });

  it('requires explicit rounding for non-integer results', () => {
    expect(() =>
      evaluateIntegerExpression({
        op: 'divide',
        left: { op: 'literal', value: 1 },
        right: { op: 'literal', value: 3 },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<CalculationError>>({ code: 'NON_INTEGER_RESULT' }),
    );
  });

  it('rejects division by zero and unknown variables', () => {
    expect(() =>
      evaluateIntegerExpression({
        op: 'divide',
        left: { op: 'literal', value: 1 },
        right: { op: 'literal', value: 0 },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<CalculationError>>({ code: 'DIVISION_BY_ZERO' }),
    );
    expect(() =>
      evaluateIntegerExpression({ op: 'variable', name: 'constructor' }, Object.create(null)),
    ).toThrowError(
      expect.objectContaining<Partial<CalculationError>>({ code: 'UNKNOWN_VARIABLE' }),
    );
  });

  it('rejects unsafe literals, prototype variable access and excessive nesting', () => {
    expect(() => evaluateIntegerExpression({ op: 'literal', value: 1.5 })).toThrowError(
      expect.objectContaining<Partial<CalculationError>>({ code: 'INVALID_INPUT' }),
    );
    expect(() =>
      evaluateIntegerExpression({ op: 'variable', name: 'constructor' }, {}),
    ).toThrowError(
      expect.objectContaining<Partial<CalculationError>>({ code: 'UNKNOWN_VARIABLE' }),
    );
    let expression: IntegerExpression = { op: 'literal', value: 1 };
    for (let index = 0; index <= MAX_RULE_DEPTH; index += 1) {
      expression = { op: 'ceil', value: expression };
    }
    expect(() => evaluateIntegerExpression(expression)).toThrowError(
      expect.objectContaining<Partial<CalculationError>>({ code: 'RULE_LIMIT_EXCEEDED' }),
    );
  });
});
