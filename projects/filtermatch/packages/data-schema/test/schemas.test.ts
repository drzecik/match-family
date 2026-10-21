import { describe, expect, it } from "vitest";
import {
  assertCsvCellIsInert,
  compatibilityEdgeSchema,
  dataCollectionEnvelopeSchema,
  offerSchema,
  reviewDecisionSchema,
  sourceEvidenceSchema,
} from "../src/index.js";

describe("data boundary schemas", () => {
  it("rejects a verified edge without evidence", () => {
    const result = compatibilityEdgeSchema.safeParse({
      id: "edge-1",
      deviceId: "device-1",
      consumableId: "filter-1",
      relationType: "required",
      verificationStatus: "verified_official",
      confidence: 1,
      evidenceIds: [],
      lastVerifiedAt: "2026-07-10T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("allows a candidate edge without evidence but never verifies it", () => {
    expect(
      compatibilityEdgeSchema.safeParse({
        id: "edge-1",
        deviceId: "device-1",
        consumableId: "filter-1",
        relationType: "alternative",
        verificationStatus: "candidate",
        confidence: 0.4,
        evidenceIds: [],
      }).success,
    ).toBe(true);
  });

  it("rejects unsafe URL protocols", () => {
    const baseOffer = {
      id: "offer-1",
      consumableId: "filter-1",
      merchant: "Synthetic Shop",
      currency: "PLN",
      availability: "in_stock",
      sponsored: false,
      fetchedAt: "2026-07-10T00:00:00.000Z",
      status: "active",
    };
    expect(
      offerSchema.safeParse({ ...baseOffer, destinationUrl: "javascript:alert(1)" }).success,
    ).toBe(false);
  });

  it("requires both synthetic fixture markers", () => {
    const result = sourceEvidenceSchema.safeParse({
      id: "evidence-1",
      sourceType: "official_manual",
      title: "Fixture",
      documentId: "fixture-doc",
      accessedAt: "2026-07-10T00:00:00.000Z",
      evidenceSummary: "Fixture only",
      reviewer: "fixture-reviewer",
      verifiedAt: "2026-07-10T00:00:00.000Z",
      verificationDecision: "verified_official",
      synthetic: true,
    });
    expect(result.success).toBe(false);
  });

  it("requires an authorized human authority for review decisions", () => {
    const base = {
      id: "review-1",
      edgeId: "edge-1",
      previousStatus: "candidate",
      decision: "rejected",
      evidenceIds: [],
      reviewer: "reviewer-1",
      decidedAt: "2026-07-10T00:00:00.000Z",
      rationale: "Explicit reviewer rationale for the rejection.",
    };
    expect(reviewDecisionSchema.safeParse(base).success).toBe(false);
    expect(
      reviewDecisionSchema.safeParse({
        ...base,
        decisionAuthority: "authorized_human_reviewer",
      }).success,
    ).toBe(true);
  });

  it("does not accept candidate as a completed human review decision", () => {
    expect(
      reviewDecisionSchema.safeParse({
        id: "review-1",
        edgeId: "edge-1",
        previousStatus: "candidate",
        decision: "candidate",
        evidenceIds: [],
        reviewer: "reviewer-1",
        decisionAuthority: "authorized_human_reviewer",
        decidedAt: "2026-07-10T00:00:00.000Z",
        rationale: "The record must remain queued for later review.",
      }).success,
    ).toBe(false);
  });

  it("rejects unversioned source collections and mismatched schema versions", () => {
    expect(dataCollectionEnvelopeSchema.safeParse([]).success).toBe(false);
    expect(
      dataCollectionEnvelopeSchema.safeParse({
        schemaVersion: 1,
        kind: "devices",
        records: [],
      }).success,
    ).toBe(false);
  });

  it.each(["=HYPERLINK(\"https://evil.example\")", "+1+1", " -2+3", "@SUM(A1)", "\0=1"])(
    "rejects dangerous CSV cell %s",
    (cell) => expect(() => assertCsvCellIsInert(cell)).toThrow(/formula injection/i),
  );
});
