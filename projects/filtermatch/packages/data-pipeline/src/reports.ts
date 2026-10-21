import { createHash } from "node:crypto";
import { DATA_SCHEMA_VERSION } from "@filtermatch/data-schema";
import {
  evaluateCompatibilityForPublication,
  type DataSnapshot,
  type VerificationStatus,
} from "@filtermatch/domain";
import { NORMALIZER_VERSION, normalizeModelKey } from "@filtermatch/model-search";
import { findConflicts } from "./validation.js";

const REVIEWABLE_NON_PUBLIC_STATUSES = new Set<VerificationStatus>([
  "candidate",
  "conflicting",
  "unknown",
]);

const EVIDENCE_REASON = /^(?:missing_evidence|evidence_not_found:|evidence_not_verified:|missing_official_evidence|missing_supplier_evidence|insufficient_independent_evidence)/u;

export interface OperationalReportMetadata {
  generatedAt: string;
  schemaVersion: typeof DATA_SCHEMA_VERSION;
  normalizerVersion: typeof NORMALIZER_VERSION;
  dataRevision: `sha256:${string}`;
}

export interface CatalogCoverageMatrix {
  scopeId: string;
  synthetic: true;
  notForProduction: true;
  requiredDeviceIds: string[];
  expectedPublicEdges: Array<{
    edgeId: string;
    deviceId: string;
    consumableId: string;
    relationType: "required" | "alternative" | "optional";
  }>;
  expectedNonPublicEdgeIds: string[];
}

