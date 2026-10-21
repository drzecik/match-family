<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Configuration;

use JsonException;
use MaterialMatch\WordPress\Contract\ConfigurationStateStore;
use MaterialMatch\WordPress\Security\ImportException;

final class ConfigurationManager
{
    public const MAX_IMPORT_BYTES = 2_097_152;
    public const FORMAT_VERSION = 1;
    public const MAX_REVISIONS = 25;
    private const JSON_DEPTH = 64;

    public function __construct(
        private readonly ConfigurationStateStore $store,
        private readonly ConfigurationValidator $validator = new ConfigurationValidator(),
        private readonly ConfigurationCanonicalizer $canonicalizer = new ConfigurationCanonicalizer(),
    ) {
    }

    public function import(string $json): ConfigurationRevision
    {
        $configuration = $this->decodeImport($json);
        $this->validator->validate($configuration);
        $checksum = $this->canonicalizer->checksum($configuration);
        $providedChecksum = $this->providedChecksum($json);
        if ($providedChecksum !== null && !hash_equals($providedChecksum, $checksum)) {
            throw new ImportException('configuration.checksum_mismatch');
        }

        $state = $this->state();
        foreach ($state['revisions'] as $revision) {
            if (hash_equals($revision['checksum'], $checksum)) {
                if ($state['activeRevision'] !== $revision['revision']) {
                    $state['activeRevision'] = $revision['revision'];
                    $this->store->save($state);
                }
                return $this->toRevision($revision, true);
            }
        }

        $revisionNumber = $state['nextRevision'];
        $revision = [
            'revision' => $revisionNumber,
            'checksum' => $checksum,
            'configuration' => $configuration,
        ];
        $state['revisions'][] = $revision;
        if (count($state['revisions']) > self::MAX_REVISIONS) {
            array_shift($state['revisions']);
        }
        $state['activeRevision'] = $revisionNumber;
        $state['nextRevision'] = $revisionNumber + 1;
        $this->store->save($state);

        return $this->toRevision($revision, false);
    }

    public function rollback(int $revisionNumber): ConfigurationRevision
    {
        $state = $this->state();
        foreach ($state['revisions'] as $revision) {
            if ($revision['revision'] === $revisionNumber) {
                if ($state['activeRevision'] !== $revisionNumber) {
                    $state['activeRevision'] = $revisionNumber;
                    $this->store->save($state);
                }
                return $this->toRevision($revision, true);
            }
        }
        throw new ImportException('configuration.unknown_revision');
    }

    public function current(): ?ConfigurationRevision
    {
        $state = $this->state();
        foreach ($state['revisions'] as $revision) {
            if ($revision['revision'] === $state['activeRevision']) {
                return $this->toRevision($revision, true);
            }
        }
        return null;
    }

    /** @return list<array{revision: int, checksum: string, active: bool}> */
    public function revisions(): array
    {
        $state = $this->state();
        return array_map(
            static fn (array $revision): array => [
                'revision' => $revision['revision'],
                'checksum' => $revision['checksum'],
                'active' => $revision['revision'] === $state['activeRevision'],
            ],
            array_reverse($state['revisions']),
        );
    }

