<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Admin;

use InvalidArgumentException;
use MaterialMatch\WordPress\Product\MetadataDefinition;
use WP_Post;

final class ProductMetadataController
{
    private const NONCE_ACTION = 'materialmatch_save_product_metadata';
    private const NONCE_FIELD = '_materialmatch_metadata_nonce';

    public function __construct(private readonly ProductMetadataValueAdapter $values = new ProductMetadataValueAdapter())
    {
    }

    public function register(): void
    {
        add_action('add_meta_boxes_product', [$this, 'addMetaBox']);
        add_action('save_post_product', [$this, 'save'], 10, 2);
    }

    public function addMetaBox(): void
    {
        add_meta_box(
            'materialmatch-product-metadata',
            __('MaterialMatch', 'materialmatch'),
            [$this, 'render'],
            'product',
            'normal',
            'default',
        );
    }

    public function render(WP_Post $post): void
    {
        wp_nonce_field(self::NONCE_ACTION, self::NONCE_FIELD);
        echo '<p>' . esc_html__('Uzupełnij tylko pola potrzebne kalkulatorowi. Powierzchnię podaj w metrach kwadratowych, a zapas w procentach.', 'materialmatch') . '</p>';

        foreach (MetadataDefinition::fields() as $field => $definition) {
            $metaKey = MetadataDefinition::metaKey($field);
            $stored = get_post_meta($post->ID, $metaKey, true);
            $inputName = 'materialmatch_meta[' . $field . ']';

            if ($definition['type'] === 'boolean') {
                echo '<p><label><input type="checkbox" name="' . esc_attr($inputName) . '" value="1" ' . checked($stored, '1', false) . '> ';
                echo esc_html($definition['label']) . '</label></p>';
                continue;
            }

            if ($definition['type'] === 'tags') {
                $decoded = json_decode((string) $stored, true);
                $stored = is_array($decoded) ? implode('|', array_map('strval', $decoded)) : '';
            }

            if ($this->values->usesFriendlyUnit($field)) {
                $stored = $this->values->toDisplay($field, (string) $stored);
            }

            $inputType = $definition['type'] === 'integer' && !$this->values->usesFriendlyUnit($field) ? 'number' : 'text';
            echo '<p><label for="' . esc_attr('materialmatch-' . $field) . '">';
            echo esc_html($definition['label']) . '</label><br>';
            echo '<input class="widefat" id="' . esc_attr('materialmatch-' . $field) . '" name="' . esc_attr($inputName) . '" type="' . esc_attr($inputType) . '" value="' . esc_attr((string) $stored) . '"';
            if ($definition['type'] === 'integer' && !$this->values->usesFriendlyUnit($field)) {
                echo ' min="' . esc_attr((string) $definition['min']) . '" max="' . esc_attr((string) $definition['max']) . '" step="1" inputmode="numeric"';
            } elseif ($this->values->usesFriendlyUnit($field)) {
                echo ' inputmode="decimal" placeholder="0"';
            }
            echo '></p>';
        }
    }

    public function save(int $postId, WP_Post $post): void
    {
        if ($post->post_type !== 'product' || wp_is_post_revision($postId) || wp_is_post_autosave($postId)) {
            return;
        }
        if (!current_user_can('edit_post', $postId)) {
            return;
        }

        $nonce = isset($_POST[self::NONCE_FIELD]) ? sanitize_text_field(wp_unslash((string) $_POST[self::NONCE_FIELD])) : '';
        if ($nonce === '' || !wp_verify_nonce($nonce, self::NONCE_ACTION)) {
            return;
        }

        $submitted = isset($_POST['materialmatch_meta']) && is_array($_POST['materialmatch_meta'])
            ? wp_unslash($_POST['materialmatch_meta'])
            : [];

        foreach (MetadataDefinition::fields() as $field => $definition) {
            $raw = $submitted[$field] ?? null;
            $metaKey = MetadataDefinition::metaKey($field);

            if ($definition['type'] === 'boolean') {
                update_post_meta($postId, $metaKey, isset($submitted[$field]) ? '1' : '0');
                continue;
            }

            if ($raw === null || trim((string) $raw) === '') {
                delete_post_meta($postId, $metaKey);
                continue;
            }

            try {
                $value = MetadataDefinition::sanitize($field, $this->values->toStorage($field, $raw));
            } catch (InvalidArgumentException) {
                continue;
            }

            update_post_meta(
                $postId,
                $metaKey,
                is_array($value) ? wp_json_encode($value) : (string) $value,
            );
        }
    }
}
