<?php

declare(strict_types=1);

namespace MaterialMatch\WooCommerce\Tests;

use MaterialMatch\WooCommerce\Contract\CartGateway;
use MaterialMatch\WooCommerce\Contract\ProductCatalog;
use MaterialMatch\WooCommerce\Model\CartLine;
use MaterialMatch\WooCommerce\Model\ProductSnapshot;
use MaterialMatch\WooCommerce\Service\AddBundleToCart;
use PHPUnit\Framework\TestCase;
use InvalidArgumentException;

final class AddBundleToCartTest extends TestCase
{
    public function testAddsExactSkuQuantities(): void
    {
        $catalog = new InMemoryCatalog([
            'PANEL-01' => new ProductSnapshot(11, 'PANEL-01', true, true, true),
            'UNDERLAY-01' => new ProductSnapshot(12, 'UNDERLAY-01', true, true, true),
        ]);
        $cart = new RecordingCart();

        $result = (new AddBundleToCart($catalog, $cart))->add([
            new CartLine('PANEL-01', 10),
            new CartLine('UNDERLAY-01', 3),
        ], false);

        self::assertTrue($result->complete);
        self::assertSame([[11, 10], [12, 3]], $cart->calls);
        self::assertSame('PANEL-01', $result->added[0]->sku);
        self::assertSame(10, $result->added[0]->quantity);
    }

    public function testStrictModeDoesNotMutateCartWhenAnySkuIsInvalid(): void
    {
        $catalog = new InMemoryCatalog([
            'VALID' => new ProductSnapshot(11, 'VALID', true, true, true),
        ]);
        $cart = new RecordingCart();

        $result = (new AddBundleToCart($catalog, $cart))->add([
            new CartLine('VALID', 2),
            new CartLine('MISSING', 1),
        ], false);

        self::assertFalse($result->complete);
        self::assertSame([], $cart->calls);
        self::assertSame('unknown_sku', $result->issues[0]->code);
    }

    public function testPartialModeAddsOnlyValidItemsAndReportsProblems(): void
    {
        $catalog = new InMemoryCatalog([
            'VALID' => new ProductSnapshot(11, 'VALID', true, true, true),
            'NO-PRICE' => new ProductSnapshot(12, 'NO-PRICE', true, true, false),
            'NO-STOCK' => new ProductSnapshot(13, 'NO-STOCK', true, false, true),
        ]);
        $cart = new RecordingCart();

        $result = (new AddBundleToCart($catalog, $cart))->add([
            new CartLine('VALID', 2),
            new CartLine('NO-PRICE', 1),
            new CartLine('NO-STOCK', 1),
        ], true);

        self::assertFalse($result->complete);
        self::assertSame([[11, 2]], $cart->calls);
        self::assertSame(['missing_price', 'out_of_stock'], array_column($result->toArray()['issues'], 'code'));
    }

    public function testDuplicateSkuIsNeverSilentlyAggregated(): void
    {
        $catalog = new InMemoryCatalog([
            'VALID' => new ProductSnapshot(11, 'VALID', true, true, true),
        ]);
        $cart = new RecordingCart();

        $result = (new AddBundleToCart($catalog, $cart))->add([
            new CartLine('VALID', 2),
            new CartLine('VALID', 3),
        ], true);

        self::assertSame([], $cart->calls);
        self::assertSame('duplicate_sku', $result->issues[0]->code);
        self::assertSame([2, 3], array_column($result->toArray()['issues'], 'quantity'));
    }

    public function testRejectsUnsafeSkuAndNonPositiveQuantityAtBoundary(): void
    {
        $this->expectException(InvalidArgumentException::class);
        new CartLine('=FORMULA()', 1);
    }

    public function testRejectsZeroQuantityAtBoundary(): void
    {
        $this->expectException(InvalidArgumentException::class);
        new CartLine('VALID', 0);
    }

    public function testRejectsNegativeQuantityAtBoundary(): void
    {
        $this->expectException(InvalidArgumentException::class);
        new CartLine('VALID', -1);
    }

    public function testRejectsQuantityAboveSafetyLimitAtBoundary(): void
    {
        $this->expectException(InvalidArgumentException::class);
        new CartLine('VALID', CartLine::MAX_QUANTITY + 1);
    }

    public function testReportsUnexpectedGatewayRejectionWithoutChangingQuantity(): void
    {
        $catalog = new InMemoryCatalog([
            'VALID' => new ProductSnapshot(11, 'VALID', true, true, true),
        ]);
        $cart = new RecordingCart(false);

        $result = (new AddBundleToCart($catalog, $cart))->add([
            new CartLine('VALID', 7),
        ], false);

        self::assertSame([[11, 7]], $cart->calls);
        self::assertFalse($result->complete);
        self::assertSame('add_failed', $result->issues[0]->code);
    }

    public function testPreflightRejectsQuantityAboveAvailableStock(): void
    {
        $catalog = new InMemoryCatalog([
            'LIMITED' => new ProductSnapshot(11, 'LIMITED', true, true, true, 5),
        ]);
        $cart = new RecordingCart();

        $result = (new AddBundleToCart($catalog, $cart))->add([
            new CartLine('LIMITED', 6),
        ], false);

        self::assertSame([], $cart->calls);
        self::assertSame('insufficient_stock', $result->issues[0]->code);
    }
}

final class InMemoryCatalog implements ProductCatalog
{
    /** @param array<string, ProductSnapshot> $products */
    public function __construct(private readonly array $products)
    {
    }

    public function findBySku(string $sku): ?ProductSnapshot
    {
        return $this->products[$sku] ?? null;
    }
}

final class RecordingCart implements CartGateway
{
    /** @var list<array{int, int}> */
    public array $calls = [];

    public function __construct(private readonly bool $accept = true)
    {
    }

    public function add(int $productId, int $quantity): string|false
    {
        $this->calls[] = [$productId, $quantity];

        return $this->accept ? 'cart-' . count($this->calls) : false;
    }
}
