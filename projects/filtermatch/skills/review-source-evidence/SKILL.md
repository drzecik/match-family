---
name: review-source-evidence
description: Review FilterMatch source-evidence metadata and quality. Use when assessing an official manual, official compatibility list, product page, supplier document, distributor source, or independent confirmation before a human verification decision.
---

# Review Source Evidence

Require source type, title, URL or document identifier, access date, evidence summary, relevant device and consumable identifiers, and reviewer or process identifier.

1. Confirm required metadata and allow only `http` or `https` URLs.
2. Record document version, page reference, content hash, and manufacturer when supplied.
3. Check that the short evidence summary actually names the relevant models or products; do not copy whole protected documents.
4. Rank source quality using `docs/SOURCE_POLICY.md` and identify contradictions or missing context.
5. Extracted or AI-suggested facts remain candidates pending authorized review.

Generate a report with metadata completeness, source tier, relevant excerpt notes, contradictions, limitations, and a recommended next review step. A recommendation is not a verification decision and must not alter an edge.
