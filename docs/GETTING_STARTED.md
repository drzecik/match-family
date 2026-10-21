# Start with a core example

These examples run the actual engines with fictional inputs. No account, API key, private catalog,
WordPress installation or browser is required. They do not start a server, send telemetry, publish a
package or place an order. Supported runner environments: macOS, Linux and WSL.

## Prerequisites

Use the Node version in the root `.nvmrc` (24.18.0). With an existing nvm installation:

```sh
nvm install
nvm use
corepack enable
```

If your Node distribution omits Corepack, install Corepack using its official installation instructions
before continuing. `node scripts/family.mjs doctor` reports a missing runtime or Corepack; it does not
download a package manager or start an application. Network access is needed for the first dependency
installation. Subsequent installs can use `--offline` only when the dependency cache is complete.

## First result

From the repository root:

```sh
node scripts/family.mjs doctor
node scripts/family.mjs install
node scripts/family.mjs demo
```

You can select just one project, for example:

```sh
node scripts/family.mjs install filtermatch
node scripts/family.mjs demo filtermatch
```

The runner keeps all three dependency lockfiles separate and uses each pinned pnpm version. A failed
command returns a nonzero exit code and stops the run; missing data is never turned into a successful result.

| Example | What should happen | Source |
| --- | --- | --- |
| FilterMatch | `DEMO100/PL` resolves; `DEMO100` is ambiguous because PL and DE variants exist | [example](../projects/filtermatch/scripts/core-demo/index.ts) |
| CreatorRig Match | Fictional 100 Mbps / 128 GB scenario estimates 9728 seconds; missing evidence and zero capacity return `unknown` | [example](../projects/creatorrig-match/scripts/core-demo/index.ts) |
| MaterialMatch | 4 x 5 m room: 20 m² net, 21.6 m² with waste, 10 full 2.2 m² packages, 3 underlay rolls, 8 skirting pieces | [example](../projects/materialmatch/scripts/core-demo/index.ts) |

Each example includes assertions against the documented outcome and outputs JSON marked
`synthetic: true` and `notForProduction: true`. A resolved model is not a compatibility approval;
fictional evidence never verifies a real product. MaterialMatch prices are integer minor currency
units, not floating-point złoty. The example total is 198979 minor units (1989.79 PLN), without ordering.

## Use a core in your own source workspace

Copy the relevant example and import through the package's `src/index.ts` entrypoint. These workspaces
export TypeScript source; use their existing tsx/bundler toolchain. They are not published npm packages
or prebuilt plain-JavaScript distributions. Keep local workspace dependencies together, preserve the
[license scope](../LICENSE-STATUS.md), and supply your own lawfully obtained, validated data.

- FilterMatch: build an index from device records, then inspect `resolved`, `ambiguous`, `candidates` or `not_found`.
- CreatorRig: inspect both overall status and individual dimensions; `unknown` must never become a recommendation.
- MaterialMatch: pass integer measurements and a validated configuration; retain explanation steps and warnings.

## Browser demonstrations

Enter the chosen workspace and run `corepack pnpm dev`. Open the local URL printed by the server;
ports may change when occupied. Stop your own demo with Ctrl-C. See the workspace READMEs for the widget
and browser checks: [FilterMatch](../projects/filtermatch/README.md),
[CreatorRig Match](../projects/creatorrig-match/README.md), [MaterialMatch](../projects/materialmatch/README.md).

## Verify a change

```sh
node --test scripts/family.test.mjs
node scripts/family.mjs check filtermatch
node scripts/family.mjs check creatorrig-match
```

MaterialMatch's full check also runs PHP contracts. With PHP 8.1+ and Composer available, install the
locked dependencies from `projects/materialmatch`:

```sh
composer install --working-dir=integrations/woocommerce-adapter --no-interaction --prefer-dist
composer install --working-dir=integrations/wordpress-materialmatch --no-interaction --prefer-dist
```

Then run `node scripts/family.mjs check materialmatch` from the family root. PHP contracts execute
locally through the included PHP 8.3 WASM runner. The family runner refuses to silently omit them.
Browser tests and a real local WordPress/WooCommerce sandbox are separate checks; see
[WordPress integration testing](../projects/materialmatch/docs/WORDPRESS_INTEGRATION_TESTING.md).

## Troubleshooting

- Old Node: run `nvm use` in the root and re-enable Corepack for that runtime.
- Missing pnpm/cache: use `install` online first; `--offline` cannot create missing downloads.
- Missing dependency directory: run `install` for the named workspace. Do not merge lockfiles.
- Missing PHP vendor directory: use the two Composer commands above; a TypeScript pass does not cover PHP.
- A demo or check exits nonzero: keep the error, revision and fictional reproduction for a bug report.
- A private-store/research document mentions an absent route: those upstream views are excluded from this edition.
