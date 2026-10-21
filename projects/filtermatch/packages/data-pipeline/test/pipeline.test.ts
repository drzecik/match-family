import { describe, expect, it } from "vitest";
import type { DataSnapshot, Device } from "@filtermatch/domain";
import {
  buildPublicSnapshot,
  dataRevision,
  findConflicts,
  importDeviceCandidates,
  reportAliasCollisions,
  reportDevicesWithoutConsumables,
  reportRelationsWithoutEvidence,
  reportStaleCompatibility,
  validateSnapshot,
} from "../src/index.js";

const now = new Date("2026-07-17T00:00:00.000Z");
const device: Device = {
  id: "airpure-ap100-pl",
  brand: "AirPure",
  canonicalModel: "AP100/PL",
  regionalVariant: "/PL",
  category: "air-purifier",
  aliases: ["AP 100 PL"],
  identifiers: { productCode: "AP100PL" },
  lifecycleStatus: "active",
  sourceReferences: ["evidence-device-ap100"],
  verificationStatus: "verified_official",
  lastVerifiedAt: "2026-07-10T00:00:00.000Z",
  synthetic: true,
  notForProduction: true,
};

const snapshot: DataSnapshot = {
  devices: [device],
  consumables: [
    {
      id: "airpure-filter-100",
      brand: "AirPure",
      canonicalName: "PureFilter 100 Fixture",
      sku: "SYN-PF-100",
      category: "air-purifier-filter",
      originalOrReplacement: "original",
      includedElements: [{ name: "filtr zintegrowany", quantity: 1 }],
      attributes: {},
      lifecycleStatus: "active",
      sourceReferences: ["evidence-edge-original"],
      synthetic: true,
      notForProduction: true,
    },
    {
      id: "cleanflow-filter-candidate",
      brand: "CleanFlow",
      canonicalName: "Candidate Filter Fixture",
      sku: "SYN-CAND-100",
      category: "air-purifier-filter",
      originalOrReplacement: "replacement",
      includedElements: [{ name: "filtr", quantity: 1 }],
      attributes: {},
      lifecycleStatus: "active",
      sourceReferences: [],
      synthetic: true,
      notForProduction: true,
    },
  ],
  compatibilityEdges: [
    {
      id: "edge-original",
      deviceId: device.id,
      consumableId: "airpure-filter-100",
      relationType: "required",
      verificationStatus: "verified_official",
      confidence: 1,
      evidenceIds: ["evidence-edge-original"],
      lastVerifiedAt: "2026-07-10T00:00:00.000Z",
      synthetic: true,
      notForProduction: true,
    },
    {
      id: "edge-candidate",
      deviceId: device.id,
      consumableId: "cleanflow-filter-candidate",
      relationType: "alternative",
      verificationStatus: "candidate",
      confidence: 0.5,
      evidenceIds: [],
      synthetic: true,
      notForProduction: true,
    },
  ],
  sourceEvidence: [
    {
      id: "evidence-device-ap100",
      sourceType: "official_product_page",
      title: "Synthetic device page",
      documentId: "SYN-DEVICE-AP100",
      accessedAt: "2026-07-10T00:00:00.000Z",
      evidenceSummary: "Synthetic fixture device identity.",
      reviewer: "fixture-reviewer",
      verifiedAt: "2026-07-10T00:00:00.000Z",
      verificationDecision: "verified_official",
      synthetic: true,
      notForProduction: true,
    },
    {
      id: "evidence-edge-original",
      sourceType: "official_manual",
      title: "Synthetic manual",
      documentId: "SYN-MANUAL-AP100",
      accessedAt: "2026-07-10T00:00:00.000Z",
      evidenceSummary: "Synthetic fixture states the filter SKU.",
      reviewer: "fixture-reviewer",
      verifiedAt: "2026-07-10T00:00:00.000Z",
      verificationDecision: "verified_official",
      synthetic: true,
      notForProduction: true,
    },
  ],
  searchAliases: [],
  offers: [],
  reviewDecisions: [
    {
      id: "review-edge-original-v1",
      edgeId: "edge-original",
      previousStatus: "candidate",
      decision: "verified_official",
      evidenceIds: ["evidence-edge-original"],
      reviewer: "fixture-reviewer",
      decisionAuthority: "authorized_human_reviewer",
      decidedAt: "2026-07-10T00:00:00.000Z",
      rationale: "Synthetic fixture review explicitly confirms the official evidence.",
      synthetic: true,
      notForProduction: true,
    },
  ],
};

