import {
  dataSnapshotSchema,
  type CompatibilityEdgeInput,
} from "@filtermatch/data-schema";
import {
  evaluateCompatibilityForPublication,
  type DataSnapshot,
} from "@filtermatch/domain";
import { normalizeModelKey } from "@filtermatch/model-search";

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  entityId?: string;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  generatedAt: string;
  counts: Record<keyof DataSnapshot, number>;
  issues: ValidationIssue[];
}

export interface ProductionReadinessIssue {
  code: "fixture_in_public_data" | "reserved_url_in_public_data" | "empty_public_catalog";
  entityId?: string;
  message: string;
}

function findDuplicateIds<T extends { id: string }>(
  collectionName: string,
  items: readonly T[],
): ValidationIssue[] {
  const seen = new Set<string>();
  const issues: ValidationIssue[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      issues.push({
        severity: "error",
        code: "duplicate_id",
        entityId: item.id,
        message: `Duplicate id in ${collectionName}: ${item.id}`,
      });
    }
    seen.add(item.id);
  }
  return issues;
}

export function validateSnapshot(
  input: unknown,
  now = new Date(),
): { report: ValidationReport; snapshot?: DataSnapshot } {
  const parsed = dataSnapshotSchema.safeParse(input);
  const emptyCounts: ValidationReport["counts"] = {
    devices: 0,
    consumables: 0,
    compatibilityEdges: 0,
    sourceEvidence: 0,
    searchAliases: 0,
    offers: 0,
    reviewDecisions: 0,
  };
  if (!parsed.success) {
    const issues: ValidationIssue[] = parsed.error.issues.map((issue) => ({
      severity: "error",
      code: "schema_validation_failed",
      message: `${issue.path.join(".") || "root"}: ${issue.message}`,
    }));
    return {
      report: {
        valid: false,
        generatedAt: now.toISOString(),
        counts: emptyCounts,
        issues,
      },
    };
  }

  const snapshot = parsed.data as DataSnapshot;
  const issues: ValidationIssue[] = [];
  const collections = Object.entries(snapshot) as Array<
    [keyof DataSnapshot, Array<{ id: string }>]
  >;
  for (const [name, items] of collections) {
    issues.push(...findDuplicateIds(name, items));
  }

  const devices = new Map(snapshot.devices.map((item) => [item.id, item]));
  const consumables = new Map(snapshot.consumables.map((item) => [item.id, item]));
  const evidence = new Map(snapshot.sourceEvidence.map((item) => [item.id, item]));

  for (const device of snapshot.devices) {
    const resolvedSourceEvidence = device.sourceReferences.flatMap((evidenceId) => {
      const item = evidence.get(evidenceId);
      return item ? [item] : [];
    });
    for (const evidenceId of device.sourceReferences) {
      if (!evidence.has(evidenceId)) {
        issues.push(missingReference(device.id, "evidence", evidenceId));
      }
    }
    if (
      device.verificationStatus.startsWith("verified_") &&
      !resolvedSourceEvidence.some((item) => item.verificationDecision.startsWith("verified_"))
    ) {
      issues.push({
        severity: "error",
        code: "verified_device_without_verified_evidence",
        entityId: device.id,
        message: `${device.id} has no verified identity evidence`,
      });
    }
  }
  for (const consumable of snapshot.consumables) {
    for (const evidenceId of consumable.sourceReferences) {
      if (!evidence.has(evidenceId)) {
        issues.push(missingReference(consumable.id, "evidence", evidenceId));
      }
    }
  }
  for (const edge of snapshot.compatibilityEdges) {
    const device = devices.get(edge.deviceId);
    const consumable = consumables.get(edge.consumableId);
    if (!device) issues.push(missingReference(edge.id, "device", edge.deviceId));
    if (!consumable) issues.push(missingReference(edge.id, "consumable", edge.consumableId));
    for (const evidenceId of edge.evidenceIds) {
      if (!evidence.has(evidenceId)) {
        issues.push(missingReference(edge.id, "evidence", evidenceId));
      }
    }
    const decision = evaluateCompatibilityForPublication(edge, {
      device,
      consumable,
      evidence: snapshot.sourceEvidence,
      now,
    });
    const verified = edge.verificationStatus.startsWith("verified_");
    const evidencePolicyFailure = decision.reasons.some(
      (reason) =>
        reason.startsWith("evidence_") ||
        reason === "missing_evidence" ||
        reason === "missing_official_evidence" ||
        reason === "missing_supplier_evidence" ||
        reason === "insufficient_independent_evidence",
    );
    if (verified && evidencePolicyFailure) {
      issues.push({
        severity: "error",
        code: "verified_edge_without_resolvable_evidence",
        entityId: edge.id,
        message: decision.reasons.join(", "),
      });
    }
  }
  for (const alias of snapshot.searchAliases) {
    const targetExists =
      alias.entityType === "device"
        ? devices.has(alias.entityId)
        : consumables.has(alias.entityId);
    if (!targetExists) issues.push(missingReference(alias.id, alias.entityType, alias.entityId));
  }
  for (const offer of snapshot.offers) {
    if (!consumables.has(offer.consumableId)) {
      issues.push(missingReference(offer.id, "consumable", offer.consumableId));
    }
  }

  const edges = new Map(snapshot.compatibilityEdges.map((item) => [item.id, item]));
  const decisionsByEdge = new Map<string, typeof snapshot.reviewDecisions>();
  for (const decision of snapshot.reviewDecisions) {
    const edge = edges.get(decision.edgeId);
    if (!edge) issues.push(missingReference(decision.id, "compatibility edge", decision.edgeId));
    for (const evidenceId of decision.evidenceIds) {
      if (!evidence.has(evidenceId)) {
        issues.push(missingReference(decision.id, "evidence", evidenceId));
      }
    }
    if (
      edge &&
      Boolean(edge.synthetic) !== Boolean(decision.synthetic)
    ) {
      issues.push({
        severity: "error",
        code: "review_fixture_mismatch",
        entityId: decision.id,
        message: `${decision.id} fixture marker does not match ${edge.id}`,
      });
    }
    if (edge && decision.decision.startsWith("verified_")) {
      const historicalDecision = evaluateCompatibilityForPublication(
        {
          ...edge,
          verificationStatus: decision.decision,
          evidenceIds: decision.evidenceIds,
          lastVerifiedAt: decision.decidedAt,
        },
        {
          device: devices.get(edge.deviceId),
          consumable: consumables.get(edge.consumableId),
          evidence: snapshot.sourceEvidence,
          now: new Date(decision.decidedAt),
        },
      );
      if (!historicalDecision.publish) {
        issues.push({
          severity: "error",
          code: "invalid_verified_review_decision",
          entityId: decision.id,
          message: historicalDecision.reasons.join(", "),
        });
      }
    }
    decisionsByEdge.set(decision.edgeId, [
      ...(decisionsByEdge.get(decision.edgeId) ?? []),
      decision,
    ]);
  }
  for (const edge of snapshot.compatibilityEdges) {
    const decisions = [...(decisionsByEdge.get(edge.id) ?? [])].sort((left, right) =>
      left.decidedAt.localeCompare(right.decidedAt),
    );
    if (edge.verificationStatus.startsWith("verified_") && decisions.length === 0) {
      issues.push({
        severity: "error",
        code: "verified_edge_without_review_decision",
        entityId: edge.id,
        message: `${edge.id} has no authorized human review decision`,
      });
      continue;
    }
    for (let index = 1; index < decisions.length; index += 1) {
      if (decisions[index]!.previousStatus !== decisions[index - 1]!.decision) {
        issues.push({
          severity: "error",
          code: "broken_review_decision_chain",
          entityId: decisions[index]!.id,
          message: `${decisions[index]!.id} does not continue the previous decision state`,
        });
      }
    }
    const latest = decisions.at(-1);
    if (latest && latest.decision !== edge.verificationStatus) {
      issues.push({
        severity: "error",
        code: "review_decision_state_mismatch",
        entityId: edge.id,
        message: `${edge.id} status does not match latest review decision ${latest.id}`,
      });
    }
    if (
      latest &&
      [...latest.evidenceIds].sort().join("\0") !== [...edge.evidenceIds].sort().join("\0")
    ) {
      issues.push({
        severity: "error",
        code: "review_decision_evidence_mismatch",
        entityId: edge.id,
        message: `${edge.id} evidence does not match latest review decision ${latest.id}`,
      });
    }
    if (latest && edge.lastVerifiedAt !== latest.decidedAt) {
      issues.push({
        severity: "error",
        code: "review_decision_date_mismatch",
        entityId: edge.id,
        message: `${edge.id} lastVerifiedAt does not match latest review decision ${latest.id}`,
      });
    }
  }

  issues.push(...aliasCollisionIssues(snapshot));

  const counts = Object.fromEntries(
    (Object.entries(snapshot) as Array<[keyof DataSnapshot, unknown[]]>).map(([name, items]) => [
      name,
      items.length,
    ]),
  ) as ValidationReport["counts"];
  return {
    snapshot,
    report: {
      valid: !issues.some((issue) => issue.severity === "error"),
      generatedAt: now.toISOString(),
      counts,
      issues,
    },
  };
}

