# White-label compatibility widget

## Product boundary

The future white-label widget embeds the same static, evidence-gated compatibility artifact as the public site. It does not require CreatorRig Match accounts, a central recommendation backend, or access to a merchant's DOM. A merchant may provide presentation configuration and its own validated offer feed; it may not override compatibility status, evidence, limitations, or safety warnings.

## Integration contract

- load versioned static JavaScript, CSS, graph, search, and offer artifacts;
- configure locale, theme tokens, allowed categories, merchant identity, and canonical product-ID mappings;
- exchange messages through a constrained, versioned schema and an explicit origin allowlist;
- navigate only to importer-approved HTTPS offer URLs—never to a host-provided arbitrary redirect;
- preserve CreatorRig Match methodology/source attribution and sponsored labels;
- render `unknown`, stale-price, unavailable, missing-price, and candidate states without promotion.

## Ranking and commercial controls

Compatibility and safety are resolved before offers are considered. Inside the same eligible compatibility tier, availability and price may order offers. Sponsorship is display metadata only and is not consumed by compatibility or offer-ranking comparators. A white-label customer cannot pay to remove a warning, hide a cheaper eligible offer, or present an unverified path as compatible.

## Data and privacy

The MVP widget stores optional rig state locally and can use an encoded share link. It does not require production login, cross-site tracking, or server-side rig storage. Host-page data and `postMessage` payloads are untrusted, size-limited, schema-validated, and never executed. Merchant feeds require a licensed/manual source, freshness timestamps, exact catalog IDs, and importer validation.

## Operational handoff

Each deployment receives a pinned artifact version, merchant URL policy, supported-origin list, cache policy, accessibility requirements, and rollback instructions. Feed or schema changes require validation and migration notes. Unsafe URLs, missing evidence, candidate escalation, or electrical-safety regressions block publication.
