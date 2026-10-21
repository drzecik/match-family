---
name: import-affiliate-offers
description: Validate and import a controlled FilterMatch affiliate-offer feed. Use for manual or provider-supplied CSV offer files containing merchant, product, price, availability, destination, affiliate, sponsorship, and freshness fields.
---

# Import Affiliate Offers

Require CSV path, provider identifier, retrieval time, currency expectations, maximum row count, and report destination.

1. Enforce size and row limits and reject malformed CSV.
2. Reject formula-like cells, non-HTTP(S) URLs, invalid money values, unknown currencies, duplicate IDs, and records without a known consumable.
3. Keep destination and affiliate URLs structural. Do not create open redirect endpoints.
4. Preserve sponsorship separately; sponsorship must never affect compatibility.
5. Mark stale or expired offers so their prices are not presented as current.
6. Do not scrape missing fields or follow merchant pages to enrich the feed.

Generate a report with accepted and rejected rows, duplicate IDs, stale offers, unsafe cells, unknown consumables, and output paths. Importing an offer never changes compatibility status.
