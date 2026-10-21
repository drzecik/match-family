<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Contract;

interface ConfigurationStateStore
{
    /** @return array<string, mixed>|null */
    public function load(): ?array;

    /** @param array<string, mixed> $state */
    public function save(array $state): void;
}
