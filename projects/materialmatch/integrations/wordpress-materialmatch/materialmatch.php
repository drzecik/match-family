<?php
/**
 * Plugin Name: MaterialMatch
 * Description: Local material calculation and WooCommerce bundle integration.
 * Version: 0.1.0-dev
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * Requires Plugins: woocommerce
 * WC requires at least: 8.0
 * Text Domain: materialmatch
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

define('MATERIALMATCH_PLUGIN_FILE', __FILE__);
define('MATERIALMATCH_PLUGIN_VERSION', '0.1.0-dev');

$materialmatchAutoload = __DIR__ . '/vendor/autoload.php';
if (is_readable($materialmatchAutoload)) {
    require_once $materialmatchAutoload;
} else {
    require_once __DIR__ . '/src/autoload.php';
}

add_action(
    'plugins_loaded',
    static function (): void {
        MaterialMatch\WordPress\Plugin::boot();
    },
);
