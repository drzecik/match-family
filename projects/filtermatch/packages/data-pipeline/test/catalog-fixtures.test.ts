import { fileURLToPath } from "node:url";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DataSnapshot } from "@filtermatch/domain";
import {
  buildPublicSnapshot,
  loadRepositorySnapshot,
  productionReadinessIssues,
  validateSnapshot,
} from "../src/index.js";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const at = new Date("2026-07-17T00:00:00.000Z");

async function catalog(): Promise<{ full: DataSnapshot; publicData: DataSnapshot }> {
  const result = validateSnapshot(await loadRepositorySnapshot(repositoryRoot), at);
  expect(result.report.issues).toEqual([]);
  expect(result.snapshot).toBeDefined();
  const full = result.snapshot!;
  return { full, publicData: buildPublicSnapshot(full, at) };
}

describe("synthetic commercial slice fixtures", () => {
  it("covers three fictional device families without merging regional variants", async () => {
    const { full } = await catalog();
    const fixtureDevices = full.devices.filter((device) => device.synthetic && device.notForProduction);
    expect(new Set(fixtureDevices.map((device) => device.brand))).toEqual(
      new Set(["AirPure", "HomeBreeze", "CleanFlow"]),
    );
    expect(fixtureDevices.map((device) => device.canonicalModel)).toEqual(
      expect.arrayContaining(["AP100/PL", "AP101/PL", "HB200/PL", "HB200/DE", "CF300/10"]),
    );
  });

  it("publishes complete sets, individual elements and an optional accessory", async () => {
    const { publicData } = await catalog();
    const categories = new Set(publicData.consumables.map((item) => item.category));
    expect(categories.has("air-purifier-filter-set")).toBe(true);
    expect(categories.has("air-purifier-hepa-filter")).toBe(true);
    expect(categories.has("air-purifier-carbon-filter")).toBe(true);
    expect(categories.has("air-purifier-accessory")).toBe(true);

    const accessoryEdge = publicData.compatibilityEdges.find(
      (edge) => edge.id === "compat-hb200-pl-seal-frame",
    );
    expect(accessoryEdge?.relationType).toBe("optional");
  });

  it("never publishes an accessory as a material required for compatibility", async () => {
    const { publicData } = await catalog();
    const consumables = new Map(publicData.consumables.map((item) => [item.id, item]));
    for (const edge of publicData.compatibilityEdges) {
      if (consumables.get(edge.consumableId)?.category === "air-purifier-accessory") {
        expect(edge.relationType).toBe("optional");
      }
    }
  });

  it("declares package contents with positive integer quantities", async () => {
    const { publicData } = await catalog();
    for (const consumable of publicData.consumables) {
      expect(consumable.includedElements.length).toBeGreaterThan(0);
      for (const element of consumable.includedElements) {
        expect(Number.isInteger(element.quantity)).toBe(true);
        expect(element.quantity).toBeGreaterThanOrEqual(1);
        expect(element.name.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps replacements alternative and candidate products non-public", async () => {
    const { full, publicData } = await catalog();
    const publicConsumables = new Map(publicData.consumables.map((item) => [item.id, item]));
    for (const edge of publicData.compatibilityEdges) {
      const consumable = publicConsumables.get(edge.consumableId)!;
      if (consumable.originalOrReplacement === "replacement") {
        expect(edge.relationType).toBe("alternative");
      }
    }

    const candidateIds = new Set(
      full.compatibilityEdges
        .filter((edge) => edge.verificationStatus === "candidate")
        .map((edge) => edge.id),
    );
    expect(candidateIds.size).toBeGreaterThan(0);
    expect(
      publicData.compatibilityEdges.some((edge) => candidateIds.has(edge.id)),
    ).toBe(false);
  });

  it("backs every public edge with evidence, human review and a current synthetic offer", async () => {
    const { full, publicData } = await catalog();
    const evidenceIds = new Set(full.sourceEvidence.map((item) => item.id));
    const currentOfferIds = new Set(
      publicData.offers
        .filter(
          (offer) =>
            offer.status === "active" &&
            (!offer.expiresAt || new Date(offer.expiresAt) > at),
        )
        .map((offer) => offer.consumableId),
    );

    for (const edge of publicData.compatibilityEdges) {
      expect(edge.evidenceIds.length).toBeGreaterThan(0);
      expect(edge.evidenceIds.every((id) => evidenceIds.has(id))).toBe(true);
      expect(
        full.reviewDecisions.some(
          (decision) =>
            decision.edgeId === edge.id &&
            decision.decision === edge.verificationStatus &&
            decision.decisionAuthority === "authorized_human_reviewer",
        ),
      ).toBe(true);
      expect(currentOfferIds.has(edge.consumableId)).toBe(true);
    }
  });

  it("marks every source fixture record as synthetic and non-production", async () => {
    const { full } = await catalog();
    const records = [
      ...full.devices,
      ...full.consumables,
      ...full.compatibilityEdges,
      ...full.sourceEvidence,
      ...full.searchAliases,
      ...full.offers,
      ...full.reviewDecisions,
    ];
    const fixtures = records.filter((item) => item.synthetic || item.notForProduction);
    expect(fixtures.length).toBeGreaterThan(0);
    expect(fixtures.every((item) => item.synthetic && item.notForProduction)).toBe(true);
    expect(records.every((item) => item.synthetic && item.notForProduction)).toBe(true);
  });

  it("fails closed when demonstration data is checked for production release", async () => {
    const { publicData } = await catalog();
    const issues = productionReadinessIssues(publicData);
    expect(issues.some(({ code }) => code === "fixture_in_public_data")).toBe(true);
    expect(issues.some(({ code }) => code === "reserved_url_in_public_data")).toBe(true);
  });

  it("rejects a researched edge that crosses into fixture collections", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "filtermatch-candidate-provenance-"));
    try {
      await cp(join(repositoryRoot, "data"), join(temporaryRoot, "data"), { recursive: true });
      // Invented in-memory malformed import, never a private researched catalog.
      const { full } = await catalog();
      const device = { ...full.devices[0]!, id: "isolated-test-device", verificationStatus: "candidate", synthetic: false, notForProduction: false };
      const consumable = { ...full.consumables[0]!, synthetic: false, notForProduction: false };
      const evidence = full.sourceEvidence.map((item) => ({ ...item, verificationDecision: "candidate", synthetic: false, notForProduction: false }));
      const edge = { ...full.compatibilityEdges[0]!, deviceId: "airpure-ap100-pl", verificationStatus: "candidate", synthetic: false, notForProduction: false };
      const researched = { schemaVersion: 2, generatedAt: at.toISOString(), data: { devices: [device], consumables: [consumable], sourceEvidence: evidence, compatibilityEdges: [edge], searchAliases: [], offers: [], reviewDecisions: [] } };
      const directory = join(temporaryRoot, "data", "candidates", "catalogs");
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, "invalid-test-import.json"), JSON.stringify(researched), "utf8");

      await expect(loadRepositorySnapshot(temporaryRoot)).rejects.toThrow(/self-contained/u);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