function missingReference(
  entityId: string,
  targetKind: string,
  targetId: string,
): ValidationIssue {
  return {
    severity: "error",
    code: "missing_reference",
    entityId,
    message: `${entityId} references missing ${targetKind} ${targetId}`,
  };
}

function aliasCollisionIssues(snapshot: DataSnapshot): ValidationIssue[] {
  const targetsByAlias = new Map<string, Set<string>>();
  for (const alias of snapshot.searchAliases.filter((item) => item.approved)) {
    const key = `${alias.entityType}:${normalizeModelKey(alias.rawAlias)}`;
    const targets = targetsByAlias.get(key) ?? new Set<string>();
    targets.add(alias.entityId);
    targetsByAlias.set(key, targets);
  }
  return [...targetsByAlias.entries()]
    .filter(([, targets]) => targets.size > 1)
    .map(([alias, targets]) => ({
      severity: "warning" as const,
      code: "alias_collision",
      message: `${alias} points to multiple entities: ${[...targets].sort().join(", ")}`,
    }));
}

export function findConflicts(edges: readonly CompatibilityEdgeInput[]) {
  const groups = new Map<string, CompatibilityEdgeInput[]>();
  for (const edge of edges) {
    const key = `${edge.deviceId}:${edge.consumableId}`;
    groups.set(key, [...(groups.get(key) ?? []), edge]);
  }
  return [...groups.entries()]
    .map(([relationKey, relationEdges]) => {
      const statuses = [...new Set(relationEdges.map((edge) => edge.verificationStatus))].sort();
      const explicitConflict = statuses.includes("conflicting");
      const decisionConflict =
        statuses.some((status) => status.startsWith("verified_")) &&
        statuses.includes("rejected");
      return {
        relationKey,
        edgeIds: relationEdges.map((edge) => edge.id).sort(),
        statuses,
        conflicting: explicitConflict || decisionConflict,
      };
    })
    .filter((item) => item.conflicting)
    .sort((a, b) => a.relationKey.localeCompare(b.relationKey));
}

