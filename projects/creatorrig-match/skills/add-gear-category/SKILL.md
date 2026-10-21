---
name: add-gear-category
description: Extend CreatorRig Match with a new product category or subcategory, including ontology mapping, typed capabilities, schemas, migration notes, fixtures, and tests. Use for domain expansion; do not use merely to add one product.
---

# Add Gear Category

1. Read `AGENTS.md`, `docs/ONTOLOGY.md`, and `docs/DATA_MODEL.md`.
2. Model the category through existing compatibility dimensions; introduce a new dimension only with an ADR.
3. Add category/subcategory constants, capability and requirement vocabulary, and deterministic evaluator inputs.
4. Update Zod schemas and add `docs/migrations/<next>-<name>.md`.
5. Add clearly marked synthetic fixtures covering positive, incompatible, unknown, and candidate cases.
6. Add graph, evaluator, data-validation, and publication regression tests.
7. Update ontology, data model, and roadmap truthfully.
8. Run `pnpm lint`, `pnpm typecheck`, `pnpm data:validate`, and `pnpm test`.

Never infer cross-dimension compatibility. Never mark a new edge verified. Return candidate data for a separate human evidence review.
