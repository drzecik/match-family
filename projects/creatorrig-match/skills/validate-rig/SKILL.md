---
name: validate-rig
description: Deterministically validate a CreatorRig Match rig across graph paths, required intermediates, audio, optics, memory, weight, price, and available power facts. Use for fixture or user-exported rigs; never turn unknowns into recommendations.
---

# Validate Rig

1. Schema-validate the rig and resolve exact product IDs without fuzzy substitution.
2. Evaluate every required pair by dimension and traverse only verified, evidence-backed safe paths.
3. Exclude candidate, deprecated, unknown, incompatible, physical-only, and electronic-only edges from recommendations.
4. Report critical conflicts, missing adapters/cables, unsatisfied conditions, and unconfirmed relations separately.
5. Calculate storage, weight, price, and power deterministically; list missing inputs instead of inventing values.
6. Keep owned products in weight but remove them from purchase cost.
7. Produce an explained shopping list and cited validation result.
8. Add a regression fixture for every discovered false positive or omitted intermediary.

Do not mutate catalog or verification data while validating a rig.
