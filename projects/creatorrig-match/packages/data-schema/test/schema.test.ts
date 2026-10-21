import { describe, expect, it } from "vitest";
import {
  CompatibilityEdgeSchema,
  CreatorRigDataSetSchema,
  ProductSchema,
  SourceEvidenceSchema,
} from "../src/index.js";

const evidence = {
  synthetic: true,
  notForProduction: true,
  id: "evidence.manual.camera",
  sourceType: "official_manual",
  title: "Synthetic camera manual",
  url: "https://example.invalid/manual",
  accessedAt: "2026-07-17T10:00:00+00:00",
  proofScope: ["mechanical", "electrical"],
  supportedClaims: ["The mount fits", "The voltage is supported"],
  verifier: "fixture-reviewer",
  verificationStatus: "verified",
  verifiedAt: "2026-07-17T10:00:00+00:00",
} as const;

const product = (id: string, subcategory: "camera" | "lens") => ({
  synthetic: true,
  notForProduction: true,
  id,
  brand: "NovaCam",
  canonicalName: id,
  category: subcategory === "camera" ? "capture_device" : "optics",
  subcategory,
  model: id,
  identifiers: [],
  aliases: [],
  lifecycleStatus: "active",
  region: ["global"],
  sourceReferences: [evidence.id],
  interfaceIds: [],
  capabilityIds: [],
  requirementIds: [],
});

const publicEdge = {
  synthetic: true,
  notForProduction: true,
  id: "edge.camera.lens",
  sourceProductId: "product.camera",
  targetProductId: "product.lens",
  directed: true,
  relationType: "directly_compatible",
  scope: ["lens_mount"],
  compatibilityDimensions: [
    {
      dimension: "mechanical",
      status: "compatible",
      summary: "Mounts match.",
      checkedRequirementIds: [],
      evidenceIds: [evidence.id],
    },
  ],
  requiredAdapterIds: [],
  limitations: [],
  conditions: [],
  evidenceIds: [evidence.id],
  verificationStatus: "verified",
  publicationStatus: "public",
  verifiedAt: "2026-07-17T10:00:00+00:00",
} as const;

describe("record invariants", () => {
  it("rejects an unmarked synthetic record", () => {
    expect(ProductSchema.safeParse({ ...product("product.camera", "camera"), notForProduction: false }).success).toBe(false);
  });

  it("rejects a category/subcategory mismatch", () => {
    expect(ProductSchema.safeParse({ ...product("product.camera", "camera"), category: "audio" }).success).toBe(false);
  });

  it("requires verifier metadata for verified evidence", () => {
    expect(SourceEvidenceSchema.safeParse({ ...evidence, verifier: undefined }).success).toBe(false);
  });

  it("never permits a candidate edge to be public or verified", () => {
    const result = CompatibilityEdgeSchema.safeParse({
      ...publicEdge,
      relationType: "candidate",
    });
    expect(result.success).toBe(false);
  });

  it("requires evidence on every asserted public dimension", () => {
    const result = CompatibilityEdgeSchema.safeParse({
      ...publicEdge,
      compatibilityDimensions: [{ ...publicEdge.compatibilityDimensions[0], evidenceIds: [] }],
    });
    expect(result.success).toBe(false);
  });
});

describe("dataset evidence policy", () => {
  const dataset = {
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-17T10:00:00+00:00",
    products: [product("product.camera", "camera"), product("product.lens", "lens")],
    interfaces: [],
    capabilities: [],
    requirements: [],
    compatibilityEdges: [publicEdge],
    adapters: [],
    recordingModes: [],
    offers: [],
    rigs: [],
    evidence: [evidence],
    useCaseTemplates: [],
  } as const;

  it("accepts a public edge when verified evidence covers its scope", () => {
    expect(CreatorRigDataSetSchema.safeParse(dataset).success).toBe(true);
  });

  it("rejects public claims referencing candidate evidence", () => {
    const result = CreatorRigDataSetSchema.safeParse({
      ...dataset,
      evidence: [{ ...evidence, verificationStatus: "candidate", verifier: undefined, verifiedAt: undefined }],
    });
    expect(result.success).toBe(false);
  });

  it("requires official evidence for a positive electrical claim", () => {
    const independent = { ...evidence, sourceType: "independent_test" } as const;
    const result = CreatorRigDataSetSchema.safeParse({
      ...dataset,
      evidence: [independent],
      compatibilityEdges: [{
        ...publicEdge,
        compatibilityDimensions: [{
          dimension: "electrical",
          status: "compatible",
          summary: "Voltage is compatible.",
          checkedRequirementIds: [],
          evidenceIds: [evidence.id],
        }],
      }],
    });
    expect(result.success).toBe(false);
  });
});
