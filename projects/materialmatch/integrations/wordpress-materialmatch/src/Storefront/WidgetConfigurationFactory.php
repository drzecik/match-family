<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Storefront;

use MaterialMatch\WordPress\Configuration\ConfigurationRevision;
use RuntimeException;

final class WidgetConfigurationFactory
{
    /**
     * @param array{name: string, logoUrl?: string} $brand
     * @param array<string, string> $productNames
     * @return array<string, mixed>
     */
    public function create(
        ConfigurationRevision $revision,
        bool $allowPartialCart,
        array $brand = ['name' => 'MaterialMatch'],
        array $productNames = [],
    ): array {
        $configuration = $revision->configuration;
        $version = $configuration['version'] ?? null;
        $wasteRule = $configuration['wasteRule'] ?? null;
        if (!is_array($version) || !is_array($wasteRule)) {
            throw new RuntimeException('Validated calculation configuration is incomplete.');
        }

        return [
            'schemaVersion' => (string) $version['schemaVersion'],
            'configurationVersion' => $version['schemaVersion'] . '.' . $version['revision'],
            'configurationChecksum' => $revision->checksum,
            'locale' => $configuration['locale'],
            'currency' => $configuration['currency'],
            'defaultWasteBasisPoints' => $wasteRule['defaultBasisPoints'],
            'minimumWasteBasisPoints' => $wasteRule['minimumBasisPoints'],
            'maximumWasteBasisPoints' => $wasteRule['maximumBasisPoints'],
            'allowPartialCart' => $allowPartialCart,
            'brand' => $brand,
            'productNames' => $productNames,
            'calculation' => $configuration,
        ];
    }
}
