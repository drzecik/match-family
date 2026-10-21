import snapshotJson from '../../../../data/generated/snapshot.json';
import type { CompatibilityEdge, Consumable, Device, SourceEvidence } from '@filtermatch/domain';

const envelope = snapshotJson as unknown as {
  schemaVersion: number;
  generatedAt: string;
  data: {
    devices: Device[];
    consumables: Consumable[];
    compatibilityEdges: CompatibilityEdge[];
    sourceEvidence: SourceEvidence[];
  };
};

if (envelope.schemaVersion !== 2) {
  throw new Error(`Unsupported review data schema: ${envelope.schemaVersion}`);
}

const devices = new Map(envelope.data.devices.map((item) => [item.id, item]));
const consumables = new Map(envelope.data.consumables.map((item) => [item.id, item]));
const evidence = new Map(envelope.data.sourceEvidence.map((item) => [item.id, item]));
const reviewEvidenceRecords = envelope.data.sourceEvidence.filter(
  (item) =>
    !item.synthetic &&
    !item.notForProduction &&
    (item.verificationDecision === 'candidate' || item.verificationDecision === 'conflicting')
);

export const candidateEvidenceSummary = {
  total: reviewEvidenceRecords.length,
  trustedDistributor: reviewEvidenceRecords.filter(
    ({ sourceType }) => sourceType === 'trusted_distributor'
  ).length
};

export const candidateReview = envelope.data.compatibilityEdges
  .filter(
    (edge) =>
      !edge.synthetic &&
      !edge.notForProduction &&
      (edge.verificationStatus === 'candidate' || edge.verificationStatus === 'conflicting')
  )
  .flatMap((edge) => {
    const device = devices.get(edge.deviceId);
    const consumable = consumables.get(edge.consumableId);
    if (!device || !consumable) return [];
    const relatedEvidence = edge.evidenceIds.flatMap((id) => {
      const source = evidence.get(id);
      return source ? [source] : [];
    });
    if (
      device.synthetic || device.notForProduction ||
      consumable.synthetic || consumable.notForProduction ||
      relatedEvidence.some((source) => source.synthetic || source.notForProduction)
    ) {
      throw new Error(`Private review edge ${edge.id} references fixture data`);
    }
    return [{
      edge,
      device,
      consumable,
      evidence: relatedEvidence
    }];
  })
  .sort((left, right) =>
    `${left.device.brand} ${left.device.canonicalModel} ${left.consumable.sku}`.localeCompare(
      `${right.device.brand} ${right.device.canonicalModel} ${right.consumable.sku}`,
      'pl'
    )
  );

export const candidateReviewGeneratedAt = envelope.generatedAt;
