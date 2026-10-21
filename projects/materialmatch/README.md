# MaterialMatch — sanitized source copy

This independent workspace contains first-party source, generic tests and explicitly fictional demonstration data. It is part of the sanitized public Match Family source edition. First-party TypeScript source and demos use MIT, with the separately scoped GPL-2.0-or-later MaterialMatch PHP integrations. Packages remain private to prevent registry publication. See ../../LICENSE-STATUS.md.

## Try the core without a browser

After installing dependencies in this directory, run `corepack pnpm demo:core`.
The example asserts its fictional result and does not start a server. See the
[family quickstart](../../docs/GETTING_STARTED.md) for inputs, outputs and package entrypoints.

## Run locally

Use Node 24.18.0 and the pnpm version pinned in package.json. From this directory:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm create:demo-data
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
corepack pnpm dev
```

Browser tests require Chromium: `corepack pnpm exec playwright install chromium`. These commands run only local demonstration servers. No account, backend deployment or private catalog is required.

## PHP contract tests

Install the pinned Composer dependencies in both integrations with `composer install --working-dir=integrations/woocommerce-adapter` and `composer install --working-dir=integrations/wordpress-materialmatch`, then run `corepack pnpm test:php`. The provided Node runner executes PHP 8.3 in WASM locally. No WordPress account or external store is needed. WordPress end-to-end provisioning is a separate optional test, not part of the demo checks.

## Scope and data

The extraction excludes Git history, environments, deployment settings, owner workspace instructions, private researched catalogs, customer/store records and tests requiring those excluded records. Generic parsers, safety gates and engines retain their original behavior. See the family SANITIZATION.md for the exact scope. Synthetic compatibility evidence is a fixture, not a real product claim.

Some architecture documents describe the upstream design. Private-store/research views referenced there are intentionally absent from this copy. Importer and release commands are tooling, not authorization to publish, review compatibility, or deploy.
