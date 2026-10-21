<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Product;

use InvalidArgumentException;

final class MetadataDefinition
{
    public const META_PREFIX = '_materialmatch_';

    /**
     * Values are stored on WooCommerce product posts. Area uses square millimetres,
     * waste uses basis points, and dimensions use millimetres to avoid floats.
     *
     * @return array<string, array{type: string, label: string, min?: int, max?: int}>
     */
    public static function fields(): array
    {
        return [
            'enabled' => ['type' => 'boolean', 'label' => 'MaterialMatch aktywny'],
            'material_type' => ['type' => 'identifier', 'label' => 'Typ materiału'],
            'product_family' => ['type' => 'identifier', 'label' => 'Rodzina produktowa'],
            'thickness_mm' => ['type' => 'integer', 'label' => 'Grubość (mm)', 'min' => 1, 'max' => 10000],
            'installation_method' => ['type' => 'identifier', 'label' => 'Sposób montażu'],
            'compatibility_tags' => ['type' => 'tags', 'label' => 'Tagi kompatybilności (oddzielone |)'],
            'exclusion_tags' => ['type' => 'tags', 'label' => 'Tagi wykluczające (oddzielone |)'],
            'coverage_per_package_mm2' => ['type' => 'integer', 'label' => 'Powierzchnia jednego opakowania (m²)', 'min' => 1, 'max' => 1000000000000],
            'pieces_per_package' => ['type' => 'integer', 'label' => 'Elementy w paczce', 'min' => 1, 'max' => 100000],
            'minimum_packages' => ['type' => 'integer', 'label' => 'Minimalna liczba paczek', 'min' => 1, 'max' => 100000],
            'order_multiple' => ['type' => 'integer', 'label' => 'Wielokrotność zamówienia', 'min' => 1, 'max' => 100000],
            'open_packages' => ['type' => 'boolean', 'label' => 'Sprzedaż otwartych paczek'],
            'default_waste_basis_points' => ['type' => 'integer', 'label' => 'Domyślny zapas (%)', 'min' => 0, 'max' => 10000],
            'minimum_waste_basis_points' => ['type' => 'integer', 'label' => 'Minimalny zapas (%)', 'min' => 0, 'max' => 10000],
            'maximum_waste_basis_points' => ['type' => 'integer', 'label' => 'Maksymalny zapas (%)', 'min' => 0, 'max' => 10000],
        ];
    }

    public static function metaKey(string $field): string
    {
        if (!isset(self::fields()[$field])) {
            throw new InvalidArgumentException('Unknown metadata field.');
        }

        return self::META_PREFIX . $field;
    }

    /** @return bool|int|string|list<string> */
    public static function sanitize(string $field, mixed $value): bool|int|string|array
    {
        $definition = self::fields()[$field] ?? null;
        if ($definition === null) {
            throw new InvalidArgumentException('Unknown metadata field.');
        }

        return match ($definition['type']) {
            'boolean' => self::sanitizeBoolean($value),
            'integer' => self::sanitizeInteger($value, $definition['min'], $definition['max']),
            'identifier' => self::sanitizeIdentifier((string) $value),
            'tags' => self::sanitizeTags((string) $value),
            default => throw new InvalidArgumentException('Unsupported metadata field type.'),
        };
    }

    private static function sanitizeBoolean(mixed $value): bool
    {
        if (in_array($value, [true, 1, '1', 'true', 'yes'], true)) {
            return true;
        }
        if (in_array($value, [false, 0, '0', 'false', 'no'], true)) {
            return false;
        }

        throw new InvalidArgumentException('Invalid boolean value.');
    }

    private static function sanitizeInteger(mixed $value, int $minimum, int $maximum): int
    {
        $stringValue = is_int($value) ? (string) $value : trim((string) $value);
        if (!preg_match('/^\d+$/', $stringValue)) {
            throw new InvalidArgumentException('Expected a non-negative integer without a decimal separator.');
        }

        $number = filter_var($stringValue, FILTER_VALIDATE_INT);
        if (!is_int($number) || $number < $minimum || $number > $maximum) {
            throw new InvalidArgumentException('Integer value is outside the supported range.');
        }

        return $number;
    }

    private static function sanitizeIdentifier(string $value): string
    {
        $normalized = strtolower(trim($value));
        if (!preg_match('/^[a-z0-9][a-z0-9_-]{0,63}$/', $normalized)) {
            throw new InvalidArgumentException('Identifier contains unsupported characters.');
        }

        return $normalized;
    }

    /** @return list<string> */
    private static function sanitizeTags(string $value): array
    {
        if (trim($value) === '') {
            return [];
        }

        $tags = [];
        foreach (explode('|', $value) as $tag) {
            $normalized = self::sanitizeIdentifier($tag);
            $tags[$normalized] = true;
        }

        if (count($tags) > 100) {
            throw new InvalidArgumentException('Too many compatibility tags.');
        }

        return array_keys($tags);
    }
}
