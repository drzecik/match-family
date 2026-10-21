<?php

declare(strict_types=1);

namespace MaterialMatch\WooCommerce\Contract;

use MaterialMatch\WooCommerce\Model\ProductSnapshot;

interface ProductCatalog
{
    public function findBySku(string $sku): ?ProductSnapshot;
}
