<?php

declare(strict_types=1);

namespace MaterialMatch\WooCommerce\Infrastructure;

use MaterialMatch\WooCommerce\Contract\CartGateway;

final class WooCommerceCartGateway implements CartGateway
{
    public function add(int $productId, int $quantity): string|false
    {
        if (!function_exists('WC') || WC()->cart === null) {
            return false;
        }

        $product = function_exists('wc_get_product') ? wc_get_product($productId) : null;
        if (!$product) {
            return false;
        }

        $variationId = $product->is_type('variation') ? $productId : 0;
        $parentId = $variationId > 0 ? (int) $product->get_parent_id() : $productId;
        $variationAttributes = $variationId > 0 ? $product->get_variation_attributes() : [];

        return WC()->cart->add_to_cart(
            $parentId,
            $quantity,
            $variationId,
            $variationAttributes,
        );
    }
}
