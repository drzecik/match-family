import assert from 'node:assert/strict';
import {
  evaluateMemoryCompatibility,
  type MemoryEvaluationInput,
} from '../../packages/compatibility-evaluator/src/index.js';

// These evidence identifiers refer only to this fictional demonstration.
const input: MemoryEvaluationInput = {
  deviceMedia: [
    {
      format: 'SDXC',
      maximumCapacityGB: 512,
      filesystems: ['exFAT'],
      evidenceIds: ['fictional-device-evidence'],
    },
  ],
  mode: {
    id: 'fictional-100mbps',
    bitrateMbps: 100,
    mediaRequirements: {
      mediaFormats: ['SDXC'],
      minimumSustainedWriteMBps: 12.5,
      minimumSpeedClassMBps: 30,
      evidenceIds: ['fictional-mode-evidence'],
    },
    evidenceIds: ['fictional-device-evidence'],
  },
  card: {
    id: 'fictional-card',
    format: 'SDXC',
    capacityGB: 128,
    sustainedWriteMBps: 60,
    guaranteedSpeedClassMBps: 30,
    filesystem: 'exFAT',
    evidenceIds: ['fictional-card-evidence'],
  },
};
const supported = evaluateMemoryCompatibility(input);
const missingEvidence = evaluateMemoryCompatibility({
  ...input,
  card: { ...input.card, evidenceIds: [] },
});
const invalidCapacity = evaluateMemoryCompatibility({
  ...input,
  card: { ...input.card, capacityGB: 0 },
});
assert.equal(supported.status, 'directly_compatible');
assert.equal(supported.estimatedRecordingSeconds, 9728);
assert.equal(missingEvidence.status, 'unknown');
assert.equal(invalidCapacity.status, 'unknown');
console.log(
  JSON.stringify(
    {
      project: 'CreatorRig Match',
      synthetic: true,
      notForProduction: true,
      supported: {
        status: supported.status,
        seconds: supported.estimatedRecordingSeconds,
        dimensions: supported.dimensions,
      },
      missingEvidence: missingEvidence.status,
      invalidCapacity: invalidCapacity.status,
      notice: 'Fictional evidence is not a real-world hardware recommendation.',
    },
    null,
    2,
  ),
);
