<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Contract;

interface LicenseProvider
{
    public function isFeatureAllowed(string $feature): bool;

    /** @return array{mode: string, status: string} */
    public function status(): array;
}
