import {
  COMPATIBILITY_DIMENSIONS,
  DIMENSION_STATUSES,
  INTERFACE_DIRECTIONS,
  INTERFACE_TYPES,
  PRODUCT_CATEGORIES,
  PRODUCT_SUBCATEGORIES,
  PUBLICATION_STATUSES,
  RELATION_TYPES,
  REQUIREMENT_OPERATORS,
  SOURCE_TYPES,
  SUBCATEGORY_CATEGORY,
  VERIFICATION_STATUSES,
} from "@creatorrig/domain";
import { z } from "zod";

const id = z.string().trim().min(2).max(160).regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
const nonEmptyText = z.string().trim().min(1).max(2_000);
const isoDateTime = z.string().datetime({ offset: true });
const nonNegativeFinite = z.number().finite().nonnegative();
const positiveFinite = z.number().finite().positive();
const webUrl = z.string().url().refine((value) => /^https?:\/\//i.test(value), "Only HTTP(S) URLs are allowed");
const uniqueStrings = <T extends z.ZodTypeAny>(item: T, minimum = 0) =>
  z.array(item).min(minimum).superRefine((values, ctx) => {
    if (new Set(values as unknown[]).size !== values.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Values must be unique" });
    }
  });

export const JsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

const provenanceShape = {
  synthetic: z.boolean(),
  notForProduction: z.boolean(),
} as const;

function requireSyntheticSafety(
  value: { synthetic: boolean; notForProduction: boolean },
  ctx: z.RefinementCtx,
): void {
  if (value.synthetic && !value.notForProduction) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["notForProduction"],
      message: "Synthetic records must be marked notForProduction",
    });
  }
}

export const ProductIdentifierSchema = z.object({
  scheme: z.enum(["manufacturer_sku", "ean", "upc", "mpn", "asin", "custom"]),
  value: nonEmptyText.max(256),
  region: nonEmptyText.max(32).optional(),
}).strict();

export const DimensionsMmSchema = z.object({
  width: positiveFinite.optional(),
  height: positiveFinite.optional(),
  depth: positiveFinite.optional(),
  diameter: positiveFinite.optional(),
  length: positiveFinite.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one dimension is required");

export const ProductSchema = z.object({
  ...provenanceShape,
  id,
  brand: nonEmptyText.max(160),
  canonicalName: nonEmptyText.max(240),
  category: z.enum(PRODUCT_CATEGORIES),
  subcategory: z.enum(PRODUCT_SUBCATEGORIES),
  model: nonEmptyText.max(160),
  variant: nonEmptyText.max(160).optional(),
  identifiers: uniqueStrings(ProductIdentifierSchema),
  aliases: uniqueStrings(nonEmptyText.max(240)),
  dimensions: DimensionsMmSchema.optional(),
  weightGrams: positiveFinite.optional(),
  lifecycleStatus: z.enum(["announced", "active", "discontinued", "legacy"]),
  region: uniqueStrings(nonEmptyText.max(32), 1),
  officialUrl: webUrl.optional(),
  sourceReferences: uniqueStrings(id),
  interfaceIds: uniqueStrings(id),
  capabilityIds: uniqueStrings(id),
  requirementIds: uniqueStrings(id),
}).strict().superRefine((value, ctx) => {
  requireSyntheticSafety(value, ctx);
  if (SUBCATEGORY_CATEGORY[value.subcategory] !== value.category) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["category"],
      message: `Subcategory ${value.subcategory} belongs to ${SUBCATEGORY_CATEGORY[value.subcategory]}`,
    });
  }
});

const NumberRangeSchema = z.object({ min: nonNegativeFinite, max: positiveFinite }).strict()
  .refine((value) => value.min <= value.max, "Range minimum cannot exceed maximum");

export const ElectricalPropertiesSchema = z.object({
  voltageV: positiveFinite.optional(),
  voltageRangeV: NumberRangeSchema.optional(),
  currentA: nonNegativeFinite.optional(),
  maxCurrentA: positiveFinite.optional(),
  powerW: nonNegativeFinite.optional(),
  maxPowerW: positiveFinite.optional(),
  polarity: z.enum(["center_positive", "center_negative", "not_applicable"]).optional(),
  batteryType: nonEmptyText.max(120).optional(),
  usbPowerDeliveryProfiles: uniqueStrings(nonEmptyText.max(80)).optional(),
  plugInPower: z.boolean().optional(),
  phantomPowerV: z.union([z.literal(12), z.literal(24), z.literal(48)]).optional(),
  selfPowered: z.boolean().optional(),
}).strict();

