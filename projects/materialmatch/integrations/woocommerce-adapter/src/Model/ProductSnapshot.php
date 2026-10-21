<?php

declare(strict_types=1);

namespace MaterialMatch\WooCommerce\Model;

final class ProductSnapshot
{
    public function __construct(
        public readonly int $productId,
        public readonly string $sku,
        public readonly bool $purchasable,
        public readonly bool $inStock,
        public readonly bool $hasPrice,
        public readonly ?int $maximumQuantity = null,
    ) {
    }
}
