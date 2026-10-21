import type {
  CompatibilityDimension,
  DimensionStatus,
  InterfaceDirection,
  InterfaceType,
  ProductCategory,
  ProductSubcategory,
  PublicationStatus,
  RelationType,
  RequirementOperator,
  SourceType,
  VerificationStatus,
} from "./constants.js";

export type EntityId = string;
export type IsoDateTime = string;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface DataProvenanceFlags {
  readonly synthetic: boolean;
  readonly notForProduction: boolean;
}

export interface DimensionsMm {
  readonly width?: number;
  readonly height?: number;
  readonly depth?: number;
  readonly diameter?: number;
  readonly length?: number;
}

export interface ProductIdentifier {
  readonly scheme: "manufacturer_sku" | "ean" | "upc" | "mpn" | "asin" | "custom";
  readonly value: string;
  readonly region?: string;
}

export interface Product extends DataProvenanceFlags {
  readonly id: EntityId;
  readonly brand: string;
  readonly canonicalName: string;
  readonly category: ProductCategory;
  readonly subcategory: ProductSubcategory;
  readonly model: string;
  readonly variant?: string;
  readonly identifiers: readonly ProductIdentifier[];
  readonly aliases: readonly string[];
  readonly dimensions?: DimensionsMm;
  readonly weightGrams?: number;
  readonly lifecycleStatus: "announced" | "active" | "discontinued" | "legacy";
  readonly region: readonly string[];
  readonly officialUrl?: string;
  readonly sourceReferences: readonly EntityId[];
  readonly interfaceIds: readonly EntityId[];
  readonly capabilityIds: readonly EntityId[];
  readonly requirementIds: readonly EntityId[];
}

export interface ElectricalProperties {
  readonly voltageV?: number;
  readonly voltageRangeV?: { readonly min: number; readonly max: number };
  readonly currentA?: number;
  readonly maxCurrentA?: number;
  readonly powerW?: number;
  readonly maxPowerW?: number;
  readonly polarity?: "center_positive" | "center_negative" | "not_applicable";
  readonly batteryType?: string;
  readonly usbPowerDeliveryProfiles?: readonly string[];
  readonly plugInPower?: boolean;
  readonly phantomPowerV?: 12 | 24 | 48;
  readonly selfPowered?: boolean;
}

export interface SignalProperties {
  readonly signalKind?:
    | "analog_audio"
    | "digital_audio"
    | "usb_audio"
    | "hdmi"
    | "sdi"
    | "uvc"
    | "data"
    | "camera_control"
    | "timecode";
  readonly protocol?: string;
  readonly protocolVersion?: string;
  readonly channelCount?: number;
  readonly maxResolution?: string;
  readonly maxFrameRate?: number;
  readonly bitDepth?: number;
}

export interface Interface extends DataProvenanceFlags {
  readonly id: EntityId;
  readonly productId: EntityId;
  readonly type: InterfaceType;
  readonly subtype: string;
  readonly direction: InterfaceDirection;
  readonly version?: string;
  readonly physicalConnector?: string;
  readonly electricalProperties?: ElectricalProperties;
  readonly signalProperties?: SignalProperties;
  readonly capabilities: readonly EntityId[];
  readonly sourceReferences: readonly EntityId[];
}

export interface DeclarativeCondition {
  /** Dot-delimited path from a fixed allowlist in the evaluator; never executable code. */
  readonly factPath: string;
  readonly operator: RequirementOperator;
  readonly value?: JsonValue;
}

export interface Capability extends DataProvenanceFlags {
  readonly id: EntityId;
  readonly productId: EntityId;
  readonly capabilityType: string;
  readonly value: JsonValue;
  readonly unit?: string;
  readonly conditions: readonly DeclarativeCondition[];
  readonly sourceReferences: readonly EntityId[];
}

export interface Requirement extends DataProvenanceFlags {
  readonly id: EntityId;
  readonly productId?: EntityId;
  readonly requirementType: string;
  readonly operator: RequirementOperator;
  readonly requiredValue?: JsonValue;
  readonly unit?: string;
  readonly conditions: readonly DeclarativeCondition[];
  readonly severity: "info" | "warning" | "error" | "safety_critical";
  readonly sourceReferences: readonly EntityId[];
}

export interface CompatibilityDimensionResult {
  readonly dimension: CompatibilityDimension;
  readonly status: DimensionStatus;
  readonly summary: string;
  readonly checkedRequirementIds: readonly EntityId[];
  readonly evidenceIds: readonly EntityId[];
}

export interface CompatibilityEdge extends DataProvenanceFlags {
  readonly id: EntityId;
  readonly sourceProductId: EntityId;
  readonly targetProductId: EntityId;
  readonly directed: true;
  readonly relationType: RelationType;
  readonly scope: readonly string[];
  readonly compatibilityDimensions: readonly CompatibilityDimensionResult[];
  readonly requiredAdapterIds: readonly EntityId[];
  readonly limitations: readonly string[];
  readonly conditions: readonly DeclarativeCondition[];
  readonly evidenceIds: readonly EntityId[];
  readonly verificationStatus: VerificationStatus;
  readonly publicationStatus: PublicationStatus;
  readonly verifiedAt?: IsoDateTime;
}

export interface ConversionCapability {
  readonly inputInterfaceId: EntityId;
  readonly outputInterfaceId: EntityId;
  readonly convertsPhysicalConnector: boolean;
  readonly convertsElectricalProperties: boolean;
  readonly convertsSignalProtocol: boolean;
  readonly description: string;
  readonly evidenceIds: readonly EntityId[];
}

