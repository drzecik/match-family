<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Admin;

final class PolishAdminErrorMessage
{
    public static function forCode(string $code): string
    {
        return match (true) {
            $code === 'configuration_missing_file', $code === 'import_missing_file' =>
                'Najpierw wybierz plik do wczytania.',
            $code === 'configuration_invalid_extension', $code === 'import_invalid_extension' =>
                'Wybrano niewłaściwy typ pliku.',
            $code === 'configuration_invalid_file_size', $code === 'configuration_upload_failed',
            $code === 'import_invalid_file_size', $code === 'import_upload_failed' =>
                'Plik jest zbyt duży albo nie udało się go przesłać.',
            $code === 'configuration_invalid_json', $code === 'configuration_expected_object',
            $code === 'configuration_invalid_envelope' =>
                'Plik JSON jest uszkodzony albo nie jest konfiguracją MaterialMatch.',
            $code === 'configuration_checksum_mismatch' =>
                'Suma kontrolna pliku jest nieprawidłowa. Plik mógł zostać zmieniony lub uszkodzony.',
            $code === 'configuration_unknown_revision' =>
                'Nie znaleziono wybranej wcześniejszej wersji konfiguracji.',
            $code === 'configuration_no_active_revision' =>
                'Nie ma aktywnej konfiguracji do wyeksportowania.',
            $code === 'configuration_corrupt_state' =>
                'Zapisana konfiguracja jest uszkodzona. Przywróć poprawną kopię.',
            $code === 'import_invalid_utf8', $code === 'import_invalid_cell_encoding' =>
                'Plik CSV musi być zapisany w kodowaniu UTF-8.',
            $code === 'import_missing_header', $code === 'import_missing_sku_header',
            $code === 'import_invalid_header', $code === 'import_unknown_header' =>
                'Nagłówki kolumn w pliku CSV są nieprawidłowe.',
            $code === 'import_duplicate_field' =>
                'Plik zawiera dwie kolumny opisujące to samo pole. Pozostaw tylko jedną z nich.',
            $code === 'import_duplicate_header', $code === 'import_duplicate_sku' =>
                'Plik zawiera powtórzony nagłówek albo ten sam kod produktu więcej niż raz.',
            $code === 'import_unknown_sku' =>
                'Co najmniej jeden kod produktu z pliku nie istnieje w WooCommerce.',
            $code === 'import_invalid_sku' =>
                'Co najmniej jeden kod produktu ma niedozwolony format.',
            $code === 'import_formula_injection' =>
                'Plik zawiera komórkę przypominającą formułę arkusza i został odrzucony dla bezpieczeństwa.',
            $code === 'import_no_rows' =>
                'Plik CSV nie zawiera żadnych danych produktów.',
            $code === 'import_too_many_rows', $code === 'import_too_many_columns',
            $code === 'import_cell_too_large' =>
                'Plik przekracza dozwolony limit wierszy, kolumn albo długości pola.',
            $code === 'import_column_count_mismatch' =>
                'Nie wszystkie wiersze pliku CSV mają tę samą liczbę kolumn.',
            str_starts_with($code, 'import_invalid_') =>
                'Co najmniej jedna wartość produktu jest nieprawidłowa. Sprawdź format i jednostki w pliku.',
            default => 'Nie udało się wykonać operacji. Sprawdź plik i spróbuj ponownie.',
        };
    }
}
