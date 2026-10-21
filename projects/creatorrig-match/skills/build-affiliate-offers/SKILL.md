---
name: build-affiliate-offers
description: Import and validate affiliate offer records with merchant allowlists, integer prices, freshness, availability, and sponsorship disclosure. Use for commercial feeds; never write compatibility status or use commission in compatibility ranking.
---

# Build Affiliate Offers

1. Confirm feed authorization, merchant identity, currency, region, and timestamp semantics.
2. Normalize prices to integer minor units and preserve availability, updated time, affiliate URL, and sponsorship.
3. Accept only allowlisted HTTPS merchant destinations; reject open redirects and executable content.
4. Keep offers in the isolated offers layer and reference existing product IDs.
5. Mark stale prices and exclude them from current-cheapest claims.
6. Test that sponsorship and commission do not alter compatibility or safety ordering and do not hide cheaper eligible options.
7. Run schema, stale-price, URL, and publication checks.

Never create or modify compatibility edges from offer data.