/** Adapter details supplement the ordinary Product record referenced by productId. */
export interface Adapter extends DataProvenanceFlags {
  readonly id: EntityId;
  readonly productId: EntityId;
  readonly inputInterfaces: readonly EntityId[];
  readonly outputInterfaces: readonly EntityId[];
  readonly conversionCapabilities: readonly ConversionCapability[];
  readonly powerRequirements: readonly EntityId[];
  readonly signalLimitations: readonly string[];
  readonly directionality: "unidirectional" | "bidirectional" | "passive";
  readonly sourceReferences: readonly EntityId[];
}

export interface MediaRequirements {
  readonly formats: readonly ("sd" | "microsd" | "cfexpress_a" | "cfexpress_b" | "cfast" | "ssd")[];
  readonly minimumSustainedWriteMbps?: number;
  readonly minimumSpeedClasses: readonly string[];
  readonly maximumCapacityGb?: number;
  readonly fileSystems: readonly string[];
  readonly safetyMarginPercent: number;
}

export interface RecordingMode extends DataProvenanceFlags {
  readonly id: EntityId;
  readonly deviceId: EntityId;
  readonly label: string;
  readonly resolution: { readonly width: number; readonly height: number };
  readonly frameRate: number;
  readonly codec: string;
  readonly bitrateMbps?: number;
  readonly bitDepth?: number;
  readonly chroma?: string;
  readonly mediaRequirements: MediaRequirements;
  readonly estimatedStorageRateBytesPerSecond?: number;
  readonly firmwareConditions: readonly DeclarativeCondition[];
  readonly evidenceIds: readonly EntityId[];
  readonly verificationStatus: VerificationStatus;
  readonly publicationStatus: PublicationStatus;
}

export interface Offer extends DataProvenanceFlags {
  readonly id: EntityId;
  readonly productId: EntityId;
  readonly merchant: string;
  readonly priceMinor: number;
  readonly currency: string;
  readonly affiliateUrl: string;
  readonly availability: "in_stock" | "out_of_stock" | "preorder" | "unknown";
  readonly updatedAt: IsoDateTime;
  readonly sponsored: boolean;
}

export interface RigConstraints {
  readonly budgetMinor?: number;
  readonly currency?: string;
  readonly maximumWeightGrams?: number;
  readonly minimumRecordingMinutes?: number;
  readonly requiredCapabilities: readonly string[];
  readonly notes: readonly string[];
}

export interface RigMetrics {
  readonly totalWeightGrams?: number;
  readonly totalPriceMinor?: number;
  readonly priceCurrency?: string;
  readonly estimatedRecordingMinutes?: number;
  readonly estimatedRuntimeMinutes?: number;
  readonly missingMetricInputs: readonly string[];
  readonly calculatedAt: IsoDateTime;
}

export interface RigValidationResult {
  readonly severity: "info" | "warning" | "error" | "critical";
  readonly code: string;
  readonly message: string;
  readonly productIds: readonly EntityId[];
  readonly edgeIds: readonly EntityId[];
  readonly requiredProductIds: readonly EntityId[];
  readonly evidenceIds: readonly EntityId[];
}

export interface Rig extends DataProvenanceFlags {
  readonly id: EntityId;
  readonly useCase: string;
  readonly selectedProducts: readonly EntityId[];
  readonly ownedProducts: readonly EntityId[];
  readonly constraints: RigConstraints;
  readonly calculatedMetrics?: RigMetrics;
  readonly validationResults: readonly RigValidationResult[];
  readonly selectedRecordingModeId?: EntityId;
  readonly createdLocallyAt: IsoDateTime;
}

export interface SourceEvidence extends DataProvenanceFlags {
  readonly id: EntityId;
  readonly sourceType: SourceType;
  readonly title: string;
  readonly url: string;
  readonly accessedAt: IsoDateTime;
  readonly publishedAt?: IsoDateTime;
  readonly proofScope: readonly CompatibilityDimension[];
  readonly supportedClaims: readonly string[];
  readonly notes?: string;
  readonly verifier?: string;
  readonly verificationStatus: VerificationStatus;
  readonly verifiedAt?: IsoDateTime;
  readonly archivedUrl?: string;
}

export interface UseCaseTemplate extends DataProvenanceFlags {
  readonly id: EntityId;
  readonly name: string;
  readonly description: string;
  readonly useCase:
    | "mobile_short_form"
    | "vlog"
    | "single_person_interview"
    | "two_person_interview"
    | "podcast"
    | "youtube_studio"
    | "live_stream"
    | "event_recording"
    | "travel_rig"
    | "product_video";
  readonly requiredSubcategories: readonly ProductSubcategory[];
  readonly optionalSubcategories: readonly ProductSubcategory[];
  readonly defaultConstraints: RigConstraints;
  readonly publicationStatus: PublicationStatus;
}

export interface CreatorRigDataSet {
  readonly schemaVersion: string;
  readonly generatedAt: IsoDateTime;
  readonly products: readonly Product[];
  readonly interfaces: readonly Interface[];
  readonly capabilities: readonly Capability[];
  readonly requirements: readonly Requirement[];
  readonly compatibilityEdges: readonly CompatibilityEdge[];
  readonly adapters: readonly Adapter[];
  readonly recordingModes: readonly RecordingMode[];
  readonly offers: readonly Offer[];
  readonly rigs: readonly Rig[];
  readonly evidence: readonly SourceEvidence[];
  readonly useCaseTemplates: readonly UseCaseTemplate[];
}
