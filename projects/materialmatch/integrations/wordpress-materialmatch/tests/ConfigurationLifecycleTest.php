<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Tests;

use MaterialMatch\WordPress\Configuration\ConfigurationManager;
use MaterialMatch\WordPress\Tests\Fixtures\ConfigurationFixture;
use PHPUnit\Framework\TestCase;

final class ConfigurationLifecycleTest extends TestCase
{
    public function testFullImportExportPublishAndRollbackFlow(): void
    {
        $store = new InMemoryConfigurationStateStore();
        $manager = new ConfigurationManager($store);
        $original = ConfigurationFixture::valid();

        $revisionOne = $manager->import(json_encode($original, JSON_THROW_ON_ERROR));
        $portableBackup = $manager->exportCurrent();

        $restoredStore = new InMemoryConfigurationStateStore();
        $restoredManager = new ConfigurationManager($restoredStore);
        $restored = $restoredManager->import($portableBackup);
        self::assertSame($revisionOne->checksum, $restored->checksum);

        $changed = $original;
        $changed['locale'] = 'en-GB';
        $changed['version']['revision'] = 1;
        $revisionTwo = $manager->import(json_encode($changed, JSON_THROW_ON_ERROR));
        self::assertSame(2, $revisionTwo->revision);
        self::assertSame('en-GB', $manager->current()?->configuration['locale']);

        $rolledBack = $manager->rollback($revisionOne->revision);
        self::assertSame($revisionOne->checksum, $rolledBack->checksum);
        self::assertSame('pl-PL', $manager->current()?->configuration['locale']);
        self::assertCount(2, $manager->revisions());
    }
}