describe("data pipeline", () => {
  it("validates referential integrity", () => {
    const result = validateSnapshot(snapshot, now);
    expect(result.report.valid).toBe(true);
  });

  it("filters candidates from the deterministic public snapshot", () => {
    const publicSnapshot = buildPublicSnapshot(snapshot, now);
    expect(publicSnapshot.compatibilityEdges.map((edge) => edge.id)).toEqual(["edge-original"]);
    expect(publicSnapshot.consumables.map((item) => item.id)).toEqual(["airpure-filter-100"]);
    expect(publicSnapshot.reviewDecisions).toEqual([]);
  });

  it("imports data only as candidate and is idempotent by id", () => {
    const incoming = [{ ...device, id: "new-device", verificationStatus: "verified_official" }];
    const first = importDeviceCandidates(incoming, [device]);
    expect(first.records.find((item) => item.id === "new-device")?.verificationStatus).toBe(
      "candidate",
    );
    const second = importDeviceCandidates(incoming, first.records);
    expect(second.report.imported).toBe(0);
    expect(second.report.duplicateIds).toEqual(["new-device"]);
  });

  it("never overwrites an existing stronger device record", () => {
    const incoming = [{ ...device, brand: "Tampered", verificationStatus: "candidate" }];
    const result = importDeviceCandidates(incoming, [device]);
    expect(result.records).toEqual([device]);
    expect(result.report.duplicateIds).toEqual([device.id]);
  });

  it("reports a malformed imported record instead of persisting it", () => {
    const result = importDeviceCandidates([{ id: "broken-device" }], []);
    expect(result.records).toEqual([]);
    expect(result.report.rejected).toBe(1);
    expect(result.report.errors[0]?.index).toBe(0);
  });

  it("detects conflicting decisions for the same pair", () => {
    expect(
      findConflicts([
        snapshot.compatibilityEdges[0]!,
        { ...snapshot.compatibilityEdges[0]!, id: "edge-rejected", verificationStatus: "rejected" },
      ]),
    ).toHaveLength(1);
  });

  it("reports stale verified relations", () => {
    const report = reportStaleCompatibility(snapshot, { now, maxAgeDays: 1 });
    expect(report.stale.map((item) => item.edgeId)).toEqual(["edge-original"]);
  });

  it("reports candidate relations without evidence without treating them as public", () => {
    const report = reportRelationsWithoutEvidence(snapshot, now);
    expect(report.summary).toEqual({
      relationsWithEvidenceGaps: 1,
      blockingRelations: 0,
      nonPublicRelations: 1,
    });
    expect(report.relations).toEqual([
      expect.objectContaining({
        edgeId: "edge-candidate",
        verificationStatus: "candidate",
        blocking: false,
        reasons: ["missing_evidence"],
      }),
    ]);
  });

  it("marks a verified relation backed by unverified evidence as a blocking gap", () => {
    const broken = structuredClone(snapshot);
    broken.sourceEvidence[1]!.verificationDecision = "candidate";

    const report = reportRelationsWithoutEvidence(broken, now);
    expect(report.summary.blockingRelations).toBe(1);
    expect(report.relations).toContainEqual(
      expect.objectContaining({
        edgeId: "edge-original",
        blocking: true,
        unverifiedEvidenceIds: ["evidence-edge-original"],
      }),
    );
  });

  it("reports approved alias collisions with raw values and affected entities", () => {
    const colliding = structuredClone(snapshot);
    colliding.devices.push({
      ...device,
      id: "airpure-ap101-pl",
      canonicalModel: "AP101/PL",
      aliases: ["AP 101 PL"],
    });
    colliding.searchAliases = [
      {
        id: "alias-ap100-ambiguous",
        entityType: "device",
        entityId: "airpure-ap100-pl",
        rawAlias: "Air Pure 100",
        normalizedAlias: "AIRPURE100",
        aliasType: "series_name",
        approved: true,
        source: "fixture-review",
        synthetic: true,
        notForProduction: true,
      },
      {
        id: "alias-ap101-ambiguous",
        entityType: "device",
        entityId: "airpure-ap101-pl",
        rawAlias: "AirPure 100",
        normalizedAlias: "AIRPURE 100",
        aliasType: "series_name",
        approved: true,
        source: "fixture-review",
        synthetic: true,
        notForProduction: true,
      },
    ];

    const report = reportAliasCollisions(colliding, now);
    const validation = validateSnapshot(colliding, now);
    expect(report.summary).toEqual({
      approvedAliases: 2,
      collisionGroups: 1,
      affectedEntities: 2,
    });
    expect(report.collisions[0]).toMatchObject({
      entityType: "device",
      normalizedAlias: "AIRPURE100",
      entityIds: ["airpure-ap100-pl", "airpure-ap101-pl"],
    });
    expect(report.collisions[0]?.aliases.map(({ rawAlias }) => rawAlias)).toEqual([
      "Air Pure 100",
      "AirPure 100",
    ]);
    expect(validation.report.issues).toContainEqual(
      expect.objectContaining({ code: "alias_collision", severity: "warning" }),
    );
  });

  it("reports verified devices that have no publishable consumable", () => {
    const uncovered = structuredClone(snapshot);
    uncovered.devices.push({
      ...device,
      id: "airpure-ap101-pl",
      canonicalModel: "AP101/PL",
      aliases: ["AP 101 PL"],
    });
    uncovered.compatibilityEdges.push({
      ...snapshot.compatibilityEdges[1]!,
      id: "edge-ap101-candidate",
      deviceId: "airpure-ap101-pl",
    });

    const report = reportDevicesWithoutConsumables(uncovered, now);
    expect(report.devices).toEqual([
      expect.objectContaining({
        deviceId: "airpure-ap101-pl",
        nonPublicEdgeIds: ["edge-ap101-candidate"],
        nonPublicEdgeStatuses: ["candidate"],
      }),
    ]);
  });

  it("generates a stable content revision independent of object key order", () => {
    const reordered = {
      reviewDecisions: snapshot.reviewDecisions,
      offers: snapshot.offers,
      searchAliases: snapshot.searchAliases,
      sourceEvidence: snapshot.sourceEvidence,
      compatibilityEdges: snapshot.compatibilityEdges,
      consumables: snapshot.consumables,
      devices: snapshot.devices,
    } as DataSnapshot;
    expect(dataRevision(snapshot)).toBe(dataRevision(reordered));
    expect(dataRevision(snapshot)).toMatch(/^sha256:[a-f0-9]{64}$/u);
  });

  it("rejects broken snapshots", () => {
    const broken = structuredClone(snapshot);
    broken.compatibilityEdges[0]!.deviceId = "missing-device";
    const result = validateSnapshot(broken, now);
    expect(result.report.valid).toBe(false);
    expect(result.report.issues.some((issue) => issue.code === "missing_reference")).toBe(true);
  });

  it("rejects a verified device backed only by candidate evidence", () => {
    const broken = structuredClone(snapshot);
    broken.sourceEvidence[0]!.verificationDecision = "candidate";
    const result = validateSnapshot(broken, now);
    expect(result.report.valid).toBe(false);
    expect(
      result.report.issues.some(
        (issue) => issue.code === "verified_device_without_verified_evidence",
      ),
    ).toBe(true);
  });
});
