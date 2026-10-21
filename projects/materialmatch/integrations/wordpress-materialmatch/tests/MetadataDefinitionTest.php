<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Tests;

use InvalidArgumentException;
use MaterialMatch\WordPress\Product\MetadataDefinition;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class MetadataDefinitionTest extends TestCase
{
    public function testUsesIntegerUnitsAndNormalizesTags(): void
    {
        self::assertSame(2200000, MetadataDefinition::sanitize('coverage_per_package_mm2', '2200000'));
        self::assertSame(800, MetadataDefinition::sanitize('default_waste_basis_points', '800'));
        self::assertSame(['underlay', 'dry_rooms'], MetadataDefinition::sanitize('compatibility_tags', 'Underlay|dry_rooms|underlay'));
    }

    #[DataProvider('invalidIntegerProvider')]
    public function testRejectsAmbiguousOrUnsafeNumbers(string $value): void
    {
        $this->expectException(InvalidArgumentException::class);
        MetadataDefinition::sanitize('coverage_per_package_mm2', $value);
    }

    /** @return iterable<string, array{string}> */
    public static function invalidIntegerProvider(): iterable
    {
        yield 'negative' => ['-1'];
        yield 'decimal comma' => ['2,2'];
        yield 'decimal point' => ['2.2'];
        yield 'formula' => ['=22000'];
        yield 'too large' => ['1000000000001'];
    }

    public function testRejectsUnknownMetadataField(): void
    {
        $this->expectException(InvalidArgumentException::class);
        MetadataDefinition::sanitize('arbitrary_code', 'alert(1)');
    }
}