export function parseCatalogCoverageMatrix(input: unknown): CatalogCoverageMatrix {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Catalog coverage matrix must be an object");
  const value = input as Record<string, unknown>;
  if (typeof value.scopeId !== "string" || value.scopeId.length === 0) throw new Error("Catalog coverage matrix needs scopeId");
  if (value.synthetic !== true || value.notForProduction !== true) throw new Error("Catalog coverage matrix must be a non-production fixture");
  if (!isStringArray(value.requiredDeviceIds) || !isStringArray(value.expectedNonPublicEdgeIds)) throw new Error("Catalog coverage matrix has invalid ID lists");
  if (!Array.isArray(value.expectedPublicEdges)) throw new Error("Catalog coverage matrix needs expectedPublicEdges");
  const expectedPublicEdges = value.expectedPublicEdges.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid expected public edge");
    const edge = item as Record<string, unknown>;
    if (typeof edge.edgeId !== "string" || typeof edge.deviceId !== "string" || typeof edge.consumableId !== "string") throw new Error("Expected public edge needs IDs");
    if (!new Set(["required", "alternative", "optional"]).has(String(edge.relationType))) throw new Error("Expected public edge has invalid relationType");
    return edge as unknown as CatalogCoverageMatrix["expectedPublicEdges"][number];
  });
  return {
    scopeId: value.scopeId,
    synthetic: true,
    notForProduction: true,
    requiredDeviceIds: value.requiredDeviceIds,
    expectedPublicEdges,
    expectedNonPublicEdgeIds: value.expectedNonPublicEdgeIds,
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function dataRevision(snapshot: DataSnapshot): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(stableJson(snapshot)).digest("hex")}`;
}

export function operationalReportMetadata(
  snapshot: DataSnapshot,
  now: Date,
): OperationalReportMetadata {
  return {
    generatedAt: now.toISOString(),
    schemaVersion: DATA_SCHEMA_VERSION,
    normalizerVersion: NORMALIZER_VERSION,
    dataRevision: dataRevision(snapshot),
  };
}

export function reportConflicts(snapshot: DataSnapshot, now = new Date()) {
  const conflicts = findConflicts(snapshot.compatibilityEdges);
  return {
    ...operationalReportMetadata(snapshot, now),
    summary: { conflictGroups: conflicts.length },
    conflicts,
  };
}

export function reportStaleCompatibility(
  snapshot: DataSnapshot,
  options: { now?: Date; maxAgeDays: number },
) {
  const now = options.now ?? new Date();
  const threshold = new Date(now.getTime() - options.maxAgeDays * 86_400_000);
  const stale = snapshot.compatibilityEdges
    .filter((edge) => {
      if (!edge.verificationStatus.startsWith("verified_")) return false;
      return !edge.lastVerifiedAt || new Date(edge.lastVerifiedAt) < threshold;
    })
    .map((edge) => ({
      edgeId: edge.id,
      deviceId: edge.deviceId,
      consumableId: edge.consumableId,
      lastVerifiedAt: edge.lastVerifiedAt ?? null,
    }));
  return {
    ...operationalReportMetadata(snapshot, now),
    summary: { staleRelations: stale.length },
    maxAgeDays: options.maxAgeDays,
    threshold: threshold.toISOString(),
    stale,
  };
}

export function reportMissingOffers(snapshot: DataSnapshot, now = new Date()) {
  const currentOfferConsumableIds = new Set(
    snapshot.offers
      .filter(
        (offer) =>
          offer.status === "active" &&
          (!offer.expiresAt || new Date(offer.expiresAt) > now),
      )
      .map((offer) => offer.consumableId),
  );
  const publicEdgeConsumableIds = new Set(
    snapshot.compatibilityEdges
      .filter((edge) => edge.verificationStatus.startsWith("verified_"))
      .map((edge) => edge.consumableId),
  );
  const missing = snapshot.consumables
    .filter(
      (consumable) =>
        publicEdgeConsumableIds.has(consumable.id) &&
        !currentOfferConsumableIds.has(consumable.id),
    )
    .map((consumable) => ({
      consumableId: consumable.id,
      sku: consumable.sku,
      canonicalName: consumable.canonicalName,
    }));
  return {
    ...operationalReportMetadata(snapshot, now),
    summary: { consumablesWithoutCurrentOffer: missing.length },
    missing,
  };
}

export function reportRelationsWithoutEvidence(snapshot: DataSnapshot, now = new Date()) {
  const devices = new Map(snapshot.devices.map((item) => [item.id, item]));
  const consumables = new Map(snapshot.consumables.map((item) => [item.id, item]));
  const evidence = new Map(snapshot.sourceEvidence.map((item) => [item.id, item]));

  const relations = snapshot.compatibilityEdges
    .flatMap((edge) => {
      const isVerified = edge.verificationStatus.startsWith("verified_");
      if (!isVerified && !REVIEWABLE_NON_PUBLIC_STATUSES.has(edge.verificationStatus)) return [];

      const decision = evaluateCompatibilityForPublication(edge, {
        device: devices.get(edge.deviceId),
        consumable: consumables.get(edge.consumableId),
        evidence: snapshot.sourceEvidence,
        now,
      });
      const reasons = decision.reasons.filter((reason) => EVIDENCE_REASON.test(reason));
      if (reasons.length === 0) return [];

      return [{
        edgeId: edge.id,
        deviceId: edge.deviceId,
        consumableId: edge.consumableId,
        verificationStatus: edge.verificationStatus,
        blocking: isVerified,
        evidenceIds: [...edge.evidenceIds].sort(),
        missingEvidenceIds: edge.evidenceIds.filter((id) => !evidence.has(id)).sort(),
        unverifiedEvidenceIds: edge.evidenceIds
          .filter((id) => {
            const item = evidence.get(id);
            return item !== undefined && !item.verificationDecision.startsWith("verified_");
          })
          .sort(),
        reasons: [...new Set(reasons)].sort(),
      }];
    })
    .sort((left, right) => left.edgeId.localeCompare(right.edgeId));

  return {
    ...operationalReportMetadata(snapshot, now),
    summary: {
      relationsWithEvidenceGaps: relations.length,
      blockingRelations: relations.filter((item) => item.blocking).length,
      nonPublicRelations: relations.filter((item) => !item.blocking).length,
    },
    relations,
  };
}

export function reportAliasCollisions(snapshot: DataSnapshot, now = new Date()) {
  const groups = new Map<string, typeof snapshot.searchAliases>();
  for (const alias of snapshot.searchAliases.filter((item) => item.approved)) {
    const key = `${alias.entityType}:${normalizeModelKey(alias.rawAlias)}`;
    groups.set(key, [...(groups.get(key) ?? []), alias]);
  }

  const collisions = [...groups.values()]
    .flatMap((aliases) => {
      const entityIds = [...new Set(aliases.map((alias) => alias.entityId))].sort();
      if (entityIds.length < 2) return [];
      const first = aliases[0]!;
      return [{
        entityType: first.entityType,
        normalizedAlias: normalizeModelKey(first.rawAlias),
        entityIds,
        aliases: aliases
          .map((alias) => ({
            aliasId: alias.id,
            entityId: alias.entityId,
            rawAlias: alias.rawAlias,
            storedNormalizedAlias: alias.normalizedAlias,
            aliasType: alias.aliasType,
            source: alias.source,
          }))
          .sort((left, right) => left.aliasId.localeCompare(right.aliasId)),
      }];
    })
    .sort((left, right) =>
      `${left.entityType}:${left.normalizedAlias}`.localeCompare(
        `${right.entityType}:${right.normalizedAlias}`,
      ),
    );

  return {
    ...operationalReportMetadata(snapshot, now),
    summary: {
      approvedAliases: snapshot.searchAliases.filter((item) => item.approved).length,
      collisionGroups: collisions.length,
      affectedEntities: new Set(collisions.flatMap((item) => item.entityIds)).size,
    },
    collisions,
  };
}

export function reportDevicesWithoutConsumables(snapshot: DataSnapshot, now = new Date()) {
  const devices = new Map(snapshot.devices.map((item) => [item.id, item]));
  const consumables = new Map(snapshot.consumables.map((item) => [item.id, item]));
  const publishableDeviceIds = new Set(
    snapshot.compatibilityEdges
      .filter((edge) =>
        evaluateCompatibilityForPublication(edge, {
          device: devices.get(edge.deviceId),
          consumable: consumables.get(edge.consumableId),
          evidence: snapshot.sourceEvidence,
          now,
        }).publish,
      )
      .map((edge) => edge.deviceId),
  );
  const verifiedEvidenceIds = new Set(
    snapshot.sourceEvidence
      .filter((item) => item.verificationDecision.startsWith("verified_"))
      .map((item) => item.id),
  );

  const devicesWithoutConsumables = snapshot.devices
    .filter(
      (device) =>
        device.lifecycleStatus === "active" &&
        device.verificationStatus.startsWith("verified_") &&
        device.sourceReferences.some((id) => verifiedEvidenceIds.has(id)) &&
        !publishableDeviceIds.has(device.id),
    )
    .map((device) => {
      const nonPublicEdges = snapshot.compatibilityEdges.filter(
        (edge) => edge.deviceId === device.id,
      );
      return {
        deviceId: device.id,
        brand: device.brand,
        canonicalModel: device.canonicalModel,
        regionalVariant: device.regionalVariant ?? null,
        verificationStatus: device.verificationStatus,
        nonPublicEdgeIds: nonPublicEdges.map((edge) => edge.id).sort(),
        nonPublicEdgeStatuses: [...new Set(nonPublicEdges.map((edge) => edge.verificationStatus))].sort(),
      };
    })
    .sort((left, right) => left.deviceId.localeCompare(right.deviceId));

  return {
    ...operationalReportMetadata(snapshot, now),
    summary: {
      eligibleDevices: snapshot.devices.filter(
        (device) =>
          device.lifecycleStatus === "active" &&
          device.verificationStatus.startsWith("verified_") &&
          device.sourceReferences.some((id) => verifiedEvidenceIds.has(id)),
      ).length,
      devicesWithoutPublishableConsumables: devicesWithoutConsumables.length,
    },
    devices: devicesWithoutConsumables,
  };
}

export function reportCatalogCoverage(
  snapshot: DataSnapshot,
  matrix: CatalogCoverageMatrix,
  now = new Date(),
) {
  const issues: Array<{ code: string; entityId: string; message: string }> = [];
  const devices = new Map(snapshot.devices.map((item) => [item.id, item]));
  const consumables = new Map(snapshot.consumables.map((item) => [item.id, item]));
  const edges = new Map(snapshot.compatibilityEdges.map((item) => [item.id, item]));
  const currentOfferIds = new Set(
    snapshot.offers
      .filter((offer) => offer.status === "active" && (!offer.expiresAt || new Date(offer.expiresAt) > now))
      .map((offer) => offer.consumableId),
  );
  const publishableEdgeIds = new Set(
    snapshot.compatibilityEdges
      .filter((edge) => evaluateCompatibilityForPublication(edge, {
        device: devices.get(edge.deviceId),
        consumable: consumables.get(edge.consumableId),
        evidence: snapshot.sourceEvidence,
        now,
      }).publish)
      .map((edge) => edge.id),
  );

  for (const deviceId of matrix.requiredDeviceIds) {
    const device = devices.get(deviceId);
    if (!device) issues.push({ code: "missing_demo_device", entityId: deviceId, message: `${deviceId} is missing from the catalog` });
    else if (!device.synthetic || !device.notForProduction) issues.push({ code: "unsafe_demo_device", entityId: deviceId, message: `${deviceId} is not marked as a non-production fixture` });
  }

  const expectedPublicIds = new Set(matrix.expectedPublicEdges.map(({ edgeId }) => edgeId));
  for (const expected of matrix.expectedPublicEdges) {
    const edge = edges.get(expected.edgeId);
    if (!edge) {
      issues.push({ code: "missing_expected_edge", entityId: expected.edgeId, message: `${expected.edgeId} is missing` });
      continue;
    }
    if (!publishableEdgeIds.has(edge.id)) issues.push({ code: "expected_edge_not_public", entityId: edge.id, message: `${edge.id} did not pass publication policy` });
    if (edge.deviceId !== expected.deviceId || edge.consumableId !== expected.consumableId || edge.relationType !== expected.relationType) {
      issues.push({ code: "expected_edge_mismatch", entityId: edge.id, message: `${edge.id} does not match the declared demo matrix` });
    }
    const consumable = consumables.get(expected.consumableId);
    if (!consumable || consumable.includedElements.length === 0) {
      issues.push({ code: "missing_included_elements", entityId: expected.consumableId, message: `${expected.consumableId} does not declare package contents` });
    }
    if (expected.relationType === "optional" && consumable?.category !== "air-purifier-accessory") {
      issues.push({ code: "optional_not_accessory", entityId: expected.consumableId, message: `${expected.consumableId} must be classified as an accessory` });
    }
    if (consumable?.category === "air-purifier-accessory" && expected.relationType !== "optional") {
      issues.push({ code: "accessory_presented_as_needed", entityId: edge.id, message: `${edge.id} presents an accessory as ${expected.relationType} instead of optional` });
    }
    if (consumable && consumable.includedElements.some(({ quantity }) => !Number.isInteger(quantity) || quantity < 1)) {
      issues.push({ code: "invalid_element_quantity", entityId: expected.consumableId, message: `${expected.consumableId} declares a package element without a positive integer quantity` });
    }
    if (!currentOfferIds.has(expected.consumableId)) {
      issues.push({ code: "missing_demo_offer", entityId: expected.consumableId, message: `${expected.consumableId} has no current demo offer` });
    }
  }

  for (const edgeId of publishableEdgeIds) {
    if (!expectedPublicIds.has(edgeId)) issues.push({ code: "unexpected_public_edge", entityId: edgeId, message: `${edgeId} is public but absent from the demo matrix` });
  }
  for (const edgeId of matrix.expectedNonPublicEdgeIds) {
    if (!edges.has(edgeId)) issues.push({ code: "missing_negative_fixture", entityId: edgeId, message: `${edgeId} negative fixture is missing` });
    else if (publishableEdgeIds.has(edgeId)) issues.push({ code: "negative_fixture_published", entityId: edgeId, message: `${edgeId} must remain non-public` });
  }

  issues.sort((left, right) => `${left.code}:${left.entityId}`.localeCompare(`${right.code}:${right.entityId}`));
  return {
    ...operationalReportMetadata(snapshot, now),
    scopeId: matrix.scopeId,
    summary: {
      complete: issues.length === 0,
      requiredDevices: matrix.requiredDeviceIds.length,
      expectedPublicEdges: matrix.expectedPublicEdges.length,
      expectedNonPublicEdges: matrix.expectedNonPublicEdgeIds.length,
      issues: issues.length,
    },
    issues,
  };
}
