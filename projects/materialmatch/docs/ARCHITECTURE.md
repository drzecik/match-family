# Architecture

## System boundaries

```text
JSON / admin / WooCommerce boundary
           |
           v
configuration-schema ----> domain types
           |                    ^
           v                    |
calculation-engine <----- vertical pack
           |
           v
widget / demo / WooCommerce adapter
```

The dependency direction is inward. `calculation-engine` is a pure TypeScript library and must not
import browser, React, WordPress, WooCommerce, filesystem, clock, random, or network APIs. Adapters
validate and normalize boundary input before invoking it.

## Workspace responsibilities

- `packages/domain`: stable branded primitives, entities, results, and ports.
- `packages/configuration-schema`: runtime parsing, schema version dispatch, and migrations.
- `packages/calculation-engine`: deterministic geometry, waste, packaging, accessory, compatibility,
  money, and explanation logic.
- `packages/test-fixtures`: fictional reusable projects, products, and expected outputs.
- `vertical-packs/flooring`: versioned flooring rules and metadata.
- `packages/materialmatch-widget`: framework-free custom element and public browser events.
- `apps/demo-store`: interactive Polish demonstration and end-to-end acceptance surface.
- `apps/private-store`: access-controlled Polish reference installation using independent,
  provenance-checked production catalogs per manufacturer system; it never imports test fixtures.
  A system switch replaces the entire calculation configuration, preserves only measurement input,
  invalidates pending results, and clears the project list. Products from separate systems are
  never merged into variants or inferred as compatible.
- `integrations/woocommerce-adapter`: commerce-neutral cart planning contract.
- `integrations/wordpress-materialmatch`: WordPress bootstrap, administration, persistence, imports,
  and WooCommerce boundary.

## Determinism and numeric policy

Measurements use integers: millimetres for lengths and square millimetres for areas. Prices use
minor currency units. Ratios use integer basis points. Division accepts an explicit rounding mode;
package quantities use ceiling. Result steps record operands, operation, unit, result, and message
identifier. Never infer locale from the runtime.

## Configuration lifecycle

Every configuration carries schema version, semantic pack version, immutable configuration ID, and
revision. Imports are size-limited, parsed as data, migrated one version at a time, validated, and
only then made current. The previous valid version remains recoverable. Export includes a checksum
but no secrets or personal data.

The WordPress adapter persists the complete publication state in one non-autoloaded option. A save
therefore replaces one option value rather than incrementally mutating active configuration rows.
Each retained revision contains validated configuration data and a SHA-256 checksum over canonical
JSON; import of the same content reuses its revision. Rollback changes only the active revision
pointer and preserves history. The store retains at most 25 revisions, including at least 24 prior
valid revisions after a new publish. State is revalidated and its checksum is verified on read so
corruption fails closed. This is an adapter persistence guarantee, not a substitute for a database
backup or the still-pending schema migration matrix.

The PHP boundary implements the current schema-v1 allow-list so the WordPress administrator cannot
activate a document containing unknown fields or executable formula strings. Its parity test reads
the reference configuration generated and validated by the TypeScript schema. Schema changes must
update both validators or replace this boundary with an equally local generated-schema validator.

## Extensibility

Geometry resolves a room into area, perimeter, openings, and counted features. A future polygon or
imperial input adapter produces the same integer domain facts. Accessories use a discriminated,
allow-listed rule model; adding a rule requires schema support, engine implementation, migrations,
and tests rather than executable configuration.

## Architectural decisions

See [`docs/adr/`](adr/) for decision records. Changes to package boundaries or numeric policy require
a new ADR and an update to this document.
