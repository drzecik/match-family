---
name: report-stale-gear-data
description: Generate a non-mutating review queue for stale product facts, evidence, firmware conditions, compatibility edges, recording modes, and prices. Use for scheduled data maintenance and publication audits.
---

# Report Stale Gear Data

1. Read freshness thresholds from policy and keep evidence, firmware, lifecycle, and price thresholds separate.
2. Report records with missing dates, expired review windows, superseding firmware, discontinued variants, broken references, or stale offers.
3. Prioritize electrical safety, public positive claims, popular rigs, and conflicting sources.
4. Include record IDs, current status, last verification date, reason, affected pages/rigs, and required reviewer action.
5. Never silently downgrade, delete, refresh, or approve data.
6. Write a deterministic machine-readable report and a concise human summary.
7. Run the report against fixtures and test boundary dates.

Staleness is a review signal, not evidence of incompatibility or compatibility.
