<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress;

use MaterialMatch\WooCommerce\Infrastructure\WooCommerceCartGateway;
use MaterialMatch\WooCommerce\Infrastructure\WooCommerceProductCatalog;
use MaterialMatch\WooCommerce\Service\AddBundleToCart;
use MaterialMatch\WordPress\Admin\CsvImportController;
use MaterialMatch\WordPress\Admin\ConfigurationController;
use MaterialMatch\WordPress\Admin\ProductMetadataController;
use MaterialMatch\WordPress\Admin\StorefrontSettingsController;
use MaterialMatch\WordPress\Configuration\ConfigurationManager;
use MaterialMatch\WordPress\Infrastructure\WordPressOptionConfigurationStateStore;
use MaterialMatch\WordPress\Infrastructure\WordPressStorefrontSettings;
use MaterialMatch\WordPress\Licensing\LocalOpenLicenseProvider;
use MaterialMatch\WordPress\Storefront\CartAjaxController;
use MaterialMatch\WordPress\Storefront\CalculatorEmbedController;

final class Plugin
{
    private static bool $booted = false;

    public static function boot(): void
    {
        if (self::$booted) {
            return;
        }
        self::$booted = true;

        $license = new LocalOpenLicenseProvider();
        if (!$license->isFeatureAllowed('core')) {
            return;
        }

        $configurationManager = new ConfigurationManager(new WordPressOptionConfigurationStateStore());
        $storefrontSettings = new WordPressStorefrontSettings();

        (new ProductMetadataController())->register();
        (new CsvImportController())->register();
        (new ConfigurationController($configurationManager))->register();
        (new StorefrontSettingsController($storefrontSettings))->register();
        (new CalculatorEmbedController($configurationManager, $storefrontSettings))->register();

        if (class_exists(AddBundleToCart::class) && function_exists('WC')) {
            $service = new AddBundleToCart(
                new WooCommerceProductCatalog(),
                new WooCommerceCartGateway(),
            );
            try {
                $settings = $storefrontSettings->load();
            } catch (\Throwable) {
                $settings = ['allowPartialCart' => false];
            }
            (new CartAjaxController(
                $service,
                (bool) $settings['allowPartialCart'],
                $configurationManager,
            ))->register();
        } else {
            add_action('admin_notices', [self::class, 'renderMissingAdapterNotice']);
        }
    }

    public static function renderMissingAdapterNotice(): void
    {
        if (!current_user_can('manage_woocommerce')) {
            return;
        }

        echo '<div class="notice notice-warning"><p>';
        echo esc_html__('MaterialMatch nie może połączyć się z WooCommerce. Zainstaluj kompletną paczkę wydania wtyczki.', 'materialmatch');
        echo '</p></div>';
    }
}
