<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Storefront;

use InvalidArgumentException;
use RuntimeException;

/**
 * A deliberately small PHP implementation of the published, typed rule model.
 *
 * It accepts only normalized integer measurement facts, never formulas or
 * executable configuration. The active configuration has already passed the
 * strict ConfigurationValidator before it reaches this boundary. This class is
 * nevertheless defensive because cart input is public and untrusted.
 */
final class TrustedCartCalculator
{
    private const MAX_DIMENSION_MM = 1_000_000;
    private const MAX_AREA_MM2 = 1_000_000_000_000;
    private const MAX_ROOMS = 1_000;
    private const MAX_ITEMS_PER_ROOM = 1_000;
    private const MAX_OPTIONAL_SELECTIONS = 10_000;
    private const ID_PATTERN = '/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/D';

    /**
     * @param array<string, mixed> $configuration
     * @param array<string, mixed> $input
     * @return list<array{sku: string, quantity: int}>
     */
    public function calculate(array $configuration, array $input): array
    {
        $normalized = $this->normalizeInput($input);
        $variantId = $normalized['variantId'] ?? $configuration['defaultVariantId'];
        $mainVariant = $this->mainVariant($configuration, $variantId);
        $coverage = $mainVariant['package']['coverageAreaSquareMillimeters'] ?? null;
        if (!is_int($coverage) || $coverage < 1) {
            throw new RuntimeException('Active main-product variant has no package coverage.');
        }

        $totals = $this->totals($normalized['project']['rooms']);
        $waste = $this->wasteBasisPoints($configuration['wasteRule'], $normalized['project']);
        $wasteArea = $this->ceilDiv($totals['area'] * $waste, 10_000);
        $grossArea = $totals['area'] + $wasteArea;
        $mainPackages = $this->applyMinimumAndMultiple(
            $this->ceilDiv($grossArea, $coverage),
            $mainVariant['package']['minimumPackages'],
            $mainVariant['package']['orderMultiple'],
        );

        $lines = [[
            'sku' => $mainVariant['sku'],
            'quantity' => $mainPackages,
        ]];
        $selectedOptional = array_fill_keys($normalized['selectedOptionalAccessoryIds'], true);

        foreach ($configuration['accessoryRules'] as $rule) {
            $accessory = $this->accessory($configuration['accessories'], $rule['accessoryProductId']);
            if ($accessory === null || $rule['status'] === 'incompatible') {
                continue;
            }
            $isOptional = $rule['status'] === 'optional'
                || $rule['status'] === 'alternative'
                || $rule['calculation']['kind'] === 'optional';
            if ($isOptional && !isset($selectedOptional[$accessory['id']])) {
                continue;
            }
            if (!$this->isCompatible($configuration, $accessory, $mainVariant)) {
                continue;
            }

            $rawQuantity = $this->accessoryQuantity($rule['calculation'], $totals, $grossArea, $mainPackages);
            $quantity = $this->applyMinimumAndMultiple(
                $rawQuantity,
                $accessory['variant']['package']['minimumPackages'],
                $accessory['variant']['package']['orderMultiple'],
            );
            if ($quantity > 0) {
                $lines[] = ['sku' => $accessory['variant']['sku'], 'quantity' => $quantity];
            }
        }

        return $lines;
    }

