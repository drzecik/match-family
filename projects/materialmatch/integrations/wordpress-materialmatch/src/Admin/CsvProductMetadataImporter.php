<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Admin;

use InvalidArgumentException;
use MaterialMatch\WordPress\Contract\ProductMetadataStore;
use MaterialMatch\WordPress\Product\MetadataDefinition;
use MaterialMatch\WordPress\Security\ImportException;

final class CsvProductMetadataImporter
{
    private const HEADER_ALIASES = [
        'kod_produktu' => 'sku',
        'aktywny' => 'enabled',
        'typ_materialu' => 'material_type',
        'rodzina_produktowa' => 'product_family',
        'grubosc_mm' => 'thickness_mm',
        'sposob_montazu' => 'installation_method',
        'tagi_kompatybilnosci' => 'compatibility_tags',
        'tagi_wykluczajace' => 'exclusion_tags',
        'powierzchnia_opakowania_m2' => 'coverage_per_package_mm2',
        'elementy_w_opakowaniu' => 'pieces_per_package',
        'minimalna_liczba_opakowan' => 'minimum_packages',
        'wielokrotnosc_zamowienia' => 'order_multiple',
        'sprzedaz_otwartych_opakowan' => 'open_packages',
        'domyslny_zapas_procent' => 'default_waste_basis_points',
        'minimalny_zapas_procent' => 'minimum_waste_basis_points',
        'maksymalny_zapas_procent' => 'maximum_waste_basis_points',
    ];

    private const FRIENDLY_UNIT_HEADERS = [
        'powierzchnia_opakowania_m2' => true,
        'domyslny_zapas_procent' => true,
        'minimalny_zapas_procent' => true,
        'maksymalny_zapas_procent' => true,
    ];

    private const FRIENDLY_BOOLEAN_HEADERS = [
        'aktywny' => true,
        'sprzedaz_otwartych_opakowan' => true,
    ];

    public function __construct(
        private readonly ProductMetadataStore $store,
        private readonly ProductMetadataValueAdapter $valueAdapter = new ProductMetadataValueAdapter(),
    ) {
    }

    /**
     * Validates the complete file before writing. Re-importing the same data is
     * idempotent because values are updated by stable WooCommerce SKU.
     *
     * @param list<array<string, string>> $rows
     */
    public function import(array $rows): int
    {
        if ($rows === []) {
            throw new ImportException('import.no_rows');
        }

        $allowedFields = MetadataDefinition::fields();
        $prepared = [];
        $seenSkus = [];

        foreach ($rows as $sourceRow) {
            [$row, $sourceHeaders] = $this->normalizeHeaders($sourceRow);
            if (!array_key_exists('sku', $row)) {
                throw new ImportException('import.missing_sku_header');
            }
            foreach (array_keys($row) as $header) {
                if ($header !== 'sku' && !isset($allowedFields[$header])) {
                    throw new ImportException('import.unknown_header');
                }
            }

            $sku = trim($row['sku']);
            if (preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/', $sku) !== 1) {
                throw new ImportException('import.invalid_sku');
            }
            if (isset($seenSkus[$sku])) {
                throw new ImportException('import.duplicate_sku');
            }
            $seenSkus[$sku] = true;

            $productId = $this->store->findProductIdBySku($sku);
            if ($productId === null) {
                throw new ImportException('import.unknown_sku');
            }

            $values = [];
            foreach ($allowedFields as $field => $_definition) {
                if (!array_key_exists($field, $row) || trim($row[$field]) === '') {
                    continue;
                }
                try {
                    $sourceHeader = $sourceHeaders[$field];
                    $value = $this->normalizeFriendlyValue($sourceHeader, $field, $row[$field]);
                    $values[$field] = MetadataDefinition::sanitize($field, $value);
                } catch (InvalidArgumentException $exception) {
                    throw new ImportException('import.invalid_' . $field, 0, $exception);
                }
            }
            $prepared[] = [$productId, $values];
        }

        foreach ($prepared as [$productId, $values]) {
            foreach ($values as $field => $value) {
                $this->store->update($productId, $field, $value);
            }
        }

        return count($prepared);
    }

    /**
     * @param array<string, string> $row
     * @return array{array<string, string>, array<string, string>}
     */
    private function normalizeHeaders(array $row): array
    {
        $normalized = [];
        $sourceHeaders = [];

        foreach ($row as $sourceHeader => $value) {
            $canonicalHeader = self::HEADER_ALIASES[$sourceHeader] ?? $sourceHeader;
            if (array_key_exists($canonicalHeader, $normalized)) {
                throw new ImportException('import.duplicate_field');
            }
            $normalized[$canonicalHeader] = $value;
            $sourceHeaders[$canonicalHeader] = $sourceHeader;
        }

        return [$normalized, $sourceHeaders];
    }

    private function normalizeFriendlyValue(string $sourceHeader, string $field, string $value): string
    {
        if (isset(self::FRIENDLY_UNIT_HEADERS[$sourceHeader])) {
            return (string) $this->valueAdapter->toStorage($field, $value);
        }
        if (isset(self::FRIENDLY_BOOLEAN_HEADERS[$sourceHeader])) {
            return match (strtolower(trim($value))) {
                'tak' => '1',
                'nie' => '0',
                default => $value,
            };
        }

        return $value;
    }
}
