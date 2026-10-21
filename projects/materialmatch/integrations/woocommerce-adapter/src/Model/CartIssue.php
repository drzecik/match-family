<?php

declare(strict_types=1);

namespace MaterialMatch\WooCommerce\Model;

final class CartIssue
{
    public function __construct(
        public readonly string $code,
        public readonly string $sku,
        public readonly int $quantity,
        public readonly string $messageId,
    ) {
    }

    /** @return array{code: string, sku: string, quantity: int, messageId: string} */
    public function toArray(): array
    {
        return [
            'code' => $this->code,
            'sku' => $this->sku,
            'quantity' => $this->quantity,
            'messageId' => $this->messageId,
        ];
    }
}
