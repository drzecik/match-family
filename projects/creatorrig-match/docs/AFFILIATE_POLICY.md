# Affiliate policy

Offers are separate time-stamped records. Affiliate URLs must use an allowlisted `https` merchant host and may not be open redirects. Prices use integer minor units and show currency, availability, sponsorship, and update time.

The merchant name, hostname, and allowed product-path prefix are matched as one policy entry. Redirect-like parameters and generic redirect paths are not imported. Missing prices remain valid as “price unavailable”; they sort after known prices and cannot participate in cheapest-price claims. Stale prices remain visible only with a warning and are likewise excluded from current-price claims. Unavailable products sort after purchasable products.

Affiliate commission is never read by compatibility evaluation or graph traversal. Sponsored placement is labelled and cannot suppress warnings, evidence, alternatives, or lower-priced eligible offers. Stale prices display a warning and are excluded from claims of current cheapest price.

Commercial sorting occurs only after compatibility and user-requirement eligibility. Sponsorship is deliberately absent from all comparators. Synthetic demo offers must carry both non-production flags and must never be exported as a live merchant feed.
