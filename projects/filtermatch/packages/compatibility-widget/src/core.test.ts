import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  noResultEventDetail,
  prepareWidgetConfig,
  resolveWidgetQuery,
  type WidgetConfig
} from './core.js';

function fixtureConfig(): WidgetConfig {
  const flags = { synthetic: true, notForProduction: true } as const;
  return {
    ...flags,
    catalog: {
      ...flags,
      devices: [
        { id: 'device-ap420-10', brand: 'AirPure', canonicalModel: 'AP420', regionalVariant: '/10', ...flags },
        { id: 'device-ap421-10', brand: 'AirPure', canonicalModel: 'AP421', regionalVariant: '/10', ...flags }
      ],
      aliases: [
        { entityType: 'device', entityId: 'device-ap420-10', rawAlias: 'AP 420 /10', approved: true, source: 'fixture', ...flags },
        { entityType: 'device', entityId: 'device-ap421-10', rawAlias: 'AP 421 /10', approved: true, source: 'fixture', ...flags }
      ],
      products: [
        { id: 'product-original', name: 'Original fixture', url: 'https://shop.example/original', kind: 'original', ...flags },
        { id: 'product-replacement', name: 'Replacement fixture', url: 'https://shop.example/replacement', kind: 'replacement', ...flags },
        { id: 'product-candidate', name: 'Candidate fixture', url: 'https://shop.example/candidate', kind: 'replacement', ...flags },
        { id: 'product-unavailable', name: 'Unavailable fixture', url: 'https://shop.example/unavailable', kind: 'replacement', available: false, ...flags }
      ],
      compatibility: [
        { deviceId: 'device-ap420-10', productId: 'product-original', status: 'verified_official', relationType: 'required', evidenceIds: ['evidence-official'], ...flags },
        { deviceId: 'device-ap420-10', productId: 'product-replacement', status: 'verified_supplier', relationType: 'alternative', evidenceIds: ['evidence-supplier'], ...flags },
        { deviceId: 'device-ap420-10', productId: 'product-candidate', status: 'candidate', relationType: 'alternative', ...flags },
        { deviceId: 'device-ap420-10', productId: 'product-unavailable', status: 'verified_supplier', relationType: 'alternative', evidenceIds: ['evidence-supplier'], ...flags }
      ],
      evidence: [
        {
          id: 'evidence-official', sourceType: 'official_manual', title: 'Official fixture manual', publisher: 'AirPure fixture publisher',
          url: 'https://docs.example/official', accessedAt: '2026-07-12T00:00:00.000Z',
          evidenceSummary: 'Synthetic evidence for the original fixture.', reviewer: 'fixture-reviewer',
          reviewerType: 'human', verifiedAt: '2026-07-12T00:00:00.000Z',
          verificationDecision: 'verified_official', ...flags
        },
        {
          id: 'evidence-supplier', sourceType: 'replacement_manufacturer', title: 'Supplier fixture declaration', publisher: 'CleanFlow fixture publisher',
          url: 'https://docs.example/supplier', accessedAt: '2026-07-12T00:00:00.000Z',
          evidenceSummary: 'Synthetic supplier evidence for the replacement fixture.', reviewer: 'fixture-reviewer',
          reviewerType: 'human', verifiedAt: '2026-07-12T00:00:00.000Z',
          verificationDecision: 'verified_supplier', ...flags
        }
      ]
    }
  };
}

