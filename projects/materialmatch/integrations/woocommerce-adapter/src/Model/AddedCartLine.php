<?php

declare(strict_types=1);

namespace MaterialMatch\WooCommerce\Model;

final class AddedCartLine
{
    public function __construct(
        public readonly string $sku,
        public readonly int $quantity,
        public readonly string $cartItemKey,
    ) {
    }

    /** @return array{sku: string, quantity: int, cartItemKey: string} */
    public function toArray(): array
    {
        return [
            'sku' => $this->sku,
            'quantity' => $this->quantity,
            'cartItemKey' => $this->cartItemKey,
        ];
    }
}
