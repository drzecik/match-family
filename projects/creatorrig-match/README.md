# CreatorRig Match — sanitized source copy

This independent workspace contains first-party source, generic tests and explicitly fictional demonstration data. It is part of the sanitized public Match Family source edition. First-party TypeScript source and demos use MIT, with the separately scoped GPL-2.0-or-later MaterialMatch PHP integrations. Packages remain private to prevent registry publication. See ../../LICENSE-STATUS.md.

## Run locally

Use Node 24.18.0 and the pnpm version pinned in package.json. From this directory:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm data:build
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm e2e
corepack pnpm dev
```

Browser tests require Chromium: `corepack pnpm exec playwright install chromium`. These commands run only local demonstration servers. No account, backend deployment or private catalog is required.

## Scope and data

The extraction excludes Git history, environments, deployment settings, owner workspace instructions, private researched catalogs, customer/store records and tests requiring those excluded records. Generic parsers, safety gates and engines retain their original behavior. See the family SANITIZATION.md for the exact scope. Synthetic compatibility evidence is a fixture, not a real product claim.

Some architecture documents describe the upstream design. Private-store/research views referenced there are intentionally absent from this copy. Importer and release commands are tooling, not authorization to publish, review compatibility, or deploy.
