<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Admin;

use MaterialMatch\WordPress\Security\CsvImportGuard;
use MaterialMatch\WordPress\Security\ImportException;
use MaterialMatch\WordPress\Infrastructure\WordPressProductMetadataStore;
use Throwable;

final class CsvImportController
{
    private const ACTION = 'materialmatch_import_csv';
    private const NONCE_ACTION = 'materialmatch_import_product_metadata';

    public function register(): void
    {
        add_action('admin_menu', [$this, 'addPage']);
        add_action('admin_post_' . self::ACTION, [$this, 'handle']);
    }

    public function addPage(): void
    {
        add_submenu_page(
            'woocommerce',
            __('Wczytaj dane produktów', 'materialmatch'),
            __('Wczytaj dane produktów', 'materialmatch'),
            'manage_woocommerce',
            'materialmatch-import',
            [$this, 'renderPage'],
        );
    }

    public function renderPage(): void
    {
        if (!current_user_can('manage_woocommerce')) {
            wp_die(esc_html__('Brak uprawnień do importu MaterialMatch.', 'materialmatch'), '', ['response' => 403]);
        }

        $status = isset($_GET['materialmatch_status']) ? sanitize_key(wp_unslash((string) $_GET['materialmatch_status'])) : '';
        $count = isset($_GET['materialmatch_count']) ? absint($_GET['materialmatch_count']) : 0;
        $error = isset($_GET['materialmatch_error']) ? sanitize_key(wp_unslash((string) $_GET['materialmatch_error'])) : '';

        echo '<div class="wrap"><h1>' . esc_html__('Wczytaj dane produktów do MaterialMatch', 'materialmatch') . '</h1>';
        if ($status === 'success') {
            echo '<div class="notice notice-success"><p>' . esc_html(sprintf(__('Dane zostały sprawdzone i zapisane. Liczba produktów: %d.', 'materialmatch'), $count)) . '</p></div>';
        } elseif ($status === 'error') {
            echo '<div class="notice notice-error"><p>' . esc_html(PolishAdminErrorMessage::forCode($error)) . '</p></div>';
        }

        echo '<p>' . esc_html__('Wybierz plik CSV zapisany w UTF-8. Kolumna „kod_produktu” musi zawierać kody SKU istniejące w WooCommerce. Powierzchnię podaj w m², zapas w procentach, a pola wyboru jako „tak” lub „nie”. Przed zapisaniem sprawdzimy cały plik — błędny plik nie zmieni danych sklepu.', 'materialmatch') . '</p>';
        echo '<form method="post" enctype="multipart/form-data" action="' . esc_url(admin_url('admin-post.php')) . '">';
        echo '<input type="hidden" name="action" value="' . esc_attr(self::ACTION) . '">';
        wp_nonce_field(self::NONCE_ACTION);
        echo '<input type="file" name="materialmatch_csv" accept=".csv,text/csv" required> ';
        submit_button(__('Sprawdź i wczytaj dane', 'materialmatch'), 'primary', 'submit', false);
        echo '</form></div>';
    }

    public function handle(): void
    {
        if (!current_user_can('manage_woocommerce')) {
            wp_die(esc_html__('Brak uprawnień do importu MaterialMatch.', 'materialmatch'), '', ['response' => 403]);
        }
        check_admin_referer(self::NONCE_ACTION);

        try {
            $upload = $_FILES['materialmatch_csv'] ?? null;
            if (!is_array($upload) || !isset($upload['tmp_name'], $upload['name'], $upload['size'], $upload['error'])) {
                throw new ImportException('import.missing_file');
            }
            if ((int) $upload['error'] !== UPLOAD_ERR_OK || (int) $upload['size'] > CsvImportGuard::MAX_BYTES) {
                throw new ImportException('import.upload_failed');
            }
            if (strtolower(pathinfo(sanitize_file_name((string) $upload['name']), PATHINFO_EXTENSION)) !== 'csv') {
                throw new ImportException('import.invalid_extension');
            }

            $path = (string) $upload['tmp_name'];
            if (!is_uploaded_file($path)) {
                throw new ImportException('import.invalid_upload');
            }

            $rows = (new CsvImportGuard())->parse($path);
            $count = (new CsvProductMetadataImporter(new WordPressProductMetadataStore()))->import($rows);
            $this->redirect(['materialmatch_status' => 'success', 'materialmatch_count' => $count]);
        } catch (ImportException $exception) {
            $this->redirect([
                'materialmatch_status' => 'error',
                'materialmatch_error' => sanitize_key(str_replace('.', '_', $exception->getMessage())),
            ]);
        } catch (Throwable) {
            $this->redirect(['materialmatch_status' => 'error', 'materialmatch_error' => 'unexpected_error']);
        }
    }

    /** @param array<string, int|string> $parameters */
    private function redirect(array $parameters): never
    {
        $url = add_query_arg($parameters, admin_url('admin.php?page=materialmatch-import'));
        wp_safe_redirect($url);
        exit;
    }
}
