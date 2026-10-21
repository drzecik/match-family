<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Admin;

use MaterialMatch\WordPress\Infrastructure\WordPressStorefrontSettings;
use Throwable;

final class StorefrontSettingsController
{
    private const PAGE = 'materialmatch-storefront';
    private const ACTION = 'materialmatch_save_storefront_settings';
    private const NONCE = 'materialmatch_save_storefront_settings';

    public function __construct(private readonly WordPressStorefrontSettings $settings)
    {
    }

    public function register(): void
    {
        add_action('admin_menu', [$this, 'addPage']);
        add_action('admin_enqueue_scripts', [$this, 'enqueueAssets']);
        add_action('admin_post_' . self::ACTION, [$this, 'handleSave']);
    }

    public function enqueueAssets(): void
    {
        $page = isset($_GET['page']) ? sanitize_key(wp_unslash((string) $_GET['page'])) : '';
        if ($page !== self::PAGE) {
            return;
        }
        wp_enqueue_media();
        wp_enqueue_script(
            'materialmatch-admin',
            plugin_dir_url(MATERIALMATCH_PLUGIN_FILE) . 'assets/materialmatch-admin.js',
            [],
            MATERIALMATCH_PLUGIN_VERSION,
            true,
        );
    }

    public function addPage(): void
    {
        add_submenu_page(
            'woocommerce',
            __('Wygląd MaterialMatch', 'materialmatch'),
            __('Wygląd MaterialMatch', 'materialmatch'),
            'manage_woocommerce',
            self::PAGE,
            [$this, 'renderPage'],
        );
    }

    public function renderPage(): void
    {
        $this->requireCapability();
        $settings = $this->settings->load();
        $status = isset($_GET['materialmatch_status']) ? sanitize_key(wp_unslash((string) $_GET['materialmatch_status'])) : '';

        echo '<div class="wrap"><h1>' . esc_html__('Wygląd i koszyk MaterialMatch', 'materialmatch') . '</h1>';
        if ($status === 'success') {
            echo '<div class="notice notice-success"><p>' . esc_html__('Ustawienia zapisano.', 'materialmatch') . '</p></div>';
        } elseif ($status === 'error') {
            echo '<div class="notice notice-error"><p>' . esc_html__('Ustawienia odrzucono. Sprawdź wszystkie pola.', 'materialmatch') . '</p></div>';
        }
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
        echo '<input type="hidden" name="action" value="' . esc_attr(self::ACTION) . '">';
        wp_nonce_field(self::NONCE);
        echo '<table class="form-table" role="presentation"><tbody>';
        $this->checkbox('auto_embed', __('Automatycznie pokaż kalkulator na włączonych produktach', 'materialmatch'), $settings['autoEmbed']);
        $this->checkbox('allow_partial_cart', __('Pozwól klientowi dodać dostępne pozycje z niepełnego zestawu', 'materialmatch'), $settings['allowPartialCart']);
        echo '<tr><th><label for="materialmatch-brand-name">' . esc_html__('Nazwa marki', 'materialmatch') . '</label></th><td>';
        echo '<input class="regular-text" id="materialmatch-brand-name" name="brand_name" maxlength="80" required value="' . esc_attr($settings['brandName']) . '"></td></tr>';
        echo '<tr><th><label for="materialmatch-primary-color">' . esc_html__('Kolor główny', 'materialmatch') . '</label></th><td>';
        echo '<input id="materialmatch-primary-color" name="primary_color" type="color" value="' . esc_attr($settings['primaryColor']) . '"></td></tr>';
        $logoUrl = $settings['logoAttachmentId'] > 0 ? wp_get_attachment_image_url($settings['logoAttachmentId'], 'medium') : false;
        echo '<tr><th>' . esc_html__('Logo kalkulatora', 'materialmatch') . '</th><td><div data-materialmatch-logo-picker>';
        echo '<input id="materialmatch-logo-id" name="logo_attachment_id" type="hidden" value="' . esc_attr((string) $settings['logoAttachmentId']) . '">';
        echo '<img data-materialmatch-logo-preview src="' . esc_url($logoUrl ?: '') . '" alt="' . esc_attr__('Podgląd wybranego logo', 'materialmatch') . '" style="display:' . ($logoUrl ? 'block' : 'none') . ';max-width:240px;max-height:100px;margin-bottom:12px">';
        echo '<button data-materialmatch-logo-select class="button" type="button">' . esc_html__('Wybierz logo z biblioteki mediów', 'materialmatch') . '</button> ';
        echo '<button data-materialmatch-logo-remove class="button" type="button"' . ($logoUrl ? '' : ' hidden') . '>' . esc_html__('Usuń logo', 'materialmatch') . '</button>';
        echo '<p class="description">' . esc_html__('Logo pozostaje w bibliotece mediów tego sklepu i nie jest wysyłane na zewnętrzny serwer.', 'materialmatch') . '</p></div></td></tr>';
        echo '</tbody></table>';
        submit_button(__('Zapisz ustawienia', 'materialmatch'));
        echo '</form></div>';
    }

    public function handleSave(): void
    {
        $this->requireCapability();
        check_admin_referer(self::NONCE);
        try {
            $this->settings->save([
                'autoEmbed' => isset($_POST['auto_embed']),
                'allowPartialCart' => isset($_POST['allow_partial_cart']),
                'brandName' => isset($_POST['brand_name']) ? sanitize_text_field(wp_unslash((string) $_POST['brand_name'])) : '',
                'primaryColor' => isset($_POST['primary_color']) ? sanitize_text_field(wp_unslash((string) $_POST['primary_color'])) : '',
                'logoAttachmentId' => isset($_POST['logo_attachment_id']) ? absint($_POST['logo_attachment_id']) : 0,
            ]);
            $this->redirect('success');
        } catch (Throwable) {
            $this->redirect('error');
        }
    }

    private function checkbox(string $name, string $label, bool $checkedValue): void
    {
        echo '<tr><th scope="row">' . esc_html($label) . '</th><td><label>';
        echo '<input name="' . esc_attr($name) . '" type="checkbox" value="1" ' . checked($checkedValue, true, false) . '> ';
        echo esc_html__('Włączone', 'materialmatch') . '</label></td></tr>';
    }

    private function requireCapability(): void
    {
        if (!current_user_can('manage_woocommerce')) {
            wp_die(esc_html__('Brak uprawnień do ustawień MaterialMatch.', 'materialmatch'), '', ['response' => 403]);
        }
    }

    private function redirect(string $status): never
    {
        wp_safe_redirect(add_query_arg(
            ['materialmatch_status' => $status],
            admin_url('admin.php?page=' . self::PAGE),
        ));
        exit;
    }
}
