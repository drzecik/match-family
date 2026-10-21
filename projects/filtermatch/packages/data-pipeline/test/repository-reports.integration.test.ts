import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  loadRepositorySnapshot,
  parseCatalogCoverageMatrix,
  readJsonFile,
  reportAliasCollisions,
  reportCatalogCoverage,
  reportDevicesWithoutConsumables,
  reportRelationsWithoutEvidence,
  validateSnapshot,
} from "../src/index.js";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const now = new Date("2026-07-17T00:00:00.000Z");

describe("repository operational reports", () => {
  it("loads validated repository data and reports the known synthetic gaps", async () => {
    const { report, snapshot } = validateSnapshot(
      await loadRepositorySnapshot(repositoryRoot),
      now,
    );
    expect(report.valid).toBe(true);
    expect(snapshot).toBeDefined();

    const evidence = reportRelationsWithoutEvidence(snapshot!, now);
    expect(evidence.summary.blockingRelations).toBe(0);
    const fixtureEdgeIds = new Set(
      snapshot!.compatibilityEdges.filter(({ synthetic }) => synthetic).map(({ id }) => id),
    );
    const fixtureDeviceIds = new Set(
      snapshot!.devices.filter(({ synthetic }) => synthetic).map(({ id }) => id),
    );
    expect(evidence.relations.map(({ edgeId }) => edgeId).filter((id) => fixtureEdgeIds.has(id))).toEqual([
      "compat-ap100-hb100-candidate",
      "compat-ap101-hb101-conflicting",
      "compat-cf300-ap300-candidate",
      "compat-hb200-pl-cf200-hepa-candidate",
    ]);
    const researchedEdges = snapshot!.compatibilityEdges.filter(
      ({ synthetic }) => !synthetic,
    );
    expect(researchedEdges).toHaveLength(0); // The sanitized demo contains no private research.
    expect(researchedEdges.every(({ verificationStatus }) =>
      verificationStatus === "candidate" || verificationStatus === "conflicting"
    )).toBe(true);
    expect(snapshot!.searchAliases.filter(({ synthetic }) => !synthetic).every(({ approved }) => !approved)).toBe(true);

    const aliases = reportAliasCollisions(snapshot!, now);
    expect(aliases.collisions).toEqual([]);

    const coverage = reportDevicesWithoutConsumables(snapshot!, now);
    expect(
      coverage.devices.map(({ deviceId }) => deviceId).filter((id) => fixtureDeviceIds.has(id)),
    ).toContain("airpure-ap101-pl");

    const matrix = parseCatalogCoverageMatrix(
      await readJsonFile(`${repositoryRoot}/data/fixtures/demo-catalog-v1.json`),
    );
    const catalogCoverage = reportCatalogCoverage(snapshot!, matrix, now);
    expect(catalogCoverage.summary).toMatchObject({
      complete: true,
      requiredDevices: 5,
      expectedPublicEdges: 10,
      expectedNonPublicEdges: 4,
      issues: 0,
    });

    const brokenSnapshot = structuredClone(snapshot!);
    brokenSnapshot.consumables.find(({ id }) => id === "homebreeze-breeze200-seal-frame")!.category = "air-purifier-filter-set";
    const brokenCoverage = reportCatalogCoverage(brokenSnapshot, matrix, now);
    expect(brokenCoverage.summary.complete).toBe(false);
    expect(brokenCoverage.issues).toContainEqual(expect.objectContaining({
      code: "optional_not_accessory",
      entityId: "homebreeze-breeze200-seal-frame",
    }));
  });
});
