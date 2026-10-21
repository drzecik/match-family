# Widget catalog migrations

## 2026-07-18 — evidence-bound compatibility

Static widget catalogs must now include `catalog.evidence`. Every compatibility edge with
`verified_official`, `verified_supplier` or `verified_multi_source` must include `evidenceIds`
that resolve inside that collection and satisfy the source policy enforced by the widget core.

- `verified_official` needs at least one matching official source;
- `verified_supplier` needs at least one matching replacement-manufacturer or distributor source;
- `verified_multi_source` needs at least two matching evidence records with distinct publishers and distinct source URL or document identifier;
- non-public statuses may retain evidence but are never rendered as compatible.

Synthetic widget records must set both `synthetic: true` and `notForProduction: true` on the
configuration, catalog and every contained record. Existing catalogs that omit these new fields
are rejected fail-closed instead of being interpreted as verified.
