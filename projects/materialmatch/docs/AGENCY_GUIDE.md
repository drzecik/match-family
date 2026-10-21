# Agency guide

> Release-candidate deployment guide. Validate against the customer's staging environment and do
> not advertise unsupported database/version combinations.

Keep customizations in versioned vertical packs and CSS custom properties. Do not edit engine or
plugin vendor files per customer. Assign a unique configuration ID, record schema and pack versions,
label all demo data fictional, and validate every imported pack before preview or activation.

Recommended rollout:

1. model products and confirmed compatibility relationships in staging;
2. import a signed/versioned configuration and retain the export checksum;
3. run representative and boundary scenarios, including the canonical flooring regression;
4. verify exact WooCommerce SKUs, variants, prices, stock, and quantities in the cart;
5. test keyboard and mobile flows with the customer's theme;
6. export the activated configuration and record the rollback revision;
7. repeat acceptance after plugin, theme, WooCommerce, or pack upgrades.

An agency pack must not contain arbitrary code, remote URLs, real brand data without permission, or
unverified compatibility relations.

## Acceptance record

For each installation retain the plugin ZIP checksum, plugin/configuration versions, active
configuration checksum, fictional regression result, WooCommerce SKU/cart evidence, browser and
database versions, rollback export, and sign-off date. Re-run acceptance after every theme, plugin,
pack, WordPress, or WooCommerce update. Never copy configuration revisions between clients without
revalidating every SKU and explicit compatibility relation.
