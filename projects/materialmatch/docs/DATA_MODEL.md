# Data model

All identifiers are opaque strings. Persisted `CalculationConfiguration` records carry a schema
version; measurement projects are validated inputs bound to the configuration version recorded in
their result. Optional values are omitted rather than inferred from zero. Lengths use integer
millimetres, areas use integer square millimetres, waste uses integer basis points, and money uses
integer minor currency units.

| Model                      | Purpose and invariants                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Money`                    | Integer `minorUnits` plus ISO 4217 currency; arithmetic rejects mixed currencies.                                         |
| `MeasurementUnit`          | Output unit discriminator. Current persisted base units are millimetres, square millimetres, pieces, packages, and rolls. |
| `MaterialProduct`          | Main saleable material, classification, compatibility facts, package specification, variants, and price source.           |
| `ProductVariant`           | SKU-level overrides and availability; cart lines always reference the resolved SKU.                                       |
| `PackageSpecification`     | Coverage, pieces, minimum quantity, order multiple, open-package policy; all positive integers.                           |
| `MeasurementProject`       | Locale-independent project containing one or more rooms and selected layout/waste choices.                                |
| `RoomMeasurement`          | Shape discriminator plus rectangle dimensions, exclusions, openings, and feature counts.                                  |
| `WasteRule`                | Default/minimum/maximum basis points and layout-specific override.                                                        |
| `AccessoryProduct`         | SKU, unit/pack data, pricing, availability, compatibility properties, and optional alternatives.                          |
| `AccessoryRule`            | Allow-listed calculation source: area, perimeter, rooms, doors, corners, main packages, constant, optional, or required.  |
| `CompatibilityRule`        | Required/recommended/optional/alternative/incompatible relation with property and tag predicates.                         |
| `CalculationConfiguration` | Schema version/revision, locale/currency, main product, waste policy, accessories, and compatibility rules.               |
| `CalculationStep`          | Stable ID, operation, typed input-value map, typed integer output, unit, and translation message ID.                      |
| `CalculationResult`        | Project/config references, measurement summary, product lines, eligible cart lines, totals, steps, and warnings.          |
| `ResultWarning`            | Stable code, severity, message ID, and optional product ID.                                                               |
| `CartLine`                 | Exact product/variant/SKU, integer quantity, optional price snapshot, eligibility, and exclusion reason.                  |
| `VerticalPack`             | Pack ID/version, supported material kinds, defaults, schema compatibility, rules, and fictional fixtures.                 |
| `ConfigurationVersion`     | Domain schema revision and timestamp, plus an adapter publication revision and canonical SHA-256 checksum.                |

## Safe rule expression

Rules are discriminated data nodes. The supported AST is limited to literal/variable, add,
subtract, multiply, divide, ceil, floor, min, max, percentage, conditional, and lookup table. Every
evaluation has a depth limit of 32 and operation limit of 512. Variables are read only from own
properties of an explicitly supplied integer context; they cannot address prototypes, globals,
properties, functions, URLs, or code. Non-integral division must be wrapped in explicit `ceil` or
`floor`.

## Versioning

Schema versions are integers and migrate sequentially. The current parser accepts only schema v1;
v0 stored whole waste percentages and migrates to v1 basis points while incrementing the local
configuration revision. Unknown future versions fail closed. Pack versions use semantic versioning.
Calculation outputs preserve both values so audits can reproduce results. A migration must be
idempotent for an already-current document and must never silently discard unknown data.

## Import representations

A configuration import is either a bare configuration document or an exact format-v1 envelope
`{formatVersion, checksum, configuration}`. Checksums are lowercase SHA-256 over canonical JSON
with recursively sorted object keys. Reordered equivalent documents therefore have the same
identity. Import validation returns `duplicate: true` when that checksum was already published; it
does not create a second revision.

CSV import validation operates on decoded UTF-8 data and returns header-addressed string records.
It does not guess units or decimal separators. Boundary adapters explicitly normalize metric values
to integer millimetres or square millimetres with a declared `.` or `,` separator; values that cannot
be represented exactly in the base unit are rejected.

The WordPress publication state is an adapter model with `formatVersion`, `activeRevision`,
`nextRevision`, and an ordered list of immutable `{revision, checksum, configuration}` records.
Publication revisions are local monotonic identifiers and are deliberately distinct from the domain
configuration's schema/revision pair. Re-importing identical canonical content activates the
existing publication revision instead of creating a duplicate.
