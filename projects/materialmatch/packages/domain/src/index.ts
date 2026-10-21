export type Millimeters = number;
export type SquareMillimeters = number;
export type BasisPoints = number;
export type MinorCurrencyUnits = number;

export type MeasurementUnit =
  | 'millimeter'
  | 'centimeter'
  | 'meter'
  | 'squareMillimeter'
  | 'squareMeter'
  | 'piece'
  | 'package'
  | 'roll';

export interface Money {
  readonly minorUnits: MinorCurrencyUnits;
  readonly currency: string;
}

export type SaleUnit = 'package' | 'piece' | 'roll';

export interface PackageSpecification {
  readonly saleUnit: SaleUnit;
  readonly coverageAreaSquareMillimeters?: SquareMillimeters;
  readonly itemAreaSquareMillimeters?: SquareMillimeters;
  readonly itemLengthMillimeters?: Millimeters;
  readonly piecesPerPackage: number;
  readonly minimumPackages: number;
  readonly orderMultiple: number;
  readonly openedPackagesSold: boolean;
}

export interface CompatibilityAttributes {
  readonly materialType: string;
  readonly productFamily?: string;
  readonly thicknessMillimeters?: Millimeters;
  readonly grade?: string;
  readonly installationMethod?: string;
  readonly compatibilityTags: readonly string[];
  readonly exclusionTags: readonly string[];
}

export interface ProductVariant extends CompatibilityAttributes {
  readonly id: string;
  readonly sku: string;
  readonly nameKey: string;
  readonly package: PackageSpecification;
  readonly price?: Money;
  readonly available: boolean;
}

export interface MaterialProduct {
  readonly id: string;
  readonly nameKey: string;
  readonly attributes: CompatibilityAttributes;
  readonly variants: readonly ProductVariant[];
}

export interface ExcludedArea {
  readonly id: string;
  readonly areaSquareMillimeters: SquareMillimeters;
}

export interface DoorMeasurement {
  readonly id: string;
  readonly widthMillimeters: Millimeters;
}

export type RoomGeometry =
  | {
      readonly kind: 'rectangle';
      readonly widthMillimeters: Millimeters;
      readonly lengthMillimeters: Millimeters;
    }
  | {
      readonly kind: 'manualArea';
      readonly areaSquareMillimeters: SquareMillimeters;
      readonly perimeterMillimeters?: Millimeters;
    };

export interface CornerCounts {
  readonly internal: number;
  readonly external: number;
}

export interface RoomMeasurement {
  readonly id: string;
  readonly name?: string;
  readonly geometry: RoomGeometry;
  readonly excludedAreas: readonly ExcludedArea[];
  readonly doors: readonly DoorMeasurement[];
  readonly corners?: CornerCounts;
}

export interface MeasurementProject {
  readonly id: string;
  readonly rooms: readonly RoomMeasurement[];
  readonly wasteBasisPoints?: BasisPoints;
  readonly installationPattern?: string;
}

export interface WasteRule {
  readonly defaultBasisPoints: BasisPoints;
  readonly minimumBasisPoints: BasisPoints;
  readonly maximumBasisPoints: BasisPoints;
  readonly patternOverrides?: Readonly<Record<string, BasisPoints>>;
}

export type AccessoryCalculation =
  | { readonly kind: 'byArea'; readonly coverageAreaSquareMillimeters: SquareMillimeters }
  | {
      readonly kind: 'byPerimeter';
      readonly itemLengthMillimeters: Millimeters;
      readonly subtractDoorWidths: boolean;
    }
  | { readonly kind: 'byRoomCount'; readonly unitsPerRoom: number }
  | { readonly kind: 'byDoorCount'; readonly unitsPerDoor: number }
  | {
      readonly kind: 'byCornerCount';
      readonly cornerType: 'internal' | 'external';
      readonly unitsPerCorner: number;
    }
  | { readonly kind: 'byMainPackages'; readonly mainPackagesPerUnit: number }
  | { readonly kind: 'fixed'; readonly quantity: number }
  | { readonly kind: 'optional'; readonly defaultQuantity: number };

export interface AccessoryProduct {
  readonly id: string;
  readonly nameKey: string;
  readonly variant: ProductVariant;
}

export type RelationStatus =
  'required' | 'recommended' | 'optional' | 'alternative' | 'incompatible';

export interface AccessoryRule {
  readonly id: string;
  readonly accessoryProductId: string;
  readonly status: RelationStatus;
  readonly calculation: AccessoryCalculation;
  readonly alternativeGroup?: string;
}

export interface CompatibilityRule {
  readonly id: string;
  readonly sourceProductId: string;
  readonly targetProductId?: string;
  readonly status: RelationStatus;
  readonly requiredTags?: readonly string[];
  readonly excludedTags?: readonly string[];
}

