<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Storefront;

use MaterialMatch\WordPress\Configuration\ConfigurationManager;
use MaterialMatch\WordPress\Infrastructure\WordPressStorefrontSettings;
use Throwable;

final class CalculatorEmbedController
{
    private const WIDGET_HANDLE = 'materialmatch-widget';
    private const BRIDGE_HANDLE = 'materialmatch-wordpress-bridge';
    private static int $instance = 0;

    public function __construct(
        private readonly ConfigurationManager $configurations,
        private readonly WordPressStorefrontSettings $settings,
        private readonly WidgetConfigurationFactory $factory = new WidgetConfigurationFactory(),
    ) {
    }

    public function register(): void
    {
        add_action('init', [$this, 'registerAssets']);
        add_shortcode('materialmatch', [$this, 'renderShortcode']);
        add_action('woocommerce_after_add_to_cart_form', [$this, 'renderAutomatically']);
    }

    public function registerAssets(): void
    {
        $baseUrl = plugin_dir_url(MATERIALMATCH_PLUGIN_FILE);
        wp_register_script(
            self::WIDGET_HANDLE,
            $baseUrl . 'assets/widget/materialmatch-widget.js',
            [],
            MATERIALMATCH_PLUGIN_VERSION,
            true,
        );
        wp_script_add_data(self::WIDGET_HANDLE, 'type', 'module');
        wp_register_script(
            self::BRIDGE_HANDLE,
            $baseUrl . 'assets/materialmatch-wordpress.js',
            [self::WIDGET_HANDLE],
            MATERIALMATCH_PLUGIN_VERSION,
            true,
        );
        wp_script_add_data(self::BRIDGE_HANDLE, 'type', 'module');
    }

    public function renderAutomatically(): void
    {
        try {
            if (!$this->settings->load()['autoEmbed']) {
                return;
            }
        } catch (Throwable) {
            return;
        }

        echo $this->renderShortcode(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- generated exclusively by escaped renderer.
    }

    /** @param array<string, mixed> $attributes */
    public function renderShortcode(array $attributes = []): string
    {
        $attributes = shortcode_atts(['product_id' => '0'], $attributes, 'materialmatch');
        $productId = absint($attributes['product_id']);
        if ($productId < 1 && function_exists('get_the_ID')) {
            $productId = (int) get_the_ID();
        }
        if ($productId < 1 || get_post_meta($productId, '_materialmatch_enabled', true) !== '1') {
            return '';
        }

        try {
            $revision = $this->configurations->current();
            $settings = $this->settings->load();
        } catch (Throwable) {
            return '';
        }
        if ($revision === null || !$this->configurationContainsProduct($revision->configuration, $productId)) {
            return '';
        }

        $brand = ['name' => $settings['brandName']];
        if ($settings['logoAttachmentId'] > 0) {
            $logoUrl = wp_get_attachment_image_url($settings['logoAttachmentId'], 'full');
            if (is_string($logoUrl) && $logoUrl !== '') {
                $brand['logoUrl'] = $logoUrl;
            }
        }
        $widgetConfiguration = $this->factory->create(
            $revision,
            $settings['allowPartialCart'],
            $brand,
            $this->productNames($revision->configuration),
        );
        $json = wp_json_encode(
            $widgetConfiguration,
            JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
        );
        if (!is_string($json)) {
            return '';
        }

        wp_enqueue_script(self::WIDGET_HANDLE);
        wp_enqueue_script(self::BRIDGE_HANDLE);
        $client = CartAjaxController::clientConfiguration();
        $instanceId = 'materialmatch-' . $productId . '-' . (++self::$instance);

        return '<div class="materialmatch-wordpress" id="' . esc_attr($instanceId) . '">'
            . '<material-match data-materialmatch-wordpress'
            . ' data-ajax-url="' . esc_url($client['url']) . '"'
            . ' data-ajax-action="' . esc_attr($client['action']) . '"'
            . ' data-ajax-nonce="' . esc_attr($client['nonce']) . '"'
            . ' data-configuration-checksum="' . esc_attr($revision->checksum) . '"'
            . ' data-allow-partial="' . ($settings['allowPartialCart'] ? '1' : '0') . '"'
            . ' style="--mm-color-primary:' . esc_attr($settings['primaryColor']) . '">'
            . '<script type="application/json" data-materialmatch-configuration>' . $json . '</script>'
            . '</material-match>'
            . '<p data-materialmatch-cart-status role="status" aria-live="polite"></p>'
            . '</div>';
    }

    /** @param array<string, mixed> $configuration */
    private function configurationContainsProduct(array $configuration, int $productId): bool
    {
        if (!function_exists('wc_get_product')) {
            return false;
        }
        $product = wc_get_product($productId);
        if (!$product) {
            return false;
        }
        $acceptedSkus = [];
        $sku = (string) $product->get_sku();
        if ($sku !== '') {
            $acceptedSkus[$sku] = true;
        }
        if ($product->is_type('variable')) {
            foreach ($product->get_children() as $childId) {
                $child = wc_get_product((int) $childId);
                if ($child && (string) $child->get_sku() !== '') {
                    $acceptedSkus[(string) $child->get_sku()] = true;
                }
            }
        }
        foreach (($configuration['mainProduct']['variants'] ?? []) as $variant) {
            if (is_array($variant) && isset($variant['sku']) && isset($acceptedSkus[(string) $variant['sku']])) {
                return true;
            }
        }
        return false;
    }

    /** @param array<string, mixed> $configuration
     *  @return array<string, string>
     */
    private function productNames(array $configuration): array
    {
        $names = [];
        $products = [$configuration['mainProduct'] ?? null, ...($configuration['accessories'] ?? [])];
        foreach ($products as $product) {
            if (!is_array($product) || !isset($product['id'])) {
                continue;
            }
            $variant = isset($product['variant']) && is_array($product['variant'])
                ? $product['variant']
                : (($product['variants'][0] ?? null));
            if (!is_array($variant) || !isset($variant['sku']) || !function_exists('wc_get_product_id_by_sku')) {
                continue;
            }
            $wooId = (int) wc_get_product_id_by_sku((string) $variant['sku']);
            $wooProduct = $wooId > 0 && function_exists('wc_get_product') ? wc_get_product($wooId) : null;
            if ($wooProduct) {
                $names[(string) $product['id']] = wp_strip_all_tags((string) $wooProduct->get_name());
            }
        }
        return $names;
    }
}
