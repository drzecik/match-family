import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { DataSnapshot, ReviewDecision } from "@filtermatch/domain";
import {
  applyCompatibilityReviewDecision,
  buildPublicSnapshot,
  loadRepositorySnapshot,
  prepareCompatibilityReview,
  validateSnapshot,
} from "../src/index.js";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const now = new Date("2026-07-17T00:00:00.000Z");
let snapshot: DataSnapshot;

beforeAll(async () => {
  const validated = validateSnapshot(await loadRepositorySnapshot(repositoryRoot), now);
  if (!validated.snapshot || !validated.report.valid) throw new Error("Repository fixture is invalid");
  snapshot = validated.snapshot;
});

function decision(overrides: Partial<ReviewDecision>): ReviewDecision {
  return {
    id: "review-test-decision",
    edgeId: "compat-ap100-hb100-candidate",
    previousStatus: "candidate",
    decision: "rejected",
    evidenceIds: ["evidence-candidate-mention"],
    reviewer: "fixture-human-reviewer",
    decisionAuthority: "authorized_human_reviewer",
    decidedAt: "2026-07-16T10:00:00.000Z",
    rationale: "Synthetic test decision supplied explicitly by a fixture human reviewer.",
    synthetic: true,
    notForProduction: true,
    ...overrides,
  };
}

describe("compatibility review workflow", () => {
  it("prepares a non-approving packet for a candidate", () => {
    const packet = prepareCompatibilityReview(snapshot, "compat-ap100-hb100-candidate", now);
    expect(packet.policy).toBe("explicit_authorized_human_decision_only");
    expect(packet.edge.verificationStatus).toBe("candidate");
    expect(packet.currentPublicationDecision.publish).toBe(false);
    expect(packet.warning).toMatch(/does not approve/i);
  });

  it("records an explicit rejection and keeps the edge non-public", () => {
    const applied = applyCompatibilityReviewDecision(snapshot, decision({}), now);
    const edge = applied.snapshot.compatibilityEdges.find(
      (item) => item.id === "compat-ap100-hb100-candidate",
    );
    expect(edge).toMatchObject({
      verificationStatus: "rejected",
      lastVerifiedAt: "2026-07-16T10:00:00.000Z",
    });
    expect(applied.report).toMatchObject({
      automaticApproval: false,
      storage: "candidates",
      publicationAfter: { publish: false },
    });
    expect(validateSnapshot(applied.snapshot, now).report.valid).toBe(true);
  });

  it("refuses to verify a candidate whose evidence does not satisfy publication policy", () => {
    expect(() =>
      applyCompatibilityReviewDecision(
        snapshot,
        decision({ decision: "verified_official" }),
        now,
      ),
    ).toThrow(/fails publication policy/i);
  });

  it("refuses a stale decision and a duplicate audit id", () => {
    expect(() =>
      applyCompatibilityReviewDecision(
        snapshot,
        decision({ previousStatus: "unknown" }),
        now,
      ),
    ).toThrow(/stale decision/i);
    expect(() =>
      applyCompatibilityReviewDecision(
        snapshot,
        decision({ id: "review-compat-ap100-pf100-v1", edgeId: "compat-ap100-pf100" }),
        now,
      ),
    ).toThrow(/already exists/i);
  });

  it("reverifies an official edge without changing its evidence strength", () => {
    const applied = applyCompatibilityReviewDecision(
      snapshot,
      decision({
        id: "review-compat-ap100-pf100-v2",
        edgeId: "compat-ap100-pf100",
        previousStatus: "verified_official",
        decision: "verified_official",
        evidenceIds: ["evidence-original-filter"],
      }),
      now,
    );
    expect(validateSnapshot(applied.snapshot, now).report.valid).toBe(true);
    expect(applied.report).toMatchObject({
      publicationAfter: { publish: true },
      storage: "verified",
    });
  });

  it("allows a safety withdrawal and removes the edge from the public snapshot", () => {
    const applied = applyCompatibilityReviewDecision(
      snapshot,
      decision({
        id: "review-compat-ap100-pf100-withdrawn",
        edgeId: "compat-ap100-pf100",
        previousStatus: "verified_official",
        decision: "conflicting",
        evidenceIds: ["evidence-original-filter"],
      }),
      now,
    );
    expect(
      buildPublicSnapshot(applied.snapshot, now).compatibilityEdges.some(
        (edge) => edge.id === "compat-ap100-pf100",
      ),
    ).toBe(false);
  });

  it("never overwrites stronger verified evidence with a weaker verified status", () => {
    expect(() =>
      applyCompatibilityReviewDecision(
        snapshot,
        decision({
          id: "review-compat-ap100-pf100-downgrade",
          edgeId: "compat-ap100-pf100",
          previousStatus: "verified_official",
          decision: "verified_supplier",
          evidenceIds: ["evidence-replacement-filter"],
        }),
        now,
      ),
    ).toThrow(/weaker verified decision/i);
  });
});
