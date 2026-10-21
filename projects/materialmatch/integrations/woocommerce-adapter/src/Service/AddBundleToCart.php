<?php

declare(strict_types=1);

namespace MaterialMatch\WooCommerce\Service;

use InvalidArgumentException;
use MaterialMatch\WooCommerce\Contract\CartGateway;
use MaterialMatch\WooCommerce\Contract\ProductCatalog;
use MaterialMatch\WooCommerce\Model\AddedCartLine;
use MaterialMatch\WooCommerce\Model\CartIssue;
use MaterialMatch\WooCommerce\Model\CartLine;
use MaterialMatch\WooCommerce\Model\CartMutationResult;
use MaterialMatch\WooCommerce\Model\ProductSnapshot;

final class AddBundleToCart
{
    public const MAX_LINES = 100;

    public function __construct(
        private readonly ProductCatalog $products,
        private readonly CartGateway $cart,
    ) {
    }

    /**
     * Preflights every SKU before changing the cart. If partial additions are disabled,
     * any preflight issue prevents all mutations. Duplicate SKUs are rejected instead
     * of silently changing the requested quantities.
     *
     * @param list<CartLine> $lines
     */
    public function add(array $lines, bool $allowPartial): CartMutationResult
    {
        if ($lines === [] || count($lines) > self::MAX_LINES) {
            throw new InvalidArgumentException('A bundle must contain between 1 and 100 lines.');
        }

        $issues = [];
        $valid = [];
        $seenSkus = [];
        $duplicateSkus = [];

        foreach ($lines as $line) {
            if (!$line instanceof CartLine) {
                throw new InvalidArgumentException('Every bundle line must be a CartLine.');
            }

            if (isset($seenSkus[$line->sku])) {
                if (!isset($duplicateSkus[$line->sku]) && isset($valid[$line->sku])) {
                    /** @var CartLine $firstLine */
                    $firstLine = $valid[$line->sku][0];
                    $issues[] = new CartIssue('duplicate_sku', $firstLine->sku, $firstLine->quantity, 'cart.error.duplicateSku');
                    $duplicateSkus[$line->sku] = true;
                }
                $issues[] = new CartIssue('duplicate_sku', $line->sku, $line->quantity, 'cart.error.duplicateSku');
                unset($valid[$line->sku]);
                continue;
            }

            $seenSkus[$line->sku] = true;
            $product = $this->products->findBySku($line->sku);
            $issue = $this->availabilityIssue($line, $product);

            if ($issue !== null) {
                $issues[] = $issue;
                continue;
            }

            $valid[$line->sku] = [$line, $product];
        }

        if ($issues !== [] && !$allowPartial) {
            return new CartMutationResult([], $issues, false);
        }

        $added = [];
        foreach ($valid as [$line, $product]) {
            $cartItemKey = $this->cart->add($product->productId, $line->quantity);
            if ($cartItemKey === false) {
                $issues[] = new CartIssue('add_failed', $line->sku, $line->quantity, 'cart.error.addFailed');
                continue;
            }

            $added[] = new AddedCartLine($line->sku, $line->quantity, $cartItemKey);
        }

        return new CartMutationResult($added, $issues, $issues === []);
    }

    private function availabilityIssue(CartLine $line, ?ProductSnapshot $product): ?CartIssue
    {
        if ($product === null) {
            return new CartIssue('unknown_sku', $line->sku, $line->quantity, 'cart.error.unknownSku');
        }

        if (!$product->hasPrice) {
            return new CartIssue('missing_price', $line->sku, $line->quantity, 'cart.error.missingPrice');
        }

        if (!$product->purchasable) {
            return new CartIssue('not_purchasable', $line->sku, $line->quantity, 'cart.error.notPurchasable');
        }

        if (!$product->inStock) {
            return new CartIssue('out_of_stock', $line->sku, $line->quantity, 'cart.error.outOfStock');
        }

        if ($product->maximumQuantity !== null && $line->quantity > $product->maximumQuantity) {
            return new CartIssue('insufficient_stock', $line->sku, $line->quantity, 'cart.error.insufficientStock');
        }

        return null;
    }
}