export type IntegerExpression =
  | { readonly op: 'literal'; readonly value: number }
  | { readonly op: 'variable'; readonly name: string }
  | {
      readonly op: 'add' | 'subtract' | 'multiply' | 'divide' | 'min' | 'max';
      readonly left: IntegerExpression;
      readonly right: IntegerExpression;
    }
  | { readonly op: 'ceil' | 'floor'; readonly value: IntegerExpression }
  | {
      readonly op: 'percentage';
      readonly value: IntegerExpression;
      readonly basisPoints: IntegerExpression;
    }
  | {
      readonly op: 'conditional';
      readonly condition: IntegerCondition;
      readonly whenTrue: IntegerExpression;
      readonly whenFalse: IntegerExpression;
    }
  | {
      readonly op: 'lookupTable';
      readonly key: IntegerExpression;
      readonly entries: Readonly<Record<string, number>>;
      readonly fallback: number;
    };

export type IntegerCondition =
  | {
      readonly op: 'equal' | 'greaterThan' | 'lessThan';
      readonly left: IntegerExpression;
      readonly right: IntegerExpression;
    }
  | { readonly op: 'and' | 'or'; readonly left: IntegerCondition; readonly right: IntegerCondition }
  | { readonly op: 'not'; readonly value: IntegerCondition };

export interface ConfigurationVersion {
  readonly schemaVersion: number;
  readonly revision: number;
  readonly createdAt: string;
}

export interface LicenseProvider {
  readonly mode: 'local-open' | 'external';
  isFeatureEnabled(feature: string): boolean;
}

export const localOpenLicenseProvider: LicenseProvider = Object.freeze({
  mode: 'local-open',
  isFeatureEnabled: () => true,
});

export interface CalculationConfiguration {
  readonly id: string;
  readonly version: ConfigurationVersion;
  readonly locale: string;
  readonly currency: string;
  readonly mainProduct: MaterialProduct;
  readonly defaultVariantId: string;
  readonly wasteRule: WasteRule;
  readonly accessories: readonly AccessoryProduct[];
  readonly accessoryRules: readonly AccessoryRule[];
  readonly compatibilityRules: readonly CompatibilityRule[];
}

export interface CalculationStep {
  readonly id: string;
  readonly operation: string;
  readonly inputValues: Readonly<Record<string, number | string>>;
  readonly outputValue: number;
  readonly outputUnit: MeasurementUnit;
  readonly explanationKey: string;
}

export type WarningCode =
  | 'PRICE_MISSING'
  | 'PRODUCT_UNAVAILABLE'
  | 'INCOMPATIBLE_ACCESSORY'
  | 'OPTIONAL_ACCESSORY'
  | 'NO_PERIMETER'
  | 'QUANTITY_LIMIT';

export interface ResultWarning {
  readonly code: WarningCode;
  readonly messageKey: string;
  readonly productId?: string;
  readonly severity: 'info' | 'warning' | 'error';
}

export interface CartLine {
  readonly productId: string;
  readonly variantId: string;
  readonly sku: string;
  readonly quantity: number;
  readonly unitPrice?: Money;
  readonly totalPrice?: Money;
  readonly eligible: boolean;
  readonly exclusionReason?: WarningCode;
}

export interface CalculatedProductLine {
  readonly productId: string;
  readonly variantId: string;
  readonly sku: string;
  readonly quantity: number;
  readonly saleUnit: SaleUnit;
  readonly purchasedAreaSquareMillimeters?: SquareMillimeters;
  readonly excessAreaSquareMillimeters?: SquareMillimeters;
  readonly unitPrice?: Money;
  readonly totalPrice?: Money;
  readonly explanationStepIds: readonly string[];
}

export interface MeasurementSummary {
  readonly netAreaSquareMillimeters: SquareMillimeters;
  readonly wasteBasisPoints: BasisPoints;
  readonly wasteAreaSquareMillimeters: SquareMillimeters;
  readonly grossAreaSquareMillimeters: SquareMillimeters;
  readonly perimeterMillimeters: Millimeters;
  readonly doorWidthMillimeters: Millimeters;
  readonly skirtingLengthMillimeters: Millimeters;
  readonly roomCount: number;
  readonly doorCount: number;
  readonly internalCornerCount: number;
  readonly externalCornerCount: number;
}

export interface CalculationResult {
  readonly configurationVersion: ConfigurationVersion;
  readonly projectId: string;
  readonly measurements: MeasurementSummary;
  readonly mainProduct: CalculatedProductLine;
  readonly accessories: readonly CalculatedProductLine[];
  readonly cartLines: readonly CartLine[];
  readonly totalPrice?: Money;
  readonly warnings: readonly ResultWarning[];
  readonly steps: readonly CalculationStep[];
}

export interface CalculationInput {
  readonly project: MeasurementProject;
  readonly variantId?: string;
  readonly selectedOptionalAccessoryIds?: readonly string[];
}

export interface VerticalPack {
  readonly id: string;
  readonly version: string;
  readonly nameKey: string;
  readonly supportedMaterialTypes: readonly string[];
  readonly configuration: CalculationConfiguration;
}