describe('compatibility widget core', () => {
  it('returns only verified and available products from the merchant catalog', () => {
    const result = resolveWidgetQuery(prepareWidgetConfig(fixtureConfig()), 'AP 420 /10');
    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.products.map(({ id }) => id)).toEqual(['product-original', 'product-replacement']);
    expect(result.products.map(({ id }) => id)).not.toContain('product-candidate');
    expect(result.products.map(({ id }) => id)).not.toContain('product-unavailable');
  });

  it('does not resolve a similar model that differs by one digit', () => {
    const result = resolveWidgetQuery(prepareWidgetConfig(fixtureConfig()), 'AP 429 /10');
    expect(result.status).not.toBe('resolved');
  });

  it('returns no_products when a known device has no publishable merchant product', () => {
    const config = fixtureConfig();
    config.catalog.compatibility = [];
    expect(resolveWidgetQuery(prepareWidgetConfig(config), 'AP 420 /10').status).toBe('no_products');
  });

  it('rejects compatibility references outside the merchant catalog', () => {
    const config = fixtureConfig();
    config.catalog.compatibility.push({
      deviceId: 'device-ap420-10',
      productId: 'missing-product',
      status: 'verified_official',
      evidenceIds: ['evidence-official'],
      synthetic: true,
      notForProduction: true
    });
    expect(() => prepareWidgetConfig(config)).toThrow(/unknown product/u);
  });

  it('rejects a verified edge without qualifying evidence', () => {
    const missing = fixtureConfig();
    delete missing.catalog.compatibility[0]!.evidenceIds;
    expect(() => prepareWidgetConfig(missing)).toThrow(/lacks qualifying evidence/u);

    const wrongDecision = fixtureConfig();
    wrongDecision.catalog.evidence[0]!.verificationDecision = 'candidate';
    expect(() => prepareWidgetConfig(wrongDecision)).toThrow(/lacks qualifying evidence/u);

    const duplicatedSource = fixtureConfig();
    duplicatedSource.catalog.compatibility = [{
      ...duplicatedSource.catalog.compatibility[0]!,
      status: 'verified_multi_source',
      evidenceIds: ['evidence-official', 'evidence-supplier']
    }];
    duplicatedSource.catalog.evidence[0]!.verificationDecision = 'verified_multi_source';
    duplicatedSource.catalog.evidence[1]!.verificationDecision = 'verified_multi_source';
    duplicatedSource.catalog.evidence[1]!.url = duplicatedSource.catalog.evidence[0]!.url!;
    expect(() => prepareWidgetConfig(duplicatedSource)).toThrow(/lacks qualifying evidence/u);
    duplicatedSource.catalog.evidence[1]!.url = 'https://second-source.example/declaration';
    duplicatedSource.catalog.evidence[1]!.publisher = duplicatedSource.catalog.evidence[0]!.publisher;
    expect(() => prepareWidgetConfig(duplicatedSource)).toThrow(/lacks qualifying evidence/u);
    duplicatedSource.catalog.evidence[1]!.publisher = 'Independent fixture publisher';
    expect(() => prepareWidgetConfig(duplicatedSource)).not.toThrow();
  });

  it('requires both fixture flags and keeps the shipped widget demo fully marked', () => {
    const partial = fixtureConfig();
    delete partial.catalog.products[0]!.notForProduction;
    expect(() => prepareWidgetConfig(partial)).toThrow(/both fixture flags/u);

    const shipped = JSON.parse(
      readFileSync(new URL('../../../apps/widget-demo/public/widget-config.json', import.meta.url), 'utf8')
    ) as WidgetConfig;
    expect(() => prepareWidgetConfig(shipped)).not.toThrow();
    const records = [
      shipped,
      shipped.catalog,
      ...shipped.catalog.devices,
      ...shipped.catalog.aliases,
      ...shipped.catalog.products,
      ...shipped.catalog.compatibility,
      ...shipped.catalog.evidence
    ];
    expect(records.every((record) => record.synthetic === true && record.notForProduction === true)).toBe(true);
  });

  it('rejects unsafe product URLs and unsafe theme values', () => {
    const unsafeUrl = fixtureConfig();
    unsafeUrl.catalog.products[0]!.url = 'javascript:alert(1)';
    expect(() => prepareWidgetConfig(unsafeUrl)).toThrow(/Unsafe widget URL/u);

    const unsafeTheme = fixtureConfig();
    unsafeTheme.theme = { color: 'red; background:url(https://tracker.example)' };
    expect(() => prepareWidgetConfig(unsafeTheme)).toThrow(/theme color/u);
  });

  it('does not report a no-result search unless the merchant opts in', () => {
    const prepared = prepareWidgetConfig(fixtureConfig());
    const missing = resolveWidgetQuery(prepared, 'MODEL 999/XX');
    expect(missing.status).not.toBe('resolved');
    expect(noResultEventDetail(prepared, missing)).toBeNull();
  });

  it('reports an anonymous reason once no-result events are enabled', () => {
    const config = fixtureConfig();
    config.privacy = { emitNoResultEvents: true };
    const prepared = prepareWidgetConfig(config);
    const missing = resolveWidgetQuery(prepared, 'MODEL 999/XX');
    expect(noResultEventDetail(prepared, missing)).toEqual({ reason: missing.status });
  });

  it('adds the normalized query to a no-result event only with the separate opt-in', () => {
    const config = fixtureConfig();
    config.privacy = { emitNoResultEvents: true, includeNormalizedQueryInEvents: true };
    const prepared = prepareWidgetConfig(config);
    const missing = resolveWidgetQuery(prepared, 'MODEL 999/XX');
    expect(noResultEventDetail(prepared, missing)).toMatchObject({
      normalizedQuery: missing.normalizedQuery
    });

    // Enabling only the query flag must not switch reporting on by itself.
    const queryOnly = fixtureConfig();
    queryOnly.privacy = { includeNormalizedQueryInEvents: true };
    const preparedQueryOnly = prepareWidgetConfig(queryOnly);
    expect(
      noResultEventDetail(preparedQueryOnly, resolveWidgetQuery(preparedQueryOnly, 'MODEL 999/XX'))
    ).toBeNull();
  });

  it('never produces a no-result detail for a resolved search', () => {
    const config = fixtureConfig();
    config.privacy = { emitNoResultEvents: true };
    const prepared = prepareWidgetConfig(config);
    expect(noResultEventDetail(prepared, resolveWidgetQuery(prepared, 'AP 420 /10'))).toBeNull();
  });

  it('rejects duplicate IDs and compatibility edges', () => {
    const duplicateProduct = fixtureConfig();
    duplicateProduct.catalog.products.push({ ...duplicateProduct.catalog.products[0]! });
    expect(() => prepareWidgetConfig(duplicateProduct)).toThrow(/Duplicate widget product/u);

    const duplicateEdge = fixtureConfig();
    duplicateEdge.catalog.compatibility.push({ ...duplicateEdge.catalog.compatibility[0]! });
    expect(() => prepareWidgetConfig(duplicateEdge)).toThrow(/Duplicate widget compatibility/u);
  });
});
