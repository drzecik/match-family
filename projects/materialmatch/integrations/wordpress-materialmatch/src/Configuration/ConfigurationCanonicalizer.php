<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Configuration;

use JsonException;
use RuntimeException;

final class ConfigurationCanonicalizer
{
    /** @param array<string, mixed> $configuration */
    public function checksum(array $configuration): string
    {
        try {
            return hash('sha256', json_encode(
                $this->sortRecursively($configuration),
                JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
            ));
        } catch (JsonException $exception) {
            throw new RuntimeException('Configuration could not be canonicalized.', 0, $exception);
        }
    }

    private function sortRecursively(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }

        if (array_is_list($value)) {
            return array_map(fn (mixed $item): mixed => $this->sortRecursively($item), $value);
        }

        ksort($value, SORT_STRING);
        foreach ($value as $key => $item) {
            $value[$key] = $this->sortRecursively($item);
        }

        return $value;
    }
}
