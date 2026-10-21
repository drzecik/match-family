<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Infrastructure;

use InvalidArgumentException;
use RuntimeException;

final class WordPressStorefrontSettings
{
    public const OPTION_NAME = 'materialmatch_storefront_settings';

    /** @return array{autoEmbed: bool, allowPartialCart: bool, brandName: string, primaryColor: string, logoAttachmentId: int} */
    public function load(): array
    {
        $stored = get_option(self::OPTION_NAME, []);
        if (!is_array($stored)) {
            throw new RuntimeException('MaterialMatch storefront settings are corrupt.');
        }

        return $this->sanitize([
            'autoEmbed' => $stored['autoEmbed'] ?? true,
            'allowPartialCart' => $stored['allowPartialCart'] ?? false,
            'brandName' => $stored['brandName'] ?? 'MaterialMatch',
            'primaryColor' => $stored['primaryColor'] ?? '#1f6f5f',
            'logoAttachmentId' => $stored['logoAttachmentId'] ?? 0,
        ]);
    }

    /**
     * @param array<string, mixed> $input
     * @return array{autoEmbed: bool, allowPartialCart: bool, brandName: string, primaryColor: string, logoAttachmentId: int}
     */
    public function save(array $input): array
    {
        $settings = $this->sanitize($input);
        update_option(self::OPTION_NAME, $settings, false);
        if (get_option(self::OPTION_NAME, null) !== $settings) {
            throw new RuntimeException('MaterialMatch storefront settings write could not be verified.');
        }

        return $settings;
    }

    /**
     * @param array<string, mixed> $input
     * @return array{autoEmbed: bool, allowPartialCart: bool, brandName: string, primaryColor: string, logoAttachmentId: int}
     */
    public function sanitize(array $input): array
    {
        $keys = array_keys($input);
        sort($keys, SORT_STRING);
        if ($keys !== ['allowPartialCart', 'autoEmbed', 'brandName', 'logoAttachmentId', 'primaryColor']) {
            throw new InvalidArgumentException('Storefront settings contain unsupported fields.');
        }

        $brandName = trim((string) $input['brandName']);
        if ($brandName === '' || strlen($brandName) > 80 || preg_match('//u', $brandName) !== 1) {
            throw new InvalidArgumentException('Brand name is invalid.');
        }
        $primaryColor = strtolower(trim((string) $input['primaryColor']));
        if (preg_match('/^#[0-9a-f]{6}$/D', $primaryColor) !== 1) {
            throw new InvalidArgumentException('Primary color is invalid.');
        }
        $logoAttachmentId = filter_var($input['logoAttachmentId'], FILTER_VALIDATE_INT);
        if (!is_int($logoAttachmentId) || $logoAttachmentId < 0) {
            throw new InvalidArgumentException('Logo attachment ID is invalid.');
        }

        return [
            'autoEmbed' => filter_var($input['autoEmbed'], FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? false,
            'allowPartialCart' => filter_var($input['allowPartialCart'], FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? false,
            'brandName' => $brandName,
            'primaryColor' => $primaryColor,
            'logoAttachmentId' => $logoAttachmentId,
        ];
    }
}
