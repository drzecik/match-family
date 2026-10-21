<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Admin;

use MaterialMatch\WordPress\Configuration\ConfigurationManager;
use MaterialMatch\WordPress\Security\ImportException;
use Throwable;

final class ConfigurationController
{
    private const PAGE = 'materialmatch-configuration';
    private const IMPORT_ACTION = 'materialmatch_import_configuration';
    private const EXPORT_ACTION = 'materialmatch_export_configuration';
    private const ROLLBACK_ACTION = 'materialmatch_rollback_configuration';
    private const IMPORT_NONCE = 'materialmatch_import_configuration';
    private const EXPORT_NONCE = 'materialmatch_export_configuration';
    private const ROLLBACK_NONCE = 'materialmatch_rollback_configuration';

    public function __construct(private readonly ConfigurationManager $manager)
    {
    }

    public function register(): void
    {
        add_action('admin_menu', [$this, 'addPage']);
        add_action('admin_post_' . self::IMPORT_ACTION, [$this, 'handleImport']);
        add_action('admin_post_' . self::EXPORT_ACTION, [$this, 'handleExport']);
        add_action('admin_post_' . self::ROLLBACK_ACTION, [$this, 'handleRollback']);
    }

    public function addPage(): void
    {
        add_submenu_page(
            'woocommerce',
            __('Konfiguracja MaterialMatch', 'materialmatch'),
            __('Konfiguracja MaterialMatch', 'materialmatch'),
            'manage_woocommerce',
            self::PAGE,
            [$this, 'renderPage'],
        );
    }

    public function renderPage(): void
    {
        $this->requireCapability();
        $status = isset($_GET['materialmatch_status']) ? sanitize_key(wp_unslash((string) $_GET['materialmatch_status'])) : '';
        $error = isset($_GET['materialmatch_error']) ? sanitize_key(wp_unslash((string) $_GET['materialmatch_error'])) : '';
        $current = $this->manager->current();

        echo '<div class="wrap"><h1>' . esc_html__('Konfiguracja MaterialMatch', 'materialmatch') . '</h1>';
        if ($status === 'success') {
            echo '<div class="notice notice-success"><p>' . esc_html__('Konfiguracja została sprawdzona i włączona.', 'materialmatch') . '</p></div>';
        } elseif ($status === 'rollback') {
            echo '<div class="notice notice-success"><p>' . esc_html__('Przywrócono wybraną poprawną wersję konfiguracji.', 'materialmatch') . '</p></div>';
        } elseif ($status === 'error') {
            echo '<div class="notice notice-error"><p>' . esc_html(PolishAdminErrorMessage::forCode($error)) . '</p></div>';
        }

        if ($current === null) {
            echo '<p>' . esc_html__('Brak aktywnej konfiguracji. Wczytaj poprawny plik JSON.', 'materialmatch') . '</p>';
        } else {
            echo '<p>' . esc_html(sprintf(__('Aktywna wersja konfiguracji: %d.', 'materialmatch'), $current->revision)) . '</p>';
            echo '<details><summary>' . esc_html__('Pokaż identyfikator techniczny', 'materialmatch') . '</summary><code>' . esc_html($current->checksum) . '</code></details>';
        }

        echo '<h2>' . esc_html__('Wczytaj konfigurację z pliku JSON', 'materialmatch') . '</h2>';
        echo '<p>' . esc_html__('Najpierw sprawdzimy cały plik. Nowa konfiguracja zostanie włączona tylko wtedy, gdy jest kompletna i poprawna. Maksymalny rozmiar pliku: 2 MiB.', 'materialmatch') . '</p>';
        echo '<form method="post" enctype="multipart/form-data" action="' . esc_url(admin_url('admin-post.php')) . '">';
        echo '<input type="hidden" name="action" value="' . esc_attr(self::IMPORT_ACTION) . '">';
        wp_nonce_field(self::IMPORT_NONCE);
        echo '<input type="file" name="materialmatch_configuration" accept=".json,application/json" required> ';
        submit_button(__('Sprawdź i włącz konfigurację', 'materialmatch'), 'primary', 'submit', false);
        echo '</form>';

        if ($current !== null) {
            echo '<h2>' . esc_html__('Kopia zapasowa konfiguracji', 'materialmatch') . '</h2>';
            echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
            echo '<input type="hidden" name="action" value="' . esc_attr(self::EXPORT_ACTION) . '">';
            wp_nonce_field(self::EXPORT_NONCE);
            submit_button(__('Pobierz aktywną konfigurację', 'materialmatch'), 'secondary', 'submit', false);
            echo '</form>';
        }

        echo '<h2>' . esc_html__('Poprzednie wersje konfiguracji', 'materialmatch') . '</h2><table class="widefat striped"><thead><tr>';
        echo '<th>' . esc_html__('Wersja', 'materialmatch') . '</th><th>' . esc_html__('Identyfikator', 'materialmatch') . '</th><th>' . esc_html__('Stan', 'materialmatch') . '</th><th>' . esc_html__('Działanie', 'materialmatch') . '</th></tr></thead><tbody>';
        foreach ($this->manager->revisions() as $revision) {
            echo '<tr><td>' . esc_html((string) $revision['revision']) . '</td><td><code>' . esc_html($revision['checksum']) . '</code></td>';
            echo '<td>' . esc_html($revision['active'] ? __('aktywna', 'materialmatch') : __('poprzednia', 'materialmatch')) . '</td><td>';
            if (!$revision['active']) {
                echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
                echo '<input type="hidden" name="action" value="' . esc_attr(self::ROLLBACK_ACTION) . '">';
                echo '<input type="hidden" name="revision" value="' . esc_attr((string) $revision['revision']) . '">';
                wp_nonce_field(self::ROLLBACK_NONCE . ':' . $revision['revision']);
                submit_button(__('Przywróć tę wersję', 'materialmatch'), 'secondary small', 'submit', false);
                echo '</form>';
            }
            echo '</td></tr>';
        }
        echo '</tbody></table></div>';
    }

