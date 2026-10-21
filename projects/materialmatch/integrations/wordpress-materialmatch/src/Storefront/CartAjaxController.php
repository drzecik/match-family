<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Storefront;

use InvalidArgumentException;
use JsonException;
use MaterialMatch\WooCommerce\Model\CartLine;
use MaterialMatch\WooCommerce\Service\AddBundleToCart;
use MaterialMatch\WordPress\Configuration\ConfigurationManager;
use RuntimeException;
use Throwable;

final class CartAjaxController
{
    public const AJAX_ACTION = 'materialmatch_add_bundle';
    public const NONCE_ACTION = 'materialmatch_add_bundle_to_cart';
    private const MAX_REQUEST_BYTES = 65536;

    public function __construct(
        private readonly AddBundleToCart $service,
        private readonly bool $partialBundlesAllowed = false,
        private readonly ?ConfigurationManager $configurations = null,
        private readonly ?TrustedCartCalculator $trustedCalculator = null,
    ) {
    }

    public function register(): void
    {
        add_action('wp_ajax_' . self::AJAX_ACTION, [$this, 'handle']);
        add_action('wp_ajax_nopriv_' . self::AJAX_ACTION, [$this, 'handle']);
    }

    /**
     * The widget integration should expose these values to JavaScript using
     * wp_localize_script(), never by interpolating unescaped inline code.
     *
     * @return array{url: string, action: string, nonce: string}
     */
    public static function clientConfiguration(): array
    {
        return [
            'url' => admin_url('admin-ajax.php'),
            'action' => self::AJAX_ACTION,
            'nonce' => wp_create_nonce(self::NONCE_ACTION),
        ];
    }

    public function handle(): void
    {
        check_ajax_referer(self::NONCE_ACTION, 'nonce');

        $rawLines = isset($_POST['lines']) ? wp_unslash((string) $_POST['lines']) : '';
        if ($rawLines === '' || strlen($rawLines) > self::MAX_REQUEST_BYTES) {
            wp_send_json_error(['code' => 'invalid_payload'], 400);
            return;
        }

        try {
            $decoded = json_decode($rawLines, true, 8, JSON_THROW_ON_ERROR);
            if (!is_array($decoded) || !array_is_list($decoded)) {
                throw new InvalidArgumentException('Lines must be a JSON list.');
            }

            $lines = [];
            foreach ($decoded as $line) {
                if (!is_array($line) || array_diff(array_keys($line), ['sku', 'quantity']) !== []) {
                    throw new InvalidArgumentException('A cart line contains unsupported fields.');
                }

                $sku = isset($line['sku']) && is_string($line['sku']) ? trim($line['sku']) : '';
                $quantity = $line['quantity'] ?? null;
                if (!is_int($quantity)) {
                    throw new InvalidArgumentException('Quantity must be an integer.');
                }
                $lines[] = new CartLine($sku, $quantity);
            }

            $allowPartialRaw = isset($_POST['allow_partial']) ? wp_unslash((string) $_POST['allow_partial']) : '0';
            if (!in_array($allowPartialRaw, ['0', '1'], true)) {
                throw new InvalidArgumentException('Invalid partial mode flag.');
            }

            $configuration = $this->activeConfiguration();
            $expectedLines = ($this->trustedCalculator ?? new TrustedCartCalculator())->calculate(
                $configuration,
                $this->decodeCalculationInput(),
            );
            $this->assertExactExpectedLines($lines, $expectedLines);
            $result = $this->service->add(
                $lines,
                $this->partialBundlesAllowed && $allowPartialRaw === '1',
            );
        } catch (JsonException|InvalidArgumentException) {
            wp_send_json_error(['code' => 'invalid_payload'], 400);
            return;
        } catch (Throwable) {
            wp_send_json_error(['code' => 'cart_operation_failed'], 500);
            return;
        }

        if (!$result->complete && $result->added === []) {
            wp_send_json_error($result->toArray(), 422);
            return;
        }

        wp_send_json_success($result->toArray(), 200);
    }

    /** @return array<string, mixed> */
    private function decodeCalculationInput(): array
    {
        $raw = isset($_POST['calculation_input']) ? wp_unslash((string) $_POST['calculation_input']) : '';
        if ($raw === '' || strlen($raw) > self::MAX_REQUEST_BYTES) {
            throw new InvalidArgumentException('Trusted calculation input is missing or too large.');
        }
        $decoded = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        if (!is_array($decoded) || array_is_list($decoded)) {
            throw new InvalidArgumentException('Trusted calculation input must be an object.');
        }
        return $decoded;
    }

    /** @return array<string, mixed> */
    private function activeConfiguration(): array
    {
        if ($this->configurations === null) {
            throw new InvalidArgumentException('Trusted configuration is unavailable.');
        }
        $revision = $this->configurations->current();
        $provided = isset($_POST['configuration_checksum'])
            ? sanitize_text_field(wp_unslash((string) $_POST['configuration_checksum']))
            : '';
        if ($revision === null || preg_match('/^[a-f0-9]{64}$/D', $provided) !== 1 || !hash_equals($revision->checksum, $provided)) {
            throw new InvalidArgumentException('Configuration revision is unavailable or stale.');
        }
        return $revision->configuration;
    }

    /**
     * The browser's lines are presentation data only. The server accepts them
     * exclusively when they exactly match its deterministic recalculation.
     *
     * @param list<CartLine> $submitted
     * @param list<array{sku: string, quantity: int}> $expected
     */
    private function assertExactExpectedLines(array $submitted, array $expected): void
    {
        if (count($submitted) !== count($expected)) {
            throw new InvalidArgumentException('Submitted cart lines differ from the calculated bundle.');
        }
        $expectedBySku = [];
        foreach ($expected as $line) {
            if (isset($expectedBySku[$line['sku']])) {
                throw new RuntimeException('Published configuration has duplicate calculated SKUs.');
            }
            $expectedBySku[$line['sku']] = $line['quantity'];
        }
        foreach ($submitted as $line) {
            if (!isset($expectedBySku[$line->sku]) || $expectedBySku[$line->sku] !== $line->quantity) {
                throw new InvalidArgumentException('Submitted cart lines differ from the calculated bundle.');
            }
            unset($expectedBySku[$line->sku]);
        }
        if ($expectedBySku !== []) {
            throw new InvalidArgumentException('Submitted cart lines differ from the calculated bundle.');
        }
    }
}
