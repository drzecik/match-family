<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Tests;

use MaterialMatch\WordPress\Licensing\LocalOpenLicenseProvider;
use PHPUnit\Framework\TestCase;

final class LocalOpenLicenseProviderTest extends TestCase
{
    public function testIsLocalAndDoesNotGateNamedFeatures(): void
    {
        $provider = new LocalOpenLicenseProvider();

        self::assertTrue($provider->isFeatureAllowed('core'));
        self::assertFalse($provider->isFeatureAllowed(''));
        self::assertSame(['mode' => 'local-open', 'status' => 'active'], $provider->status());
    }
}
