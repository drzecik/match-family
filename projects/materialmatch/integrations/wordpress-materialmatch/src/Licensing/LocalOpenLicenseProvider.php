<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Licensing;

use MaterialMatch\WordPress\Contract\LicenseProvider;

/**
 * MVP provider: no network calls, accounts, tracking or remote activation.
 */
final class LocalOpenLicenseProvider implements LicenseProvider
{
    public function isFeatureAllowed(string $feature): bool
    {
        return $feature !== '';
    }

    public function status(): array
    {
        return [
            'mode' => 'local-open',
            'status' => 'active',
        ];
    }
}
