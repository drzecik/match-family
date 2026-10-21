<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Configuration;

use MaterialMatch\WordPress\Security\ImportException;

final class ConfigurationValidator
{
    private const MAX_DIMENSION_MM = 1_000_000;
    private const MAX_AREA_MM2 = 1_000_000_000_000;
    private const MAX_PRICE_MINOR_UNITS = 1_000_000_000_000;
    private const MAX_COLLECTION = 10_000;
    private const ID_PATTERN = '/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/D';
    private const TRANSLATION_KEY_PATTERN = '/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/D';
    private const TAG_PATTERN = '/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/D';

    /** @param array<string, mixed> $configuration */
    public function validate(array $configuration): void
    {
        $this->exactKeys($configuration, [
            'id', 'version', 'locale', 'currency', 'mainProduct', 'defaultVariantId',
            'wasteRule', 'accessories', 'accessoryRules', 'compatibilityRules',
        ], [], '$');
        $this->id($configuration['id'], '$.id');
        $this->version($this->object($configuration['version'], '$.version'), '$.version');
        $this->string($configuration['locale'], 2, 35, null, '$.locale');
        $currency = $this->string($configuration['currency'], 3, 3, '/^[A-Z]{3}$/D', '$.currency');

        $mainProduct = $this->object($configuration['mainProduct'], '$.mainProduct');
        $mainProductId = $this->materialProduct($mainProduct, $currency, '$.mainProduct');
        $variantIds = [];
        $skus = [];
        foreach ($this->list($mainProduct['variants'], 1, self::MAX_COLLECTION, '$.mainProduct.variants') as $index => $variant) {
            $variant = $this->object($variant, "$.mainProduct.variants[$index]");
            $variantIds[] = (string) $variant['id'];
            $skus[] = (string) $variant['sku'];
        }
        $this->unique($variantIds, '$.mainProduct.variants.id');
        $this->unique($skus, '$.mainProduct.variants.sku');

        $defaultVariantId = $this->id($configuration['defaultVariantId'], '$.defaultVariantId');
        if (!in_array($defaultVariantId, $variantIds, true)) {
            $this->fail('configuration.unknown_default_variant', '$.defaultVariantId');
        }
        $this->wasteRule($this->object($configuration['wasteRule'], '$.wasteRule'), '$.wasteRule');

        $accessoryIds = [];
        foreach ($this->list($configuration['accessories'], 0, self::MAX_COLLECTION, '$.accessories') as $index => $accessory) {
            $path = "$.accessories[$index]";
            $accessory = $this->object($accessory, $path);
            $this->exactKeys($accessory, ['id', 'nameKey', 'variant'], [], $path);
            $accessoryIds[] = $this->id($accessory['id'], "$path.id");
            $this->translationKey($accessory['nameKey'], "$path.nameKey");
            $variant = $this->object($accessory['variant'], "$path.variant");
            $this->variant($variant, $currency, "$path.variant");
            $variantIds[] = (string) $variant['id'];
            $skus[] = (string) $variant['sku'];
        }
        $this->unique($accessoryIds, '$.accessories.id');
        $this->unique($variantIds, '$.variants.id');
        $this->unique($skus, '$.variants.sku');

        foreach ($this->list($configuration['accessoryRules'], 0, self::MAX_COLLECTION, '$.accessoryRules') as $index => $rule) {
            $path = "$.accessoryRules[$index]";
            $rule = $this->object($rule, $path);
            $this->accessoryRule($rule, $path);
            if (!in_array($rule['accessoryProductId'], $accessoryIds, true)) {
                $this->fail('configuration.unknown_accessory_reference', "$path.accessoryProductId");
            }
        }

        $knownProductIds = [$mainProductId, ...$accessoryIds];
        foreach ($this->list($configuration['compatibilityRules'], 0, self::MAX_COLLECTION, '$.compatibilityRules') as $index => $rule) {
            $path = "$.compatibilityRules[$index]";
            $rule = $this->object($rule, $path);
            $this->compatibilityRule($rule, $path);
            if (!in_array($rule['sourceProductId'], $knownProductIds, true)
                || (array_key_exists('targetProductId', $rule) && !in_array($rule['targetProductId'], $knownProductIds, true))) {
                $this->fail('configuration.unknown_compatibility_reference', $path);
            }
        }
    }