    public function handleImport(): void
    {
        $this->requireCapability();
        check_admin_referer(self::IMPORT_NONCE);
        try {
            $upload = $_FILES['materialmatch_configuration'] ?? null;
            if (!is_array($upload) || !isset($upload['tmp_name'], $upload['name'], $upload['size'], $upload['error'])) {
                throw new ImportException('configuration.missing_file');
            }
            if ((int) $upload['error'] !== UPLOAD_ERR_OK || (int) $upload['size'] > ConfigurationManager::MAX_IMPORT_BYTES) {
                throw new ImportException('configuration.upload_failed');
            }
            if (strtolower(pathinfo(sanitize_file_name((string) $upload['name']), PATHINFO_EXTENSION)) !== 'json') {
                throw new ImportException('configuration.invalid_extension');
            }
            $path = (string) $upload['tmp_name'];
            if (!is_uploaded_file($path)) {
                throw new ImportException('configuration.invalid_upload');
            }
            $json = file_get_contents($path, false, null, 0, ConfigurationManager::MAX_IMPORT_BYTES + 1);
            if ($json === false) {
                throw new ImportException('configuration.file_unreadable');
            }
            $this->manager->import($json);
            $this->redirect(['materialmatch_status' => 'success']);
        } catch (ImportException $exception) {
            $this->redirectError($exception);
        } catch (Throwable) {
            $this->redirect(['materialmatch_status' => 'error', 'materialmatch_error' => 'unexpected_error']);
        }
    }

    public function handleExport(): never
    {
        $this->requireCapability();
        check_admin_referer(self::EXPORT_NONCE);
        try {
            $json = $this->manager->exportCurrent();
        } catch (ImportException $exception) {
            $this->redirectError($exception);
        }
        nocache_headers();
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="materialmatch-configuration.json"');
        header('X-Content-Type-Options: nosniff');
        echo $json; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- validated JSON download.
        exit;
    }

    public function handleRollback(): void
    {
        $this->requireCapability();
        $revision = isset($_POST['revision']) ? absint($_POST['revision']) : 0;
        check_admin_referer(self::ROLLBACK_NONCE . ':' . $revision);
        try {
            $this->manager->rollback($revision);
            $this->redirect(['materialmatch_status' => 'rollback']);
        } catch (ImportException $exception) {
            $this->redirectError($exception);
        } catch (Throwable) {
            $this->redirect(['materialmatch_status' => 'error', 'materialmatch_error' => 'unexpected_error']);
        }
    }

    private function requireCapability(): void
    {
        if (!current_user_can('manage_woocommerce')) {
            wp_die(esc_html__('Brak uprawnień do konfiguracji MaterialMatch.', 'materialmatch'), '', ['response' => 403]);
        }
    }

    private function redirectError(ImportException $exception): never
    {
        $code = explode(':', $exception->getMessage(), 2)[0];
        $this->redirect([
            'materialmatch_status' => 'error',
            'materialmatch_error' => sanitize_key(str_replace('.', '_', $code)),
        ]);
    }

    /** @param array<string, int|string> $parameters */
    private function redirect(array $parameters): never
    {
        $url = add_query_arg($parameters, admin_url('admin.php?page=' . self::PAGE));
        wp_safe_redirect($url);
        exit;
    }
}
