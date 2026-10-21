# 0001 — Initial schema

Date: 2026-07-17.

Introduces schema version `0.1.0` for products, interfaces, capabilities, requirements, compatibility edges, adapters, recording modes, offers, rigs, evidence, and use-case templates. There is no predecessor and therefore no data transformation.

The compact `data/fixtures/demo-catalog.json` file is an application demo fixture validated by `scripts/validate-data.ts`; it is not a canonical dataset export. A future import pipeline must normalize it into `CreatorRigDataSet` before production use.
