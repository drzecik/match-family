import { describe, expect, it } from 'vitest';
import {
  MAX_WIDGET_CONFIGURATION_JSON_LENGTH,
  parseWidgetConfigurationJson,
  safeBrandAssetUrl,
  validateWidgetConfiguration,
} from './widget-configuration';

const validConfiguration = {
  schemaVersion: '1',
  configurationVersion: '1.0',
  defaultWasteBasisPoints: 800,
  minimumWasteBasisPoints: 0,
  maximumWasteBasisPoints: 2000,
  calculation: { id: 'fixture' },
};

describe('widget configuration boundary', () => {
  it('accepts the minimal versioned JSON contract', () => {
    expect(validateWidgetConfiguration(validConfiguration)).toMatchObject({ success: true });
    expect(parseWidgetConfigurationJson(JSON.stringify(validConfiguration))).toMatchObject({
      success: true,
    });
  });

  it('rejects inverted waste limits, executable strings and oversized input', () => {
    expect(
      validateWidgetConfiguration({
        ...validConfiguration,
        minimumWasteBasisPoints: 900,
      }),
    ).toMatchObject({ success: false });
    expect(
      validateWidgetConfiguration({ ...validConfiguration, calculation: 'alert(1)' }),
    ).toMatchObject({ success: false });
    expect(
      parseWidgetConfigurationJson('x'.repeat(MAX_WIDGET_CONFIGURATION_JSON_LENGTH + 1)),
    ).toMatchObject({ success: false });
  });

  it('allows only same-origin or embedded raster branding assets', () => {
    expect(safeBrandAssetUrl('/brand/logo.png', 'https://shop.example/product')).toBe(
      'https://shop.example/brand/logo.png',
    );
    expect(safeBrandAssetUrl('data:image/png;base64,YWJj', 'https://shop.example/product')).toBe(
      'data:image/png;base64,YWJj',
    );
    expect(
      safeBrandAssetUrl('https://tracking.example/pixel.png', 'https://shop.example'),
    ).toBeNull();
    expect(
      safeBrandAssetUrl('data:image/svg+xml;base64,PHN2Zz4=', 'https://shop.example'),
    ).toBeNull();
  });
});
