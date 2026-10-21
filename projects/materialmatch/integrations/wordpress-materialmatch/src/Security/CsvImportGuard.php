<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Security;

final class CsvImportGuard
{
    public const MAX_BYTES = 1048576;
    public const MAX_ROWS = 5000;
    public const MAX_COLUMNS = 32;
    public const MAX_CELL_BYTES = 4096;

    /**
     * @return list<array<string, string>>
     */
    public function parse(string $path): array
    {
        if (!is_file($path) || !is_readable($path)) {
            throw new ImportException('import.file_unreadable');
        }

        $size = filesize($path);
        if ($size === false || $size < 1 || $size > self::MAX_BYTES) {
            throw new ImportException('import.invalid_file_size');
        }

        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new ImportException('import.file_unreadable');
        }

        try {
            $sample = fgets($handle, 8192);
            if ($sample === false || !preg_match('//u', $sample)) {
                throw new ImportException('import.invalid_utf8');
            }

            $delimiter = substr_count($sample, ';') > substr_count($sample, ',') ? ';' : ',';
            rewind($handle);
            $headers = fgetcsv($handle, self::MAX_BYTES, $delimiter, '"', '');
            if (!is_array($headers) || $headers === []) {
                throw new ImportException('import.missing_header');
            }

            $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $headers[0]) ?? '';
            $headers = $this->validateHeaders($headers);
            $rows = [];
            $lineNumber = 1;

            while (($cells = fgetcsv($handle, self::MAX_BYTES, $delimiter, '"', '')) !== false) {
                ++$lineNumber;
                if ($cells === [null] || $cells === []) {
                    continue;
                }
                if ($lineNumber > self::MAX_ROWS + 1) {
                    throw new ImportException('import.too_many_rows');
                }
                if (count($cells) !== count($headers)) {
                    throw new ImportException('import.column_count_mismatch');
                }

                $row = [];
                foreach ($cells as $index => $cell) {
                    $value = (string) $cell;
                    $this->validateCell($value);
                    $row[$headers[$index]] = $value;
                }
                $rows[] = $row;
            }

            return $rows;
        } finally {
            fclose($handle);
        }
    }

    /** @param list<string|null> $headers
     *  @return list<string>
     */
    private function validateHeaders(array $headers): array
    {
        if (count($headers) > self::MAX_COLUMNS) {
            throw new ImportException('import.too_many_columns');
        }

        $normalized = [];
        foreach ($headers as $header) {
            $value = strtolower(trim((string) $header));
            if ($value === '' || !preg_match('/^[a-z][a-z0-9_]{0,63}$/', $value)) {
                throw new ImportException('import.invalid_header');
            }
            if (isset($normalized[$value])) {
                throw new ImportException('import.duplicate_header');
            }
            $normalized[$value] = true;
        }

        return array_keys($normalized);
    }

    private function validateCell(string $value): void
    {
        if (strlen($value) > self::MAX_CELL_BYTES) {
            throw new ImportException('import.cell_too_large');
        }
        if (str_contains($value, "\0") || !preg_match('//u', $value)) {
            throw new ImportException('import.invalid_cell_encoding');
        }

        $trimmed = ltrim($value, " \t\r\n\v\f");
        $trimmed = preg_replace('/^\xEF\xBB\xBF/', '', $trimmed) ?? '';
        $trimmed = ltrim($trimmed, " \t\r\n\v\f");
        if ($trimmed === '') {
            return;
        }

        $first = $trimmed[0];
        $negativeNumber = preg_match('/^-\d+(?:[.,]\d+)?$/', $trimmed) === 1;
        if (in_array($first, ['=', '+', '@'], true) || ($first === '-' && !$negativeNumber)) {
            throw new ImportException('import.formula_injection');
        }
    }
}
