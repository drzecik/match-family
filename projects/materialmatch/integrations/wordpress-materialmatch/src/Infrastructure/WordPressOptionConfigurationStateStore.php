<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Infrastructure;

use MaterialMatch\WordPress\Contract\ConfigurationStateStore;
use RuntimeException;
use stdClass;

final class WordPressOptionConfigurationStateStore implements ConfigurationStateStore
{
    public const OPTION_NAME = 'materialmatch_configuration_state';

    public function load(): ?array
    {
        $missing = new stdClass();
        $state = get_option(self::OPTION_NAME, $missing);
        if ($state === $missing) {
            return null;
        }
        if (!is_array($state)) {
            throw new RuntimeException('MaterialMatch configuration state is corrupt.');
        }
        return $state;
    }

    public function save(array $state): void
    {
        update_option(self::OPTION_NAME, $state, false);
        if (get_option(self::OPTION_NAME, null) !== $state) {
            throw new RuntimeException('MaterialMatch configuration state write could not be verified.');
        }
    }
}
