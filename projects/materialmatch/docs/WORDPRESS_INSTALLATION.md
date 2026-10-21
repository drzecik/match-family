# WordPress installation

> Current status: tested `0.1.0` release candidate. Install on staging first. The pinned Playground
> environment is verified; the full MySQL/MariaDB and minimum/current version matrix is not yet a
> commercial compatibility guarantee.

Target hosts should use PHP 8.3+, HTTPS, and supported WordPress/WooCommerce releases. The plugin's
planned conservative minimum is PHP 8.1. The release ZIP will be installed through **Plugins → Add
New → Upload Plugin**, activated, and configured under WooCommerce. No external account or server is
required.

The automated clean Playground environment verifies ZIP activation, local storefront assets,
server-side recalculation, manipulated-quantity rejection, nonce failure, exact simple-product and
variation quantities, stale configuration rejection, and invalid quantity boundaries. The remaining
matrix must verify activation/deactivation on MySQL or MariaDB, administration flows, uninstall
retention choice, minimum supported versions, and upgrade migrations.

Back up WordPress files and database before any pre-release installation. Configuration exports are
additional recovery artefacts, not database backups.

## Development configuration workflow

The current source plugin exposes **WooCommerce → Konfiguracja MaterialMatch** to administrators
with `manage_woocommerce`. It accepts a maximum 2 MiB JSON file, validates the complete current
schema, verifies an export-envelope checksum, and only then activates one local revision. The same
page exports the active revision and can restore any retained prior revision. All mutations require
an action-specific WordPress nonce; exports contain no shopper data or secrets.

This workflow has PHP contract and lifecycle coverage, but has not yet passed a clean real
WordPress/WooCommerce installation test for the administration flow. The storefront cart path has
passed the pinned Playground integration described in
[`WORDPRESS_INTEGRATION_TESTING.md`](WORDPRESS_INTEGRATION_TESTING.md), but this single SQLite
environment must not be presented as the full supported matrix.

Product metadata can be loaded under **WooCommerce → Wczytaj dane produktów**. Use the included
fictional CSV template with Polish column names. Enter package coverage in m², waste in percentages,
and choice fields as `tak` or `nie`. The importer validates the complete file before writing and
continues to accept the earlier technical header format for backwards compatibility.

## Storefront placement

Enable the **MaterialMatch aktywny** product field and import a configuration whose main-product
variant has the same exact WooCommerce SKU. With automatic placement enabled in **WooCommerce →
Wygląd MaterialMatch**, the calculator is rendered below the product's add-to-cart form. A theme or
page builder can place the same calculator explicitly with `[materialmatch]` or
`[materialmatch product_id="123"]`.

The plugin enqueues its local web-component asset and its same-origin cart bridge only after it has
confirmed both conditions above. The rendered element receives the active configuration, a standard
WordPress cart nonce, `admin-ajax.php` URL, and the active configuration's SHA-256 checksum. The
server rejects a request if the configuration has changed since the page was rendered. The cart
endpoint recalculates all quantities from validated integer measurement facts against that exact
active configuration and rejects any client line that differs. It then revalidates exact SKU,
variation, price, stock, and partial-cart policy before mutating WooCommerce.
