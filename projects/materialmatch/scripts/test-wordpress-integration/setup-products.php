<?php

declare(strict_types=1);

require_once '/wordpress/wp-load.php';

if (!class_exists('WooCommerce') || !class_exists('WC_Product_Simple')) {
    throw new RuntimeException('WooCommerce is not active.');
}
if (!class_exists(MaterialMatch\WordPress\Plugin::class)) {
    throw new RuntimeException('MaterialMatch is not active.');
}

/**
 * All products below are explicitly fictional integration-test data.
 */
function materialmatch_create_test_simple_product(
    string $sku,
    string $name,
    ?string $price,
    int $stockQuantity,
    bool $inStock = true,
): int {
    $product = new WC_Product_Simple();
    $product->set_name($name);
    $product->set_sku($sku);
    $product->set_status('publish');
    if ($price !== null) {
        $product->set_regular_price($price);
        $product->set_price($price);
    }
    $product->set_manage_stock(true);
    $product->set_stock_quantity($stockQuantity);
    $product->set_stock_status($inStock ? 'instock' : 'outofstock');

    return $product->save();
}

$panelId = materialmatch_create_test_simple_product(
    'FICTIONAL-MM-PANEL-NATURAL',
    'FICTIONAL MaterialMatch panel',
    '159.99',
    100,
);
materialmatch_create_test_simple_product(
    'FICTIONAL-MM-UNDERLAY',
    'FICTIONAL MaterialMatch underlay',
    '49.99',
    100,
);
materialmatch_create_test_simple_product(
    'FICTIONAL-MM-NO-PRICE',
    'FICTIONAL MaterialMatch product without price',
    null,
    100,
);
materialmatch_create_test_simple_product(
    'FICTIONAL-MM-OUT-OF-STOCK',
    'FICTIONAL MaterialMatch unavailable product',
    '19.99',
    0,
    false,
);

$parent = new WC_Product_Variable();
$parent->set_name('FICTIONAL MaterialMatch skirting');
$parent->set_status('publish');
$attribute = new WC_Product_Attribute();
$attribute->set_name('finish');
$attribute->set_options(['natural']);
$attribute->set_visible(true);
$attribute->set_variation(true);
$parent->set_attributes([$attribute]);
$parentId = $parent->save();

$variation = new WC_Product_Variation();
$variation->set_parent_id($parentId);
$variation->set_attributes(['finish' => 'natural']);
$variation->set_sku('FICTIONAL-MM-SKIRTING');
$variation->set_regular_price('29.99');
$variation->set_price('29.99');
$variation->set_status('publish');
$variation->set_manage_stock(true);
$variation->set_stock_quantity(100);
$variation->set_stock_status('instock');
$variationId = $variation->save();
WC_Product_Variable::sync($parentId);
update_post_meta($panelId, '_materialmatch_enabled', '1');

/**
 * Imports a fictional, generated configuration after all relevant WooCommerce
 * products exist. The integration harness passes only this deterministic
 * base64 payload; it never downloads catalog data or uses a real brand.
 */
function materialmatch_activate_test_configuration(string $configurationBase64): void
{
    $json = base64_decode($configurationBase64, true);
    if ($json === false) {
        throw new RuntimeException('Invalid fixture configuration encoding.');
    }

    $configuration = json_decode($json, true, 64, JSON_THROW_ON_ERROR);
    if (!is_array($configuration)) {
        throw new RuntimeException('Invalid fixture configuration.');
    }

    $manager = new MaterialMatch\WordPress\Configuration\ConfigurationManager(
        new MaterialMatch\WordPress\Infrastructure\WordPressOptionConfigurationStateStore(),
    );
    $manager->import(wp_json_encode($configuration, JSON_UNESCAPED_SLASHES));
    update_option('materialmatch_storefront_settings', [
        'autoEmbed' => true,
        'allowPartialCart' => true,
        'brandName' => 'MaterialMatch',
        'primaryColor' => '#1f6f5f',
        'logoAttachmentId' => 0,
    ], false);
}

echo wp_json_encode([
    'wordpress' => get_bloginfo('version'),
    'woocommerce' => defined('WC_VERSION') ? WC_VERSION : null,
    'materialmatch' => MATERIALMATCH_PLUGIN_VERSION,
    'variationId' => $variationId,
]);
