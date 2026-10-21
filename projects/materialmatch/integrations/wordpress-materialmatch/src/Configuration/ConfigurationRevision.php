<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Configuration;

final class ConfigurationRevision
{
    /** @param array<string, mixed> $configuration */
    public function __construct(
        public readonly int $revision,
        public readonly string $checksum,
        public readonly array $configuration,
        public readonly bool $reused = false,
    ) {
    }
}
