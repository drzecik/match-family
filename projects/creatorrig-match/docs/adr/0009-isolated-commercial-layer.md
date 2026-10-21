# ADR 0009: Isolated commercial layer and static widget

Status: accepted — 2026-07-17.

Offers remain separate from products, evidence, compatibility edges, and evaluator inputs. The importer accepts only exact catalog IDs, synthetic safety flags in the demo, HTTPS merchant/host/path policies, safe query parameters, timestamps, availability, and integer minor prices or an explicit missing price. Redirect-like URLs are rejected.

Offer ordering uses availability and price only within already eligible compatibility results. Sponsorship is a label and never a comparator. Stale, missing-price, and unavailable offers remain visible with warnings but cannot claim a current cheapest price. The widget is a static, versioned consumer of the same immutable graph and may not override status, evidence, limitations, or warnings.
