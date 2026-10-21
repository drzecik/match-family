import type { TranslationDictionary, TranslationId } from '@materialmatch/shared-ui';
import type { CalculationInput } from '@materialmatch/domain';
import type { MaterialMatchElement } from './material-match-element';

export interface WidgetConfiguration {
  readonly schemaVersion: string;
  readonly configurationVersion: string;
  readonly locale?: string;
  readonly currency?: string;
  readonly defaultWasteBasisPoints: number;
  readonly minimumWasteBasisPoints: number;
  readonly maximumWasteBasisPoints: number;
  readonly allowPartialCart?: boolean;
  readonly brand?: {
    readonly name?: string;
    readonly logoUrl?: string;
  };
  readonly translations?: Partial<TranslationDictionary>;
  /** Human-readable product labels keyed by product id; identifiers remain stable in engine configuration. */
  readonly productNames?: Readonly<Record<string, string>>;
  /** Validated, versioned configuration passed unchanged to the calculation engine. */
  readonly calculation: unknown;
}

export interface WidgetRoomMeasurement {
  readonly id: string;
  readonly name: string;
  readonly lengthMm: number;
  readonly widthMm: number;
  readonly excludedAreaSquareMm: number;
  readonly doorWidthMm: number;
  /** Optional for backward compatibility with hosts using the pre-corner API. */
  readonly internalCornerCount?: number;
  /** Optional for backward compatibility with hosts using the pre-corner API. */
  readonly externalCornerCount?: number;
}

export interface WidgetCalculationRequest {
  readonly configurationVersion: string;
  readonly calculation: unknown;
  readonly productNames?: Readonly<Record<string, string>>;
  readonly variantId?: string;
  readonly selectedOptionalAccessoryIds?: readonly string[];
  readonly project: {
    readonly id: string;
    readonly name: string;
    readonly rooms: readonly WidgetRoomMeasurement[];
    readonly wasteBasisPoints: number;
  };
}

export type ResultLineStatus = 'available' | 'unavailable' | 'missing-price';

export interface WidgetResultLine {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitLabel: string;
  readonly unitPriceMinor: number | null;
  readonly totalPriceMinor: number | null;
  readonly status: ResultLineStatus;
  readonly required: boolean;
}

export interface WidgetCalculationStep {
  readonly id: string;
  readonly translationId?: TranslationId;
  readonly description: string;
  readonly expression?: string;
}

export interface WidgetCalculationResult {
  readonly calculationId: string;
  readonly configurationVersion: string;
  readonly netAreaSquareMm: number;
  readonly wasteAreaSquareMm: number;
  readonly grossAreaSquareMm: number;
  readonly purchaseAreaSquareMm: number;
  readonly surplusAreaSquareMm: number;
  readonly lines: readonly WidgetResultLine[];
  readonly steps: readonly WidgetCalculationStep[];
  readonly warnings: readonly {
    readonly code: string;
    readonly message: string;
    readonly translationId?: TranslationId;
  }[];
  readonly totalPriceMinor: number | null;
}

export type WidgetCalculator = (
  request: WidgetCalculationRequest,
) => WidgetCalculationResult | Promise<WidgetCalculationResult>;

export interface MaterialMatchEventMap {
  'materialmatch:ready': CustomEvent<{ configurationVersion: string }>;
  'materialmatch:measurements-change': CustomEvent<{
    rooms: readonly WidgetRoomMeasurement[];
    wasteBasisPoints: number;
  }>;
  'materialmatch:step-change': CustomEvent<{ step: 'measurements' | 'result' }>;
  'materialmatch:calculation-complete': CustomEvent<{ result: WidgetCalculationResult }>;
  'materialmatch:add-to-cart': CustomEvent<{
    calculationId: string;
    /** Validated integer measurement facts and selection identifiers for server-side recalculation. */
    input: CalculationInput;
    lines: readonly { sku: string; quantity: number }[];
    omittedLines: readonly { sku: string; reason: ResultLineStatus }[];
  }>;
  'materialmatch:error': CustomEvent<{ code: string; message: string }>;
}

declare global {
  interface HTMLElementEventMap {
    'materialmatch:ready': MaterialMatchEventMap['materialmatch:ready'];
    'materialmatch:measurements-change': MaterialMatchEventMap['materialmatch:measurements-change'];
    'materialmatch:step-change': MaterialMatchEventMap['materialmatch:step-change'];
    'materialmatch:calculation-complete': MaterialMatchEventMap['materialmatch:calculation-complete'];
    'materialmatch:add-to-cart': MaterialMatchEventMap['materialmatch:add-to-cart'];
    'materialmatch:error': MaterialMatchEventMap['materialmatch:error'];
  }
  interface HTMLElementTagNameMap {
    'material-match': MaterialMatchElement;
  }
}
