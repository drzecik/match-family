# Security and threat model

MaterialMatch is local-first: the default product makes no outbound request and stores no shopper
personal data. Security controls apply at every input boundary even when WordPress has already
sanitized a value.

## Threat model

| Threat                           | Boundary                | Control                                                                                             | Verification                           |
| -------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Executable configuration         | JSON/pack import        | Strict discriminated schema, 32-depth/512-operation AST limits, no `eval` or dynamic functions      | malicious-node tests and source scan   |
| Stored/reflected XSS             | Admin strings/widget    | sanitize on input, context escape on output, no unsafe HTML messages                                | unit and browser tests                 |
| CSRF/unauthorized changes        | WordPress admin/API     | capability checks plus action-bound nonces; nonces never replace authorization                      | PHP contract tests                     |
| CSV spreadsheet execution        | import/export           | reject or prefix cells beginning with `=`, `+`, `-`, `@`, tab, or carriage return; quote output     | hostile CSV fixtures                   |
| Memory/CPU exhaustion            | JSON/CSV/widget         | byte, row, room, product, AST depth, and operation limits; integer upper bounds                     | boundary/property tests                |
| Cart manipulation                | browser request         | server revalidates SKU, variation, stock, price presence, integer quantity, and partial policy      | WooCommerce integration tests          |
| Untrusted calculated quantities  | browser/result boundary | active checksum plus local typed PHP recomputation; submitted SKU/quantity lines must match exactly | PHP and Playground tamper tests        |
| Configuration rollback/data loss | migrations/import       | validate before a single-option swap, retain bounded valid history, verify checksums                | lifecycle, failed-write recovery tests |
| Compatibility bypass             | alternative selection   | required and incompatible rules evaluated server-side before cart plan                              | compatibility tests                    |
| Data exfiltration                | dependencies/telemetry  | no default HTTP client, CSP-compatible widget, dependency review, CI source checks                  | release review                         |
| Sensitive logging                | errors/cart             | structured codes only; redact input and never log complete carts or shopper identity                | log contract review                    |

## Import policy

The configuration JSON adapter enforces a 2 MiB limit and JSON depth of 64 before schema validation.
The current product-metadata CSV adapter uses a stricter 1 MiB limit, plus row, column, and cell
limits. Future import adapters must not exceed the 2 MiB default without a threat-model update.
CSV requires UTF-8, a declared delimiter, a stable header allow-list, normalized line endings, and
idempotency based on a content checksum. Formula-like content is data, never a formula, and is
neutralized again on export. Unknown columns produce warnings or rejection according to import mode.

Configuration imports accept either a bare schema-v1 document or the exact MaterialMatch export
envelope. Envelope checksums are verified with a timing-safe comparison. Unknown keys—including
`formula`, `javascript`, or `expression` escape hatches—are rejected at every modeled object. No
imported value is called, evaluated, fetched, or interpolated into executable code.

The shared TypeScript boundary exposes `validateConfigurationImport` and `validateCsvImport`.
Configuration validation enforces UTF-8, the 2 MiB byte limit, depth 64, strict migration dispatch,
canonical SHA-256 envelope verification, and duplicate-content detection. CSV validation enforces
UTF-8, 1 MiB, 5000 rows, 32 columns, 4096 bytes per cell, exact header allow-lists, optional unique
keys, consistent column counts, and formula-injection rejection. It reports duplicate content by
checksum and performs no writes; adapters must validate the complete result before persistence.

`scripts/validate-pack` accepts JSON only. It deliberately does not dynamically import a submitted
JavaScript or TypeScript module, because doing so would execute code before its configuration could
be validated. Workspace authors generate JSON pack artifacts from trusted source and validate the
artifact that will be distributed.

## WordPress controls

Follow the official WordPress security model: validate and sanitize input, escape at output, use
capability checks for authorization, and use nonces for CSRF protection. Nonces are not authorization.
References: <https://developer.wordpress.org/apis/security/> and
<https://developer.wordpress.org/apis/security/nonces/>.

The current clean-install gate uses WordPress Playground and fictional products. It verifies real
WooCommerce session/cart mutations, strict and partial policies, a variation, and nonce rejection.
The pinned WooCommerce ZIP is checksum-verified before it enters the local Blueprint bundle. Because
the runtime uses SQLite, a separate MySQL/MariaDB compatibility matrix remains required.

For published schema-v1 flooring configurations, the cart endpoint receives a bounded JSON
`CalculationInput` containing only typed integer measurement facts, chosen main variant, and optional
accessory IDs. It validates that input locally, recalculates the expected lines from the active
configuration without network access or executable formulas, and rejects the entire cart mutation
unless the browser's SKU/quantity list is an exact set match. This closes quantity tampering for the
implemented rule kinds. Each new schema or rule kind must extend the PHP calculator with parity and
tamper tests before it can be activated for WooCommerce carts.

## Release security gate

Before a commercial release: run dependency and secret scans, inspect the ZIP contents, test clean
installation and migration/rollback, confirm no outbound endpoints, test hostile imports, and obtain
a focused review of cart quantities and all formula changes.

## Responsible disclosure placeholder

The final support address and response SLA must be supplied before sale. Do not publish a placeholder
email as a real disclosure channel.
