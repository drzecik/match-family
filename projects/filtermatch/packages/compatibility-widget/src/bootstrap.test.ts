import { describe, expect, it, vi } from 'vitest';
import { loadStaticWidgetConfig, resolveStaticConfigUrl } from './bootstrap.js';
import type { WidgetConfig } from './core.js';

function config(): WidgetConfig {
  const flags = { synthetic: true, notForProduction: true } as const;
  return {
    ...flags,
    catalog: {
      ...flags,
      devices: [{ id: 'device-ap420-10', brand: 'AirPure', canonicalModel: 'AP420/10', ...flags }],
      aliases: [{ entityType: 'device', entityId: 'device-ap420-10', rawAlias: 'AP 420 /10', approved: true, ...flags }],
      products: [{ id: 'product-filter', name: 'Filter fixture', url: 'https://shop.example/filter', kind: 'original', ...flags }],
      compatibility: [{ deviceId: 'device-ap420-10', productId: 'product-filter', status: 'verified_official', evidenceIds: ['evidence-official'], ...flags }],
      evidence: [{
        id: 'evidence-official', sourceType: 'official_manual', title: 'Synthetic fixture manual', publisher: 'AirPure fixture publisher',
        url: 'https://docs.example/manual', accessedAt: '2026-07-12T00:00:00.000Z',
        evidenceSummary: 'Synthetic official evidence for widget bootstrap tests.', reviewer: 'fixture-reviewer',
        reviewerType: 'human', verifiedAt: '2026-07-12T00:00:00.000Z',
        verificationDecision: 'verified_official', ...flags
      }]
    }
  };
}

describe('one-script widget bootstrap', () => {
  it('allows same-origin static config and blocks cross-origin by default', () => {
    expect(resolveStaticConfigUrl('/assets/catalog.json', 'https://shop.example/product').href).toBe(
      'https://shop.example/assets/catalog.json'
    );
    expect(() => resolveStaticConfigUrl('https://cdn.example/catalog.json', 'https://shop.example/')).toThrow(
      /Cross-origin/u
    );
    expect(resolveStaticConfigUrl('https://cdn.example/catalog.json', 'https://shop.example/', true).href).toBe(
      'https://cdn.example/catalog.json'
    );
  });

  it('loads and validates a bounded static catalog without credentials', async () => {
    const fetchConfig = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(config()), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );
    await expect(
      loadStaticWidgetConfig(new URL('https://shop.example/catalog.json'), fetchConfig)
    ).resolves.toMatchObject({ catalog: { devices: [{ id: 'device-ap420-10' }] } });
    expect(fetchConfig).toHaveBeenCalledWith(
      new URL('https://shop.example/catalog.json'),
      expect.objectContaining({ credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' })
    );
  });

  it('rejects invalid JSON, unsafe product URLs and oversized catalogs', async () => {
    const invalidJson = vi.fn<typeof fetch>().mockResolvedValue(new Response('{', { status: 200 }));
    await expect(loadStaticWidgetConfig(new URL('https://shop.example/catalog.json'), invalidJson)).rejects.toThrow(
      /valid JSON/u
    );

    const unsafe = config();
    unsafe.catalog.products[0]!.url = 'javascript:alert(1)';
    const unsafeFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(unsafe), { status: 200 })
    );
    await expect(loadStaticWidgetConfig(new URL('https://shop.example/catalog.json'), unsafeFetch)).rejects.toThrow(
      /Unsafe widget URL/u
    );

    const oversized = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-length': String(5 * 1024 * 1024 + 1) } })
    );
    await expect(loadStaticWidgetConfig(new URL('https://shop.example/catalog.json'), oversized)).rejects.toThrow(
      /5 MB/u
    );

    const chunk = new Uint8Array(1024 * 1024);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let index = 0; index < 6; index += 1) controller.enqueue(chunk);
        controller.close();
      }
    });
    const streamed = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status: 200 }));
    await expect(loadStaticWidgetConfig(new URL('https://shop.example/catalog.json'), streamed)).rejects.toThrow(
      /5 MB/u
    );
  });
});
