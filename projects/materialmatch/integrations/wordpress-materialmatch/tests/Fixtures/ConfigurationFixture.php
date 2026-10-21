<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Tests\Fixtures;

final class ConfigurationFixture
{
    /** @return array<string, mixed> */
    public static function valid(): array
    {
        return [
            'id' => 'fictional-flooring-test',
            'version' => [
                'schemaVersion' => 1,
                'revision' => 0,
                'createdAt' => '2026-07-17T00:00:00.000Z',
            ],
            'locale' => 'pl-PL',
            'currency' => 'PLN',
            'mainProduct' => [
                'id' => 'fictional-panel',
                'nameKey' => 'flooring.product.panel',
                'attributes' => [
                    'materialType' => 'floor-panel',
                    'compatibilityTags' => ['click-system'],
                    'exclusionTags' => [],
                ],
                'variants' => [[
                    'id' => 'fictional-panel-natural',
                    'sku' => 'FICTIONAL-MM-PANEL',
                    'nameKey' => 'flooring.variant.natural',
                    'materialType' => 'floor-panel',
                    'compatibilityTags' => ['click-system'],
                    'exclusionTags' => [],
                    'package' => [
                        'saleUnit' => 'package',
                        'coverageAreaSquareMillimeters' => 2_200_000,
                        'piecesPerPackage' => 8,
                        'minimumPackages' => 1,
                        'orderMultiple' => 1,
                        'openedPackagesSold' => false,
                    ],
                    'price' => ['minorUnits' => 15_999, 'currency' => 'PLN'],
                    'available' => true,
                ]],
            ],
            'defaultVariantId' => 'fictional-panel-natural',
            'wasteRule' => [
                'defaultBasisPoints' => 800,
                'minimumBasisPoints' => 0,
                'maximumBasisPoints' => 2_000,
                'patternOverrides' => ['straight' => 800],
            ],
            'accessories' => [[
                'id' => 'underlay',
                'nameKey' => 'flooring.accessory.underlay',
                'variant' => [
                    'id' => 'underlay-standard',
                    'sku' => 'FICTIONAL-MM-UNDERLAY',
                    'nameKey' => 'flooring.accessory.underlay.standard',
                    'materialType' => 'flooring-accessory',
                    'compatibilityTags' => ['flooring-compatible'],
                    'exclusionTags' => [],
                    'package' => [
                        'saleUnit' => 'roll',
                        'coverageAreaSquareMillimeters' => 10_000_000,
                        'piecesPerPackage' => 1,
                        'minimumPackages' => 0,
                        'orderMultiple' => 1,
                        'openedPackagesSold' => false,
                    ],
                    'available' => true,
                ],
            ]],
            'accessoryRules' => [[
                'id' => 'underlay-by-area',
                'accessoryProductId' => 'underlay',
                'status' => 'required',
                'calculation' => [
                    'kind' => 'byArea',
                    'coverageAreaSquareMillimeters' => 10_000_000,
                ],
            ]],
            'compatibilityRules' => [[
                'id' => 'panel-underlay',
                'sourceProductId' => 'fictional-panel',
                'targetProductId' => 'underlay',
                'status' => 'required',
                'requiredTags' => ['flooring-compatible'],
            ]],
        ];
    }
}
