import {
  PUBLIC_COMPATIBILITY_STATUSES,
  type CompatibilityEdge,
  type Consumable,
  type Device,
  type SourceEvidence,
} from "./types.js";

export interface PublicationDecision {
  publish: boolean;
  reasons: string[];
}

export interface PublicationContext {
  device?: Device;
  consumable?: Consumable;
  evidence: readonly SourceEvidence[];
  now?: Date;
}

const publicStatuses = new Set<string>(PUBLIC_COMPATIBILITY_STATUSES);

export function evaluateCompatibilityForPublication(
  edge: CompatibilityEdge,
  context: PublicationContext,
): PublicationDecision {
  const reasons: string[] = [];
  const now = context.now ?? new Date();
  const evidenceById = new Map(context.evidence.map((item) => [item.id, item]));
  const resolvedEvidence: SourceEvidence[] = [];

  if (!publicStatuses.has(edge.verificationStatus)) {
    reasons.push(`status_not_public:${edge.verificationStatus}`);
  }
  if (edge.evidenceIds.length === 0) {
    reasons.push("missing_evidence");
  }
  for (const evidenceId of edge.evidenceIds) {
    const item = evidenceById.get(evidenceId);
    if (!item) {
      reasons.push(`evidence_not_found:${evidenceId}`);
    } else {
      resolvedEvidence.push(item);
      if (!publicStatuses.has(item.verificationDecision)) {
        reasons.push(`evidence_not_verified:${evidenceId}`);
      }
    }
  }
  if (
    edge.verificationStatus === "verified_official" &&
    !resolvedEvidence.some(
      (item) =>
        item.verificationDecision === "verified_official" &&
        item.sourceType.startsWith("official_"),
    )
  ) {
    reasons.push("missing_official_evidence");
  }
  if (
    edge.verificationStatus === "verified_supplier" &&
    !resolvedEvidence.some(
      (item) =>
        item.verificationDecision === "verified_supplier" &&
        (item.sourceType === "replacement_manufacturer" ||
          item.sourceType === "trusted_distributor"),
    )
  ) {
    reasons.push("missing_supplier_evidence");
  }
  if (
    edge.verificationStatus === "verified_multi_source" &&
    new Set(resolvedEvidence.map((item) => item.id)).size < 2
  ) {
    reasons.push("insufficient_independent_evidence");
  }
  if (!edge.lastVerifiedAt) {
    reasons.push("missing_verification_date");
  }
  if (edge.validFrom && new Date(edge.validFrom) > now) {
    reasons.push("relation_not_yet_valid");
  }
  if (edge.validTo && new Date(edge.validTo) <= now) {
    reasons.push("relation_expired");
  }
  if (!context.device) {
    reasons.push("device_not_found");
  } else if (context.device.lifecycleStatus !== "active") {
    reasons.push(`device_not_active:${context.device.lifecycleStatus}`);
  }
  if (!context.consumable) {
    reasons.push("consumable_not_found");
  } else if (context.consumable.lifecycleStatus !== "active") {
    reasons.push(`consumable_not_active:${context.consumable.lifecycleStatus}`);
  }

  return { publish: reasons.length === 0, reasons };
}
