<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Tests;

use MaterialMatch\WordPress\Security\CsvImportGuard;
use MaterialMatch\WordPress\Security\ImportException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class CsvImportGuardTest extends TestCase
{
    public function testParsesSemicolonCsvAndPreservesExplicitValues(): void
    {
        $path = $this->temporaryCsv("sku;enabled;coverage_per_package_mm2\nDEMO-1;1;2200000\n");

        try {
            $rows = (new CsvImportGuard())->parse($path);
        } finally {
            unlink($path);
        }

        self::assertSame([[
            'sku' => 'DEMO-1',
            'enabled' => '1',
            'coverage_per_package_mm2' => '2200000',
        ]], $rows);
    }

    #[DataProvider('formulaProvider')]
    public function testRejectsSpreadsheetFormulaInjection(string $payload): void
    {
        $path = $this->temporaryCsv("sku,material_type\nDEMO-1,\"{$payload}\"\n");

        try {
            $this->expectException(ImportException::class);
            $this->expectExceptionMessage('import.formula_injection');
            (new CsvImportGuard())->parse($path);
        } finally {
            unlink($path);
        }
    }

    /** @return iterable<string, array{string}> */
    public static function formulaProvider(): iterable
    {
        yield 'equals' => ['=HYPERLINK("https://invalid.example")'];
        yield 'plus' => ['+cmd'];
        yield 'minus' => ['-cmd'];
        yield 'at' => ['@SUM(1+1)'];
        yield 'leading whitespace' => ["\t=1+1"];
        yield 'embedded bom prefix' => ["\xEF\xBB\xBF=1+1"];
    }

    public function testRejectsOversizedFile(): void
    {
        $path = $this->temporaryCsv(str_repeat('a', CsvImportGuard::MAX_BYTES + 1));

        try {
            $this->expectException(ImportException::class);
            $this->expectExceptionMessage('import.invalid_file_size');
            (new CsvImportGuard())->parse($path);
        } finally {
            unlink($path);
        }
    }

    private function temporaryCsv(string $contents): string
    {
        $path = tempnam(sys_get_temp_dir(), 'materialmatch-csv-');
        self::assertNotFalse($path);
        self::assertNotFalse(file_put_contents($path, $contents));

        return $path;
    }
}
