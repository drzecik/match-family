---
name: report-stale-compatibility
description: Report FilterMatch compatibility records due for review. Use for scheduled data operations with an explicit cutoff date, category scope, verification policy, and output destination.
---

# Report Stale Compatibility

Require snapshot path, ISO cutoff date, category or all-categories scope, current publication policy, and report destination.

1. Validate the snapshot before analysis.
2. Compare edge and source verification dates to the supplied cutoff without changing them.
3. Group stale public edges, stale candidates, expired relations, deprecated entities, and missing or inaccessible source metadata.
4. Prioritize public edges and records with offers, but do not alter compatibility or offer ordering.
5. Keep reviewer identifiers in the internal report and exclude personal data from public artifacts.

Generate JSON and Markdown summaries with record IDs, age, current status, evidence IDs, reason, priority, and recommended review action. This skill reports work; it never renews a verification date or approves an edge.
