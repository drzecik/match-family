<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Tests;

use MaterialMatch\WordPress\Configuration\ConfigurationManager;
use MaterialMatch\WordPress\Contract\ConfigurationStateStore;
use MaterialMatch\WordPress\Security\ImportException;
use MaterialMatch\WordPress\Tests\Fixtures\ConfigurationFixture;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class ConfigurationManagerTest extends TestCase
{
    public function testImportsExportsAndReusesCanonicalConfiguration(): void
    {
        $store = new InMemoryConfigurationStateStore();
        $manager = new ConfigurationManager($store);
        $configuration = ConfigurationFixture::valid();
        $first = $manager->import($this->json($configuration));

        $reordered = array_reverse($configuration, true);
        $second = $manager->import($this->json($reordered));
        $exported = json_decode($manager->exportCurrent(), true, 64, JSON_THROW_ON_ERROR);

        self::assertSame(1, $first->revision);
        self::assertFalse($first->reused);
        self::assertSame(1, $second->revision);
        self::assertTrue($second->reused);
        self::assertSame($first->checksum, $second->checksum);
        self::assertSame(1, $exported['formatVersion']);
        self::assertSame($first->checksum, $exported['checksum']);
        self::assertSame($configuration, $exported['configuration']);
        self::assertSame(1, $store->saveCount);
    }

    public function testRejectsTamperedExportChecksum(): void
    {
        $manager = new ConfigurationManager(new InMemoryConfigurationStateStore());
        $first = $manager->import($this->json(ConfigurationFixture::valid()));
        $envelope = json_decode($manager->exportCurrent(), true, 64, JSON_THROW_ON_ERROR);
        self::assertSame($first->checksum, $envelope['checksum']);
        $envelope['configuration']['locale'] = 'en-GB';

        $this->expectException(ImportException::class);
        $this->expectExceptionMessage('configuration.checksum_mismatch');
        $manager->import($this->json($envelope));
    }

    public function testRejectsOversizedAndDeepJson(): void
    {
        $manager = new ConfigurationManager(new InMemoryConfigurationStateStore());
        try {
            $manager->import('{"payload":"' . str_repeat('a', ConfigurationManager::MAX_IMPORT_BYTES) . '"}');
            self::fail('Oversized import was accepted.');
        } catch (ImportException $exception) {
            self::assertSame('configuration.invalid_file_size', $exception->getMessage());
        }

        $this->expectException(ImportException::class);
        $this->expectExceptionMessage('configuration.invalid_json');
        $manager->import(str_repeat('{"a":', 65) . '1' . str_repeat('}', 65));
    }

    public function testFailedSaveNeverChangesPreviouslyActiveConfiguration(): void
    {
        $store = new InMemoryConfigurationStateStore();
        $manager = new ConfigurationManager($store);
        $first = $manager->import($this->json(ConfigurationFixture::valid()));
        $stateBefore = $store->state;
        $changed = ConfigurationFixture::valid();
        $changed['locale'] = 'en-GB';
        $store->failNextSave = true;

        try {
            $manager->import($this->json($changed));
            self::fail('RuntimeException was not thrown.');
        } catch (RuntimeException) {
            self::assertSame($stateBefore, $store->state);
            self::assertSame($first->checksum, (new ConfigurationManager($store))->current()?->checksum);
        }
    }

    public function testRejectsStateWhoseNextRevisionWouldOverwriteHistory(): void
    {
        $store = new InMemoryConfigurationStateStore();
        $manager = new ConfigurationManager($store);
        $manager->import($this->json(ConfigurationFixture::valid()));
        $store->state['nextRevision'] = 1;

        $this->expectException(ImportException::class);
        $this->expectExceptionMessage('configuration.corrupt_state');
        $manager->current();
    }

    public function testKeepsBoundedHistoryAndRetainsThePreviousValidRevision(): void
    {
        $manager = new ConfigurationManager(new InMemoryConfigurationStateStore());
        for ($index = 0; $index <= ConfigurationManager::MAX_REVISIONS; ++$index) {
            $configuration = ConfigurationFixture::valid();
            $configuration['locale'] = 'pl-' . str_pad((string) $index, 2, '0', STR_PAD_LEFT);
            $configuration['version']['revision'] = $index;
            $manager->import($this->json($configuration));
        }

        $revisions = $manager->revisions();
        self::assertCount(ConfigurationManager::MAX_REVISIONS, $revisions);
        self::assertSame(ConfigurationManager::MAX_REVISIONS + 1, $revisions[0]['revision']);
        self::assertSame(ConfigurationManager::MAX_REVISIONS, $revisions[1]['revision']);
        self::assertTrue($revisions[0]['active']);
        self::assertFalse($revisions[1]['active']);
    }

    private function json(array $value): string
    {
        return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
    }
}

final class InMemoryConfigurationStateStore implements ConfigurationStateStore
{
    /** @var array<string, mixed>|null */
    public ?array $state = null;
    public int $saveCount = 0;
    public bool $failNextSave = false;

    public function load(): ?array
    {
        return $this->state;
    }

    public function save(array $state): void
    {
        if ($this->failNextSave) {
            $this->failNextSave = false;
            throw new RuntimeException('simulated write failure');
        }
        $this->state = $state;
        ++$this->saveCount;
    }
}
