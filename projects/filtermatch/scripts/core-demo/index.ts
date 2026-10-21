import assert from 'node:assert/strict';
import { buildModelSearchIndex, searchModelIndex } from '../../packages/model-search/src/index.js';

// Entirely fictional input. A resolved model is not a compatibility approval.
const devices = ['PL', 'DE'].map((region) => ({
  id: `fictional-device-${region.toLowerCase()}`, brand: 'Fictional Demo',
  canonicalModel: 'DEMO100', regionalVariant: `/${region}`,
  synthetic: true, notForProduction: true,
}));
const index = buildModelSearchIndex(devices, [], { generatedAt: '2026-01-01T00:00:00.000Z' });
const exact = searchModelIndex(index, 'DEMO100/PL');
const ambiguous = searchModelIndex(index, 'DEMO100');
assert.equal(exact.status, 'resolved');
assert.equal(ambiguous.status, 'ambiguous');
console.log(JSON.stringify({ project: 'FilterMatch', synthetic: true, notForProduction: true,
  exact, ambiguous, notice: 'Model resolution does not approve compatibility.' }, null, 2));
