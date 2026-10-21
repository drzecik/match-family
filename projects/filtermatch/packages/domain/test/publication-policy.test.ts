import { describe, expect, it } from "vitest";
import {
  canReplaceVerification,
  evaluateCompatibilityForPublication,
  type CompatibilityEdge,
  type Consumable,
  type Device,
  type SourceEvidence,
} from "../src/index.js";

const device: Device = {
  id: "device-1",
  brand: "AirPure",
  canonicalModel: "AP100/PL",
  category: "air_purifier",
  aliases: [],
  identifiers: {},
  lifecycleStatus: "active",
  sourceReferences: ["evidence-1"],
  verificationStatus: "verified_official",
  lastVerifiedAt: "2026-07-10T00:00:00.000Z",
};
const consumable: Consumable = {
  id: "filter-1",
  brand: "AirPure",
  canonicalName: "PureFilter 100",
  sku: "PF-100",
  category: "air_purifier_filter",
  originalOrReplacement: "original",
  includedElements: [{ name: "filter", quantity: 1 }],
  attributes: {},
  lifecycleStatus: "active",
  sourceReferences: ["evidence-1"],
};
const evidence: SourceEvidence = {
  id: "evidence-1",
  sourceType: "official_manual",
  title: "Synthetic manual",
  documentId: "SYNTHETIC-1",
  accessedAt: "2026-07-10T00:00:00.000Z",
  evidenceSummary: "Synthetic evidence used only by tests.",
  reviewer: "fixture-reviewer",
  verifiedAt: "2026-07-10T00:00:00.000Z",
  verificationDecision: "verified_official",
};
const edge: CompatibilityEdge = {
  id: "edge-1",
  deviceId: device.id,
  consumableId: consumable.id,
  relationType: "required",
  verificationStatus: "verified_official",
  confidence: 1,
  evidenceIds: [evidence.id],
  lastVerifiedAt: "2026-07-10T00:00:00.000Z",
};

describe("publication policy", () => {
  it("publishes an active verified relation with evidence", () => {
    expect(
      evaluateCompatibilityForPublication(edge, {
        device,
        consumable,
        evidence: [evidence],
        now: new Date("2026-07-17T00:00:00.000Z"),
      }),
    ).toEqual({ publish: true, reasons: [] });
  });

  it.each(["candidate", "unknown", "conflicting", "rejected", "deprecated"] as const)(
    "never publishes %s",
    (verificationStatus) => {
      const result = evaluateCompatibilityForPublication(
        { ...edge, verificationStatus },
        { device, consumable, evidence: [evidence] },
      );
      expect(result.publish).toBe(false);
      expect(result.reasons).toContain(`status_not_public:${verificationStatus}`);
    },
  );

  it("does not publish a verified relation without evidence", () => {
    const result = evaluateCompatibilityForPublication(
      { ...edge, evidenceIds: [] },
      { device, consumable, evidence: [] },
    );
    expect(result.publish).toBe(false);
    expect(result.reasons).toContain("missing_evidence");
  });

  it("does not let candidate evidence support a verified relation", () => {
    const result = evaluateCompatibilityForPublication(edge, {
      device,
      consumable,
      evidence: [{ ...evidence, verificationDecision: "candidate" }],
    });
    expect(result.publish).toBe(false);
    expect(result.reasons).toContain(`evidence_not_verified:${evidence.id}`);
  });

  it("requires at least two records for multi-source verification", () => {
    const result = evaluateCompatibilityForPublication(
      { ...edge, verificationStatus: "verified_multi_source" },
      { device, consumable, evidence: [evidence] },
    );
    expect(result.publish).toBe(false);
    expect(result.reasons).toContain("insufficient_independent_evidence");
  });

  it("does not publish an expired relation", () => {
    const result = evaluateCompatibilityForPublication(
      { ...edge, validTo: "2026-07-01T00:00:00.000Z" },
      {
        device,
        consumable,
        evidence: [evidence],
        now: new Date("2026-07-17T00:00:00.000Z"),
      },
    );
    expect(result.publish).toBe(false);
    expect(result.reasons).toContain("relation_expired");
  });

  it("does not publish a relation to a discontinued product", () => {
    const result = evaluateCompatibilityForPublication(edge, {
      device,
      consumable: { ...consumable, lifecycleStatus: "discontinued" },
      evidence: [evidence],
    });
    expect(result.publish).toBe(false);
    expect(result.reasons).toContain("consumable_not_active:discontinued");
  });

  it("does not let weaker evidence overwrite stronger evidence", () => {
    expect(canReplaceVerification("verified_official", "verified_supplier")).toBe(false);
    expect(canReplaceVerification("candidate", "verified_supplier")).toBe(true);
  });
});
