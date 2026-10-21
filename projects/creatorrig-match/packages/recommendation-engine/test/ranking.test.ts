import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { rankRecommendations, type RecommendationCandidate } from '../src/index.js';

const base: RecommendationCandidate = {
  id: 'base',
  relation: 'directly_compatible',
  verificationStatus: 'verified',
  safetyStatus: 'safe',
  evidenceIds: ['evidence-official-spec'],
  requirementFit: 0.8,
  owned: false,
  withinBudget: true,
  qualityScore: 0.8,
  availabilityScore: 1,
  priceMinor: 1_000,
};

describe('rankRecommendations', () => {
  it('excludes unknown, candidate, deprecated and unsafe options', () => {
    const candidates: RecommendationCandidate[] = [
      { ...base, id: 'unknown', relation: 'unknown' },
      { ...base, id: 'candidate', relation: 'candidate', verificationStatus: 'candidate' },
      { ...base, id: 'deprecated', relation: 'deprecated', verificationStatus: 'deprecated' },
      { ...base, id: 'unsafe', safetyStatus: 'unsafe' },
      { ...base, id: 'safety-unknown', safetyStatus: 'unknown' },
    ];
    const result = rankRecommendations(candidates);
    expect(result.ranked).toHaveLength(0);
    expect(result.excluded.map(({ candidate }) => candidate.id)).toEqual([
      'unknown',
      'candidate',
      'deprecated',
      'unsafe',
      'safety-unknown',
    ]);
  });

  it('does not publish an otherwise verified relation without evidence', () => {
    const result = rankRecommendations([{ ...base, evidenceIds: [] }]);
    expect(result.ranked).toEqual([]);
    expect(result.excluded[0]?.reason).toBe('no_evidence');
  });

  it('requires conditional compatibility conditions to be explicitly satisfied', () => {
    const unknownCondition = rankRecommendations([
      { ...base, relation: 'conditionally_compatible' },
    ]);
    expect(unknownCondition.excluded[0]?.reason).toBe('conditions_not_satisfied');

    const satisfied = rankRecommendations([
      { ...base, relation: 'conditionally_compatible', conditionsSatisfied: true },
    ]);
    expect(satisfied.ranked).toHaveLength(1);
  });

  it('puts compatibility and requirement fit before price', () => {
    const result = rankRecommendations([
      { ...base, id: 'cheap-adapter', relation: 'compatible_with_adapter', priceMinor: 1 },
      { ...base, id: 'direct', relation: 'directly_compatible', priceMinor: 100_000 },
      { ...base, id: 'lower-fit', requirementFit: 0.7, priceMinor: 1 },
    ]);
    expect(result.ranked.map((candidate) => candidate.id)).toEqual([
      'direct',
      'lower-fit',
      'cheap-adapter',
    ]);
  });

  it('sponsorship and affiliate flags never change ordering', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            requirementFit: fc.double({ min: 0, max: 1, noNaN: true }),
            qualityScore: fc.double({ min: 0, max: 1, noNaN: true }),
            priceMinor: fc.integer({ min: 0, max: 1_000_000 }),
          }),
          { minLength: 1, maxLength: 30 },
        ),
        (rawCandidates) => {
          const candidates = rawCandidates.map((candidate): RecommendationCandidate => ({
            ...base,
            ...candidate,
            sponsored: false,
            affiliate: false,
          }));
          const monetized = candidates.map((candidate, index) => ({
            ...candidate,
            sponsored: index % 2 === 0,
            affiliate: index % 3 === 0,
          }));
          expect(rankRecommendations(monetized).ranked.map(({ id }) => id)).toEqual(
            rankRecommendations(candidates).ranked.map(({ id }) => id),
          );
        },
      ),
    );
  });

  it('does not mutate its input', () => {
    const candidates = Object.freeze([
      Object.freeze({ ...base, id: 'b' }),
      Object.freeze({ ...base, id: 'a' }),
    ]);
    expect(() => rankRecommendations(candidates)).not.toThrow();
    expect(candidates.map(({ id }) => id)).toEqual(['b', 'a']);
  });
});
