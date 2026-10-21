export const VERIFICATION_STATUSES = [
  "verified_official",
  "verified_multi_source",
  "verified_supplier",
  "candidate",
  "conflicting",
  "deprecated",
  "rejected",
  "unknown",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type ReviewDecisionStatus = Exclude<VerificationStatus, "candidate">;

export const PUBLIC_COMPATIBILITY_STATUSES = [
  "verified_official",
  "verified_multi_source",
  "verified_supplier",
] as const satisfies readonly VerificationStatus[];

export type PublicCompatibilityStatus =
  (typeof PUBLIC_COMPATIBILITY_STATUSES)[number];

export type EntityId = string;
export type IsoDateTime = string;

export interface FixtureMarker {
  synthetic?: boolean;
  notForProduction?: boolean;
}

export interface Device extends FixtureMarker {
  id: EntityId;
  brand: string;
  canonicalModel: string;
  regionalVariant?: string;
  series?: string;
  category: string;
  aliases: string[];
  identifiers: Record<string, string>;
  lifecycleStatus: "active" | "discontinued" | "unknown";
  sourceReferences: EntityId[];
  verificationStatus: VerificationStatus;
  lastVerifiedAt?: IsoDateTime;
}

export interface Consumable extends FixtureMarker {
  id: EntityId;
  brand: string;
  canonicalName: string;
  sku: string;
  ean?: string;
  category: string;
  originalOrReplacement: "original" | "replacement";
  includedElements: Array<{ name: string; quantity: number }>;
  dimensions?: {
    widthMm?: number;
    heightMm?: number;
    depthMm?: number;
    diameterMm?: number;
  };
  attributes: Record<string, string | number | boolean>;
  lifecycleStatus: "active" | "discontinued" | "unknown";
  sourceReferences: EntityId[];
}

export interface CompatibilityEdge extends FixtureMarker {
  id: EntityId;
  deviceId: EntityId;
  consumableId: EntityId;
  relationType: "required" | "optional" | "alternative";
  verificationStatus: VerificationStatus;
  confidence: number;
  evidenceIds: EntityId[];
  notes?: string;
  validFrom?: IsoDateTime;
  validTo?: IsoDateTime;
  lastVerifiedAt?: IsoDateTime;
}

export interface SourceEvidence extends FixtureMarker {
  id: EntityId;
  sourceType:
    | "official_manual"
    | "official_compatibility_list"
    | "official_product_page"
    | "replacement_manufacturer"
    | "trusted_distributor"
    | "independent_supporting";
  title: string;
  url?: string;
  documentId?: string;
  manufacturer?: string;
  documentVersion?: string;
  pageReference?: string;
  accessedAt: IsoDateTime;
  evidenceSummary: string;
  contentHash?: string;
  reviewer: string;
  verifiedAt: IsoDateTime;
  verificationDecision: VerificationStatus;
}

export interface Offer extends FixtureMarker {
  id: EntityId;
  consumableId: EntityId;
  merchant: string;
  merchantProductId?: string;
  sku?: string;
  ean?: string;
  priceMinor?: number;
  currency: string;
  shippingMinor?: number;
  availability: "in_stock" | "out_of_stock" | "preorder" | "unknown";
  destinationUrl: string;
  affiliateUrl?: string;
  sponsored: boolean;
  fetchedAt: IsoDateTime;
  expiresAt?: IsoDateTime;
  status: "active" | "inactive" | "expired";
}

export interface SearchAlias extends FixtureMarker {
  id: EntityId;
  entityType: "device" | "consumable";
  entityId: EntityId;
  rawAlias: string;
  normalizedAlias: string;
  aliasType:
    | "canonical"
    | "separator_variant"
    | "regional_code"
    | "series_name"
    | "product_code"
    | "common_typo";
  approved: boolean;
  source: string;
}

export interface ReviewDecision extends FixtureMarker {
  id: EntityId;
  edgeId: EntityId;
  previousStatus: VerificationStatus;
  decision: ReviewDecisionStatus;
  evidenceIds: EntityId[];
  reviewer: string;
  decisionAuthority: "authorized_human_reviewer";
  decidedAt: IsoDateTime;
  rationale: string;
}

export interface CorrectionReport {
  entityType?: "device" | "consumable" | "compatibility";
  entityId?: EntityId;
  query?: string;
  message: string;
  contactConsent: boolean;
  submittedAt?: IsoDateTime;
}

export interface DataSnapshot {
  devices: Device[];
  consumables: Consumable[];
  compatibilityEdges: CompatibilityEdge[];
  sourceEvidence: SourceEvidence[];
  searchAliases: SearchAlias[];
  offers: Offer[];
  reviewDecisions: ReviewDecision[];
}
