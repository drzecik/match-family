<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Tests;

use InvalidArgumentException;
use MaterialMatch\WordPress\Admin\ProductMetadataValueAdapter;
use PHPUnit\Framework\TestCase;

final class ProductMetadataValueAdapterTest extends TestCase
{
    private ProductMetadataValueAdapter $adapter;

    protected function setUp(): void
    {
        $this->adapter = new ProductMetadataValueAdapter();
    }

    public function testPresentsInternalIntegerUnitsAsNaturalPolishValues(): void
    {
        self::assertSame('2,2', $this->adapter->toDisplay('coverage_per_package_mm2', '2200000'));
        self::assertSame('8', $this->adapter->toDisplay('default_waste_basis_points', '800'));
        self::assertSame('8,25', $this->adapter->toDisplay('maximum_waste_basis_points', '825'));
    }

    public function testConvertsPolishDecimalInputBackToExactIntegerUnits(): void
    {
        self::assertSame('2200000', $this->adapter->toStorage('coverage_per_package_mm2', '2,2'));
        self::assertSame('825', $this->adapter->toStorage('default_waste_basis_points', '8,25'));
    }

    public function testLeavesOtherMetadataUntouched(): void
    {
        self::assertSame('12', $this->adapter->toStorage('pieces_per_package', '12'));
        self::assertSame('12', $this->adapter->toDisplay('pieces_per_package', '12'));
    }

    public function testRejectsAmbiguousOrOverpreciseFriendlyInput(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->adapter->toStorage('default_waste_basis_points', '8,251');
    }
}
