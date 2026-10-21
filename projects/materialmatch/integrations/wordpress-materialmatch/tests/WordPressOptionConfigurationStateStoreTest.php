<?php

declare(strict_types=1);

namespace {
    if (!function_exists('get_option')) {
        function get_option(string $name, mixed $default = false): mixed
        {
            return array_key_exists($name, $GLOBALS['materialmatch_test_options'])
                ? $GLOBALS['materialmatch_test_options'][$name]
                : $default;
        }
    }

    if (!function_exists('update_option')) {
        function update_option(string $name, mixed $value, bool $autoload = false): bool
        {
            if (($GLOBALS['materialmatch_test_fail_option_write'] ?? false) === true) {
                return false;
            }
            $GLOBALS['materialmatch_test_options'][$name] = $value;
            $GLOBALS['materialmatch_test_last_autoload'] = $autoload;
            return true;
        }
    }
}

namespace MaterialMatch\WordPress\Tests {
    use MaterialMatch\WordPress\Infrastructure\WordPressOptionConfigurationStateStore;
    use PHPUnit\Framework\TestCase;
    use RuntimeException;

    final class WordPressOptionConfigurationStateStoreTest extends TestCase
    {
        protected function setUp(): void
        {
            $GLOBALS['materialmatch_test_options'] = [];
            $GLOBALS['materialmatch_test_fail_option_write'] = false;
            unset($GLOBALS['materialmatch_test_last_autoload']);
        }

        public function testPersistsWholeStateInOneNonAutoloadedOption(): void
        {
            $store = new WordPressOptionConfigurationStateStore();
            $state = ['formatVersion' => 1, 'activeRevision' => 1, 'nextRevision' => 2, 'revisions' => []];
            $store->save($state);

            self::assertSame($state, $store->load());
            self::assertFalse($GLOBALS['materialmatch_test_last_autoload']);
        }

        public function testDetectsFailedOptionWrite(): void
        {
            $GLOBALS['materialmatch_test_fail_option_write'] = true;
            $store = new WordPressOptionConfigurationStateStore();

            $this->expectException(RuntimeException::class);
            $store->save(['formatVersion' => 1]);
        }

        public function testRejectsCorruptStoredOptionInsteadOfTreatingItAsMissing(): void
        {
            $GLOBALS['materialmatch_test_options'][WordPressOptionConfigurationStateStore::OPTION_NAME] = 'corrupt';

            $this->expectException(RuntimeException::class);
            (new WordPressOptionConfigurationStateStore())->load();
        }
    }
}
