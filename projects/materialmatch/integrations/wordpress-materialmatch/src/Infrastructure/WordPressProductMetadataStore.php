<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Infrastructure;

use MaterialMatch\WordPress\Contract\ProductMetadataStore;
use MaterialMatch\WordPress\Product\MetadataDefinition;
use RuntimeException;

final class WordPressProductMetadataStore implements ProductMetadataStore
{
    public function findProductIdBySku(string $sku): ?int
    {
        if (!function_exists('wc_get_product_id_by_sku')) {
            return null;
        }

        $productId = (int) wc_get_product_id_by_sku($sku);
        $postType = get_post_type($productId);
        if ($productId < 1 || ($postType !== 'product' && $postType !== 'product_variation')) {
            return null;
        }

        return $productId;
    }

    public function update(int $productId, string $field, bool|int|string|array $value): void
    {
        $metaKey = MetadataDefinition::metaKey($field);
        $serialized = $this->serializeValue($value);
        update_post_meta(
            $productId,
            $metaKey,
            $serialized,
        );

        if ((string) get_post_meta($productId, $metaKey, true) !== $serialized) {
            throw new RuntimeException('MaterialMatch metadata write could not be verified.');
        }
    }

    /** @param bool|int|string|list<string> $value */
    private function serializeValue(bool|int|string|array $value): string
    {
        if (is_array($value)) {
            return (string) wp_json_encode($value);
        }
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        return (string) $value;
    }
}