export function buildPublicSnapshot(snapshot: DataSnapshot, now: Date): DataSnapshot {
  const devicesById = new Map(snapshot.devices.map((item) => [item.id, item]));
  const consumablesById = new Map(snapshot.consumables.map((item) => [item.id, item]));
  const publicEdges = snapshot.compatibilityEdges.filter((edge) =>
    evaluateCompatibilityForPublication(edge, {
      device: devicesById.get(edge.deviceId),
      consumable: consumablesById.get(edge.consumableId),
      evidence: snapshot.sourceEvidence,
      now,
    }).publish,
  );
  const publicConsumableIds = new Set(publicEdges.map((edge) => edge.consumableId));
  const publicDevices = snapshot.devices.filter(
    (device) =>
      device.lifecycleStatus === "active" &&
      device.verificationStatus.startsWith("verified_") &&
      device.sourceReferences.some((id) => {
        const source = snapshot.sourceEvidence.find((item) => item.id === id);
        return source?.verificationDecision.startsWith("verified_") === true;
      }),
  );
  const publicDeviceIds = new Set(publicDevices.map((device) => device.id));
  const evidenceIds = new Set<string>();
  for (const device of publicDevices) {
    device.sourceReferences.forEach((id) => evidenceIds.add(id));
  }
  for (const edge of publicEdges) {
    edge.evidenceIds.forEach((id) => evidenceIds.add(id));
  }
  const publicConsumables = snapshot.consumables.filter((item) =>
    publicConsumableIds.has(item.id),
  );
  for (const item of publicConsumables) {
    item.sourceReferences.forEach((id) => evidenceIds.add(id));
  }

  return {
    devices: publicDevices,
    consumables: publicConsumables,
    compatibilityEdges: publicEdges,
    sourceEvidence: snapshot.sourceEvidence.filter((item) => evidenceIds.has(item.id)),
    searchAliases: snapshot.searchAliases.filter((alias) => {
      if (!alias.approved) return false;
      return alias.entityType === "device"
        ? publicDeviceIds.has(alias.entityId)
        : publicConsumableIds.has(alias.entityId);
    }),
    offers: snapshot.offers.filter(
      (offer) => publicConsumableIds.has(offer.consumableId) && offer.status !== "inactive",
    ),
    reviewDecisions: [],
  };
}

export function productionReadinessIssues(snapshot: DataSnapshot): ProductionReadinessIssue[] {
  const issues: ProductionReadinessIssue[] = [];
  const collections = Object.entries(snapshot) as Array<
    [keyof DataSnapshot, Array<{ id: string; synthetic?: boolean; notForProduction?: boolean }>]
  >;
  for (const [collection, records] of collections) {
    for (const record of records) {
      if (record.synthetic || record.notForProduction) {
        issues.push({
          code: "fixture_in_public_data",
          entityId: record.id,
          message: `${collection}/${record.id} is marked as a non-production fixture`,
        });
      }
    }
  }
  for (const source of snapshot.sourceEvidence) {
    if (source.url && isReservedExampleUrl(source.url)) {
      issues.push({
        code: "reserved_url_in_public_data",
        entityId: source.id,
        message: `${source.id} uses a reserved .example URL`,
      });
    }
  }
  for (const offer of snapshot.offers) {
    for (const url of [offer.destinationUrl, offer.affiliateUrl].filter((value): value is string => Boolean(value))) {
      if (isReservedExampleUrl(url)) {
        issues.push({
          code: "reserved_url_in_public_data",
          entityId: offer.id,
          message: `${offer.id} uses a reserved .example URL`,
        });
        break;
      }
    }
  }
  if (snapshot.compatibilityEdges.length === 0) {
    issues.push({
      code: "empty_public_catalog",
      message: "A production build needs at least one publishable compatibility relation",
    });
  }
  return issues.sort((left, right) =>
    `${left.code}:${left.entityId ?? ""}`.localeCompare(`${right.code}:${right.entityId ?? ""}`),
  );
}

function isReservedExampleUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "example" || hostname.endsWith(".example");
  } catch {
    return false;
  }
}
