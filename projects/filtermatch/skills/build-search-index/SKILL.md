---
name: build-search-index
description: Build and audit the static FilterMatch model search index. Use after validated device or alias changes, or when checking collisions, regional suffix handling, ambiguity, and conservative fuzzy candidates before a static site build.
---

# Build Search Index

Require validated device data, approved alias data, normalization policy version, publication snapshot, and output/report paths.

1. Reject invalid entities and unapproved aliases from exact lookup keys.
2. Generate display-normalized and compact comparison keys while preserving regional suffix semantics.
3. Detect keys mapping to multiple devices and encode them as ambiguous choices.
4. Keep fuzzy results in a separate candidate channel with a conservative threshold. Never attach compatibility to an unconfirmed fuzzy result.
5. Exclude private source notes and candidate compatibility edges from the public artifact.
6. Run regression tests before replacing the generated index.

Generate a report with counts, collisions, ambiguous keys, excluded aliases, fuzzy-only suggestions, policy version, deterministic artifact hash, and output path. Building the index cannot approve aliases or compatibility.
