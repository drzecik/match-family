import { reviewDecisionSchema } from "@filtermatch/data-schema";
import {
  evaluateCompatibilityForPublication,
  type DataSnapshot,
  type ReviewDecision,
  type VerificationStatus,
} from "@filtermatch/domain";
import { operationalReportMetadata } from "./reports.js";

const verificationStrength: Partial<Record<VerificationStatus, number>> = {
  verified_supplier: 1,
  verified_multi_source: 2,
  verified_official: 3,
};

export function prepareCompatibilityReview(
  snapshot: DataSnapshot,
  edgeId: string,
  now = new Date(),
) {
  const edge = snapshot.compatibilityEdges.find((item) => item.id === edgeId);
  if (!edge) throw new Error(`Compatibility edge not found: ${edgeId}`);
  const device = snapshot.devices.find((item) => item.id === edge.deviceId);
  const consumable = snapshot.consumables.find((item) => item.id === edge.consumableId);
  const evidenceById = new Map(snapshot.sourceEvidence.map((item) => [item.id, item]));
  const publication = evaluateCompatibilityForPublication(edge, {
    device,
    consumable,
    evidence: snapshot.sourceEvidence,
    now,
  });

  return {
    ...operationalReportMetadata(snapshot, now),
    policy: "explicit_authorized_human_decision_only" as const,
    edge: {
      id: edge.id,
      deviceId: edge.deviceId,
      consumableId: edge.consumableId,
      relationType: edge.relationType,
      verificationStatus: edge.verificationStatus,
      evidenceIds: [...edge.evidenceIds],
      lastVerifiedAt: edge.lastVerifiedAt ?? null,
    },
    device: device
      ? { id: device.id, brand: device.brand, canonicalModel: device.canonicalModel }
      : null,
    consumable: consumable
      ? { id: consumable.id, brand: consumable.brand, name: consumable.canonicalName, sku: consumable.sku }
      : null,
    evidence: edge.evidenceIds.map((id) => {
      const item = evidenceById.get(id);
      return item
        ? {
            id: item.id,
            sourceType: item.sourceType,
            title: item.title,
            url: item.url ?? null,
            documentId: item.documentId ?? null,
            pageReference: item.pageReference ?? null,
            evidenceSummary: item.evidenceSummary,
            verificationDecision: item.verificationDecision,
          }
        : { id, missing: true as const };
    }),
    currentPublicationDecision: publication,
    requiredDecisionFields: [
      "id",
      "edgeId",
      "previousStatus",
      "decision",
      "evidenceIds",
      "reviewer",
      "decisionAuthority",
      "decidedAt",
      "rationale",
    ],
    warning: "This packet does not approve compatibility. An authorized human must supply the decision file.",
  };
}

export function applyCompatibilityReviewDecision(
  snapshot: DataSnapshot,
  input: unknown,
  now = new Date(),
): { snapshot: DataSnapshot; decision: ReviewDecision; report: Record<string, unknown> } {
  const decision = reviewDecisionSchema.parse(input) as ReviewDecision;
  if (new Date(decision.decidedAt) > now) throw new Error("Review decision cannot be future-dated");
  if (snapshot.reviewDecisions.some((item) => item.id === decision.id)) {
    throw new Error(`Review decision id already exists: ${decision.id}`);
  }
  const edgeIndex = snapshot.compatibilityEdges.findIndex((item) => item.id === decision.edgeId);
  if (edgeIndex < 0) throw new Error(`Compatibility edge not found: ${decision.edgeId}`);
  const edge = snapshot.compatibilityEdges[edgeIndex]!;
  if (edge.verificationStatus !== decision.previousStatus) {
    throw new Error(
      `Stale decision: ${edge.id} is ${edge.verificationStatus}, expected ${decision.previousStatus}`,
    );
  }
  if (Boolean(edge.synthetic) !== Boolean(decision.synthetic)) {
    throw new Error("Review decision fixture markers must match the compatibility edge");
  }
  const previousDecisions = snapshot.reviewDecisions
    .filter((item) => item.edgeId === edge.id)
    .sort((left, right) => left.decidedAt.localeCompare(right.decidedAt));
  const latestDecision = previousDecisions.at(-1);
  if (latestDecision && decision.decidedAt <= latestDecision.decidedAt) {
    throw new Error("Review decision must be newer than the previous decision");
  }
  const evidenceById = new Map(snapshot.sourceEvidence.map((item) => [item.id, item]));
  for (const evidenceId of decision.evidenceIds) {
    if (!evidenceById.has(evidenceId)) throw new Error(`Evidence not found: ${evidenceId}`);
  }

  const currentStrength = verificationStrength[edge.verificationStatus];
  const proposedStrength = verificationStrength[decision.decision];
  if (
    currentStrength !== undefined &&
    proposedStrength !== undefined &&
    proposedStrength < currentStrength
  ) {
    throw new Error("A weaker verified decision cannot overwrite stronger verified evidence");
  }

  const proposedEdge = {
    ...edge,
    verificationStatus: decision.decision,
    evidenceIds: [...decision.evidenceIds],
    lastVerifiedAt: decision.decidedAt,
  };
  const device = snapshot.devices.find((item) => item.id === edge.deviceId);
  const consumable = snapshot.consumables.find((item) => item.id === edge.consumableId);
  const publicationBefore = evaluateCompatibilityForPublication(edge, {
    device,
    consumable,
    evidence: snapshot.sourceEvidence,
    now,
  });
  const publicationAfter = evaluateCompatibilityForPublication(proposedEdge, {
    device,
    consumable,
    evidence: snapshot.sourceEvidence,
    now,
  });
  if (proposedStrength !== undefined && !publicationAfter.publish) {
    throw new Error(`Verified decision fails publication policy: ${publicationAfter.reasons.join(", ")}`);
  }

  const compatibilityEdges = [...snapshot.compatibilityEdges];
  compatibilityEdges[edgeIndex] = proposedEdge;
  const nextSnapshot: DataSnapshot = {
    ...snapshot,
    compatibilityEdges,
    reviewDecisions: [...snapshot.reviewDecisions, decision],
  };
  return {
    snapshot: nextSnapshot,
    decision,
    report: {
      ...operationalReportMetadata(nextSnapshot, now),
      policy: "explicit_authorized_human_decision_only",
      decisionId: decision.id,
      edgeId: edge.id,
      previousStatus: edge.verificationStatus,
      decision: decision.decision,
      publicationBefore,
      publicationAfter,
      storage: proposedStrength === undefined ? "candidates" : "verified",
      automaticApproval: false,
    },
  };
}
