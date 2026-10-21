<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Admin;

use InvalidArgumentException;

final class ProductMetadataValueAdapter
{
    private const SCALES = [
        'coverage_per_package_mm2' => 1_000_000,
        'default_waste_basis_points' => 100,
        'minimum_waste_basis_points' => 100,
        'maximum_waste_basis_points' => 100,
    ];

    public function usesFriendlyUnit(string $field): bool
    {
        return isset(self::SCALES[$field]);
    }

    public function toDisplay(string $field, string $stored): string
    {
        if (!$this->usesFriendlyUnit($field) || $stored === '') {
            return $stored;
        }
        if (!preg_match('/^\d+$/D', $stored)) {
            throw new InvalidArgumentException('Stored metadata is not an integer.');
        }

        $scale = self::SCALES[$field];
        $whole = intdiv((int) $stored, $scale);
        $fraction = str_pad((string) ((int) $stored % $scale), strlen((string) $scale) - 1, '0', STR_PAD_LEFT);
        $fraction = rtrim($fraction, '0');

        return $fraction === '' ? (string) $whole : $whole . ',' . $fraction;
    }

    public function toStorage(string $field, mixed $submitted): mixed
    {
        if (!$this->usesFriendlyUnit($field)) {
            return $submitted;
        }

        $value = str_replace(',', '.', trim((string) $submitted));
        $decimalPlaces = strlen((string) self::SCALES[$field]) - 1;
        if (!preg_match('/^(\d+)(?:\.(\d{1,' . $decimalPlaces . '}))?$/D', $value, $matches)) {
            throw new InvalidArgumentException('Expected a positive decimal value.');
        }
        $fraction = str_pad($matches[2] ?? '', $decimalPlaces, '0');
        $scaled = ((int) $matches[1] * self::SCALES[$field]) + (int) $fraction;

        return (string) $scaled;
    }
}