export const SignalPropertiesSchema = z.object({
  signalKind: z.enum([
    "analog_audio",
    "digital_audio",
    "usb_audio",
    "hdmi",
    "sdi",
    "uvc",
    "data",
    "camera_control",
    "timecode",
  ]).optional(),
  protocol: nonEmptyText.max(120).optional(),
  protocolVersion: nonEmptyText.max(80).optional(),
  channelCount: z.number().int().positive().optional(),
  maxResolution: nonEmptyText.max(80).optional(),
  maxFrameRate: positiveFinite.optional(),
  bitDepth: z.number().int().positive().max(64).optional(),
}).strict();

export const InterfaceSchema = z.object({
  ...provenanceShape,
  id,
  productId: id,
  type: z.enum(INTERFACE_TYPES),
  subtype: nonEmptyText.max(120),
  direction: z.enum(INTERFACE_DIRECTIONS),
  version: nonEmptyText.max(80).optional(),
  physicalConnector: nonEmptyText.max(120).optional(),
  electricalProperties: ElectricalPropertiesSchema.optional(),
  signalProperties: SignalPropertiesSchema.optional(),
  capabilities: uniqueStrings(id),
  sourceReferences: uniqueStrings(id),
}).strict().superRefine((value, ctx) => requireSyntheticSafety(value, ctx));

export const DeclarativeConditionSchema = z.object({
  factPath: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.]*$/).max(200),
  operator: z.enum(REQUIREMENT_OPERATORS),
  value: JsonValueSchema.optional(),
}).strict().superRefine((value, ctx) => {
  const needsValue = value.operator !== "exists";
  if (needsValue && value.value === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Operator requires a value" });
  }
});

export const CapabilitySchema = z.object({
  ...provenanceShape,
  id,
  productId: id,
  capabilityType: nonEmptyText.max(160),
  value: JsonValueSchema,
  unit: nonEmptyText.max(40).optional(),
  conditions: z.array(DeclarativeConditionSchema),
  sourceReferences: uniqueStrings(id),
}).strict().superRefine((value, ctx) => requireSyntheticSafety(value, ctx));

export const RequirementSchema = z.object({
  ...provenanceShape,
  id,
  productId: id.optional(),
  requirementType: nonEmptyText.max(160),
  operator: z.enum(REQUIREMENT_OPERATORS),
  requiredValue: JsonValueSchema.optional(),
  unit: nonEmptyText.max(40).optional(),
  conditions: z.array(DeclarativeConditionSchema),
  severity: z.enum(["info", "warning", "error", "safety_critical"]),
  sourceReferences: uniqueStrings(id),
}).strict().superRefine((value, ctx) => {
  requireSyntheticSafety(value, ctx);
  if (value.operator !== "exists" && value.requiredValue === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["requiredValue"], message: "Operator requires a value" });
  }
});

export const CompatibilityDimensionResultSchema = z.object({
  dimension: z.enum(COMPATIBILITY_DIMENSIONS),
  status: z.enum(DIMENSION_STATUSES),
  summary: nonEmptyText,
  checkedRequirementIds: uniqueStrings(id),
  evidenceIds: uniqueStrings(id),
}).strict();

