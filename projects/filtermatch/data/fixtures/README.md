# Synthetic demonstration data

Every record in the demonstration dataset is fictional and has both
`synthetic: true` and `notForProduction: true`. Names, SKUs, offers, evidence
and compatibility relations are test fixtures, not commercial claims.

The split between `verified/` and `candidates/` demonstrates the operational
workflow only. A synthetic `verified_*` status means that the fixture exercises
the verified publication path; it does not describe a real product.

## Demonstration scope and revision

`demo-catalog-v1.json` is the versioned demo matrix. It declares which devices,
public relations and negative fixtures the demonstrator is expected to cover,
including the roles `required`, `alternative` and `optional`.

Coverage is always stated against a scope and a revision, never against the
market. `pnpm report:data-ops` writes `data/generated/catalog-coverage-report.json`
with the `scopeId` and the `dataRevision` hash of the source collections; the
public catalog page renders both. A complete coverage report means that this
revision of the demo matrix is fully satisfied — it says nothing about how many
real products or devices exist.

`migrations/v1` and `migrations/v2` contain explicit before/after fixtures for
the schema v1→v2 migration. They are migration tests only and are never loaded
by the public build.
