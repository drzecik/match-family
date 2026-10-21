import { z } from "zod";
import {
  DATA_SCHEMA_VERSION,
  fixtureMarkerShape,
  hasConsistentFixtureMarker,
  idSchema,
  isoDateTimeSchema,
  publicVerificationStatusSchema,
  safeUrlSchema,
  verificationStatusSchema,
} from "./common.js";

const fixtureMessage = "synthetic and notForProduction must have the same value";

export const deviceSchema = z
  .object({
    id: idSchema,
    brand: z.string().trim().min(1).max(120),
    canonicalModel: z.string().trim().min(1).max(120),
    regionalVariant: z.string().trim().min(1).max(80).optional(),
    series: z.string().trim().min(1).max(120).optional(),
    category: idSchema,
    aliases: z.array(z.string().trim().min(1).max(160)).max(100),
    identifiers: z.record(z.string().max(80), z.string().trim().min(1).max(160)),
    lifecycleStatus: z.enum(["active", "discontinued", "unknown"]),
    sourceReferences: z.array(idSchema).max(100),
    verificationStatus: verificationStatusSchema,
    lastVerifiedAt: isoDateTimeSchema.optional(),
    ...fixtureMarkerShape,
  })
  .strict()
  .refine(hasConsistentFixtureMarker, fixtureMessage)
  .superRefine((value, context) => {
    if (
      publicVerificationStatusSchema.safeParse(value.verificationStatus).success &&
      value.sourceReferences.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceReferences"],
        message: "A verified device must reference evidence",
      });
    }
  });

export const consumableSchema = z
  .object({
    id: idSchema,
    brand: z.string().trim().min(1).max(120),
    canonicalName: z.string().trim().min(1).max(180),
    sku: z.string().trim().min(1).max(120),
    ean: z.string().regex(/^\d{8,14}$/).optional(),
    category: idSchema,
    originalOrReplacement: z.enum(["original", "replacement"]),
    includedElements: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(120),
          quantity: z.number().int().positive().max(100),
        }),
      )
      .min(1)
      .max(50),
    dimensions: z
      .object({
        widthMm: z.number().positive().max(10_000).optional(),
        heightMm: z.number().positive().max(10_000).optional(),
        depthMm: z.number().positive().max(10_000).optional(),
        diameterMm: z.number().positive().max(10_000).optional(),
      })
      .strict()
      .optional(),
    attributes: z.record(
      z.string().max(80),
      z.union([z.string().max(500), z.number().finite(), z.boolean()]),
    ),
    lifecycleStatus: z.enum(["active", "discontinued", "unknown"]),
    sourceReferences: z.array(idSchema).max(100),
    ...fixtureMarkerShape,
  })
  .strict()
  .refine(hasConsistentFixtureMarker, fixtureMessage);

export const compatibilityEdgeSchema = z
  .object({
    id: idSchema,
    deviceId: idSchema,
    consumableId: idSchema,
    relationType: z.enum(["required", "optional", "alternative"]),
    verificationStatus: verificationStatusSchema,
    confidence: z.number().min(0).max(1),
    evidenceIds: z.array(idSchema).max(100),
    notes: z.string().trim().max(2_000).optional(),
    validFrom: isoDateTimeSchema.optional(),
    validTo: isoDateTimeSchema.optional(),
    lastVerifiedAt: isoDateTimeSchema.optional(),
    ...fixtureMarkerShape,
  })
  .strict()
  .refine(hasConsistentFixtureMarker, fixtureMessage)
  .superRefine((value, context) => {
    const isVerified = publicVerificationStatusSchema.safeParse(value.verificationStatus).success;
    if (isVerified && value.evidenceIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceIds"],
        message: "A verified compatibility relation must reference evidence",
      });
    }
    if (isVerified && !value.lastVerifiedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastVerifiedAt"],
        message: "A verified compatibility relation needs a verification date",
      });
    }
    if (value.validFrom && value.validTo && value.validFrom >= value.validTo) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validTo"],
        message: "validTo must be later than validFrom",
      });
    }
  });

export const sourceEvidenceSchema = z
  .object({
    id: idSchema,
    sourceType: z.enum([
      "official_manual",
      "official_compatibility_list",
      "official_product_page",
      "replacement_manufacturer",
      "trusted_distributor",
      "independent_supporting",
    ]),
    title: z.string().trim().min(1).max(300),
    url: safeUrlSchema.optional(),
    documentId: z.string().trim().min(1).max(180).optional(),
    manufacturer: z.string().trim().min(1).max(120).optional(),
    documentVersion: z.string().trim().min(1).max(120).optional(),
    pageReference: z.string().trim().min(1).max(80).optional(),
    accessedAt: isoDateTimeSchema,
    evidenceSummary: z.string().trim().min(1).max(2_000),
    contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
    reviewer: z.string().trim().min(1).max(120),
    verifiedAt: isoDateTimeSchema,
    verificationDecision: verificationStatusSchema,
    ...fixtureMarkerShape,
  })
  .strict()
  .refine((value) => Boolean(value.url || value.documentId), {
    path: ["url"],
    message: "Evidence needs a URL or document identifier",
  })
  .refine(hasConsistentFixtureMarker, fixtureMessage);