export const CompatibilityEdgeSchema = z.object({
  ...provenanceShape,
  id,
  sourceProductId: id,
  targetProductId: id,
  directed: z.literal(true),
  relationType: z.enum(RELATION_TYPES),
  scope: uniqueStrings(nonEmptyText.max(160), 1),
  compatibilityDimensions: z.array(CompatibilityDimensionResultSchema).min(1),
  requiredAdapterIds: uniqueStrings(id),
  limitations: uniqueStrings(nonEmptyText),
  conditions: z.array(DeclarativeConditionSchema),
  evidenceIds: uniqueStrings(id),
  verificationStatus: z.enum(VERIFICATION_STATUSES),
  publicationStatus: z.enum(PUBLICATION_STATUSES),
  verifiedAt: isoDateTime.optional(),
}).strict().superRefine((value, ctx) => {
  requireSyntheticSafety(value, ctx);
  if (value.sourceProductId === value.targetProductId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["targetProductId"], message: "Self-edges are not allowed" });
  }
  const dimensions = value.compatibilityDimensions.map((result) => result.dimension);
  if (new Set(dimensions).size !== dimensions.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["compatibilityDimensions"], message: "Dimensions must be unique" });
  }
  if (value.relationType === "candidate" && value.verificationStatus === "verified") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["verificationStatus"], message: "Candidate relations cannot be verified" });
  }
  if (["candidate", "unknown", "deprecated"].includes(value.relationType) && value.publicationStatus === "public") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["publicationStatus"], message: "Candidate, unknown and deprecated relations cannot be public" });
  }
  if (value.relationType === "compatible_with_adapter" && value.requiredAdapterIds.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["requiredAdapterIds"], message: "Adapter relation must name an adapter" });
  }
  if (value.verificationStatus === "verified" && (!value.verifiedAt || value.evidenceIds.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["verificationStatus"], message: "Verified edge requires evidence and verifiedAt" });
  }
  if (value.publicationStatus === "public") {
    if (value.verificationStatus !== "verified" || !value.verifiedAt || value.evidenceIds.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["publicationStatus"], message: "Public edge must be verified and evidenced" });
    }
    value.compatibilityDimensions.forEach((result, index) => {
      if (result.status !== "not_applicable" && result.evidenceIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["compatibilityDimensions", index, "evidenceIds"],
          message: "Each asserted public dimension requires evidence",
        });
      }
    });
  }
});

export const ConversionCapabilitySchema = z.object({
  inputInterfaceId: id,
  outputInterfaceId: id,
  convertsPhysicalConnector: z.boolean(),
  convertsElectricalProperties: z.boolean(),
  convertsSignalProtocol: z.boolean(),
  description: nonEmptyText,
  evidenceIds: uniqueStrings(id, 1),
}).strict();

export const AdapterSchema = z.object({
  ...provenanceShape,
  id,
  productId: id,
  inputInterfaces: uniqueStrings(id, 1),
  outputInterfaces: uniqueStrings(id, 1),
  conversionCapabilities: z.array(ConversionCapabilitySchema).min(1),
  powerRequirements: uniqueStrings(id),
  signalLimitations: uniqueStrings(nonEmptyText),
  directionality: z.enum(["unidirectional", "bidirectional", "passive"]),
  sourceReferences: uniqueStrings(id, 1),
}).strict().superRefine((value, ctx) => requireSyntheticSafety(value, ctx));

export const MediaRequirementsSchema = z.object({
  formats: uniqueStrings(z.enum(["sd", "microsd", "cfexpress_a", "cfexpress_b", "cfast", "ssd"]), 1),
  minimumSustainedWriteMbps: positiveFinite.optional(),
  minimumSpeedClasses: uniqueStrings(nonEmptyText.max(40)),
  maximumCapacityGb: positiveFinite.optional(),
  fileSystems: uniqueStrings(nonEmptyText.max(40)),
  safetyMarginPercent: nonNegativeFinite.max(500),
}).strict();

export const RecordingModeSchema = z.object({
  ...provenanceShape,
  id,
  deviceId: id,
  label: nonEmptyText.max(240),
  resolution: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
  frameRate: positiveFinite,
  codec: nonEmptyText.max(120),
  bitrateMbps: positiveFinite.optional(),
  bitDepth: z.number().int().positive().max(64).optional(),
  chroma: nonEmptyText.max(40).optional(),
  mediaRequirements: MediaRequirementsSchema,
  estimatedStorageRateBytesPerSecond: positiveFinite.optional(),
  firmwareConditions: z.array(DeclarativeConditionSchema),
  evidenceIds: uniqueStrings(id),
  verificationStatus: z.enum(VERIFICATION_STATUSES),
  publicationStatus: z.enum(PUBLICATION_STATUSES),
}).strict().superRefine((value, ctx) => {
  requireSyntheticSafety(value, ctx);
  if (value.bitrateMbps === undefined && value.estimatedStorageRateBytesPerSecond === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Recording mode needs bitrate or an estimated storage rate" });
  }
  if (value.publicationStatus === "public" && (value.verificationStatus !== "verified" || value.evidenceIds.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["publicationStatus"], message: "Public recording mode must be verified and evidenced" });
  }
});

