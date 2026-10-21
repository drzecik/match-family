import { describe, expect, it } from 'vitest';
import { aggregateEvaluationStatus } from '../src/index.js';

const dimension = (
  status:
    'compatible' | 'compatible_with_limitations' | 'incompatible' | 'unknown' | 'not_applicable',
) => ({ status, explanation: status });

describe('aggregateEvaluationStatus', () => {
  it('returns unknown before making any unevidenced positive or negative claim', () => {
    expect(
      aggregateEvaluationStatus({ evidenced: false, dimensions: [dimension('compatible')] }),
    ).toBe('unknown');
    expect(
      aggregateEvaluationStatus({ evidenced: false, dimensions: [dimension('incompatible')] }),
    ).toBe('unknown');
  });

  it('uses one conservative precedence for conflicts, missing facts, and limitations', () => {
    expect(
      aggregateEvaluationStatus({
        evidenced: true,
        dimensions: [dimension('incompatible'), dimension('unknown')],
      }),
    ).toBe('incompatible');
    expect(
      aggregateEvaluationStatus({
        evidenced: true,
        dimensions: [dimension('compatible'), dimension('unknown')],
      }),
    ).toBe('unknown');
    expect(
      aggregateEvaluationStatus({
        evidenced: true,
        dimensions: [dimension('compatible_with_limitations')],
      }),
    ).toBe('compatible_with_limitations');
  });

  it('reports a verified adapter only after all required dimensions are known', () => {
    expect(
      aggregateEvaluationStatus({
        evidenced: true,
        dimensions: [dimension('compatible'), dimension('not_applicable')],
        adapterRequired: true,
      }),
    ).toBe('compatible_with_adapter');
    expect(
      aggregateEvaluationStatus({
        evidenced: true,
        dimensions: [dimension('unknown')],
        adapterRequired: true,
      }),
    ).toBe('unknown');
  });
});