    /** @param array<string, mixed> $input
     * @return array{project: array{id: string, rooms: list<array<string, mixed>>, wasteBasisPoints?: int, installationPattern?: string}, variantId?: string, selectedOptionalAccessoryIds: list<string>}
     */
    private function normalizeInput(array $input): array
    {
        $this->exactKeys($input, ['project'], ['variantId', 'selectedOptionalAccessoryIds']);
        $project = $this->object($input['project']);
        $this->exactKeys($project, ['id', 'rooms'], ['wasteBasisPoints', 'installationPattern']);
        $this->id($project['id']);
        $rooms = $this->list($project['rooms'], 1, self::MAX_ROOMS);
        foreach ($rooms as $room) {
            $this->normalizeRoom($this->object($room));
        }
        if (array_key_exists('wasteBasisPoints', $project)) {
            $this->integer($project['wasteBasisPoints'], 0, 10_000);
        }
        if (array_key_exists('installationPattern', $project)) {
            $this->string($project['installationPattern'], 1, 80);
        }
        if (array_key_exists('variantId', $input)) {
            $this->id($input['variantId']);
        }
        $selected = [];
        if (array_key_exists('selectedOptionalAccessoryIds', $input)) {
            $selected = $this->list($input['selectedOptionalAccessoryIds'], 0, self::MAX_OPTIONAL_SELECTIONS);
            foreach ($selected as $id) {
                $this->id($id);
            }
            if (count(array_unique($selected, SORT_STRING)) !== count($selected)) {
                throw new InvalidArgumentException('Optional selections must be unique.');
            }
        }

        return [
            'project' => [
                'id' => $project['id'],
                'rooms' => $rooms,
                ...(array_key_exists('wasteBasisPoints', $project) ? ['wasteBasisPoints' => $project['wasteBasisPoints']] : []),
                ...(array_key_exists('installationPattern', $project) ? ['installationPattern' => $project['installationPattern']] : []),
            ],
            ...(array_key_exists('variantId', $input) ? ['variantId' => $input['variantId']] : []),
            'selectedOptionalAccessoryIds' => $selected,
        ];
    }

    /** @param array<string, mixed> $room */
    private function normalizeRoom(array $room): void
    {
        $this->exactKeys($room, ['id', 'geometry', 'excludedAreas', 'doors'], ['name', 'corners']);
        $this->id($room['id']);
        if (array_key_exists('name', $room)) {
            $this->string($room['name'], 1, 200);
        }
        $geometry = $this->object($room['geometry']);
        if (($geometry['kind'] ?? null) === 'rectangle') {
            $this->exactKeys($geometry, ['kind', 'widthMillimeters', 'lengthMillimeters'], []);
            $this->integer($geometry['widthMillimeters'], 1, self::MAX_DIMENSION_MM);
            $this->integer($geometry['lengthMillimeters'], 1, self::MAX_DIMENSION_MM);
        } elseif (($geometry['kind'] ?? null) === 'manualArea') {
            $this->exactKeys($geometry, ['kind', 'areaSquareMillimeters'], ['perimeterMillimeters']);
            $this->integer($geometry['areaSquareMillimeters'], 1, self::MAX_AREA_MM2);
            if (array_key_exists('perimeterMillimeters', $geometry)) {
                $this->integer($geometry['perimeterMillimeters'], 0, self::MAX_DIMENSION_MM * 4);
            }
        } else {
            throw new InvalidArgumentException('Unsupported room geometry.');
        }
        foreach ($this->list($room['excludedAreas'], 0, self::MAX_ITEMS_PER_ROOM) as $area) {
            $area = $this->object($area);
            $this->exactKeys($area, ['id', 'areaSquareMillimeters'], []);
            $this->id($area['id']);
            $this->integer($area['areaSquareMillimeters'], 1, self::MAX_AREA_MM2);
        }
        foreach ($this->list($room['doors'], 0, self::MAX_ITEMS_PER_ROOM) as $door) {
            $door = $this->object($door);
            $this->exactKeys($door, ['id', 'widthMillimeters'], []);
            $this->id($door['id']);
            $this->integer($door['widthMillimeters'], 1, self::MAX_DIMENSION_MM);
        }
        if (array_key_exists('corners', $room)) {
            $corners = $this->object($room['corners']);
            $this->exactKeys($corners, ['internal', 'external'], []);
            $this->integer($corners['internal'], 0, 100_000);
            $this->integer($corners['external'], 0, 100_000);
        }
    }