export const OfferSchema = z.object({
  ...provenanceShape,
  id,
  productId: id,
  merchant: nonEmptyText.max(160),
  priceMinor: z.number().int().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  affiliateUrl: webUrl,
  availability: z.enum(["in_stock", "out_of_stock", "preorder", "unknown"]),
  updatedAt: isoDateTime,
  sponsored: z.boolean(),
}).strict().superRefine((value, ctx) => requireSyntheticSafety(value, ctx));

export const RigConstraintsSchema = z.object({
  budgetMinor: z.number().int().nonnegative().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  maximumWeightGrams: positiveFinite.optional(),
  minimumRecordingMinutes: positiveFinite.optional(),
  requiredCapabilities: uniqueStrings(nonEmptyText.max(160)),
  notes: uniqueStrings(nonEmptyText),
}).strict().refine((value) => value.budgetMinor === undefined || value.currency !== undefined, {
  path: ["currency"], message: "Currency is required with a budget",
});

export const RigMetricsSchema = z.object({
  totalWeightGrams: nonNegativeFinite.optional(),
  totalPriceMinor: z.number().int().nonnegative().optional(),
  priceCurrency: z.string().regex(/^[A-Z]{3}$/).optional(),
  estimatedRecordingMinutes: nonNegativeFinite.optional(),
  estimatedRuntimeMinutes: nonNegativeFinite.optional(),
  missingMetricInputs: uniqueStrings(nonEmptyText),
  calculatedAt: isoDateTime,
}).strict();

export const RigValidationResultSchema = z.object({
  severity: z.enum(["info", "warning", "error", "critical"]),
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  message: nonEmptyText,
  productIds: uniqueStrings(id),
  edgeIds: uniqueStrings(id),
  requiredProductIds: uniqueStrings(id),
  evidenceIds: uniqueStrings(id),
}).strict();

export const RigSchema = z.object({
  ...provenanceShape,
  id,
  useCase: nonEmptyText.max(160),
  selectedProducts: uniqueStrings(id, 1),
  ownedProducts: uniqueStrings(id),
  constraints: RigConstraintsSchema,
  calculatedMetrics: RigMetricsSchema.optional(),
  validationResults: z.array(RigValidationResultSchema),
  selectedRecordingModeId: id.optional(),
  createdLocallyAt: isoDateTime,
}).strict().superRefine((value, ctx) => {
  requireSyntheticSafety(value, ctx);
  value.ownedProducts.forEach((productId, index) => {
    if (!value.selectedProducts.includes(productId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ownedProducts", index], message: "Owned product must be selected" });
    }
  });
});

export const SourceEvidenceSchema = z.object({
  ...provenanceShape,
  id,
  sourceType: z.enum(SOURCE_TYPES),
  title: nonEmptyText.max(500),
  url: webUrl,
  accessedAt: isoDateTime,
  publishedAt: isoDateTime.optional(),
  proofScope: uniqueStrings(z.enum(COMPATIBILITY_DIMENSIONS), 1),
  supportedClaims: uniqueStrings(nonEmptyText, 1),
  notes: nonEmptyText.optional(),
  verifier: nonEmptyText.max(160).optional(),
  verificationStatus: z.enum(VERIFICATION_STATUSES),
  verifiedAt: isoDateTime.optional(),
  archivedUrl: webUrl.optional(),
}).strict().superRefine((value, ctx) => {
  requireSyntheticSafety(value, ctx);
  if (value.verificationStatus === "verified" && (!value.verifier || !value.verifiedAt)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["verificationStatus"], message: "Verified evidence requires verifier and verifiedAt" });
  }
});

export const UseCaseTemplateSchema = z.object({
  ...provenanceShape,
  id,
  name: nonEmptyText.max(200),
  description: nonEmptyText,
  useCase: z.enum([
    "mobile_short_form",
    "vlog",
    "single_person_interview",
    "two_person_interview",
    "podcast",
    "youtube_studio",
    "live_stream",
    "event_recording",
    "travel_rig",
    "product_video",
  ]),
  requiredSubcategories: uniqueStrings(z.enum(PRODUCT_SUBCATEGORIES)),
  optionalSubcategories: uniqueStrings(z.enum(PRODUCT_SUBCATEGORIES)),
  defaultConstraints: RigConstraintsSchema,
  publicationStatus: z.enum(PUBLICATION_STATUSES),
}).strict().superRefine((value, ctx) => {
  requireSyntheticSafety(value, ctx);
  const overlap = value.requiredSubcategories.filter((item) => value.optionalSubcategories.includes(item));
  if (overlap.length > 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["optionalSubcategories"], message: "Required and optional categories cannot overlap" });
  }
});