export const offerSchema = z
  .object({
    id: idSchema,
    consumableId: idSchema,
    merchant: z.string().trim().min(1).max(160),
    merchantProductId: z.string().trim().min(1).max(160).optional(),
    sku: z.string().trim().min(1).max(120).optional(),
    ean: z.string().regex(/^\d{8,14}$/).optional(),
    priceMinor: z.number().int().nonnegative().max(1_000_000_000).optional(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    shippingMinor: z.number().int().nonnegative().max(1_000_000_000).optional(),
    availability: z.enum(["in_stock", "out_of_stock", "preorder", "unknown"]),
    destinationUrl: safeUrlSchema,
    affiliateUrl: safeUrlSchema.optional(),
    sponsored: z.boolean(),
    fetchedAt: isoDateTimeSchema,
    expiresAt: isoDateTimeSchema.optional(),
    status: z.enum(["active", "inactive", "expired"]),
    ...fixtureMarkerShape,
  })
  .strict()
  .refine(hasConsistentFixtureMarker, fixtureMessage);

export const searchAliasSchema = z
  .object({
    id: idSchema,
    entityType: z.enum(["device", "consumable"]),
    entityId: idSchema,
    rawAlias: z.string().trim().min(1).max(200),
    normalizedAlias: z.string().trim().min(1).max(200),
    aliasType: z.enum([
      "canonical",
      "separator_variant",
      "regional_code",
      "series_name",
      "product_code",
      "common_typo",
    ]),
    approved: z.boolean(),
    source: z.string().trim().min(1).max(240),
    ...fixtureMarkerShape,
  })
  .strict()
  .refine(hasConsistentFixtureMarker, fixtureMessage);

export const reviewDecisionSchema = z
  .object({
    id: idSchema,
    edgeId: idSchema,
    previousStatus: verificationStatusSchema,
    decision: verificationStatusSchema,
    evidenceIds: z.array(idSchema).max(100),
    reviewer: z.string().trim().min(1).max(120),
    decisionAuthority: z.literal("authorized_human_reviewer"),
    decidedAt: isoDateTimeSchema,
    rationale: z.string().trim().min(10).max(2_000),
    ...fixtureMarkerShape,
  })
  .strict()
  .refine(hasConsistentFixtureMarker, fixtureMessage)
  .superRefine((value, context) => {
    if (value.decision.startsWith("verified_") && value.evidenceIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceIds"],
        message: "A verified review decision must reference evidence",
      });
    }
    if (value.decision === "candidate") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decision"],
        message: "A human review decision cannot leave the edge as candidate",
      });
    }
  });

export const correctionReportSchema = z
  .object({
    entityType: z.enum(["device", "consumable", "compatibility"]).optional(),
    entityId: idSchema.optional(),
    query: z.string().trim().max(200).optional(),
    message: z.string().trim().min(5).max(4_000),
    contactConsent: z.boolean(),
    submittedAt: isoDateTimeSchema.optional(),
  })
  .strict();

export const dataSnapshotSchema = z
  .object({
    devices: z.array(deviceSchema).max(100_000),
    consumables: z.array(consumableSchema).max(100_000),
    compatibilityEdges: z.array(compatibilityEdgeSchema).max(500_000),
    sourceEvidence: z.array(sourceEvidenceSchema).max(500_000),
    searchAliases: z.array(searchAliasSchema).max(1_000_000),
    offers: z.array(offerSchema).max(1_000_000),
    reviewDecisions: z.array(reviewDecisionSchema).max(1_000_000),
  })
  .strict();

export const dataCollectionKindSchema = z.enum([
  "devices",
  "consumables",
  "compatibilityEdges",
  "sourceEvidence",
  "searchAliases",
  "offers",
  "reviewDecisions",
]);

export type DataCollectionKind = z.infer<typeof dataCollectionKindSchema>;

export const dataCollectionEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(DATA_SCHEMA_VERSION),
    kind: dataCollectionKindSchema,
    records: z.array(z.unknown()).max(1_000_000),
  })
  .strict();

export const dataSnapshotEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(DATA_SCHEMA_VERSION),
    generatedAt: isoDateTimeSchema,
    data: dataSnapshotSchema,
  })
  .strict();

export const collectionRecordSchemas = {
  devices: deviceSchema,
  consumables: consumableSchema,
  compatibilityEdges: compatibilityEdgeSchema,
  sourceEvidence: sourceEvidenceSchema,
  searchAliases: searchAliasSchema,
  offers: offerSchema,
  reviewDecisions: reviewDecisionSchema,
} as const satisfies Record<DataCollectionKind, z.ZodTypeAny>;

export type DeviceInput = z.input<typeof deviceSchema>;
export type ConsumableInput = z.input<typeof consumableSchema>;
export type CompatibilityEdgeInput = z.input<typeof compatibilityEdgeSchema>;
export type SourceEvidenceInput = z.input<typeof sourceEvidenceSchema>;
export type OfferInput = z.input<typeof offerSchema>;
export type SearchAliasInput = z.input<typeof searchAliasSchema>;
export type ReviewDecisionInput = z.input<typeof reviewDecisionSchema>;
