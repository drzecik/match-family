<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Tests;

use MaterialMatch\WordPress\Admin\PolishAdminErrorMessage;
use PHPUnit\Framework\TestCase;

final class PolishAdminErrorMessageTest extends TestCase
{
    public function testExplainsCommonImportProblemsWithoutExposingTechnicalCodes(): void
    {
        self::assertSame(
            'Plik CSV musi być zapisany w kodowaniu UTF-8.',
            PolishAdminErrorMessage::forCode('import_invalid_utf8'),
        );
        self::assertSame(
            'Co najmniej jeden kod produktu z pliku nie istnieje w WooCommerce.',
            PolishAdminErrorMessage::forCode('import_unknown_sku'),
        );
        self::assertSame(
            'Plik zawiera dwie kolumny opisujące to samo pole. Pozostaw tylko jedną z nich.',
            PolishAdminErrorMessage::forCode('import_duplicate_field'),
        );
    }

    public function testProvidesAReadableFallback(): void
    {
        self::assertSame(
            'Nie udało się wykonać operacji. Sprawdź plik i spróbuj ponownie.',
            PolishAdminErrorMessage::forCode('unexpected_error'),
        );
    }
}
