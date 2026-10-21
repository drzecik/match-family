<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Tests;

use MaterialMatch\WordPress\Admin\CsvProductMetadataImporter;
use MaterialMatch\WordPress\Contract\ProductMetadataStore;
use MaterialMatch\WordPress\Security\ImportException;
use PHPUnit\Framework\TestCase;

final class CsvProductMetadataImporterTest extends TestCase
{
    public function testNormalizesAndUpdatesAllowListedMetadata(): void
    {
        $store = new InMemoryProductMetadataStore(['DEMO-1' => 11]);
        $importer = new CsvProductMetadataImporter($store);

        $count = $importer->import([[
            'sku' => 'DEMO-1',
            'enabled' => '1',
            'material_type' => 'FLOORING_PANEL',
            'coverage_per_package_mm2' => '2200000',
            'compatibility_tags' => 'underlay|dry_rooms|underlay',
        ]]);

        self::assertSame(1, $count);
        self::assertSame(true, $store->values[11]['enabled']);
        self::assertSame('flooring_panel', $store->values[11]['material_type']);
        self::assertSame(2200000, $store->values[11]['coverage_per_package_mm2']);
        self::assertSame(['underlay', 'dry_rooms'], $store->values[11]['compatibility_tags']);
    }

    public function testAcceptsPolishHeadersNaturalUnitsAndYesNoValues(): void
    {
        $store = new InMemoryProductMetadataStore(['DEMO-1' => 11]);
        $importer = new CsvProductMetadataImporter($store);

        $count = $importer->import([[
            'kod_produktu' => 'DEMO-1',
            'aktywny' => 'tak',
            'powierzchnia_opakowania_m2' => '2,2',
            'domyslny_zapas_procent' => '8',
            'sprzedaz_otwartych_opakowan' => 'nie',
        ]]);

        self::assertSame(1, $count);
        self::assertSame(true, $store->values[11]['enabled']);
        self::assertSame(2200000, $store->values[11]['coverage_per_package_mm2']);
        self::assertSame(800, $store->values[11]['default_waste_basis_points']);
        self::assertSame(false, $store->values[11]['open_packages']);
    }

    public function testRejectsPolishAndTechnicalHeadersForTheSameField(): void
    {
        $store = new InMemoryProductMetadataStore(['DEMO-1' => 11]);
        $importer = new CsvProductMetadataImporter($store);

        $this->expectException(ImportException::class);
        $this->expectExceptionMessage('import.duplicate_field');

        $importer->import([[
            'sku' => 'DEMO-1',
            'kod_produktu' => 'DEMO-1',
        ]]);
    }

    public function testValidatesEveryRowBeforeWritingAnything(): void
    {
        $store = new InMemoryProductMetadataStore(['DEMO-1' => 11]);
        $importer = new CsvProductMetadataImporter($store);

        try {
            $importer->import([
                ['sku' => 'DEMO-1', 'enabled' => '1'],
                ['sku' => 'UNKNOWN', 'enabled' => '1'],
            ]);
            self::fail('ImportException was not thrown.');
        } catch (ImportException $exception) {
            self::assertSame('import.unknown_sku', $exception->getMessage());
        }

        self::assertSame([], $store->values);
    }

    public function testRepeatedImportKeepsSameStoredValues(): void
    {
        $store = new InMemoryProductMetadataStore(['DEMO-1' => 11]);
        $importer = new CsvProductMetadataImporter($store);
        $rows = [['sku' => 'DEMO-1', 'order_multiple' => '2']];

        $importer->import($rows);
        $first = $store->values;
        $importer->import($rows);

        self::assertSame($first, $store->values);
    }
}

final class InMemoryProductMetadataStore implements ProductMetadataStore
{
    /** @var array<int, array<string, bool|int|string|list<string>>> */
    public array $values = [];

    /** @param array<string, int> $products */
    public function __construct(private readonly array $products)
    {
    }

    public function findProductIdBySku(string $sku): ?int
    {
        return $this->products[$sku] ?? null;
    }

    public function update(int $productId, string $field, bool|int|string|array $value): void
    {
        $this->values[$productId][$field] = $value;
    }
}