    public function exportCurrent(): string
    {
        $revision = $this->current();
        if ($revision === null) {
            throw new ImportException('configuration.no_active_revision');
        }

        try {
            return json_encode([
                'formatVersion' => self::FORMAT_VERSION,
                'checksum' => $revision->checksum,
                'configuration' => $revision->configuration,
            ], JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
        } catch (JsonException $exception) {
            throw new ImportException('configuration.export_failed', 0, $exception);
        }
    }

    /** @return array<string, mixed> */
    private function decodeImport(string $json): array
    {
        $bytes = strlen($json);
        if ($bytes < 2 || $bytes > self::MAX_IMPORT_BYTES || str_contains($json, "\0")) {
            throw new ImportException('configuration.invalid_file_size');
        }
        try {
            $decoded = json_decode($json, true, self::JSON_DEPTH, JSON_THROW_ON_ERROR | JSON_BIGINT_AS_STRING);
        } catch (JsonException $exception) {
            throw new ImportException('configuration.invalid_json', 0, $exception);
        }
        if (!is_array($decoded) || array_is_list($decoded)) {
            throw new ImportException('configuration.expected_object');
        }
        if (!array_key_exists('formatVersion', $decoded)) {
            return $decoded;
        }
        $keys = array_keys($decoded);
        sort($keys, SORT_STRING);
        if ($keys !== ['checksum', 'configuration', 'formatVersion']
            || $decoded['formatVersion'] !== self::FORMAT_VERSION
            || !is_string($decoded['checksum'])
            || preg_match('/^[a-f0-9]{64}$/D', $decoded['checksum']) !== 1
            || !is_array($decoded['configuration'])
            || array_is_list($decoded['configuration'])) {
            throw new ImportException('configuration.invalid_envelope');
        }
        return $decoded['configuration'];
    }

    private function providedChecksum(string $json): ?string
    {
        try {
            $decoded = json_decode($json, true, self::JSON_DEPTH, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return null;
        }
        return is_array($decoded) && isset($decoded['formatVersion'], $decoded['checksum'])
            ? (string) $decoded['checksum']
            : null;
    }

    /** @return array{formatVersion: int, activeRevision: int|null, nextRevision: int, revisions: list<array{revision: int, checksum: string, configuration: array<string, mixed>}>} */
    private function state(): array
    {
        $state = $this->store->load();
        if ($state === null) {
            return [
                'formatVersion' => self::FORMAT_VERSION,
                'activeRevision' => null,
                'nextRevision' => 1,
                'revisions' => [],
            ];
        }
        if (($state['formatVersion'] ?? null) !== self::FORMAT_VERSION
            || array_keys($state) !== ['formatVersion', 'activeRevision', 'nextRevision', 'revisions']
            || !array_key_exists('activeRevision', $state)
            || (!is_int($state['activeRevision']) && $state['activeRevision'] !== null)
            || !isset($state['nextRevision'], $state['revisions'])
            || !is_int($state['nextRevision']) || $state['nextRevision'] < 1
            || !is_array($state['revisions']) || !array_is_list($state['revisions'])
            || count($state['revisions']) > self::MAX_REVISIONS) {
            throw new ImportException('configuration.corrupt_state');
        }

        $seen = [];
        foreach ($state['revisions'] as $revision) {
            if (!is_array($revision)
                || array_keys($revision) !== ['revision', 'checksum', 'configuration']
                || !is_int($revision['revision']) || $revision['revision'] < 1
                || isset($seen[$revision['revision']])
                || !is_string($revision['checksum']) || preg_match('/^[a-f0-9]{64}$/D', $revision['checksum']) !== 1
                || !is_array($revision['configuration']) || array_is_list($revision['configuration'])) {
                throw new ImportException('configuration.corrupt_state');
            }
            $this->validator->validate($revision['configuration']);
            if (!hash_equals($revision['checksum'], $this->canonicalizer->checksum($revision['configuration']))) {
                throw new ImportException('configuration.corrupt_state');
            }
            $seen[$revision['revision']] = true;
        }
        if ($state['activeRevision'] !== null && !isset($seen[$state['activeRevision']])) {
            throw new ImportException('configuration.corrupt_state');
        }
        if ($seen !== [] && $state['nextRevision'] <= max(array_keys($seen))) {
            throw new ImportException('configuration.corrupt_state');
        }

        /** @var array{formatVersion: int, activeRevision: int|null, nextRevision: int, revisions: list<array{revision: int, checksum: string, configuration: array<string, mixed>}>} $state */
        return $state;
    }

    /** @param array{revision: int, checksum: string, configuration: array<string, mixed>} $revision */
    private function toRevision(array $revision, bool $reused): ConfigurationRevision
    {
        return new ConfigurationRevision(
            $revision['revision'],
            $revision['checksum'],
            $revision['configuration'],
            $reused,
        );
    }
}
