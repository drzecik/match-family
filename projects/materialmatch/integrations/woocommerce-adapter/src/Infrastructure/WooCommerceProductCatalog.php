<?php

declare(strict_types=1);

namespace MaterialMatch\WooCommerce\Infrastructure;

use MaterialMatch\WooCommerce\Contract\ProductCatalog;
use MaterialMatch\WooCommerce\Model\ProductSnapshot;

final class WooCommerceProductCatalog implements ProductCatalog
{
    public function findBySku(string $sku): ?ProductSnapshot
    {
        if (!function_exists('wc_get_product_id_by_sku') || !function_exists('wc_get_product')) {
            return null;
        }

        $productId = (int) wc_get_product_id_by_sku($sku);
        if ($productId < 1) {
            return null;
        }

        $product = wc_get_product($productId);
        if (!$product || (string) $product->get_sku() !== $sku) {
            return null;
        }

        $maximumQuantity = null;
        if ((bool) $product->is_sold_individually()) {
            $maximumQuantity = 1;
        } elseif ((bool) $product->managing_stock() && !(bool) $product->backorders_allowed()) {
            $stockQuantity = $product->get_stock_quantity();
            $maximumQuantity = is_numeric($stockQuantity) ? max(0, (int) $stockQuantity) : 0;
        }

        return new ProductSnapshot(
            $productId,
            (string) $product->get_sku(),
            (bool) $product->is_purchasable(),
            (bool) $product->is_in_stock(),
            $product->get_price() !== '',
            $maximumQuantity,
        );
    }
}
