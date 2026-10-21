---
name: normalize-model-aliases
description: Normalize and audit FilterMatch device model aliases. Use when reviewing aliases, regional model codes, separator variants, popular misspellings, or changes to the model normalization pipeline and its regression cases.
---

# Normalize Model Aliases

Require an input alias file or explicit alias list, entity identifiers, normalization policy version, and report destination.

1. Apply Unicode NFKC, case normalization, and whitespace normalization.
2. Remove separators only in the comparison key; retain the display alias and meaningful suffixes such as `/10`.
3. Map only aliases already approved for the given entity. Mark proposed aliases as `approved: false`.
4. Report collisions where one comparison key maps to multiple entities.
5. Treat edit-distance matches only as suggestions. Never convert a fuzzy suggestion into an approved alias.
6. Add regression cases for suffix preservation, digit differences, ambiguity, and no-result behavior.

Generate a report with raw and normalized values, proposed mappings, collisions, rejected values, affected tests, and policy version. Do not change compatibility verification or publish candidate pages.