    /** @param list<array<string, mixed>> $rooms
     * @return array{area: int, perimeter: int, doorWidth: int, rooms: int, doors: int, internalCorners: int, externalCorners: int}
     */
    private function totals(array $rooms): array
    {
        $totals = ['area' => 0, 'perimeter' => 0, 'doorWidth' => 0, 'rooms' => count($rooms), 'doors' => 0, 'internalCorners' => 0, 'externalCorners' => 0];
        foreach ($rooms as $room) {
            $geometry = $room['geometry'];
            $grossArea = $geometry['kind'] === 'rectangle'
                ? $geometry['widthMillimeters'] * $geometry['lengthMillimeters']
                : $geometry['areaSquareMillimeters'];
            $perimeter = $geometry['kind'] === 'rectangle'
                ? 2 * ($geometry['widthMillimeters'] + $geometry['lengthMillimeters'])
                : ($geometry['perimeterMillimeters'] ?? 0);
            $excluded = 0;
            foreach ($room['excludedAreas'] as $area) {
                $excluded += $area['areaSquareMillimeters'];
            }
            if ($excluded >= $grossArea) {
                throw new InvalidArgumentException('Excluded areas must be smaller than a room.');
            }
            $doors = 0;
            foreach ($room['doors'] as $door) {
                $doors += $door['widthMillimeters'];
            }
            $totals['area'] += $grossArea - $excluded;
            $totals['perimeter'] += $perimeter;
            $totals['doorWidth'] += $doors;
            $totals['doors'] += count($room['doors']);
            $totals['internalCorners'] += $room['corners']['internal'] ?? 0;
            $totals['externalCorners'] += $room['corners']['external'] ?? 0;
        }
        return $totals;
    }

    /** @param array<string, mixed> $wasteRule
     * @param array<string, mixed> $project
     */
    private function wasteBasisPoints(array $wasteRule, array $project): int
    {
        $patternWaste = isset($project['installationPattern'])
            ? ($wasteRule['patternOverrides'][$project['installationPattern']] ?? null)
            : null;
        $waste = $project['wasteBasisPoints'] ?? $patternWaste ?? $wasteRule['defaultBasisPoints'];
        if (!is_int($waste) || $waste < $wasteRule['minimumBasisPoints'] || $waste > $wasteRule['maximumBasisPoints']) {
            throw new InvalidArgumentException('Waste is outside the configured range.');
        }
        return $waste;
    }

    /** @param array<string, mixed> $configuration
     * @return array<string, mixed>
     */
    private function mainVariant(array $configuration, string $variantId): array
    {
        foreach ($configuration['mainProduct']['variants'] as $variant) {
            if ($variant['id'] === $variantId) {
                return $variant;
            }
        }
        throw new InvalidArgumentException('Unknown main-product variant.');
    }

    /** @param list<array<string, mixed>> $accessories
     * @return array<string, mixed>|null
     */
    private function accessory(array $accessories, string $id): ?array
    {
        foreach ($accessories as $accessory) {
            if ($accessory['id'] === $id) {
                return $accessory;
            }
        }
        return null;
    }

    /** @param array<string, mixed> $configuration
     * @param array<string, mixed> $accessory
     * @param array<string, mixed> $mainVariant
     */
    private function isCompatible(array $configuration, array $accessory, array $mainVariant): bool
    {
        $directRules = array_values(array_filter(
            $configuration['compatibilityRules'],
            static fn (array $rule): bool => $rule['sourceProductId'] === $configuration['mainProduct']['id']
                && (!isset($rule['targetProductId']) || $rule['targetProductId'] === $accessory['id']),
        ));
        foreach ($directRules as $rule) {
            if ($rule['status'] === 'incompatible') {
                return false;
            }
        }
        $tags = array_fill_keys($accessory['variant']['compatibilityTags'], true);
        $exclusions = array_fill_keys($accessory['variant']['exclusionTags'], true);
        foreach ($mainVariant['compatibilityTags'] as $tag) {
            if (isset($exclusions[$tag])) {
                return false;
            }
        }
        foreach ($mainVariant['exclusionTags'] as $tag) {
            if (isset($tags[$tag])) {
                return false;
            }
        }
        foreach ($directRules as $rule) {
            foreach ($rule['requiredTags'] ?? [] as $tag) {
                if (!isset($tags[$tag])) {
                    return false;
                }
            }
            foreach ($rule['excludedTags'] ?? [] as $tag) {
                if (isset($tags[$tag])) {
                    return false;
                }
            }
        }
        return true;
    }

