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

    if (!function_exists('get_post_meta')) {
        function get_post_meta(int $postId, string $key, bool $single = false): string
        {
            return (string) ($GLOBALS['materialmatch_storefront_meta'][$postId][$key] ?? '');
        }
    }

    if (!function_exists('get_the_ID')) {
        function get_the_ID(): int
        {
            return (int) ($GLOBALS['materialmatch_storefront_current_product_id'] ?? 0);
        }
    }

    if (!function_exists('wc_get_product')) {
        function wc_get_product(int $productId): ?MaterialMatchFakeWooProduct
        {
            return $GLOBALS['materialmatch_storefront_products'][$productId] ?? null;
        }
    }

    if (!function_exists('wc_get_product_id_by_sku')) {
        function wc_get_product_id_by_sku(string $sku): int
        {
            return (int) ($GLOBALS['materialmatch_storefront_skus'][$sku] ?? 0);
        }
    }

    if (!function_exists('shortcode_atts')) {
        /** @param array<string, mixed> $pairs
         * @param array<string, mixed> $attributes
         * @return array<string, mixed>
         */
        function shortcode_atts(array $pairs, array $attributes, string $shortcode = ''): array
        {
            return array_merge($pairs, array_intersect_key($attributes, $pairs));
        }
    }

    if (!function_exists('absint')) {
        function absint(mixed $value): int
        {
            return max(0, (int) $value);
        }
    }

    if (!function_exists('wp_json_encode')) {
        function wp_json_encode(mixed $value, int $flags = 0): string|false
        {
            return json_encode($value, $flags);
        }
    }

    if (!function_exists('wp_enqueue_script')) {
        function wp_enqueue_script(string $handle): void
        {
            $GLOBALS['materialmatch_storefront_enqueued'][] = $handle;
        }
    }

    if (!function_exists('wp_create_nonce')) {
        function wp_create_nonce(string $action): string
        {
            return 'test-nonce-' . $action;
        }
    }

    if (!function_exists('admin_url')) {
        function admin_url(string $path = ''): string
        {
            return '/wp-admin/' . ltrim($path, '/');
        }
    }

    if (!function_exists('wp_get_attachment_image_url')) {
        function wp_get_attachment_image_url(int $attachmentId, string $size = 'full'): string|false
        {
            return false;
        }
    }

    if (!function_exists('wp_strip_all_tags')) {
        function wp_strip_all_tags(string $text): string
        {
            return strip_tags($text);
        }
    }

    if (!function_exists('esc_attr')) {
        function esc_attr(string $text): string
        {
            return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }
    }

    if (!function_exists('esc_url')) {
        function esc_url(string $url): string
        {
            return htmlspecialchars($url, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }
    }

    final class MaterialMatchFakeWooProduct
    {
        /** @param list<int> $children */
        public function __construct(
            private readonly string $sku,
            private readonly string $name,
            private readonly bool $variable = false,
            private readonly array $children = [],
        ) {
        }

        public function get_sku(): string
        {
            return $this->sku;
        }

        public function get_name(): string
        {
            return $this->name;
        }

        public function is_type(string $type): bool
        {
            return $type === 'variable' && $this->variable;
        }

        /** @return list<int> */
        public function get_children(): array
        {
            return $this->children;
        }
    }
}

namespace MaterialMatch\WordPress\Tests {
    use MaterialMatch\WordPress\Configuration\ConfigurationManager;
    use MaterialMatch\WordPress\Contract\ConfigurationStateStore;
    use MaterialMatch\WordPress\Infrastructure\WordPressStorefrontSettings;
    use MaterialMatch\WordPress\Storefront\CalculatorEmbedController;
    use MaterialMatch\WordPress\Tests\Fixtures\ConfigurationFixture;
    use PHPUnit\Framework\TestCase;

