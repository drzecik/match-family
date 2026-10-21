<?php

declare(strict_types=1);

namespace {
    if (!function_exists('add_action')) {
        function add_action(string $hook, callable $callback, int $priority = 10, int $acceptedArgs = 1): void
        {
            $GLOBALS['materialmatch_test_actions'][] = $hook;
        }
    }

    if (!function_exists('current_user_can')) {
        function current_user_can(string $capability): bool
        {
            $GLOBALS['materialmatch_test_checked_capability'] = $capability;
            return (bool) ($GLOBALS['materialmatch_test_authorized'] ?? false);
        }
    }

    if (!function_exists('esc_html__')) {
        function esc_html__(string $text, string $domain = 'default'): string
        {
            return $text;
        }
    }

    if (!function_exists('wp_die')) {
        function wp_die(mixed $message = '', mixed $title = '', array $args = []): never
        {
            throw new \RuntimeException('wp_die:' . (string) ($args['response'] ?? ''));
        }
    }
}

namespace MaterialMatch\WordPress\Tests {
    use MaterialMatch\WordPress\Admin\ConfigurationController;
    use MaterialMatch\WordPress\Configuration\ConfigurationManager;
    use MaterialMatch\WordPress\Contract\ConfigurationStateStore;
    use PHPUnit\Framework\TestCase;
    use RuntimeException;

    final class ConfigurationControllerSecurityTest extends TestCase
    {
        protected function setUp(): void
        {
            $GLOBALS['materialmatch_test_actions'] = [];
            $GLOBALS['materialmatch_test_authorized'] = false;
            unset($GLOBALS['materialmatch_test_checked_capability']);
        }

        public function testRegistersOnlyExplicitAdminActions(): void
        {
            $this->controller()->register();

            self::assertSame([
                'admin_menu',
                'admin_post_materialmatch_import_configuration',
                'admin_post_materialmatch_export_configuration',
                'admin_post_materialmatch_rollback_configuration',
            ], $GLOBALS['materialmatch_test_actions']);
        }

        public function testRejectsPageBeforeReadingStateWithoutWooCommerceCapability(): void
        {
            $this->expectException(RuntimeException::class);
            $this->expectExceptionMessage('wp_die:403');
            try {
                $this->controller()->renderPage();
            } finally {
                self::assertSame('manage_woocommerce', $GLOBALS['materialmatch_test_checked_capability']);
            }
        }

        private function controller(): ConfigurationController
        {
            $store = new class implements ConfigurationStateStore {
                public function load(): ?array
                {
                    return null;
                }

                public function save(array $state): void
                {
                }
            };
            return new ConfigurationController(new ConfigurationManager($store));
        }
    }
}
