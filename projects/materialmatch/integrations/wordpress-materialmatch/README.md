# MaterialMatch WordPress plugin

This directory contains the local-first WordPress/WooCommerce integration used by the `0.1.0`
release candidate. It keeps calculation data inside the customer's WordPress installation and
performs no outbound requests.

## Implemented

- guarded plugin bootstrap and PSR-4 development autoloading;
- local-open `LicenseProvider` placeholder with no activation server;
- product metadata fields presented as natural m² and percentages while remaining stored as exact
  integer millimetres, square millimetres and basis points;
- product save capability check, dedicated nonce, allow-listed fields and escaped HTML;
- CSV admin page protected by `manage_woocommerce` and a nonce;
- 1 MiB, 5000-row, 32-column and 4096-byte-cell CSV limits;
- UTF-8, header, column-count and spreadsheet formula-injection checks;
- validate-all-before-write metadata import by exact SKU, including product variations;
- idempotent updates when the same valid file is imported again;
- strict schema-v1 JSON configuration import with a 2 MiB and depth limit;
- canonical SHA-256 export envelopes, idempotent content revisions, and checksum verification;
- single-option configuration activation with bounded valid history and rollback UI;
- cross-runtime schema parity against the TypeScript-generated fictional reference configuration;
- nonce-protected same-origin AJAX contract for exact SKU/quantity cart lines;
- `[materialmatch]` storefront shortcode and automatic rendering below the WooCommerce add-to-cart form
  when the product has the enabled flag and its SKU belongs to the active configuration;
- production widget and WordPress bridge assets enqueued only when that calculator is rendered;
- active-configuration checksum bound to every cart request, so a stale page cannot add products after
  a configuration change;
- server-side recalculation of typed measurement facts, selected variant, and optional accessory IDs;
  browser-submitted SKU/quantity lines must exactly match the recalculated bundle;
- strict or explicitly enabled partial bundle behavior from the WooCommerce adapter.
- clean development ZIP activation and real WooCommerce cart assertions in a pinned Playground runtime.

The example in [`examples/product-metadata.csv`](examples/product-metadata.csv) is fictional. Its
administrator-facing headers are Polish ASCII identifiers. It accepts natural m², percentages and
`tak`/`nie` values, then stores exact integer units. Existing technical English headers remain
accepted for backwards compatibility.

MaterialMatch accepts conservative ASCII SKUs matching `[A-Za-z0-9][A-Za-z0-9._-]{0,127}`. This makes exact matching predictable and prevents spreadsheet control prefixes from entering the integration boundary. A store using other WooCommerce SKU characters needs an explicit, tested policy change.

## Source installation for development

The source plugin requires its internal `materialmatch/woocommerce-adapter` Composer package:

```bash
composer install
composer test
```

Then activate `materialmatch.php` in a WordPress development installation. The release builder
packages a minimal deterministic production autoloader and the internal adapter without PHPUnit or
other development dependencies. Installing this source directory without `vendor/` intentionally
leaves cart integration disabled.

The storefront renderer passes `CartAjaxController::clientConfiguration()` only to a rendered local
`<material-match>` element. It posts same-origin to `admin-ajax.php` with:

- `action=materialmatch_add_bundle`;
- `nonce=<generated nonce>`;
- `configuration_checksum=<active SHA-256 checksum>`;
- `calculation_input=<typed integer MeasurementProject, variant and optional selections>`;
- `lines=[{"sku":"DEMO-PANEL-001","quantity":10}]` as JSON;
- `allow_partial=0` by default, or `1` only when the store explicitly allows a partial set.

Responses list every added exact SKU/quantity and every skipped/error SKU using translation message IDs. A missing product, price or stock state is never silently hidden.

## Baseline assumptions

- PHP 8.1, WordPress 6.5 and WooCommerce 8.0 are conservative, currently unverified development baselines rather than a compatibility guarantee.
- Prices remain owned by WooCommerce; MaterialMatch metadata does not duplicate price data.
- The standard WordPress nonce mechanism protects storefront cart mutations. It is a CSRF control, not authentication or rate limiting.
- Product variants can receive metadata through CSV; a dedicated variation editor UI is still pending.

## Remaining support limitations

The current cart endpoint validates availability, rejects stale configuration checksums, and
recalculates the typed schema-v1 flooring bundle before accepting exact lines. A new schema or rule
kind cannot be enabled for carts without a parity migration and test. The metadata importer validates
the complete file before its first write, but WordPress metadata updates are not transactional; a
database failure during the write phase can leave a partially applied import and there is no rollback
snapshot yet.

Versioned JSON persistence, export and rollback are implemented and contract-tested. Remaining work
is tracked granularly in the root roadmap: CSV export/rollback, schema migration UI, dedicated
accessory/compatibility and variation editors, calculator enablement by category, administration-flow
browser coverage, multisite, and the wider database/version matrix.

Composer dependencies are locked. PHPUnit is exercised locally through PHP 8.3 WASM and in CI on
native PHP 8.1;
the storefront cart path has also passed a clean WordPress 7.0.1 / WooCommerce 10.9.4 / PHP 8.3
Playground installation. A MySQL/MariaDB, minimum-version, administration, migration, and multisite
matrix is still required.