    /** @param array<string, mixed> $value */
    private function version(array $value, string $path): void
    {
        $this->exactKeys($value, ['schemaVersion', 'revision', 'createdAt'], [], $path);
        if ($this->integer($value['schemaVersion'], 1, 1_000_000, "$path.schemaVersion") !== 1) {
            $this->fail('configuration.unsupported_schema_version', "$path.schemaVersion");
        }
        $this->integer($value['revision'], 0, 1_000_000_000, "$path.revision");
        $createdAt = $this->string($value['createdAt'], 1, 100, null, "$path.createdAt");
        if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/D', $createdAt) !== 1
            || strtotime($createdAt) === false) {
            $this->fail('configuration.invalid_datetime', "$path.createdAt");
        }
    }

    /** @param array<string, mixed> $value */
    private function materialProduct(array $value, string $currency, string $path): string
    {
        $this->exactKeys($value, ['id', 'nameKey', 'attributes', 'variants'], [], $path);
        $id = $this->id($value['id'], "$path.id");
        $this->translationKey($value['nameKey'], "$path.nameKey");
        $this->attributes($this->object($value['attributes'], "$path.attributes"), "$path.attributes");
        foreach ($this->list($value['variants'], 1, self::MAX_COLLECTION, "$path.variants") as $index => $variant) {
            $this->variant($this->object($variant, "$path.variants[$index]"), $currency, "$path.variants[$index]");
        }

        return $id;
    }

    /** @param array<string, mixed> $value */
    private function variant(array $value, string $currency, string $path): void
    {
        $this->exactKeys($value, [
            'id', 'sku', 'nameKey', 'package', 'available', 'materialType',
            'compatibilityTags', 'exclusionTags',
        ], ['price', 'productFamily', 'thicknessMillimeters', 'grade', 'installationMethod'], $path);
        $this->id($value['id'], "$path.id");
        $this->string($value['sku'], 1, 128, null, "$path.sku");
        $this->translationKey($value['nameKey'], "$path.nameKey");
        $this->package($this->object($value['package'], "$path.package"), "$path.package");
        $this->boolean($value['available'], "$path.available");
        $this->attributes($value, $path, true);
        if (array_key_exists('price', $value)) {
            $price = $this->object($value['price'], "$path.price");
            $this->exactKeys($price, ['minorUnits', 'currency'], [], "$path.price");
            $this->integer($price['minorUnits'], 0, self::MAX_PRICE_MINOR_UNITS, "$path.price.minorUnits");
            $priceCurrency = $this->string($price['currency'], 3, 3, '/^[A-Z]{3}$/D', "$path.price.currency");
            if ($priceCurrency !== $currency) {
                $this->fail('configuration.price_currency_mismatch', "$path.price.currency");
            }
        }
    }

    /** @param array<string, mixed> $value */
    private function attributes(array $value, string $path, bool $embedded = false): void
    {
        if (!$embedded) {
            $this->exactKeys($value, ['materialType', 'compatibilityTags', 'exclusionTags'], [
                'productFamily', 'thicknessMillimeters', 'grade', 'installationMethod',
            ], $path);
        }
        $this->tag($value['materialType'], "$path.materialType");
        foreach (['productFamily', 'grade', 'installationMethod'] as $field) {
            if (array_key_exists($field, $value)) {
                $this->tag($value[$field], "$path.$field");
            }
        }
        if (array_key_exists('thicknessMillimeters', $value)) {
            $this->integer($value['thicknessMillimeters'], 1, self::MAX_DIMENSION_MM, "$path.thicknessMillimeters");
        }
        foreach (['compatibilityTags', 'exclusionTags'] as $field) {
            foreach ($this->list($value[$field], 0, 100, "$path.$field") as $index => $tag) {
                $this->tag($tag, "$path.$field[$index]");
            }
        }
    }

    /** @param array<string, mixed> $value */
    private function package(array $value, string $path): void
    {
        $this->exactKeys($value, ['saleUnit', 'piecesPerPackage', 'minimumPackages', 'orderMultiple', 'openedPackagesSold'], [
            'coverageAreaSquareMillimeters', 'itemAreaSquareMillimeters', 'itemLengthMillimeters',
        ], $path);
        $this->oneOf($value['saleUnit'], ['package', 'piece', 'roll'], "$path.saleUnit");
        foreach (['coverageAreaSquareMillimeters', 'itemAreaSquareMillimeters'] as $field) {
            if (array_key_exists($field, $value)) {
                $this->integer($value[$field], 1, self::MAX_AREA_MM2, "$path.$field");
            }
        }
        if (array_key_exists('itemLengthMillimeters', $value)) {
            $this->integer($value['itemLengthMillimeters'], 1, self::MAX_DIMENSION_MM, "$path.itemLengthMillimeters");
        }
        $this->integer($value['piecesPerPackage'], 1, 100_000, "$path.piecesPerPackage");
        $this->integer($value['minimumPackages'], 0, 1_000_000, "$path.minimumPackages");
        $this->integer($value['orderMultiple'], 1, 1_000_000, "$path.orderMultiple");
        $this->boolean($value['openedPackagesSold'], "$path.openedPackagesSold");
    }

    /** @param array<string, mixed> $value */
    private function wasteRule(array $value, string $path): void
    {
        $this->exactKeys($value, ['defaultBasisPoints', 'minimumBasisPoints', 'maximumBasisPoints'], ['patternOverrides'], $path);
        $minimum = $this->integer($value['minimumBasisPoints'], 0, 10_000, "$path.minimumBasisPoints");
        $default = $this->integer($value['defaultBasisPoints'], 0, 10_000, "$path.defaultBasisPoints");
        $maximum = $this->integer($value['maximumBasisPoints'], 0, 10_000, "$path.maximumBasisPoints");
        if ($minimum > $default || $default > $maximum) {
            $this->fail('configuration.invalid_waste_range', $path);
        }
        if (array_key_exists('patternOverrides', $value)) {
            $overrides = $this->object($value['patternOverrides'], "$path.patternOverrides");
            foreach ($overrides as $pattern => $points) {
                $this->string($pattern, 1, 80, null, "$path.patternOverrides.key");
                $points = $this->integer($points, 0, 10_000, "$path.patternOverrides.$pattern");
                if ($points < $minimum || $points > $maximum) {
                    $this->fail('configuration.invalid_waste_override', "$path.patternOverrides.$pattern");
                }
            }
        }
    }

    /** @param array<string, mixed> $value */
    private function accessoryRule(array $value, string $path): void
    {
        $this->exactKeys($value, ['id', 'accessoryProductId', 'status', 'calculation'], ['alternativeGroup'], $path);
        $this->id($value['id'], "$path.id");
        $this->id($value['accessoryProductId'], "$path.accessoryProductId");
        $this->relationStatus($value['status'], "$path.status");
        if (array_key_exists('alternativeGroup', $value)) {
            $this->id($value['alternativeGroup'], "$path.alternativeGroup");
        }
        $this->accessoryCalculation($this->object($value['calculation'], "$path.calculation"), "$path.calculation");
    }

    /** @param array<string, mixed> $value */
    private function accessoryCalculation(array $value, string $path): void
    {
        if (!isset($value['kind']) || !is_string($value['kind'])) {
            $this->fail('configuration.invalid_rule', "$path.kind");
        }
        $definitions = [
            'byArea' => [['kind', 'coverageAreaSquareMillimeters'], [], 'coverageAreaSquareMillimeters', 1, self::MAX_AREA_MM2],
            'byPerimeter' => [['kind', 'itemLengthMillimeters', 'subtractDoorWidths'], [], 'itemLengthMillimeters', 1, self::MAX_DIMENSION_MM],
            'byRoomCount' => [['kind', 'unitsPerRoom'], [], 'unitsPerRoom', 1, 100_000],
            'byDoorCount' => [['kind', 'unitsPerDoor'], [], 'unitsPerDoor', 1, 100_000],
            'byMainPackages' => [['kind', 'mainPackagesPerUnit'], [], 'mainPackagesPerUnit', 1, 100_000],
            'fixed' => [['kind', 'quantity'], [], 'quantity', 0, 1_000_000],
            'optional' => [['kind', 'defaultQuantity'], [], 'defaultQuantity', 0, 1_000_000],
        ];
        if ($value['kind'] === 'byCornerCount') {
            $this->exactKeys($value, ['kind', 'cornerType', 'unitsPerCorner'], [], $path);
            $this->oneOf($value['cornerType'], ['internal', 'external'], "$path.cornerType");
            $this->integer($value['unitsPerCorner'], 1, 100_000, "$path.unitsPerCorner");
            return;
        }
        if (!isset($definitions[$value['kind']])) {
            $this->fail('configuration.invalid_rule_kind', "$path.kind");
        }
        [$required, $optional, $numericField, $minimum, $maximum] = $definitions[$value['kind']];
        $this->exactKeys($value, $required, $optional, $path);
        $this->integer($value[$numericField], $minimum, $maximum, "$path.$numericField");
        if ($value['kind'] === 'byPerimeter') {
            $this->boolean($value['subtractDoorWidths'], "$path.subtractDoorWidths");
        }
    }

    /** @param array<string, mixed> $value */
    private function compatibilityRule(array $value, string $path): void
    {
        $this->exactKeys($value, ['id', 'sourceProductId', 'status'], ['targetProductId', 'requiredTags', 'excludedTags'], $path);
        $this->id($value['id'], "$path.id");
        $this->id($value['sourceProductId'], "$path.sourceProductId");
        if (array_key_exists('targetProductId', $value)) {
            $this->id($value['targetProductId'], "$path.targetProductId");
        }
        $this->relationStatus($value['status'], "$path.status");
        foreach (['requiredTags', 'excludedTags'] as $field) {
            if (!array_key_exists($field, $value)) {
                continue;
            }
            foreach ($this->list($value[$field], 0, 100, "$path.$field") as $index => $tag) {
                $this->tag($tag, "$path.$field[$index]");
            }
        }
    }

    private function relationStatus(mixed $value, string $path): void
    {
        $this->oneOf($value, ['required', 'recommended', 'optional', 'alternative', 'incompatible'], $path);
    }

    /** @param array<string, mixed> $value
     *  @param list<string> $required
     *  @param list<string> $optional
     */
    private function exactKeys(array $value, array $required, array $optional, string $path): void
    {
        foreach ($required as $key) {
            if (!array_key_exists($key, $value)) {
                $this->fail('configuration.missing_field', "$path.$key");
            }
        }
        $allowed = array_fill_keys([...$required, ...$optional], true);
        foreach (array_keys($value) as $key) {
            if (!is_string($key) || !isset($allowed[$key])) {
                $this->fail('configuration.unknown_field', $path . '.' . (string) $key);
            }
        }
    }

    /** @return array<string, mixed> */
    private function object(mixed $value, string $path): array
    {
        if (!is_array($value) || array_is_list($value)) {
            $this->fail('configuration.expected_object', $path);
        }
        return $value;
    }

    /** @return list<mixed> */
    private function list(mixed $value, int $minimum, int $maximum, string $path): array
    {
        if (!is_array($value) || !array_is_list($value) || count($value) < $minimum || count($value) > $maximum) {
            $this->fail('configuration.invalid_collection', $path);
        }
        return $value;
    }

    private function integer(mixed $value, int $minimum, int $maximum, string $path): int
    {
        if (!is_int($value) || $value < $minimum || $value > $maximum) {
            $this->fail('configuration.invalid_integer', $path);
        }
        return $value;
    }

    private function boolean(mixed $value, string $path): void
    {
        if (!is_bool($value)) {
            $this->fail('configuration.invalid_boolean', $path);
        }
    }

    private function string(mixed $value, int $minimum, int $maximum, ?string $pattern, string $path): string
    {
        if (!is_string($value) || strlen($value) < $minimum || strlen($value) > $maximum
            || !preg_match('//u', $value) || ($pattern !== null && preg_match($pattern, $value) !== 1)) {
            $this->fail('configuration.invalid_string', $path);
        }
        return $value;
    }

    private function id(mixed $value, string $path): string
    {
        return $this->string($value, 1, 128, self::ID_PATTERN, $path);
    }

    private function translationKey(mixed $value, string $path): void
    {
        $this->string($value, 1, 200, self::TRANSLATION_KEY_PATTERN, $path);
    }

    private function tag(mixed $value, string $path): void
    {
        $this->string($value, 1, 80, self::TAG_PATTERN, $path);
    }

    /** @param list<string> $allowed */
    private function oneOf(mixed $value, array $allowed, string $path): void
    {
        if (!is_string($value) || !in_array($value, $allowed, true)) {
            $this->fail('configuration.invalid_enum', $path);
        }
    }

    /** @param list<string> $values */
    private function unique(array $values, string $path): void
    {
        if (count($values) !== count(array_unique($values, SORT_STRING))) {
            $this->fail('configuration.duplicate_value', $path);
        }
    }

    private function fail(string $code, string $path): never
    {
        throw new ImportException($code . ':' . $path);
    }
}
