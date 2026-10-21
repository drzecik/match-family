---
name: verify-compatibility-edge
description: Review one CreatorRig Match candidate edge against original evidence and prepare a dimension-by-dimension approval decision. Use when a human reviewer requests verification; never self-approve or silently promote data.
---

# Verify Compatibility Edge

1. Resolve both exact product variants, edge direction, interfaces, firmware, region, and stated scope.
2. Open the original official sources. Reject snippets, reseller summaries, and unverifiable citations.
3. For each dimension, list the supported claim, source location, conditions, limitations, and confidence boundary.
4. Check required adapters as ordinary directional products with their own evidence.
5. Reject the edge if a positive public claim lacks scoped evidence; downgrade uncovered dimensions to `unknown`.
6. Produce a proposed diff plus a reviewer checklist.
7. Stop before changing `verificationStatus` or moving data into `data/verified` unless an authorized human explicitly confirms the reviewed decision.
8. After human approval, record reviewer identity and date, then run publication and graph tests.

AI analysis is preparation, not verification authority.
