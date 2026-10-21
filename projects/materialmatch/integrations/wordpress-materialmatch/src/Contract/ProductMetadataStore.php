<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Contract;

interface ProductMetadataStore
{
    public function findProductIdBySku(string $sku): ?int;

    /** @param bool|int|string|list<string> $value */
    public function update(int $productId, string $field, bool|int|string|array $value): void;
}
