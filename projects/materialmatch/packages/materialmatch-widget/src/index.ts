import { MaterialMatchElement } from './material-match-element';

export { MaterialMatchElement };
export { calculateWithMaterialMatchEngine } from './engine-adapter';
export {
  MAX_WIDGET_CONFIGURATION_JSON_LENGTH,
  parseWidgetConfigurationJson,
  safeBrandAssetUrl,
  validateWidgetConfiguration,
} from './widget-configuration';
export type {
  MaterialMatchEventMap,
  ResultLineStatus,
  WidgetCalculationRequest,
  WidgetCalculationResult,
  WidgetCalculationStep,
  WidgetCalculator,
  WidgetConfiguration,
  WidgetResultLine,
  WidgetRoomMeasurement,
} from './types';

export function defineMaterialMatchElement(tagName = 'material-match'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, MaterialMatchElement);
  }
}