    /** @param array<string, mixed> $calculation
     * @param array{area: int, perimeter: int, doorWidth: int, rooms: int, doors: int, internalCorners: int, externalCorners: int} $totals
     */
    private function accessoryQuantity(array $calculation, array $totals, int $grossArea, int $mainPackages): int
    {
        return match ($calculation['kind']) {
            'byArea' => $this->ceilDiv($grossArea, $calculation['coverageAreaSquareMillimeters']),
            'byPerimeter' => $this->ceilDiv(
                $calculation['subtractDoorWidths'] ? max(0, $totals['perimeter'] - $totals['doorWidth']) : $totals['perimeter'],
                $calculation['itemLengthMillimeters'],
            ),
            'byRoomCount' => $totals['rooms'] * $calculation['unitsPerRoom'],
            'byDoorCount' => $totals['doors'] * $calculation['unitsPerDoor'],
            'byCornerCount' => ($calculation['cornerType'] === 'internal' ? $totals['internalCorners'] : $totals['externalCorners']) * $calculation['unitsPerCorner'],
            'byMainPackages' => $this->ceilDiv($mainPackages, $calculation['mainPackagesPerUnit']),
            'fixed' => $calculation['quantity'],
            'optional' => $calculation['defaultQuantity'],
            default => throw new RuntimeException('Unsupported published accessory rule.'),
        };
    }

    private function ceilDiv(int $dividend, int $divisor): int
    {
        if ($dividend < 0 || $divisor < 1) {
            throw new RuntimeException('Invalid integer division.');
        }
        return intdiv($dividend, $divisor) + ($dividend % $divisor === 0 ? 0 : 1);
    }

    private function applyMinimumAndMultiple(int $quantity, int $minimum, int $multiple): int
    {
        return $this->ceilDiv(max($quantity, $minimum), $multiple) * $multiple;
    }

    /** @param array<string, mixed> $value
     * @param list<string> $required
     * @param list<string> $optional
     */
    private function exactKeys(array $value, array $required, array $optional): void
    {
        foreach ($required as $key) {
            if (!array_key_exists($key, $value)) {
                throw new InvalidArgumentException('Missing calculation input field.');
            }
        }
        $allowed = array_fill_keys([...$required, ...$optional], true);
        foreach (array_keys($value) as $key) {
            if (!is_string($key) || !isset($allowed[$key])) {
                throw new InvalidArgumentException('Unknown calculation input field.');
            }
        }
    }

    /** @return array<string, mixed> */
    private function object(mixed $value): array
    {
        if (!is_array($value) || array_is_list($value)) {
            throw new InvalidArgumentException('Calculation input must contain objects.');
        }
        return $value;
    }

    /** @return list<mixed> */
    private function list(mixed $value, int $minimum, int $maximum): array
    {
        if (!is_array($value) || !array_is_list($value) || count($value) < $minimum || count($value) > $maximum) {
            throw new InvalidArgumentException('Calculation input collection is invalid.');
        }
        return $value;
    }

    private function integer(mixed $value, int $minimum, int $maximum): int
    {
        if (!is_int($value) || $value < $minimum || $value > $maximum) {
            throw new InvalidArgumentException('Calculation input integer is invalid.');
        }
        return $value;
    }

    private function string(mixed $value, int $minimum, int $maximum): string
    {
        if (!is_string($value) || strlen($value) < $minimum || strlen($value) > $maximum || preg_match('//u', $value) !== 1) {
            throw new InvalidArgumentException('Calculation input string is invalid.');
        }
        return $value;
    }

    private function id(mixed $value): string
    {
        $id = $this->string($value, 1, 128);
        if (preg_match(self::ID_PATTERN, $id) !== 1) {
            throw new InvalidArgumentException('Calculation input identifier is invalid.');
        }
        return $id;
    }
}
