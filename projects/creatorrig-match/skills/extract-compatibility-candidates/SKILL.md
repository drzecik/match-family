---
name: extract-compatibility-candidates
description: Extract evidence-scoped compatibility edge candidates from supplied official documents or normalized product facts. Use to prepare a human review queue; never convert candidates into verified or public relations.
---

# Extract Compatibility Candidates

1. Read the original supplied source and record its type, canonical URL, date, and exact proof scope.
2. Create one directional claim per product pair and scope. Separate mechanical, electrical, signal, optical, memory, and software results.
3. Record conditions, limitations, required intermediate products, and literal source locations.
4. Use `unknown` for every dimension not covered by evidence.
5. Store output in `data/candidates` with `relationType: candidate`, `verificationStatus: candidate`, and no publication status.
6. Run schema and missing-relation reports.
7. Return a review queue ordered by electrical risk and user impact.

Do not generalize a connector match, manufacture an adapter path, or approve any candidate.
