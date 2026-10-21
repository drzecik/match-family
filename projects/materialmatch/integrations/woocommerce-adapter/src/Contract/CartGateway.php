<?php

declare(strict_types=1);

namespace MaterialMatch\WooCommerce\Contract;

interface CartGateway
{
    /**
     * Adds the exact requested quantity and returns a cart item key.
     * A false return means WooCommerce rejected the mutation.
     */
    public function add(int $productId, int $quantity): string|false;
}