    final class CalculatorEmbedControllerTest extends TestCase
    {
        protected function setUp(): void
        {
            $GLOBALS['materialmatch_test_options'] = [];
            $GLOBALS['materialmatch_test_fail_option_write'] = false;
            $GLOBALS['materialmatch_storefront_meta'] = [
                42 => ['_materialmatch_enabled' => '1'],
                43 => ['_materialmatch_enabled' => '0'],
            ];
            $GLOBALS['materialmatch_storefront_current_product_id'] = 42;
            $GLOBALS['materialmatch_storefront_products'] = [
                42 => new \MaterialMatchFakeWooProduct('FICTIONAL-MM-PANEL', 'Fikcyjny panel'),
                43 => new \MaterialMatchFakeWooProduct('UNCONFIGURED-SKU', 'Inny produkt'),
            ];
            $GLOBALS['materialmatch_storefront_skus'] = [
                'FICTIONAL-MM-PANEL' => 42,
                'FICTIONAL-MM-UNDERLAY' => 99,
            ];
            $GLOBALS['materialmatch_storefront_enqueued'] = [];
        }

        public function testRendersOnlyForAnEnabledProductBoundToTheActiveConfiguration(): void
        {
            $html = $this->controller()->renderShortcode(['product_id' => '42']);

            self::assertStringContainsString('<material-match data-materialmatch-wordpress', $html);
            self::assertStringContainsString('data-ajax-url="/wp-admin/admin-ajax.php"', $html);
            self::assertStringContainsString('data-ajax-action="materialmatch_add_bundle"', $html);
            self::assertStringContainsString('data-ajax-nonce="test-nonce-materialmatch_add_bundle_to_cart"', $html);
            self::assertStringContainsString('data-configuration-checksum="', $html);
            self::assertStringContainsString('data-materialmatch-configuration', $html);
            self::assertSame(['materialmatch-widget', 'materialmatch-wordpress-bridge'], $GLOBALS['materialmatch_storefront_enqueued']);
        }

        public function testEscapesConfigurationJsonBeforeEmbeddingItInHtml(): void
        {
            $configuration = ConfigurationFixture::valid();
            $configuration['locale'] = '</script><script>alert(1)</script>';

            $html = $this->controller($configuration)->renderShortcode(['product_id' => '42']);

            self::assertStringNotContainsString('</script><script>', $html);
            self::assertStringContainsString('\\u003C/script\\u003E', $html);
        }

        public function testDoesNotRenderForDisabledOrUnconfiguredProducts(): void
        {
            $controller = $this->controller();

            self::assertSame('', $controller->renderShortcode(['product_id' => '43']));
            $GLOBALS['materialmatch_storefront_meta'][43]['_materialmatch_enabled'] = '1';
            self::assertSame('', $controller->renderShortcode(['product_id' => '43']));
            self::assertSame([], $GLOBALS['materialmatch_storefront_enqueued']);
        }

        public function testAutomaticEmbedRespectsTheStorefrontSetting(): void
        {
            $settings = new WordPressStorefrontSettings();
            $settings->save([
                'autoEmbed' => false,
                'allowPartialCart' => false,
                'brandName' => 'MaterialMatch',
                'primaryColor' => '#1f6f5f',
                'logoAttachmentId' => 0,
            ]);
            $controller = $this->controller(settings: $settings);

            ob_start();
            $controller->renderAutomatically();
            self::assertSame('', ob_get_clean());

            $settings->save([
                'autoEmbed' => true,
                'allowPartialCart' => false,
                'brandName' => 'MaterialMatch',
                'primaryColor' => '#1f6f5f',
                'logoAttachmentId' => 0,
            ]);
            ob_start();
            $controller->renderAutomatically();
            $html = (string) ob_get_clean();

            self::assertStringContainsString('<material-match data-materialmatch-wordpress', $html);
        }

        /** @param array<string, mixed>|null $configuration */
        private function controller(?array $configuration = null, ?WordPressStorefrontSettings $settings = null): CalculatorEmbedController
        {
            $store = new class implements ConfigurationStateStore {
                /** @var array<string, mixed>|null */
                private ?array $state = null;

                public function load(): ?array
                {
                    return $this->state;
                }

                public function save(array $state): void
                {
                    $this->state = $state;
                }
            };
            $manager = new ConfigurationManager($store);
            $manager->import(json_encode($configuration ?? ConfigurationFixture::valid(), JSON_THROW_ON_ERROR));

            return new CalculatorEmbedController($manager, $settings ?? new WordPressStorefrontSettings());
        }
    }
}
