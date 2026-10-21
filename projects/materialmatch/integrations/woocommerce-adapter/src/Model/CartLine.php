<?php

declare(strict_types=1);

namespace MaterialMatch\WooCommerce\Model;

use InvalidArgumentException;

final class CartLine
{
    public const MAX_QUANTITY = 100000;

    public function __construct(
        public readonly string $sku,
        public readonly int $quantity,
    ) {
        if (
            $sku === ''
            || strlen($sku) > 128
            || preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/', $sku) !== 1
        ) {
            throw new InvalidArgumentException('SKU must contain between 1 and 128 bytes.');
        }

        if ($quantity < 1 || $quantity > self::MAX_QUANTITY) {
            throw new InvalidArgumentException('Quantity is outside the supported range.');
        }
    }
}