function addReferenceIssue(ctx: z.RefinementCtx, path: (string | number)[], message: string): void {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

const CreatorRigDataSetBaseSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  generatedAt: isoDateTime,
  products: z.array(ProductSchema),
  interfaces: z.array(InterfaceSchema),
  capabilities: z.array(CapabilitySchema),
  requirements: z.array(RequirementSchema),
  compatibilityEdges: z.array(CompatibilityEdgeSchema),
  adapters: z.array(AdapterSchema),
  recordingModes: z.array(RecordingModeSchema),
  offers: z.array(OfferSchema),
  rigs: z.array(RigSchema),
  evidence: z.array(SourceEvidenceSchema),
  useCaseTemplates: z.array(UseCaseTemplateSchema),
}).strict();

export const CreatorRigDataSetSchema = CreatorRigDataSetBaseSchema.superRefine((data, ctx) => {
  const collections = [
    data.products,
    data.interfaces,
    data.capabilities,
    data.requirements,
    data.compatibilityEdges,
    data.adapters,
    data.recordingModes,
    data.offers,
    data.rigs,
    data.evidence,
    data.useCaseTemplates,
  ];
  const allIds = collections.flatMap((records) => records.map((record) => record.id));
  for (const duplicate of duplicateValues(allIds)) {
    addReferenceIssue(ctx, [], `Entity id must be globally unique: ${duplicate}`);
  }

  const productIds = new Set(data.products.map((product) => product.id));
  const interfaceIds = new Set(data.interfaces.map((item) => item.id));
  const capabilityIds = new Set(data.capabilities.map((item) => item.id));
  const requirementIds = new Set(data.requirements.map((item) => item.id));
  const edgeIds = new Set(data.compatibilityEdges.map((edge) => edge.id));
  const recordingModeIds = new Set(data.recordingModes.map((mode) => mode.id));
  const evidenceById = new Map(data.evidence.map((evidence) => [evidence.id, evidence]));
  const adapterProductIds = new Set(data.adapters.map((adapter) => adapter.productId));

  const checkEvidenceReferences = (references: readonly string[], path: (string | number)[]): void => {
    references.forEach((evidenceId, index) => {
      if (!evidenceById.has(evidenceId)) addReferenceIssue(ctx, [...path, index], "Unknown evidence");
    });
  };

  data.products.forEach((product, productIndex) => {
    checkEvidenceReferences(product.sourceReferences, ["products", productIndex, "sourceReferences"]);
    product.interfaceIds.forEach((interfaceId, index) => {
      if (!interfaceIds.has(interfaceId)) addReferenceIssue(ctx, ["products", productIndex, "interfaceIds", index], "Unknown interface");
    });
    product.capabilityIds.forEach((capabilityId, index) => {
      if (!capabilityIds.has(capabilityId)) addReferenceIssue(ctx, ["products", productIndex, "capabilityIds", index], "Unknown capability");
    });
    product.requirementIds.forEach((requirementId, index) => {
      if (!requirementIds.has(requirementId)) addReferenceIssue(ctx, ["products", productIndex, "requirementIds", index], "Unknown requirement");
    });
  });

  data.interfaces.forEach((item, itemIndex) => {
    if (!productIds.has(item.productId)) addReferenceIssue(ctx, ["interfaces", itemIndex, "productId"], "Unknown product");
    checkEvidenceReferences(item.sourceReferences, ["interfaces", itemIndex, "sourceReferences"]);
    item.capabilities.forEach((capabilityId, index) => {
      if (!capabilityIds.has(capabilityId)) addReferenceIssue(ctx, ["interfaces", itemIndex, "capabilities", index], "Unknown capability");
    });
  });

  data.capabilities.forEach((capability, capabilityIndex) => {
    if (!productIds.has(capability.productId)) addReferenceIssue(ctx, ["capabilities", capabilityIndex, "productId"], "Unknown product");
    checkEvidenceReferences(capability.sourceReferences, ["capabilities", capabilityIndex, "sourceReferences"]);
  });

  data.requirements.forEach((requirement, requirementIndex) => {
    if (requirement.productId && !productIds.has(requirement.productId)) {
      addReferenceIssue(ctx, ["requirements", requirementIndex, "productId"], "Unknown product");
    }
    checkEvidenceReferences(requirement.sourceReferences, ["requirements", requirementIndex, "sourceReferences"]);
  });

  data.compatibilityEdges.forEach((edge, edgeIndex) => {
    if (!productIds.has(edge.sourceProductId)) addReferenceIssue(ctx, ["compatibilityEdges", edgeIndex, "sourceProductId"], "Unknown product");
    if (!productIds.has(edge.targetProductId)) addReferenceIssue(ctx, ["compatibilityEdges", edgeIndex, "targetProductId"], "Unknown product");
    edge.requiredAdapterIds.forEach((adapterId, index) => {
      if (!adapterProductIds.has(adapterId)) addReferenceIssue(ctx, ["compatibilityEdges", edgeIndex, "requiredAdapterIds", index], "Product has no Adapter definition");
    });
    checkEvidenceReferences(edge.evidenceIds, ["compatibilityEdges", edgeIndex, "evidenceIds"]);
    edge.compatibilityDimensions.forEach((dimension, dimensionIndex) => {
      checkEvidenceReferences(dimension.evidenceIds, ["compatibilityEdges", edgeIndex, "compatibilityDimensions", dimensionIndex, "evidenceIds"]);
      dimension.evidenceIds.forEach((evidenceId, evidenceIndex) => {
        if (!edge.evidenceIds.includes(evidenceId)) {
          addReferenceIssue(
            ctx,
            ["compatibilityEdges", edgeIndex, "compatibilityDimensions", dimensionIndex, "evidenceIds", evidenceIndex],
            "Dimension evidence must also appear in the edge evidence list",
          );
        }
      });
      dimension.checkedRequirementIds.forEach((requirementId, requirementIndex) => {
        if (!requirementIds.has(requirementId)) {
          addReferenceIssue(ctx, ["compatibilityEdges", edgeIndex, "compatibilityDimensions", dimensionIndex, "checkedRequirementIds", requirementIndex], "Unknown requirement");
        }
      });
    });

    if (edge.publicationStatus === "public") {
      const assertedDimensions = edge.compatibilityDimensions
        .filter((result) => result.status !== "not_applicable")
        .map((result) => result.dimension);
      edge.evidenceIds.forEach((evidenceId, evidenceIndex) => {
        const evidence = evidenceById.get(evidenceId);
        if (!evidence || evidence.verificationStatus !== "verified") {
          addReferenceIssue(ctx, ["compatibilityEdges", edgeIndex, "evidenceIds", evidenceIndex], "Public edge requires verified evidence");
        }
      });
      for (const dimension of assertedDimensions) {
        const supportingEvidence = edge.evidenceIds
          .map((evidenceId) => evidenceById.get(evidenceId))
          .some((evidence) => evidence?.verificationStatus === "verified" && evidence.proofScope.includes(dimension));
        if (!supportingEvidence) {
          addReferenceIssue(ctx, ["compatibilityEdges", edgeIndex, "evidenceIds"], `No verified evidence covers ${dimension}`);
        }
      }
      const electricalResult = edge.compatibilityDimensions.find((result) => result.dimension === "electrical");
      if (electricalResult && ["compatible", "compatible_with_limitations"].includes(electricalResult.status)) {
        const officialElectricalEvidence = edge.evidenceIds
          .map((evidenceId) => evidenceById.get(evidenceId))
          .some((evidence) => evidence?.verificationStatus === "verified"
            && evidence.sourceType !== "independent_test"
            && evidence.proofScope.includes("electrical"));
        if (!officialElectricalEvidence) {
          addReferenceIssue(ctx, ["compatibilityEdges", edgeIndex, "evidenceIds"], "Positive electrical claims require verified official evidence");
        }
      }
    }
  });

  data.recordingModes.forEach((mode, index) => {
    if (!productIds.has(mode.deviceId)) addReferenceIssue(ctx, ["recordingModes", index, "deviceId"], "Unknown product");
    checkEvidenceReferences(mode.evidenceIds, ["recordingModes", index, "evidenceIds"]);
    if (mode.publicationStatus === "public") {
      mode.evidenceIds.forEach((evidenceId, evidenceIndex) => {
        if (evidenceById.get(evidenceId)?.verificationStatus !== "verified") {
          addReferenceIssue(ctx, ["recordingModes", index, "evidenceIds", evidenceIndex], "Public recording mode requires verified evidence");
        }
      });
    }
  });

  data.adapters.forEach((adapter, index) => {
    if (!productIds.has(adapter.productId)) addReferenceIssue(ctx, ["adapters", index, "productId"], "Unknown adapter product");
    checkEvidenceReferences(adapter.sourceReferences, ["adapters", index, "sourceReferences"]);
    adapter.inputInterfaces.forEach((interfaceId, interfaceIndex) => {
      if (!interfaceIds.has(interfaceId)) addReferenceIssue(ctx, ["adapters", index, "inputInterfaces", interfaceIndex], "Unknown interface");
    });
    adapter.outputInterfaces.forEach((interfaceId, interfaceIndex) => {
      if (!interfaceIds.has(interfaceId)) addReferenceIssue(ctx, ["adapters", index, "outputInterfaces", interfaceIndex], "Unknown interface");
    });
    adapter.powerRequirements.forEach((requirementId, requirementIndex) => {
      if (!requirementIds.has(requirementId)) addReferenceIssue(ctx, ["adapters", index, "powerRequirements", requirementIndex], "Unknown requirement");
    });
    adapter.conversionCapabilities.forEach((conversion, conversionIndex) => {
      if (!interfaceIds.has(conversion.inputInterfaceId)) addReferenceIssue(ctx, ["adapters", index, "conversionCapabilities", conversionIndex, "inputInterfaceId"], "Unknown interface");
      if (!interfaceIds.has(conversion.outputInterfaceId)) addReferenceIssue(ctx, ["adapters", index, "conversionCapabilities", conversionIndex, "outputInterfaceId"], "Unknown interface");
      checkEvidenceReferences(conversion.evidenceIds, ["adapters", index, "conversionCapabilities", conversionIndex, "evidenceIds"]);
    });
  });
  data.offers.forEach((offer, index) => {
    if (!productIds.has(offer.productId)) addReferenceIssue(ctx, ["offers", index, "productId"], "Unknown product");
  });
  data.rigs.forEach((rig, rigIndex) => {
    rig.selectedProducts.forEach((productId, productIndex) => {
      if (!productIds.has(productId)) addReferenceIssue(ctx, ["rigs", rigIndex, "selectedProducts", productIndex], "Unknown product");
    });
    if (rig.selectedRecordingModeId && !recordingModeIds.has(rig.selectedRecordingModeId)) {
      addReferenceIssue(ctx, ["rigs", rigIndex, "selectedRecordingModeId"], "Unknown recording mode");
    }
    rig.validationResults.forEach((result, resultIndex) => {
      result.productIds.forEach((productId, productIndex) => {
        if (!productIds.has(productId)) addReferenceIssue(ctx, ["rigs", rigIndex, "validationResults", resultIndex, "productIds", productIndex], "Unknown product");
      });
      result.requiredProductIds.forEach((productId, productIndex) => {
        if (!productIds.has(productId)) addReferenceIssue(ctx, ["rigs", rigIndex, "validationResults", resultIndex, "requiredProductIds", productIndex], "Unknown product");
      });
      result.edgeIds.forEach((edgeId, edgeIndex) => {
        if (!edgeIds.has(edgeId)) addReferenceIssue(ctx, ["rigs", rigIndex, "validationResults", resultIndex, "edgeIds", edgeIndex], "Unknown compatibility edge");
      });
      checkEvidenceReferences(result.evidenceIds, ["rigs", rigIndex, "validationResults", resultIndex, "evidenceIds"]);
    });
  });
});

export type ParsedCreatorRigDataSet = z.infer<typeof CreatorRigDataSetSchema>;

/** Validates untrusted imports; downstream code receives deeply parsed, data-only records. */
export function parseCreatorRigDataSet(input: unknown): ParsedCreatorRigDataSet {
  return CreatorRigDataSetSchema.parse(input);
}

export function safeParseCreatorRigDataSet(input: unknown) {
  return CreatorRigDataSetSchema.safeParse(input);
}
