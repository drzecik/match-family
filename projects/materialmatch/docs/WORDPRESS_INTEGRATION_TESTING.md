# WordPress integration testing

MaterialMatch verifies an installable ZIP in a fresh, disposable WordPress Playground runtime. This
is the clean-install and cart gate used by the release builder; it complements, but does not replace,
the wider database/version support matrix.

## Pinned environment

- WordPress 7.0.1;
- WooCommerce 10.9.4 downloaded from the official WordPress plugin distribution and verified
  against the pinned SHA-256 before installation;
- PHP 8.3 WebAssembly runtime;
- WordPress Playground SQLite database;
- MaterialMatch `0.1.0-dev` assembled from allow-listed plugin sources, the production widget, and a
  minimal deterministic autoloader containing only first-party runtime namespaces.

Run the gate with:

```bash
pnpm test:wordpress:integration
```

The host needs `zip` in `PATH`. When Composer is available, the gate can resolve the locked internal
package in a temporary copy. Otherwise it creates the same minimal first-party autoloader layout as
the release builder; neither path ships PHPUnit or development dependencies. The script creates all
files in a temporary directory, installs both plugins into a clean WordPress instance, runs its
assertions through the real `admin-ajax.php` and WooCommerce cart, then removes the runtime.

## Acceptance scenarios

All catalogue records are explicitly fictional.

1. WooCommerce and MaterialMatch activate from ZIP without a fatal error.
2. The enabled product's `[materialmatch]` shortcode renders a local `<material-match>` element,
   enqueues the production widget and bridge assets, and exposes the active configuration checksum.
3. The canonical cart subset adds exactly 10 panel packages, 3 underlay rolls, and 8 skirting
   variation pieces.
4. A SKU outside the active configuration is rejected before cart mutation.
5. An invalid cart nonce returns HTTP 403 and leaves the cart empty.
6. Zero, negative, over-limit, and locale-decimal-string quantities return HTTP 400 and leave the
   cart empty.
7. A stale or forged configuration checksum returns HTTP 400 and leaves the cart empty.
8. A changed package quantity is rejected after server-side recalculation and leaves the cart empty.

Each scenario uses a separate WooCommerce customer session. Cart assertions read the resulting
`WC()->cart` contents rather than trusting only the MaterialMatch response payload.

## Deliberate limitations

This gate proves one current WordPress/WooCommerce combination on SQLite. It does not prove the
declared minimum versions, MySQL/MariaDB behavior, multisite, taxes, shipping, coupons, upgrade
migrations, or uninstall retention. Those remain mandatory before advertising a wider support
matrix.

## Source-edition license metadata

The integration and release scans allow only the approved GPL URI in the leading plugin documentation
header or the readme's license field. They continue rejecting URLs in executable PHP, unexpected URLs
and executable patterns. The staged plugin includes its GPL license text and scope notice.
`pnpm test:release-guards` covers these boundaries before the workspace checks.
