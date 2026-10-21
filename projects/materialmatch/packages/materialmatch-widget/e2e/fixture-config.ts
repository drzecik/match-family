import { referenceFlooringConfiguration } from '@materialmatch/test-fixtures';
import type { MaterialMatchElement, WidgetConfiguration } from '../src';

await customElements.whenDefined('material-match');
const element = document.querySelector<MaterialMatchElement>('material-match');
if (!element) throw new Error('Widget fixture element is missing.');

const configuration: WidgetConfiguration = {
  schemaVersion: '1',
  configurationVersion: '1.0',
  defaultWasteBasisPoints: 800,
  minimumWasteBasisPoints: 0,
  maximumWasteBasisPoints: 2000,
  allowPartialCart: true,
  brand: { name: 'MaterialMatch test' },
  productNames: {
    'fictional-floor-panel': 'Fikcyjne panele Natural 8',
    underlay: 'Fikcyjny podkład 10 m²',
    skirting: 'Fikcyjna listwa 2,4 m',
  },
  calculation: referenceFlooringConfiguration,
};

element.configuration = configuration;
