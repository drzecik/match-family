<?php

declare(strict_types=1);

namespace MaterialMatch\WooCommerce\Model;

final class CartMutationResult
{
    /**
     * @param list<AddedCartLine> $added
     * @param list<CartIssue> $issues
     */
    public function __construct(
        public readonly array $added,
        public readonly array $issues,
        public readonly bool $complete,
    ) {
    }

    /**
     * @return array{
     *   complete: bool,
     *   added: list<array{sku: string, quantity: int, cartItemKey: string}>,
     *   issues: list<array{code: string, sku: string, quantity: int, messageId: string}>
     * }
     */
    public function toArray(): array
    {
        return [
            'complete' => $this->complete,
            'added' => array_map(
                static fn (AddedCartLine $line): array => $line->toArray(),
                $this->added,
            ),
            'issues' => array_map(
                static fn (CartIssue $issue): array => $issue->toArray(),
                $this->issues,
            ),
        ];
    }
}
