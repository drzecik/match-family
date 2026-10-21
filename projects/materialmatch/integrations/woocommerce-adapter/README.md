# WooCommerce adapter

This package contains the product lookup and exact-quantity cart contract used by the WordPress integration. Its service layer has no WordPress dependency and can be tested with in-memory fakes.

## Implemented foundation

- exact SKU and positive integer quantity input;
- a 100-line and 100,000-units-per-line safety limit;
- full preflight before any cart mutation;
- explicit errors for unknown SKU, missing price, unavailable/insufficient-stock product, duplicate SKU and failed cart mutation;
- optional partial bundle behavior;
- correct handling of WooCommerce variation IDs and attributes.

When partial mode is disabled, a preflight error leaves the cart untouched. WooCommerce does not expose a general transaction for cart mutations, so an unexpected failure from `add_to_cart()` after earlier successful mutations can still produce a partial cart. The response reports that condition; compensating rollback is intentionally not claimed yet.

## Not complete

This is not a completed M2 integration. Server-side calculation recomputation, configuration-version binding, stock reservation, Store API integration, rollback, persistent bundle identity, coupons/taxes/shipping calculations, multisite testing and installation tests remain pending. Until recomputation and version binding exist, the adapter proves only that the submitted SKU quantities passed the stated commerce checks—not that they came from a trusted MaterialMatch result.

## Development

```bash
composer install
composer test
```

Composer dependencies are locked and the contract suite is executed on PHP 8.1. A separate
WordPress Playground gate installs the development plugin ZIP with WooCommerce 10.9.4 and verifies
the exact 10/3/8 cart quantities, a variation, strict preflight, partial mode, and nonce rejection.
The MySQL/MariaDB and minimum-version matrix remains pending.
